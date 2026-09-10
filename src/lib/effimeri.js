// ---------------------------------------------------------------------------
// Foto e video MOMENTANEI mandati a un amico.
//
// Il punto non è la privacy: è la memoria. Un video di 10" pesa ~15MB. Se ogni
// foto mandata restasse per sempre, in un mese lo spazio finirebbe — e lo
// spazio, adesso che i file stanno sul cloud, è quello del progetto Supabase,
// condiviso da tutti quelli che usano l'app.
//
// Quindi un invio vive **il minimo indispensabile**:
//   - sparisce appena il destinatario l'ha guardato (chiuso il visore);
//   - e comunque dopo 24 ore, guardato o no.
//
// ⚠️ COSA VUOL DIRE "SPARISCE". Il file NON SI PUÒ PIÙ SCARICARE: lo dice la
// regola sul bucket, che guarda la riga (consumato? scaduto?) prima di lasciar
// passare la richiesta. I byte veri li cancella chi guarda, nel momento in cui
// chiude il visore. Non si promette la distruzione dei byte da qualche parte
// nel mondo — si promette che non li vede più nessuno, ed è esattamente quello
// che l'app dice a chi manda (vedi docs/decisioni.md: momentanei per la
// MEMORIA, non per la privacy, e lo screenshot resta sempre possibile).
//
// ⚠️ UNA COPIA PER DESTINATARIO. Mandare la stessa foto a tre amici carica tre
// file. Sembra uno spreco ed è voluto: "l'ha guardata" è di ciascuno, e con un
// file solo non si potrebbe cancellare finché l'ultimo non l'ha aperto — cioè
// mai, se uno se ne dimentica.
//
// La pulizia gira a ogni accesso: non serve un timer, basta che nessuno possa
// arrivare al file dopo la scadenza — e a quello ci pensa la regola, sempre.
// ⚠️ La fa l'app e non il database, perché cancellare file da SQL Supabase lo
// vieta: vedi il commento su `pulisciScaduti` qui sotto.
// ---------------------------------------------------------------------------

import { messaggioErrore, supabase } from './supabase'

const BUCKET = 'effimeri'

/** Dopo quante ore un invio sparisce comunque, anche se mai aperto. */
export const ORE_SCADENZA = 24

/** Quanto resta a schermo una foto prima di chiudersi da sola (secondi). */
export const SECONDI_FOTO = 10

function nuovoIdEffimero() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Il percorso del file nel bucket. La cartella è chi l'ha mandato. */
function percorsoEffimero(daId, id) {
  return `${daId}/${id}`
}

/**
 * @typedef {Object} Effimero
 * @property {string} id
 * @property {string} daId
 * @property {string} daNome     il nome di chi ha mandato, per l'elenco
 * @property {string} aId
 * @property {'foto'|'video'} tipo
 * @property {string} nome       nome del file (solo per l'elenco)
 * @property {number} peso       byte, per dire quanto si è liberato
 * @property {string} inviatoIl  ISO
 * @property {string} scadeIl    ISO: dopo, sparisce comunque
 * @property {string|null} apertoIl
 * @property {boolean} consumato true = il file non c'è più
 */

// ⚠️ Una traduzione riga↔oggetto SOLA, come per i profili: quando ce n'erano
// due sono divergite alla prima colonna nuova (vedi lib/social.js).
function daRiga(r) {
  return {
    id: r.id,
    daId: r.da_id,
    daNome: r.da_nome || '',
    aId: r.a_id,
    tipo: r.tipo,
    nome: r.nome || '',
    peso: r.peso || 0,
    inviatoIl: r.inviato_il,
    scadeIl: r.scade_il,
    apertoIl: r.aperto_il,
    consumato: !!r.consumato,
  }
}

const oreDopo = (ore) => new Date(Date.now() + ore * 3600 * 1000).toISOString()

