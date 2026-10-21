import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DURATA_VIDEO_MAX } from '../lib/media'
import { apriImpostazioni, puoAprireImpostazioni } from '../lib/nativo'
import { formatSec } from '../lib/parseRecupero'
import { IconCamera, IconClose, IconReset } from './icons'

// ---------------------------------------------------------------------------
// LA FOTOCAMERA DENTRO L'APP (89ª), per "Foto" e "Video" dell'allenamento
// (components/MediaSessione). Prima si apriva l'app della fotocamera del
// telefono (<input capture>): mentre stava davanti, Android poteva chiudere la
// nostra — su un Oppo A76, con la musica e il timer accesi, succedeva — e al
// ✓ l'app ripartiva dalla Home e la foto andava persa. Qui l'app non va mai in
// secondo piano.
//
// Foto: `ImageCapture.takePhoto()` dove c'è (Chrome/Android: la foto a piena
// risoluzione del sensore), se no il fotogramma del video su una canvas.
// Video: MediaRecorder, in MP4 se il browser lo sa fare (Chrome ≥126, Safari),
// se no WebM; si ferma da solo a DURATA_VIDEO_MAX. ⚠️ Nell'app Android il
// microfono non è nel manifest: si riprova senza audio e lo si dice.
//
// Se la fotocamera non si apre, `onRipiego` (un tocco vero, perché <input>
// .click() vuole un gesto) riapre l'app della fotocamera come prima.
// ⚠️ Le tracce si spengono nel `return` dell'effetto (come ScannerCodice):
// senza, la spia della fotocamera resta accesa.
// ---------------------------------------------------------------------------

const TIPI_VIDEO = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']

function messaggioErrore(e) {
  const nome = e?.name || ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'Non ho il permesso di usare la fotocamera.'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Non trovo una fotocamera su questo dispositivo.'
  if (nome === 'NotReadableError') return 'La fotocamera è occupata da un’altra app.'
  return 'Non riesco ad aprire la fotocamera.'
}

