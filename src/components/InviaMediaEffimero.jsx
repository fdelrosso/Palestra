import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { DURATA_VIDEO_MAX, durataVideo, mediaDisponibile, videoTroppoLungo } from '../lib/media'
import { ORE_SCADENZA } from '../lib/effimeri'
import { IconAmici, IconCheck, IconClose, IconImage } from './icons'

// ---------------------------------------------------------------------------
// Mandare una foto o un video a un amico — momentaneo.
//
// Stessi controlli dei media degli esercizi (video max 10", vedi lib/media):
// non è una regola morale, è che un video di 10" pesa ~15MB e questi finiscono
// in IndexedDB. La differenza è che qui il file si cancella da solo appena
// l'altro l'ha guardato, e comunque entro 24 ore.
//
// Lo diciamo chiaro nel modale: non è "sicurezza", è spazio. Chi guarda può
// sempre fare uno screenshot, e va detto invece di lasciarlo credere.
// ---------------------------------------------------------------------------

const LIMITE_BYTE = 60 * 1024 * 1024 // sopra i 60MB non ha senso: è roba di passaggio

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function InviaMediaEffimero({ amicoIniziale = null, onChiudi }) {
  const { amici, inviaEffimero } = useAccount()
  const [scelti, setScelti] = useState(amicoIniziale ? [amicoIniziale] : [])
  const [file, setFile] = useState(null)
  const [anteprima, setAnteprima] = useState(null)
  const [errore, setErrore] = useState('')
  const [esito, setEsito] = useState('')
  const [inviando, setInviando] = useState(false)
  const inputFile = useRef(null)

  const cambia = (id) => {
    setErrore('')
    setScelti((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const scegliFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErrore('')
    const video = f.type.startsWith('video/')
    if (!video && !f.type.startsWith('image/')) {
      return setErrore('Si possono mandare solo foto e video.')
    }
    if (f.size > LIMITE_BYTE) {
      return setErrore('File troppo grande: tienilo sotto i 60MB.')
    }
    if (video) {
      const secondi = await durataVideo(f)
      if (secondi == null) {
        return setErrore('Non riesco a leggere questo video. Prova con un altro formato.')
      }
      if (videoTroppoLungo(secondi)) {
        return setErrore(`Il video dura ${Math.round(secondi)}s: il limite è ${DURATA_VIDEO_MAX}s.`)
      }
    }
    if (anteprima) URL.revokeObjectURL(anteprima)
    setFile({ blob: f, tipo: video ? 'video' : 'foto', nome: f.name })
    setAnteprima(URL.createObjectURL(f))
  }

  const invia = async () => {
    if (!file || inviando) return
    setInviando(true)
    const r = await inviaEffimero(scelti, { tipo: file.tipo, nome: file.nome, blob: file.blob })
    setInviando(false)
    if (!r.ok) return setErrore(r.errore)
    setEsito(`Mandato a ${r.quanti} ${r.quanti === 1 ? 'amico' : 'amici'}.`)
    setTimeout(chiudi, 1200)
  }

  const chiudi = () => {
    if (anteprima) URL.revokeObjectURL(anteprima)
    onChiudi()
  }

  return createPortal(
    <div className="modal-backdrop" onClick={chiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label="Manda una foto o un video"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 2 }}>Foto o video momentaneo</h3>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Sparisce appena lo guarda, e comunque dopo {ORE_SCADENZA} ore. Non occupa memoria a
              lungo — ma uno screenshot può sempre farlo.
            </div>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={chiudi}>
            <IconClose />
          </button>
        </div>

        {!mediaDisponibile() ? (
          <p className="form-error" style={{ marginTop: 14 }}>
            Questo browser non può conservare foto e video (IndexedDB non disponibile).
          </p>
        ) : amici.length === 0 ? (
          <div className="empty" style={{ paddingBottom: 8 }}>
            <div className="big">👋</div>
            <p>Prima serve un amico a cui mandarlo.</p>
            <button
              className="btn btn-accent"
              style={{ marginTop: 14 }}
              onClick={() => {
                chiudi()
                navigate(routes.amici())
              }}
            >
              <IconAmici width={16} height={16} /> Vai agli amici
            </button>
          </div>
        ) : (
          <>
            {/* Il file */}
            <div className="effimero-scelta">
              {anteprima ? (
                file.tipo === 'video' ? (
                  <video src={anteprima} controls playsInline />
                ) : (
                  <img src={anteprima} alt="Anteprima" />
                )
              ) : (
                <div className="effimero-vuoto">Nessun file scelto</div>
              )}
            </div>
            <button
              className="btn btn-block"
              style={{ marginTop: 10 }}
              onClick={() => inputFile.current?.click()}
            >
              <IconImage width={17} height={17} />
              {file ? 'Cambia file' : `Scegli foto o video (max ${DURATA_VIDEO_MAX}s)`}
            </button>
            <input
              ref={inputFile}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={scegliFile}
            />

            {/* A chi */}
            <div className="section-title" style={{ marginTop: 16 }}>A chi</div>
            <div className="stack" style={{ gap: 8 }}>
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
              <button className="btn btn-ghost" onClick={chiudi}>
                Annulla
              </button>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={!file || scelti.length === 0 || inviando || !!esito}
                onClick={invia}
              >
                {inviando ? 'Invio…' : 'Manda'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