/** Gli invii che mi riguardano: quelli che ho mandato e quelli per me. */
export async function leggiEffimeri() {
  const { data, error } = await supabase
    .from('effimeri')
    .select('*')
    .order('inviato_il', { ascending: false })
  if (error) {
    console.warn('Lettura invii momentanei fallita', error.message)
    return null
  }
  return (data || []).map(daRiga)
}

/**
 * Carica il file e crea la riga.
 * ⚠️ Prima il FILE, poi la riga — lo stesso ordine dei media degli esercizi, e
 * per lo stesso motivo: una riga senza file è un invio che si apre su niente.
 * @returns {Promise<{ok:boolean, riga?:Effimero, errore?:string}>}
 */
export async function creaEffimero({ daId, daNome, aId, tipo, nome, blob }) {
  const id = nuovoIdEffimero()
  const percorso = percorsoEffimero(daId, id)
  const { error: e1 } = await supabase.storage
    .from(BUCKET)
    .upload(percorso, blob, { contentType: blob?.type || undefined, upsert: false })
  if (e1) return { ok: false, errore: messaggioErrore(e1) }

  const riga = {
    id,
    da_id: daId,
    da_nome: daNome || '',
    a_id: aId,
    percorso,
    tipo,
    nome: nome || '',
    peso: blob?.size || 0,
    scade_il: oreDopo(ORE_SCADENZA),
  }
  const { error: e2 } = await supabase.from('effimeri').insert(riga)
  if (e2) {
    // La riga non c'è: il file da solo non lo vedrebbe nessuno (la regola
    // guarda la riga), ma tanto vale non lasciarlo lì a occupare spazio.
    await supabase.storage.from(BUCKET).remove([percorso])
    return { ok: false, errore: messaggioErrore(e2) }
  }
  return {
    ok: true,
    riga: {
      id,
      daId,
      daNome: daNome || '',
      aId,
      tipo,
      nome: nome || '',
      peso: blob?.size || 0,
      inviatoIl: new Date().toISOString(),
      scadeIl: riga.scade_il,
      apertoIl: null,
      consumato: false,
    },
  }
}

/** È passata la scadenza? */
export function scaduto(riga, ora = Date.now()) {
  return !riga?.scadeIl || new Date(riga.scadeIl).getTime() <= ora
}

/** Quanto manca, in parole ("fra 3 ore", "fra 20 min"). */
export function tempoRimasto(riga, ora = Date.now()) {
  const ms = new Date(riga?.scadeIl || 0).getTime() - ora
  if (!(ms > 0)) return 'scaduto'
  const min = Math.round(ms / 60000)
  if (min < 60) return `ancora ${min} min`
  const ore = Math.round(min / 60)
  return `ancora ${ore} ${ore === 1 ? 'ora' : 'ore'}`
}

/** Gli invii ancora guardabili da `ioId` (non aperti, non scaduti). */
export function effimeriRicevuti(righe, ioId, ora = Date.now()) {
  if (!ioId) return []
  return (righe || [])
    .filter((r) => r.aId === ioId && !r.consumato && !scaduto(r, ora))
    .sort((a, b) => new Date(b.inviatoIl || 0) - new Date(a.inviatoIl || 0))
}

/** Gli invii fatti da `ioId` di cui c'è ancora traccia (per sapere se li ha visti). */
export function effimeriInviati(righe, ioId, ora = Date.now()) {
  if (!ioId) return []
  return (righe || [])
    .filter((r) => r.daId === ioId && !scaduto(r, ora))
    .sort((a, b) => new Date(b.inviatoIl || 0) - new Date(a.inviatoIl || 0))
}

