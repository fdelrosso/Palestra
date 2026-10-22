import { useEffect, useMemo, useRef, useState } from 'react'
import { DURATA_SPEZZONE, durataVideo, puoRitagliareVideo, spezzoneVideo } from '../lib/media'
import { formatSec } from '../lib/parseRecupero'
import Foglio from './Foglio'

// ---------------------------------------------------------------------------
// LO SFONDO CHE SI MUOVE (78ª): da un video si scelgono i 6 secondi da mettere
// dietro al recap. Il video gira in anteprima SOLO su quel pezzo, e la barra
// lo sposta. "Usa questi 6 secondi" li rifà muti e leggeri (lib/media,
// spezzoneVideo) e passa lo spezzone a `onFatto(blob)`: è quello che si carica,
// non il video intero. Il video intero, se lo si vuole, si allega a parte.
// ---------------------------------------------------------------------------

export default function SceltaSpezzone({ file, onFatto, onChiudi }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const video = useRef(null)
  const [durata, setDurata] = useState(null)
  // Da durataVideo e non da `duration` del <video>: i video registrati nel
  // browser (components/Fotocamera) non la scrivono, e lì vale Infinity.
  useEffect(() => {
    let vivo = true
    durataVideo(file).then((d) => vivo && setDurata(d))
    return () => {
      vivo = false
    }
  }, [file])
  const [inizio, setInizio] = useState(0)
  // null = si sceglie; un numero = si prepara (0-1); 'errore'.
  const [stato, setStato] = useState(null)
  const fine = inizio + DURATA_SPEZZONE
  const corto = durata != null && durata <= DURATA_SPEZZONE

  // L'anteprima resta dentro il pezzo scelto: arrivata alla fine, ricomincia.
  const tieniNelPezzo = () => {
    const v = video.current
    if (v && (v.currentTime >= fine || v.currentTime < inizio - 0.25)) v.currentTime = inizio
  }

  const sposta = (s) => {
    setInizio(s)
    if (video.current) video.current.currentTime = s
  }

  const usa = async () => {
    setStato(0)
    try {
      onFatto(await spezzoneVideo(file, corto ? 0 : inizio, { onProgresso: setStato }))
    } catch (e) {
      console.warn('Spezzone non fatto', e?.message)
      setStato('errore')
    }
  }

  if (!puoRitagliareVideo()) {
    return (
      <Foglio titolo="Video di sfondo" onChiudi={onChiudi}>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          Questo browser non riesce a ritagliare i video. Usa una foto, oppure prova da Chrome o dall’app per Android.
        </p>
        <button className="btn btn-accent btn-block" onClick={onChiudi}>
          Ho capito
        </button>
      </Foglio>
    )
  }

  const preparo = typeof stato === 'number'
  return (
    <Foglio
      titolo={`Scegli ${DURATA_SPEZZONE} secondi`}
      sotto="Girano in loop dietro al recap, senza audio."
      onChiudi={preparo ? undefined : onChiudi}
    >
      <video
        ref={video}
        className="spezzone-anteprima"
        src={url}
        muted
        playsInline
        autoPlay
        onTimeUpdate={tieniNelPezzo}
        onEnded={(e) => {
          e.currentTarget.currentTime = inizio
          e.currentTarget.play().catch(() => {})
        }}
      />
      {durata != null &&
        (corto ? (
          <p className="muted spezzone-testo">Dura meno di {DURATA_SPEZZONE} secondi: lo uso tutto.</p>
        ) : (
          <>
            <input
              className="spezzone-barra"
              type="range"
              min={0}
              max={Math.max(0, durata - DURATA_SPEZZONE)}
              step={0.1}
              value={inizio}
              disabled={preparo}
              aria-label="Da dove partono i secondi di sfondo"
              onChange={(e) => sposta(Number(e.target.value))}
            />
            <p className="muted spezzone-testo">
              Da {formatSec(inizio)} a {formatSec(fine)} · il video dura {formatSec(durata)}
            </p>
          </>
        ))}
      {stato === 'errore' && (
        <p className="form-error" style={{ marginTop: 8 }}>
          Non sono riuscito a ritagliarlo. Prova con un altro video, o usa una foto.
        </p>
      )}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn grow" onClick={onChiudi} disabled={preparo}>
          Annulla
        </button>
        <button className="btn btn-accent grow" onClick={usa} disabled={preparo || durata == null}>
          {preparo ? `Preparo… ${Math.round(stato * 100)}%` : `Usa questi ${DURATA_SPEZZONE} secondi`}
        </button>
      </div>
    </Foglio>
  )
}
