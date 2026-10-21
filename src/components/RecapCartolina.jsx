import { useEffect, useRef, useState } from 'react'
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

export default function RecapCartolina({ voce, foto = [], badge, onApri }) {
  const { sfondo: primaFoto, allegati } = dividiFoto(voce, foto)
  const idFoto = primaFoto?.id
  const percorsoFoto = primaFoto?.percorso
  const [sfondo, setSfondo] = useState(null)
  // Uno sfondo VIDEO (78ª) qui resta fermo, su un fotogramma: in una lista
  // che si scorre, video che partono da soli sarebbero troppi.
  const sfondoVideo = eSfondoVideo(primaFoto)
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
          {idFoto &&
            sfondo &&
            (sfondoVideo ? (
              <video className="post-sfondo" src={`${sfondo}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
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
