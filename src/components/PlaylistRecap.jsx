import { useState } from 'react'
import { TITOLO_PLAYLIST, doveBrano, normalizzaPlaylist } from '../lib/musica'
import { AscoltaSu } from './ChipMusica'

// ---------------------------------------------------------------------------
// La playlist dell'allenamento (lib/ascolti, `Completamento.playlist`) sotto
// la card: le copertine in testa, poi i brani in righe strette che scorrono
// dentro il riquadro, così ce ne stanno tanti. Un tocco su un brano apre
// "Ascolta su", come la canzone dell'allenamento (ChipMusica).
// ⚠️ Passa sempre da normalizzaPlaylist: nel feed viene da un altro.
// ---------------------------------------------------------------------------

export default function PlaylistRecap({ playlist }) {
  const [aperto, setAperto] = useState(null)
  const p = normalizzaPlaylist(playlist)
  if (!p) return null
  const { brani } = p
  const copertine = brani.filter((b) => b.copertina).slice(0, 4)
  return (
    <section className="playlist-recap" aria-label={`Playlist: ${p.titolo || TITOLO_PLAYLIST}`}>
      <div className="playlist-recap-testa">
        <div className={'playlist-recap-mosaico' + (copertine.length === 4 ? ' quattro' : '')} aria-hidden="true">
          {copertine.length === 4 ? (
            copertine.map((b) => <img key={b.titolo + b.artista} src={b.copertina} alt="" loading="lazy" />)
          ) : copertine[0] ? (
            <img src={copertine[0].copertina} alt="" loading="lazy" />
          ) : (
            <span>♪</span>
          )}
        </div>
        <div className="playlist-recap-titoli">
          <span className="playlist-recap-kicker">Playlist</span>
          <span className="playlist-recap-nome">{p.titolo || TITOLO_PLAYLIST}</span>
          <span className="playlist-recap-conto">
            {brani.length} {brani.length === 1 ? 'brano' : 'brani'}
          </span>
        </div>
      </div>
      <ol className="playlist-recap-lista">
        {brani.map((b, i) => (
          <li key={`${i}-${b.titolo}`}>
            <button
              type="button"
              className="playlist-recap-brano"
              aria-haspopup="dialog"
              aria-label={`Ascolta ${b.artista ? `${b.titolo} · ${b.artista}` : b.titolo}`}
              // Nel feed il post intero si apre al tocco: il brano no.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setAperto(b)
              }}
            >
              <span className="playlist-recap-n">{i + 1}</span>
              {b.copertina ? (
                <img src={b.copertina} alt="" width={32} height={32} loading="lazy" decoding="async" />
              ) : (
                <span className="playlist-recap-nota" aria-hidden="true">
                  ♪
                </span>
              )}
              <span className="playlist-recap-testi">
                <span className="playlist-recap-titolo">{b.titolo}</span>
                {b.artista && <span className="playlist-recap-artista">{b.artista}</span>}
              </span>
              {b.volte > 1 && <span className="playlist-recap-volte">×{b.volte}</span>}
            </button>
          </li>
        ))}
      </ol>
      {aperto && <AscoltaSu m={aperto} app={doveBrano(aperto)} onChiudi={() => setAperto(null)} />}
    </section>
  )
}
