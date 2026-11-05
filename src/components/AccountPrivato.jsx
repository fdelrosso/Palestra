import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { ruoloScelto } from '../lib/pt'

// ---------------------------------------------------------------------------
// Account pubblico o privato (`profili.pubblico`), come su Instagram. In
// Profilo → Privacy. Chi decide davvero è il database (`vedo_contenuti_di`,
// supabase/migrations 20261105140000): qui si sceglie e basta.
// Vale solo da atleta: un PT è qui per farsi trovare. Il solo PT non lo vede
// (ProfiloPage), a chi è "Tutti e due" si dice.
// ---------------------------------------------------------------------------

const SCELTE = [
  [true, 'Pubblico', 'Chiunque vede quello che rendi pubblico e il tuo cognome, e ti trova anche per nome.'],
  [false, 'Privato', 'Quello che rendi pubblico lo vedono solo i tuoi amici, il tuo PT e i tuoi atleti. Ti si trova solo per username.'],
]

export default function AccountPrivato() {
  const { utenteVero, impostaPubblico } = useAccount()
  const [errore, setErrore] = useState('')
  const pubblico = utenteVero?.pubblico !== false
  const dueRuoli = ruoloScelto(utenteVero) === 'entrambi'

  const cambia = async (v) => {
    if (v === pubblico) return
    setErrore('')
    const r = await impostaPubblico(v)
    if (!r.ok) setErrore(r.errore || 'Non salvato. Riprova.')
  }

  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>Il tuo account</div>
      <div className="segmented" role="radiogroup" aria-label="Il tuo account">
        {SCELTE.map(([v, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={pubblico === v}
            className={'seg-btn' + (pubblico === v ? ' on' : '')}
            onClick={() => cambia(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '6px 2px 0' }}>
        {SCELTE.find(([v]) => v === pubblico)[2]}
        {dueRuoli && ' Vale per il tuo profilo da atleta: come PT ti trovano sempre, con nome e cognome.'}
      </p>
      {errore && <p className="form-error">{errore}</p>}
    </div>
  )
}
