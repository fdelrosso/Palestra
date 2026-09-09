import { schemaPerSettimana } from '../data/model'
import { formatSerieRip } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import { IconCheck, IconClock, IconWeight } from './icons'

// Card di un esercizio mostrato per una certa settimana.
// Se `onToggle` è passato, mostra il pallino "fatto".
// Se l'esercizio ha un gruppo muscolare, l'intero riquadro prende quel colore.
export default function EsercizioCard({ esercizio, settimana, done = false, onToggle }) {
  const schema = schemaPerSettimana(esercizio, settimana)
  const serieRip = formatSerieRip(schema)
  const gruppo = gruppoDi(esercizio.gruppo)

  return (
    <div
      className={'ex-card' + (done ? ' done' : '') + (gruppo ? ' has-gruppo' : '')}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
    >
      <div className="ex-head">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className={'nome' + (done ? ' done' : '')}>{esercizio.nome}</div>
          {gruppo && <span className="gruppo-tag">{gruppo.label}</span>}
          {esercizio.nota && <div className="ex-nota">{esercizio.nota}</div>}
        </div>
        {onToggle && (
          <button
            className={'tick' + (done ? ' on' : '')}
            onClick={onToggle}
            aria-label={done ? 'Segna come da fare' : 'Segna come fatto'}
          >
            <IconCheck width={18} height={18} />
          </button>
        )}
      </div>

      <div className="ex-scheme">
        {serieRip && <span className="serie-rip">{serieRip}</span>}
        {schema.carico && (
          <span className="chip">
            <IconWeight width={15} height={15} />
            {schema.carico}
          </span>
        )}
        {schema.recupero && (
          <span className="chip">
            <IconClock width={15} height={15} />
            {schema.recupero}
          </span>
        )}
        {schema.nota && <span className="chip chip-nota">{schema.nota}</span>}
      </div>
    </div>
  )
}
