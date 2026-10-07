// ---------------------------------------------------------------------------
// SEGNALAZIONI: un commento o una foto del Feed che può urtare qualcuno.
//
// Chi segnala sceglie il MOTIVO (e lo spiega in due righe se è "altro"), e da
// quel momento quella cosa per lui sparisce: non deve aspettare che qualcuno
// decida per non vederla più. Chi l'ha scritta non sa chi l'ha segnalata.
// Con TRE persone diverse la cosa si nasconde a tutti finché un moderatore
// non decide (lo fa il database, `in_attesa`).
// Le segnalazioni le guarda un MODERATORE (pages/ModerazionePage): toglie il
// contenuto per tutti o lo lascia. Togliere conta: 1° e 2° contenuto tolto =
// avviso, 3° = pubblicazione bloccata, 4° = account bloccato; ogni volta
// all'autore arriva una NOTIFICA con cosa era e perché
// (components/AvvisiModerazione). Chi è bloccato chiede lo sblocco dall'app.
// Le regole sono scritte nei Termini (public/termini.html, punto 7).
// Chi è moderatore lo decide la tabella `moderatori`, a mano dal SQL Editor.
// Il database controlla tutto da sé (supabase/schema.sql, MODERAZIONE e
// SEGNALAZIONI): l'app mostra e chiede, non decide.
// ---------------------------------------------------------------------------

import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { testoPulito } from './linguaggio'

export const MOTIVI = [
  { id: 'offensivo', label: 'Offensivo o di odio', descrizione: 'Insulti, razzismo, prese in giro per il corpo' },
  { id: 'volgare', label: 'Volgare', descrizione: 'Parolacce, bestemmie, gesti' },
  { id: 'molestie', label: 'Molestie o bullismo', descrizione: 'Prende di mira una persona' },
  { id: 'sessuale', label: 'Contenuto sessuale', descrizione: 'Nudo o allusioni esplicite' },
  { id: 'violenza', label: 'Violenza o pericolo', descrizione: 'Minacce, autolesionismo, sostanze' },
  { id: 'spam', label: 'Spam o pubblicità', descrizione: 'Link, vendite, messaggi ripetuti' },
  { id: 'altro', label: 'Altro', descrizione: 'Spiega in due righe' },
]

export const DETTAGLIO_MAX = 500

export const motivoDi = (id) => MOTIVI.find((m) => m.id === id) || null

/** Cosa non va nella segnalazione, già da mostrare; '' se si può mandare. */
export function erroreSegnalazione(motivo, dettaglio) {
  if (!motivoDi(motivo)) return 'Scegli il motivo.'
  const d = String(dettaglio || '').trim()
  if (motivo === 'altro' && !d) return 'Con "Altro", scrivi in due righe che cosa non va.'
  if (d.length > DETTAGLIO_MAX) return `Al massimo ${DETTAGLIO_MAX} caratteri.`
  return ''
}

// La chiave con cui si ricorda "questa l'ho segnalata io".
export const chiaveSegnalata = (tipo, oggetto) => `${tipo}:${oggetto}`

function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'se-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/**
 * Manda una segnalazione.
 * @param {{ tipo:'commento'|'foto', oggetto:string, ioId:string, motivo:string, dettaglio?:string }} s
 * @returns {Promise<{ ok:boolean, errore:string }>}
 */
export async function segnala({ tipo, oggetto, ioId, motivo, dettaglio = '' }) {
  const sbagliato = erroreSegnalazione(motivo, dettaglio)
  if (sbagliato) return { ok: false, errore: sbagliato }
  const { error } = await supabase.from('segnalazioni').insert({
    id: nuovoId(),
    segnalato_da: ioId,
    tipo,
    oggetto,
    motivo,
    dettaglio: testoPulito(String(dettaglio || '').trim()),
  })
  if (error) {
    // Già segnalata da me: per chi la segnala il risultato è lo stesso.
    if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) return { ok: true, errore: '' }
    if (/propria/i.test(error.message || '')) return { ok: false, errore: 'Non puoi segnalare una cosa tua.' }
    if (/niente da segnalare/i.test(error.message || '')) {
      return { ok: false, errore: 'Non c’è più: forse è già stata tolta.' }
    }
    if (/relation .*segnalazioni|does not exist/i.test(error.message || '')) {
      return { ok: false, errore: 'Le segnalazioni non sono ancora attive. Riprova più tardi.' }
    }
    return { ok: false, errore: erroreDiRete(error) ? 'Senza rete la segnalazione non parte: riprova.' : messaggioErrore(error) }
  }
  return { ok: true, errore: '' }
}

