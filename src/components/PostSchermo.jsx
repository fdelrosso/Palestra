import { useEffect, useMemo, useRef, useState } from 'react'
import { gruppiAllenati, stileFondo } from '../lib/recap'
import { dividiFoto, fonteFotoAllenamento, fonteFotoLeggera, percorsoFotoAllenamento, urlFeed } from '../lib/fotoAllenamento'
import { NESSUNA } from '../lib/interazioni'
import { normalizzaLayout } from '../lib/recapLayout'
import RecapPost from './RecapPost'
import SegnalaContenuto from './SegnalaContenuto'
import {
  IconAudio,
  IconBandiera,
  IconChevron,
  IconComment,
  IconCuore,
  IconImage,
  IconPlay,
  IconShare,
  IconVideo,
} from './icons'
import { VISIBILITA, visibilitaDi } from '../lib/visibilita'
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
// un'immagine rimpicciolita. Lo SFONDO è quello scelto nel recap da
// condividere (`voce.sfondo`, lib/fotoAllenamento), velato come sulla card:
// TENENDO PREMUTO il recap sparisce e la foto si vede intera. Le foto e i
// video ALLEGATI vengono dopo, TUTTI, sfogliando di LATO; una pillola in alto
// dice quanti sono. ⚠️ Fino alla 53ª la prima foto allegata diventava da sola
// lo sfondo: chi l'aveva allegata non la ritrovava di lato, e la sbirciata
// partiva anche prima che lo sfondo si caricasse. Ora le due cose non si
// mescolano: lo sfondo non è mai di lato, un allegato non è mai lo sfondo.
//
// A destra, come in ogni feed a schermo intero, il cuore e i commenti. In
// FONDO, staccata dal recap come la didascalia di un video verticale, la
// sezione di chi l'ha fatto: nome, il suo commento (due righe, un tocco per
// leggerlo intero) e i media del post. ⚠️ Fino alla 54ª il nome stava in
// alto e il commento era un fumetto dentro il recap: sembrava un dato fra
// gli altri. Il recap qui non lo disegna (`senzaCommento`); nella card
// condivisa resta dove l'ha messo l'utente. Toccare il recap lo apre per
// esteso, toccare un gruppo lo apre già filtrato su quel gruppo.
//
// ⚠️ Il recap è SEMPRE scuro, anche col tema chiaro, come la card: sopra ci
// va testo bianco, e i token del tema si ridefiniscono dentro .post-schermo.
//
// ⚠️ Lo scorrimento (verticale fra i post, orizzontale fra le pagine) è
// `scroll-snap` del browser: niente gestori di gesti scritti a mano, che sono
// la cosa che più facilmente blocca il pollice.
//
// Che di lato c'è dell'altro lo dice la pillola ("2 foto ›", che si può anche
// toccare) e, la prima volta che il post arriva sullo schermo, una SBIRCIATA
// (solo se ci sono allegati: lo sfondo da solo non la fa partire):
// le pagine scivolano un poco a sinistra e tornano, e si vede il bordo della
// foto dopo. È una animazione CSS sulle pagine, non uno scroll: non litiga con
// lo snap né col dito, e toccando si ferma.
// ---------------------------------------------------------------------------

