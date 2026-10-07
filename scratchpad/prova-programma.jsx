// ---------------------------------------------------------------------------
// Il PROGRAMMA della scheda sul calendario (lib/pianoScheda), senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-programma.html
//
// Scheda A/B/C su tre giorni della settimana scelti attorno a oggi: A fatto
// 5 giorni fa, B (2 giorni fa) saltato, oggi in programma C → la card dice
// "Oggi C, ma potresti riprendere da B che hai saltato". Con ?riposo oggi
// non è un giorno di allenamento → "Oggi sarebbe riposo, ma potresti
// recuperare B che hai saltato".
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { indiceSettimana, nuovaScheda, nuovoGiorno } from '../src/data/model.js'
import { impostaFinto } from './finto-store-vivo.js'
import CalendarPage from '../src/pages/CalendarPage.jsx'
import '../src/index.css'

const fa = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(18, 0, 0, 0)
  return d
}
const riposo = new URLSearchParams(location.search).has('riposo')
const giorni = ['A', 'B', 'C'].map((n) => nuovoGiorno({ nome: `Giorno ${n}` }))
const chip = (riposo ? [5, 2, -2] : [5, 2, 0]).map((n) => indiceSettimana(fa(n)))

const scheda = nuovaScheda({
  id: 's1',
  nome: 'Forza 3 giorni',
  numeroSettimane: 4,
  giorniSettimana: [...new Set(chip)].sort(),
  giorni,
  completamenti: [
    { schedaId: 's1', settimana: 1, giornoId: giorni[0].id, nomeGiorno: 'Giorno A', data: fa(5).toISOString() },
  ],
  creataIl: fa(10).toISOString(),
})

impostaFinto({ schede: [scheda], sessione: null })

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <CalendarPage />
  </StrictMode>,
)
