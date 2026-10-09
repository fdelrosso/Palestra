import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { personeBloccate, sbloccaPersona } from '../lib/social'
import Avatar from './Avatar'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// Le persone che ho bloccato (dal Profilo), con "Sblocca". Si bloccano dalla
// loro pagina (pages/UtentePage, menu "⋯"); qui si torna indietro.
// Sbloccare toglie solo il blocco: l'amicizia, se c'era, non torna da sola.
// ---------------------------------------------------------------------------

export default function PersoneBloccate({ onChiudi }) {
  const [persone, setPersone] = useState(null) // null = sto chiedendo
  const [errore, setErrore] = useState('')

  useEffect(() => {
    let vivo = true
    personeBloccate().then((esito) => {
      if (!vivo) return
      setPersone(esito.persone)
      setErrore(esito.errore)
    })
    return () => {
      vivo = false
    }
  }, [])

  const sblocca = async (id) => {
    const esito = await sbloccaPersona(id)
    if (!esito.ok) return setErrore(esito.errore)
    setPersone((p) => p.filter((x) => x.id !== id))
  }

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Persone bloccate" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>Persone bloccate</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        {errore && <p className="form-error">{errore}</p>}
        {persone === null ? (
          <p className="muted">Un attimo…</p>
        ) : persone.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>
            Non hai bloccato nessuno. Si blocca dalla pagina di una persona, dal menu “⋯”.
          </p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {persone.map((p) => (
              <div key={p.id} className="user-card" style={{ padding: 10 }}>
                <Avatar id={p.id} nome={p.nome} foto={p.foto || ''} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, display: 'block' }}>{p.nome}</span>
                  {p.username && <span className="muted" style={{ fontSize: 12.5 }}>@{p.username}</span>}
                </span>
                <button className="btn btn-sm nowrap" onClick={() => sblocca(p.id)}>
                  Sblocca
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
