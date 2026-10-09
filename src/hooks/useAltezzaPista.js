import { useLayoutEffect } from 'react'

// La pista delle card che si sfogliano di lato (editor della scheda,
// allenamento) è una riga flex: senza questo è alta quanto la card PIÙ ALTA,
// e sotto una card corta resta un buco vuoto prima di quello che segue.
// Qui la pista prende l'altezza della card che si sta guardando, e la segue
// se cambia (un campo aperto, una foto caricata). Le altre, più alte, si
// tagliano finché non diventano quella guardata (.pista-esercizi, overflow-y).
export default function useAltezzaPista(pistaRef, indice, quante) {
  useLayoutEffect(() => {
    const pista = pistaRef.current
    const card = pista?.children[indice]
    if (!pista || !card) return undefined
    const allinea = () => {
      pista.style.height = `${card.offsetHeight}px`
    }
    allinea()
    if (typeof ResizeObserver === 'undefined') return () => (pista.style.height = '')
    const oss = new ResizeObserver(allinea)
    oss.observe(card)
    return () => {
      oss.disconnect()
      pista.style.height = ''
    }
  }, [pistaRef, indice, quante])
}
