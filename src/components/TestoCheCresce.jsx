import { useLayoutEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Una textarea che si allunga col testo: tutto quello che c'è scritto si vede
// senza scorrere dentro la casella. Serve nell'editor della dieta, dove un
// pasto o un'alternativa letti dal PDF stanno spesso su tre o quattro righe e
// nella casella fissa se ne vedeva una e mezza.
//
// Prende le stesse props di una <textarea>; il `minHeight` dello stile resta
// l'altezza minima, sotto la quale non scende anche se il testo è corto.
// ---------------------------------------------------------------------------

function adatta(el) {
  if (!el) return
  // Prima a 'auto', se no scrollHeight non scende mai quando si cancella.
  el.style.height = 'auto'
  // +2: il bordo, che scrollHeight non conta (box-sizing: border-box).
  el.style.height = `${el.scrollHeight + 2}px`
}

export default function TestoCheCresce({ value, onChange, style, ...resto }) {
  const ref = useRef(null)

  // A ogni cambio di testo, anche quando arriva da fuori (Adatta i pasti).
  useLayoutEffect(() => {
    adatta(ref.current)
  }, [value])

  // La larghezza cambia (telefono girato, finestra stretta): le righe pure.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    let larghezza = el.clientWidth
    const osserva = new ResizeObserver(() => {
      if (el.clientWidth === larghezza) return
      larghezza = el.clientWidth
      adatta(el)
    })
    osserva.observe(el)
    return () => osserva.disconnect()
  }, [])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
      {...resto}
    />
  )
}
