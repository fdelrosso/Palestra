import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { attribuzioniDaDecidere, rispondiAttribuzione } from '../lib/attribuzioniScheda'
import { dataLunga } from '../lib/format'
import { AnteprimaGiorni } from './SchedeDalPt'
import { IconChevron } from './icons'

// ---------------------------------------------------------------------------
// In Lavoro e in Atleti, per il PT: gli atleti che dicono "questa scheda me
// l'hai fatta tu" (components/CollegaAlPt, lib/attribuzioniScheda). Si guarda
// la copia mandata con la richiesta e si conferma o no. Senza richieste non
// c'è niente.
// ---------------------------------------------------------------------------

export default function SchedeDaConfermare() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [richieste, setRichieste] = useState([])
  const [errore, setErrore] = useState('')
  const [occupata, setOccupata] = useState(null)
  const io = utenteCorrente?.id

  useEffect(() => {
    let vivo = true
    const leggi = () => attribuzioniDaDecidere(io).then((r) => vivo && setRichieste(r))
    leggi()
    const visibile = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [io])

  if (richieste.length === 0) return null

  const nomeDi = (id) => mieiAtleti.find((a) => a.id === id)?.nome || 'Un atleta'

  const rispondi = async (r, accetto) => {
    setErrore('')
    setOccupata(r.id)
    const esito = await rispondiAttribuzione(r.id, accetto)
    setOccupata(null)
    if (!esito.ok) return setErrore(esito.errore)
    setRichieste((tutte) => tutte.filter((x) => x.id !== r.id))
  }

  return (
    <>
      <div className="section-title" style={{ marginTop: 8 }}>
        Schede da confermare · {richieste.length}
      </div>
      {errore && <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 8 }}>{errore}</div>}
      <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
        {richieste.map((r) => (
          <Richiesta
            key={r.id}
            richiesta={r}
            atleta={nomeDi(r.atletaId)}
            occupata={occupata === r.id}
            onSi={() => rispondi(r, true)}
            onNo={() => rispondi(r, false)}
          />
        ))}
      </div>
    </>
  )
}

function Richiesta({ richiesta: r, atleta, occupata, onSi, onNo }) {
  const [aperta, setAperta] = useState(false)
  return (
    <div className="card">
      <div style={{ fontSize: 14, lineHeight: 1.45 }}>
        <strong>{atleta}</strong> dice che <strong>«{r.nome}»</strong> l&apos;hai fatta tu.
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Chiesto il {dataLunga(r.creataIl)}</div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 6, paddingLeft: 0 }}
        onClick={() => setAperta((v) => !v)}
        aria-expanded={aperta}
      >
        {aperta ? 'Nascondi' : 'Guarda gli esercizi'}
        <IconChevron width={14} height={14} style={{ transform: aperta ? 'rotate(90deg)' : undefined, marginLeft: 4 }} />
      </button>
      {aperta && <AnteprimaGiorni scheda={r.dati} />}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="btn grow" onClick={onNo} disabled={occupata}>
          Non è mia
        </button>
        <button type="button" className="btn btn-accent grow" onClick={onSi} disabled={occupata}>
          È mia
        </button>
      </div>
    </div>
  )
}
