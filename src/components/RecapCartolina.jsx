import { useEffect, useRef, useState } from 'react'
import { sfondoPuoMuoversi } from '../lib/media'
import { dividiFoto, eSfondoVideo, fonteFotoAllenamento, fonteFotoLeggera } from '../lib/fotoAllenamento'
import { gruppiAllenati, stileFondo } from '../lib/recap'
import { normalizzaLayout } from '../lib/recapLayout'
import Avatar from './Avatar'
import RecapPost from './RecapPost'
import { FotoSfogliata } from './PostSchermo'
import { IconChevron } from './icons'

// ---------------------------------------------------------------------------
// Un allenamento nella lista dello Storico ("I miei") e nel profilo di una
// persona, col recap del feed di Social (components/RecapPost): stessi
// blocchi, stesso ordine, stessa foto di sfondo velata (quella scelta nel
// recap, `dividiFoto`). Non è a tutto schermo: è una card alta quasi quanto
// il recap nel feed, e toccarla apre il recap per esteso.
//
// Le foto e i video ALLEGATI si sfogliano di lato, come nel feed: la prima
// pagina è il recap, le altre (FotoSfogliata di PostSchermo) gli allegati.
// La pillola "2 foto ›" in basso dice che ci sono, e toccata ci porta.
//
// ⚠️ Come il post del feed è SEMPRE scura, anche col tema chiaro.
// ---------------------------------------------------------------------------

// Gli sfondi VIDEO delle cartoline: se ne muove UNO alla volta, quello più in
// vista, e solo se è quasi tutto sullo schermo (70%). In una lista se ne
// vedono due o tre insieme, e tanti video aperti sono il problema di memoria
// già visto con le foto intere. Ogni cartolina con uno sfondo video si
// iscrive qui con quanto si vede; a ogni cambio si rifà la scelta.
const SOGLIA_VISTA = 0.7
const inLista = new Map() // elemento -> { quanto, setAttiva }
function scegliChiSiMuove() {
  let meglio = null
  for (const [el, v] of inLista) if (v.quanto >= SOGLIA_VISTA && (!meglio || v.quanto > inLista.get(meglio).quanto)) meglio = el
  for (const [el, v] of inLista) v.setAttiva(el === meglio)
}

function useSiMuove(ref, abilitato) {
  const [attiva, setAttiva] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!abilitato || !el || typeof IntersectionObserver === 'undefined') return undefined
    inLista.set(el, { quanto: 0, setAttiva })
    const oss = new IntersectionObserver(
      ([v]) => {
        const voce = inLista.get(el)
        if (!voce) return
        // Rispetto alla cartolina o allo schermo, il più piccolo: una
        // cartolina più alta dello schermo (telefono basso, in orizzontale)
        // non arriverebbe mai al 70% di sé.
        const alta = Math.min(v.boundingClientRect.height, v.rootBounds?.height || Infinity)
        voce.quanto = v.isIntersecting && alta > 0 ? v.intersectionRect.height / alta : 0
        scegliChiSiMuove()
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    )
    oss.observe(el)
    return () => {
      oss.disconnect()
      inLista.delete(el)
      setAttiva(false)
      scegliChiSiMuove()
    }
  }, [ref, abilitato])
  return attiva
}

