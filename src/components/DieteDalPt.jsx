import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { conKcal, labelObiettivo, rendiAttiva } from '../lib/dieta'
import { proposteDietaInArrivo, rispondiPropostaDieta } from '../lib/proposteDieta'
import { MODI, dietaDaProposta } from '../lib/dietaDalPt'

// ---------------------------------------------------------------------------
// Le diete che il PT ti ha mandato dall'app (lib/proposteDieta), in cima a
// Dieta (Oggi e Le mie diete), come SchedeDalPt per le schede:
//   - "Salva e seguila" → finisce fra le tue diete e diventa quella attiva:
//     se il PT te la manda è quella da seguire. Si apre subito la sua pagina;
//   - "Rifiuta" → il PT lo vede nella sua pagina dell'atleta.
// Restano finché non rispondi (o lui le ritira).
// ---------------------------------------------------------------------------

function Numeri({ etichetta, piano }) {
  return (
    <div className="dieta-kcal">
      <span className="muted">{etichetta}</span>
      <strong>{conKcal(piano) || '-'} kcal</strong>
      <span className="muted" style={{ fontSize: 11.5 }}>
        P {piano?.proteine || 0} · C {piano?.carbo || 0} · G {piano?.grassi || 0}
      </span>
    </div>
  )
}

export default function DieteDalPt() {
  const { utenteCorrente, mioPt } = useAccount()
  const { getDieta, aggiungiDieta, aggiornaDieta } = useStore()
  const [proposte, setProposte] = useState([])
  const [errore, setErrore] = useState('')
  const [occupata, setOccupata] = useState(null)
  const io = utenteCorrente?.id

  const rileggi = useCallback(() => {
    proposteDietaInArrivo(io).then(setProposte)
  }, [io])

  useEffect(() => {
    rileggi()
    // Al ritorno sull'app: la dieta può essere arrivata mentre era chiusa.
    const visibile = () => document.visibilityState === 'visible' && rileggi()
    document.addEventListener('visibilitychange', visibile)
    return () => document.removeEventListener('visibilitychange', visibile)
  }, [rileggi])

  if (proposte.length === 0) return null

  const nomePt = (p) => (mioPt?.id === p.ptId ? mioPt.nome : 'Il tuo PT')

  const rispondi = async (p, accetto) => {
    setErrore('')
    setOccupata(p.id)
    const r = await rispondiPropostaDieta(p.id, accetto)
    setOccupata(null)
    if (!r.ok) {
      setErrore(r.errore)
      rileggi()
      return
    }
    setProposte((tutte) => tutte.filter((x) => x.id !== p.id))
    if (!accetto) return
    const dieta = dietaDaProposta(p, mioPt?.id === p.ptId ? mioPt.nome : '')
    // Se l'aveva già (mandata di nuovo), torna comunque quella attiva.
    if (!getDieta(dieta.id)) aggiungiDieta(dieta)
    else aggiornaDieta(rendiAttiva(getDieta(dieta.id)))
    navigate(routes.dietaVista(dieta.id))
  }

  return (
    <div className="stack" style={{ gap: 8, margin: '4px 0 12px' }}>
      {errore && (
        <div className="riquadro riquadro-avviso" role="alert">{errore}</div>
      )}
      {proposte.map((p) => (
        <div key={p.id} className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="kicker" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
            Nuova dieta da {nomePt(p)}
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>{p.nome}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {MODI[p.modo] || MODI.piano} · {labelObiettivo(p.dati?.obiettivo)}
          </div>
          <div className="dieta-kcal-row">
            <Numeri etichetta="Allenamento" piano={p.dati?.allenamento} />
            <Numeri etichetta="Riposo" piano={p.dati?.riposo} />
          </div>
          {p.modo === 'macro' && (
            <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0', lineHeight: 1.45 }}>
              Solo i numeri: i piatti te li propone l’app, pasto per pasto.
            </p>
          )}
          {p.nota && (
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>«{p.nota}»</p>
          )}
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-sm grow" disabled={occupata === p.id} onClick={() => rispondi(p, false)}>
              Rifiuta
            </button>
            <button className="btn btn-accent btn-sm grow" disabled={occupata === p.id} onClick={() => rispondi(p, true)}>
              Salva e seguila
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
