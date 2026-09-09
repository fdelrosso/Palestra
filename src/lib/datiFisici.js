// ---------------------------------------------------------------------------
// I dati fisici di un PROFILO: sesso, eta, peso, altezza, quanto ci si muove
// nella giornata, cosa si sta cercando di ottenere (mantenimento, massa,
// perdita di peso...) e da quanto ci si allena (il LIVELLO).
//
// Il livello sta qui insieme agli altri per lo stesso motivo: e' una cosa della
// PERSONA, non di una scheda. Le regole di cosa comporta stanno in lib/livello,
// che e' l'unico posto che le conosce; qui c'e' solo il campo. Vuoto = non
// dichiarato, e allora il motore non mette limiti a niente.
//
// Perche' stanno sul profilo e non sulla dieta. Sono la stessa persona in due
// posti: le calorie bruciate in un allenamento dipendono da quanto pesi, e le
// calorie da mangiare dipendono da peso, altezza, eta e sesso. Prima il peso
// esisteva solo dentro la Dieta: chi non aveva ancora una dieta si vedeva le
// calorie stimate "su 75 kg", cioe' su una persona che non era lui. Ora i dati
// si chiedono alla creazione dell'account (pages/UserGate), si cambiano quando
// si vuole dal menu del profilo (pages/DatiFisiciPage) e da li' li leggono sia
// il recap (lib/recap) sia la dieta consigliata (lib/dieta).
//
// Nessun dato e' obbligatorio nel modello: i profili nati prima di questa
// funzione non ne hanno, e un profilo di personal trainer puo' non volerli
// dare. La regola e' una sola e vale ovunque: **quello che non c'e' non si
// mostra e non si inventa**. Niente valori di ripiego travestiti da stime.
//
// ⚠️ L'eta e' un NUMERO, non una data di nascita: invecchia solo se uno la
// aggiorna. E' una scelta di semplicita' — sul metabolismo basale un anno di
// differenza vale ~5 kcal, dentro l'errore della formula stessa.
// ---------------------------------------------------------------------------

import { LIVELLI, labelLivello } from './livello'

export { LIVELLI, labelLivello }

export const SESSI = [
  { id: 'm', label: 'Uomo' },
  { id: 'f', label: 'Donna' },
]

// Movimento giornaliero (attivita' della vita quotidiana, ESCLUSI gli
// allenamenti, che vengono aggiunti a parte per i giorni di allenamento).
export const MOVIMENTI = [
  { id: 'sedentario', label: 'Sedentario (ufficio, poco movimento)', fattore: 1.2 },
  { id: 'leggero', label: 'Leggero (in piedi, qualche camminata)', fattore: 1.3 },
  { id: 'moderato', label: 'Moderato (molto in movimento)', fattore: 1.45 },
  { id: 'attivo', label: 'Molto attivo (lavoro fisico)', fattore: 1.6 },
]

// Lo scopo per cui ci si allena → quanto si mangia rispetto al mantenimento e
// quante proteine per kg. Sono gli stessi identici valori che usa la dieta:
// l'obiettivo e' UNO, quello della persona, e la dieta lo eredita.
export const OBIETTIVI = [
  { id: 'dimagrimento', label: 'Perdita di peso', fattore: 0.8, proteine: 2.2 },
  { id: 'mantenimento', label: 'Mantenimento', fattore: 1.0, proteine: 1.8 },
  { id: 'massa', label: 'Aumento di massa', fattore: 1.12, proteine: 2.0 },
  { id: 'ricomposizione', label: 'Ricomposizione', fattore: 0.9, proteine: 2.2 },
]

export function labelSesso(id) {
  return SESSI.find((s) => s.id === id)?.label || ''
}
export function labelMovimento(id) {
  return MOVIMENTI.find((m) => m.id === id)?.label || id || ''
}
export function labelObiettivo(id) {
  return OBIETTIVI.find((o) => o.id === id)?.label || id || ''
}

export function movimentoDi(id) {
  return MOVIMENTI.find((m) => m.id === id) || MOVIMENTI[1]
}
export function obiettivoDi(id) {
  return OBIETTIVI.find((o) => o.id === id) || OBIETTIVI[1]
}

