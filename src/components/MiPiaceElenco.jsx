import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { chiHaMessoMiPiace } from '../lib/interazioni'
import { quandoBreve } from '../lib/format'
import { IconClose, IconCuore } from './icons'
import Avatar from './Avatar'
import { navigate, routes } from '../lib/router'

// ---------------------------------------------------------------------------
// Chi ha messo mi piace a un allenamento: si apre toccando "N mi piace" sotto
// il recap nel Feed. I nomi li dà il database insieme ai mi piace (vedi
// lib/interazioni), e solo a chi può vedere quell'allenamento.
// ---------------------------------------------------------------------------

export default function MiPiaceElenco({ chiave, onChiudi }) {
  const [righe, setRighe] = useState(null)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    let vivo = true
    chiHaMessoMiPiace(chiave).then((esito) => {
      if (!vivo) return
      setRighe(esito.righe)
      if (!esito.ok) setErrore(esito.errore)
    })
    return () => {
      vivo = false
    }
  }, [chiave])

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Mi piace" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ marginBottom: 0 }}>
            Mi piace{righe && righe.length > 0 ? ` · ${righe.length}` : ''}
          </h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        {righe === null ? (
          <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>Un attimo…</p>
        ) : righe.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>
            {errore || 'Ancora nessuno.'}
          </p>
        ) : (
          <div className="chat-lista" style={{ marginTop: 12 }}>
            {righe.map((r) => (
              <button key={r.userId} className="chat-lista-riga" onClick={() => navigate(routes.utente(r.userId))}>
                <Avatar id={r.userId} nome={r.nome} />
                <span className="chat-lista-testo">
                  <span className="chat-lista-su">
                    <span className="chat-lista-nome">{r.nome || 'Qualcuno'}</span>
                    <span className="chat-lista-ora">{quandoBreve(r.creatoIl)}</span>
                  </span>
                </span>
                <IconCuore pieno width={16} height={16} className="mi-piace-acceso" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
