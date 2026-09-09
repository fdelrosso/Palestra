// ---------------------------------------------------------------------------
// Foto e video MOMENTANEI mandati a un amico.
//
// Il punto non è la privacy: è la memoria. Un video di 10" pesa ~15MB, e i
// blob stanno in IndexedDB, che su iPhone il sistema può svuotare quando lo
// spazio scarseggia (vedi context.md §7). Se ogni foto mandata restasse per
// sempre, in un mese l'app diventerebbe il file più pesante del telefono.
//
// Quindi un invio vive **il minimo indispensabile**:
//   - si cancella appena il destinatario l'ha guardato (chiuso il visore);
//   - e comunque dopo 24 ore, guardato o no.
// Cancellare vuol dire togliere il BLOB da IndexedDB. Resta solo la riga di
// metadati (poche decine di byte: chi, quando, se l'ha visto), che sparisce a
// sua volta 24 ore dopo — così il mittente per un giorno vede "l'ha aperta".
//
// La pulizia gira all'avvio dell'app e ogni volta che si apre la pagina
// Condivisi: non serve un timer, basta che nessuno possa arrivare al blob
// dopo la scadenza.
// ---------------------------------------------------------------------------

import { eliminaMedia, getMediaBlob, salvaMedia } from './media'

const KEY_EFFIMERI = 'palestra:effimeri:v1'

/** Dopo quante ore un invio sparisce comunque, anche se mai aperto. */
export const ORE_SCADENZA = 24

/** Quanto resta a schermo una foto prima di chiudersi da sola (secondi). */
export const SECONDI_FOTO = 10

function nuovoIdEffimero() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function caricaEffimeri() {
  try {
    const raw = localStorage.getItem(KEY_EFFIMERI)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.warn('Lettura invii momentanei fallita', e)
  }
  return []
}

export function salvaEffimeri(righe) {
  try {
    localStorage.setItem(KEY_EFFIMERI, JSON.stringify(righe))
  } catch (e) {
    console.warn('Salvataggio invii momentanei fallito', e)
  }
}

/**
 * @typedef {Object} Effimero
 * @property {string} id          chiave del blob in IndexedDB
 * @property {string} daId
 * @property {string} daNome
 * @property {string} aId
 * @property {'foto'|'video'} tipo
 * @property {string} nome        nome del file (solo per l'elenco)
 * @property {number} peso        byte, per dire quanto si è liberato
 * @property {string} inviatoIl   ISO
 * @property {string} scadeIl     ISO: dopo, sparisce comunque
 * @property {string|null} apertoIl
 * @property {boolean} consumato  true = il blob non c'è più
 */

const oreDopo = (ore) => new Date(Date.now() + ore * 3600 * 1000).toISOString()

/**
 * Salva il blob e crea la riga. Il blob va in IndexedDB (come i media degli
 * esercizi), la riga in localStorage.
 * @returns {Promise<Effimero>}
 */
export async function creaEffimero({ daId, daNome, aId, tipo, nome, blob }) {
  const id = nuovoIdEffimero()
  await salvaMedia(id, blob, { tipo, nome, effimero: true })
  return {
    id,
    daId,
    daNome: daNome || '',
    aId,
    tipo,
    nome: nome || '',
    peso: blob?.size || 0,
    inviatoIl: new Date().toISOString(),
    scadeIl: oreDopo(ORE_SCADENZA),
    apertoIl: null,
    consumato: false,
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
 * Toglie i blob di tutto ciò che è scaduto e restituisce le righe rimaste.
 * Da chiamare all'avvio e all'apertura della pagina Condivisi.
 * @returns {Promise<Effimero[]>}
 */
export async function pulisciScaduti(righe, ora = Date.now()) {
  const vive = []
  for (const r of righe || []) {
    if (!scaduto(r, ora)) {
      vive.push(r)
      continue
    }
    if (!r.consumato) await eliminaMedia(r.id).catch(() => {})
  }
  return vive
}

/** Come sopra, ma legge e riscrive da sola: comodo all'avvio dell'app. */
export async function pulisciEffimeriSalvati() {
  const righe = caricaEffimeri()
  const vive = await pulisciScaduti(righe)
  if (vive.length !== righe.length) salvaEffimeri(vive)
  return vive
}

/** Il blob da mostrare, o null se non c'è più (scaduto o già guardato). */
export function blobEffimero(id) {
  return getMediaBlob(id).catch(() => null)
}

/**
 * L'ha guardato: via il blob. La riga resta (marcata) finché non scade, così
 * il mittente vede che è arrivato a destinazione.
 * @returns {Promise<Effimero>} la riga aggiornata
 */
export async function consumaEffimero(riga) {
  await eliminaMedia(riga.id).catch(() => {})
  return { ...riga, consumato: true, apertoIl: riga.apertoIl || new Date().toISOString() }
}

/** Toglie ogni invio che tocca un profilo (quando lo si elimina). */
export async function effimeriSenzaUtente(righe, id) {
  const restano = []
  for (const r of righe || []) {
    if (r.daId === id || r.aId === id) {
      if (!r.consumato) await eliminaMedia(r.id).catch(() => {})
      continue
    }
    restano.push(r)
  }
  return restano
}
