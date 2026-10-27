// ---------------------------------------------------------------------------
// Il cardio come esercizio a tempo (116ª): una scheda col riscaldamento e lo
// stretching scritti come testo (restano testo), un tapis roulant a
// intervalli e un plank.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-cardio.html?p=scheda   (il giorno)
//   → http://localhost:5174/scratchpad/prova-cardio.html?p=editor   (l'editor della scheda)
//   → http://localhost:5174/scratchpad/prova-cardio.html?p=inizio   (la Home, l'allenamento di oggi)
//   → http://localhost:5174/scratchpad/prova-cardio.html?p=sessione (l'allenamento)
//   → http://localhost:5174/scratchpad/prova-cardio.html?p=esercizi[&g=gambe&tipo=stretching] (la libreria)
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { normalizzaScheda, nuovaScheda, nuovoEsercizio, nuovoGiorno } from '../src/data/model.js'
import { impostaFinto, useStore } from './finto-store-vivo.js'
import { creaSessione } from '../src/lib/session.js'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import EditorPage from '../src/pages/EditorPage.jsx'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import EserciziPage from '../src/pages/EserciziPage.jsx'
import InizioPage from '../src/pages/InizioPage.jsx'
import '../src/index.css'

const kg = (valore) => ({ tipo: 'kg', valore })
const giorno = nuovoGiorno({
  id: 'gA',
  nome: 'Giorno A',
  riscaldamento: 'Rotazioni spalle con elastico 2x10\nMobilità anche',
  stretching: 'Quadricipiti 30" per gamba\nPettorali al muro 30"',
  esercizi: [
    nuovoEsercizio({
      nome: 'Ellittica',
      gruppo: 'cardio',
      gruppi: ['cardio'],
      riscaldamento: true,
      schemaBase: { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null, parametri: { livello: 6 } }], recuperoSec: null, nota: '' },
    }),
    nuovoEsercizio({
      nome: 'Panca piana bilanciere',
      gruppo: 'petto',
      gruppi: ['petto'],
      schemaBase: { fasi: [{ serie: 5, rip: 5, carico: kg(60) }], recuperoSec: 120, nota: '' },
    }),
    nuovoEsercizio({
      nome: 'Plank',
      gruppo: 'addome',
      gruppi: ['addome'],
      schemaBase: { fasi: [{ serie: 3, rip: { sec: 45 }, carico: null }], recuperoSec: 60, nota: '' },
    }),
    nuovoEsercizio({
      nome: 'Tapis roulant (corsa)',
      gruppo: 'cardio',
      gruppi: ['cardio'],
      schemaBase: {
        fasi: [{ serie: 6, rip: { sec: 60 }, carico: null, parametri: { velocita: 14, pendenza: 1 } }],
        recuperoSec: 90,
        nota: '',
      },
    }),
  ],
})

const scheda = normalizzaScheda(nuovaScheda({ id: 's1', nome: 'Scheda con cardio', numeroSettimane: 4, giorni: [giorno] }))
const p = new URLSearchParams(location.search).get('p') || 'scheda'
impostaFinto({ schede: [scheda], sessione: p === 'sessione' ? creaSessione(scheda, scheda.giorni[0], 1) : null })

export function Banco() {
  const { sessione } = useStore()
  const [dentro, setDentro] = useState(false)
  if (sessione && !dentro) setDentro(true)
  if (p === 'editor') return <EditorPage id="s1" />
  if (p === 'inizio') return <InizioPage />
  if (p === 'esercizi') return <EserciziPage gruppo={new URLSearchParams(location.search).get('g') || undefined} />
  return dentro || sessione || p === 'sessione' ? <WorkoutSession /> : <SchedaPage id="s1" giorno="gA" />
}

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Banco />
  </StrictMode>,
)
