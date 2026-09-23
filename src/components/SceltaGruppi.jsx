import { GRUPPI } from '../lib/muscoli'
import { alternaGruppo } from '../lib/eserciziLibreria'

// ---------------------------------------------------------------------------
// I gruppi muscolari di un esercizio, a pastiglie: se ne accendono quanti
// servono (i dip sono petto E tricipiti).
//
// Il PRIMO acceso è il principale e ha la stellina: è quello che usano i
// consigli e la libreria, che ragionano per un gruppo solo. L'ordine è quello
// in cui li si tocca — così il principale è quello che viene in mente per
// primo, che di solito è quello giusto.
//
// Lo stesso componente all'import e nell'editor, apposta: se fossero due, uno
// dei due prima o poi tornerebbe a un gruppo solo e perderebbe il secondo.
// ---------------------------------------------------------------------------

export default function SceltaGruppi({ valori = [], onChange, compatto = false }) {
  return (
    <div className="gruppo-chips" role="group" aria-label="Gruppi muscolari">
      {GRUPPI.map((g) => {
        const pos = valori.indexOf(g.id)
        const acceso = pos >= 0
        return (
          <button
            key={g.id}
            type="button"
            className={'gruppo-chip' + (acceso ? ' on' : '')}
            style={{ '--g': g.colore, ...(compatto ? { fontSize: 12, padding: '3px 8px' } : null) }}
            aria-pressed={acceso}
            title={pos === 0 ? 'Gruppo principale' : undefined}
            onClick={() => onChange(alternaGruppo(valori, g.id))}
          >
            {pos === 0 && valori.length > 1 ? '★ ' : ''}
            {g.label}
          </button>
        )
      })}
    </div>
  )
}
