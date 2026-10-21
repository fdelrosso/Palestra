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
 *   ariaLabel?: string, children: any, inLinea?: boolean,
 *   onGuarda?: () => void, anteprima?: string,
 * }} props
 *   `onGuarda`: nella domanda, prima di scattare o scegliere, anche "Guarda
 *   la foto" (quella che c'è già, `anteprima`). Con lui la domanda si fa
 *   anche su computer, solo senza "Scatta".
 *   `inLinea`: per quando il tasto sta GIÀ in un foglio (components/Foglio,
 *   il riepilogo): niente domanda in un modale sopra — si sovrapponeva al
 *   foglio e non si capiva più niente — ma i due tasti "Scatta" e
 *   "Galleria" lì dove sta il tasto. `className` vale per tutti e due.
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
  inLinea = false,
  onGuarda,
  anteprima,
}) {
  const [aperto, setAperto] = useState(false)
  const galleria = useRef(null)
  const fotocamera = useRef(null)
  const video = accept.includes('video')

  const scegli = (input) => {
    setAperto(false)
    input.current?.click()
  }

  const input = (
    <>
      <input ref={galleria} type="file" accept={accept} multiple={multiple} hidden onChange={onChange} />
      <input
        ref={fotocamera}
        type="file"
        accept="image/*"
        capture={selfie ? 'user' : 'environment'}
        hidden
        onChange={onChange}
      />
    </>
  )

  if (inLinea && conFotocamera) {
    return (
      <div className="row" style={{ gap: 8, ...style }}>
        <button type="button" className={className} disabled={disabled} onClick={() => fotocamera.current?.click()}>
          <IconCamera width={17} height={17} /> Scatta
        </button>
        <button type="button" className={className} disabled={disabled} onClick={() => galleria.current?.click()}>
          <IconImage width={17} height={17} /> Galleria
        </button>
        {input}
      </div>
    )
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
        onClick={() => (conFotocamera || onGuarda ? setAperto(true) : galleria.current?.click())}
      >
        {children}
      </button>
      {input}

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
                <h3 style={{ marginBottom: 0 }}>
                  {onGuarda ? 'La foto del profilo' : video ? 'Aggiungi foto o video' : 'Aggiungi una foto'}
                </h3>
                <button type="button" className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {onGuarda && (
                  <button
                    type="button"
                    className="menu-voce"
                    onClick={() => {
                      setAperto(false)
                      onGuarda()
                    }}
                  >
                    <span className="menu-voce-icona menu-voce-anteprima" aria-hidden="true">
                      {anteprima && <img src={anteprima} alt="" />}
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">Guarda la foto</span>
                      <span className="menu-voce-desc">A tutto schermo</span>
                    </span>
                    <IconChevron className="faint" />
                  </button>
                )}
                {conFotocamera && (
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
                )}
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
