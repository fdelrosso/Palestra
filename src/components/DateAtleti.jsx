import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { impostaInizioAtleta } from '../lib/contattiPt'
import { giornoIso } from '../lib/scadenza'

// ---------------------------------------------------------------------------
// Gli atleti seguiti da prima che la data si salvasse: il PT vede i loro
// allenamenti solo da quando li segue (hooks/useAtleta), e qui sceglie da quale
// giorno. Compare a ogni apertura dell'app finché ne manca una: "Più tardi"
// vale fino alla prossima. Migrazione 20261101130000.
// ---------------------------------------------------------------------------

const CHIAVE = 'palestra:date-atleti-dopo'

function rimandata() {
  try {
    return !!sessionStorage.getItem(CHIAVE)
  } catch {
    return false
  }
}

export default function DateAtleti({ nascosto = false }) {
  const { mieiAtleti, ricaricaSociale } = useAccount()
  const [chiusa, setChiusa] = useState(rimandata)
  const [date, setDate] = useState({})
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')
  const senza = (mieiAtleti || []).filter((a) => !a.associatoIl)
  if (nascosto || chiusa || senza.length === 0) return null

  const scelte = senza.filter((a) => date[a.id])
  const dopo = () => {
    try {
      sessionStorage.setItem(CHIAVE, '1')
    } catch {
      /* senza sessionStorage torna alla prossima pagina aperta */
    }
    setChiusa(true)
  }
  const salva = async () => {
    setInvio(true)
    setErrore('')
    const esiti = await Promise.all(scelte.map((a) => impostaInizioAtleta(a.id, date[a.id])))
    await ricaricaSociale()
    setInvio(false)
    setErrore(esiti.find((e) => !e.ok)?.errore || '')
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal stack" role="dialog" aria-label="Da quando segui i tuoi atleti" style={{ gap: 10 }}>
        <h3 style={{ marginBottom: 2 }}>Da quando li segui?</h3>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
          Vedi gli allenamenti di un atleta da quando lo segui. Per {senza.length === 1 ? 'questo' : 'questi'} manca
          la data: finché non la scegli li vedi tutti.
        </p>
        {senza.map((a) => (
          <div key={a.id} className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`inizio-${a.id}`}>{a.nome}</label>
            <input
              id={`inizio-${a.id}`}
              type="date"
              className="input"
              max={giornoIso()}
              value={date[a.id] || ''}
              onChange={(e) => setDate((d) => ({ ...d, [a.id]: e.target.value }))}
            />
          </div>
        ))}
        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={dopo}>
            Più tardi
          </button>
          <button type="button" className="btn btn-accent" style={{ flex: 1 }} disabled={invio || !scelte.length} onClick={salva}>
            {invio ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
