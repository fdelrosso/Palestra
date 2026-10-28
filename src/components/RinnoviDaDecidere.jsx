import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { rinnoviDaDecidere, rispondiRinnovo } from '../lib/proposteScheda'
import { dataScadenza, domani, giornoIso, piuGiorni, scadenzaValida } from '../lib/scadenza'

// ---------------------------------------------------------------------------
// Per il PT, in Lavoro e nella pagina dell'atleta: le richieste di rinnovo
// delle schede scadute (2026-10-28, lib/proposteScheda). "Rinnova" con la
// data nuova (proposta: 4 settimane da oggi), o "No", con un messaggio se si
// vuole. Con `atletaId` solo quelle di quell'atleta. Senza richieste, niente.
// ---------------------------------------------------------------------------

export default function RinnoviDaDecidere({ atletaId = null, onDeciso }) {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [richieste, setRichieste] = useState([])
  const io = utenteCorrente?.id

  useEffect(() => {
    let vivo = true
    const leggi = () => rinnoviDaDecidere(io).then((r) => vivo && setRichieste(r))
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
        Rinnovi da decidere · {mie.length}
      </div>
      <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
        {mie.map((r) => (
          <Richiesta
            key={r.id}
            richiesta={r}
            atleta={nomeDi(r.atletaId)}
            onDeciso={(esito) => {
              setRichieste((tutte) => tutte.filter((x) => x.id !== r.id))
              onDeciso?.(r, esito)
            }}
          />
        ))}
      </div>
    </>
  )
}

function Richiesta({ richiesta: r, atleta, onDeciso }) {
  const [scadenza, setScadenza] = useState(() => piuGiorni(giornoIso(), 28))
  const [risposta, setRisposta] = useState('')
  const [occupata, setOccupata] = useState(false)
  const [errore, setErrore] = useState('')

  const decidi = async (accetto) => {
    if (accetto && !scadenzaValida(scadenza)) return setErrore('La scadenza va messa da domani in poi.')
    setErrore('')
    setOccupata(true)
    const esito = await rispondiRinnovo(r.id, accetto, scadenza, risposta)
    setOccupata(false)
    if (!esito.ok) return setErrore(esito.errore)
    onDeciso({ accetto, scadenza: accetto ? scadenza : null })
  }

  return (
    <div className="card">
      <div style={{ fontSize: 14, lineHeight: 1.45 }}>
        <strong>{atleta}</strong> chiede di rinnovare <strong>«{r.nome}»</strong>
        {r.scadeIl ? `, scaduta il ${dataScadenza(r.scadeIl)}` : ''}.
      </div>
      {r.nota && <p style={{ fontSize: 14, lineHeight: 1.45, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>«{r.nota}»</p>}
      <div className="row" style={{ gap: 8, marginTop: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 150px' }}>
          <label htmlFor={'rinnovo-' + r.id}>Nuova scadenza</label>
          <input
            id={'rinnovo-' + r.id}
            type="date"
            className="input"
            min={domani()}
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ margin: '8px 0 0' }}>
        <label htmlFor={'risposta-' + r.id}>Messaggio (facoltativo)</label>
        <input
          id={'risposta-' + r.id}
          className="input"
          value={risposta}
          maxLength={500}
          placeholder="Es. Ci vediamo lunedì per la nuova."
          onChange={(e) => setRisposta(e.target.value)}
        />
      </div>
      {errore && <p className="form-error">{errore}</p>}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="btn grow" onClick={() => decidi(false)} disabled={occupata}>
          No
        </button>
        <button type="button" className="btn btn-accent grow" onClick={() => decidi(true)} disabled={occupata}>
          Rinnova
        </button>
      </div>
    </div>
  )
}
