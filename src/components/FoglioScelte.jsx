import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconChevron, IconClose } from './icons'

// ---------------------------------------------------------------------------
// Il foglio dal basso del "+" di una sezione: un titolo e le strade per
// cominciare, una per riga. Lo usano Allenamento e Dieta, così il "+" si
// comporta allo stesso modo dappertutto.
//
// `scelte`: { id, nome, desc, Icona, vai }. `children`: una nota in fondo.
// ---------------------------------------------------------------------------

export default function FoglioScelte({ titolo, scelte, onChiudi, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>{titolo}</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {scelte.map((s) => (
            <button
              key={s.id}
              className="menu-voce"
              onClick={() => {
                onChiudi()
                s.vai()
              }}
            >
              <span className="menu-voce-icona" aria-hidden="true">
                <s.Icona width={20} height={20} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="menu-voce-nome">{s.nome}</span>
                <span className="menu-voce-desc">{s.desc}</span>
              </span>
              <IconChevron className="faint" />
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
