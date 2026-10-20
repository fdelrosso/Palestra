import { App as AppNativa } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { avviaColori } from './lib/tema'
import { MESSAGGIO_PAROLE, installaFiltroLinguaggio } from './lib/linguaggio'

avviaColori()

// Nell'app Android il tasto indietro del telefono, di suo, chiude l'app. Qui
// fa quello che fa nel browser: torna di una voce nella cronologia (cosi'
// valgono anche le guardie di lib/router), ed esce solo quando dietro non c'e'
// piu' niente.
if (Capacitor.isNativePlatform()) {
  AppNativa.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else AppNativa.exitApp()
  })
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
