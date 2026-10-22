import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { coloriCornice, dove, righeScritta, normalizzaMusica } from '../lib/musica'
import { ascolta, ferma, sblocca, statoLettore, suona, urlAnteprima } from '../lib/anteprima'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// La canzone dell'allenamento come pillola: copertina, titolo · artista. Un
// tocco apre il foglio "Ascolta su": Spotify, Apple Music, YouTube Music
// (lib/musica, `dove`), e chi guarda sceglie la sua app.
// ⚠️ Passa sempre da normalizzaMusica: nel feed il cartellino viene dal
// completamento di un altro.
// ---------------------------------------------------------------------------

export default function ChipMusica({ musica }) {
  const [aperto, setAperto] = useState(false)
  const m = normalizzaMusica(musica)
  if (!m) return null
  const etichetta = m.artista ? `${m.titolo} · ${m.artista}` : m.titolo
  return (
    <>
      <button
        type="button"
        className="chip-musica"
        aria-label={`Ascolta ${etichetta}`}
        aria-haspopup="dialog"
        // Nel feed il post intero si apre al tocco: la pillola no.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          // Il tocco sulla canzone fa partire l'anteprima nel foglio: va
          // "sbloccato" l'audio adesso, dentro il tocco (iPhone).
          sblocca()
          setAperto(true)
        }}
      >
        <Copertina m={m} lato={28} />
        <span className="chip-musica-testo">
          <span aria-hidden="true">♪ </span>
          {etichetta}
        </span>
      </button>
      {aperto && <AscoltaSu m={m} onChiudi={() => setAperto(false)} />}
    </>
  )
}

// La canzone come POLAROID dentro il recap (RecapPost, 2026-10-20): la
// copertina in una cornice chiara un po' storta, titolo e artista scritti
// sotto. Stesso tocco della pillola: "Ascolta su". La card da condividere la
// ridisegna uguale su canvas (lib/recapImmagine, `polaroid`).
export function PolaroidMusica({ musica }) {
  const [aperto, setAperto] = useState(false)
  const m = normalizzaMusica(musica)
  if (!m) return null
  const c = coloriCornice(m)
  const scritta = righeScritta(m)
  return (
    <>
      <button
        type="button"
        className="rp-polaroid"
        style={{
          '--pol-fondo': c.fondo,
          '--pol-testo': c.testo,
          '--pol-sotto': c.sotto,
          ...(c.bordo ? { '--pol-bordo': c.bordo, '--pol-ombra': 'none' } : {}),
        }}
        aria-label={`Ascolta ${m.artista ? `${m.titolo} · ${m.artista}` : m.titolo}`}
        aria-haspopup="dialog"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          // Il tocco sulla canzone fa partire l'anteprima nel foglio: va
          // "sbloccato" l'audio adesso, dentro il tocco (iPhone).
          sblocca()
          setAperto(true)
        }}
      >
        {scritta.length > 0 && (
          <span className="rp-polaroid-mano" aria-hidden="true">
            {scritta.join('\n')}
          </span>
        )}
        <Copertina m={m} lato={74} />
        <span className="rp-polaroid-titolo">{m.titolo}</span>
        {m.artista && <span className="rp-polaroid-artista">{m.artista}</span>}
      </button>
      {aperto && <AscoltaSu m={m} onChiudi={() => setAperto(false)} />}
    </>
  )
}

function Copertina({ m, lato }) {
  return m.copertina ? (
    <img src={m.copertina} alt="" width={lato} height={lato} loading="lazy" decoding="async" />
  ) : (
    <span className="chip-musica-nota" aria-hidden="true">
      ♪
    </span>
  )
}

