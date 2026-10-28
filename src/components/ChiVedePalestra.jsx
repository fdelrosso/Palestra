import { useState } from 'react'
import { useAccount } from '../store/AccountContext'

// ---------------------------------------------------------------------------
// "Chi vede la mia palestra" (`profili.chi_vede_palestra`): sul profilo e
// nella riga "📍" del recap dei miei allenamenti. La stessa scelta in Profilo
// → Tu, nel profilo di Social sotto "La mia palestra" e nel foglio della
// propria in Cerca → Palestre. Senza una palestra non c'è.
// "Solo amici" = la cerchia del cognome: amici, il mio PT, i miei atleti
// (`vedo_palestra_di` nel database).
// ---------------------------------------------------------------------------

const CHI_VEDE_PALESTRA = [
  ['tutti', 'Tutti', 'Chi apre il tuo profilo o vede un tuo allenamento'],
  ['amici', 'Solo amici', 'I tuoi amici, il tuo PT e i tuoi atleti'],
  ['nessuno', 'Nessuno', 'La vedi solo tu'],
]

export default function ChiVedePalestra({ style }) {
  const { utenteCorrente, impostaChiVedePalestra } = useAccount()
  const [errore, setErrore] = useState('')
  if (!utenteCorrente?.palestraId) return null
  const scelta = utenteCorrente.chiVedePalestra || 'tutti'

  const cambia = async (v) => {
    if (v === scelta) return
    setErrore('')
    const r = await impostaChiVedePalestra(v)
    if (!r.ok) setErrore(r.errore || 'Non salvato. Riprova.')
  }

  return (
    <div style={style}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>Chi vede la mia palestra</div>
      <div className="segmented vis-seg-3" role="radiogroup" aria-label="Chi vede la mia palestra">
        {CHI_VEDE_PALESTRA.map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={scelta === v}
            className={'seg-btn' + (scelta === v ? ' on' : '')}
            onClick={() => cambia(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '6px 2px 0' }}>
        {CHI_VEDE_PALESTRA.find(([v]) => v === scelta)[2]}. Vale per il profilo e per i recap.
      </p>
      {errore && <p className="form-error">{errore}</p>}
    </div>
  )
}