/**
 * Toglie dal server tutto ciò che è scaduto: prima i file, poi le righe.
 * Da chiamare a ogni accesso e all'apertura di Condivisi.
 *
 * ⚠️ LA FA L'APP E NON IL DATABASE, e non è una scelta di stile: Supabase
 * VIETA di cancellare file con SQL (`Direct deletion from storage tables is
 * not allowed. Use the Storage API instead.`), anche dal SQL Editor. È una
 * protezione giusta — una riga di `storage.objects` cancellata lascerebbe il
 * file vero dov'è, invisibile e irrecuperabile.
 *
 * ⚠️ L'ORDINE È OBBLIGATO: prima il file, poi la riga. La regola che permette
 * di cancellare un file va a cercare la sua riga in `effimeri`; tolta la riga,
 * quel file non lo può più cancellare nessuno, per sempre. Quindi se la
 * rimozione dei file non riesce, le righe NON si toccano: si riprova al
 * prossimo accesso.
 *
 * ⚠️ Le righe le chiede al SERVER, non le riceve da chi chiama: chi chiama, al
 * momento dell'accesso, non le ha ancora lette. (Prima le riceveva, e la
 * pulizia girava sempre su una lista vuota.)
 *
 * ⚠️ Se non riesce non lo si dice a nessuno: la scadenza è già vera comunque,
 * perché la regola sul bucket guarda `scade_il` a ogni richiesta.
 * @returns {Promise<number>} quanti invii scaduti sono stati portati via
 */
export async function pulisciScaduti() {
  const { data, error } = await supabase
    .from('effimeri')
    .select('id, da_id, consumato')
    .lte('scade_il', new Date().toISOString())
  if (error) {
    console.warn('Lettura degli invii scaduti non riuscita', error.message)
    return 0
  }
  const scadute = data || []
  if (scadute.length === 0) return 0

  // Solo quelli che hanno ancora un file: i consumati l'hanno già perso.
  const percorsi = scadute
    .filter((r) => !r.consumato)
    .map((r) => percorsoEffimero(r.da_id, r.id))
  if (percorsi.length > 0) {
    const { error: e1 } = await supabase.storage.from(BUCKET).remove(percorsi)
    if (e1) {
      console.warn('File degli invii scaduti non rimossi', e1.message)
      return 0
    }
  }

  const { error: e2 } = await supabase
    .from('effimeri')
    .delete()
    .in('id', scadute.map((r) => r.id))
  if (e2) {
    console.warn('Righe degli invii scaduti non rimosse', e2.message)
    return 0
  }
  return scadute.length
}

/**
 * Il file da mostrare nel visore, o null se non c'è più.
 * ⚠️ Si scarica il BLOB, non si usa la URL firmata come sorgente: subito dopo
 * il file viene cancellato, e un `<video src>` che punta a un file appena
 * cancellato smetterebbe di funzionare a metà riproduzione.
 */
export async function blobEffimero(riga) {
  if (!riga?.id || !riga?.daId) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(percorsoEffimero(riga.daId, riga.id))
  if (error) {
    console.warn('Invio momentaneo non disponibile', error.message)
    return null
  }
  return data || null
}

/**
 * L'ha guardato: via il file. La riga resta (marcata) finché non scade, così
 * chi ha mandato vede che è arrivata a destinazione.
 * @returns {Promise<Effimero>} la riga aggiornata
 */
export async function consumaEffimero(riga) {
  const percorso = percorsoEffimero(riga.daId, riga.id)
  const { error } = await supabase.storage.from(BUCKET).remove([percorso])
  if (error) console.warn('File dell.invio non rimosso', error.message)
  const apertoIl = riga.apertoIl || new Date().toISOString()
  const { error: e2 } = await supabase
    .from('effimeri')
    .update({ consumato: true, aperto_il: apertoIl })
    .eq('id', riga.id)
  if (e2) console.warn('Invio non segnato come guardato', e2.message)
  return { ...riga, consumato: true, apertoIl }
}

/**
 * Toglie ogni invio che tocca un profilo.
 * ⚠️ Sul server non serve fare niente: le due chiavi puntano ad `auth.users`
 * con `on delete cascade`, quindi cancellando l'account le righe se ne vanno
 * da sole. Questa ripulisce solo quello che l'app ha in mano adesso, perché
 * chi esce non deve continuare a vedere a schermo la roba di prima.
 */
export function effimeriSenzaUtente(righe, id) {
  return (righe || []).filter((r) => r.daId !== id && r.aId !== id)
}
