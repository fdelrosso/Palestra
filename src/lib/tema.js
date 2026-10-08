// ---------------------------------------------------------------------------
// I colori dell'app: il MODO (chiaro, scuro, automatico = segue il telefono)
// e il COLORE (tasti, linguette, evidenziati). Di default automatico e celeste.
//
// La scelta resta su questo dispositivo — e' una preferenza di come si vede
// l'app, non un dato dell'account, quindi non va sul database: chi usa l'app
// sul telefono e sul PC puo' volerla diversa sui due.
//
// Fondi, card, testo, verde e rosso li danno i due blocchi di index.css
// (`data-tema`); dal colore scelto escono solo le variabili dell'accento.
//
// ⚠️ Il colore scelto NON sempre si usa cosi' com'e': il celeste su bianco
// sarebbe 1.9:1, illeggibile come testo. Se non si stacca abbastanza dal
// fondo lo si scurisce (o schiarisce) finche' non si legge.
//
// ⚠️ A scrivere i colori la PRIMA volta non e' questo file ma lo script nel
// <head> di index.html: se aspettassimo React la pagina lampeggerebbe a ogni
// apertura. Per non ricopiare li' i calcoli, qui si salvano GIA' FATTI
// (per tutti e due i temi) e lo script li appoggia e basta. Se cambia CHIAVE,
// o la forma di quello che si salva, va cambiato anche li'.
// ---------------------------------------------------------------------------

export const CHIAVE = 'palestra:colori:v1'
// La chiave del vecchio interruttore chiaro/scuro: chi aveva scelto "chiaro"
// ritrova il bianco (la legge anche index.html).
export const CHIAVE_VECCHIA = 'palestra:tema:v1'

export const SFONDO_DEFAULT = '#000000'
export const COLORE_DEFAULT = '#5cc8f5'

export const SFONDI = [
  { nome: 'Nero', hex: '#000000' },
  { nome: 'Grafite', hex: '#17191e' },
  { nome: 'Blu notte', hex: '#0b1526' },
  { nome: 'Bosco', hex: '#0c1a13' },
  { nome: 'Vinaccia', hex: '#1d0b12' },
  { nome: 'Bianco', hex: '#ffffff' },
  { nome: 'Crema', hex: '#f6f1e7' },
]

export const COLORI = [
  { nome: 'Celeste', hex: '#5cc8f5' },
  { nome: 'Blu', hex: '#3b82f6' },
  { nome: 'Verde', hex: '#34d399' },
  { nome: 'Lime', hex: '#a3e635' },
  { nome: 'Giallo', hex: '#facc15' },
  { nome: 'Arancio', hex: '#fb923c' },
  { nome: 'Rosso', hex: '#f87171' },
  { nome: 'Rosa', hex: '#f472b6' },
  { nome: 'Viola', hex: '#a78bfa' },
]

// --- conti sui colori ------------------------------------------------------

/** '#abc' o '#aabbcc' → [r,g,b]; qualunque altra cosa → null. */
export function daHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '')
  const pieno = s.length === 3 ? s.replace(/./g, (c) => c + c) : s
  if (!/^[0-9a-f]{6}$/i.test(pieno)) return null
  return [0, 2, 4].map((i) => parseInt(pieno.slice(i, i + 2), 16))
}

export function aHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

/** `quanto` = 0 da' `a`, 1 da' `b`. */
function mescola(a, b, quanto) {
  return a.map((v, i) => v + (b[i] - v) * quanto)
}

