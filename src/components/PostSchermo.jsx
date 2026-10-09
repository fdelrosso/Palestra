import { useEffect, useMemo, useRef, useState } from 'react'
import { quandoBreve } from '../lib/format'
import { gruppiAllenati } from '../lib/recap'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import { NESSUNA } from '../lib/interazioni'
import RecapPost from './RecapPost'
import SegnalaContenuto from './SegnalaContenuto'
import { IconBandiera, IconChevron, IconComment, IconCuore, IconImage, IconVideo } from './icons'
import Avatar from './Avatar'
import { navigate, routes } from '../lib/router'

// ---------------------------------------------------------------------------
// Un allenamento nel feed di Social: UNO PER SCHERMATA, si scorre in
// verticale come le storie. Fino alla 39ª era una lista di card
// (components/SchedaRecap): utile, ma un allenamento valeva quanto una riga.
//
// La prima pagina è IL RECAP dell'allenamento, nel formato della card che si
// condivide (components/RecapPost): stessi blocchi e stesso ordine scelti da
// chi si è allenato, ma a tutto schermo e fatto di elementi veri, non
// un'immagine rimpicciolita. Se all'allenamento è attaccata una foto, la
// prima fa da sfondo, velata: TENENDO PREMUTO il recap sparisce e la foto si
// vede intera. Gli altri media vengono dopo, sfogliando di LATO (la foto di
// sfondo lì non c'è più). Una pillola in alto dice che ci sono.
//
// A destra, come in ogni feed a schermo intero, il cuore e i commenti; in
// basso chi e quando. Toccare il recap lo apre per esteso, toccare un gruppo
// lo apre già filtrato su quel gruppo.
//
// ⚠️ Il recap è SEMPRE scuro, anche col tema chiaro, come la card: sopra ci
// va testo bianco, e i token del tema si ridefiniscono dentro .post-schermo.
//
// ⚠️ Lo scorrimento (verticale fra i post, orizzontale fra le pagine) è
// `scroll-snap` del browser: niente gestori di gesti scritti a mano, che sono
// la cosa che più facilmente blocca il pollice.
//
// Che di lato c'è dell'altro lo dice la pillola ("2 foto ›", che si può anche
// toccare) e, la prima volta che il post arriva sullo schermo, una SBIRCIATA:
// le pagine scivolano un poco a sinistra e tornano, e si vede il bordo della
// foto dopo. È una animazione CSS sulle pagine, non uno scroll: non litiga con
// lo snap né col dito, e toccando si ferma.
// ---------------------------------------------------------------------------

// Una foto (o un video) di un ALTRO si può segnalare dalla bandierina in alto
// a destra: sparisce per chi la segnala (`onSegnalato`, il Feed tiene
// l'elenco) e la guarda un moderatore (lib/segnalazioni).
function FotoSfogliata({ riga, onSegnala }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)
  const { id, percorso } = riga

  useEffect(() => {
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id, percorso })
      .then((f) => {
        if (!vivo) {
          f.revoca()
          return
        }
        revoca = f.revoca
        if (!f.url) setMancante(true)
        else setUrl(f.url)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      revoca()
    }
  }, [id, percorso])

  return (
    <div className="recap-foto">
      {mancante ? (
        <div className="media-mancante">Foto non disponibile</div>
      ) : riga.tipo === 'video' ? (
        url ? <video src={url} controls playsInline /> : <div className="media-loading" />
      ) : url ? (
        <img src={url} alt={riga.nome || 'Foto dell’allenamento'} />
      ) : (
        <div className="media-loading" />
      )}
      {riga.soloLocale && (
        <span className="media-locale">Solo su questo dispositivo</span>
      )}
      {onSegnala && (
        <button
          type="button"
          className="recap-foto-segnala"
          aria-label={riga.tipo === 'video' ? 'Segnala questo video' : 'Segnala questa foto'}
          onClick={(e) => {
            e.stopPropagation()
            onSegnala(riga)
          }}
        >
          <IconBandiera width={16} height={16} />
        </button>
      )}
    </div>
  )
}

