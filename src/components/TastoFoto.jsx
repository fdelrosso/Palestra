import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCamera, IconChevron, IconClose, IconImage } from './icons'

// Il tasto per aggiungere una foto: al tocco chiede se SCATTARLA adesso o
// PRENDERLA dalla galleria. Il selettore del telefono da solo non basta: su
// Android spesso offre solo la galleria (Foto, Raccolte, Google Foto) e la
// fotocamera non c'è. `capture` la apre direttamente.
// Su computer `capture` non fa niente, quindi lì niente domanda: si apre
// subito la scelta dei file.
//
// I due <input> stanno sempre montati FUORI dal foglio: il foglio si chiude
// appena si sceglie, e se l'input sparisse con lui la foto scelta non
// arriverebbe mai a `onChange`.
const conFotocamera =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * @param {{
 *   onChange: (e: Event) => void, accept?: string, multiple?: boolean,
 *   selfie?: boolean, disabled?: boolean, className?: string, style?: object,
 *   ariaLabel?: string, children: any,
 * }} props
 */
export default function TastoFoto({
  onChange,
  accept = 'image/*',
  multiple,
  selfie,
  disabled,
  className = 'btn',
  style,
  ariaLabel,
  children,
}) {
  const [aperto, setAperto] = useState(false)
  const galleria = useRef(null)
  const fotocamera = useRef(null)
  const video = accept.includes('video')

  const scegli = (input) => {
    setAperto(false)
    input.current?.click()
  }

  return (
    <>
      <button
        type="button"
        className={className}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => (conFotocamera ? setAperto(true) : galleria.current?.click())}
      >
        {children}
      </button>
      <input ref={galleria} type="file" accept={accept} multiple={multiple} hidden onChange={onChange} />
      <input
        ref={fotocamera}
        type="file"
        accept="image/*"
        capture={selfie ? 'user' : 'environment'}
        hidden
        onChange={onChange}
      />

      {aperto &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              e.stopPropagation()
              setAperto(false)
            }}
          >
            <div
              className="modal"
              role="dialog"
              aria-label="Aggiungi una foto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <h3 style={{ marginBottom: 0 }}>{video ? 'Aggiungi foto o video' : 'Aggiungi una foto'}</h3>
                <button type="button" className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                <button type="button" className="menu-voce" onClick={() => scegli(fotocamera)}>
                  <span className="menu-voce-icona" aria-hidden="true">
                    <IconCamera width={20} height={20} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="menu-voce-nome">Scatta una foto</span>
                    <span className="menu-voce-desc">
                      {selfie ? 'Con la fotocamera frontale' : 'Con la fotocamera, adesso'}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
                <button type="button" className="menu-voce" onClick={() => scegli(galleria)}>
                  <span className="menu-voce-icona" aria-hidden="true">
                    <IconImage width={20} height={20} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="menu-voce-nome">Scegli dalla galleria</span>
                    <span className="menu-voce-desc">
                      {video ? 'Foto e video già sul telefono' : 'Una foto già sul telefono'}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