/** Luminanza relativa WCAG, 0 (nero) .. 1 (bianco). */
export function luminanza(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Il contrasto WCAG fra due colori: 1 (uguali) .. 21 (nero su bianco). */
export function contrasto(a, b) {
  const la = luminanza(a)
  const lb = luminanza(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Lo sfondo e' scuro se ci si legge meglio il bianco del nero. */
export function sfondoScuro(rgb) {
  return contrasto(rgb, [255, 255, 255]) >= contrasto(rgb, [0, 0, 0])
}

/** Spinge `colore` verso `verso` a piccoli passi finche' contro `fondo` non arriva a `minimo`. */
function finoAlContrasto(colore, fondo, verso, minimo) {
  let c = colore
  for (let i = 0; i < 20 && contrasto(c, fondo) < minimo; i++) c = mescola(c, verso, 0.1)
  return c
}

/**
 * Da sfondo e colore scelti, tutte le variabili del CSS.
 * @returns {{tema:'scuro'|'chiaro', vars:Record<string,string>}}
 */
export function calcolaColori(sfondoHex, coloreHex) {
  const bg = daHex(sfondoHex) || daHex(SFONDO_DEFAULT)
  const scelto = daHex(coloreHex) || daHex(COLORE_DEFAULT)
  const scuro = sfondoScuro(bg)
  const bianco = [255, 255, 255]
  const nero = [0, 0, 0]
  // Verso dove si va per staccarsi dallo sfondo: sul nero verso il bianco.
  const lontano = scuro ? bianco : nero

  // Le card: appena sopra lo sfondo. Sul chiaro si scende, sul scuro si sale.
  const elev = scuro ? mescola(bg, bianco, 0.07) : mescola(bg, nero, 0.035)
  const elev2 = scuro ? mescola(bg, bianco, 0.11) : mescola(bg, nero, 0.075)

  // Il colore: pieno sui tasti, e deve reggere come testo sullo sfondo.
  const accent = finoAlContrasto(scelto, bg, lontano, 3)
  const accentStrong = finoAlContrasto(mescola(accent, lontano, 0.2), bg, lontano, 4.5)
  // L'inchiostro SUI tasti colorati: nero (un nero tinto del colore) sui colori
  // chiari, bianco sugli scuri.
  const inkScuro = mescola(accent, nero, 0.85)
  const ink = contrasto(accent, inkScuro) >= contrasto(accent, bianco) ? inkScuro : bianco

  return {
    tema: scuro ? 'scuro' : 'chiaro',
    vars: {
      '--bg': aHex(bg),
      '--bg-elev': aHex(elev),
      '--bg-elev-2': aHex(elev2),
      '--accent': aHex(accent),
      '--accent-strong': aHex(accentStrong),
      '--accent-ink': aHex(ink),
    },
  }
}

// --- lettura e scrittura ---------------------------------------------------
//
// Dalla 40ª (il rifacimento della grafica) si sceglie solo il COLORE e il
// MODO: chiaro, scuro o automatico (segue il telefono). Gli sfondi colorati
// (bosco, vinaccia…) non ci sono più: fondi e card li danno i due blocchi di
// index.css, disegnati a mano, e qui si calcola solo l'accento — che deve
// reggere su QUEL fondo. `calcolaColori` resta com'era: dello sfondo che
// gli si passa (bianco o nero) si usano solo i conti di contrasto.

export const MODI = [
  { id: 'auto', nome: 'Automatico' },
  { id: 'chiaro', nome: 'Chiaro' },
  { id: 'scuro', nome: 'Scuro' },
]

// Il fondo su cui l'accento deve leggersi, per tema. Sul chiaro le card sono
// bianche: il caso più severo.
const FONDO = { chiaro: '#ffffff', scuro: SFONDO_DEFAULT }
// La barra di sistema del telefono: il --bg dei due blocchi di index.css.
const BARRA = { chiaro: '#f4f5f7', scuro: SFONDO_DEFAULT }
const VARS_ACCENTO = ['--accent', '--accent-strong', '--accent-ink']
// Quelle che scrivevano le versioni di prima e che adesso darebbero fastidio.
const VARS_VECCHIE = ['--bg', '--bg-elev', '--bg-elev-2']

/** 'chiaro' | 'scuro', risolvendo 'auto' con l'impostazione del telefono. */
export function temaDi(modo) {
  if (modo === 'chiaro' || modo === 'scuro') return modo
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'
  } catch {
    return 'scuro'
  }
}

/** Le variabili dell'accento per un tema, o null se il colore è quello di base. */
function varsAccento(tema, colore) {
  if (colore.toLowerCase() === COLORE_DEFAULT) return null
  const { vars } = calcolaColori(FONDO[tema], colore)
  return Object.fromEntries(VARS_ACCENTO.map((k) => [k, vars[k]]))
}

/** La scelta salvata (`{modo, colore}`), o il default: automatico e celeste. */
export function coloriAttuali() {
  try {
    const salvati = JSON.parse(localStorage.getItem(CHIAVE) || 'null')
    const colore = daHex(salvati?.colore) ? salvati.colore : COLORE_DEFAULT
    if (MODI.some((m) => m.id === salvati?.modo)) return { modo: salvati.modo, colore }
    // Il formato di prima: lo sfondo scelto decide chiaro o scuro.
    if (daHex(salvati?.sfondo)) {
      return { modo: sfondoScuro(daHex(salvati.sfondo)) ? 'scuro' : 'chiaro', colore }
    }
    if (localStorage.getItem(CHIAVE_VECCHIA) === 'chiaro') return { modo: 'chiaro', colore }
  } catch {
    // niente di salvato, o illeggibile: il default
  }
  return { modo: 'auto', colore: COLORE_DEFAULT }
}

/** Mette i colori sulla pagina adesso (anche al cambio chiaro/scuro del telefono). */
function applica({ modo, colore }) {
  const radice = document.documentElement
  const tema = temaDi(modo)
  radice.dataset.tema = tema
  for (const k of [...VARS_VECCHIE, ...VARS_ACCENTO]) radice.style.removeProperty(k)
  for (const [k, v] of Object.entries(varsAccento(tema, colore) || {})) radice.style.setProperty(k, v)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BARRA[tema])
}

/**
 * Mette i colori sulla pagina, subito, e li ricorda su questo dispositivo.
 * ⚠️ Si salvano le variabili GIÀ CALCOLATE per tutti e due i temi: lo script
 * nel <head> di index.html le appoggia prima del primo pixel senza fare conti,
 * e in automatico non sa ancora quale dei due servirà.
 */
export function scriviColori({ modo, colore }) {
  applica({ modo, colore })
  try {
    if (modo === 'auto' && colore.toLowerCase() === COLORE_DEFAULT) {
      localStorage.removeItem(CHIAVE)
    } else {
      localStorage.setItem(
        CHIAVE,
        JSON.stringify({
          modo,
          colore,
          chiaro: { vars: varsAccento('chiaro', colore) },
          scuro: { vars: varsAccento('scuro', colore) },
        }),
      )
    }
    localStorage.removeItem(CHIAVE_VECCHIA)
  } catch {
    // Safari in navigazione privata rifiuta di scrivere: i colori valgono per
    // questa sessione e basta, che e' meglio che non cambiare affatto.
  }
}

/**
 * All'avvio: riscrive la scelta nel formato di adesso (chi arriva da una
 * versione vecchia) e, in automatico, segue il telefono quando passa da
 * chiaro a scuro con l'app aperta.
 */
export function avviaColori() {
  scriviColori(coloriAttuali())
  try {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => applica(coloriAttuali()))
  } catch {
    // browser vecchio: il modo automatico vale all'apertura
  }
}
