import { useEffect, useState } from 'react'
import {
  CORNICI,
  SCRITTE,
  canzoniDiArtista,
  cercaArtisti,
  cercaCanzoni,
  normalizzaMusica,
  scrittaDiBase,
  semplifica,
  soloPlaylist,
  spotifyDi,
} from '../lib/musica'
import { IconChevron, IconClose, IconSearch } from './icons'
import { daSpotify } from '../lib/playlistSpotify'
import { SezioneFoglio } from './Foglio'

// ---------------------------------------------------------------------------
// "La canzone dell'allenamento": si cerca per titolo o artista (iTunes, vedi
// lib/musica) e se ne sceglie una. Facoltativa, e si cambia quando si vuole.
// Sta nel riepilogo (components/Riepilogo): a fine allenamento e riaprendone
// uno vecchio dal calendario o dallo Storico. Lì sta in un foglio (`nudo`).
//
// Due strade, perche' la ricerca di Apple non trova tutto (le uscite recenti
// spesso mancano): le canzoni che trova, e sopra gli ARTISTI — toccandone uno
// si sfogliano tutte le sue canzoni, le piu' nuove per prime, con un filtro.
//
// `valore` = il cartellino scelto o null; `onChange(cartellino|null)` lo
// salva subito, come sfondo e layout: e' una scelta, non un testo.
// `nudo`: senza la card e il titolo, per quando sta già in un foglio (il
// riepilogo, components/Foglio): lì si apre subito sulla ricerca, e
// `onFatto()` chiude il foglio quando la canzone si toglie; scelta, il foglio
// resta aperto su colore e frase della polaroid.
//
// In più, sotto, una playlist (o un album) di Spotify dal link (CollegaSpotify,
// api/spotify): una pillola in fondo al recap, che chi tocca apre su Spotify.
// Senza canzone la polaroid è la playlist (lib/musica, normalizzaMusica).
// Canzone e playlist stanno nello stesso valore: `{ ...canzone, spotify }`.
// ---------------------------------------------------------------------------

const A_PAGINA = 10

