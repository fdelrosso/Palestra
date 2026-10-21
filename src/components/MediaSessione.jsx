import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DURATA_VIDEO_MAX,
  comprimiVideo,
  durataVideo,
  fileTroppoPesante,
  messaggioTroppoPesante,
  videoTroppoLungo,
} from '../lib/media'
import { conNuovoMedia, fileMediaSessione, salvaMediaSessione, scartaMedia, togliMediaSessione } from '../lib/mediaSessione'
import Foglio from './Foglio'
import Fotocamera from './Fotocamera'
import SceltaSpezzone from './SceltaSpezzone'
import { IconCamera, IconClose, IconImage, IconVideo } from './icons'

// ---------------------------------------------------------------------------
// Foto e video DURANTE l'allenamento: l'icona nella barra in alto della
// sessione (pages/WorkoutSession) apre un foglio per scattare, registrare o
// prendere dalla galleria, e poi si sceglie a cosa serve: SFONDO del recap o
// ALLEGATO all'allenamento. Finiscono nel riepilogo al "Termina"
// (lib/mediaSessione). Un video di sfondo passa dalla scelta dei 6 secondi
// (SceltaSpezzone), uno da allegare si alleggerisce subito (comprimiVideo).
//
// `media` = sessione.media; `onCambia(fn)` la aggiorna partendo da com'è
// adesso (fra la scelta e il salvataggio può passare una compressione).
// ---------------------------------------------------------------------------