// Nel body: dentro le card dell'allenamento un `position: fixed` resta chiuso
// nella card. ⚠️ Gli eventi di un portale risalgono comunque l'albero di
// React: senza fermarli, il tocco sul foglio aprirebbe il post del feed.
// `app`: i link già pronti (doveBrano per un brano della playlist,
// components/PlaylistRecap); di base quelli della canzone.
export function AscoltaSu({ m, onChiudi, app }) {
  const vie = app || dove(m)
  const apple = vie.find((d) => d.id === 'apple')
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  return createPortal(
    <div
      className="foglio-backdrop"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChiudi()
      }}
    >
      <div
        className="foglio stack ascolta-su"
        role="dialog"
        aria-label="Ascolta su"
        style={{ gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row ascolta-su-testa">
          <Copertina m={m} lato={56} />
          <div className="ascolta-su-testi">
            <div className="ascolta-su-titolo">{m.titolo}</div>
            {m.artista && <div className="ascolta-su-artista">{m.artista}</div>}
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        {/* L'anteprima col badge ufficiale "Ascolta su Apple Music" subito
            sotto: Apple la vuole accanto al suo badge, con la provenienza
            (lib/anteprima). Il badge e' il loro file, com'e' (public/,
            da toolbox.marketingtools.apple.com): non si ridisegna ne' ricolora. */}
        {/* Senza id di Apple (un brano della playlist che iTunes non ha
            trovato) l'anteprima non c'è. */}
        {m.id && <Anteprima m={m} />}
        {apple && (
          <a
            className="ascolta-su-badge"
            href={apple.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onChiudi}
          >
            <img src="/ascolta-su-apple-music.svg" alt="Ascolta su Apple Music" width="140" height="40" />
          </a>
        )}
        <div className="kicker">{apple ? 'Oppure su' : 'Ascolta su'}</div>
        <div className="stack" style={{ gap: 8 }}>
          {vie
            .filter((d) => d.id !== 'apple')
            .map((d) => (
              <a
                key={d.id}
                className={'btn btn-block ascolta-su-app ' + d.id}
                href={d.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onChiudi}
              >
                {d.nome}
              </a>
            ))}
        </div>
        {apple && (
          <div className="vis-hint">
            Anteprima fornita da iTunes. Spotify e YouTube Music aprono la ricerca della canzone.
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ▶ / ❚❚ con la barra dei 30 secondi. Parte da sola all'apertura del foglio:
// il foglio si apre solo toccando QUELLA canzone, quindi e' chi guarda a
// sceglierla (non e' musica di sottofondo). Se la canzone non ce l'ha resta
// scritto, senza tasto. Chiuso il foglio, si ferma.
function Anteprima({ m }) {
  const [chi] = useState(() => Symbol(m.id))
  const lettore = useSyncExternalStore(ascolta, statoLettore)
  const [manca, setManca] = useState(false)
  const [chiede, setChiede] = useState(false)
  const [errore, setErrore] = useState(false)
  const mio = lettore.chi === chi
  const carica = chiede || (mio && lettore.stato === 'carica')
  const progresso = mio ? lettore.progresso : 0

  useEffect(() => () => ferma(chi), [chi])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura
  useEffect(() => void avvia(), [])

  if (manca) return <div className="ascolta-anteprima vuota">Nessuna anteprima per questa canzone.</div>
  const tocca = () => {
    if (chiede) return
    if (mio) return ferma(chi)
    sblocca()
    avvia()
  }
  async function avvia() {
    setChiede(true)
    setErrore(false)
    try {
      const url = await urlAnteprima(m.id)
      if (!url) return setManca(true)
      await suona(chi, url)
    } catch {
      setErrore(true)
    } finally {
      setChiede(false)
    }
  }
  return (
    <div className="ascolta-anteprima">
      <button
        type="button"
        className={'ascolta-anteprima-tasto' + (carica ? ' carica' : '')}
        aria-label={mio ? 'Ferma l’anteprima' : 'Ascolta l’anteprima di 30 secondi'}
        aria-pressed={mio}
        onClick={tocca}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          {mio ? (
            <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
          ) : (
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          )}
        </svg>
      </button>
      <div className="ascolta-anteprima-testi">
        <span>{errore ? 'Anteprima non raggiungibile, riprova' : 'Anteprima · 30 secondi'}</span>
        <span className="ascolta-anteprima-barra" aria-hidden="true">
          <span style={{ transform: `scaleX(${progresso})` }} />
        </span>
      </div>
    </div>
  )
}
