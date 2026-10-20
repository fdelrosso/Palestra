import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { dove, normalizzaMusica } from '../lib/musica'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// La canzone dell'allenamento come pillola: copertina, titolo · artista. Un
// tocco apre il foglio "Ascolta su": Spotify, Apple Music, YouTube Music
// (lib/musica, `dove`), e chi guarda sceglie la sua app.
// ⚠️ Passa sempre da normalizzaMusica: nel feed il cartellino viene dal
// completamento di un altro.
// `sulPost` = sopra il recap del feed (testo bianco su vetro scuro).
// ---------------------------------------------------------------------------

export default function ChipMusica({ musica, sulPost = false }) {
  const [aperto, setAperto] = useState(false)
  const m = normalizzaMusica(musica)
  if (!m) return null
  const etichetta = m.artista ? `${m.titolo} · ${m.artista}` : m.titolo
  return (
    <>
      <button
        type="button"
        className={'chip-musica' + (sulPost ? ' sul-post' : '')}
        aria-label={`Ascolta ${etichetta}`}
        aria-haspopup="dialog"
        // Nel feed il post intero si apre al tocco: la pillola no.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
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
function AscoltaSu({ m, onChiudi }) {
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
        <div className="kicker">Ascolta su</div>
        <div className="stack" style={{ gap: 8 }}>
          {dove(m).map((d) => (
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
        <div className="vis-hint">Spotify e YouTube Music aprono la ricerca della canzone.</div>
      </div>
    </div>,
    document.body,
  )
}
