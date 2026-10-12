// ---------------------------------------------------------------------------
// I colori dell'app. Dalla 57ª non si scelgono piu': il celeste e' il colore
// dell'app e resta quello. Si sceglie solo lo SFONDO: nero (il default) o
// bianco. Fondi, card, testo e accento (celeste, scurito sul bianco perche'
// si legga) li danno i due blocchi di index.css (`data-tema`); qui si decide
// solo quale dei due.
//
// La scelta resta su questo dispositivo — e' una preferenza di come si vede
// l'app, non un dato dell'account, quindi non va sul database.
//
// ⚠️ A scrivere il tema la PRIMA volta non e' questo file ma lo script nel
// <head> di index.html: se aspettassimo React la pagina lampeggerebbe a ogni
// apertura. Se cambia CHIAVE, o la forma di quello che si salva, va cambiato
// anche li'.
// ---------------------------------------------------------------------------

export const CHIAVE = 'palestra:colori:v1'
// La chiave del vecchio interruttore chiaro/scuro: chi aveva scelto "chiaro"
// ritrova il bianco (la legge anche index.html).
export const CHIAVE_VECCHIA = 'palestra:tema:v1'

export const MODI = [
  { id: 'scuro', nome: 'Nero' },
  { id: 'chiaro', nome: 'Bianco' },
]
export const MODO_DEFAULT = 'scuro'

// La barra di sistema del telefono: il --bg dei due blocchi di index.css.
const BARRA = { chiaro: '#f4f5f7', scuro: '#000000' }
// Quelle che scrivevano le versioni con il colore a scelta: tolte, cosi'
// torna il celeste di index.css.
const VARS_VECCHIE = ['--bg', '--bg-elev', '--bg-elev-2', '--accent', '--accent-strong', '--accent-ink']

/** Uno sfondo del formato di prima ('#rrggbb') era chiaro? */
function sfondoChiaro(hex) {
  const s = String(hex || '').replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(s)) return false
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128
}

/** Il tema salvato, 'scuro' o 'chiaro'. Chi aveva "automatico" riparte dal nero. */
export function modoAttuale() {
  try {
    const salvati = JSON.parse(localStorage.getItem(CHIAVE) || 'null')
    if (salvati?.modo === 'chiaro' || salvati?.modo === 'scuro') return salvati.modo
    // Il formato con lo sfondo a scelta.
    if (salvati?.sfondo) return sfondoChiaro(salvati.sfondo) ? 'chiaro' : 'scuro'
    if (localStorage.getItem(CHIAVE_VECCHIA) === 'chiaro') return 'chiaro'
  } catch {
    // niente di salvato, o illeggibile: il default
  }
  return MODO_DEFAULT
}

function applica(modo) {
  const radice = document.documentElement
  radice.dataset.tema = modo
  for (const k of VARS_VECCHIE) radice.style.removeProperty(k)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BARRA[modo])
}

/** Mette il tema sulla pagina, subito, e lo ricorda su questo dispositivo. */
export function scriviModo(modo) {
  const m = modo === 'chiaro' ? 'chiaro' : 'scuro'
  applica(m)
  try {
    if (m === MODO_DEFAULT) localStorage.removeItem(CHIAVE)
    else localStorage.setItem(CHIAVE, JSON.stringify({ modo: m }))
    localStorage.removeItem(CHIAVE_VECCHIA)
  } catch {
    // Safari in navigazione privata rifiuta di scrivere: il tema vale per
    // questa sessione e basta.
  }
}

/** All'avvio: riscrive la scelta nel formato di adesso (chi arriva da una versione vecchia). */
export function avviaColori() {
  scriviModo(modoAttuale())
}
