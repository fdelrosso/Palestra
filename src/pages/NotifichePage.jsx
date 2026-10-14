import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import { fraseNotifica, leggiNotifiche, segnaNotificheLette } from '../lib/notifiche'
import { quandoBreve } from '../lib/format'
import { IconBack, IconComment, IconCuore } from '../components/icons'

// ---------------------------------------------------------------------------
// Il cuoricino del proprio Profilo (/notifiche): chi ha messo mi piace o ha
// commentato i tuoi allenamenti, una riga per allenamento e per tipo
// (lib/notifiche). Toccare una riga porta al post nel tuo profilo, con i mi
// piace o i commenti già aperti.
//
// Aprire questa pagina segna tutto come visto (il numero rosso si spegne), ma
// DOPO aver letto: le righe nuove restano evidenziate finché si è qui.
// ---------------------------------------------------------------------------

export default function NotifichePage() {
  const { utenteCorrente } = useAccount()
  const { schede } = useStore()
  const ioId = utenteCorrente?.id || null
  const [righe, setRighe] = useState(null)

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    leggiNotifiche().then((esito) => {
      if (!vivo) return
      setRighe(esito.righe)
      if (esito.ok) segnaNotificheLette(ioId)
    })
    return () => {
      vivo = false
    }
  }, [ioId])

  // Il nome dell'allenamento dalla chiave '<schedaId>|<data>': è mio, quindi
  // sta fra le mie schede.
  const nomeDi = useMemo(() => {
    const mappa = new Map()
    for (const s of schede || []) {
      for (const c of s.completamenti || []) {
        if (!c.data) continue
        const giorno = (s.giorni || []).find((g) => g.id === c.giornoId)
        mappa.set(`${s.id}|${c.data}`, c.nomeGiorno || giorno?.nome || 'Allenamento')
      }
    }
    return (chiave) => mappa.get(chiave) || 'Allenamento'
  }, [schede])

  const apri = (r) => {
    const q = new URLSearchParams({ post: r.chiave, apri: r.tipo })
    navigate(`${routes.amici()}?${q}`)
  }

  const nuove = (righe || []).filter((r) => r.nuovi > 0)
  const prima = (righe || []).filter((r) => r.nuovi === 0)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack()} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Attività</h1>
      </div>

      {righe == null ? (
        <p className="muted">Un attimo…</p>
      ) : righe.length === 0 ? (
        <div className="empty">
          <div className="big">🤍</div>
          <p>
            Ancora niente.
            <br />
            Qui trovi chi mette mi piace o commenta i tuoi allenamenti pubblici.
          </p>
        </div>
      ) : (
        <>
          {nuove.length > 0 && (
            <>
              <div className="section-title">Nuove</div>
              <div className="chat-lista">
                {nuove.map((r) => (
                  <RigaNotifica key={r.tipo + r.chiave} r={r} nome={nomeDi(r.chiave)} onApri={() => apri(r)} />
                ))}
              </div>
            </>
          )}
          {prima.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: nuove.length ? 18 : 0 }}>
                {nuove.length ? 'Prima' : 'Tutte'}
              </div>
              <div className="chat-lista">
                {prima.map((r) => (
                  <RigaNotifica key={r.tipo + r.chiave} r={r} nome={nomeDi(r.chiave)} onApri={() => apri(r)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function RigaNotifica({ r, nome, onApri }) {
  const commento = r.tipo === 'commento'
  return (
    <button className={'chat-lista-riga notifica-riga' + (r.nuovi > 0 ? ' da-leggere' : '')} onClick={onApri}>
      <span className={'notifica-icona' + (commento ? ' commento' : '')} aria-hidden="true">
        {commento ? <IconComment width={18} height={18} /> : <IconCuore pieno width={18} height={18} />}
      </span>
      <span className="chat-lista-testo">
        <span className="notifica-frase">
          <strong>{fraseNotifica(r)}</strong> {commento ? 'il tuo allenamento' : 'al tuo allenamento'}{' '}
          <strong>{nome}</strong>
        </span>
        {commento && r.ultimoTesto && <span className="notifica-citazione">“{r.ultimoTesto}”</span>}
        <span className="chat-lista-ora">{quandoBreve(r.ultimoIl)}</span>
      </span>
      {r.nuovi > 0 && (
        <span className="pallino-notifica" aria-label={`${r.nuovi} nuovi`}>
          {r.nuovi}
        </span>
      )}
    </button>
  )
}
