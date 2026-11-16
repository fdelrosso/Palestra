import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Sullo schermo largo (tastiera vera) Invio = il tasto principale della
// finestra aperta in cima: "Fatto", "Salva", "Solo per oggi", "Manda"… Quello
// pieno (.btn-accent) e non disattivato. Un foglio (.foglio, z-index 60) sta
// sopra a una finestra (.modal, 50); fra due dello stesso tipo vince l'ultima.
//
// Non si mette in mezzo dove Invio fa già qualcosa: su un bottone, un link, un
// menu, un testo su più righe, dentro un <form> (che si manda da solo), mentre
// si compone un carattere (IME) o con un modificatore.
// Sul telefono no: lì Invio è il tasto della tastiera a schermo, e mandare
// una finestra scrivendo un nome sarebbe una sorpresa.
// ---------------------------------------------------------------------------

const LARGO = '(min-width: 1024px)'
const DOVE_INVIO_FA_GIA = 'textarea, button, a[href], select, [contenteditable="true"], form'

function inCima() {
  const fogli = document.querySelectorAll('.foglio-backdrop:not([hidden]) .foglio')
  if (fogli.length) return fogli[fogli.length - 1]
  const finestre = document.querySelectorAll('.modal-backdrop .modal')
  return finestre.length ? finestre[finestre.length - 1] : null
}

export default function useInvioConferma() {
  useEffect(() => {
    const premuto = (e) => {
      if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      if (!window.matchMedia(LARGO).matches) return
      if (e.target instanceof Element && e.target.closest(DOVE_INVIO_FA_GIA)) return
      const principale = inCima()?.querySelector('.btn-accent:not(:disabled)')
      if (!principale) return
      e.preventDefault()
      principale.click()
    }
    document.addEventListener('keydown', premuto)
    return () => document.removeEventListener('keydown', premuto)
  }, [])
}
