// ---------------------------------------------------------------------------
// IL GIORNO GUARDATO in Dieta → Oggi: con le frecce ‹ › accanto alla data si
// va ai giorni passati (vedere cosa si era mangiato, correggerlo) o a quelli
// dopo (cosa propone la dieta domani, con lo schema di quel giorno).
//
// ⚠️ Si tiene QUI, fuori dalla pagina, perché entrando in un pasto
// (/dieta/oggi/pranzo) e tornando indietro la pagina rinasce: il giorno
// scelto deve restare quello, non tornare a oggi a ogni passaggio.
//
// ⚠️ E però scade: chi ha guardato ieri e riapre l'app dopo pranzo vuole
// scrivere su OGGI, non trovarsi senza accorgersene sul giorno prima. Dopo
// un'ora senza toccare le frecce, e a ogni ricarica, si riparte da oggi.
// ---------------------------------------------------------------------------

import { oggiISO } from './dieta'

const DURATA = 60 * 60 * 1000

let scelto = null // { data: 'YYYY-MM-DD', il: ms }

/** Il giorno da mostrare: quello scelto con le frecce, se vale ancora, o oggi. */
export function giornoGuardato(adesso = new Date()) {
  const oggi = oggiISO(adesso)
  if (scelto && adesso.getTime() - scelto.il < DURATA && scelto.data !== oggi) return scelto.data
  return oggi
}

/** Ricorda il giorno scelto (oggi = nessuna scelta). */
export function guardaGiorno(data, adesso = new Date()) {
  scelto = data && data !== oggiISO(adesso) ? { data, il: adesso.getTime() } : null
}

/** 'YYYY-MM-DD' → Date a mezzanotte, ora locale. */
export function dataDa(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Il giorno `delta` giorni dopo `iso` (negativo = prima). */
export function spostaGiorno(iso, delta) {
  const d = dataDa(iso)
  d.setDate(d.getDate() + delta)
  return oggiISO(d)
}

/** "Oggi, giovedì 23 ottobre", "Ieri, …", "Domani, …", oppure "Lunedì 20 ottobre". */
export function etichettaGiorno(iso, adesso = new Date()) {
  const lunga = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(dataDa(iso))
  if (iso === oggiISO(adesso)) return `Oggi, ${lunga}`
  if (iso === spostaGiorno(oggiISO(adesso), -1)) return `Ieri, ${lunga}`
  if (iso === spostaGiorno(oggiISO(adesso), 1)) return `Domani, ${lunga}`
  return lunga.charAt(0).toUpperCase() + lunga.slice(1)
}
