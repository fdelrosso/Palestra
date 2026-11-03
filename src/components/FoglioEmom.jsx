import { useState } from 'react'
import Foglio from './Foglio'
import { NumInput } from './SchemaFasi'
import { MINUTI_MAX, OGNI_PROPOSTI } from '../lib/emom'
import { formattaSecondi } from '../lib/schema'

// Le impostazioni di un EMOM (lib/emom): ogni quanto e per quanto, o "finché
// ce la faccio". Lo stesso foglio crea il riquadro ("+ EMOM") e lo cambia
// (toccando la sua testata), e lì ha anche "Sciogli".
export default function FoglioEmom({ emom = null, onSalva, onSciogli = null, onChiudi }) {
  const [ogniSec, setOgniSec] = useState(emom?.ogniSec ?? 60)
  const [minuti, setMinuti] = useState(emom ? emom.minuti : 12)
  const oltranza = minuti == null
  return (
    <Foglio
      titolo={emom ? 'EMOM' : 'Nuovo EMOM'}
      sotto="A ogni intervallo una serie, gli esercizi a turno."
      onChiudi={onChiudi}
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="scelte" role="group" aria-label="Ogni">
          <span className="scelte-label">Ogni</span>
          {OGNI_PROPOSTI.map((s) => (
            <button
              key={s}
              type="button"
              className={'chip chip-scelta' + (ogniSec === s ? ' on' : '')}
              aria-pressed={ogniSec === s}
              onClick={() => setOgniSec(s)}
            >
              {formattaSecondi(s)}
            </button>
          ))}
          <span className="durata-editor">
            <NumInput
              intero
              label="Secondi"
              placeholder="sec"
              value={ogniSec}
              onChange={(v) => v && setOgniSec(Math.min(600, v))}
            />
            <span className="faint">sec</span>
          </span>
        </div>
        <div className="foglio-riga">
          <span className="foglio-label">Per</span>
          {oltranza ? (
            <span className="muted">finché ce la faccio</span>
          ) : (
            <span className="durata-editor">
              <NumInput
                intero
                label="Minuti"
                placeholder="min"
                value={minuti}
                onChange={(v) => setMinuti(Math.min(MINUTI_MAX, Math.max(1, v || 1)))}
              />
              <span className="faint">min</span>
            </span>
          )}
        </div>
        <div className="toggle-row">
          <span className="muted" style={{ fontSize: 13.5 }}>
            Finché ce la faccio
          </span>
          <button
            className={'switch' + (oltranza ? ' on' : '')}
            onClick={() => setMinuti(oltranza ? 12 : null)}
            role="switch"
            aria-checked={oltranza}
            aria-label="Finché ce la faccio"
          >
            <span className="knob" />
          </button>
        </div>
        <button
          className="btn btn-accent btn-block"
          onClick={() => onSalva({ ogniSec: Math.max(15, ogniSec), minuti })}
        >
          {emom ? 'Salva' : 'Crea e scegli il primo esercizio'}
        </button>
        {onSciogli && (
          <button className="btn btn-ghost btn-block" onClick={onSciogli}>
            Sciogli: tornano esercizi normali
          </button>
        )}
      </div>
    </Foglio>
  )
}
