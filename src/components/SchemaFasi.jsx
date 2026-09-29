import { useState } from 'react'
import { fasiDi, schemaDaFasi } from '../lib/fasi'
import { IconClose, IconPlus } from './icons'

// Serie, ripetizioni, carico e recupero di un esercizio, con le FASI: "3×5
// poi 2×2", ognuna con le sue serie, ripetizioni e il suo peso (lib/fasi).
// Con una fase sola è la griglia di sempre, più un tasto per aggiungerne.
//
// Si usa nell'editor della scheda (schema base, o una riga per settimana con
// `settimana`) e nel modale "Modifica" durante l'allenamento.
//
// ⚠️ Le righe stanno ANCHE qui, nello stato del componente, e non solo nello
// schema: una fase appena aggiunta è vuota, e vuota nello schema non lascia
// traccia (non ha serie). Rileggendo lo schema a ogni tasto sparirebbe prima di
// poterla riempire. Lo schema resta comunque l'unica verità: se cambia da fuori
// (un'altra settimana, un altro esercizio nella stessa card), le righe si
// rifanno da lì.
const firmaDi = (s) => [s?.serie || '', s?.ripetizioni || '', s?.carico || ''].join('\u0001')

export default function SchemaFasi({ schema, onChange, settimana = null }) {
  const firma = firmaDi(schema)
  const [stato, setStato] = useState(() => ({ firma, righe: fasiDi(schema) }))
  let righe = stato.righe
  if (stato.firma !== firma) {
    righe = fasiDi(schema)
    setStato({ firma, righe })
  }

  const scrivi = (nuove) => {
    const patch = schemaDaFasi(nuove)
    setStato({ firma: firmaDi(patch), righe: nuove })
    onChange(patch)
  }
  const cambia = (k, campo) => (e) =>
    scrivi(righe.map((f, i) => (i === k ? { ...f, [campo]: e.target.value } : f)))
  const aggiungi = () => scrivi([...righe, { serie: '', ripetizioni: '', carico: '' }])
  const togli = (k) => scrivi(righe.filter((_, i) => i !== k))

  const piu = righe.length > 1
  const dove = (k) => (piu ? `, fase ${k + 1}` : '')
  const campi = (f, k) => (
    <>
      <input className="input" placeholder="Serie" aria-label={`Serie${dove(k)}`} value={f.serie} onChange={cambia(k, 'serie')} />
      <input className="input" placeholder="Rip." aria-label={`Ripetizioni${dove(k)}`} value={f.ripetizioni} onChange={cambia(k, 'ripetizioni')} />
      <input className="input" placeholder="Carico" aria-label={`Carico${dove(k)}`} value={f.carico} onChange={cambia(k, 'carico')} />
    </>
  )
  const recupero = (placeholder) => (
    <input
      className="input"
      placeholder={placeholder}
      aria-label="Recupero"
      value={schema?.recupero || ''}
      onChange={(e) => onChange({ recupero: e.target.value })}
    />
  )
  const togliFase = (k) => (
    <button type="button" className="icon-btn" onClick={() => togli(k)} aria-label={`Togli la fase ${k + 1}`}>
      <IconClose width={16} height={16} />
    </button>
  )

  // Una riga per settimana, come prima: il "+" per la fase sta sotto la S.
  if (settimana != null) {
    return (
      <div>
        {righe.map((f, k) => (
          <div key={k} className="week-scheme-row">
            {k === 0 ? (
              <span className="wk wk-fasi">
                S{settimana}
                <button
                  type="button"
                  className="wk-piu"
                  onClick={aggiungi}
                  aria-label={`Aggiungi una fase alla settimana ${settimana}`}
                >
                  <IconPlus width={13} height={13} />
                </button>
              </span>
            ) : (
              <span className="wk fase-poi">poi</span>
            )}
            {campi(f, k)}
            {k === 0 ? recupero('Rec.') : togliFase(k)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {!piu ? (
        <div className="grid-4">
          {campi(righe[0], 0)}
          {recupero('Recupero')}
        </div>
      ) : (
        <>
          {/* Con più righe i campi pieni non mostrano più il segnaposto: le
              colonne vanno dette una volta, sopra. */}
          <div className="fase-riga fase-intestazione" aria-hidden="true">
            <span>Serie</span>
            <span>Rip.</span>
            <span>Carico</span>
          </div>
          {righe.map((f, k) => (
            <div key={k}>
              {k > 0 && <div className="fase-poi">poi</div>}
              <div className="fase-riga">
                {campi(f, k)}
                {togliFase(k)}
              </div>
            </div>
          ))}
          <div className="fase-intestazione" style={{ margin: '10px 2px 4px' }} aria-hidden="true">
            Recupero
          </div>
          {recupero('Recupero')}
        </>
      )}
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={aggiungi}>
        <IconPlus width={14} height={14} />
        {piu ? 'Poi un’altra fase' : 'Poi un’altra fase (es. 3×5 poi 2×2)'}
      </button>
    </div>
  )
}
