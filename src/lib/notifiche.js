// ---------------------------------------------------------------------------
// Le notifiche: mi piace e commenti sui propri allenamenti, raggruppati; e
// dal 2026-10-28 quelle di Check e video fra atleta e PT (`daRigaCheck`).
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

/**
 * Le notifiche di "Check e video" (2026-10-28, `notifiche_check()`): al PT
 * "X ti ha mandato un video", a tutti e due "Y ha commentato". Una riga per
 * evento, non raggruppate: sono poche e ognuna porta a uno scatto preciso.
 *
 * @typedef {Object} NotificaCheck
 * @property {'check'} genere
 * @property {string} chiave       l'id dello scatto
 * @property {string} atletaId     di chi è lo scatto (= la cartella)
 * @property {string} atletaNome
 * @property {'check'|'esecuzione'} categoria
 * @property {'condiviso'|'commento'} tipo
 * @property {string} chi          chi l'ha fatto
 * @property {number} nuovi        1 se arrivata dopo l'ultima apertura
 * @property {string} ultimoIl
 * @property {string} ultimoTesto
 */
export function daRigaCheck(r) {
  return {
    genere: 'check',
    chiave: r.progresso_id,
    atletaId: r.atleta_id,
    atletaNome: r.atleta_nome || '',
    categoria: r.categoria === 'esecuzione' ? 'esecuzione' : 'check',
    tipo: r.tipo === 'commento' ? 'commento' : 'condiviso',
    chi: r.chi_nome || '',
    nuovi: r.nuovo ? 1 : 0,
    ultimoIl: r.quando,
    ultimoTesto: r.testo || '',
  }
}

/**
 * Tutte le notifiche, dalla più recente: quelle degli allenamenti e quelle di
 * Check e video. ⚠️ Se `notifiche_check` non c'è ancora (database non
 * aggiornato) si va avanti con le altre: non è un motivo per spegnere il
 * cuoricino.
 * @returns {Promise<{ok:boolean, righe:(Notifica|NotificaCheck)[]}>}
 */
export async function leggiNotifiche() {
  const [allenamenti, check, rinnovi, appuntamenti, allungamenti, allegati, modifiche] = await Promise.all([
    supabase.rpc('notifiche_interazioni'),
    supabase.rpc('notifiche_check'),
    supabase.rpc('notifiche_rinnovi'),
    supabase.rpc('notifiche_appuntamenti'),
    supabase.rpc('notifiche_allungamenti'),
    supabase.rpc('notifiche_allegati_pt'),
    supabase.rpc('notifiche_modifiche_scheda'),
  ])
  if (allenamenti.error) {
    console.warn('Lettura delle notifiche non riuscita', allenamenti.error.message)
    return { ok: false, righe: [] }
  }
  if (check.error) console.warn('Notifiche di Check e video non lette', check.error.message)
  if (rinnovi.error) console.warn('Notifiche delle schede del PT non lette', rinnovi.error.message)
  if (modifiche.error) console.warn('Notifiche delle modifiche alle schede non lette', modifiche.error.message)
  if (allegati.error) console.warn('Notifiche degli allegati del PT non lette', allegati.error.message)
  if (allungamenti.error) console.warn('Notifiche degli allungamenti non lette', allungamenti.error.message)
  if (appuntamenti.error) console.warn('Notifiche degli appuntamenti non lette', appuntamenti.error.message)
  const righe = [
    ...(allenamenti.data || []).map(daRiga),
    ...(check.data || []).map(daRigaCheck),
    ...(rinnovi.data || []).map(daRigaScheda),
    ...(allungamenti.data || []).map(daRigaScheda),
    ...(allegati.data || []).map(daRigaScheda),
    ...(modifiche.data || []).map(daRigaScheda),
    ...(appuntamenti.data || []).map(daRigaAppuntamento),
  ]
  righe.sort((a, b) => String(b.ultimoIl || '').localeCompare(String(a.ultimoIl || '')))
  return { ok: true, righe }
}

/** La frase di una notifica di Check e video. */
export function fraseNotificaCheck(r) {
  const cosa = r.categoria === 'esecuzione' ? 'un video di esecuzione' : 'una foto del check'
  if (r.tipo === 'condiviso') return `${r.chi} ti ha mandato ${cosa}`
  return `${r.chi} ha commentato ${r.categoria === 'esecuzione' ? 'il video' : 'la foto'}`
}

