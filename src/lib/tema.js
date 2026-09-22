// ---------------------------------------------------------------------------
// Il tema: chiaro (fondo bianco) o scuro (fondo nero).
//
// Di default segue il telefono; dal menu "Funzionalita'" si puo' forzare, e la
// scelta resta su questo dispositivo — e' una preferenza di come si vede
// l'app, non un dato dell'account, quindi non va sul database: chi usa l'app
// sul telefono e sul PC puo' volerla scura sul telefono e chiara sul PC.
//
// ⚠️ La scelta vive su `document.documentElement.dataset.tema`, ed e' l'unica
// cosa che il CSS guarda (`:root[data-tema='scuro']`). A scriverla la PRIMA
// volta non e' questo file ma lo script in fondo al <head> di index.html: se
// aspettassimo React, la pagina nascerebbe bianca e lampeggerebbe al nero a
// ogni apertura. Qui si cambia solo dopo, quando qualcuno tocca
// l'interruttore. ⚠️ Se cambia CHIAVE va cambiata anche li'.
// ---------------------------------------------------------------------------

export const CHIAVE = 'palestra:tema:v1'

export function temaAttuale() {
  return document.documentElement.dataset.tema === 'scuro' ? 'scuro' : 'chiaro'
}

export function scriviTema(tema) {
  document.documentElement.dataset.tema = tema
  // La barra di sistema del telefono segue il fondo dell'app. Il <meta> non
  // puo' piu' avere due varianti `media`: quelle seguirebbero il telefono e
  // resterebbero ferme mentre l'app cambia da sola.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', tema === 'scuro' ? '#000000' : '#ffffff')
  try {
    localStorage.setItem(CHIAVE, tema)
  } catch {
    // Safari in navigazione privata rifiuta di scrivere: il tema vale per
    // questa sessione e basta, che e' meglio che non cambiare affatto.
  }
}
