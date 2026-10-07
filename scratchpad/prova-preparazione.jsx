// ---------------------------------------------------------------------------
// Riscaldamento/mobilità e stretching del giorno, con le dita, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-preparazione.html
//
// Si parte dall'editor di una scheda NUOVA (EditorPage): i due campi sono
// tasti "+ …" facoltativi; "+ Giorno" copia quelli del giorno prima. Salvando
// si passa alla scheda (anteprima del giorno, "Modifica esercizi"), e da lì
// "Inizia allenamento" apre la sessione con le voci da spuntare.
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto, useStore } from './finto-store-vivo.js'
import EditorPage from '../src/pages/EditorPage.jsx'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import '../src/index.css'

impostaFinto({ schede: [], sessione: null })

export function Banco() {
  const { schede, sessione } = useStore()
  const [dentro, setDentro] = useState(false)
  if (sessione && !dentro) setDentro(true)
  if (dentro || sessione) return <WorkoutSession />
  return schede.length ? <SchedaPage id={schede[0].id} /> : <EditorPage id={null} />
}

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Banco />
  </StrictMode>,
)
