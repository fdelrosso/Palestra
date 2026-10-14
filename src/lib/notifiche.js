// ---------------------------------------------------------------------------
// Le notifiche: mi piace e commenti sui propri allenamenti, raggruppati.
//
// Il cuoricino in alto a destra nel proprio Profilo di Social (come su
// Instagram): una riga per allenamento e per tipo, quindi dieci mi piace allo
// stesso allenamento sono UNA notifica. Le raggruppa il database
// (`notifiche_interazioni()` in supabase/schema.sql); qui si danno le parole.
//
// "Da vedere" = arrivati dopo l'ultima apertura del cuoricino: è il numero
// rosso sulla voce Profilo della barra. Aprire il cuoricino lo azzera
// (`segnaNotificheLette`).
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

/**
 * @typedef {Object} Notifica
 * @property {string} chiave     l'allenamento ('<schedaId>|<data ISO>')
 * @property {'mi_piace'|'commento'} tipo
 * @property {number} quanti     mi piace o commenti in tutto
 * @property {number} persone    persone diverse
 * @property {number} nuovi      arrivati dopo l'ultima apertura
 * @property {string[]} nomi     dal più recente, max 3
 * @property {string} ultimoIl
 * @property {string} ultimoTesto
 */

/** @returns {Notifica} */
export function daRiga(r) {
  return {
    chiave: r.allenamento_key,
    tipo: r.tipo === 'commento' ? 'commento' : 'mi_piace',
    quanti: Number(r.quanti) || 0,
    persone: Number(r.persone) || 0,
    nuovi: Number(r.nuovi) || 0,
    nomi: Array.isArray(r.nomi) ? r.nomi.filter(Boolean) : [],
    ultimoIl: r.ultimo_il,
    ultimoTesto: r.ultimo_testo || '',
  }
}

/** @returns {Promise<{ok:boolean, righe:Notifica[]}>} */
export async function leggiNotifiche() {
  const { data, error } = await supabase.rpc('notifiche_interazioni')
  if (error) {
    console.warn('Lettura delle notifiche non riuscita', error.message)
    return { ok: false, righe: [] }
  }
  return { ok: true, righe: (data || []).map(daRiga) }
}

/** Quante cose da vedere in tutto (il numero rosso). */
export function contaNuove(righe) {
  return (righe || []).reduce((n, r) => n + r.nuovi, 0)
}

/** Aperto il cuoricino: da qui in poi niente è più "nuovo". */
export async function segnaNotificheLette(ioId) {
  if (!ioId) return
  const { error } = await supabase
    .from('notifiche_lette')
    .upsert({ user_id: ioId, letto_il: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) console.warn('Notifiche non segnate come lette', error.message)
}

/**
 * Chi, in parole: "Ale", "Ale e Bea", "Ale, Bea e altri 3".
 * @param {string[]} nomi  dal più recente
 * @param {number} persone quante in tutto
 */
export function chiInParole(nomi, persone) {
  const n = Math.max(persone, nomi.length)
  if (nomi.length === 0) return n === 1 ? 'Qualcuno' : `${n} persone`
  if (n === 1) return nomi[0]
  if (n === 2 && nomi.length >= 2) return `${nomi[0]} e ${nomi[1]}`
  const primi = nomi.slice(0, 2)
  const altri = n - primi.length
  return `${primi.join(', ')} e ${altri === 1 ? 'un altro' : `altri ${altri}`}`
}

/**
 * La frase della notifica (senza il nome dell'allenamento).
 * @param {Notifica} r
 */
export function fraseNotifica(r) {
  const chi = chiInParole(r.nomi, r.persone)
  const plurale = Math.max(r.persone, r.nomi.length) > 1
  if (r.tipo === 'mi_piace') return `${chi} ${plurale ? 'hanno' : 'ha'} messo mi piace`
  const quanti = r.quanti > 1 ? ` (${r.quanti} commenti)` : ''
  return `${chi} ${plurale ? 'hanno' : 'ha'} commentato${quanti}`
}
