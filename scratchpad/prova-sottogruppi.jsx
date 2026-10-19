// ---------------------------------------------------------------------------
// I SOTTOGRUPPI sull'omino del recap, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-sottogruppi.html
//
// Alcuni allenamenti tipo col corpo VERO (components/CorpoAllenato): le
// pastiglie contano per gruppo, l'omino si accende per sottogruppo.
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import CorpoAllenato, { CorpoEsercizio } from '../src/components/CorpoAllenato.jsx'
import { gruppiAllenati } from '../src/lib/recap.js'
import '../src/index.css'

document.documentElement.dataset.tema = 'scuro'
const fatte = (n) => Array.from({ length: n }, () => ({ colore: 'verde' }))
const es = (nome, gruppi, n) => ({ nome, gruppi, sets: fatte(n) })

const GIORNATE = [
  ['Gambe: femorali e quadricipiti', [es('Leg curl seduto', ['gambe'], 4), es('Leg extension', ['gambe'], 3), es('Stacco rumeno', ['gambe', 'schiena'], 3)]],
  ['Spalle: laterali e posteriori', [es('Alzate laterali manubri', ['spalle'], 4), es('Alzate posteriori (rear delt)', ['spalle'], 3)]],
  ['Schiena: dorsali, romboidi, trapezio', [es('Lat machine avanti', ['schiena'], 4), es('Seal row', ['schiena'], 3), es('Rack pull', ['schiena'], 2)]],
  ['Gambe con un esercizio fuori libreria', [es('Leg curl seduto', ['gambe'], 3), es('Squat del mio PT', ['gambe'], 3)]],
]

function App() {
  return (
    <div className="app" style={{ padding: 16 }}>
      {GIORNATE.map(([titolo, esercizi]) => {
        const gruppi = gruppiAllenati(esercizi)
        return (
          <div key={titolo} className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginBottom: 8 }}>{titolo}</h3>
            <p className="muted" style={{ fontSize: 13 }}>{gruppi.map((g) => `${g.label} · ${g.serie}`).join('   ')}</p>
            <CorpoAllenato gruppi={gruppi} altezza={320} />
          </div>
        )
      })}
      <div className="card">
        <h3>Card di un esercizio: Stacco rumeno</h3>
        <CorpoEsercizio esercizio={{ nome: 'Stacco rumeno', gruppi: ['gambe', 'schiena'] }} altezza={140} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('radice')).render(<App />)
