import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import TastoFoto from './TastoFoto'
import { IconCamera } from './icons'

// ---------------------------------------------------------------------------
// Il ritaglio della foto profilo: la foto sotto un cerchio, si trascina per
// spostarla e si allarga col cursore (o con due dita). Esce un JPEG quadrato
// di LATO px: quadrato, così ovunque la si mostri (avatar CSS con
// object-fit: cover, card del recap disegnata a mano) si vede la stessa parte.
// ---------------------------------------------------------------------------

const V = 280 // il riquadro a schermo, in px
const LATO = 512
const ZOOM_MAX = 4

// x, y = angolo in alto a sinistra della foto rispetto al riquadro: la foto
// deve sempre coprirlo tutto.
const blocca = (p, w, h, s) => ({
  x: Math.min(0, Math.max(V - w * s, p.x)),
  y: Math.min(0, Math.max(V - h * s, p.y)),
})

export default function RitagliaFoto({ file, onAnnulla, onFatto }) {
  const [url, setUrl] = useState('')
  const [rotta, setRotta] = useState(false)
  const img = useRef(null)
  const [dim, setDim] = useState(null) // { w, h } della foto
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dita = useRef(new Map()) // pointerId -> { x, y }
  const pizzico = useRef(null) // distanza iniziale e zoom iniziale

  // ⚠️ L'URL nasce DENTRO l'effetto: creato fuori e revocato nella pulizia,
  // StrictMode (che monta, smonta e rimonta) lasciava la foto su un blob già
  // revocato, e il riquadro restava nero.
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const base = dim ? V / Math.min(dim.w, dim.h) : 1
  const s = base * zoom

  // Lo zoom tiene fermo il centro del riquadro.
  const zooma = (z) => {
    const nz = Math.min(ZOOM_MAX, Math.max(1, z))
    const ns = base * nz
    const cx = (V / 2 - pos.x) / s
    const cy = (V / 2 - pos.y) / s
    setZoom(nz)
    setPos(blocca({ x: V / 2 - cx * ns, y: V / 2 - cy * ns }, dim.w, dim.h, ns))
  }

  const giu = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dita.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dita.current.size === 2) {
      const [a, b] = [...dita.current.values()]
      pizzico.current = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  const muovi = (e) => {
    const prima = dita.current.get(e.pointerId)
    if (!prima || !dim) return
    dita.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dita.current.size === 2 && pizzico.current) {
      const [a, b] = [...dita.current.values()]
      zooma((pizzico.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pizzico.current.d)
    } else if (dita.current.size === 1) {
      setPos((p) => blocca({ x: p.x + e.clientX - prima.x, y: p.y + e.clientY - prima.y }, dim.w, dim.h, s))
    }
  }
  const su = (e) => {
    dita.current.delete(e.pointerId)
    if (dita.current.size < 2) pizzico.current = null
  }

  const fatto = () => {
    const c = document.createElement('canvas')
    c.width = c.height = LATO
    const lato = V / s
    c.getContext('2d').drawImage(img.current, -pos.x / s, -pos.y / s, lato, lato, 0, 0, LATO, LATO)
    c.toBlob((b) => b && onFatto(b), 'image/jpeg', 0.88)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onAnnulla}>
      <div className="modal" role="dialog" aria-label="Ritaglia la foto" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>Sistema la foto</h3>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13.5 }}>
          Trascina per spostarla, allarga col cursore o con due dita.
        </p>
        <div
          className="ritaglia-riquadro"
          style={{ width: V, height: V }}
          onPointerDown={giu}
          onPointerMove={muovi}
          onPointerUp={su}
          onPointerCancel={su}
          onWheel={(e) => dim && zooma(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))}
        >
          {rotta && <p className="ritaglia-rotta">Questa immagine non si riesce ad aprire.</p>}
          <img
            ref={img}
            src={url || undefined}
            alt=""
            draggable={false}
            onError={() => url && setRotta(true)}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              const b = V / Math.min(w, h)
              setDim({ w, h })
              setPos({ x: (V - w * b) / 2, y: (V - h * b) / 2 })
            }}
            style={
              dim
                ? { width: dim.w * s, height: dim.h * s, transform: `translate(${pos.x}px, ${pos.y}px)` }
                : { visibility: 'hidden' }
            }
          />
          <span className="ritaglia-cerchio" aria-hidden="true" />
        </div>
        <input
          type="range"
          className="ritaglia-zoom"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          disabled={!dim}
          aria-label="Ingrandisci"
          onChange={(e) => zooma(Number(e.target.value))}
        />
        <div className="row" style={{ gap: 8, marginTop: 14 }}>
          <button type="button" className="btn grow" onClick={onAnnulla}>
            Annulla
          </button>
          <button type="button" className="btn btn-accent grow" disabled={!dim} onClick={fatto}>
            Usa questa
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * La MIA foto da toccare per cambiarla: avatar grande col bollino della
 * fotocamera, poi il ritaglio, poi il caricamento. Sta nel Profilo e nella
 * mia pagina social (pages/UtentePage).
 * @param {{ onStato: (s: string) => void }} props
 *   `onStato`: '' | 'carico' | un messaggio d'errore, lo mostra chi lo usa.
 */
export function CambiaFoto({ onStato }) {
  const { utenteCorrente, impostaFoto } = useAccount()
  const [daRitagliare, setDaRitagliare] = useState(null)
  const [carico, setCarico] = useState(false)
  const iniziale = String(utenteCorrente?.nome || '').trim().charAt(0).toUpperCase() || '?'
  return (
    <>
      <span className="avatar-cambia-box">
        <TastoFoto
          className="user-avatar lg avatar-cambia"
          ariaLabel="Cambia la foto del profilo"
          selfie
          disabled={carico}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) setDaRitagliare(file)
          }}
        >
          {utenteCorrente?.foto ? <img src={utenteCorrente.foto} alt="" /> : iniziale}
        </TastoFoto>
        <span className="avatar-cambia-badge" aria-hidden="true">
          <IconCamera width={14} height={14} />
        </span>
      </span>
      {daRitagliare && (
        <RitagliaFoto
          file={daRitagliare}
          onAnnulla={() => setDaRitagliare(null)}
          onFatto={async (blob) => {
            setDaRitagliare(null)
            setCarico(true)
            onStato('carico')
            const esito = await impostaFoto(blob)
            setCarico(false)
            onStato(esito.ok ? '' : esito.errore)
          }}
        />
      )}
    </>
  )
}
