// ---------------------------------------------------------------------------
// "Esporta i progressi" / "Esporta la scheda" (PDF o Excel), senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-risultati.html          (in corso)
//   → http://localhost:5174/scratchpad/prova-risultati.html?finita   (completata)
//
// La scheda d'esempio dell'app con tre settimane fatte (pesi che salgono,
// pallini a caso ma sempre gli stessi); con `?finita` tutte e cinque, e il
// riquadro "Scheda completata" col tasto del recap. In fondo alla pagina i due
// tasti: i risultati e la scheda.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { schedaEsempio } from '../src/data/seed.js'
import { normalizzaScheda } from '../src/data/model.js'
import { creaSessione, riepilogoSessione, serieChiusa } from '../src/lib/session.js'
import { impostaFinto } from './finto-store-vivo.js'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import '../src/index.css'

const finita = new URLSearchParams(location.search).has('finita')
const scheda = normalizzaScheda({ ...schedaEsempio(), id: 's1' })
let seme = 7
const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647
const completamenti = []
let quando = new Date(2026, 8, 7, 18, 30)
const settimane = finita ? scheda.numeroSettimane : 3
for (let w = 1; w <= settimane; w++) {
  for (const g of scheda.giorni.filter((x) => x.tipo === 'workout')) {
    const s = creaSessione(scheda, g, w)
    s.inizio = new Date(quando.getTime() - 3600e3).toISOString()
    for (const es of s.esercizi) {
      es.sets = es.sets.map((_, j) => {
        const r = caso()
        const colore = r < 0.55 ? 'verde' : r < 0.85 ? 'giallo' : 'rosso'
        const base = serieChiusa(es.schema, j, colore)
        return base.kg != null ? { ...base, kg: base.kg + (w - 1) * 2.5 } : base
      })
    }
    completamenti.push(riepilogoSessione(s, quando.toISOString()))
    quando = new Date(quando.getTime() + 2 * 86400e3)
  }
}
impostaFinto({
  schede: [{ ...scheda, settimanaCorrente: finita ? scheda.numeroSettimane : 4, completamenti }],
  sessione: null,
})

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <SchedaPage id="s1" />
  </StrictMode>,
)