// Una foto (o un video) di un ALTRO si può segnalare dalla bandierina in alto
// a destra: sparisce per chi la segnala (`onSegnalato`, il Feed tiene
// l'elenco) e la guarda un moderatore (lib/segnalazioni).
//
// Un video parte da solo e gira in loop, come su TikTok, quando è la pagina
// che si sta guardando (`attiva`): scorrendo via, di lato o a un altro post,
// si ferma e torna all'inizio. Col sonoro se il browser lo lascia fare; se no
// (vuole un tocco prima del primo audio) parte muto.
// Niente barra dei comandi del browser: un tocco sul video lo ferma, e al
// centro compaiono play e audio, semitrasparenti; un altro tocco riparte.
//
// `disegna` falso (il post è lontano dallo schermo): l'indirizzo resta, ma
// <img> e <video> escono dalla pagina, così il telefono butta via la foto
// decodificata e il decoder del video. ⚠️ Tenerli tutti montati, per OGNI
// post del feed, finiva la memoria grafica: scorrendo, i post con gli
// allegati restavano col solo colore, senza recap.
// `carica` falso: il post è ancora lontano, e la foto non si scarica proprio.
// Una foto si prova prima dalla copia da feed (lib/fotoAllenamento, urlFeed):
// se non c'è, l'<img> fallisce e si passa alla strada di prima. Di un video la
// copia da feed è un fotogramma, che si vede finché il video non arriva.
export function FotoSfogliata({ riga, onSegnala, attiva, disegna = true, carica = true }) {
  const [url, setUrl] = useState(null)
  const video = useRef(null)
  const [fermo, setFermo] = useState(false)
  const [muto, setMuto] = useState(false)
  const [mancante, setMancante] = useState(false)
  const [direttaKo, setDirettaKo] = useState(false)
  const { id, percorso } = riga
  const eVideo = riga.tipo === 'video'
  const diretta = !riga.soloLocale && !direttaKo ? urlFeed(percorso) : null

  useEffect(() => {
    if (!carica || (!eVideo && diretta)) return undefined
    let vivo = true
    let revoca = () => {}
    // Le foto nella copia leggera (fonteFotoLeggera): intere, sull'iPhone,
    // finivano la memoria grafica del feed.
    ;(eVideo ? fonteFotoAllenamento : fonteFotoLeggera)({ id, percorso })
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
  }, [id, percorso, eVideo, carica, diretta])

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (attiva) {
      v.play().catch(() => {
        v.muted = true
        v.play().catch(() => {})
      })
      return
    }
    v.pause()
    v.currentTime = 0
  }, [attiva, url, disegna])

  const playPausa = () => {
    const v = video.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <div className="recap-foto">
      {mancante ? (
        <div className="media-mancante">Foto non disponibile</div>
      ) : !disegna ? null : riga.tipo === 'video' ? (
        url ? (
          <>
            <video
              ref={video}
              src={url}
              poster={diretta || undefined}
              loop
              playsInline
              preload="metadata"
              onClick={playPausa}
              onPlay={() => setFermo(false)}
              onPause={() => setFermo(true)}
              onVolumeChange={(e) => setMuto(e.currentTarget.muted)}
            />
            {attiva && fermo && (
              <div className="video-comandi" onClick={playPausa}>
                <button type="button" className="video-tasto" aria-label="Riproduci">
                  <IconPlay width={52} height={52} />
                </button>
                <button
                  type="button"
                  className="video-tasto audio"
                  aria-label={muto ? "Attiva l'audio" : "Togli l'audio"}
                  onClick={(e) => {
                    e.stopPropagation()
                    video.current.muted = !muto
                  }}
                >
                  <IconAudio spento={muto} width={32} height={32} />
                </button>
              </div>
            )}
          </>
        ) : diretta ? (
          <img src={diretta} alt="" decoding="async" onError={() => setDirettaKo(true)} />
        ) : (
          <div className="media-loading" />
        )
      ) : diretta || url ? (
        <img
          src={diretta || url}
          alt={riga.nome || 'Foto dell’allenamento'}
          decoding="async"
          onError={diretta ? () => setDirettaKo(true) : undefined}
        />
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
  onCondividi,
  ioId = null,
  onSegnalato,
  sfondoNascosto = false,
}) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)
  const [daSegnalare, setDaSegnalare] = useState(null) // la foto da segnalare

  const gruppi = useMemo(() => gruppiAllenati(voce.esercizi), [voce.esercizi])
  const fondo = useMemo(() => stileFondo(gruppi, voce.colori), [gruppi, voce.colori])

  // Lo sfondo scelto nel recap, e gli allegati da sfogliare di lato.
  const { sfondo: primaFoto, allegati } = dividiFoto(voce, foto)
  const idFoto = primaFoto?.id
  const percorsoFoto = primaFoto?.percorso
  const [sfondo, setSfondo] = useState(null)
  // La copia da feed (lib/fotoAllenamento, urlFeed): l'indirizzo si calcola
  // dal post stesso, senza aspettare l'elenco delle foto né un link firmato.
  // Se non c'è, l'<img> fallisce e si passa alla strada di prima (`sfondo`).
  // `sfondoNascosto`: l'ho segnalata io, e per me non c'è più.
  const [direttaKo, setDirettaKo] = useState(false)
  const diretta =
    voce.sfondo && voce.utenteId && !sfondoNascosto && !direttaKo
      ? urlFeed(percorsoFotoAllenamento(voce.utenteId, voce.sfondo))
      : null
  const fonte = diretta || sfondo
  // Lo sfondo si mostra (e si tiene premuto) solo quando è arrivato davvero.
  const [caricata, setCaricata] = useState(null)
  const sfondoPronto = fonte && caricata === fonte ? fonte : null
  // Da scaricare: il post è a due schermate o meno, o lo è stato. ⚠️ Prima
  // OGNI post del feed chiedeva le sue foto appena montato, e quello sullo
  // schermo aspettava il suo turno dietro a tutti gli altri.
  const articolo = useRef(null)
  const [carica, setCarica] = useState(false)
  useEffect(() => {
    const el = articolo.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setCarica(true)
      return undefined
    }
    const oss = new IntersectionObserver(
      ([v]) => {
        if (!v.isIntersecting) return
        setCarica(true)
        oss.disconnect()
      },
      { rootMargin: '200% 0px' },
    )
    oss.observe(el)
    return () => oss.disconnect()
  }, [])
  useEffect(() => {
    if (!idFoto || !carica || diretta) return undefined
    let vivo = true
    let revoca = () => {}
    // La copia leggera: lo sfondo è grande quanto lo schermo (fonteFotoLeggera).
    fonteFotoLeggera({ id: idFoto, percorso: percorsoFoto })
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
  }, [idFoto, percorsoFoto, carica, diretta])

  // Le pagine di lato sono gli allegati, tutti e sempre: non dipendono da
  // quando (o se) lo sfondo finisce di caricarsi.
  const altri = allegati
  const pagine = 1 + altri.length
  const nVideo = altri.filter((f) => f.tipo === 'video').length
  const nFoto = altri.length - nVideo
  const quantiDiLato = [nFoto > 0 && `${nFoto} foto`, nVideo > 0 && `${nVideo} video`].filter(Boolean).join(' · ')

  // La sbirciata: una volta sola per post, quando è quasi tutto sullo schermo.
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
  // Sullo schermo adesso: un post scorso via ferma i suoi video, e torna
  // alla prima pagina, il recap: tornandoci sopra si riparte da lì.
  const [inVista, setInVista] = useState(false)
  useEffect(() => {
    if (!inVista && pista.current) pista.current.scrollLeft = 0
  }, [inVista])
  useEffect(() => {
    const el = articolo.current
    if (!ciSonoAltri || !el || typeof IntersectionObserver === 'undefined') return undefined
    const oss = new IntersectionObserver(([v]) => setInVista(v.isIntersecting), { threshold: 0.6 })
    oss.observe(el)
    return () => oss.disconnect()
  }, [ciSonoAltri])
  // Vicino allo schermo (lo schermo sopra e quello sotto compresi): solo
  // questi animano lo sfondo coi colori. ⚠️ Prima giravano TUTTI i post del
  // feed, ognuno con uno strato animato più grande della pagina: sul telefono
  // la memoria della scheda grafica finiva e, scorrendo, alcuni post
  // restavano col solo colore, senza foto e senza recap. Per lo stesso motivo
  // solo questi disegnano le foto e i video (sfondo e allegati): le foto
  // decodificate di tutto il feed bastavano da sole a finirla.
  const [vicino, setVicino] = useState(true)
  useEffect(() => {
    const el = articolo.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const oss = new IntersectionObserver(([v]) => setVicino(v.isIntersecting), { rootMargin: '100% 0px' })
    oss.observe(el)
    return () => oss.disconnect()
  }, [])
  const vaiAiMedia = () => pista.current?.scrollTo({ left: pista.current.clientWidth, behavior: 'smooth' })

  // Tenere premuto sul recap toglie il recap e lascia la foto: si guarda
  // finché si tiene il dito giù. ⚠️ Se il dito si muove PRIMA che la foto
  // compaia è uno scorrimento (il browser manda pointercancel) e non succede
  // niente; DOPO, la foto resta anche se il dito scivola: lo scorrimento si
  // blocca (touchmove qui sotto) finché non lo si alza. Il tocco che ha
  // svelato la foto non apre il recap quando si alza il dito.
  const [svelata, setSvelata] = useState(false)
  const timer = useRef(null)
  const appenaSvelata = useRef(false)
  const cartolina = useRef(null)
  const svelataRef = useRef(false)
  useEffect(() => {
    svelataRef.current = svelata
  }, [svelata])
  // ⚠️ Un ascoltatore vero, non `onTouchMove` di React: quelli sono passivi e
  // `preventDefault` lì non ferma lo scorrimento.
  useEffect(() => {
    const el = cartolina.current
    if (!el || !sfondoPronto) return undefined
    const muovi = (e) => {
      if (svelataRef.current && e.cancelable) e.preventDefault()
    }
    const fine = () => {
      clearTimeout(timer.current)
      setSvelata(false)
    }
    el.addEventListener('touchmove', muovi, { passive: false })
    el.addEventListener('touchend', fine)
    el.addEventListener('touchcancel', fine)
    return () => {
      el.removeEventListener('touchmove', muovi)
      el.removeEventListener('touchend', fine)
      el.removeEventListener('touchcancel', fine)
    }
  }, [sfondoPronto])
  const giu = () => {
    if (!sfondoPronto) return
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
  // Annullato dal browser: se la foto è già fuori resta (la chiude il
  // touchend), se no era uno scorrimento e si lascia perdere.
  const annullato = () => {
    if (!svelataRef.current) su()
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  const sfondoSegnalabile = sfondoPronto && onSegnalato && ioId && primaFoto?.user_id && primaFoto.user_id !== ioId
  const { miPiace, mio, commenti } = interazioni || NESSUNA
  // Il commento, se c'è e se nel layout del recap non è spento.
  const commento = normalizzaLayout(voce.recap).nascosti.includes('commento') ? '' : String(voce.nota || '').trim()
  const [commentoAperto, setCommentoAperto] = useState(false)

  const onScroll = () => {
    const el = pista.current
    if (!el || el.clientWidth === 0) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((p) => (p === n ? p : n))
  }

  return (
    <article ref={articolo} className={'post-schermo' + (vicino ? ' vicino' : '')} style={{ '--tinta': gruppi[0]?.colore || 'var(--accent)' }}>
      <div
        className={'post-pista' + (sbircia ? ' sbircia' : '')}
        ref={pista}
        onScroll={onScroll}
        onPointerDown={() => setSbircia(false)}
        onAnimationEnd={(e) => e.target.classList.contains('post-pagina') && setSbircia(false)}
      >
        <section
          ref={cartolina}
          className={'post-pagina post-cartolina' + (svelata ? ' svelata' : '')}
          onClick={() => {
            if (appenaSvelata.current) appenaSvelata.current = false
            else onApri?.(voce)
          }}
          onPointerDown={giu}
          onPointerUp={su}
          onPointerCancel={annullato}
          onPointerLeave={(e) => e.pointerType === 'mouse' && su()}
          onContextMenu={sfondoPronto ? (e) => e.preventDefault() : undefined}
        >
          {fondo && <div className="post-fondo" style={fondo} aria-hidden="true" />}
          {fonte && vicino && (
            <img
              className={'post-sfondo' + (sfondoPronto ? '' : ' in-arrivo')}
              src={fonte}
              alt="Foto dell’allenamento"
              draggable={false}
              decoding="async"
              onLoad={() => setCaricata(fonte)}
              onError={diretta ? () => setDirettaKo(true) : undefined}
            />
          )}
          {/* La foto c'è ma non è ancora arrivata: che si veda, se no il post
              sembra senza. */}
          {(diretta || primaFoto) && !sfondoPronto && vicino && (
            <div className="post-sfondo-attesa" aria-hidden="true" />
          )}
          <div className="post-contenuto">
            <RecapPost voce={voce} senzaCommento onGruppo={(id) => onApri?.(voce, [id])} />
            <footer className="post-chi">
              <div className="post-chi-riga">
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
                  <span className="post-chi-nome">{voce.utenteNome}</span>
                </button>
                <span className="post-chi-linea" aria-hidden="true" />
              </div>
              {commento && (
                <button
                  type="button"
                  className={'post-commento' + (commentoAperto ? ' aperto' : '')}
                  aria-expanded={commentoAperto}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCommentoAperto((v) => !v)
                  }}
                >
                  {commento}
                </button>
              )}
              {/* Che ci sono dei media si deve vedere subito: la foto da tenere
                  premuta e quanti altri ce ne sono di lato. */}
              {(diretta || primaFoto || altri.length > 0) && (
                <div className="post-media" aria-hidden={svelata}>
                  {sfondoPronto ? (
                    <span className="post-media-pillola">
                      <IconImage width={15} height={15} /> Tieni premuto
                    </span>
                  ) : (
                    (diretta || primaFoto) && (
                      <span className="post-media-pillola post-media-attesa">
                        <IconImage width={15} height={15} /> Foto in arrivo…
                      </span>
                    )
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
            </footer>
          </div>
        </section>

        {altri.map((f, i) => (
          <section className="post-pagina post-pagina-foto" key={f.id}>
            <FotoSfogliata
              riga={f}
              attiva={inVista && pagina === i + 1}
              disegna={vicino}
              carica={carica}
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

      {pagine > 1 && (
        <span className="post-pallini" aria-hidden="true">
          {Array.from({ length: pagine }, (_, i) => (
            <span key={i} className={'post-pallino' + (i === pagina ? ' on' : '')} />
          ))}
        </span>
      )}

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
        {/* Condividere, dentro e fuori dall'app (components/CondividiPost):
            solo i PUBBLICI. Uno "solo al PT" l'atleta l'ha dato al PT e basta. */}
        {onCondividi && visibilitaDi(voce) === VISIBILITA.PUBBLICA && (
          <button
            type="button"
            className="post-rail-tasto"
            onClick={() => onCondividi(voce)}
            aria-label="Condividi"
          >
            <IconShare width={24} height={24} />
          </button>
        )}
      </aside>
    </article>
  )
}
