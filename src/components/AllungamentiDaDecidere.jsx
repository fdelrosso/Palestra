import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import {
  allungamentiDaDecidere,
  propostaCompleta,
  rifiutaAllungamento,
  salvaBozzaPerAtleta,
} from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Per il PT, in Lavoro e nella pagina dell'atleta: le richieste di allungare
// una scheda (2026-10-28, lib/proposteScheda → L'ALLUNGAMENTO).
//   - "Allunga" riapre la scheda nell'editor (pages/EditorPage, modo
//     allunga): lì si aggiungono le settimane e si scrivono gli esercizi;
//   - "No", con un messaggio se si vuole.
// Con `atletaId` solo quelle di quell'atleta. Senza richieste, niente.
// ---------------------------------------------------------------------------

export default function AllungamentiDaDecidere({ atletaId = null }) {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [richieste, setRichieste] = useState([])
  const io = utenteCorrente?.id

  useEffect(() => {
    let vivo = true
    const leggi = () => allungamentiDaDecidere(io).then((r) => vivo && setRichieste(r))
    leggi()
    const visibile = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [io])

  const mie = atletaId ? richieste.filter((r) => r.atletaId === atletaId) : richieste
  if (mie.length === 0) return null

  const nomeDi = (id) => mieiAtleti.find((a) => a.id === id)?.nome || 'Un atleta'

  return (
    <>
      <div className="section-title" style={{ marginTop: 8 }}>
        Schede da allungare · {mie.length}
      </div>
      <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
        {mie.map((r) => (
          <Richiesta
            key={r.id}
            richiesta={r}
            atleta={nomeDi(r.atletaId)}
            onRifiutata={() => setRichieste((tutte) => tutte.filter((x) => x.id !== r.id))}
          />
        ))}
      </div>
    </>
  )
}

function Richiesta({ richiesta: r, atleta, onRifiutata }) {
  const [no, setNo] = useState(false)
  const [risposta, setRisposta] = useState('')
  const [occupata, setOccupata] = useState(false)
  const [errore, setErrore] = useState('')

  // La scheda com'è adesso (intera, se a parti) nell'editor, con quello che
  // serve per rimandarla come risposta a questa richiesta.
  const allunga = async () => {
    setErrore('')
    setOccupata(true)
    const p = await propostaCompleta(r.propostaId)
    setOccupata(false)
    if (!p?.dati) return setErrore('La scheda non si trova: ricarica.')
    const prima = p.settimaneTotali || p.dati.numeroSettimane
    salvaBozzaPerAtleta(r.atletaId, { ...p.dati, nome: p.dati.nome || p.nome }, null, null, {
      richiestaId: r.id,
      propostaId: r.propostaId,
      settimanePrima: prima,
      visibili: p.settimaneVisibili || null,
      totali: p.settimaneTotali || null,
      nome: p.nome,
    })
    navigate(routes.schedaPerAtleta(r.atletaId))
  }

  const rifiuta = async () => {
    setErrore('')
    setOccupata(true)
    const esito = await rifiutaAllungamento(r.id, risposta)
    setOccupata(false)
    if (!esito.ok) return setErrore(esito.errore)
    onRifiutata()
  }

  return (
    <div className="card">
      <div style={{ fontSize: 14, lineHeight: 1.45 }}>
        <strong>{atleta}</strong> chiede di allungare <strong>«{r.nome}»</strong>.
      </div>
      {r.nota && <p style={{ fontSize: 14, lineHeight: 1.45, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>«{r.nota}»</p>}
      {no && (
        <div className="field" style={{ margin: '10px 0 0' }}>
          <label htmlFor={'allunga-no-' + r.id}>Messaggio (facoltativo)</label>
          <input
            id={'allunga-no-' + r.id}
            className="input"
            value={risposta}
            maxLength={1000}
            placeholder="Es. Prima finiamo questa, poi ne facciamo una nuova."
            onChange={(e) => setRisposta(e.target.value)}
          />
        </div>
      )}
      {errore && <p className="form-error">{errore}</p>}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        {no ? (
          <>
            <button type="button" className="btn grow" onClick={() => setNo(false)} disabled={occupata}>
              Annulla
            </button>
            <button type="button" className="btn btn-danger-pieno grow" onClick={rifiuta} disabled={occupata}>
              Di’ di no
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn grow" onClick={() => setNo(true)} disabled={occupata}>
              No
            </button>
            <button type="button" className="btn btn-accent grow" onClick={allunga} disabled={occupata}>
              {occupata ? 'Un attimo…' : 'Allunga'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
