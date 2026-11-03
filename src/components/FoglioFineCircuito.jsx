import { useState } from 'react'
import Foglio from './Foglio'
import { NumInput } from './SchemaFasi'
import { testoCircuito } from '../lib/circuiti'

// A fine AMRAP: le reps del giro non finito (si può lasciare vuoto; lib/session
// esitoCircuito). Lo sforzo l'hanno già detto i colori dei giri. Chiuderlo
// vale "Fatto": le reps scritte si tengono.
export default function FoglioFineCircuito({ circuito, onFine }) {
  const [ripExtra, setRipExtra] = useState(null)
  const fine = () => onFine(ripExtra)
  return (
    <Foglio titolo={testoCircuito(circuito)} onChiudi={fine}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="foglio-riga">
          <span className="foglio-label">Reps in più nel giro non finito</span>
          <span className="durata-editor">
            <NumInput intero label="Reps in più" placeholder="0" value={ripExtra} onChange={setRipExtra} />
          </span>
        </div>
        <button className="btn btn-accent btn-block" onClick={fine}>
          Fatto
        </button>
      </div>
    </Foglio>
  )
}
