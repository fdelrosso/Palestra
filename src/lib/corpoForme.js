// ---------------------------------------------------------------------------
// Quello che resta delle FORME del corpo: il cuore del cardio e il colore dei
// muscoli accesi.
//
// La sagoma e i muscoli non sono piu' path SVG scritti a mano: dal 2026-10-11
// il corpo sono immagini (lib/corpoImmagini). Le forme di prima stanno nella
// storia di git, se servisse riprenderle.
// ---------------------------------------------------------------------------

import { gruppoDi } from './muscoli.js'

const r3 = (n) => Math.round(n * 1000) / 1000

// Il cuore del cardio, disegnato attorno all'origine e non in posizione: cosi'
// il battito e' una `scale` attorno al suo centro sia in SVG (dentro un <g>
// traslato) sia su canvas (translate + scale), senza due path diversi.
export const CUORE =
  'M0 -6 q-4.6 -6.4 -9.2 -2.4 q-4 3.6 0 8.6 L0 8.4 L9.2 0.2 q4 -5 0 -8.6 q-4.6 -4 -9.2 2.4 Z'

// Il colore dei muscoli allenati: quello del SUO gruppo (lib/muscoli: petto
// rosso, schiena blu, gambe viola...), lo stesso dei pallini e delle etichette
// in tutta l'app, così il corpo si legge con lo stesso codice. Cambia solo di
// intensità: il gruppo su cui è andato il lavoro di oggi è pieno, quello
// sfiorato con due serie è slavato. La funzione sta qui perché il corpo si
// disegna in due modi (maschere CSS nella pagina, canvas nella card) e i due
// devono venire dello stesso colore.
// Fino al 2026-10-08 era un rosso solo per tutti: diceva "quanto", non "cosa".
const SENZA_GRUPPO = [235, 60, 55]

function rgbDi(hex) {
  const n = parseInt(String(hex || '').replace('#', ''), 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : SENZA_GRUPPO
}

// La vista "calore" (lib/recapLayout): un colore solo per tutti i gruppi, dal
// bianco (poco) al blu (tanto), come una mappa di calore. Chi pubblica sceglie
// quale vista si vede di base; chi guarda il recap aperto può cambiarla
// (components/RiepilogoDettaglio).
const SCALA_CALORE = [
  [255, 255, 255],
  [92, 200, 245],
  [29, 95, 214],
]
export function coloreCalore(quota) {
  const q = Math.max(0, Math.min(1, Number(quota) || 0))
  const x = q * (SCALA_CALORE.length - 1)
  const i = Math.min(SCALA_CALORE.length - 2, Math.floor(x))
  const f = x - i
  const [r, g, b] = SCALA_CALORE[i].map((c, k) => Math.round(c + (SCALA_CALORE[i + 1][k] - c) * f))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * @param {string} gruppo  id del gruppo (lib/muscoli)
 * @param {number} quota 0..1 = quanto pesa questo gruppo sull'allenamento
 * @param {boolean} [calore]  la scala bianco → blu invece del colore del gruppo
 */
export function coloreMuscolo(gruppo, quota, calore = false) {
  if (calore) return coloreCalore(quota)
  const q = Math.max(0, Math.min(1, Number(quota) || 0))
  const [r, g, b] = rgbDi(gruppoDi(gruppo)?.colore)
  return `rgba(${r}, ${g}, ${b}, ${r3(0.52 + 0.48 * q)})`
}
