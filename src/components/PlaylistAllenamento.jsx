// ---------------------------------------------------------------------------
// Il foglio della playlist nel riepilogo, dalla sua pillola (lib/ascolti): i brani
// da tenere o togliere con un tocco, e "Aggiungi brani" per cercarne altri
// (iTunes, come la canzone dell'allenamento) — senza l'app Android (iPhone,
// sito) è l'unico modo. Una playlist di Spotify dal link invece è la canzone
// dell'allenamento (SceltaMusica).
// È una BOZZA come il resto del riepilogo: si salva col "Salva"
// (`Completamento.playlist`).
//   `ascoltati`: gli ascolti di questo telefono, già cercati su iTunes;
//   `playlist`: com'è ora, { titolo, brani } (null = nessuna). La lista
//     mostra gli uni e gli altri: tolto, un brano aggiunto a mano sparisce.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { MAX_PLAYLIST, TITOLO_PLAYLIST, cercaCanzoni, normalizzaBrano } from '../lib/musica'
import { IconEdit, IconMusica, IconPlus, IconSearch } from './icons'
import { SezioneFoglio } from './Foglio'

const chiave = (b) => `${b.titolo}|${b.artista}`

export default function PlaylistAllenamento({ ascoltati = [], playlist, onChange, onFatto }) {
  const scelti = playlist?.brani || []
  const dentro = new Set(scelti.map(chiave))
  const brani = [...ascoltati, ...scelti.filter((b) => !ascoltati.some((a) => chiave(a) === chiave(b)))]
  // Senza brani la playlist non c'è (null), ma il titolo scritto resta qui:
  // rimettendo i brani torna con lui.
  const [titolo, setTitolo] = useState(playlist?.titolo || '')
  const conBrani = (lista, t = titolo) => (lista.length ? { titolo: t.trim(), brani: lista } : null)
  const cambia = (b) => {
    const k = chiave(b)
    onChange(conBrani(brani.filter((x) => (chiave(x) === k ? !dentro.has(k) : dentro.has(chiave(x))))))
  }
  const tutti = brani.every((b) => dentro.has(chiave(b)))
  // In fondo, senza doppioni e fino a MAX_PLAYLIST.
  const aggiungi = (b) => {
    if (dentro.has(chiave(b))) return
    onChange(conBrani([...scelti, b].slice(0, MAX_PLAYLIST)))
  }

  return (
    <div className="playlist-all stack" style={{ gap: 12 }}>
      <SezioneFoglio icona={<IconEdit width={18} height={18} />} titolo="Titolo" sotto="In testa alla lista.">
        <input
          className="input"
          aria-label="Titolo della lista"
          maxLength={60}
          value={titolo}
          placeholder={TITOLO_PLAYLIST}
          onChange={(e) => {
            setTitolo(e.target.value)
            if (playlist) onChange({ ...playlist, titolo: e.target.value.trim() })
          }}
        />
      </SezioneFoglio>

      {brani.length > 0 && (
        <SezioneFoglio
          icona={<IconMusica width={18} height={18} />}
          titolo={`Canzoni · ${dentro.size} di ${brani.length}`}
          sotto={
            ascoltati.length
              ? 'Quelle che hai ascoltato durante l’allenamento. Tocca per togliere o rimettere.'
              : 'Tocca per togliere o rimettere.'
          }
        >
          <button type="button" className="btn btn-sm" onClick={() => onChange(tutti ? null : conBrani(brani))}>
            {tutti ? 'Togli tutte' : 'Rimetti tutte'}
          </button>

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
        </SezioneFoglio>
      )}

      <CercaBrani dentro={dentro} onAggiungi={aggiungi} />

      {onFatto && (
        <button className="btn btn-accent btn-block" onClick={onFatto}>
          Fatto
        </button>
      )}
    </div>
  )
}

// "Aggiungi brani": si cerca su iTunes dopo una pausa nella scrittura, e la
// ricerca vecchia si annulla (come SceltaMusica).
function CercaBrani({ dentro, onAggiungi }) {
  const [q, setQ] = useState('')
  const [risultati, setRisultati] = useState([])
  const [errore, setErrore] = useState(false)
  useEffect(() => {
    const termine = q.trim()
    if (termine.length < 2) return undefined
    const ctrl = new AbortController()
    const id = setTimeout(() => {
      cercaCanzoni(termine, { signal: ctrl.signal, limite: 8 })
        .then((r) => {
          setRisultati(r)
          setErrore(false)
        })
        .catch((e) => e.name !== 'AbortError' && setErrore(true))
    }, 350)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [q])
  const mostrati = q.trim().length < 2 ? [] : risultati

  return (
    <SezioneFoglio
      icona={<IconPlus width={18} height={18} />}
      titolo="Aggiungi canzoni"
      sotto="Cercale nel catalogo di Apple Music."
    >
      <label className="playlist-all-campo">
        <IconSearch width={16} height={16} aria-hidden="true" />
        <input
          className="input"
          type="search"
          aria-label="Cerca un brano da aggiungere"
          placeholder="Titolo o artista"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {errore && <p className="muted playlist-all-nota-testo">La ricerca non risponde: riprova tra poco.</p>}
      {mostrati.length > 0 && (
        <ul className="playlist-all-lista">
          {mostrati.map((m) => {
            const b = normalizzaBrano(m)
            const gia = dentro.has(chiave(b))
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className="playlist-all-voce"
                  disabled={gia}
                  aria-label={gia ? `${b.titolo}: già nella playlist` : `Aggiungi ${b.titolo}`}
                  onClick={() => onAggiungi(b)}
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
                    <span className="playlist-all-artista">{b.artista}</span>
                  </span>
                  <span className="playlist-all-segno" aria-hidden="true">
                    {gia ? '✓' : <IconPlus width={14} height={14} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SezioneFoglio>
  )
}
