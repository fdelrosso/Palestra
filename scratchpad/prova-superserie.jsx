// ---------------------------------------------------------------------------
// Le SUPERSERIE con le dita, in un browser vero, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-superserie.html
//
// Monta le pagine VERE — la scheda (anteprima del giorno e "Modifica
// esercizi") e l'allenamento — sopra lo store finto di
// scratchpad/finto-store-vivo.js. Si apre il Giorno C, si guarda il riquadro
// della superserie, si entra in modifica (interruttore, frecce, cestino) e si
// preme "Inizia allenamento" per fare un giro A1 → B1 → A2 → B2.
//
// Il Giorno C ha di proposito:
//   - una superserie con serie DIVERSE (4 + 3): il quarto giro è solo di A;
//   - una superserie col recupero scritto solo sull'ULTIMO esercizio;
//   - esercizi da soli prima e dopo, che devono restare come sempre.
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto, useStore } from './finto-store-vivo.js'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import '../src/index.css'

const sc = (serie, ripetizioni, carico = '', recupero = '') =>
  schemaVuoto({ serie, ripetizioni, carico, recupero })

const giornoC = nuovoGiorno({
  nome: 'Giorno C',
  esercizi: [
    nuovoEsercizio({ nome: 'Panca inclinata', gruppo: 'petto', gruppi: ['petto'], schemaBase: sc('3', '8', '60kg', '2min') }),
    nuovoEsercizio({ nome: 'Lat machine presa inversa', gruppo: 'schiena', gruppi: ['schiena'], nota: '12rm', schemaBase: sc('4', '8', '55kg', '') }),
    nuovoEsercizio({ nome: 'Curl martello', gruppo: 'bicipiti', gruppi: ['bicipiti'], insiemeAlPrecedente: true, schemaBase: sc('3', '10', '14kg', '1,30min') }),
    nuovoEsercizio({ nome: 'Push down', gruppo: 'tricipiti', gruppi: ['tricipiti'], schemaBase: sc('3', '12', '25kg', '') }),
    nuovoEsercizio({ nome: 'Pek back', gruppo: 'spalle', gruppi: ['spalle'], insiemeAlPrecedente: true, schemaBase: sc('3', '12', '30kg', '1min') }),
    nuovoEsercizio({ nome: 'Crunch', gruppo: 'addome', gruppi: ['addome'], schemaBase: sc('3', '15', '', '45"') }),
  ],
})

const scheda = nuovaScheda({
  id: 's1',
  nome: 'Scheda di prova',
  numeroSettimane: 1,
  giorni: [giornoC],
})

impostaFinto({ schede: [scheda], sessione: null })

// Una volta partito l'allenamento si resta sulla sua pagina anche quando la
// sessione si chiude: è lì che compare il riepilogo di fine allenamento.
export function Banco() {
  const { sessione } = useStore()
  const [dentro, setDentro] = useState(false)
  if (sessione && !dentro) setDentro(true)
  return dentro || sessione ? <WorkoutSession /> : <SchedaPage id="s1" />
}

// Una radice sola anche quando Vite ricarica il modulo dopo un salvataggio.
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Banco />
  </StrictMode>,
)