export default function RecapCartolina({ voce, foto = [], badge, onApri }) {
  const { sfondo: primaFoto, allegati } = dividiFoto(voce, foto)
  const idFoto = primaFoto?.id
  const percorsoFoto = primaFoto?.percorso
  const [sfondo, setSfondo] = useState(null)
  // Uno sfondo VIDEO (78ª): fermo sul fotogramma, e si muove solo la
  // cartolina più in vista (useSiMuove, qui sopra).
  const sfondoVideo = eSfondoVideo(primaFoto)
  const radice = useRef(null)
  const siMuove = useSiMuove(radice, sfondoVideo && sfondoPuoMuoversi())
  const video = useRef(null)
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (siMuove) v.play().catch(() => {})
    else {
      v.pause()
      v.currentTime = 0.1
    }
  }, [siMuove, sfondo])
  useEffect(() => {
    if (!idFoto) return undefined
    let vivo = true
    let revoca = () => {}
    // La copia leggera, come nel feed (lib/fotoAllenamento fonteFotoLeggera).
    ;(sfondoVideo ? fonteFotoAllenamento : fonteFotoLeggera)({ id: idFoto, percorso: percorsoFoto })
      .then((f) => {
        if (!vivo) return f.revoca()
        revoca = f.revoca
        if (f.url) setSfondo(f.url)
      })
      .catch(() => {})
    return () => {
      vivo = false
      revoca()
    }
  }, [idFoto, percorsoFoto, sfondoVideo])

  const fondo = stileFondo(gruppiAllenati(voce.esercizi), voce.colori)
  // Il commento non è un fumetto dentro il recap: sta in fondo, sotto chi
  // l'ha fatto, come la descrizione del post in Social (PostSchermo).
  const commento = normalizzaLayout(voce.recap).nascosti.includes('commento') ? '' : String(voce.nota || '').trim()

  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)
  const onScroll = () => {
    const el = pista.current
    if (!el || el.clientWidth === 0) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((p) => (p === n ? p : n))
  }
  const vaiAiMedia = (e) => {
    e.stopPropagation()
    pista.current?.scrollTo({ left: pista.current.clientWidth, behavior: 'smooth' })
  }

  const nVideo = allegati.filter((f) => f.tipo === 'video').length
  const nFoto = allegati.length - nVideo
  const quanti = [nFoto > 0 && `${nFoto} foto`, nVideo > 0 && `${nVideo} video`].filter(Boolean).join(' · ')

  return (
    <div className="recap-cartolina" ref={radice}>
      <div className="post-pista" ref={pista} onScroll={onScroll}>
        {/* Un div e non un <button>: dentro ci sono le pillole dei gruppi,
            che sono già bottoni. */}
        <div
          className="post-pagina recap-cartolina-pagina"
          role="button"
          tabIndex={0}
          onClick={onApri}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onApri())}
        >
          {fondo && <div className="post-fondo" style={fondo} aria-hidden="true" />}
          {idFoto &&
            sfondo &&
            (sfondoVideo ? (
              <video
                ref={video}
                className="post-sfondo"
                src={`${sfondo}#t=0.1`}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            ) : (
              <img className="post-sfondo" src={sfondo} alt="" draggable={false} />
            ))}
          {badge && <div className="recap-cartolina-badge">{badge}</div>}
          <div className="recap-cartolina-contenuto">
            <RecapPost voce={voce} senzaCommento onGruppo={onApri} />
            {(voce.utenteNome || commento) && (
              <footer className="post-chi">
                {voce.utenteNome && (
                  <div className="post-chi-riga">
                    <span className="apri-utente">
                      <Avatar id={voce.utenteId} nome={voce.utenteNome} />
                      <span className="post-chi-nome">{voce.utenteNome}</span>
                    </span>
                    <span className="post-chi-linea" aria-hidden="true" />
                  </div>
                )}
                {commento && <p className="post-commento">{commento}</p>}
              </footer>
            )}
          </div>
          {allegati.length > 0 && (
            <button
              type="button"
              className="post-media-pillola recap-cartolina-media"
              aria-label={`Scorri a destra: ${quanti}`}
              onClick={vaiAiMedia}
            >
              {quanti}
              <IconChevron className="post-media-freccia" width={14} height={14} />
            </button>
          )}
        </div>
        {allegati.map((f, i) => (
          <section className="post-pagina recap-cartolina-foto" key={f.id}>
            <FotoSfogliata riga={f} attiva={pagina === i + 1} />
          </section>
        ))}
      </div>
    </div>
  )
}
