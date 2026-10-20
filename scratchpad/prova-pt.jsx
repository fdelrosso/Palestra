// ---------------------------------------------------------------------------
// IL LATO PT, senza login (2026-10-20).
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-pt.html
//
// In alto si cambia chi si è: il PT (Lavoro, atleti, scheda da mandare,
// vetrina) o Mario, il suo atleta (la scheda in arrivo in Home e Programmi).
// Proposte e vetrina stanno in memoria (finte-proposte, finta-vetrina):
// cambiando persona restano, ricaricando si perdono.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto, leggiFinto, useAccount } from './finto-store-vivo.js'
import { impostaCollettivo } from './finto-collettivo.js'
import { navigate, routes, useRoute } from '../src/lib/router.js'
import LavoroPage from '../src/pages/LavoroPage.jsx'
import AtletiPage from '../src/pages/AtletiPage.jsx'
import EditorPage from '../src/pages/EditorPage.jsx'
import ImportPage from '../src/pages/ImportPage.jsx'
import VetrinaPtPage from '../src/pages/VetrinaPtPage.jsx'
import SchedeLavoroPage from '../src/pages/SchedeLavoroPage.jsx'
import SchedaLavoroPage from '../src/pages/SchedaLavoroPage.jsx'
import HomePage from '../src/pages/HomePage.jsx'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import VetrinaPt from '../src/components/VetrinaPt.jsx'
import '../src/index.css'

document.documentElement.dataset.tema = 'scuro'

const PT = { id: 'pt', nome: 'Filippo', username: 'filippo', ruolo: 'pt', codicePt: 'FIL123', dati: {} }
const MARIO = { id: 'mario', nome: 'Mario', username: 'mario', ruolo: 'atleta', ptId: 'pt', dati: {} }
const GIULIA = { id: 'giulia', nome: 'Giulia', username: 'giulia', ruolo: 'atleta', ptId: 'pt', dati: {} }

const giornoA = nuovoGiorno({
  nome: 'Giorno A',
  esercizi: [
    nuovoEsercizio({ nome: 'Panca piana bilanciere', gruppi: ['petto'], gruppo: 'petto', schemaBase: schemaVuoto({ serie: 4, rip: 8 }) }),
    nuovoEsercizio({ nome: 'Squat bilanciere', gruppi: ['gambe'], gruppo: 'gambe', schemaBase: schemaVuoto({ serie: 5, rip: 5 }) }),
  ],
})
const giorni = Date.now()
const fa = (n) => new Date(giorni - n * 86400000).toISOString()
const schedaMario = nuovaScheda({ id: 'sm', nome: 'Forza base', visibilita: 'solo-pt', numeroSettimane: 6, settimanaCorrente: 3, attiva: true, giorni: [giornoA], creataIl: fa(20) })
const schedaGiulia = nuovaScheda({ id: 'sg', nome: 'Ipertrofia 4gg', visibilita: 'pubblica', numeroSettimane: 4, settimanaCorrente: 4, attiva: true, giorni: [giornoA, nuovoGiorno({ nome: 'B' }), nuovoGiorno({ nome: 'C' })], creataIl: fa(30) })
const fatto = (u, s, n) => ({ utenteId: u.id, utenteNome: u.nome, schedaId: s.id, completamento: { data: fa(n), nomeGiorno: 'Giorno A', visibilita: 'solo-pt', esercizi: [] } })
impostaCollettivo(
  [fatto(MARIO, schedaMario, 9), fatto(MARIO, schedaMario, 12), fatto(GIULIA, schedaGiulia, 1), fatto(GIULIA, schedaGiulia, 3)],
  [{ utenteId: 'mario', scheda: schedaMario }, { utenteId: 'giulia', scheda: schedaGiulia }],
)

// Le schede "mie" di ciascuno: quelle del PT (da cui partire) e quelle di Mario.
const mie = { pt: [nuovaScheda({ id: 'base-pt', nome: 'Full body principianti', giorni: [giornoA] })], mario: [schedaMario] }
let chi = null
function sii(persona) {
  if (chi) mie[chi.id] = leggiFinto().schede
  chi = persona
  window.__io = persona.id
  impostaFinto(
    persona.id === 'pt'
      ? { io: PT, mieiAtleti: [MARIO, GIULIA], mioPt: null, schede: mie.pt }
      : { io: MARIO, mieiAtleti: [], mioPt: PT, schede: mie.mario },
  )
  navigate(persona.id === 'pt' ? routes.lavoro() : routes.home())
}

function Pagina() {
  const r = useRoute()
  switch (r.name) {
    case 'lavoro': return <LavoroPage />
    case 'atleti': return <AtletiPage key={r.id || ''} id={r.id} />
    case 'scheda-per-atleta': return <EditorPage key={'pt-' + r.id} perAtleta={r.id} />
    case 'importa-per-atleta': return <ImportPage perAtleta={r.id} />
    case 'vetrina-pt': return <VetrinaPtPage />
    case 'schede-lavoro': return <SchedeLavoroPage />
    case 'scheda-lavoro': return <SchedaLavoroPage key={r.id} id={r.id} />
    case 'importa-lavoro': return <ImportPage perLavoro />
    case 'scheda': return <SchedaPage id={r.id} />
    case 'utente': return <div className="app"><h1>Pagina di {r.id}</h1><VetrinaPt id={r.id} mia /></div>
    default: return <HomePage />
  }
}

function Barra() {
  const { utenteCorrente } = useAccount()
  return (
    <div style={{ display: 'flex', gap: 8, padding: 8, background: '#222' }}>
      <button id="sono-pt" className="btn btn-sm" onClick={() => sii({ id: 'pt' })}>Sono il PT</button>
      <button id="sono-mario" className="btn btn-sm" onClick={() => sii({ id: 'mario' })}>Sono Mario</button>
      <span style={{ color: '#aaa', alignSelf: 'center' }}>ora: {utenteCorrente?.nome}</span>
    </div>
  )
}

createRoot(document.getElementById('radice')).render(
  <StrictMode>
    <Barra />
    <Pagina />
  </StrictMode>,
)
sii({ id: 'pt' })
