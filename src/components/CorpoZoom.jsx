import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gruppiDellaVista } from '../lib/corpoForme'
import CorpoAllenato from './CorpoAllenato'

// ---------------------------------------------------------------------------
// Il corpo del recap INGRANDITO, per scegliere i gruppi col dito.
//
// Nel recap le due sagome sono alte 172px: il petto si prende, gli avambracci
// o i polpacci no. Qui c'è una sagoma sola (Davanti o Dietro) grande quanto lo
// schermo, e si può ingrandire ancora; quello che si tocca è la stessa scelta
// del recap (`attivi` / `onAlterna`), quindi chiudendo il filtro è già fatto.
//
// ⚠️ Lo spostamento è lo scorrimento NATIVO dell'area (overflow: auto), non un
// trascinamento scritto a mano: col dito è già fluido, e non litiga col tocco
// sui muscoli. Per lo stesso motivo lo zoom va a SCATTI (LIVELLI): i tasti − e
// +, o due dita che si allargano o si stringono. Uno zoom continuo vorrebbe
// dire ridisegnare tutta la figura a ogni movimento delle dita.
//
// ⚠️ Sta in un portale: nel feed il recap è già dentro un modale, e un secondo
// strato `position: fixed` dentro il primo finirebbe chiuso nel suo riquadro.
// ---------------------------------------------------------------------------

const LIVELLI = [1, 1.7, 2.5]
const ETICHETTA_VISTA = { fronte: 'Davanti', dietro: 'Dietro' }

/**
 * Le pastiglie dei gruppi ("Petto · 12") come pulsanti: toccarne una la
 * sceglie o la toglie. Le stesse nel recap e nel corpo ingrandito.
 */
export function PastiglieGruppi({ gruppi, attivi, onAlterna, style }) {
  return (
    <div className="gruppo-chips" style={{ justifyContent: 'center', ...style }}>
      {gruppi.map((g) => {
        const scelto = attivi.includes(g.id)
        return (
          <button
            key={g.id}
            type="button"
            className={'gruppo-chip on' + (scelto ? ' scelto' : attivi.length ? ' spento' : '')}
            style={{ '--g': g.colore }}
            onClick={() => onAlterna(g.id)}
            aria-pressed={scelto}
            aria-label={`${g.label}, ${g.serie} serie: ${scelto ? 'togli dal filtro' : 'fai vedere i suoi esercizi'}`}
          >
            {g.label} · {g.serie}
          </button>
        )
      })}
    </div>
  )
}

// Si parte dalla faccia dove sta il gruppo già scelto (i tricipiti si vedono
// da dietro), se no da quella del gruppo più lavorato.
function vistaDiPartenza(gruppi, attivi) {
  const primo = attivi[0] || gruppi[0]?.id
  const soloDietro = primo && !gruppiDellaVista('fronte').includes(primo) && gruppiDellaVista('dietro').includes(primo)
  return soloDietro ? 'dietro' : 'fronte'
}

// L'altezza della sagoma al primo livello: tutta quella che c'è, tolti testata,
// pastiglie e indicazioni.
function altezzaBase() {
  const h = typeof window === 'undefined' ? 700 : window.innerHeight
  return Math.round(Math.max(300, Math.min(640, h - 300)))
}

const distanza = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

export default function CorpoZoom({ gruppi, attivi, onAlterna, onChiudi }) {
  const [vista, setVista] = useState(() => vistaDiPartenza(gruppi, attivi))
  const [livello, setLivello] = useState(0)
  const [base] = useState(altezzaBase)
  const area = useRef(null)
  // Il punto al centro dell'area, in frazioni della figura: cambiando livello
  // si resta lì, invece di ritrovarsi in un angolo.
  const centro = useRef({ x: 0.5, y: 0.5 })
  // Due dita: la distanza da cui si misura l'allargarsi o lo stringersi.
  const pizzico = useRef(null)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.scrollLeft = centro.current.x * el.scrollWidth - el.clientWidth / 2
    el.scrollTop = centro.current.y * el.scrollHeight - el.clientHeight / 2
  }, [livello, vista])

  const ricordaCentro = () => {
    const el = area.current
    if (!el || !el.scrollWidth) return
    centro.current = {
      x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
      y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
    }
  }
  const zoom = (verso) => {
    ricordaCentro()
    setLivello((l) => Math.max(0, Math.min(LIVELLI.length - 1, l + verso)))
  }
  const cambiaVista = (v) => {
    centro.current = { x: 0.5, y: 0.5 }
    setVista(v)
  }

  // Il pizzico: allargare di un terzo sale di un livello, stringere scende.
  // Poi si riparte da lì, così un gesto lungo fa più scatti.
  const alTocco = (e) => {
    pizzico.current = e.touches.length === 2 ? distanza(e.touches[0], e.touches[1]) : null
  }
  const alMovimento = (e) => {
    if (e.touches.length !== 2 || !pizzico.current) return
    const d = distanza(e.touches[0], e.touches[1])
    const r = d / pizzico.current
    if (r > 1.33 && livello < LIVELLI.length - 1) {
      zoom(1)
      pizzico.current = d
    } else if (r < 0.75 && livello > 0) {
      zoom(-1)
      pizzico.current = d
    }
  }

  return createPortal(
    <div className="modal-backdrop corpo-zoom-sfondo" onClick={onChiudi}>
      <div
        className="corpo-zoom"
        role="dialog"
        aria-label="Corpo ingrandito: scegli i muscoli"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="corpo-zoom-testa">
          <div className="segmented" style={{ flex: 1 }}>
            {['fronte', 'dietro'].map((v) => (
              <button
                key={v}
                type="button"
                className={'seg-btn' + (vista === v ? ' on' : '')}
                aria-pressed={vista === v}
                onClick={() => cambiaVista(v)}
              >
                {ETICHETTA_VISTA[v]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-accent btn-sm" onClick={onChiudi}>
            Fatto
          </button>
        </div>

        <div className="corpo-zoom-riquadro">
          <div
            className="corpo-zoom-area"
            ref={area}
            onTouchStart={alTocco}
            onTouchMove={alMovimento}
            onTouchEnd={alTocco}
          >
            <CorpoAllenato
              gruppi={gruppi}
              viste={[vista]}
              altezza={Math.round(base * LIVELLI[livello])}
              selezionati={attivi}
              onGruppo={onAlterna}
            />
          </div>
          <div className="corpo-zoom-lente" role="group" aria-label="Ingrandimento">
            <button type="button" className="icon-btn" onClick={() => zoom(-1)} disabled={livello === 0} aria-label="Rimpicciolisci">
              −
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => zoom(1)}
              disabled={livello === LIVELLI.length - 1}
              aria-label="Ingrandisci"
            >
              +
            </button>
          </div>
        </div>

        <p className="muted corpo-zoom-aiuto">
          Tocca un muscolo acceso per sceglierlo. Con + (o allargando due dita) si ingrandisce ancora, e
          col dito ci si sposta.
        </p>
        <PastiglieGruppi gruppi={gruppi} attivi={attivi} onAlterna={onAlterna} />
      </div>
    </div>,
    document.body,
  )
}
