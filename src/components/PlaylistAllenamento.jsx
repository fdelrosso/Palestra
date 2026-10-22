// ---------------------------------------------------------------------------
// Il foglio della playlist nel riepilogo (lib/ascolti): i brani da tenere o
// togliere con un tocco, e due modi di aggiungerne — cercandoli (iTunes, come
// la canzone dell'allenamento) o dal link di una playlist di Spotify
// (lib/playlistSpotify). Senza l'app Android (iPhone, sito) sono gli unici.
// È una BOZZA come il resto del riepilogo: si salva col "Salva"
// (`Completamento.playlist`).
//   `ascoltati`: gli ascolti di questo telefono, già cercati su iTunes;
//   `playlist`: com'è ora, { titolo, brani } (null = nessuna). La lista
//     mostra gli uni e gli altri: tolto, un brano aggiunto a mano sparisce.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { MAX_PLAYLIST, TITOLO_PLAYLIST, cercaCanzoni, normalizzaBrano } from '../lib/musica'
import { daSpotify } from '../lib/playlistSpotify'
import { IconPlus, IconSearch } from './icons'
import PlaylistRecap from './PlaylistRecap'

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

  // Con una playlist di Spotify collegata si mostra lei, non i brani (che
  // restano da parte: scollegandola tornano).
  if (playlist?.spotify) {
    return (
      <div className="playlist-all">
        <PlaylistRecap playlist={playlist} />
        <button
          type="button"
          className="btn btn-block"
          style={{ marginTop: 12 }}
          onClick={() => onChange(conBrani(scelti))}
        >
          Scollega da Spotify
        </button>
        <button className="btn btn-accent btn-block" style={{ marginTop: 8 }} onClick={onFatto}>
          Fatto
        </button>
      </div>
    )
  }

  return (
    <div className="playlist-all">
      <CollegaSpotify onCollega={(spotify) => onChange({ titolo: titolo.trim(), brani: scelti, spotify })} />

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

      <CercaBrani dentro={dentro} onAggiungi={aggiungi} />

      <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={onFatto}>
        Fatto
      </button>
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
    <div className="playlist-all-aggiungi">
      <div className="kicker">Aggiungi brani</div>
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
    </div>
  )
}

// "Collega una playlist di Spotify": il link di una playlist o di un album
// pubblici (api/spotify). Al posto dei brani si mostra lei, con copertina,
// nome e il tasto per aprirla: una richiesta sola, niente da cercare.
function CollegaSpotify({ onCollega }) {
  const [link, setLink] = useState('')
  const [stato, setStato] = useState('') // '' | 'carico' | un messaggio d'errore
  const collega = async () => {
    setStato('carico')
    try {
      onCollega(await daSpotify(link.trim()))
    } catch (e) {
      setStato(e.message)
    }
  }
  return (
    <div className="playlist-all-spotify">
      <div className="kicker">Hai una playlist su Spotify?</div>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input grow"
          type="url"
          inputMode="url"
          aria-label="Link della playlist di Spotify"
          placeholder="Incolla il link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={stato === 'carico' || !link.includes('spotify')}
          onClick={collega}
        >
          {stato === 'carico' ? 'Leggo…' : 'Collega'}
        </button>
      </div>
      <p className="muted playlist-all-nota-testo">
        {stato && stato !== 'carico'
          ? stato
          : 'In Spotify: ⋯ sulla playlist → Condividi → Copia link. Deve essere pubblica.'}
      </p>
    </div>
  )
}
