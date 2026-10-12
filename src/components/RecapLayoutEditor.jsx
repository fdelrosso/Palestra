import {
  BLOCCHI_RECAP,
  OPZIONI_RECAP,
  acceso,
  alterna,
  eLayoutDefault,
  normalizzaLayout,
} from '../lib/recapLayout'

// ---------------------------------------------------------------------------
// "Modifica" del recap: quali pezzi vanno sulla card.
//
// Una riga per blocco, nell'ordine in cui sta sulla card: la spunta lo accende
// o lo spegne. L'ordine non si cambia (dalla 57ª, lib/recapLayout): è quello
// della card di sempre. Sotto "Esercizi" le sue opzioni (pallini,
// serie-ripetizioni-carico), in fondo la firma. L'anteprima sopra si ridisegna
// a ogni tocco: è lei a dire com'è venuta.
// ---------------------------------------------------------------------------

const LABEL = Object.fromEntries(BLOCCHI_RECAP.map((b) => [b.id, b.label]))

export default function RecapLayoutEditor({ layout, onCambia }) {
  const L = normalizzaLayout(layout)
  const opzioniDi = (id) => OPZIONI_RECAP.filter((o) => o.dentro === id)
  const libere = OPZIONI_RECAP.filter((o) => !o.dentro)

  const spunta = (id, label, rientro = false) => (
    <label
      className="row"
      style={{
        gap: 10,
        flex: 1,
        minWidth: 0,
        paddingLeft: rientro ? 28 : 0,
        cursor: 'pointer',
      }}
    >
      <input type="checkbox" checked={acceso(L, id)} onChange={() => onCambia(alterna(L, id))} />
      <span style={{ fontSize: 14, opacity: acceso(L, id) ? 1 : 0.55 }}>{label}</span>
    </label>
  )

  return (
    <div className="card stack" style={{ gap: 6, marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="card-titolo">Cosa c’è sulla card</div>
        {!eLayoutDefault(L) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCambia(null)}>
            Ripristina
          </button>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -2 }}>
        Togli la spunta per nasconderlo. Quello che manca (es. le calorie non scritte) non
        compare comunque.
      </p>

      {L.ordine.map((id) => (
        <div key={id} className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            {spunta(id, LABEL[id])}
          </div>
          {acceso(L, id) && opzioniDi(id).map((o) => <div key={o.id}>{spunta(o.id, o.label, true)}</div>)}
        </div>
      ))}

      {libere.map((o) => (
        <div
          key={o.id}
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          {spunta(o.id, o.label)}
        </div>
      ))}
    </div>
  )
}
