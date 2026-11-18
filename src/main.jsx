import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './desktop.css'
import App from './App.jsx'
import { avviaColori } from './lib/tema'
import { installaNativo } from './lib/nativo'
import { MESSAGGIO_PAROLE, installaFiltroLinguaggio } from './lib/linguaggio'

avviaColori()

// Quale pubblicazione gira (si legge da chrome://inspect). Cambiarla basta a
// fare una versione nuova senza toccare niente: serve a provare l'aggiornamento
// all'avvio (components/AggiornamentoApp).
document.documentElement.dataset.versione = '166-prova-aggiornamento'

// Nell'app Android: tasto indietro, condivisione e download (lib/nativo).
installaNativo()

// Vercel Web Analytics: visite anonime, senza cookie (lo dice /privacy, punto 2).
// Lo script esiste solo su Vercel, non in `npm run dev`. L'app Android apre il
// sito (capacitor.config.json, server.url), quindi conta anche le sue visite.
if (import.meta.env.PROD) {
  const s = document.createElement('script')
  s.defer = true
  s.src = '/_vercel/insights/script.js'
  document.head.appendChild(s)
}

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
