import { esitoSerie } from '../lib/carico'
import { COLORI } from '../lib/session'

// Bottom-sheet con lo storico di UN esercizio: tutte le volte che l'hai svolto,
// dalla più recente, con serie/ripetizioni, carico, recupero e i pallini
// colorati com'erano (verde/giallo/rosso per ogni serie).
// Le voci arrivano da storicoCarichi() (lib/carico).

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']

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
  return (
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
          {storia.map((v, i) => {
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
                  {(v.serie || v.ripetizioni) && (
                    <span className="serie-rip">
                      {[v.serie, v.ripetizioni].filter(Boolean).join('×')}
                    </span>
                  )}
                  {v.carico && <span className="chip">{v.carico}</span>}
                  {v.recupero && <span className="chip">rec {v.recupero}</span>}
                </div>

                <div className="set-dots" style={{ marginTop: 10 }}>
                  {(v.colori || []).map((c, j) => (
                    <div key={j} className={'set-dot' + (c ? ' ' + c : '')}>
                      {c ? '' : '–'}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
