import { useMemo } from 'react'
import { COLORI } from '../lib/session'
import { formatSec } from '../lib/parseRecupero'
import { formatSerieRip } from '../lib/format'
import { gruppiAllenati, numeroPositivo } from '../lib/recap'
import CorpoAllenato from './CorpoAllenato'

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']

// Corpo del riepilogo di un allenamento: tempo totale, il CORPO coi muscoli
// lavorati accesi di rosso, legenda sforzo e dettaglio degli esercizi con i
// pallini colorati per serie.
// È il "recap preciso" mostrato sia alla fine di un allenamento (WorkoutSession)
// sia cliccando un giorno cerchiato nel calendario. Componente di sola
// presentazione: la schermata che lo usa aggiunge topbar/azioni proprie.
export default function RiepilogoDettaglio({ riep }) {
  const conteggio = (esercizio, colore) => esercizio.sets.filter((s) => s.colore === colore).length
  const esercizi = riep.esercizi || []
  // Numeri copiati dall'orologio a fine allenamento (facoltativi).
  const kcal = numeroPositivo(riep.calorieReali)
  const fcMedia = numeroPositivo(riep.fcMedia)
  const fcMax = numeroPositivo(riep.fcMax)
  // Dove è andato il lavoro di oggi: gli stessi conteggi delle pillole colorate
  // della card, così le due viste del recap non possono raccontarsi diverse.
  const gruppi = useMemo(() => gruppiAllenati(riep.esercizi), [riep.esercizi])

  return (
    <>
      {riep.durataSec != null && (
        <div className="hero" style={{ textAlign: 'center' }}>
          <div className="kicker">
            {riep.nomeGiorno} · Settimana {riep.settimana}
          </div>
          <div className="titolo" style={{ fontSize: 30 }}>{formatSec(riep.durataSec)}</div>
          <div className="muted" style={{ marginTop: 4 }}>tempo totale</div>
        </div>
      )}

      {gruppi.length > 0 && (
        <div className="card corpo-card">
          <div className="card-titolo">Muscoli allenati</div>
          <CorpoAllenato gruppi={gruppi} />
          <div className="gruppo-chips" style={{ justifyContent: 'center', marginTop: 4 }}>
            {gruppi.map((g) => (
              <span key={g.id} className="gruppo-chip on" style={{ '--g': g.colore }}>
                {g.label} · {g.serie}
              </span>
            ))}
          </div>
        </div>
      )}

      {(kcal || fcMedia || fcMax) && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '14px 2px 0' }}>
          {kcal && <span className="chip">🔥 {Math.round(kcal)} kcal</span>}
          {fcMedia && <span className="chip">♥ {Math.round(fcMedia)} bpm medi</span>}
          {fcMax && <span className="chip">♥ max {Math.round(fcMax)} bpm</span>}
        </div>
      )}

      <div className="row" style={{ gap: 14, margin: '16px 2px 4px', fontSize: 13 }}>
        {ORDINE_COLORI.map((c) => (
          <span key={c} className="row" style={{ gap: 6 }}>
            <span className={'dot-mini ' + c} />
            <span className="muted">{COLORI[c].label}</span>
          </span>
        ))}
      </div>

      {/* Il commento scritto nel recap di fine allenamento: qui torna a galla
          anche riaprendo l'allenamento dal calendario. */}
      {riep.nota && <div className="riep-nota">{riep.nota}</div>}

      <div className="section-title">Esercizi svolti</div>
      <div className="stack" style={{ gap: 10 }}>
        {esercizi.map((e, i) => {
          const fatti = e.sets.filter((s) => s.colore).length
          return (
            <div key={i} className="ex-card">
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div className="nome" style={{ fontSize: 15 }}>{e.nome}</div>
                <span className="badge">{fatti}/{e.sets.length} serie</span>
              </div>
              <div className="ex-scheme" style={{ marginTop: 10 }}>
                {formatSerieRip(e.schema) && <span className="chip">{formatSerieRip(e.schema)}</span>}
                {e.schema.carico && <span className="chip">{e.schema.carico}</span>}
              </div>
              <div className="set-dots" style={{ marginTop: 10 }}>
                {e.sets.map((s, j) => (
                  <div key={j} className={'set-dot' + (s.colore ? ' ' + s.colore : '')}>
                    {s.colore ? '' : '–'}
                  </div>
                ))}
                {conteggio(e, 'rosso') > 0 && (
                  <span className="chip chip-nota" style={{ marginLeft: 4 }}>
                    {conteggio(e, 'rosso')}× 🔴
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
