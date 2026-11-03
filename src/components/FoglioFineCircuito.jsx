import { useState } from 'react'
import Foglio from './Foglio'
import { NumInput } from './SchemaFasi'
import { COLORI } from '../lib/session'
import { testoCircuito } from '../lib/circuiti'

// A fine AMRAP o For time: le reps del giro non finito (solo AMRAP, si può
// lasciare vuoto) e "Com'è andata?" una volta sola per tutto il blocco
// (lib/session esitoCircuito). "Salta" (o chiuderlo): le serie restano fatte,
// senza colore, e le reps in più si tengono.
export default function FoglioFineCircuito({ circuito, onFine }) {
  const [ripExtra, setRipExtra] = useState(null)
  const salta = () => onFine({ colore: null, ripExtra })
  return (
    <Foglio titolo={testoCircuito(circuito)} onChiudi={salta}>
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
        <button className="btn btn-ghost btn-block" onClick={salta}>
          Salta
        </button>
      </div>
    </Foglio>
  )
}