export default function PostSchermo({
  voce,
  foto = [],
  interazioni = NESSUNA,
  onApri,
  onMiPiace,
  onApriMiPiace,
  onApriCommenti,
  ioId = null,
  onSegnalato,
}) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)
  const [daSegnalare, setDaSegnalare] = useState(null) // la foto da segnalare

  const gruppi = useMemo(() => gruppiAllenati(voce.esercizi), [voce.esercizi])

  // Lo sfondo: la prima FOTO dell'allenamento (i video no), se c'è, velata.
  const primaFoto = foto.find((f) => f.tipo !== 'video')
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

  // Le pagine di lato sono gli ALTRI media: la foto di sfondo si vede già
  // tenendo premuto sul recap, ripeterla dopo sarebbe un doppione.
  const altri = sfondo ? foto.filter((f) => f.id !== idFoto) : foto
  const pagine = 1 + altri.length
  const nVideo = altri.filter((f) => f.tipo === 'video').length
  const nFoto = altri.length - nVideo
  const quantiDiLato = [nFoto > 0 && `${nFoto} foto`, nVideo > 0 && `${nVideo} video`].filter(Boolean).join(' · ')

  // La sbirciata: una volta sola per post, quando è quasi tutto sullo schermo.
  const articolo = useRef(null)
  const sbirciato = useRef(false)
  const [sbircia, setSbircia] = useState(false)
  const ciSonoAltri = altri.length > 0
  useEffect(() => {
    const el = articolo.current
    if (!ciSonoAltri || sbirciato.current || !el || typeof IntersectionObserver === 'undefined') return undefined
    const oss = new IntersectionObserver(
      ([v]) => {
        if (!v.isIntersecting || sbirciato.current) return
        sbirciato.current = true
        // Già sfogliato a mano: non serve più.
        if (pista.current?.scrollLeft === 0) setSbircia(true)
        oss.disconnect()
      },
      { threshold: 0.6 },
    )
    oss.observe(el)
    return () => oss.disconnect()
  }, [ciSonoAltri])
  const vaiAiMedia = () => pista.current?.scrollTo({ left: pista.current.clientWidth, behavior: 'smooth' })

  // Tenere premuto sul recap toglie il recap e lascia la foto: si guarda
  // finché si tiene il dito giù. ⚠️ Se il dito si muove è uno scorrimento
  // (il browser manda pointercancel) e non succede niente; e il tocco che ha
  // svelato la foto non apre il recap quando si alza il dito.
  const [svelata, setSvelata] = useState(false)
  const timer = useRef(null)
  const appenaSvelata = useRef(false)
  const giu = () => {
    if (!sfondo) return
    appenaSvelata.current = false
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      appenaSvelata.current = true
      setSvelata(true)
    }, 220)
  }
  const su = () => {
    clearTimeout(timer.current)
    setSvelata(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const sfondoSegnalabile = sfondo && onSegnalato && ioId && primaFoto?.user_id && primaFoto.user_id !== ioId
  const { miPiace, mio, commenti } = interazioni || NESSUNA

  const onScroll = () => {
    const el = pista.current
    if (!el || el.clientWidth === 0) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((p) => (p === n ? p : n))
  }

  return (
    <article ref={articolo} className="post-schermo" style={{ '--tinta': gruppi[0]?.colore || 'var(--accent)' }}>
      <div
        className={'post-pista' + (sbircia ? ' sbircia' : '')}
        ref={pista}
        onScroll={onScroll}
        onPointerDown={() => setSbircia(false)}
        onAnimationEnd={(e) => e.target.classList.contains('post-pagina') && setSbircia(false)}
      >
        <section
          className={'post-pagina post-cartolina' + (svelata ? ' svelata' : '')}
          onClick={() => {
            if (appenaSvelata.current) appenaSvelata.current = false
            else onApri?.(voce)
          }}
          onPointerDown={giu}
          onPointerUp={su}
          onPointerCancel={su}
          onPointerLeave={su}
          onContextMenu={sfondo ? (e) => e.preventDefault() : undefined}
        >
          {sfondo && <img className="post-sfondo" src={sfondo} alt="Foto dell’allenamento" draggable={false} />}
          {/* Che ci sono dei media si deve vedere subito: la foto da tenere
              premuta e quanti altri ce ne sono di lato. */}
          {(sfondo || altri.length > 0) && (
            <div className="post-media" aria-hidden={svelata}>
              {sfondo && (
                <span className="post-media-pillola">
                  <IconImage width={15} height={15} /> Tieni premuto
                </span>
              )}
              {altri.length > 0 && (
                <button
                  type="button"
                  className="post-media-pillola post-media-lato"
                  aria-label={`Scorri a destra: ${quantiDiLato}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    vaiAiMedia()
                  }}
                >
                  {nVideo > 0 ? <IconVideo width={15} height={15} /> : <IconImage width={15} height={15} />}
                  {quantiDiLato}
                  <IconChevron className="post-media-freccia" width={14} height={14} />
                </button>
              )}
              {sfondoSegnalabile && (
                <button
                  type="button"
                  className="post-media-pillola post-media-segnala"
                  aria-label="Segnala questa foto"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDaSegnalare(primaFoto)
                  }}
                >
                  <IconBandiera width={14} height={14} />
                </button>
              )}
            </div>
          )}
          <div className="post-contenuto">
            <RecapPost voce={voce} onGruppo={(id) => onApri?.(voce, [id])} />
          </div>
        </section>

        {altri.map((f) => (
          <section className="post-pagina post-pagina-foto" key={f.id}>
            <FotoSfogliata
              riga={f}
              onSegnala={onSegnalato && ioId && f.user_id && f.user_id !== ioId ? setDaSegnalare : null}
            />
          </section>
        ))}
      </div>

      {daSegnalare && (
        <SegnalaContenuto
          tipo="foto"
          oggetto={daSegnalare.id}
          ioId={ioId}
          cosa={daSegnalare.tipo === 'video' ? 'questo video' : 'questa foto'}
          onChiudi={() => setDaSegnalare(null)}
          onFatto={() => {
            onSegnalato?.('foto', daSegnalare.id)
            setDaSegnalare(null)
          }}
        />
      )}

      <footer className="post-chi">
        <button
          type="button"
          className="apri-utente"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            navigate(routes.utente(voce.utenteId))
          }}
        >
          <Avatar id={voce.utenteId} nome={voce.utenteNome} />
          <span style={{ minWidth: 0 }}>
            <span className="post-chi-nome">{voce.utenteNome}</span>
            <span className="post-chi-quando">{quandoBreve(voce.data)}</span>
          </span>
        </button>
        {pagine > 1 && (
          <span className="post-pallini" aria-hidden="true">
            {Array.from({ length: pagine }, (_, i) => (
              <span key={i} className={'post-pallino' + (i === pagina ? ' on' : '')} />
            ))}
          </span>
        )}
      </footer>

      <aside className="post-rail">
        <button
          type="button"
          className={'post-rail-tasto' + (mio ? ' acceso' : '')}
          onClick={() => onMiPiace?.(voce)}
          aria-pressed={mio}
          aria-label={mio ? 'Togli il mi piace' : 'Mi piace'}
        >
          <IconCuore pieno={mio} width={26} height={26} />
        </button>
        <button
          type="button"
          className="post-rail-conto"
          onClick={() => miPiace > 0 && onApriMiPiace?.(voce)}
          aria-label={`${miPiace} mi piace: vedi chi`}
        >
          {miPiace}
        </button>
        <button
          type="button"
          className="post-rail-tasto"
          onClick={() => onApriCommenti?.(voce)}
          aria-label={`Commenti: ${commenti}`}
        >
          <IconComment width={25} height={25} />
        </button>
        <span className="post-rail-conto" aria-hidden="true">{commenti}</span>
      </aside>
    </article>
  )
}
