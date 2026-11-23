import { useRef, useState } from 'react'

// TRASCINARE in una lista in colonna, come gli esercizi nell'editor
// (GiornoEditor, premi, che ha ancora la sua copia): tenuto premuto 400ms
// l'elemento si prende e segue il dito; gli altri gli fanno posto e al rilascio
// `onSposta(da, a)` (indici). Muovendosi prima è uno scorrimento, non una presa.
// ⚠️ Lo scorrimento si ferma con touchmove `passive: false` (touch-action lo
// decide il browser all'inizio del tocco, troppo presto), e il menu del tocco
// lungo va fermato con onContextMenu, se no annulla il tocco.
//
// Uso: `ref={(el) => (refs.current[i] = el)}`, `onPointerDown={(ev) => premi(i, ev)}`,
// `style={presa ? { transform: `translateY(${spinta(i)}px)` } : undefined}`.
export default function useTrascinaLista(onSposta) {
  const [presa, setPresa] = useState(null)
  const refs = useRef([])
  const premi = (k, ev) => {
    if (presa || ev.button > 0) return
    const y0 = ev.clientY
    // Tolti degli elementi, in fondo restano dei null (React chiama il ref con null).
    const n = refs.current.filter(Boolean).length
    let stato = null
    const timer = setTimeout(() => {
      const rects = Array.from({ length: n }, (_, j) => refs.current[j].getBoundingClientRect())
      // Lo stacco fra due elementi: quanto scorre chi fa posto, oltre all'altezza.
      const stacco = n > 1 ? rects[1].top - rects[0].bottom : 0
      stato = { k, dy: 0, a: k, rects, stacco }
      navigator.vibrate?.(15)
      setPresa(stato)
    }, 400)
    const ferma = (e) => stato && e.preventDefault()
    const muovi = (e) => {
      if (!stato) return Math.abs(e.clientY - y0) > 8 && fine()
      const dy = e.clientY - y0
      const centro = stato.rects[k].top + stato.rects[k].height / 2 + dy
      const a = stato.rects.filter((r, j) => j !== k && r.top + r.height / 2 < centro).length
      stato = { ...stato, dy, a }
      setPresa(stato)
    }
    const fine = () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', muovi)
      window.removeEventListener('pointerup', fine)
      window.removeEventListener('pointercancel', fine)
      window.removeEventListener('touchmove', ferma)
      if (!stato) return
      // Il dito che lascia non è un tocco sull'elemento che ha sotto.
      const mangia = (e) => e.stopPropagation()
      window.addEventListener('click', mangia, true)
      setTimeout(() => window.removeEventListener('click', mangia, true), 300)
      if (stato.a !== k) onSposta(k, stato.a)
      setPresa(null)
    }
    window.addEventListener('pointermove', muovi)
    window.addEventListener('pointerup', fine)
    window.addEventListener('pointercancel', fine)
    window.addEventListener('touchmove', ferma, { passive: false })
  }
  // Quanto scorre l'elemento j: quello preso col dito, quelli fra il suo posto
  // e il nuovo di un'altezza (più lo stacco).
  const spinta = (j) => {
    const { k, a, dy, rects, stacco } = presa
    if (j === k) return dy
    const h = rects[k].height + stacco
    if (k < a && j > k && j <= a) return -h
    if (a < k && j >= a && j < k) return h
    return 0
  }
  return { presa, premi, spinta, refs }
}