export default function SceltaMusica({ valore, onChange, nudo = false, onFatto }) {
  const [cerca, setCerca] = useState(false)
  const [q, setQ] = useState('')
  const [risultati, setRisultati] = useState({ canzoni: [], artisti: [] })
  const [stato, setStato] = useState('') // '' | 'carico' | 'errore'
  const [quante, setQuante] = useState(A_PAGINA)
  // L'artista aperto: { id, nome }, le sue canzoni e il filtro.
  const [artista, setArtista] = useState(null)

  // Si cerca dopo una pausa nella scrittura, e la ricerca vecchia si annulla:
  // risposte che arrivano fuori ordine non devono coprire quella giusta.
  useEffect(() => {
    const termine = q.trim()
    if (!cerca || termine.length < 2) return
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setStato('carico')
      try {
        const [canzoni, artisti] = await Promise.all([
          cercaCanzoni(termine, { signal: ctrl.signal }),
          // Gli artisti sono un aiuto: se non arrivano, restano le canzoni.
          cercaArtisti(termine, { signal: ctrl.signal }).catch(() => []),
        ])
        setRisultati({ canzoni, artisti })
        setQuante(A_PAGINA)
        setStato('')
      } catch (e) {
        if (e.name === 'AbortError') return
        setRisultati({ canzoni: [], artisti: [] })
        setStato('errore')
      }
    }, 350)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [q, cerca])

  // Sotto le due lettere non si cerca, e quello che c'era non si mostra.
  const corta = q.trim().length < 2
  const { canzoni, artisti } = corta ? { canzoni: [], artisti: [] } : risultati

  // Il colore e la scritta della polaroid, e la playlist collegata, restano
  // quando si cambia canzone.
  const resta = {
    ...(valore?.cornice && { cornice: valore.cornice }),
    ...(valore?.scritta && { scritta: valore.scritta }),
  }
  const spotify = spotifyDi(valore)
  const soloLei = soloPlaylist(normalizzaMusica(valore))
  const scegli = (m) => {
    onChange?.({ ...m, ...resta, ...(spotify && { spotify }) })
    chiudi()
  }
  // La playlist si aggiunge alla canzone, e se ne va senza toccarla.
  const collega = (s) => onChange?.({ ...(valore || {}), spotify: s })
  const scollega = () => {
    if (soloLei) return onChange?.(null)
    const { spotify: _via, ...canzone } = valore
    onChange?.(canzone)
  }
  // "Togli" la canzone: resta la playlist, se c'è.
  const togliCanzone = () => {
    if (spotify && !soloLei) return onChange?.({ spotify, ...resta })
    onChange?.(null)
    onFatto?.()
  }
  const chiudi = () => {
    setCerca(false)
    setQ('')
    setRisultati({ canzoni: [], artisti: [] })
    setStato('')
    setArtista(null)
  }

  // La ricerca della canzone, dentro la sua sezione.
  const ricerca = artista ? (
    <CanzoniArtista artista={artista} onIndietro={() => setArtista(null)} onScegli={scegli} />
  ) : (
    <>
      <div className="field scelta-musica-campo" style={{ margin: '10px 0 0' }}>
        <input
          className="input"
          type="search"
          enterKeyHint="search"
          autoFocus
          maxLength={80}
          value={q}
          placeholder="Titolo o artista"
          aria-label="Cerca una canzone"
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-sm" aria-label="Chiudi la ricerca" onClick={chiudi}>
          <IconClose width={15} height={15} />
        </button>
      </div>

      {!corta && stato === 'carico' && canzoni.length === 0 && <div className="vis-hint">Cerco…</div>}
      {!corta && stato === 'errore' && (
        <div className="vis-hint">Ricerca non riuscita: controlla la connessione e riprova.</div>
      )}
      {!corta && stato === '' && canzoni.length === 0 && artisti.length === 0 && (
        <div className="vis-hint">Nessuna canzone trovata.</div>
      )}

      {artisti.length > 0 && (
        <ul className="scelta-musica-lista">
          {artisti.map((a) => (
            <li key={a.id}>
              <button type="button" className="scelta-musica-voce" onClick={() => setArtista(a)}>
                <span className="scelta-musica-vuota tondo" aria-hidden="true">
                  ♪
                </span>
                <span className="scelta-musica-testi">
                  <span className="scelta-musica-titolo">{a.nome}</span>
                  <span className="scelta-musica-artista">Artista · tutte le canzoni</span>
                </span>
                <IconChevron className="scelta-musica-freccia" width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ListaCanzoni canzoni={canzoni.slice(0, quante)} onScegli={scegli} />
      {canzoni.length > quante && (
        <button className="btn btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => setQuante((n) => n + A_PAGINA)}>
          Mostra altre canzoni
        </button>
      )}

      <div className="vis-hint" style={{ marginTop: 8 }}>
        {artisti.length > 0
          ? 'Non la trovi? Apri l’artista: lì ci sono tutte le sue canzoni, anche le ultime uscite.'
          : 'Ricerca nel catalogo di Apple Music.'}
      </div>
    </>
  )

  // Colore e frase della polaroid: chiusi, perché sono un ritocco. La frase
  // "la playlist" ha senso solo se la polaroid è la playlist, e viceversa.
  const frasi = Object.entries(SCRITTE).filter(([id]) => id !== (soloLei ? 'allenamento' : 'playlist'))
  const personalizza = valore && (
    <details className="musica-personalizza">
      <summary>Personalizza la polaroid</summary>
      <div className="muted scelta-etichetta">Colore della cornice</div>
      <div className="scelta-cornice" role="radiogroup" aria-label="Colore della cornice">
        {Object.entries(CORNICI).map(([id, c]) => {
          const scelto = (valore.cornice || 'crema') === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={scelto}
              aria-label={c.nome}
              title={c.nome}
              className={'scelta-cornice-voce' + (scelto ? ' on' : '')}
              style={{ background: c.fondo, ...(c.bordo ? { borderColor: c.bordo } : {}) }}
              onClick={() => onChange?.({ ...valore, cornice: id })}
            />
          )
        })}
      </div>
      <div className="muted scelta-etichetta" id="scelta-scritta-titolo">
        Frase scritta a mano
      </div>
      <div className="scelta-scritta" role="radiogroup" aria-labelledby="scelta-scritta-titolo">
        {frasi.map(([id, s]) => {
          const scelto = (valore.scritta || scrittaDiBase(valore)) === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={scelto}
              className={'chip chip-scelta' + (scelto ? ' on' : '')}
              onClick={() => onChange?.({ ...valore, scritta: id })}
            >
              {s.nome}
            </button>
          )
        })}
      </div>
    </details>
  )

  const m = normalizzaMusica(valore)
  return (
    <div className={nudo ? 'scelta-musica' : 'card scelta-musica'} style={nudo ? undefined : { marginTop: 16 }}>
      {!nudo && <div className="kicker">La musica dell’allenamento</div>}

      {/* Due cose diverse, e si vede dove va ognuna: la canzone è la
          polaroid, la playlist di Spotify la pillola in fondo al recap. */}
      <SezioneFoglio
        icona={<span className="musica-icona-polaroid" />}
        titolo="Canzone"
        sotto="Una polaroid nel recap: chi la tocca la ascolta."
      >
        {cerca ? (
          ricerca
        ) : m && !soloLei ? (
          <>
            <Scelta copertina={m.copertina} titolo={m.titolo} sotto={m.artista} />
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm grow" onClick={() => setCerca(true)}>
                Cambia
              </button>
              <button className="btn btn-sm grow" onClick={togliCanzone}>
                Togli
              </button>
            </div>
            {personalizza}
          </>
        ) : (
          <>
            {soloLei && <p className="vis-hint">Senza canzone, la polaroid mostra la playlist di Spotify.</p>}
            <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => setCerca(true)}>
              <IconSearch width={15} height={15} /> Cerca una canzone
            </button>
            {personalizza}
          </>
        )}
      </SezioneFoglio>

      <SezioneFoglio
        icona={<span className="musica-icona-pillola" />}
        titolo="Playlist di Spotify"
        sotto="Una pillola in fondo al recap: chi la tocca la apre su Spotify."
      >
        {spotify ? (
          <>
            <Scelta
              copertina={spotify.copertina}
              titolo={spotify.nome || 'Playlist'}
              sotto={spotify.brani ? `${spotify.tipo === 'album' ? 'Album' : 'Playlist'} · ${spotify.brani} brani` : ''}
            />
            <button className="btn btn-sm btn-block" style={{ marginTop: 10 }} onClick={scollega}>
              Scollega
            </button>
          </>
        ) : (
          <CollegaSpotify onCollega={collega} />
        )}
      </SezioneFoglio>
    </div>
  )
}

// Quello che è scelto: copertina, titolo e sotto.
function Scelta({ copertina, titolo, sotto }) {
  return (
    <div className="musica-scelta">
      {copertina ? (
        <img src={copertina} alt="" width={48} height={48} />
      ) : (
        <span className="scelta-musica-vuota" aria-hidden="true">
          ♪
        </span>
      )}
      <span className="scelta-musica-testi">
        <span className="scelta-musica-titolo">{titolo}</span>
        {sotto && <span className="scelta-musica-artista">{sotto}</span>}
      </span>
    </div>
  )
}

// Tutte le canzoni di un artista, le più nuove per prime, con un filtro sul
// titolo (senza maiuscole né accenti).
function CanzoniArtista({ artista, onIndietro, onScegli }) {
  const [canzoni, setCanzoni] = useState(null) // null = sta caricando
  const [errore, setErrore] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [quante, setQuante] = useState(A_PAGINA)

  useEffect(() => {
    const ctrl = new AbortController()
    canzoniDiArtista(artista.id, { signal: ctrl.signal })
      .then(setCanzoni)
      .catch((e) => e.name !== 'AbortError' && setErrore(true))
    return () => ctrl.abort()
  }, [artista.id])

  const f = semplifica(filtro)
  const trovate = (canzoni || []).filter((m) => !f || semplifica(m.titolo).includes(f))

  return (
    <>
      <div className="row scelta-musica-testa-artista">
        <button type="button" className="btn btn-sm" onClick={onIndietro} aria-label="Torna alla ricerca">
          <IconChevron className="scelta-musica-indietro" width={15} height={15} />
        </button>
        <span className="scelta-musica-nome-artista">{artista.nome}</span>
      </div>
      <div className="field" style={{ margin: '10px 0 0' }}>
        <input
          className="input"
          type="search"
          maxLength={80}
          value={filtro}
          placeholder="Filtra le canzoni"
          aria-label={`Filtra le canzoni di ${artista.nome}`}
          onChange={(e) => {
            setFiltro(e.target.value)
            setQuante(A_PAGINA)
          }}
        />
      </div>
      {canzoni === null && !errore && <div className="vis-hint">Carico le canzoni…</div>}
      {errore && <div className="vis-hint">Canzoni non caricate: controlla la connessione e riprova.</div>}
      {canzoni && trovate.length === 0 && <div className="vis-hint">Nessuna canzone con questo titolo.</div>}
      <ListaCanzoni canzoni={trovate.slice(0, quante)} onScegli={onScegli} />
      {trovate.length > quante && (
        <button className="btn btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => setQuante((n) => n + A_PAGINA)}>
          Mostra altre canzoni
        </button>
      )}
    </>
  )
}

function ListaCanzoni({ canzoni, onScegli }) {
  if (canzoni.length === 0) return null
  return (
    <ul className="scelta-musica-lista">
      {canzoni.map((m) => (
        <li key={m.id}>
          <button type="button" className="scelta-musica-voce" onClick={() => onScegli(m)}>
            {m.copertina ? (
              <img src={m.copertina} alt="" width={44} height={44} loading="lazy" decoding="async" />
            ) : (
              <span className="scelta-musica-vuota" aria-hidden="true">
                ♪
              </span>
            )}
            <span className="scelta-musica-testi">
              <span className="scelta-musica-titolo">{m.titolo}</span>
              <span className="scelta-musica-artista">{m.artista}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// "Playlist di Spotify": il link di una playlist o di un album pubblici
// (api/spotify), una richiesta sola.
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
    <div className="scelta-musica-spotify">
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
      {stato && stato !== 'carico' && <p className="vis-hint">{stato}</p>}
      <details className="musica-aiuto">
        <summary>Come trovo il link?</summary>
        In Spotify apri la playlist, tocca ⋯ → Condividi → Copia link, e incollalo qui. La playlist
        deve essere pubblica.
      </details>
    </div>
  )
}
