import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import {
  DURATA_VIDEO_MAX,
  durataVideo,
  fileTroppoPesante,
  mediaDisponibile,
  messaggioTroppoPesante,
  PESO_FILE_MAX_MB,
  videoTroppoLungo,
} from '../lib/media'
import { ORE_SCADENZA } from '../lib/effimeri'
import { IconAmici, IconBack, IconCheck, IconClose, IconImage, IconInvia } from './icons'
import TastoFoto from './TastoFoto'
import Avatar from './Avatar'

// ---------------------------------------------------------------------------
// Mandare una foto o un video a un amico.
//
// Scelto il file si apre l'ANTEPRIMA a schermo pieno, come su WhatsApp: lì si
// vede cosa parte e a chi, e si sceglie come. Di base si guarda UNA volta (il
// "1" acceso); "Permanente" lo lascia nella chat finché uno dei due non lo
// elimina (lib/effimeri). Il default resta "una volta" perché è quello che non
// riempie lo spazio del progetto.
//
// Stessi controlli dei media degli esercizi (video max 30", vedi lib/media):
// non è una regola morale, è che un video di 30" pesa ~45MB.
//
// Lo diciamo chiaro: "una volta" non è "sicurezza", è spazio. Chi guarda può
// SALVARLO sul telefono mentre lo guarda (VisoreEffimero), oltre allo
// screenshot di sempre, e va detto invece di lasciar credere il contrario.
// ---------------------------------------------------------------------------

export default function InviaMediaEffimero({ amicoIniziale = null, onChiudi }) {
  const { amici, inviaEffimero } = useAccount()
  const [scelti, setScelti] = useState(amicoIniziale ? [amicoIniziale] : [])
  const [file, setFile] = useState(null)
  const [anteprima, setAnteprima] = useState(null)
  const [permanente, setPermanente] = useState(false)
  const [errore, setErrore] = useState('')
  const [esito, setEsito] = useState('')
  const [inviando, setInviando] = useState(false)

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
    if (fileTroppoPesante(f)) {
      return setErrore(messaggioTroppoPesante(f))
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
    setErrore('')
    const r = await inviaEffimero(scelti, {
      tipo: file.tipo,
      nome: file.nome,
      blob: file.blob,
      permanente,
    })
    setInviando(false)
    if (!r.ok) return setErrore(r.errore)
    // ⚠️ Ogni destinatario ha il suo file, quindi puo' andare bene per uno e
    // male per un altro. Se non sono partiti tutti si dice quanti: "mandato"
    // e basta sarebbe una bugia per quello rimasto fuori.
    const mancati = scelti.length - r.quanti
    setEsito(
      mancati > 0
        ? `Mandato a ${r.quanti} di ${scelti.length}. ${r.errore || ''}`.trim()
        : `Mandato a ${r.quanti} ${r.quanti === 1 ? 'amico' : 'amici'}.`,
    )
    setTimeout(chiudi, 1200)
  }

  const chiudi = () => {
    if (anteprima) URL.revokeObjectURL(anteprima)
    onChiudi()
  }

  // Indietro dall'anteprima: si torna a scegliere file e destinatari.
  const togliFile = () => {
    if (anteprima) URL.revokeObjectURL(anteprima)
    setFile(null)
    setAnteprima(null)
    setPermanente(false)
    setErrore('')
  }

  // --- L'anteprima: cosa parte, a chi, e come ---------------------------
  if (file && anteprima) {
    const nomi = amici.filter((u) => scelti.includes(u.id)).map((u) => u.nome)
    const fermo = inviando || !!esito
    return createPortal(
      <div className="visore-backdrop">
        <div className="visore" role="dialog" aria-label="Anteprima dell’invio">
          <div className="visore-head">
            <button className="icon-btn" aria-label="Indietro" onClick={togliFile} disabled={fermo}>
              <IconBack />
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="visore-nome">{nomi.length ? `A ${nomi.join(', ')}` : 'Scegli a chi'}</div>
              <div className="visore-sub">
                {permanente
                  ? 'Resta nella chat finché uno di voi non lo elimina'
                  : `Si guarda una volta, poi sparisce (comunque dopo ${ORE_SCADENZA} ore)`}
              </div>
            </div>
            <button className="icon-btn" aria-label="Chiudi" onClick={chiudi} disabled={inviando}>
              <IconClose />
            </button>
          </div>

          <div className="visore-corpo">
            {file.tipo === 'video' ? (
              <video src={anteprima} controls playsInline />
            ) : (
              <img src={anteprima} alt="Anteprima" />
            )}
          </div>

          {errore && <p className="invio-avviso">{errore}</p>}
          {esito && (
            <p className="invio-avviso row" style={{ gap: 6 }}>
              <IconCheck width={16} height={16} /> {esito}
            </p>
          )}

          <div className="invio-barra">
            <div className="segmented invio-modo" role="radiogroup" aria-label="Come si vede">
              <button
                className={'seg-btn' + (!permanente ? ' on' : '')}
                role="radio"
                aria-checked={!permanente}
                onClick={() => setPermanente(false)}
                disabled={fermo}
              >
                <span className="una-volta" aria-hidden="true">1</span> Una volta
              </button>
              <button
                className={'seg-btn' + (permanente ? ' on' : '')}
                role="radio"
                aria-checked={permanente}
                onClick={() => setPermanente(true)}
                disabled={fermo}
              >
                Permanente
              </button>
            </div>
            <button
              className="icon-btn chat-invia invio-manda"
              aria-label="Manda"
              title="Manda"
              disabled={scelti.length === 0 || fermo}
              onClick={invia}
            >
              <IconInvia width={24} height={24} />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // --- Prima: a chi, e il file -----------------------------------------
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
            <h3 style={{ marginBottom: 2 }}>Foto o video</h3>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Di base si guarda una volta e sparisce; nell’anteprima puoi renderlo permanente.
              Mentre lo guarda può comunque salvarlo sul telefono.
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
                    <Avatar id={u.id} nome={u.nome} />
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{u.nome}</span>
                    <span className={'tick-box' + (on ? ' on' : '')} aria-hidden="true">
                      {on && <IconCheck width={14} height={14} />}
                    </span>
                  </button>
                )
              })}
            </div>

            {errore && <p className="form-error" style={{ marginTop: 10 }}>{errore}</p>}

            {/* Scelto il file si apre l'anteprima: è lì che si manda. */}
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={chiudi}>
                Annulla
              </button>
              <TastoFoto
                className="btn btn-accent"
                style={{ flex: 1 }}
                accept="image/*,video/*"
                onChange={scegliFile}
                disabled={scelti.length === 0}
              >
                <IconImage width={17} height={17} /> Scegli foto o video
              </TastoFoto>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Video fino a {DURATA_VIDEO_MAX}s, file fino a {PESO_FILE_MAX_MB}MB.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
