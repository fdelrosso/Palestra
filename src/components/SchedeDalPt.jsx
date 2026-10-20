import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { proposteInArrivo, rispondiProposta, schedaDaProposta } from '../lib/proposteScheda'
import { mieAttribuzioni } from '../lib/attribuzioniScheda'
import { schemaPerSettimana } from '../data/model'
import { formatSerieRip } from '../lib/schema'
import { IconChevron } from './icons'

// ---------------------------------------------------------------------------
// Le schede che il PT ti ha mandato dall'app (lib/proposteScheda), in cima a
// Home e Programmi. Si guardano qui, e:
//   - "Salva fra le mie" → finisce fra le tue schede, NON attiva: la rendi
//     attiva tu dalla sua pagina (dove si arriva subito);
//   - "Rifiuta" → il PT lo vede nella sua pagina dell'atleta.
// Non si cancellano da sole: restano finché non rispondi (o lui le ritira).
// ---------------------------------------------------------------------------

export default function SchedeDalPt() {
  const { utenteCorrente, mioPt } = useAccount()
  const { schede, getScheda, aggiungiScheda, aggiornaScheda } = useStore()
  const [proposte, setProposte] = useState([])
  const [errore, setErrore] = useState('')
  const [occupata, setOccupata] = useState(null)
  const io = utenteCorrente?.id

  const rileggi = useCallback(() => {
    proposteInArrivo(io).then(setProposte)
  }, [io])

  // Le schede che il PT ha confermato come sue ("Collegala al tuo PT",
  // components/CollegaAlPt): il database ha già scritto `daPt`, ma la copia
  // sul telefono può non averlo. Lo si rimette qui, una volta.
  const [confermate, setConfermate] = useState([])
  useEffect(() => {
    let vivo = true
    mieAttribuzioni(io).then((a) => vivo && setConfermate(a.filter((x) => x.stato === 'accettata')))
    return () => {
      vivo = false
    }
  }, [io])
  useEffect(() => {
    for (const a of confermate) {
      const s = schede.find((x) => x.id === a.schedaId)
      if (s && s.daPt?.id !== a.ptId) {
        aggiornaScheda({ ...s, daPt: { id: a.ptId, nome: mioPt?.id === a.ptId ? mioPt.nome : s.daPt?.nome || '' } })
      }
    }
  }, [confermate, schede, aggiornaScheda, mioPt])

  useEffect(() => {
    rileggi()
    // Al ritorno sull'app: la scheda può essere arrivata mentre era chiusa.
    const visibile = () => document.visibilityState === 'visible' && rileggi()
    document.addEventListener('visibilitychange', visibile)
    return () => document.removeEventListener('visibilitychange', visibile)
  }, [rileggi])

  if (proposte.length === 0) return null

  const nomePt = (p) => (mioPt?.id === p.ptId ? mioPt.nome : 'Il tuo PT')

  const rispondi = async (p, accetto) => {
    setErrore('')
    setOccupata(p.id)
    const r = await rispondiProposta(p.id, accetto)
    setOccupata(null)
    if (!r.ok) {
      setErrore(r.errore)
      rileggi()
      return
    }
    setProposte((tutte) => tutte.filter((x) => x.id !== p.id))
    if (!accetto) return
    const scheda = schedaDaProposta(p, nomePt(p))
    if (!getScheda(scheda.id)) aggiungiScheda(scheda, { attiva: false })
    navigate(routes.scheda(scheda.id))
  }

  return (
    <div className="stack" style={{ gap: 8, margin: '4px 0 12px' }}>
      {errore && (
        <div className="riquadro riquadro-avviso" role="alert">{errore}</div>
      )}
      {proposte.map((p) => (
        <Proposta
          key={p.id}
          proposta={p}
          nomePt={nomePt(p)}
          occupata={occupata === p.id}
          onSalva={() => rispondi(p, true)}
          onRifiuta={() => rispondi(p, false)}
        />
      ))}
    </div>
  )
}

/** Giorni ed esercizi di una scheda in breve (le proposte, e le schede da confermare in Lavoro). */
export function AnteprimaGiorni({ scheda }) {
  const giorni = (scheda?.giorni || []).filter((g) => g.tipo === 'workout')
  return (
    <div className="stack" style={{ gap: 10, marginTop: 4 }}>
      {giorni.map((g) => (
        <div key={g.id}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{g.nome || 'Giorno'}</div>
          {(g.esercizi || []).map((e) => (
            <div key={e.id} className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 13.5, marginTop: 3 }}>
              <span style={{ minWidth: 0 }}>{e.nome}</span>
              <span className="muted nowrap">{formatSerieRip(schemaPerSettimana(e, 1))}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Proposta({ proposta: p, nomePt, occupata, onSalva, onRifiuta }) {
  const [aperta, setAperta] = useState(false)
  const giorni = (p.dati?.giorni || []).filter((g) => g.tipo === 'workout')
  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div className="kicker" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
        Nuova scheda da {nomePt}
      </div>
      <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>{p.nome}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        {giorni.length} giorn{giorni.length === 1 ? 'o' : 'i'} di allenamento ·{' '}
        {p.dati?.senzaFine ? 'senza fine' : `${p.dati?.numeroSettimane || 1} settimane`}
      </div>
      {p.nota && (
        <p style={{ fontSize: 14, lineHeight: 1.45, margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>«{p.nota}»</p>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 8, paddingLeft: 0 }}
        onClick={() => setAperta((v) => !v)}
        aria-expanded={aperta}
      >
        {aperta ? 'Nascondi' : 'Guarda gli esercizi'}
        <IconChevron width={14} height={14} style={{ transform: aperta ? 'rotate(90deg)' : undefined, marginLeft: 4 }} />
      </button>

      {aperta && <AnteprimaGiorni scheda={p.dati} />}

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn-accent grow" onClick={onSalva} disabled={occupata}>
          Salva fra le mie
        </button>
        <button type="button" className="btn grow" onClick={onRifiuta} disabled={occupata}>
          Rifiuta
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.4, margin: '8px 0 0' }}>
        Salvata non diventa subito quella attiva: la attivi tu quando vuoi.
      </p>
    </div>
  )
}
