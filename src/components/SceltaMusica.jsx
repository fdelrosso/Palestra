import { useEffect, useState } from 'react'
import { cercaCanzoni } from '../lib/musica'
import { IconClose, IconSearch } from './icons'
import ChipMusica from './ChipMusica'

// ---------------------------------------------------------------------------
// "La canzone dell'allenamento": si cerca per titolo o artista (iTunes, vedi
// lib/musica) e se ne sceglie una. Facoltativa, e si cambia quando si vuole.
// Sta nel riepilogo di fine allenamento e sotto il recap del calendario.
//
// `valore` = il cartellino scelto o null; `onChange(cartellino|null)` lo
// salva subito, come sfondo e layout: e' una scelta, non un testo.
// ---------------------------------------------------------------------------

export default function SceltaMusica({ valore, onChange }) {
  const [cerca, setCerca] = useState(false)
  const [q, setQ] = useState('')
  const [risultati, setRisultati] = useState([])
  const [stato, setStato] = useState('') // '' | 'carico' | 'errore'

  // Si cerca dopo una pausa nella scrittura, e la ricerca vecchia si annulla:
  // risposte che arrivano fuori ordine non devono coprire quella giusta.
  useEffect(() => {
    const termine = q.trim()
    if (!cerca || termine.length < 2) return
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setStato('carico')
      try {
        setRisultati(await cercaCanzoni(termine, { signal: ctrl.signal }))
        setStato('')
      } catch (e) {
        if (e.name === 'AbortError') return
        setRisultati([])
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
  const lista = corta ? [] : risultati

  const chiudi = () => {
    setCerca(false)
    setQ('')
    setRisultati([])
    setStato('')
  }

  return (
    <div className="card scelta-musica" style={{ marginTop: 16 }}>
      <div className="kicker">La canzone dell’allenamento</div>

      {!cerca && valore && (
        <div className="scelta-musica-scelta">
          <ChipMusica musica={valore} />
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-sm grow" onClick={() => setCerca(true)}>
              Cambia
            </button>
            <button className="btn btn-sm grow" onClick={() => onChange?.(null)}>
              Togli
            </button>
          </div>
        </div>
      )}

      {!cerca && !valore && (
        <>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
            Quella che ti ha tirato su oggi: compare nel post, e chi la tocca la apre su Spotify,
            Apple Music o YouTube Music.
          </p>
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setCerca(true)}>
            <IconSearch width={15} height={15} /> Cerca una canzone
          </button>
        </>
      )}

      {cerca && (
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

          {!corta && stato === 'carico' && lista.length === 0 && <div className="vis-hint">Cerco…</div>}
          {!corta && stato === 'errore' && (
            <div className="vis-hint">Ricerca non riuscita: controlla la connessione e riprova.</div>
          )}
          {!corta && stato === '' && lista.length === 0 && (
            <div className="vis-hint">Nessuna canzone trovata.</div>
          )}

          {lista.length > 0 && (
            <ul className="scelta-musica-lista">
              {lista.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="scelta-musica-voce"
                    onClick={() => {
                      onChange?.(m)
                      chiudi()
                    }}
                  >
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
          )}
          <div className="vis-hint" style={{ marginTop: 8 }}>
            Ricerca nel catalogo di Apple Music.
          </div>
        </>
      )}
    </div>
  )
}
