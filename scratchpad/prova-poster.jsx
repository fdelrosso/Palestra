// ---------------------------------------------------------------------------
// Le due schermate del poster (poster/), tema scuro, dati finti credibili.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-poster.html?p=home
//   → http://localhost:5174/scratchpad/prova-poster.html?p=allenamento  (poi "Inizia allenamento")
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto, useStore } from './finto-store-vivo.js'
import InizioPage from '../src/pages/InizioPage.jsx'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import BarraBasso from '../src/components/BarraBasso.jsx'
import TestataApp from '../src/components/TestataApp.jsx'
import '../src/index.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.tema = 'scuro'

const es = (nome, gruppo, serie, rip, kg, recuperoSec = 120) =>
  nuovoEsercizio({
    nome,
    gruppo,
    gruppi: [gruppo],
    schemaBase: schemaVuoto({ fasi: [{ serie, rip, carico: kg ? { tipo: 'kg', valore: kg } : null }], recuperoSec }),
  })
const fatti = (nome, gruppo, n, kg, rip) => ({ nome, gruppo, gruppi: [gruppo], sets: Array.from({ length: n }, () => ({ colore: 'verde', kg, rip })) })

const push = nuovoGiorno({
  id: 'g1',
  nome: 'Push',
  esercizi: [
    es('Panca piana', 'petto', 4, 8, 35, 150),
    es('Spinte manubri inclinata', 'petto', 3, 10, 10),
    es('Military press', 'spalle', 3, 8, 20),
    es('Alzate laterali', 'spalle', 3, 15, 4, 60),
    es('Push down', 'tricipiti', 3, 12, 15, 60),
  ],
})
const pull = nuovoGiorno({ id: 'g2', nome: 'Pull', esercizi: [es('Trazioni', 'schiena', 4, 8, 0), es('Rematore', 'schiena', 4, 10, 30)] })
const legs = nuovoGiorno({ id: 'g3', nome: 'Legs', esercizi: [es('Squat', 'gambe', 5, 5, 60)] })

const serieColori = (kg, rip, colori) => colori.map((colore) => ({ colore, kg, rip }))
const oggi = new Date()
const giorniFa = (n) => new Date(oggi.getTime() - n * 864e5).toISOString()

const scheda = nuovaScheda({
  id: 's1',
  nome: 'Push Pull Legs',
  numeroSettimane: 8,
  attiva: true,
  settimanaCorrente: 2,
  giorni: [push, pull, legs],
  creataIl: giorniFa(20),
  completamenti: [
    { data: giorniFa(9), giornoId: 'g1', settimana: 1, esercizi: [{ ...fatti('Panca piana', 'petto', 4, 32.5, 8), sets: serieColori(32.5, 8, ['verde', 'verde', 'giallo', 'giallo']) }] },
    { data: giorniFa(8), giornoId: 'g2', settimana: 1, esercizi: [fatti('Rematore', 'schiena', 4, 27.5, 10)] },
    { data: giorniFa(7), giornoId: 'g3', settimana: 1, esercizi: [fatti('Squat', 'gambe', 5, 57.5, 5)] },
  ],
})

// La scheda di prima, archiviata: la storia della panca (il carosello, slide
// dei progressi) che sale di 2,5 kg ogni tanto, coi pallini di com'era andata.
const panca = (n, kg, colori) => ({
  data: giorniFa(n),
  giornoId: 'v1',
  settimana: 1,
  nomeGiorno: 'Giorno A',
  esercizi: [{ nome: 'Panca piana', gruppo: 'petto', gruppi: ['petto'], sets: serieColori(kg, 8, colori) }],
})
const vecchia = nuovaScheda({
  id: 's0',
  nome: 'Full body',
  archiviata: true,
  giorni: [nuovoGiorno({ id: 'v1', nome: 'Full body', esercizi: [] })],
  completamenti: [
    panca(52, 25, ['verde', 'verde', 'verde', 'giallo']),
    panca(45, 27.5, ['verde', 'giallo', 'giallo', 'rosso']),
    panca(38, 27.5, ['verde', 'verde', 'verde', 'giallo']),
    panca(31, 30, ['verde', 'giallo', 'giallo', 'giallo']),
    panca(24, 30, ['verde', 'verde', 'verde', 'verde']),
  ],
})

impostaFinto({
  schede: [scheda, vecchia],
  sessione: null,
  io: { id: 'io', nome: 'Giulia Conti', username: 'giulia', dati: { peso: 62, altezza: 168, eta: 26, sesso: 'f', obiettivo: 'tonificare', attivita: 'moderata' } },
})

function Allenamento() {
  const { sessione } = useStore()
  const [dentro, setDentro] = useState(false)
  if (sessione && !dentro) setDentro(true)
  return dentro || sessione ? <WorkoutSession /> : <SchedaPage id="s1" />
}

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    {q.get('p') === 'allenamento' ? (
      <Allenamento />
    ) : (
      <>
        <TestataApp />
        <InizioPage />
        <BarraBasso />
      </>
    )}
  </StrictMode>,
)