/**
 * Le notifiche delle schede del PT (2026-10-28, `notifiche_rinnovi()`): al
 * PT "X chiede il rinnovo"; all'atleta la scheda scaduta, il rinnovo
 * accettato o no, le settimane sbloccate (scheda a parti).
 *
 * @typedef {Object} NotificaScheda
 * @property {'scheda'} genere
 * @property {string} chiave       l'id della proposta
 * @property {string} atletaId
 * @property {string} nome         della scheda
 * @property {'richiesta'|'accettata'|'rifiutata'|'scaduta'|'sbloccata'|'allunga-richiesta'|'allunga-accettata'|'allunga-rifiutata'} tipo
 *   (gli `allunga-` da `notifiche_allungamenti()`: lì `settimane` = quante in più;
 *   gli `allegato-video|foto|consiglio` da `notifiche_allegati_pt()`: lì il
 *   testo è "esercizio|giorno"; 'modificata' da `notifiche_modifiche_scheda()`:
 *   lì il testo è l'elenco dei cambi, una riga ciascuno)
 * @property {string} chi
 * @property {string|null} scadenza
 * @property {number|null} settimane
 */
export function daRigaScheda(r) {
  return {
    genere: 'scheda',
    chiave: r.proposta_id,
    atletaId: r.atleta_id,
    nome: r.scheda_nome || 'Scheda',
    tipo: r.tipo,
    chi: r.chi_nome || '',
    scadenza: r.scadenza || null,
    settimane: r.settimane ?? null,
    nuovi: r.nuovo ? 1 : 0,
    ultimoIl: r.quando,
    ultimoTesto: r.testo || '',
  }
}

/** La frase di una notifica delle schede del PT. `data` formatta la scadenza. */
export function fraseNotificaScheda(r, data = (x) => x) {
  const s = `«${r.nome}»`
  switch (r.tipo) {
    case 'richiesta':
      return `${r.chi} chiede di rinnovare ${s}`
    case 'accettata':
      return `${r.chi} ha rinnovato ${s}${r.scadenza ? ` fino al ${data(r.scadenza)}` : ''}`
    case 'rifiutata':
      return `${r.chi} non ha rinnovato ${s}`
    case 'scaduta':
      return `${s} è scaduta: puoi chiedere il rinnovo a ${r.chi}`
    case 'modificata':
      return `${r.chi} ha modificato ${s}`
    case 'allegato-video':
    case 'allegato-foto':
    case 'allegato-consiglio': {
      const [esercizio, giorno] = String(r.ultimoTesto || '').split('|')
      const cosa = { 'allegato-video': 'un video', 'allegato-foto': 'una foto', 'allegato-consiglio': 'un consiglio' }[r.tipo]
      const dove = [esercizio && `«${esercizio}»`, giorno && `(${giorno})`].filter(Boolean).join(' ')
      return `${r.chi} ha aggiunto ${cosa}${dove ? ` su ${dove}` : ''} in ${s}`
    }
    case 'allunga-richiesta':
      return `${r.chi} chiede di allungare ${s}`
    case 'allunga-accettata':
      return `${r.chi} ha allungato ${s}${r.settimane ? ` di ${r.settimane} settiman${r.settimane === 1 ? 'a' : 'e'}` : ''}`
    case 'allunga-rifiutata':
      return `${r.chi} non ha allungato ${s}`
    case 'sbloccata':
      return `${r.chi} ha sbloccato ${s}${r.settimane ? ` fino alla settimana ${r.settimane}` : ''}`
    default:
      return s
  }
}

/**
 * Gli appuntamenti fra atleta e PT (2026-10-28, `notifiche_appuntamenti()`):
 * l'ultima mossa dell'altro, una riga per appuntamento.
 */
export function daRigaAppuntamento(r) {
  return {
    genere: 'appuntamento',
    chiave: r.appuntamento_id,
    tipo: r.tipo,
    chi: r.chi_nome || '',
    giorno: r.giorno || null,
    ora: r.ora || null,
    nuovi: r.nuovo ? 1 : 0,
    ultimoIl: r.quando,
    ultimoTesto: r.testo || '',
  }
}

/** La frase di una notifica di appuntamento. `orario` scrive giorno e ora. */
export function fraseNotificaAppuntamento(r, orario = (o) => `${o.giorno} ${o.ora}`) {
  switch (r.tipo) {
    case 'richiesta':
      return `${r.chi} chiede un appuntamento`
    case 'proposte':
      return `${r.chi} ha proposto altri orari per l’appuntamento`
    case 'fissato':
      return `Appuntamento con ${r.chi} fissato${r.giorno ? `: ${orario({ giorno: r.giorno, ora: r.ora })}` : ''}`
    case 'annullato':
      // Era fissato (giorno e ora restano anche annullato): si dice quale.
      // Senza, era ancora una trattativa.
      return r.giorno
        ? `${r.chi} ha annullato l’appuntamento fissato per ${orario({ giorno: r.giorno, ora: r.ora })}`
        : `${r.chi} ha lasciato perdere la richiesta di appuntamento`
    default:
      return `Appuntamento con ${r.chi}`
  }
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
