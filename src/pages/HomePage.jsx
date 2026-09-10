import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { statoScheda } from '../lib/progression'
import { navigate, routes } from '../lib/router'
import { dataLunga } from '../lib/format'
import EsercizioCard from '../components/EsercizioCard'
import { IconBack, IconChevron, IconPlus } from '../components/icons'

function SchedaCard({ scheda }) {
  const stato = statoScheda(scheda)
  const perc = stato.totaliSettimana
    ? Math.round((stato.fattiSettimana / stato.totaliSettimana) * 100)
    : 0
  const prossimo = stato.schedaCompletata
    ? 'Scheda completata 🎉'
    : stato.giornoCorrente
      ? `Prossimo: ${stato.giornoCorrente.nome}`
      : 'Settimana completata — avanza di settimana'

  return (
    <button className="scheda-card" onClick={() => navigate(routes.scheda(scheda.id))}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="nome">{scheda.nome}</div>
          <div className="meta">
            <span className="badge badge-accent">
              Settimana {stato.settimana}/{scheda.numeroSettimane}
            </span>
            <span className="nowrap">
              {stato.fattiSettimana}/{stato.totaliSettimana} allenamenti
            </span>
          </div>
        </div>
        <IconChevron className="faint" />
      </div>

      <div className="progress" style={{ marginTop: 14 }}>
        <div
          className={'progress-fill' + (perc === 100 ? ' full' : '')}
          style={{ width: perc + '%' }}
        />
      </div>
      <div className="meta" style={{ marginTop: 10 }}>
        {prossimo}
      </div>
    </button>
  )
}

// Un allenamento TENUTO: un giorno della scheda-contenitore `libera` che
// l'utente ha scelto di salvare nel riepilogo (Giorno.salvato). Non è una
// scheda — non ha settimane né progressione — quindi non usa SchedaCard: si
// apre per vedere cosa c'era dentro, e si rifà.
function AllenamentoCard({ giorno, ultima, onRipeti }) {
  const [aperto, setAperto] = useState(false)
  return (
    <div className="card">
      <button
        className="row"
        style={{ width: '100%', textAlign: 'left', alignItems: 'flex-start', gap: 10 }}
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{giorno.nome || 'Allenamento'}</div>
          <div className="meta" style={{ marginTop: 6 }}>
            <span className="nowrap">
              {giorno.esercizi.length} {giorno.esercizi.length === 1 ? 'esercizio' : 'esercizi'}
            </span>
            {/* Quello che non si sa non si mostra: se non risulta mai svolto,
                non si scrive una data finta né un trattino. */}
            {ultima && <span className="nowrap">Ultima volta: {dataLunga(ultima)}</span>}
          </div>
        </div>
        <IconChevron
          className="faint"
          style={{ transform: aperto ? 'rotate(90deg)' : undefined, flexShrink: 0 }}
        />
      </button>

      {aperto && (
        <>
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            {giorno.esercizi.map((e) => (
              <EsercizioCard key={e.id} esercizio={e} settimana={1} />
            ))}
          </div>
          <button className="btn btn-accent btn-block" style={{ marginTop: 12 }} onClick={onRipeti}>
            Rifai questo allenamento
          </button>
        </>
      )}
    </div>
  )
}

export default function HomePage() {
  const { schede, sessione, iniziaAllenamentoLibero } = useStore()
  // La scheda-contenitore degli allenamenti liberi/consigliati non va in elenco:
  // non è un programma, e i suoi giorni si mostrano a parte qui sotto.
  const mieSchede = schede.filter((s) => !s.libera)

  // Gli allenamenti tenuti, dal più recente. La data è quella dell'ultima volta
  // che quel giorno è stato svolto: sta nei completamenti del contenitore.
  const allenamenti = useMemo(() => {
    const contenitore = schede.find((s) => s.libera)
    if (!contenitore) return []
    const ultimaDi = (giornoId) => {
      const date = (contenitore.completamenti || [])
        .filter((c) => c.giornoId === giornoId && c.data)
        .map((c) => c.data)
      return date.length ? date.sort().at(-1) : null
    }
    return contenitore.giorni
      .filter((g) => g.salvato)
      .map((g) => ({ giorno: g, ultima: ultimaDi(g.id) }))
      .sort((a, b) => (b.ultima || '').localeCompare(a.ultima || ''))
  }, [schede])

  // Rifare un allenamento tenuto = avviarne uno NUOVO con gli stessi esercizi.
  // ⚠️ Non si riusa lo stesso giorno: terminaSessione sostituisce il
  // completamento con la stessa coppia settimana+giornoId, e rifarlo
  // cancellerebbe la volta prima dallo storico.
  const rifai = (giorno) => {
    iniziaAllenamentoLibero({ nome: giorno.nome, esercizi: giorno.esercizi })
    navigate(routes.allenamento())
  }

  return (
    <div className="app">
      <div className="topbar">
        <button
          className="icon-btn"
          aria-label="Indietro"
          onClick={() => navigate(routes.calendario())}
        >
          <IconBack />
        </button>
        <h1>Schede e allenamenti</h1>
      </div>

      {sessione && (
        <button
          className="hero"
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
          onClick={() => navigate(routes.allenamento())}
        >
          <div className="kicker">Allenamento in corso</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{sessione.nomeGiorno}</span>
            <span className="badge badge-accent">Riprendi ›</span>
          </div>
        </button>
      )}

      {mieSchede.length === 0 && allenamenti.length === 0 ? (
        <div className="empty">
          <div className="big">🏋️</div>
          <p>
            Ancora niente qui.
            <br />
            Tocca <strong>Nuova scheda</strong> per un programma, o il <strong>+</strong> del
            calendario per un allenamento singolo.
          </p>
        </div>
      ) : (
        <>
          {/* Le SCHEDE sono i programmi: settimane, giorni, progressione. */}
          {mieSchede.length > 0 && (
            <>
              <div className="section-title">Schede</div>
              <div className="stack">
                {mieSchede.map((s) => (
                  <SchedaCard key={s.id} scheda={s} />
                ))}
              </div>
            </>
          )}

          {/* Gli ALLENAMENTI sono i singoli, tenuti a fine sessione. */}
          {allenamenti.length > 0 && (
            <>
              <div className="section-title">Allenamenti</div>
              <div className="stack">
                {allenamenti.map(({ giorno, ultima }) => (
                  <AllenamentoCard
                    key={giorno.id}
                    giorno={giorno}
                    ultima={ultima}
                    onRipeti={() => rifai(giorno)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <button className="fab" onClick={() => navigate(routes.nuova())}>
        <IconPlus width={22} height={22} />
        Nuova scheda
      </button>
    </div>
  )
}
