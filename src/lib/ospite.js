import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// La modalità ospite: chi non ha un account guarda l'app senza entrare.
// Il flag sta in sessionStorage: resta col ricaricare, finisce chiudendo la
// scheda del browser. I dati sono un esempio (data/ospite), il feed è vero
// (pages/FeedOspite). Niente si scrive: ogni azione chiede l'account.
// ---------------------------------------------------------------------------

const CHIAVE = 'palestra:ospite'
const CHIAVE_POI = 'palestra:ospite-poi'
const CAMBIO_OSPITE = 'palestra:ospite-cambio'
export const EVENTO_ACCOUNT = 'palestra:chiedi-account'

export function inOspite() {
  try {
    return sessionStorage.getItem(CHIAVE) === '1'
  } catch {
    return false
  }
}

function avvisa() {
  globalThis.dispatchEvent?.(new Event(CAMBIO_OSPITE))
}

export function entraOspite() {
  try {
    sessionStorage.setItem(CHIAVE, '1')
  } catch {
    /* niente storage: l'ospite dura finché non si ricarica */
  }
  avvisa()
}

/** `poi`: la schermata di UserGate da cui ripartire ('crea'), o null. */
export function esciOspite(poi = null) {
  try {
    sessionStorage.removeItem(CHIAVE)
    if (poi) sessionStorage.setItem(CHIAVE_POI, poi)
  } catch {
    /* come sopra */
  }
  avvisa()
}

/** La schermata chiesta uscendo dall'ospite, una volta sola. */
export function prendiSchermataDopoOspite() {
  try {
    const poi = sessionStorage.getItem(CHIAVE_POI)
    sessionStorage.removeItem(CHIAVE_POI)
    return poi
  } catch {
    return null
  }
}

function iscriviti(avvisami) {
  globalThis.addEventListener?.(CAMBIO_OSPITE, avvisami)
  return () => globalThis.removeEventListener?.(CAMBIO_OSPITE, avvisami)
}

export function useOspite() {
  return useSyncExternalStore(iscriviti, inOspite, () => false)
}

// Le pagine che un ospite vede. Le altre (modificare, importare, allenarsi,
// tutto il sociale tranne il feed, il lavoro da PT) → components/Ospite,
// PaginaChiusa. ⚠️ Una pagina nuova si aggiunge qui solo se regge senza
// account: legge da useStore/useAccount, non da Supabase.
export const ROTTE_OSPITE = [
  'inizio',
  'home',
  'scheda',
  'calendario',
  'recap-mese',
  'svolto',
  'dieta',
  'dieta-oggi',
  'dieta-vista',
  'dieta-storico',
  'dieta-schema',
  'dieta-peso',
  'esercizi',
  'esercizi-gruppo',
  'feed',
]

export const rottaPerOspite = (nome) => ROTTE_OSPITE.includes(nome)

/**
 * Apre il foglio "Crea un account" (components/Ospite, FoglioAccount). Solo
 * da un gesto: una funzione chiamata da un effetto, all'apertura di una
 * pagina, non deve far saltare fuori il foglio. `userActivation` è del
 * browser; dove non c'è si apre sempre.
 */
export function chiediAccount(cosa) {
  const gesto = globalThis.navigator?.userActivation
  if (gesto && !gesto.isActive) return undefined
  globalThis.dispatchEvent?.(new CustomEvent(EVENTO_ACCOUNT, { detail: cosa }))
  return undefined
}

/** Lo stesso oggetto, ma ogni funzione (tranne `letture`) chiede l'account e non fa niente. */
export function soloLettura(valore, chiedi = chiediAccount, letture = []) {
  const out = {}
  for (const [k, v] of Object.entries(valore)) {
    out[k] = typeof v === 'function' && !letture.includes(k) ? () => void chiedi(k) : v
  }
  return out
}
