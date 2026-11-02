import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { cercaPalestre, luogoPalestra, palestraDaId } from '../lib/palestre'
import { IconCheck, IconClose, IconDumbbell, IconSearch } from './icons'

// ---------------------------------------------------------------------------
// Dove ci si è allenati, nel riepilogo (components/Riepilogo, la pillola
// "Palestra"). Di base è la propria (lo mette StoreContext a fine
// allenamento); qui si cambia con un'altra, cercandola come in Cerca →
// Palestre, o si toglie ("Nessuna": a casa, al parco). `onChange(id | null)`.
// ---------------------------------------------------------------------------

function Riga({ p, scelta, onClick }) {
  return (
    <button className="menu-voce" onClick={onClick}>
      <span className="palestra-icona" aria-hidden="true">
        <IconDumbbell width={18} height={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="menu-voce-nome">{p.nome}</span>
        <span className="menu-voce-desc">{luogoPalestra(p)}</span>
      </span>
      {scelta && <IconCheck style={{ color: 'var(--accent)' }} aria-label="Scelta" />}
    </button>
  )
}

export default function SceltaPalestra({ valore, onChange, onFatto }) {
  const { utenteCorrente } = useAccount()
  const miaId = utenteCorrente?.palestraId || null
  const [mia, setMia] = useState(null)
  const [chiave, setChiave] = useState('')
  const [risposta, setRisposta] = useState({ per: '', ok: true, palestre: [] })
  const q = chiave.trim()
  const esito = risposta.per === q ? risposta : null

  useEffect(() => {
    if (!miaId) return undefined
    let vivo = true
    palestraDaId(miaId).then((p) => vivo && setMia(p))
    return () => {
      vivo = false
    }
  }, [miaId])

  useEffect(() => {
    if (q.length < 2) return undefined
    let vivo = true
    const t = setTimeout(async () => {
      const r = await cercaPalestre(q)
      if (vivo) setRisposta({ per: q, ...r })
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [q])

  const scegli = (id) => {
    onChange(id)
    onFatto()
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      {mia && <Riga p={mia} scelta={valore === mia.id} onClick={() => scegli(mia.id)} />}
      <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
        <IconSearch width={17} height={17} className="faint" />
        <input
          type="text"
          enterKeyHint="search"
          className="search-input"
          value={chiave}
          placeholder={mia ? 'Un’altra: nome, comune o FI' : 'Nome, comune o FI'}
          onChange={(e) => setChiave(e.target.value)}
          autoComplete="off"
          aria-label="Cerca la palestra"
        />
        {chiave && (
          <button type="button" className="icon-btn" aria-label="Pulisci" onClick={() => setChiave('')}>
            <IconClose width={16} height={16} />
          </button>
        )}
      </form>
      {q.length >= 2 &&
        (!esito ? (
          <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>Cerco…</p>
        ) : !esito.ok || esito.palestre.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
            {esito.ok ? `Nessuna palestra con «${q}».` : esito.errore || 'Ricerca non riuscita. Riprova.'}
          </p>
        ) : (
          esito.palestre
            .filter((p) => p.id !== mia?.id)
            .map((p) => <Riga key={p.id} p={p} scelta={valore === p.id} onClick={() => scegli(p.id)} />)
        ))}
      <button type="button" className="btn btn-block" onClick={() => scegli(null)} disabled={!valore}>
        Nessuna palestra
      </button>
    </div>
  )
}
