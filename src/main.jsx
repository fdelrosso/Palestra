import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { avviaColori } from './lib/tema'
import { installaNativo } from './lib/nativo'
import { MESSAGGIO_PAROLE, installaFiltroLinguaggio } from './lib/linguaggio'

avviaColori()

// Nell'app Android: tasto indietro, condivisione e download (lib/nativo).
installaNativo()

// Parolacce, bestemmie e offese si coprono in OGNI campo di testo dell'app,
// mentre si scrive (lib/linguaggio). Un avviso in basso dice perché.
let timerAvviso = null
installaFiltroLinguaggio({
  onCoperto: () => {
    let el = document.getElementById('avviso-parole')
    if (!el) {
      el = document.createElement('div')
      el.id = 'avviso-parole'
      el.className = 'avviso-parole'
      el.setAttribute('role', 'status')
      document.body.appendChild(el)
    }
    el.textContent = MESSAGGIO_PAROLE
    el.classList.add('visibile')
    clearTimeout(timerAvviso)
    timerAvviso = setTimeout(() => el.classList.remove('visibile'), 3000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