/** Le cose che ho segnalato io (chiaveSegnalata), per non mostrarmele più. */
export async function mieSegnalazioni(ioId) {
  if (!ioId) return new Set()
  const { data, error } = await supabase
    .from('segnalazioni')
    .select('tipo, oggetto')
    .eq('segnalato_da', ioId)
  if (error) return new Set()
  return new Set((data || []).map((r) => chiaveSegnalata(r.tipo, r.oggetto)))
}

// -- per i moderatori ---------------------------------------------------------

// La risposta si chiede una volta per persona: cambia solo dal SQL Editor.
let moderatore = { id: null, risposta: null }

/** Sono un moderatore? false anche se la domanda non parte. */
export function sonoModeratore(ioId) {
  if (!ioId) return Promise.resolve(false)
  if (moderatore.id !== ioId || !moderatore.risposta) {
    moderatore = {
      id: ioId,
      risposta: supabase
        .rpc('sono_moderatore')
        .then(({ data, error }) => !error && data === true)
        .catch(() => false),
    }
  }
  return moderatore.risposta
}

/** La coda: una voce per cosa segnalata, dalle più segnalate. */
export async function segnalazioniAperte() {
  const { data, error } = await supabase.rpc('segnalazioni_aperte')
  if (error) return { ok: false, voci: [], errore: messaggioErrore(error) }
  return {
    ok: true,
    voci: (data || []).map((r) => ({
      tipo: r.tipo,
      oggetto: r.oggetto,
      allenamentoKey: r.allenamento_key,
      autoreId: r.autore_id,
      autoreNome: r.autore_nome || 'Qualcuno',
      testo: r.testo || '',
      percorso: r.percorso || null,
      media: r.media || null,
      esiste: !!r.esiste,
      nascosto: !!r.nascosto,
      quante: r.quante || 0,
      persone: r.persone || 0,
      motivi: r.motivi || [],
      dettagli: r.dettagli || [],
      prima: r.prima,
      toltiPrima: r.tolti_prima || 0,
    })),
    errore: '',
  }
}

/**
 * 'rimossa' toglie il contenuto per tutti (col `motivo` scelto, che finisce
 * nell'avviso all'autore); 'respinta' lo lascia.
 */
export async function decidi(voce, esito, motivo = null) {
  const { error } = await supabase.rpc('decidi_segnalazione', {
    p_tipo: voce.tipo,
    p_oggetto: voce.oggetto,
    p_esito: esito,
    p_motivo: motivo,
  })
  if (error) return { ok: false, errore: messaggioErrore(error) }
  return { ok: true, errore: '' }
}

/** Il motivo più segnalato: quello proposto al moderatore quando toglie. */
export function motivoPrincipale(motivi) {
  const conti = new Map()
  for (const m of motivi || []) conti.set(m, (conti.get(m) || 0) + 1)
  return [...conti].sort((a, b) => b[1] - a[1])[0]?.[0] || 'altro'
}

/**
 * Cosa succede all'autore se si toglie: il gradino dei Termini (punto 7).
 * @param {number} toltiPrima contenuti già tolti
 */
export function conseguenza(toltiPrima) {
  const n = (toltiPrima || 0) + 1
  if (n === 1) return 'Primo contenuto tolto: riceve un avviso.'
  if (n === 2) return 'Secondo contenuto tolto: riceve un avviso.'
  if (n === 3) return 'Terzo contenuto tolto: non potrà più pubblicare nel Feed.'
  return `${n}° contenuto tolto: l’account viene bloccato.`
}

