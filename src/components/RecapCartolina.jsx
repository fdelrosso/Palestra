import { useEffect, useRef, useState } from 'react'
import { dividiFoto, fonteFotoAllenamento } from '../lib/fotoAllenamento'
import { gruppiAllenati, stileFondo } from '../lib/recap'
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

export default function RecapCartolina({ voce, foto = [], badge, onApri }) {
  const { sfondo: primaFoto, allegati } = dividiFoto(voce, foto)
  const idFoto = primaFoto?.id
  const percorsoFoto = primaFoto?.percorso
  const [sfondo, setSfondo] = useState(null)
  useEffect(() => {
    if (!idFoto) return undefined
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id: idFoto, percorso: percorsoFoto })
      .then((f) => {
        revoca = f.revoca
        if (vivo && f.url) setSfondo(f.url)
      })
      .catch(() => {})
    return () => {
      vivo = false
      revoca()
    }
  }, [idFoto, percorsoFoto])

  const fondo = stileFondo(gruppiAllenati(voce.esercizi))

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
    <div className="recap-cartolina">
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
          {idFoto && sfondo && <img className="post-sfondo" src={sfondo} alt="" draggable={false} />}
          {badge && <div className="recap-cartolina-badge">{badge}</div>}
          <div className="recap-cartolina-contenuto">
            <RecapPost voce={voce} onGruppo={onApri} />
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
