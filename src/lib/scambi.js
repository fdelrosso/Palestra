// ---------------------------------------------------------------------------
// Quello che ci si manda fra amici (schede, allenamenti, recap, foto e video)
// visto DENTRO la chat con quella persona, insieme ai messaggi.
//
// Prima stava in "Ricevuti e inviati", nel profilo di Social e in quello
// dell'amico: un posto in più da sapere che c'era. Adesso si trova dove lo si
// cerca, nella conversazione con chi te l'ha mandato (o a cui l'hai mandato).
//
// ⚠️ Sul database restano due cose diverse dai messaggi: le condivisioni
// (lib/condivisioni, restano finché non le togli) e gli effimeri
// (lib/effimeri, scadono). Qui si mettono solo IN FILA con i messaggi; le
// regole di ciascuno non cambiano.
// ---------------------------------------------------------------------------

import { ETICHETTA_TIPO } from './condivisioni'

const ms = (d) => new Date(d || 0).getTime()

/**
 * Le cose scambiate con `altroId`, ciascuna col suo momento.
 * @param {{ricevute:object[], inviate:object[]}} condivisioni  da useAccount
 * @param {{ricevuti:object[], inviati:object[]}} effimeri     da useAccount
 * @returns {{genere:'condivisione'|'effimero', id:string, quando:string, mio:boolean, c?:object, r?:object}[]}
 */
export function scambiCon(condivisioni, effimeri, altroId) {
  if (!altroId) return []
  const out = []
  for (const c of condivisioni?.ricevute || []) {
    if (c.daId === altroId) out.push({ genere: 'condivisione', id: c.id, quando: c.creataIl, mio: false, c })
  }
  for (const c of condivisioni?.inviate || []) {
    if (c.aId === altroId) out.push({ genere: 'condivisione', id: c.id, quando: c.creataIl, mio: true, c })
  }
  for (const r of effimeri?.ricevuti || []) {
    if (r.daId === altroId) out.push({ genere: 'effimero', id: r.id, quando: r.inviatoIl, mio: false, r })
  }
  for (const r of effimeri?.inviati || []) {
    if (r.aId === altroId) out.push({ genere: 'effimero', id: r.id, quando: r.inviatoIl, mio: true, r })
  }
  return out.sort((a, b) => ms(a.quando) - ms(b.quando))
}

/**
 * Messaggi e scambi in un'unica fila, dal più vecchio.
 * @param {object[]} messaggi  righe della tabella `messaggi` (creato_il)
 */
export function filaChat(messaggi, scambi) {
  const m = (messaggi || []).map((x) => ({ genere: 'messaggio', id: x.id, quando: x.creato_il, m: x }))
  return [...m, ...(scambi || [])].sort((a, b) => ms(a.quando) - ms(b.quando))
}

/** Come si legge uno scambio nell'anteprima dell'elenco delle chat. */
export function anteprimaScambio(s) {
  if (s.genere === 'effimero') return s.r.tipo === 'video' ? '🎬 Video' : '📷 Foto'
  const tipo = ETICHETTA_TIPO[s.c.tipo] || 'Contenuto'
  return s.c.titolo ? `${tipo}: ${s.c.titolo}` : tipo
}

/**
 * L'elenco delle chat con dentro anche gli scambi: per ogni persona l'ultima
 * cosa (messaggio o scambio) e quante cose aspettano di essere viste. Chi ti
 * ha solo mandato una scheda, senza scriverti, compare lo stesso.
 * @param {object[]} conversazioni  le righe di `conversazioni()` sul database
 * @param {(id:string) => string} nomeDi  per chi non ha `altro_nome`
 */
export function conversazioniConScambi(conversazioni, condivisioni, effimeri, nomeDi = () => '') {
  const perId = new Map((conversazioni || []).map((c) => [c.altro_id, { ...c }]))
  const tutti = [
    ...(condivisioni?.ricevute || []).map((c) => ({ altro: c.daId, nome: c.daNome, s: { genere: 'condivisione', c, mio: false, quando: c.creataIl }, nuovo: !c.vistaIl })),
    ...(condivisioni?.inviate || []).map((c) => ({ altro: c.aId, s: { genere: 'condivisione', c, mio: true, quando: c.creataIl }, nuovo: false })),
    ...(effimeri?.ricevuti || []).map((r) => ({ altro: r.daId, nome: r.daNome, s: { genere: 'effimero', r, mio: false, quando: r.inviatoIl }, nuovo: !r.apertoIl })),
    ...(effimeri?.inviati || []).map((r) => ({ altro: r.aId, s: { genere: 'effimero', r, mio: true, quando: r.inviatoIl }, nuovo: false })),
  ]
  for (const { altro, nome, s, nuovo } of tutti) {
    if (!altro) continue
    let riga = perId.get(altro)
    if (!riga) {
      riga = { altro_id: altro, altro_nome: nome || nomeDi(altro) || '', creato_il: null, testo: '', da_me: false, non_letti: 0 }
      perId.set(altro, riga)
    }
    if (nuovo) riga.non_letti = (Number(riga.non_letti) || 0) + 1
    if (ms(s.quando) > ms(riga.creato_il)) {
      riga.creato_il = s.quando
      riga.testo = anteprimaScambio(s)
      riga.da_me = s.mio
    }
  }
  return [...perId.values()].sort((a, b) => ms(b.creato_il) - ms(a.creato_il))
}
