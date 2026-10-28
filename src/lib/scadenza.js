// ---------------------------------------------------------------------------
// La scadenza di una scheda mandata dal PT (2026-10-28): i conti sulle date.
// A parte, senza import, così si prova da Node (tests/scadenza.test.js).
// Le date sono giorni 'AAAA-MM-GG' nell'ora di chi guarda, come `date` nel
// database (schede_proposte.scade_il).
// ---------------------------------------------------------------------------

/** 'AAAA-MM-GG' di un giorno, nell'ora locale. */
export function giornoIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function daIso(iso) {
  const [a, m, g] = String(iso).split('-').map(Number)
  return new Date(a, m - 1, g)
}

/** Il giorno `n` giorni dopo `iso`. */
export function piuGiorni(iso, n) {
  const d = daIso(iso)
  d.setDate(d.getDate() + n)
  return giornoIso(d)
}

/** Domani: la scadenza più vicina che si può mettere. */
export function domani(oggi = giornoIso()) {
  return piuGiorni(oggi, 1)
}

/**
 * Quella proposta al PT quando manda una scheda: tante settimane quante ne
 * ha la scheda (4 se è senza fine), da oggi.
 */
export function scadenzaProposta(scheda, oggi = giornoIso()) {
  const settimane = scheda?.senzaFine ? 4 : Math.max(1, Number(scheda?.numeroSettimane) || 4)
  return piuGiorni(oggi, settimane * 7)
}

/** Quanti giorni da `oggi` a `iso` (negativo se è passato). */
export function giorniA(iso, oggi = giornoIso()) {
  return Math.round((daIso(iso) - daIso(oggi)) / 86400000)
}

/**
 * Com'è messa: null se non scade; altrimenti { scaduta, giorni } con
 * `giorni` che mancano (0 = scade oggi, e allora è già scaduta: da quel
 * giorno compreso si può chiedere il rinnovo).
 */
export function statoScadenza(scadeIl, oggi = giornoIso()) {
  if (!scadeIl) return null
  const giorni = giorniA(scadeIl, oggi)
  return { scaduta: giorni <= 0, giorni }
}

/** "25 novembre", con l'anno solo se non è quello di `oggi`. */
export function dataScadenza(iso, oggi = giornoIso()) {
  if (!iso) return ''
  const d = daIso(iso)
  const anno = d.getFullYear() !== daIso(oggi).getFullYear()
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', ...(anno ? { year: 'numeric' } : {}) }).format(d)
}

/** "oggi", "domani", "tra 5 giorni", "ieri", "3 giorni fa". */
export function quandoScade(iso, oggi = giornoIso()) {
  const n = giorniA(iso, oggi)
  if (n === 0) return 'oggi'
  if (n === 1) return 'domani'
  if (n === -1) return 'ieri'
  return n > 0 ? `tra ${n} giorni` : `${-n} giorni fa`
}

/** Una data valida per la scadenza: un giorno, da domani in poi. */
export function scadenzaValida(iso, oggi = giornoIso()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && giorniA(iso, oggi) >= 1
}
