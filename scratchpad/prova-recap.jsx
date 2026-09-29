// ---------------------------------------------------------------------------
// Il RECAP A BLOCCHI con le dita, in un browser vero, senza login.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-recap.html
//
// Monta il CALENDARIO vero sopra lo store finto, con un allenamento di oggi
// già fatto (pallini, carichi, un commento, il battito). Si tocca oggi, poi
// "Apri il recap da condividere": lì ci sono "Modifica" (spunte e ↑ ↓) e il
// tasto WhatsApp. Il layout scelto si salva sul completamento finto, e
// riaprendo il recap deve essere ancora quello.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto } from './finto-store-vivo.js'
import CalendarPage from '../src/pages/CalendarPage.jsx'
import '../src/index.css'

const sc = (serie, ripetizioni, carico = '', recupero = '') =>
  schemaVuoto({ serie, ripetizioni, carico, recupero })

const esercizi = [
  ['Panca piana', 'petto', sc('4', '8', '70kg', '2min'), ['verde', 'verde', 'giallo', 'rosso']],
  ['Lat machine', 'schiena', sc('4', '10', '55kg', '1,30min'), ['verde', 'giallo', 'giallo', 'giallo']],
  ['Curl manubri', 'bicipiti', sc('3', '12', '2x14kg', '1min'), ['verde', 'verde', 'giallo']],
  ['Push down', 'tricipiti', sc('3', '12', '25kg', '1min'), ['giallo', 'rosso', null]],
]

const giorno = nuovoGiorno({
  nome: 'Giorno A',
  esercizi: esercizi.map(([nome, gruppo, schemaBase]) => nuovoEsercizio({ nome, gruppo, gruppi: [gruppo], schemaBase })),
})

const fine = new Date()
fine.setMinutes(fine.getMinutes() - 5)

const scheda = nuovaScheda({
  id: 's1',
  nome: 'Scheda di prova',
  numeroSettimane: 4,
  giorni: [giorno],
  completamenti: [
    {
      schedaId: 's1',
      nomeScheda: 'Scheda di prova',
      settimana: 1,
      giornoId: giorno.id,
      nomeGiorno: 'Giorno A',
      data: fine.toISOString(),
      durataSec: 62 * 60,
      nota: 'Panca pesante oggi, ma chiusa.',
      fcMedia: 128,
      fcMax: 171,
      esercizi: esercizi.map(([nome, gruppo, schema, colori]) => ({
        nome,
        gruppo,
        gruppi: [gruppo],
        schema,
        sets: colori.map((colore) => ({ colore })),
      })),
    },
  ],
})

impostaFinto({ schede: [scheda], sessione: null })

// Una radice sola anche quando Vite ricarica il modulo dopo un salvataggio.
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <CalendarPage />
  </StrictMode>,
)
