// ---------------------------------------------------------------------------
// I colori dell'app: lo SFONDO (primario) e il COLORE (secondario: tasti,
// linguette, evidenziati). Di default nero e celeste.
//
// La scelta resta su questo dispositivo — e' una preferenza di come si vede
// l'app, non un dato dell'account, quindi non va sul database: chi usa l'app
// sul telefono e sul PC puo' volerla diversa sui due.
//
// Da due colori scelti escono tutte le variabili del CSS: i fondi delle card
// (`--bg-elev`, `--bg-elev-2`) salgono o scendono di poco dallo sfondo, e
// `data-tema` dice se lo sfondo e' scuro o chiaro — da li' il blocco giusto di
// index.css da' testo, bordi, verde e rosso leggibili.
//
// ⚠️ Il colore scelto NON sempre si usa cosi' com'e': il celeste su bianco
// sarebbe 1.9:1, illeggibile come testo. Se non si stacca abbastanza dallo
// sfondo lo si scurisce (o schiarisce) finche' non si legge. Sul nero il
// celeste resta esattamente quello.
//
// ⚠️ A scrivere i colori la PRIMA volta non e' questo file ma lo script nel
// <head> di index.html: se aspettassimo React la pagina lampeggerebbe a ogni
// apertura. Per non ricopiare li' i calcoli, qui si salvano GIA' FATTI
// (`vars`) e lo script li appoggia e basta. Se cambia CHIAVE, o la forma di
// quello che si salva, va cambiato anche li'.
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

/** La scelta salvata, o il default. */
export function coloriAttuali() {
  try {
    const salvati = JSON.parse(localStorage.getItem(CHIAVE) || 'null')
    if (salvati && daHex(salvati.sfondo) && daHex(salvati.colore)) {
      return { sfondo: salvati.sfondo, colore: salvati.colore }
    }
    if (localStorage.getItem(CHIAVE_VECCHIA) === 'chiaro') {
      return { sfondo: '#ffffff', colore: COLORE_DEFAULT }
    }
  } catch {
    // niente di salvato, o illeggibile: il default
  }
  return { sfondo: SFONDO_DEFAULT, colore: COLORE_DEFAULT }
}

/** Mette i colori sulla pagina, subito, e li ricorda su questo dispositivo. */
export function scriviColori({ sfondo, colore }) {
  const radice = document.documentElement
  // Nero e celeste: si tolgono i colori scritti a mano e torna il blocco scuro
  // di index.css cosi' com'e' — i suoi grigi sono stati scelti uno per uno, i
  // calcoli ci vanno solo vicino.
  if (sfondo.toLowerCase() === SFONDO_DEFAULT && colore.toLowerCase() === COLORE_DEFAULT) {
    radice.dataset.tema = 'scuro'
    for (const k of Object.keys(calcolaColori(sfondo, colore).vars)) radice.style.removeProperty(k)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', SFONDO_DEFAULT)
    try {
      localStorage.removeItem(CHIAVE)
      localStorage.removeItem(CHIAVE_VECCHIA)
    } catch {
      // come sotto
    }
    return
  }
  const { tema, vars } = calcolaColori(sfondo, colore)
  radice.dataset.tema = tema
  for (const [k, v] of Object.entries(vars)) radice.style.setProperty(k, v)
  // La barra di sistema del telefono segue lo sfondo dell'app.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', vars['--bg'])
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ sfondo, colore, tema, vars }))
  } catch {
    // Safari in navigazione privata rifiuta di scrivere: i colori valgono per
    // questa sessione e basta, che e' meglio che non cambiare affatto.
  }
}
