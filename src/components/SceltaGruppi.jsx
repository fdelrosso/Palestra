import { GRUPPI, SOTTOGRUPPI, gruppoDi } from '../lib/muscoli'
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
//
// Con `onSottogruppi`, sotto i gruppi accesi che li hanno (gambe, spalle,
// schiena: lib/muscoli SOTTOGRUPPI) una riga coi loro sottogruppi, da
// accendere allo stesso modo. Nessuno acceso = il gruppo intero.
// `mancaSotto`: segna in rosso i gruppi senza sottogruppo, quando sceglierlo
// è obbligatorio (un esercizio fuori dalla libreria).
// ---------------------------------------------------------------------------

export default function SceltaGruppi({
  valori = [],
  onChange,
  compatto = false,
  sottogruppi = [],
  onSottogruppi = null,
  mancaSotto = false,
}) {
  const conSotto = onSottogruppi ? valori.filter((g) => SOTTOGRUPPI.some((s) => s.gruppo === g)) : []
  const chip = compatto ? { fontSize: 12, padding: '3px 8px' } : null
  return (
    <>
      <div className="gruppo-chips" role="group" aria-label="Gruppi muscolari">
        {GRUPPI.map((g) => {
          const pos = valori.indexOf(g.id)
          const acceso = pos >= 0
          return (
            <button
              key={g.id}
              type="button"
              className={'gruppo-chip' + (acceso ? ' on' : '')}
              style={{ '--g': g.colore, ...chip }}
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
      {conSotto.map((gid) => {
        const gr = gruppoDi(gid)
        const suoi = SOTTOGRUPPI.filter((s) => s.gruppo === gid)
        const nessuno = !suoi.some((s) => sottogruppi.includes(s.id))
        return (
          <div key={gid} className="sottogruppi-scelta" style={{ '--g': gr.colore }}>
            <span className={'sottogruppi-scelta-titolo' + (mancaSotto && nessuno ? ' manca' : '')}>
              {gr.label}
              {mancaSotto && nessuno ? ': scegli il muscolo' : ''}
            </span>
            <div className="gruppo-chips" role="group" aria-label={`Sottogruppi di ${gr.label}`}>
              {suoi.map((s) => {
                const acceso = sottogruppi.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={'gruppo-chip' + (acceso ? ' on' : '')}
                    style={chip}
                    aria-pressed={acceso}
                    onClick={() => onSottogruppi(alternaGruppo(sottogruppi, s.id))}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
