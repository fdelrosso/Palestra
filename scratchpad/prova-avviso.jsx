// ---------------------------------------------------------------------------
// L'AVVISO DEI SOTTOGRUPPI, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-avviso.html
//
// Una scheda salvata coi gruppi di prima (stacco rumeno "schiena", dip
// "petto", squat "gambe") e un allenamento fatto: l'avviso deve comparire, e
// "Modifica" → "Applica" deve aggiornare scheda e allenamento.
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno } from '../src/data/model.js'
import { impostaFinto, useStore } from './finto-store-vivo.js'
import AvvisoSottogruppi from '../src/components/AvvisoSottogruppi.jsx'
import '../src/index.css'

document.documentElement.dataset.tema = 'scuro'
const es = (nome, gruppi) => nuovoEsercizio({ nome, gruppi, gruppo: gruppi[0] })
const giorno = nuovoGiorno({
  nome: 'Giorno A',
  esercizi: [
    es('Stacco rumeno', ['schiena']),
    es('Dips alle parallele (petto)', ['petto']),
    es('Squat bilanciere', ['gambe']),
    es('Panca piana bilanciere', ['petto']),
  ],
})
const scheda = nuovaScheda({
  nome: 'Scheda vecchia',
  giorni: [giorno],
  completamenti: [
    { settimana: 1, giornoId: giorno.id, data: '2026-10-01T10:00:00Z', esercizi: [{ nome: 'Stacco rumeno', gruppo: 'schiena', gruppi: ['schiena'], sets: [] }] },
  ],
})
impostaFinto({ schede: [scheda] })

function Stato() {
  const { schede, preferenze } = useStore()
  return (
    <pre id="stato" style={{ color: 'white', fontSize: 12, padding: 16 }}>
      {JSON.stringify(
        {
          giorno: schede[0].giorni[0].esercizi.map((e) => [e.nome, e.gruppi]),
          fatto: schede[0].completamenti[0].esercizi.map((e) => [e.nome, e.gruppi]),
          avvisi: preferenze.avvisi,
        },
        null,
        1,
      )}
    </pre>
  )
}

createRoot(document.getElementById('radice')).render(
  <div className="app">
    <Stato />
    <AvvisoSottogruppi />
  </div>,
)
