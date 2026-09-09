import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { ETICHETTA_TIPO } from '../lib/condivisioni'
import { IconAmici, IconCheck, IconClose } from './icons'

// ---------------------------------------------------------------------------
// "Manda a un amico": il modale che sta dietro a ogni tasto Condividi.
//
// Vale per le schede, gli allenamenti e i recap: cambia solo cosa gli si passa
// (`tipo` + `payload`). Chi riceve se lo trova in Condivisi, e la copia è sua.
//
// Si può scegliere più di un amico in una volta perché è il caso normale: la
// scheda nuova la mandi a tutti quelli con cui ti alleni, non uno alla volta.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function CondividiConAmici({ tipo, titolo, sottotitolo, payload, onChiudi }) {
  const { amici, condividiConAmici } = useAccount()
  const [scelti, setScelti] = useState([])
  const [esito, setEsito] = useState('')
  const [errore, setErrore] = useState('')

  const cambia = (id) => {
    setErrore('')
    setScelti((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const invia = () => {
    const r = condividiConAmici(scelti, { tipo, titolo, sottotitolo, payload })
    if (!r.ok) return setErrore(r.errore)
    setEsito(`Mandato a ${r.quanti} ${r.quanti === 1 ? 'amico' : 'amici'}.`)
    setScelti([])
    setTimeout(onChiudi, 1200)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label="Condividi con un amico"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 2 }}>Manda a un amico</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              {ETICHETTA_TIPO[tipo] || 'Contenuto'} · {titolo}
            </div>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        {amici.length === 0 ? (
          <div className="empty" style={{ paddingBottom: 8 }}>
            <div className="big">👋</div>
            <p>
              Non hai ancora amici.
              <br />
              Aggiungine uno e potrai mandargli quello che vuoi.
            </p>
            <button
              className="btn btn-accent"
              style={{ marginTop: 14 }}
              onClick={() => {
                onChiudi()
                navigate(routes.amici())
              }}
            >
              <IconAmici width={16} height={16} /> Vai agli amici
            </button>
          </div>
        ) : (
          <>
            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              {amici.map((u) => {
                const on = scelti.includes(u.id)
                return (
                  <button
                    key={u.id}
                    className={'destinatario' + (on ? ' on' : '')}
                    onClick={() => cambia(u.id)}
                    aria-pressed={on}
                  >
                    <span className="user-avatar sm" aria-hidden="true">
                      {iniziale(u.nome)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{u.nome}</span>
                    <span className={'tick-box' + (on ? ' on' : '')} aria-hidden="true">
                      {on && <IconCheck width={14} height={14} />}
                    </span>
                  </button>
                )
              })}
            </div>

            {errore && <p className="form-error" style={{ marginTop: 10 }}>{errore}</p>}
            {esito && (
              <p className="row" style={{ gap: 6, color: 'var(--good)', fontSize: 13, marginTop: 10 }}>
                <IconCheck width={16} height={16} />
                {esito}
              </p>
            )}

            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onChiudi}>
                Annulla
              </button>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={scelti.length === 0 || !!esito}
                onClick={invia}
              >
                Manda{scelti.length > 1 ? ` a ${scelti.length}` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
