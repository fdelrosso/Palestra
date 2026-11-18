import { useState } from 'react'
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
// `senzaCardio`: niente pastiglia Cardio, per un esercizio della libreria che
// cardio non è (uno squat non diventa cardio). Se era già accesa resta, per
// poterla spegnere.
//
// Si vedono solo i gruppi accesi (toccati si spengono) e un "+" che
// apre gli altri; scelto uno, si richiude. Senza nessun gruppo acceso si
// vedono tutti: c'è da sceglierne uno.
// ---------------------------------------------------------------------------

export default function SceltaGruppi({
  valori = [],
  onChange,
  compatto = false,
  sottogruppi = [],
  onSottogruppi = null,
  mancaSotto = false,
  senzaCardio = false,
}) {
  const conSotto = onSottogruppi ? valori.filter((g) => SOTTOGRUPPI.some((s) => s.gruppo === g)) : []
  const chip = compatto ? { fontSize: 12, padding: '3px 8px' } : null
  const gruppi = senzaCardio ? GRUPPI.filter((g) => g.id !== 'cardio' || valori.includes('cardio')) : GRUPPI
  const [altri, setAltri] = useState(false)
  const tutti = !valori.length
  // Accesi nell'ordine in cui li si è toccati (il primo è il principale).
  const accesi = valori.map(gruppoDi).filter(Boolean)
  const spenti = gruppi.filter((g) => !valori.includes(g.id))
  const pastiglia = (g) => {
    const pos = valori.indexOf(g.id)
    const acceso = pos >= 0
    return (
      <button
        key={g.id}
        type="button"
        className={'gruppo-chip' + (acceso ? ' on' : '')}
        style={{ '--g': g.colore, ...chip }}
        aria-pressed={acceso}
        aria-label={acceso && !tutti ? `Togli ${g.label}` : undefined}
        title={pos === 0 ? 'Gruppo principale' : undefined}
        onClick={() => {
          onChange(alternaGruppo(valori, g.id))
          if (!acceso) setAltri(false)
        }}
      >
        {pos === 0 && valori.length > 1 ? '★ ' : ''}
        {g.label}
      </button>
    )
  }
  return (
    <>
      <div className="gruppo-chips" role="group" aria-label="Gruppi muscolari">
        {tutti ? (
          gruppi.map(pastiglia)
        ) : (
          <>
            {accesi.map(pastiglia)}
            {spenti.length > 0 && (
              <button
                type="button"
                className={'gruppo-chip gruppo-chip-piu' + (altri ? ' aperto' : '')}
                style={chip}
                aria-expanded={altri}
                aria-label={altri ? 'Chiudi gli altri gruppi' : 'Aggiungi un gruppo'}
                onClick={() => setAltri((a) => !a)}
              >
                {altri ? '−' : '+'}
              </button>
            )}
          </>
        )}
      </div>
      {!tutti && altri && (
        <div className="gruppo-chips gruppo-chips-altri" role="group" aria-label="Altri gruppi">
          {spenti.map(pastiglia)}
        </div>
      )}
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
