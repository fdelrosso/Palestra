import { useState } from 'react'
import { useAccount } from '../store/AccountContext'

// ---------------------------------------------------------------------------
// "Mostra la mia palestra sul profilo" (`profili.mostra_palestra`, lib/
// palestre palestraDi): la stessa riga in Profilo → Tu, nel profilo di Social
// sotto "La mia palestra" e nel foglio della propria in Cerca → Palestre.
// Senza una palestra non c'è.
// ---------------------------------------------------------------------------

export default function InterruttorePalestra({ style }) {
  const { utenteCorrente, mostraPalestra } = useAccount()
  const [errore, setErrore] = useState('')
  if (!utenteCorrente?.palestraId) return null
  const acceso = !!utenteCorrente.mostraPalestra

  const cambia = async () => {
    setErrore('')
    const r = await mostraPalestra(!acceso)
    if (!r.ok) setErrore(r.errore || 'Non salvato. Riprova.')
  }

  return (
    <div style={style}>
      <div className="toggle-row">
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14 }}>Mostra la mia palestra sul profilo</span>
          <span className="muted" style={{ display: 'block', fontSize: 12.5 }}>
            {acceso ? 'La vede chi apre il tuo profilo' : 'La vedi solo tu'}
          </span>
        </span>
        <button
          className={'switch' + (acceso ? ' on' : '')}
          onClick={cambia}
          role="switch"
          aria-checked={acceso}
          aria-label="Mostra la mia palestra sul profilo"
        >
          <span className="knob" />
        </button>
      </div>
      {errore && <p className="form-error">{errore}</p>}
    </div>
  )
}
