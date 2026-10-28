// ---------------------------------------------------------------------------
// L'allenamento libero che parte vuoto (pages/NuovoAllenamentoPage): la
// sessione di un giorno senza esercizi nella scheda-contenitore `libera`, e
// la card "Aggiungi" in fondo alla pista.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-libero.html          (l'allenamento, vuoto)
//   → http://localhost:5174/scratchpad/prova-libero.html?p=nuovo  (Nuovo allenamento, l'editor)
//   → http://localhost:5174/scratchpad/prova-libero.html?p=programmi  (un salvato in Programmi)
//   → http://localhost:5174/scratchpad/prova-libero.html?p=inizio     (la Home, col salvato messo oggi)
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { normalizzaScheda, nuovaScheda, nuovoGiorno } from '../src/data/model.js'
import { impostaFinto, leggiFinto } from './finto-store-vivo.js'
import { creaSessione } from '../src/lib/session.js'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import NuovoAllenamentoPage from '../src/pages/NuovoAllenamentoPage.jsx'
import HomePage from '../src/pages/HomePage.jsx'
import InizioPage from '../src/pages/InizioPage.jsx'
import { conModifica } from '../src/lib/pianoScheda.js'
import { nuovoEsercizio } from '../src/data/model.js'
import '../src/index.css'

const giorno = nuovoGiorno({ id: 'gL', tipo: 'workout', nome: 'Allenamento libero', esercizi: [], salvato: false })
const scheda = normalizzaScheda(
  nuovaScheda({ id: 'sL', nome: 'Allenamenti consigliati', libera: true, numeroSettimane: 1, giorni: [giorno] }),
)
const p = new URLSearchParams(location.search).get('p') || ''
// Un salvato ("Petto veloce") e una scheda attiva vera, per il calendario.
const salvato = nuovoGiorno({
  id: 'gS',
  nome: 'Petto veloce',
  salvato: true,
  riscaldamento: 'Rotazioni spalle',
  esercizi: [nuovoEsercizio({ nome: 'Panca piana bilanciere', gruppo: 'petto', gruppi: ['petto'], schemaBase: { fasi: [{ serie: 4, rip: 8, carico: { tipo: 'kg', valore: 60 } }], recuperoSec: 120, nota: '' } })],
})
const giornoA = nuovoGiorno({ id: 'gA', nome: 'Gambe', esercizi: [nuovoEsercizio({ nome: 'Squat', gruppo: 'gambe', gruppi: ['gambe'] })] })
let attiva = normalizzaScheda(nuovaScheda({ id: 'sA', nome: 'Scheda di prova', numeroSettimane: 4, giorni: [giornoA], attiva: true }))
if (p === 'inizio') attiva = conModifica(attiva, new Date(), { tipo: 'allenamento', schedaId: 'sL', giornoId: 'gS', nome: 'Petto veloce' })
const conSalvato = { ...scheda, giorni: [...scheda.giorni, salvato] }
impostaFinto({
  schede: p ? [conSalvato, attiva] : [scheda],
  sessione: p ? null : creaSessione(scheda, scheda.giorni[0], 1),
})
// Per lo script: com'è il giorno nella scheda dopo le aggiunte.
window.leggiFinto = leggiFinto

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    {p === 'nuovo' ? (
      <NuovoAllenamentoPage />
    ) : p === 'modifica' ? (
      <NuovoAllenamentoPage id="gS" />
    ) : p === 'programmi' ? (
      <HomePage />
    ) : p === 'inizio' ? (
      <InizioPage />
    ) : (
      <WorkoutSession />
    )}
  </StrictMode>,
)
