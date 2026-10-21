import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FotoSfogliata } from './PostSchermo'
import { IconClose, IconPlay } from './icons'
import RecapCondivisibile from './RecapCondivisibile'
import RiepilogoDettaglio from './RiepilogoDettaglio'
import { dividiFoto } from '../lib/fotoAllenamento'

// ---------------------------------------------------------------------------
// Sotto la card di un allenamento: le foto e i video allegati in una fila da
// scorrere di lato, e il visore a tutto schermo che si apre toccando la card
// o un allegato (2026-10-21). Lo usano il riepilogo dei propri
// (components/Riepilogo) e quello degli altri (VistaRecap, qui sotto).
// ---------------------------------------------------------------------------

/**
 * @param {{allegati: object[], onApri: (i: number) => void}} props
 *   `allegati`: le righe di lib/fotoAllenamento, senza lo sfondo (dividiFoto).
 */
export function StrisciaAllegati({ allegati, onApri }) {
  if (!allegati.length) return null
  return (
    <div className="allegati-striscia">
      {allegati.map((f, i) => (
        <div key={f.id} className="allegati-uno">
          <FotoSfogliata riga={f} />
          {/* Il tocco apre a tutto schermo: sopra la miniatura, così un video
              non parte qui dentro. */}
          <button
            type="button"
            className="allegati-apri"
            aria-label={f.tipo === 'video' ? 'Guarda il video a tutto schermo' : 'Apri la foto a tutto schermo'}
            onClick={() => onApri(i)}
          >
            {f.tipo === 'video' && <IconPlay width={30} height={30} />}
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * La card e gli allegati a tutto schermo, sul nero: si sfogliano di lato come
 * nel feed, e un video parte da solo quando è quello che si guarda
 * (FotoSfogliata). Si chiude con la X o con Esc.
 * @param {{urlCard?: string|null, videoCard?: {video: string, sopra: string}|null, altCard?: string, allegati: object[], inizio: number, onChiudi: () => void}} props
 *   `videoCard`: lo sfondo video della card (RecapCondivisibile, `onVideoCard`):
 *   gira sotto la card senza sfondo, come nell'anteprima. Sennò l'immagine ferma.
 *   `altCard`: cosa c'è nell'immagine di `urlCard` (la usa anche la foto profilo, pages/UtentePage).
 *   `inizio`: 0 = la card (se c'è), poi gli allegati.
 */
export default function MediaIntero({ urlCard = null, videoCard = null, altCard = 'Recap dell’allenamento', allegati, inizio, onChiudi }) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(inizio)
  const pagine = [...(urlCard ? [{ id: 'card', url: urlCard }] : []), ...allegati]
  useEffect(() => {
    const el = pista.current
    if (el) el.scrollLeft = inizio * el.clientWidth
  }, [inizio])
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])
  return createPortal(
    <div className="media-intero" role="dialog" aria-label="Recap, foto e video">
      <div
        className="media-intero-pista"
        ref={pista}
        onScroll={(e) => setPagina(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {pagine.map((p, i) => (
          <section key={p.id} className="media-intero-pagina">
            {p.id === 'card' && videoCard ? (
              <div className="recap-foto">
                <div className="media-intero-tela">
                  <video src={videoCard.video} muted loop playsInline autoPlay aria-hidden="true" />
                  <img src={videoCard.sopra} alt={altCard} />
                </div>
              </div>
            ) : p.url ? (
              <div className="recap-foto">
                <img src={p.url} alt={altCard} />
              </div>
            ) : (
              <FotoSfogliata riga={p} attiva={i === pagina} />
            )}
          </section>
        ))}
      </div>
      {pagine.length > 1 && (
        <div className="media-intero-conta">
          {pagina + 1} / {pagine.length}
        </div>
      )}
      <button type="button" className="media-intero-chiudi" aria-label="Chiudi" onClick={onChiudi}>
        <IconClose width={22} height={22} />
      </button>
    </div>,
    document.body,
  )
}

/**
 * Un allenamento da GUARDARE (di un altro, o il proprio dove non si cambia):
 * Card o Dettaglio, come il riepilogo dei propri. Si apre sulla card, con
 * sotto gli allegati; card e allegati si toccano per il tutto schermo. Lo
 * usano il feed (pages/FeedPage) e i profili (components/ListaAllenamenti).
 * @param {{voce: object, foto?: object[], gruppiIniziali?: string[]}} props
 *   `foto`: le righe di quell'allenamento (lib/fotoAllenamento), sfondo
 *   compreso. `gruppiIniziali`: aperto toccando un gruppo nel feed, e allora
 *   si parte dal dettaglio, con quel gruppo scelto.
 */
export function VistaRecap({ voce, foto = [], gruppiIniziali = [] }) {
  const [vista, setVista] = useState(gruppiIniziali.length ? 'dettaglio' : 'card')
  const [intero, setIntero] = useState(null) // 0 = la card, poi gli allegati
  const [urlCard, setUrlCard] = useState(null)
  const [videoCard, setVideoCard] = useState(null)
  const { allegati } = dividiFoto(voce, foto)

  // Segnato a mano: niente serie, niente card.
  if (!voce.dettagliato) {
    return (
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{voce.nomeGiorno}</div>
          {voce.settimana != null && <span className="badge">Settimana {voce.settimana}</span>}
        </div>
        <p className="muted" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.4 }}>
          Segnato come completato manualmente, nessun dettaglio delle serie registrato.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="segmented segmented-sm vista-recap-scelta" role="group" aria-label="Vista">
        {[
          ['card', 'Card'],
          ['dettaglio', 'Dettaglio'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={'seg-btn' + (vista === v ? ' on' : '')}
            onClick={() => setVista(v)}
            aria-pressed={vista === v}
          >
            {label}
          </button>
        ))}
      </div>
      {vista === 'card' ? (
        <RecapCondivisibile
          riep={voce}
          utente={voce.utenteNome}
          commento={voce.nota || ''}
          sfondoId={voce.sfondo || null}
          utenteId={voce.utenteId}
          solaLettura
          onUrlCard={setUrlCard}
          onVideoCard={setVideoCard}
          onApriCard={() => setIntero(0)}
          sottoCard={<StrisciaAllegati allegati={allegati} onApri={(i) => setIntero(urlCard ? i + 1 : i)} />}
        />
      ) : (
        <RiepilogoDettaglio riep={voce} gruppiIniziali={gruppiIniziali} />
      )}
      {intero != null && (
        <MediaIntero
          urlCard={urlCard}
          videoCard={videoCard}
          allegati={allegati}
          inizio={intero}
          onChiudi={() => setIntero(null)}
        />
      )}
    </>
  )
}
