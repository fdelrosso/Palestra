// ---------------------------------------------------------------------------
// Il consiglio sul peso per lo schema di OGGI, e lo storico con "le ultime N".
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-carico.html
//
// Si entra nella settimana 2 di una scheda finta: lo squat la settimana 1 era
// 5×5 a 100 kg tutto verde e oggi è 2×10 (prima il consiglio diceva 105 kg);
// la panca era 3×10 a 60 kg al punto giusto e la scheda oggi dice 65 kg; il
// military è a fasi. Lo squat ha 8 volte nello storico, per il −/+.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto } from './finto-store-vivo.js'
import { creaSessione } from '../src/lib/session.js'
import { normalizzaScheda, nuovaScheda, nuovoEsercizio, nuovoGiorno } from '../src/data/model.js'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import '../src/index.css'

const kg = (valore) => ({ tipo: 'kg', valore })
const schema = (serie, rip, carico = null, nota = '') => ({ fasi: [{ serie, rip, carico }], recuperoSec: 120, nota })
const serie = (colori, peso, rip) => colori.map((colore) => ({ colore, kg: peso, rip }))
const V = (n) => Array(n).fill('verde')
const G = (n) => Array(n).fill('giallo')

const squat = nuovoEsercizio({
  nome: 'Squat',
  gruppo: 'gambe',
  gruppi: ['gambe'],
  variaPerSettimana: true,
  settimane: [schema(5, 5, kg(100)), schema(2, 10), schema(4, 6, kg(100), 'ultima a cedimento')],
})
const panca = nuovoEsercizio({
  nome: 'Panca piana',
  gruppo: 'petto',
  gruppi: ['petto'],
  variaPerSettimana: true,
  settimane: [schema(3, 10, kg(60)), schema(3, 10, kg(65))],
})
const military = nuovoEsercizio({
  nome: 'Military press',
  gruppo: 'spalle',
  gruppi: ['spalle'],
  schemaBase: { fasi: [{ serie: 3, rip: 5, carico: kg(50) }, { serie: 2, rip: 2, carico: kg(57.5) }], recuperoSec: 180, nota: '' },
})
const giorno = nuovoGiorno({ nome: 'A', esercizi: [squat, panca, military] })

// Le volte passate dello squat: otto, dalla più vecchia; l'ultima è la sett 1.
const giorni = (n) => new Date(Date.UTC(2026, 9, 1) - n * 86400000).toISOString()
const passate = [
  [49, schema(4, 8, kg(85)), serie(G(4), 85, 8)],
  [42, schema(4, 8, kg(87.5)), serie(G(4), 87.5, 8)],
  [35, schema(3, 6, kg(92.5)), serie(G(3), 92.5, 6)],
  [28, schema(3, 6, kg(95)), serie(['giallo', 'giallo', 'rosso'], 95, 6)],
  [21, schema(5, 5, kg(95)), serie(G(5), 95, 5)],
  [14, schema(5, 5, kg(97.5)), serie(['verde', 'giallo', 'giallo', 'giallo', 'giallo'], 97.5, 5)],
  [7, schema(3, 3, kg(105)), serie(G(3), 105, 3)],
  [0, schema(5, 5, kg(100)), serie(V(5), 100, 5)],
]
const completamenti = passate.map(([n, sc, sets], i) => ({
  settimana: 1,
  giornoId: giorno.id,
  data: giorni(n),
  esercizi: [
    { nome: 'Squat', gruppo: 'gambe', schema: sc, sets },
    ...(i === passate.length - 1
      ? [
          { nome: 'Panca piana', gruppo: 'petto', schema: schema(3, 10, kg(60)), sets: serie(G(3), 60, 10) },
          {
            nome: 'Military press',
            gruppo: 'spalle',
            schema: military.schemaBase,
            sets: [...serie(V(3), 50, 5), ...serie(G(2), 57.5, 2)],
          },
        ]
      : []),
  ],
}))

const scheda = normalizzaScheda(
  nuovaScheda({ nome: 'Forza', numeroSettimane: 3, settimanaCorrente: 2, giorni: [giorno], completamenti }),
)
impostaFinto({ schede: [scheda], sessione: creaSessione(scheda, scheda.giorni[0], 2) })

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <WorkoutSession />
  </StrictMode>,
)
