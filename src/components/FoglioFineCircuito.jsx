import { useState } from 'react'
import Foglio from './Foglio'
import { NumInput } from './SchemaFasi'
import { COLORI } from '../lib/session'
import { testoCircuito } from '../lib/circuiti'

// A fine AMRAP o For time: le reps del giro non finito (solo AMRAP, si può
// lasciare vuoto) e "Com'è andata?" una volta sola per tutto il blocco
// (lib/session esitoCircuito). "Salta": le serie restano fatte, senza colore.
export default function FoglioFineCircuito({ circuito, onFine, onChiudi }) {
  const [ripExtra, setRipExtra] = useState(null)
  return (
    <Foglio titolo={testoCircuito(circuito)} onChiudi={onChiudi}>
      <div className="stack" style={{ gap: 14 }}>
        {circuito.tipo === 'amrap' && (
          <div className="foglio-riga">
            <span className="foglio-label">Reps in più nel giro non finito</span>
            <span className="durata-editor">
              <NumInput intero label="Reps in più" placeholder="0" value={ripExtra} onChange={setRipExtra} />
            </span>
          </div>
        )}
        <span className="muted">Com'è andata?</span>
        <div className="effort-buttons">
          {['verde', 'giallo', 'rosso'].map((c) => (
            <button key={c} className={'effort ' + c} onClick={() => onFine({ colore: c, ripExtra })}>
              {COLORI[c].label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-block" onClick={() => onFine({ colore: null, ripExtra })}>
          Salta
        </button>
      </div>
    </Foglio>
  )
}
