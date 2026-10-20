import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { IconBranoPrec, IconBranoSucc, IconPausa, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Play/pausa e brano prima/dopo, sotto il timer dell'allenamento. Solo
// nell'app Android: il plugin nativo `Musica` (android/…/MusicaPlugin.java)
// comanda l'app che sta suonando. Con l'accesso alle notifiche (si chiede con
// "Mostra la canzone") si vedono anche titolo, artista e copertina.
// ⚠️ Si chiede se il plugin c'e', non solo se si e' nell'app: il codice web
// arriva da main, e un'app installata prima del plugin non lo ha. Nel sito e
// su iPhone non si vede niente.
// ---------------------------------------------------------------------------

const Musica = registerPlugin('Musica')

export default function ComandiMusica() {
  // { permesso, suona, titolo?, artista?, copertina? } — null finche' non arriva.
  const [stato, setStato] = useState(null)
  const disponibile = Capacitor.isPluginAvailable('Musica')
  // Fino a quando le letture si ignorano dopo un tocco: l'app della musica ci
  // mette un attimo, e senza permesso Android dice "suona" ancora per un po'.
  const fermo = useRef(0)

  // ponytail: si chiede lo stato ogni secondo invece di ascoltare i cambi
  // dal lato nativo; se pesa, un MediaController.Callback che notifica il JS.
  useEffect(() => {
    if (!disponibile) return
    const leggi = () =>
      document.visibilityState === 'visible' &&
      Date.now() > fermo.current &&
      Musica.stato()
        .then((s) => Date.now() > fermo.current && setStato(s))
        .catch(() => {})
    leggi()
    const id = setInterval(leggi, 1000)
    return () => clearInterval(id)
  }, [disponibile])

  if (!disponibile) return null

  const premi = (azione) => {
    // Subito l'icona giusta: lo stato vero arriva al giro dopo.
    fermo.current = Date.now() + 2000
    if (azione === 'playPausa') setStato((s) => s && { ...s, suona: !s.suona })
    Musica.comando({ azione }).catch(() => {})
  }
  const suona = !!stato?.suona

  return (
    <div className="card comandi-musica" role="group" aria-label="Musica">
      {stato?.titolo && (
        <div className="comandi-musica-brano">
          {stato.copertina ? (
            <img src={stato.copertina} alt="" width={44} height={44} />
          ) : (
            <span className="comandi-musica-vuota" aria-hidden="true">
              ♪
            </span>
          )}
          <span className="comandi-musica-testi">
            <span className="comandi-musica-titolo">{stato.titolo}</span>
            {stato.artista && <span className="comandi-musica-artista">{stato.artista}</span>}
          </span>
        </div>
      )}
      <div className="comandi-musica-tasti">
        <button className="icon-btn" onClick={() => premi('prec')} aria-label="Brano precedente">
          <IconBranoPrec />
        </button>
        <button
          className="icon-btn comandi-musica-play"
          onClick={() => premi('playPausa')}
          aria-label={suona ? 'Pausa la musica' : 'Fai partire la musica'}
        >
          {suona ? <IconPausa /> : <IconPlay />}
        </button>
        <button className="icon-btn" onClick={() => premi('succ')} aria-label="Brano successivo">
          <IconBranoSucc />
        </button>
      </div>
      {stato && !stato.permesso && (
        <button type="button" className="comandi-musica-permesso" onClick={() => Musica.apriPermesso().catch(() => {})}>
          Mostra la canzone: attiva l’accesso alle notifiche per ProgettoPalestra
        </button>
      )}
    </div>
  )
}