// Limiti di plausibilita' dei campi: non sono un giudizio su nessuno, servono a
// intercettare l'altezza scritta in metri ("1,80") o il peso in grammi.
export const LIMITI = {
  eta: { min: 12, max: 100, label: 'età', unita: 'anni' },
  peso: { min: 30, max: 300, label: 'peso', unita: 'kg' },
  altezza: { min: 120, max: 230, label: 'altezza', unita: 'cm' },
}

/**
 * Numero positivo dentro i limiti, oppure null. I campi arrivano da <input>:
 * possono essere stringhe, vuoti o spazzatura, e la virgola decimale italiana
 * va accettata ("78,5").
 */
export function numeroValido(v, limiti) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  if (limiti && (n < limiti.min || n > limiti.max)) return null
  return n
}

export function datiFisiciVuoti() {
  return {
    sesso: '',
    eta: '',
    peso: '',
    altezza: '',
    movimento: 'leggero',
    obiettivo: 'mantenimento',
    // Il livello di esperienza non ha un default apposta: sceglierne uno per
    // conto di chi si iscrive vorrebbe dire decidere al posto suo quali
    // esercizi vedrà. Vuoto = nessun limite (vedi lib/livello).
    livello: '',
    aggiornatiIl: '',
  }
}

export function normalizzaDatiFisici(d) {
  const base = datiFisiciVuoti()
  if (!d || typeof d !== 'object') return base
  return {
    ...base,
    ...d,
    sesso: SESSI.some((s) => s.id === d.sesso) ? d.sesso : '',
    movimento: MOVIMENTI.some((m) => m.id === d.movimento) ? d.movimento : base.movimento,
    obiettivo: OBIETTIVI.some((o) => o.id === d.obiettivo) ? d.obiettivo : base.obiettivo,
    livello: LIVELLI.some((l) => l.id === d.livello) ? d.livello : '',
  }
}

/** Il peso corporeo in kg, o null se non c'e' (serve alle calorie del recap). */
export function pesoDi(dati) {
  return numeroValido(dati?.peso, LIMITI.peso)
}

/** I campi che mancano per poter calcolare qualcosa, gia' col nome per scritto. */
export function datiMancanti(dati) {
  const out = []
  if (!numeroValido(dati?.peso, LIMITI.peso)) out.push('peso')
  if (!numeroValido(dati?.altezza, LIMITI.altezza)) out.push('altezza')
  if (!numeroValido(dati?.eta, LIMITI.eta)) out.push('età')
  if (!dati?.sesso) out.push('sesso')
  return out
}

/** True se ci sono tutti i dati per il metabolismo basale. */
export function datiCompleti(dati) {
  return datiMancanti(dati).length === 0
}

/**
 * Metabolismo basale (Mifflin-St Jeor): le calorie che il corpo consuma a
 * riposo assoluto. Null se manca anche uno solo dei dati — meglio niente che
 * un numero costruito su un peso inventato.
 */
export function metabolismoBasale(dati) {
  const peso = numeroValido(dati?.peso, LIMITI.peso)
  const altezza = numeroValido(dati?.altezza, LIMITI.altezza)
  const eta = numeroValido(dati?.eta, LIMITI.eta)
  if (peso == null || altezza == null || eta == null || !dati?.sesso) return null
  return Math.round(10 * peso + 6.25 * altezza - 5 * eta + (dati.sesso === 'f' ? -161 : 5))
}

/** Le calorie di MANTENIMENTO in un giorno senza allenamento (BMR × movimento). */
export function mantenimento(dati) {
  const bmr = metabolismoBasale(dati)
  return bmr == null ? null : Math.round(bmr * movimentoDi(dati.movimento).fattore)
}

/** Le calorie consigliate per l'obiettivo dichiarato, in un giorno di riposo. */
export function kcalConsigliate(dati) {
  const m = mantenimento(dati)
  return m == null ? null : Math.round((m * obiettivoDi(dati.obiettivo).fattore) / 10) * 10
}

/** Una riga da mostrare accanto all'obiettivo: cosa comporta, in kcal. */
export function scartoObiettivo(dati) {
  const m = mantenimento(dati)
  const k = kcalConsigliate(dati)
  if (m == null || k == null) return ''
  const d = k - m
  if (Math.abs(d) < 25) return 'in pari col mantenimento'
  return d > 0 ? `+${d} kcal sul mantenimento` : `${d} kcal sul mantenimento`
}
