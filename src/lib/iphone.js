// ---------------------------------------------------------------------------
// L'APP SU IPHONE: non c'è un APK, ma il sito si mette sulla schermata Home
// (Safari → Condividi → "Aggiungi alla schermata Home") e da lì si apre a
// tutto schermo come un'app. A chi usa l'iPhone dal browser lo si spiega
// (components/CardAppIphone), come ad Android si propone l'APK (lib/apk).
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core'

/**
 * Un iPhone/iPad nel browser, non dall'icona sulla Home né dentro un'app
 * nativa. L'iPad da iPadOS 13 si presenta come un Mac: lo si riconosce dal
 * touch. Riceve l'ambiente per poterlo provare nei test.
 */
export function iphoneSenzaHome(amb = ambiente()) {
  if (!amb) return false
  const ios = /iPhone|iPad|iPod/i.test(amb.userAgent) || (/Macintosh/i.test(amb.userAgent) && amb.maxTouchPoints > 1)
  return ios && !amb.standalone && !amb.nativo
}

function ambiente() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return null
  let daHome = navigator.standalone === true
  try {
    daHome = daHome || window.matchMedia('(display-mode: standalone)').matches
  } catch {
    /* matchMedia assente: basta navigator.standalone */
  }
  return {
    userAgent: navigator.userAgent || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: daHome,
    nativo: Capacitor.isNativePlatform(),
  }
}
