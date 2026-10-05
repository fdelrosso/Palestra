import { navigate, goBack, routes } from '../lib/router'
import { IconBack, IconChevron } from '../components/icons'

export default function NewSchedaPage() {
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack}>
          <IconBack />
        </button>
        <h1>Nuova scheda</h1>
      </div>

      <p className="muted" style={{ margin: '6px 2px 16px', lineHeight: 1.4 }}>
        Come vuoi crearla?
      </p>

      <div className="stack">
        <button className="choice-card" onClick={() => navigate(routes.importa())}>
          <span className="choice-emoji">📋</span>
          <span className="grow" style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>Importa da testo</span>
            <span className="muted" style={{ fontSize: 13.5 }}>
              Incolla la scheda — dal PT, da un’AI o scritta da te — e l’app la legge.
            </span>
          </span>
          <IconChevron className="faint" />
        </button>

        <button className="choice-card" onClick={() => navigate(routes.editor(null))}>
          <span className="choice-emoji">✏️</span>
          <span className="grow" style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>Crea manualmente</span>
            <span className="muted" style={{ fontSize: 13.5 }}>
              Cerca gli esercizi e imposta serie, ripetizioni e recupero.
            </span>
          </span>
          <IconChevron className="faint" />
        </button>
      </div>
    </div>
  )
}
