import { useEffect, useRef, useState } from 'react'

// Tenere premuto sul recap toglie il recap e lascia la foto: si guarda
// finché si tiene il dito giù. Lo usano il post del feed (PostSchermo) e la
// card del profilo e dello Storico (RecapCartolina).
//
// ⚠️ Se il dito si muove PRIMA che la foto compaia è uno scorrimento (il
// browser manda pointercancel) e non succede niente; DOPO, la foto resta
// anche se il dito scivola: lo scorrimento si blocca (touchmove qui sotto)
// finché non lo si alza. Il tocco che ha svelato la foto non apre il recap
// quando si alza il dito: `cliccato()` dice se il clic va preso.
//
// `ref` è l'elemento da tenere premuto; `attivo` = c'è una foto da mostrare.
export default function useTieniPremuto(ref, attivo) {
  const [svelata, setSvelata] = useState(false)
  const timer = useRef(null)
  const appenaSvelata = useRef(false)
  const svelataRef = useRef(false)
  useEffect(() => {
    svelataRef.current = svelata
  }, [svelata])
  // ⚠️ Un ascoltatore vero, non `onTouchMove` di React: quelli sono passivi e
  // `preventDefault` lì non ferma lo scorrimento.
  useEffect(() => {
    const el = ref.current
    if (!el || !attivo) return undefined
    const muovi = (e) => {
      if (svelataRef.current && e.cancelable) e.preventDefault()
    }
    const fine = () => {
      clearTimeout(timer.current)
      setSvelata(false)
    }
    el.addEventListener('touchmove', muovi, { passive: false })
    el.addEventListener('touchend', fine)
    el.addEventListener('touchcancel', fine)
    return () => {
      el.removeEventListener('touchmove', muovi)
      el.removeEventListener('touchend', fine)
      el.removeEventListener('touchcancel', fine)
    }
  }, [ref, attivo])
  useEffect(() => () => clearTimeout(timer.current), [])

  const su = () => {
    clearTimeout(timer.current)
    setSvelata(false)
  }
  const handlers = {
    onPointerDown: () => {
      if (!attivo) return
      appenaSvelata.current = false
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        appenaSvelata.current = true
        setSvelata(true)
      }, 220)
    },
    onPointerUp: su,
    // Annullato dal browser: se la foto è già fuori resta (la chiude il
    // touchend), se no era uno scorrimento e si lascia perdere.
    onPointerCancel: () => {
      if (!svelataRef.current) su()
    },
    onPointerLeave: (e) => e.pointerType === 'mouse' && su(),
    onContextMenu: attivo ? (e) => e.preventDefault() : undefined,
  }
  const cliccato = () => {
    if (!appenaSvelata.current) return true
    appenaSvelata.current = false
    return false
  }
  return { svelata, handlers, cliccato }
}
