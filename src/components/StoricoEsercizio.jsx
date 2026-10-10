import { useState } from 'react'
import { createPortal } from 'react-dom'
import { esitoSerie } from '../lib/carico'
import { COLORI } from '../lib/session'
import { formatCarico, formatSerieRip, formattaRecupero } from '../lib/schema'

// Bottom-sheet con lo storico di UN esercizio: tutte le volte che l'hai svolto,
// dalla più recente, con serie/ripetizioni, carico, recupero e i pallini
// colorati com'erano (verde/giallo/rosso per ogni serie).
// Le voci arrivano da storicoCarichi() (lib/carico).
// Di base si vedono le ultime QUANTE_DI_BASE volte; con −/+ se ne vedono di
// meno (anche solo l'ultima) o di più, con "Tutte" l'intero storico.

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']
const QUANTE_DI_BASE = 5

// Etichetta dell'esito, per capire a colpo d'occhio com'era andata.
const ESITO = {
  facile: { label: 'Troppo facile', classe: 'badge-good' },
  'quasi-facile': { label: 'Quasi facile', classe: 'badge-good' },
  giusto: { label: 'Al punto giusto', classe: '' },
  troppo: { label: 'Troppo duro', classe: 'badge-danger' },
}

// "gio 4 set 2026, 18:00"
function quando(iso) {
  const d = new Date(iso)
  const data = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(d)
  const ora = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${data.charAt(0).toUpperCase() + data.slice(1)} · ${ora}`
}

export default function StoricoEsercizio({ nome, storia = [], onChiudi }) {
  const [quante, setQuante] = useState(QUANTE_DI_BASE)
  const mostrate = Math.max(1, Math.min(quante, storia.length))
  const visibili = storia.slice(0, mostrate)
  const cambia = (d) => setQuante(Math.max(1, Math.min(storia.length, mostrate + d)))

  // Nel body: aperto da una card dell'allenamento o dalla modale del consiglio
  // (components/ConsiglioCarico), il fixed resterebbe chiuso nella card e
  // finirebbe sotto la modale.
  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label={`Storico di ${nome}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}
        >
          <h3 style={{ marginBottom: 0 }}>{nome}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
          {storia.length === 1 ? '1 volta svolto' : `${storia.length} volte svolto`} · dalla più recente
        </p>

        {/* Quante volte vedere: solo l'ultima, le ultime 3, quante si vuole. */}
        {storia.length > 1 && (
          <div className="row" style={{ gap: 8, margin: '0 0 12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm"
              style={{ minWidth: 40 }}
              disabled={mostrate <= 1}
              onClick={() => cambia(-1)}
              aria-label="Mostra una volta in meno"
            >
              −
            </button>
            <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 104, textAlign: 'center' }} aria-live="polite">
              {mostrate === 1
                ? 'Solo l’ultima'
                : mostrate === storia.length
                  ? `Tutte e ${mostrate}`
                  : `Le ultime ${mostrate}`}
            </span>
            <button
              className="btn btn-sm"
              style={{ minWidth: 40 }}
              disabled={mostrate >= storia.length}
              onClick={() => cambia(1)}
              aria-label="Mostra una volta in più"
            >
              +
            </button>
            {mostrate < storia.length && (
              <button className="btn btn-ghost btn-sm" onClick={() => setQuante(storia.length)}>
                Tutte
              </button>
            )}
          </div>
        )}

        {/* Legenda dei colori */}
        <div className="row" style={{ gap: 14, margin: '0 2px 12px', fontSize: 12.5 }}>
          {ORDINE_COLORI.map((c) => (
            <span key={c} className="row" style={{ gap: 6 }}>
              <span className={'dot-mini ' + c} />
              <span className="muted">{COLORI[c].label}</span>
            </span>
          ))}
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {visibili.map((v, i) => {
            const esito = ESITO[esitoSerie(v)]
            const contesto = [v.nomeScheda, v.nomeGiorno].filter(Boolean).join(' · ')
            return (
              <div key={i} className="ex-card">
                <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{quando(v.data)}</div>
                  {esito && <span className={'badge ' + esito.classe}>{esito.label}</span>}
                </div>
                {contesto && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {contesto}
                    {v.settimana != null && ` · Sett ${v.settimana}`}
                  </div>
                )}

                <div className="ex-scheme" style={{ marginTop: 10 }}>
                  {formatSerieRip(v.schema) && <span className="serie-rip">{formatSerieRip(v.schema)}</span>}
                  {formatCarico(v.schema) && <span className="chip">{formatCarico(v.schema)}</span>}
                  {formattaRecupero(v.schema) && <span className="chip">rec {formattaRecupero(v.schema)}</span>}
                </div>

                <div className="set-dots" style={{ marginTop: 10 }}>
                  {(v.colori || []).map((c, j) => (
                    <div key={j} className={'set-dot' + (c ? ' ' + c : '')}>
                      {!c ? '–' : (v.fatte?.[j] ?? '')}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
