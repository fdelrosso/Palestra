import { useEffect, useState } from 'react'
import { leggiVetrina, vetrinaVuota } from '../lib/vetrinaPt'
import { navigate, routes } from '../lib/router'
import { IconCoach, IconEdit } from './icons'

// ---------------------------------------------------------------------------
// La vetrina di un PT sulla sua pagina (UtentePage), sopra "Contatta il PT":
// presentazione, specializzazioni, dove, tariffe (lib/vetrinaPt). Vuota non si
// mostra; sulla PROPRIA pagina invece invita a scriverla.
// ---------------------------------------------------------------------------

export default function VetrinaPt({ id, mia = false }) {
  const [vetrina, setVetrina] = useState(undefined)

  useEffect(() => {
    let vivo = true
    leggiVetrina(id).then((v) => vivo && setVetrina(v))
    return () => {
      vivo = false
    }
  }, [id])

  if (vetrina === undefined) return null

  if (vetrinaVuota(vetrina)) {
    if (!mia) return null
    return (
      <button className="riquadro" style={{ width: '100%', marginBottom: 12 }} onClick={() => navigate(routes.vetrinaPt())}>
        <span className="grow" style={{ textAlign: 'left' }}>
          Racconta chi sei come PT: presentazione, specializzazioni, tariffe. Lo vede chi apre la tua pagina.
        </span>
        <IconEdit width={16} height={16} />
      </button>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <div className="row" style={{ gap: 6, fontWeight: 800, fontSize: 14.5 }}>
          <IconCoach width={16} height={16} /> Personal trainer
        </div>
        {mia && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(routes.vetrinaPt())}>
            <IconEdit width={14} height={14} /> Modifica
          </button>
        )}
      </div>
      {vetrina.bio && (
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{vetrina.bio}</p>
      )}
      {vetrina.specializzazioni.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {vetrina.specializzazioni.map((s) => (
            <span key={s} className="badge badge-accent">{s}</span>
          ))}
        </div>
      )}
      {(vetrina.dove || vetrina.tariffe) && (
        <dl className="vetrina-pt-dati" style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.45 }}>
          {vetrina.dove && (
            <div style={{ marginTop: 4 }}>
              <dt className="muted" style={{ display: 'inline' }}>Dove: </dt>
              <dd style={{ display: 'inline', margin: 0 }}>{vetrina.dove}</dd>
            </div>
          )}
          {vetrina.tariffe && (
            <div style={{ marginTop: 4 }}>
              <dt className="muted" style={{ display: 'inline' }}>Tariffe: </dt>
              <dd style={{ display: 'inline', margin: 0, whiteSpace: 'pre-wrap' }}>{vetrina.tariffe}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
