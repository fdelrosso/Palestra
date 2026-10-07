// ---------------------------------------------------------------------------
// Glutei e polpacci come gruppi loro (38a), a schermo, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-gruppi.html             (corpo + Esercizi)
//   → http://localhost:5174/scratchpad/prova-gruppi.html?gruppo=glutei
//
// In cima il corpo del recap con gambe, glutei e polpacci accesi a intensità
// diverse (da dietro devono essere tre zone distinte); sotto la sezione
// Esercizi, l'elenco dei gruppi o il dettaglio di quello in `?gruppo=`.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto } from './finto-store-vivo.js'
import CorpoAllenato from '../src/components/CorpoAllenato.jsx'
import EserciziPage from '../src/pages/EserciziPage.jsx'
import '../src/index.css'

impostaFinto({ schede: [], sessione: null })

const gruppo = new URLSearchParams(location.search).get('gruppo') || ''

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <div className="app" style={{ paddingBottom: 0 }}>
      <CorpoAllenato
        gruppi={[
          { id: 'gambe', serie: 12 },
          { id: 'glutei', serie: 8 },
          { id: 'polpacci', serie: 4 },
        ]}
      />
    </div>
    <EserciziPage gruppo={gruppo} />
  </StrictMode>,
)