/** Chi ha la pubblicazione o l'account bloccati, con la richiesta aperta se c'è. */
export async function personeSanzionate() {
  const { data, error } = await supabase.rpc('persone_sanzionate')
  if (error) return { ok: false, persone: [], errore: messaggioErrore(error) }
  return {
    ok: true,
    persone: (data || []).map((r) => ({
      userId: r.user_id,
      nome: r.nome || 'Qualcuno',
      tolti: r.tolti || 0,
      pubblicazioneBloccata: !!r.pubblicazione_bloccata,
      accountBloccato: !!r.account_bloccato,
      richiesta: r.richiesta_id
        ? { id: r.richiesta_id, tipo: r.richiesta_tipo, messaggio: r.richiesta_messaggio || '', il: r.richiesta_il }
        : null,
    })),
    errore: '',
  }
}

/** Sblocca 'pubblicazione', 'account' o 'tutto'; la persona riceve un avviso. */
export async function sblocca(userId, cosa) {
  const { error } = await supabase.rpc('sblocca', { p_utente: userId, p_cosa: cosa })
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true, errore: '' }
}

/** Respinge una richiesta di sblocco; la persona riceve un avviso. */
export async function respingiSblocco(richiestaId) {
  const { error } = await supabase.rpc('respingi_sblocco', { p_richiesta: richiestaId })
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true, errore: '' }
}

// -- per chi è stato sanzionato ---------------------------------------------

export const STATO_LIBERO = Object.freeze({
  tolti: 0,
  pubblicazioneBloccata: false,
  accountBloccato: false,
  richiestaPubblicazione: false,
  richiestaAccount: false,
})

/**
 * Come sono messo io. Se la domanda non parte (rete, schema non lanciato)
 * si risponde "libero": l'app non blocca nessuno per un errore — tanto i
 * blocchi veri li fa il database.
 */
export async function statoModerazione() {
  const { data, error } = await supabase.rpc('mio_stato_moderazione')
  const r = !error && Array.isArray(data) ? data[0] : null
  if (!r) return STATO_LIBERO
  return {
    tolti: r.tolti || 0,
    pubblicazioneBloccata: !!r.pubblicazione_bloccata,
    accountBloccato: !!r.account_bloccato,
    richiestaPubblicazione: !!r.richiesta_pubblicazione,
    richiestaAccount: !!r.richiesta_account,
  }
}

/** Chiede lo sblocco della 'pubblicazione' o dell''account'. */
export async function chiediSblocco(tipo, messaggio = '') {
  const { error } = await supabase
    .from('richieste_sblocco')
    .insert({ tipo, messaggio: testoPulito(String(messaggio || '').trim()).slice(0, 1000) })
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
      return { ok: true, errore: '' } // ce n'era già una aperta: va bene così
    }
    return { ok: false, errore: erroreDiRete(error) ? 'Senza rete la richiesta non parte: riprova.' : messaggioErrore(error) }
  }
  return { ok: true, errore: '' }
}

/** Gli avvisi dei moderatori non ancora letti, dal più vecchio. */
export async function avvisiDaLeggere() {
  const { data, error } = await supabase
    .from('notifiche')
    .select('id, tipo, titolo, testo, creata_il')
    .is('letta_il', null)
    .order('creata_il', { ascending: true })
  if (error) return []
  return (data || []).map((r) => ({ id: r.id, tipo: r.tipo, titolo: r.titolo, testo: r.testo, creataIl: r.creata_il }))
}

export async function segnaAvvisiLetti(ids) {
  if (!ids?.length) return
  await supabase.rpc('segna_notifiche_lette', { ids })
}

/** I motivi di una voce, contati: "Volgare ×2 · Spam". */
export function riassuntoMotivi(motivi) {
  const conti = new Map()
  for (const m of motivi || []) conti.set(m, (conti.get(m) || 0) + 1)
  return [...conti]
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${motivoDi(m)?.label || m}${n > 1 ? ` ×${n}` : ''}`)
    .join(' · ')
}
