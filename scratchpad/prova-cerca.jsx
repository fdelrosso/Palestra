// ---------------------------------------------------------------------------
// CERCA, coi consigli d'amicizia finti (2026-10-20): 19 persone, 8 alla volta.
//   → http://localhost:5174/scratchpad/prova-cerca.html
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto } from './finto-store-vivo.js'
import CercaPage from '../src/pages/CercaPage.jsx'
import '../src/index.css'

document.documentElement.dataset.tema = 'scuro'
impostaFinto({
  suggeriti: Array.from({ length: 19 }, (_, i) => ({
    id: 'p' + (i + 1),
    nome: 'Persona ' + (i + 1),
    // Uno senza username (il quarto): resta col solo nome.
    username: i === 3 ? '' : 'persona.' + (i + 1),
    motivo: "ha tanti amici sull'app",
    amici_in_comune: i < 3 ? 3 - i : 0,
  })),
})

createRoot(document.getElementById('radice')).render(
  <StrictMode>
    <CercaPage />
  </StrictMode>,
)
