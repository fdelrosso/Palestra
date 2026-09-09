import { useStore } from '../store/StoreContext'
import { statoScheda } from '../lib/progression'
import { navigate, routes } from '../lib/router'
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

export default function HomePage() {
  const { schede, sessione } = useStore()
  // La scheda-contenitore degli allenamenti liberi/consigliati non va in elenco.
  const mieSchede = schede.filter((s) => !s.libera)

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
        <h1>Le mie schede</h1>
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

      {mieSchede.length === 0 ? (
        <div className="empty">
          <div className="big">🏋️</div>
          <p>
            Ancora nessuna scheda.
            <br />
            Tocca <strong>Nuova scheda</strong> per crearne una.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 6 }}>
          {mieSchede.map((s) => (
            <SchedaCard key={s.id} scheda={s} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => navigate(routes.nuova())}>
        <IconPlus width={22} height={22} />
        Nuova scheda
      </button>
    </div>
  )
}
