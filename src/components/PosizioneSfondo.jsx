import { useEffect, useMemo, useRef } from 'react'

// Dove sta la foto (o il fotogramma del video) dietro al recap: si trascina
// nel riquadro, che ha la forma della card. Esce [x, y] in %, lo stesso di
// `object-position` (feed) e di lib/recapImmagine `sfondo` (card).
// `scorri`: appena scelta la foto, il foglio scende fin qui.
export default function PosizioneSfondo({ foto, pos, onPos, scorri = false }) {
  const box = useRef(null)
  const da = useRef(null) // { x, y, pos } all'inizio del trascinamento
  const [px, py] = pos || [50, 50]
  // Una copia piccola da mettere come sfondo CSS: l'indirizzo della foto
  // (un blob) è già revocato appena caricata (lib/recapImmagine, caricaImmagine).
  const url = useMemo(() => {
    const c = document.createElement('canvas')
    const s = Math.min(1, 600 / Math.max(foto.width, foto.height))
    c.width = Math.round(foto.width * s)
    c.height = Math.round(foto.height * s)
    c.getContext('2d').drawImage(foto, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.8)
  }, [foto])

  useEffect(() => {
    if (scorri) box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [scorri, foto])

  // Quanti px sborda la foto (coperto il riquadro) su ogni asse: spostare
  // di tutto lo sbordo è passare da 0% a 100%.
  const sbordo = () => {
    const { width: bw, height: bh } = box.current.getBoundingClientRect()
    const s = Math.max(bw / foto.width, bh / foto.height)
    return [foto.width * s - bw, foto.height * s - bh]
  }
  const muovi = (e) => {
    if (!da.current) return
    const [ox, oy] = sbordo()
    const p = (d, o, v) => (o > 0.5 ? Math.min(100, Math.max(0, v - (d / o) * 100)) : 50)
    onPos([
      Math.round(p(e.clientX - da.current.x, ox, da.current.pos[0])),
      Math.round(p(e.clientY - da.current.y, oy, da.current.pos[1])),
    ])
  }

  return (
    <div
      ref={box}
      className="posizione-sfondo"
      style={{
        backgroundImage: `url("${url}")`,
        backgroundPosition: `${px}% ${py}%`,
      }}
      role="img"
      aria-label="Trascina per spostare lo sfondo"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        da.current = { x: e.clientX, y: e.clientY, pos: [px, py] }
      }}
      onPointerMove={muovi}
      onPointerUp={() => (da.current = null)}
      onPointerCancel={() => (da.current = null)}
    />
  )
}