export default function MediaSessione({ media = [], onCambia }) {
  const [aperto, setAperto] = useState(false)
  // Il file appena preso: si sceglie a cosa serve.
  const [scelto, setScelto] = useState(null)
  const [spezzoneDa, setSpezzoneDa] = useState(null)
  const [avviso, setAvviso] = useState('')
  const [lavoro, setLavoro] = useState('') // '' = niente in corso
  // La fotocamera dentro l'app (components/Fotocamera): 'foto' | 'video' | null.
  const [camera, setCamera] = useState(null)
  const foto = useRef(null)
  const video = useRef(null)
  const galleria = useRef(null)
  const n = media.length
  const sfondo = media.find((m) => m.uso === 'sfondo')

  const prendi = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvviso('')
    setScelto(file)
  }

  const tieni = async (file, uso) => {
    const voce = await salvaMediaSessione(file, uso)
    onCambia((lista) => {
      const { lista: nuova, via } = conNuovoMedia(lista || [], voce)
      scartaMedia(via)
      return nuova
    })
    setAvviso(uso === 'sfondo' ? 'Sarà lo sfondo del recap.' : 'Allegato: lo ritrovi nel riepilogo.')
  }

  const usa = async (uso) => {
    const file = scelto
    setScelto(null)
    const eVideo = String(file.type || '').startsWith('video')
    if (uso === 'sfondo') {
      if (eVideo) setSpezzoneDa(file)
      else await tieni(file, 'sfondo')
      return
    }
    if (fileTroppoPesante(file)) return setAvviso(messaggioTroppoPesante(file))
    if (!eVideo) return tieni(file, 'allegato')
    const secondi = await durataVideo(file)
    if (secondi == null) return setAvviso('Non riesco a leggere la durata di questo video.')
    if (videoTroppoLungo(secondi)) return setAvviso(`Dura ${Math.round(secondi)}": il massimo è ${DURATA_VIDEO_MAX}".`)
    setLavoro('Alleggerisco il video… 0%')
    try {
      const leggero = await comprimiVideo(file, {
        onProgresso: (p) => setLavoro(`Alleggerisco il video… ${Math.round(p * 100)}%`),
      })
      await tieni(leggero, 'allegato')
    } finally {
      setLavoro('')
    }
  }

  return (
    <>
      <button
        className="icon-btn media-sessione-tasto"
        onClick={() => setAperto(true)}
        aria-label={n ? `Foto e video: ${n}` : 'Scatta una foto o un video'}
      >
        <IconCamera />
        {n > 0 && <span className="media-sessione-numero">{n}</span>}
      </button>

      <input ref={foto} type="file" accept="image/*" capture="environment" hidden onChange={prendi} />
      <input ref={video} type="file" accept="video/*" capture="environment" hidden onChange={prendi} />
      <input ref={galleria} type="file" accept="image/*,video/*" hidden onChange={prendi} />

      {aperto && !camera && !scelto && !spezzoneDa && (
        <Foglio
          titolo="Foto e video"
          sotto="Per lo sfondo del recap o da allegare: li ritrovi nel riepilogo quando termini."
          onChiudi={lavoro ? undefined : () => setAperto(false)}
        >
          {n > 0 && (
            <div className="media-sessione-lista">
              {media.map((m) => (
                <Miniatura key={m.id} voce={m} onTogli={() => onCambia((lista) => togliMediaSessione(lista, m.id))} />
              ))}
            </div>
          )}
          <div className="stack" style={{ gap: 8 }}>
            <div className="row media-sessione-tasti" style={{ gap: 8 }}>
              <button className="btn grow" disabled={!!lavoro} onClick={() => setCamera('foto')}>
                <IconCamera width={17} height={17} /> Foto
              </button>
              <button className="btn grow" disabled={!!lavoro} onClick={() => setCamera('video')}>
                <IconVideo width={17} height={17} /> Video
              </button>
              <button className="btn grow" disabled={!!lavoro} onClick={() => galleria.current?.click()}>
                <IconImage width={17} height={17} /> Galleria
              </button>
            </div>
            {lavoro && <p className="muted media-sessione-avviso">{lavoro}</p>}
            {!lavoro && avviso && <p className="muted media-sessione-avviso">{avviso}</p>}
            <button className="btn btn-accent btn-block" disabled={!!lavoro} onClick={() => setAperto(false)}>
              Fatto
            </button>
          </div>
        </Foglio>
      )}

      {camera && (
        <Fotocamera
          modo={camera}
          onFile={(file) => {
            setCamera(null)
            setAvviso('')
            setScelto(file)
          }}
          onRipiego={() => {
            setCamera(null)
            ;(camera === 'foto' ? foto : video).current?.click()
          }}
          onChiudi={() => setCamera(null)}
        />
      )}

      {scelto && (
        <Foglio titolo="A cosa serve?" onChiudi={() => setScelto(null)}>
          <Anteprima file={scelto} />
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-accent btn-block" onClick={() => usa('sfondo')}>
              {sfondo ? 'Sfondo del recap (al posto di quello di prima)' : 'Sfondo del recap'}
            </button>
            <button className="btn btn-block" onClick={() => usa('allegato')}>
              Allega all’allenamento
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setScelto(null)}>
              Annulla
            </button>
          </div>
        </Foglio>
      )}

      {spezzoneDa && (
        <SceltaSpezzone
          file={spezzoneDa}
          onChiudi={() => setSpezzoneDa(null)}
          onFatto={async (spezzone) => {
            setSpezzoneDa(null)
            await tieni(spezzone, 'sfondo')
          }}
        />
      )}
    </>
  )
}

// Quello che si è preso, prima di dire a cosa serve.
function Anteprima({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return String(file.type || '').startsWith('video') ? (
    <video className="media-sessione-anteprima" src={`${url}#t=0.1`} muted playsInline preload="metadata" />
  ) : (
    <img className="media-sessione-anteprima" src={url} alt="" />
  )
}

function Miniatura({ voce, onTogli }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let vivo = true
    let u = null
    fileMediaSessione(voce).then((b) => {
      if (!vivo || !b) return
      u = URL.createObjectURL(b)
      setUrl(u)
    })
    return () => {
      vivo = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [voce])
  return (
    <div className="media-sessione-mini">
      {url ? (
        voce.tipo === 'video' ? (
          <video src={`${url}#t=0.1`} muted playsInline preload="metadata" />
        ) : (
          <img src={url} alt="" />
        )
      ) : (
        <div className="media-loading" />
      )}
      <span className="media-sessione-uso">{voce.uso === 'sfondo' ? 'Sfondo' : 'Allegato'}</span>
      <button type="button" className="media-sessione-x" onClick={onTogli} aria-label="Togli">
        <IconClose width={13} height={13} />
      </button>
    </div>
  )
}
