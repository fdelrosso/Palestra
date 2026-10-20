import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { IconBranoPrec, IconBranoSucc, IconPausa, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Play/pausa e brano prima/dopo, sotto il timer dell'allenamento. Solo
// nell'app Android: il plugin nativo `Musica` (android/…/MusicaPlugin.java)
// manda i tasti multimediali al telefono, e risponde l'app che sta suonando.
// ⚠️ Si chiede se il plugin c'e', non solo se si e' nell'app: il codice web
// arriva da main, e un'app installata prima del plugin non lo ha. Nel sito e
// su iPhone non si vede niente.
// ---------------------------------------------------------------------------

const Musica = registerPlugin('Musica')

function leggi(setSuona) {
  Musica.stato()
    .then((r) => setSuona(!!r.suona))
    .catch(() => {})
}

export default function ComandiMusica() {
  const [suona, setSuona] = useState(false)
  const disponibile = Capacitor.isPluginAvailable('Musica')

  useEffect(() => {
    if (!disponibile) return
    leggi(setSuona)
    // Si torna nell'app dopo aver cambiato musica altrove.
    const vis = () => document.visibilityState === 'visible' && leggi(setSuona)
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [disponibile])

  if (!disponibile) return null

  const premi = (azione) => {
    Musica.comando({ azione })
      .catch(() => {})
      // L'app della musica ci mette un attimo a partire o fermarsi.
      .then(() => setTimeout(() => leggi(setSuona), 400))
  }

  return (
    <div className="card comandi-musica" role="group" aria-label="Musica">
      <button className="icon-btn" onClick={() => premi('prec')} aria-label="Brano precedente">
        <IconBranoPrec />
      </button>
      <button className="icon-btn comandi-musica-play" onClick={() => premi('playPausa')} aria-label={suona ? 'Pausa la musica' : 'Fai partire la musica'}>
        {suona ? <IconPausa /> : <IconPlay />}
      </button>
      <button className="icon-btn" onClick={() => premi('succ')} aria-label="Brano successivo">
        <IconBranoSucc />
      </button>
    </div>
  )
}
