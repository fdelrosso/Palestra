// ---------------------------------------------------------------------------
// Il foglio della playlist nel riepilogo (lib/ascolti): i brani ascoltati, da
// tenere o togliere con un tocco. È una BOZZA come il resto del riepilogo: la
// scelta si salva col "Salva" (`Completamento.playlist`).
//   `brani`: quelli fra cui scegliere — gli ascolti di questo telefono, già
//     cercati su iTunes; se non ci sono (un altro telefono, giorni dopo) quelli
//     della playlist salvata, che allora si possono solo togliere.
//   `playlist`: com'è ora, { titolo, brani } (null = nessuna).
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { TITOLO_PLAYLIST } from '../lib/musica'

const chiave = (b) => `${b.titolo}|${b.artista}`

export default function PlaylistAllenamento({ brani, playlist, onChange, onFatto }) {
  const dentro = new Set((playlist?.brani || []).map(chiave))
  // Senza brani la playlist non c'è (null), ma il titolo scritto resta qui:
  // rimettendo i brani torna con lui.
  const [titolo, setTitolo] = useState(playlist?.titolo || '')
  const conBrani = (lista, t = titolo) => (lista.length ? { titolo: t.trim(), brani: lista } : null)
  const cambia = (b) => {
    const k = chiave(b)
    onChange(conBrani(brani.filter((x) => (chiave(x) === k ? !dentro.has(k) : dentro.has(chiave(x))))))
  }
  const tutti = brani.every((b) => dentro.has(chiave(b)))

  return (
    <div className="playlist-all">
      <input
        className="input"
        aria-label="Titolo della playlist"
        maxLength={60}
        value={titolo}
        placeholder={TITOLO_PLAYLIST}
        onChange={(e) => {
          setTitolo(e.target.value)
          if (playlist) onChange({ ...playlist, titolo: e.target.value.trim() })
        }}
        style={{ marginBottom: 12 }}
      />
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {dentro.size} di {brani.length} nella playlist
        </span>
        <button type="button" className="btn btn-sm" onClick={() => onChange(tutti ? null : conBrani(brani))}>
          {tutti ? 'Togli tutti' : 'Rimetti tutti'}
        </button>
      </div>

      <ul className="playlist-all-lista">
        {brani.map((b) => {
          const si = dentro.has(chiave(b))
          return (
            <li key={chiave(b)}>
              <button
                type="button"
                className={'playlist-all-voce' + (si ? '' : ' fuori')}
                aria-pressed={si}
                onClick={() => cambia(b)}
              >
                {b.copertina ? (
                  <img src={b.copertina} alt="" width={40} height={40} loading="lazy" />
                ) : (
                  <span className="playlist-all-nota" aria-hidden="true">
                    ♪
                  </span>
                )}
                <span className="playlist-all-testi">
                  <span className="playlist-all-titolo">{b.titolo}</span>
                  <span className="playlist-all-artista">
                    {b.artista}
                    {b.volte > 1 ? ` · ×${b.volte}` : ''}
                  </span>
                </span>
                <span className="playlist-all-segno" aria-hidden="true">
                  {si ? '✓' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={onFatto}>
        Fatto
      </button>
    </div>
  )
}
