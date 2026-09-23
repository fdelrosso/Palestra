// ---------------------------------------------------------------------------
// La chat fra amici. Solo testo.
//
// ⚠️ Le foto e i video NON passano da qui: ci sono già, e sono un'altra cosa —
// gli effimeri (lib/effimeri), che scadono dopo 24 ore. Due modi di mandare la
// stessa foto, con due regole diverse su quanto resta, è la premessa perfetta
// per mandarla credendo che sparisca.
//
// ⚠️ SI SCRIVE SOLO AGLI AMICI, e lo dice il database (`sono_amico_di` nella
// regola di scrittura), non questo file. Senza quella regola l'username, che
// adesso si cerca a pezzi, diventerebbe un modo per scrivere a chiunque.
//
// ⚠️ CANCELLARE TOGLIE A TUTTI E DUE. Il database lascia cancellare solo i
// messaggi che hai scritto tu, e la riga sparisce per entrambi: non esiste il
// "cancella solo per me". Chi chiama deve dirlo, perché un "elimina" che lascia
// la copia all'altro sarebbe una bugia.
// ---------------------------------------------------------------------------

import { erroreDiRete, supabase } from './supabase'

/**
 * La chiave di una conversazione: i due id sempre nello stesso ordine, come la
 * colonna generata `coppia` sul database. ⚠️ Deve dare lo STESSO risultato di
 * quella (vedi supabase/schema.sql): se le due divergono, la conversazione si
 * legge vuota mentre i messaggi ci sono.
 */
export function coppiaDi(unoId, altroId) {
  return String(unoId) < String(altroId)
    ? `${unoId}|${altroId}`
    : `${altroId}|${unoId}`
}

function nuovoIdMessaggio() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/** Il testo che si può davvero mandare: vuoto o solo spazi non è un messaggio. */
export function testoValido(testo) {
  const t = String(testo || '').trim()
  return t.length > 0 && t.length <= 4000
}

/**
 * L'elenco delle chat: per ogni amico l'ultimo messaggio e quanti non letti.
 * Lo calcola il database (`conversazioni()`): farlo qui vorrebbe dire scaricare
 * tutti i messaggi per mostrarne uno.
 * @returns {Promise<{ok:boolean, righe:object[], errore:string}>}
 */
export async function leggiConversazioni() {
  const { data, error } = await supabase.rpc('conversazioni')
  if (error) {
    console.warn('Lettura delle conversazioni fallita', error.message)
    return { ok: false, righe: [], errore: error.message }
  }
  return { ok: true, righe: data || [], errore: '' }
}

/**
 * I messaggi scambiati con una persona, dal più vecchio (è l'ordine in cui si
 * legge una conversazione).
 * @param {string} ioId
 * @param {string} altroId
 * @param {{limite?:number}} [opts]
 */
export async function leggiMessaggi(ioId, altroId, { limite = 200 } = {}) {
  if (!ioId || !altroId) return { ok: true, righe: [], errore: '' }
  const { data, error } = await supabase
    .from('messaggi')
    .select('*')
    .eq('coppia', coppiaDi(ioId, altroId))
    // Gli ultimi N, poi si rigira: una conversazione lunga non si scarica
    // intera per mostrarne la coda.
    .order('creato_il', { ascending: false })
    .limit(limite)
  if (error) {
    console.warn('Lettura dei messaggi fallita', error.message)
    return { ok: false, righe: [], errore: error.message, diRete: erroreDiRete(error) }
  }
  return { ok: true, righe: (data || []).slice().reverse(), errore: '' }
}

/**
 * Manda un messaggio.
 * ⚠️ L'id lo fa il client, non il database: serve a riconoscere il messaggio
 * quando torna indietro dal tempo reale, per non vederlo comparire due volte.
 */
export async function inviaMessaggio({ daId, aId, testo }) {
  const t = String(testo || '').trim()
  if (!testoValido(t)) return { ok: false, errore: 'Messaggio vuoto.' }
  const riga = { id: nuovoIdMessaggio(), da_id: daId, a_id: aId, testo: t }
  const { data, error } = await supabase.from('messaggi').insert(riga).select().single()
  if (error) {
    console.warn('Invio non riuscito', error.message)
    // La regola di scrittura rifiuta chi non è amico: vale la pena dirlo, se no
    // sembra un guasto.
    const nonAmico = error.code === '42501' || /row-level security/i.test(error.message || '')
    return {
      ok: false,
      errore: nonAmico
        ? 'Puoi scrivere solo alle persone con cui sei amico.'
        : error.message,
      diRete: erroreDiRete(error),
    }
  }
  return { ok: true, riga: data || { ...riga, creato_il: new Date().toISOString() }, errore: '' }
}

/** Segna letto tutto quello che è arrivato da questa persona. */
export async function segnaLetti(ioId, altroId) {
  if (!ioId || !altroId) return { ok: true }
  const { error } = await supabase
    .from('messaggi')
    .update({ letto_il: new Date().toISOString() })
    .eq('a_id', ioId)
    .eq('da_id', altroId)
    .is('letto_il', null)
  if (error) {
    console.warn('Non sono riuscito a segnare letti', error.message)
    return { ok: false, errore: error.message }
  }
  return { ok: true, errore: '' }
}

/** Quanti messaggi non letti in tutto: il pallino sulla linguetta Amici. */
export async function contaNonLetti() {
  const { data, error } = await supabase.rpc('messaggi_non_letti')
  if (error) return 0
  return Number(data) || 0
}

/** Cancella un messaggio. ⚠️ Sparisce per tutti e due. */
export async function eliminaMessaggio(id) {
  const { error } = await supabase.from('messaggi').delete().eq('id', id)
  if (error) return { ok: false, errore: error.message }
  return { ok: true, errore: '' }
}

/**
 * Sta in ascolto dei messaggi nuovi di UNA conversazione.
 *
 * ⚠️ Il filtro sul canale è la `coppia`, non il destinatario: così arrivano
 * anche i propri messaggi mandati da un ALTRO dispositivo, che è quello che ci
 * si aspetta aprendo la stessa chat sul PC e sul telefono.
 *
 * @returns {() => void} la funzione per smettere. Va chiamata: un canale
 *   lasciato aperto continua a ricevere per tutta la vita della pagina.
 */
export function ascoltaConversazione(ioId, altroId, { onNuovo, onTolto } = {}) {
  if (!ioId || !altroId) return () => {}
  const chiave = coppiaDi(ioId, altroId)
  const canale = supabase
    .channel('chat:' + chiave)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `coppia=eq.${chiave}` },
      (e) => onNuovo?.(e.new),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messaggi', filter: `coppia=eq.${chiave}` },
      (e) => onTolto?.(e.old?.id),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(canale)
  }
}
