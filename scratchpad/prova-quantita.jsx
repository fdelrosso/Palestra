// ---------------------------------------------------------------------------
// Il pannello "Cosa hai mangiato", DA SOLO, in un browser vero.
//
//   npm run dev  →  http://localhost:5173/scratchpad/prova-quantita.html
//
// Perché esiste: scratchpad/prova-dieta.mjs disegna le pagine ma non le TOCCA
// — in SSR non c'è nessuno che clicca, e i problemi della quantità sono tutti
// problemi di dita: svuotare il campo e ritrovarci uno zero, cambiare unità e
// vedere "150 pezzi", chiedere i pezzi di un prodotto che non si sa quanto
// pesa. Quelle cose si vedono solo provandole.
//
// Il pannello non ha bisogno né dello store né del login: vuole quattro props
// e basta. Quindi si monta qui con dei cibi miei finti, e si guarda.
//
// ⚠️ La fotocamera e la ricerca online funzionano davvero anche qui: il
// codice a barre chiede il permesso alla fotocamera (su localhost il browser
// lo concede) e la ricerca va su Open Food Facts sul serio.
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AggiungiMangiato from '../src/components/AggiungiMangiato.jsx'
import { aggiungiCiboMio, normalizzaCiboMio } from '../src/lib/cibiMiei.js'
import '../src/index.css'

// Due cibi "miei": uno di cui si sa quanto pesa un pezzo, e uno no — che è il
// caso interessante (i biscotti appena scansionati).
const INIZIALI = [
  normalizzaCiboMio({
    nome: 'Skyr alla vaniglia',
    marca: 'Lidl',
    m: { p: 11, c: 6, g: 0.2 },
    pezzo: 150,
  }),
  normalizzaCiboMio({
    nome: 'Biscotti della X',
    marca: 'Forno Y',
    codice: '8001234567890',
    m: { p: 7, c: 75, g: 12 },
  }),
]

// Esportata anche se la usa solo questo file: un modulo che dichiara un
// componente e non esporta niente fa storcere il naso a oxlint, e le quattro
// righe di avviso di sempre devono restare quattro.
export function Prova() {
  const [cibi, setCibi] = useState(INIZIALI)
  const [salvate, setSalvate] = useState([])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Cosa hai mangiato</h2>
      <p className="vis-hint">
        Prove da fare: svuotare il campo della quantità (non deve restare uno zero), passare da g a
        pezzi su «Skyr» (150 → 1) e su «Biscotti» (che chiede quanto pesa un pezzo).
      </p>

      <AggiungiMangiato
        cibiMiei={cibi}
        onRicorda={(c) => setCibi((lista) => aggiungiCiboMio(lista, c))}
        onAggiungi={(voci) => setSalvate((s) => [...s, ...voci])}
        onChiudi={() => setSalvate([])}
      />

      <h3>Quello che ha salvato</h3>
      <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(salvate, null, 1) || 'niente'}
      </pre>
      <h3>I miei cibi, adesso</h3>
      <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {cibi.map((c) => `${c.nome} — un pezzo: ${c.pezzo ?? 'non si sa'}`).join('\n')}
      </pre>
    </div>
  )
}

// ⚠️ La radice si crea UNA volta sola: Vite ri-esegue questo file a ogni
// salvataggio, e un createRoot() in più sullo stesso nodo riempie la console
// di errori di React che non c'entrano niente con quello che si sta provando.
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Prova />
  </StrictMode>,
)
