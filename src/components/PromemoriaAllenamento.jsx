import { useState } from 'react'
import { apriImpostazioni, puoAprireImpostazioni } from '../lib/nativo'
import {
  chiediPermessoNotifiche,
  oraPromemoria,
  promemoriaDisponibile,
  salvaOraPromemoria,
  sincronizzaPromemoria,
} from '../lib/promemoria'
import { useStore } from '../store/StoreContext'

// Il promemoria dei giorni di allenamento, in Profilo. Solo nell'app Android
// con un APK che lo sa fare: altrove non si vede (lib/promemoria).
export default function PromemoriaAllenamento() {
  const { schede, sessione } = useStore()
  const [ora, setOra] = useState(oraPromemoria)
  const [negato, setNegato] = useState(false)

  if (!promemoriaDisponibile()) return null

  const cambia = (nuova) => {
    salvaOraPromemoria(nuova)
    setOra(nuova)
    sincronizzaPromemoria(schede, sessione)
  }
  const accendi = async () => {
    const ok = await chiediPermessoNotifiche()
    setNegato(!ok)
    if (ok) cambia(ora || '18:00')
  }

  return (
    <>
      <div className="section-title">Promemoria</div>
      <div className="card" style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Nei giorni di allenamento</div>
        <div className="segmented" role="radiogroup" aria-label="Promemoria di allenamento">
          <button type="button" role="radio" aria-checked={!ora} className={'seg-btn' + (!ora ? ' on' : '')} onClick={() => cambia(null)}>
            Spento
          </button>
          <button type="button" role="radio" aria-checked={!!ora} className={'seg-btn' + (ora ? ' on' : '')} onClick={accendi}>
            Acceso
          </button>
        </div>
        {ora && (
          <label className="row" style={{ marginTop: 10, gap: 10, fontSize: 14 }}>
            Alle
            <input type="time" value={ora} onChange={(e) => e.target.value && cambia(e.target.value)} />
          </label>
        )}
        <p className="muted" style={{ fontSize: 12.5, margin: '6px 2px 0' }}>
          Vale per il programma della scheda attiva, su questo telefono.
        </p>
        {negato && (
          <p className="form-error">
            Le notifiche sono spente per quest’app.{' '}
            {puoAprireImpostazioni() && (
              <button type="button" className="btn-link" onClick={apriImpostazioni}>
                Apri le impostazioni
              </button>
            )}
          </p>
        )}
      </div>
    </>
  )
}