export default function Fotocamera({ modo, onFile, onRipiego, onChiudi }) {
  const videoRef = useRef(null)
  const flusso = useRef(null)
  const registratore = useRef(null)
  const [verso, setVerso] = useState('environment')
  const [errore, setErrore] = useState(null)
  const [pronto, setPronto] = useState(false)
  const [senzaAudio, setSenzaAudio] = useState(false)
  const [secondi, setSecondi] = useState(null) // null = non sta registrando
  const [scatto, setScatto] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setErrore({ testo: 'Questo browser non apre la fotocamera da qui.' })
      const video = { facingMode: { ideal: verso }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      let s
      try {
        s = await navigator.mediaDevices.getUserMedia({ video, audio: modo === 'video' })
      } catch (e) {
        if (modo !== 'video') return vivo && setErrore({ testo: messaggioErrore(e), negato: e?.name === 'NotAllowedError' })
        // Il video senza il microfono (nell'app Android non c'è il permesso).
        try {
          s = await navigator.mediaDevices.getUserMedia({ video, audio: false })
          if (vivo) setSenzaAudio(true)
        } catch (e2) {
          return vivo && setErrore({ testo: messaggioErrore(e2), negato: e2?.name === 'NotAllowedError' })
        }
      }
      if (!vivo) return s.getTracks().forEach((t) => t.stop())
      flusso.current = s
      videoRef.current.srcObject = s
      videoRef.current.play().catch(() => {})
      setPronto(true)
    })()
    return () => {
      vivo = false
      if (registratore.current?.state === 'recording') {
        registratore.current.ondataavailable = null
        registratore.current.onstop = null
        registratore.current.stop()
      }
      flusso.current?.getTracks().forEach((t) => t.stop())
      flusso.current = null
    }
  }, [modo, verso])

  // Il conto dei secondi, e lo stop da solo al massimo.
  useEffect(() => {
    if (secondi == null) return undefined
    if (secondi >= DURATA_VIDEO_MAX) {
      registratore.current?.stop()
      return undefined
    }
    const t = setTimeout(() => setSecondi((n) => (n == null ? n : n + 1)), 1000)
    return () => clearTimeout(t)
  }, [secondi])

  const scatta = async () => {
    const v = videoRef.current
    const traccia = flusso.current?.getVideoTracks()[0]
    if (!v || !traccia) return
    setScatto(true)
    let blob = null
    if (typeof ImageCapture !== 'undefined') {
      blob = await new ImageCapture(traccia).takePhoto().catch(() => null)
    }
    if (!blob) {
      const c = document.createElement('canvas')
      c.width = v.videoWidth
      c.height = v.videoHeight
      c.getContext('2d').drawImage(v, 0, 0)
      blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
    }
    setScatto(false)
    if (blob) onFile(new File([blob], `foto-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }))
  }

  const registra = () => {
    if (!flusso.current) return
    if (typeof MediaRecorder === 'undefined') return setErrore({ testo: 'Questo browser non registra video da qui.' })
    const tipo = TIPI_VIDEO.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
    const r = new MediaRecorder(flusso.current, tipo ? { mimeType: tipo } : undefined)
    const pezzi = []
    r.ondataavailable = (e) => e.data.size && pezzi.push(e.data)
    r.onstop = () => {
      setSecondi(null)
      const mime = (r.mimeType || tipo || 'video/webm').split(';')[0]
      const blob = new Blob(pezzi, { type: mime })
      if (blob.size) onFile(new File([blob], `video-${Date.now()}.${mime.endsWith('mp4') ? 'mp4' : 'webm'}`, { type: mime }))
    }
    registratore.current = r
    r.start(1000)
    setSecondi(0)
  }

  const registrando = secondi != null
  return createPortal(
    <div className="fotocamera" role="dialog" aria-label={modo === 'video' ? 'Registra un video' : 'Scatta una foto'}>
      <video
        ref={videoRef}
        className={'fotocamera-video' + (verso === 'user' ? ' specchio' : '')}
        playsInline
        muted
        autoPlay
      />

      <div className="fotocamera-sopra">
        <button className="icon-btn" onClick={onChiudi} aria-label="Chiudi" disabled={registrando}>
          <IconClose />
        </button>
        {registrando && (
          <span className="fotocamera-tempo">
            {formatSec(secondi)} / {formatSec(DURATA_VIDEO_MAX)}
          </span>
        )}
      </div>

      {errore ? (
        <div className="fotocamera-errore">
          <p>{errore.testo}</p>
          {errore.negato && puoAprireImpostazioni() && (
            <button className="btn btn-block" onClick={apriImpostazioni}>
              Apri le impostazioni dell’app
            </button>
          )}
          <button className="btn btn-accent btn-block" onClick={onRipiego}>
            <IconCamera width={17} height={17} /> Usa l’app della fotocamera
          </button>
        </div>
      ) : (
        <div className="fotocamera-sotto">
          {senzaAudio && <p className="fotocamera-nota">Senza audio: l’app non ha il permesso del microfono.</p>}
          <div className="fotocamera-tasti">
            <span />
            <button
              className={'fotocamera-scatto' + (modo === 'video' ? ' video' : '') + (registrando ? ' acceso' : '')}
              disabled={!pronto || scatto}
              onClick={modo === 'foto' ? scatta : registrando ? () => registratore.current?.stop() : registra}
              aria-label={modo === 'foto' ? 'Scatta' : registrando ? 'Ferma' : 'Registra'}
            />
            <button
              className="icon-btn fotocamera-gira"
              onClick={() => {
                setPronto(false)
                setVerso((v) => (v === 'user' ? 'environment' : 'user'))
              }}
              disabled={registrando}
              aria-label="Gira la fotocamera"
            >
              <IconReset />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
