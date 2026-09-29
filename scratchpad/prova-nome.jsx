// ---------------------------------------------------------------------------
// Cambiare il proprio NOME, con le dita, senza login e senza database.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-nome.html
//
// Monta i componenti VERI di "I miei dati" (ModificaNome e ModificaUsername)
// sopra lo store finto (scratchpad/finto-store-vivo.js), dove "Filippo" e
// "Nico" sono già presi. In cima il nome com'è adesso: deve cambiare appena
// si salva, non alla prossima apertura.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto, useAccount } from './finto-store-vivo.js'
import ModificaNome from '../src/components/ModificaNome.jsx'
import ModificaUsername from '../src/components/ModificaUsername.jsx'
import '../src/index.css'

impostaFinto({ io: { id: 'io', nome: 'capocchia', username: 'capocchia', dati: {} } })

function Banco() {
  const { utenteCorrente } = useAccount()
  return (
    <div className="app">
      <div className="topbar">
        <h1 data-prova="nome-attuale">{utenteCorrente.nome}</h1>
      </div>
      <div style={{ marginBottom: 14 }}>
        <ModificaNome />
      </div>
      <ModificaUsername />
    </div>
  )
}

createRoot(document.getElementById('radice')).render(
  <StrictMode>
    <Banco />
  </StrictMode>,
)
