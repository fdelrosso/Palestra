// Il riscaldamento nel recap (116ª): la card del post, col riscaldamento
// scritto e un cardio di riscaldamento. `?spento=1` spegne la voce, `?solo=1`
// toglie il cardio (resta solo "Riscaldamento").
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-recap-risc.html
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto } from './finto-store-vivo.js'
import RecapPost from '../src/components/RecapPost.jsx'
import '../src/index.css'

const q = new URLSearchParams(location.search)
const ellittica = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null, parametri: { livello: 6 } }], recuperoSec: null, nota: '' }
const panca = { fasi: [{ serie: 4, rip: 8, carico: { tipo: 'kg', valore: 70 } }], recuperoSec: 120, nota: '' }
const voce = {
  data: new Date().toISOString(),
  nomeScheda: 'Scheda di prova',
  settimana: 1,
  durataSec: 3600,
  riscaldamento: true,
  recap: q.get('spento') ? { nascosti: ['riscaldamento'] } : null,
  esercizi: [
    ...(q.get('solo')
      ? []
      : [{ nome: 'Ellittica', gruppo: 'cardio', gruppi: ['cardio'], tipo: 'cardio', riscaldamento: true, schema: ellittica, sets: [{ colore: 'fatto', sec: 600 }] }]),
    { nome: 'Panca piana', gruppo: 'petto', gruppi: ['petto'], schema: panca, sets: ['verde', 'verde', 'giallo', 'rosso'].map((colore) => ({ colore })) },
  ],
}
impostaFinto({ schede: [], sessione: null })

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <div style={{ padding: 16 }}>
      <RecapPost voce={voce} />
    </div>
  </StrictMode>,
)
