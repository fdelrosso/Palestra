import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { formatSec } from '../lib/parseRecupero'
import { IconBranoPrec, IconBranoSucc, IconPausa, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Il mini player in fondo all'allenamento: play/pausa e brano prima/dopo. Solo
// nell'app Android: il plugin nativo `Musica` (android/…/MusicaPlugin.java)
// comanda l'app che sta suonando. Con l'accesso alle notifiche (si chiede con
// "Mostra la canzone") si vedono anche titolo, artista e copertina.
// ⚠️ Si chiede se il plugin c'e', non solo se si e' nell'app: il codice web
// arriva da main, e un'app installata prima del plugin non lo ha. Nel sito e
// su iPhone non si vede niente, e nemmeno finche' non suona niente.
// ---------------------------------------------------------------------------

const Musica = registerPlugin('Musica')

export default function ComandiMusica() {
  // { permesso, suona, titolo?, artista?, copertina?, durata?, posizione? (ms) }
  // — null finche' non arriva.
  const [stato, setStato] = useState(null)
  const disponibile = Capacitor.isPluginAvailable('Musica')
  // Fino a quando le letture si ignorano dopo un tocco: l'app della musica ci
  // mette un attimo, e senza permesso Android dice "suona" ancora per un po'.
  const fermo = useRef(0)
  // Si vede da quando qualcosa suona (o c'e' un brano) e resta anche in
  // pausa: senza, chi mette in pausa perderebbe il tasto per ripartire.
  const [visto, setVisto] = useState(false)
  // { src, colore }: il colore vale solo per la copertina da cui viene.
  const [tinta, setTinta] = useState(null)
  const copertina = stato?.copertina
  const colore = copertina && tinta?.src === copertina ? tinta.colore : null
  // Larghezza del titolo se non ci sta (e allora scorre in giro), sennò 0.
  const scatolaTitolo = useRef(null)
  const [scorri, setScorri] = useState(0)

  // Si rimisura quando cambia il titolo (cambia la larghezza del testo) o la
  // riga (telefono ruotato).
  useEffect(() => {
    const el = scatolaTitolo.current
    if (!el) return
    const testo = el.firstChild.firstChild
    // offsetWidth comprende i 48px di stacco dopo il testo (index.css).
    const misura = () => setScorri(testo.offsetWidth - 48 > el.clientWidth ? testo.offsetWidth : 0)
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    ro.observe(testo)
    return () => ro.disconnect()
  }, [visto])

  useEffect(() => {
    if (!copertina) return
    let vivo = true
    coloreCopertina(copertina).then((c) => vivo && setTinta({ src: copertina, colore: c }))
    return () => {
      vivo = false
    }
  }, [copertina])

  // ponytail: si chiede lo stato ogni secondo invece di ascoltare i cambi
  // dal lato nativo; se pesa, un MediaController.Callback che notifica il JS.
  useEffect(() => {
    if (!disponibile) return
    const leggi = () =>
      document.visibilityState === 'visible' &&
      Date.now() > fermo.current &&
      Musica.stato()
        .then((s) => {
          if (Date.now() <= fermo.current) return
          setStato(s)
          if (s.suona || s.titolo) setVisto(true)
        })
        .catch(() => {})
    leggi()
    const id = setInterval(leggi, 1000)
    return () => clearInterval(id)
  }, [disponibile])

  if (!disponibile || !visto) return null

  const premi = (azione) => {
    // Subito l'icona giusta: lo stato vero arriva al giro dopo.
    fermo.current = Date.now() + 2000
    if (azione === 'playPausa') setStato((s) => s && { ...s, suona: !s.suona })
    Musica.comando({ azione }).catch(() => {})
  }
  const suona = !!stato?.suona
  const titolo = stato?.titolo || (suona ? 'In riproduzione' : 'In pausa')

  return (
    <div
      className="comandi-musica"
      role="group"
      aria-label="Musica"
      style={colore ? { '--musica-colore': colore } : undefined}
    >
      <div className="comandi-musica-riga">
        {/* Copertina e titolo aprono Spotify: prende il posto della nota in testata. */}
        <a className="comandi-musica-apri" href="spotify:" aria-label="Apri Spotify">
          {stato?.copertina ? (
            <img src={stato.copertina} alt="" width={56} height={56} />
          ) : (
            <span className="comandi-musica-vuota" aria-hidden="true">
              ♪
            </span>
          )}
          <span className="comandi-musica-testi">
            <span className="comandi-musica-titolo" ref={scatolaTitolo}>
              {/* Scorrendo, una seconda copia identica dietro alla prima: a
                  meta' strada (-50%) sta esattamente dove stava la prima, e il
                  giro riparte senza salti. */}
              <span
                className={scorri ? 'scorre' : undefined}
                // ~30px al secondo, e mai meno di 4s per giro.
                style={scorri ? { '--durata': `${Math.max(4, scorri / 30)}s` } : undefined}
              >
                <span>{titolo}</span>
                {scorri > 0 && <span aria-hidden="true">{titolo}</span>}
              </span>
            </span>
            {stato?.artista && <span className="comandi-musica-artista">{stato.artista}</span>}
          </span>
        </a>
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
          Mostra la canzone: attiva l’accesso alle notifiche
        </button>
      )}
      {stato?.durata > 0 && (
        <div
          className="comandi-musica-barra"
          role="progressbar"
          aria-label={`Avanzamento del brano: ${formatSec(stato.posizione / 1000)} di ${formatSec(stato.durata / 1000)}`}
          aria-valuemin={0}
          aria-valuemax={Math.round(stato.durata / 1000)}
          aria-valuenow={Math.round(stato.posizione / 1000)}
        >
          <i style={{ width: `${(100 * stato.posizione) / stato.durata}%` }} />
        </div>
      )}
    </div>
  )
}

// Il colore della copertina, scurito quanto basta perche' il testo bianco si
// legga: la media dei pixel, come fa Spotify sotto al suo player.
function coloreCopertina(src) {
  return new Promise((ok) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      const k = Math.min(1, 60 / Math.max(r, g, b, 1))
      ok(`rgb(${Math.round(r * k)} ${Math.round(g * k)} ${Math.round(b * k)})`)
    }
    img.onerror = () => ok(null)
    img.src = src
  })
}
