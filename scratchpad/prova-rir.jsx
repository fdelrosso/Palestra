// ---------------------------------------------------------------------------
// La serie a RIR/RPE in allenamento (WorkoutSession, SerieASforzo): al posto
// dei tre colori, kg e ripetizioni gia' riempiti e "Fatta".
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-rir.html        (esercizio solo)
//   → http://localhost:5174/scratchpad/prova-rir.html?ss=1   (superserie)
//   → ?rpe=1: RPE 8 al posto di RIR 2
//   → ?corta=1: la volta scorsa 4 ripetizioni su 6–8 (si parte sotto il range)
//   → ?lunga=1: la volta scorsa 10 (si parte sopra il range)
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { creaSessione } from '../src/lib/session.js'
import { impostaFinto } from './finto-store-vivo.js'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import '../src/index.css'

const parametri = new URLSearchParams(location.search)
const carico = parametri.get('rpe') === '1' ? { tipo: 'rpe', valore: 8 } : { tipo: 'rir', valore: 2 }
const sc = (serie, rip) => schemaVuoto({ fasi: [{ serie, rip, carico }], recuperoSec: 120 })
const superserie = parametri.get('ss') === '1'

const giorno = nuovoGiorno({
  nome: 'Impegnativo',
  esercizi: [
    nuovoEsercizio({ nome: 'Rematore T-bar', gruppo: 'schiena', gruppi: ['schiena'], schemaBase: sc(3, { min: 6, max: 8 }) }),
    nuovoEsercizio({
      nome: 'Alzate laterali manubri',
      gruppo: 'spalle',
      gruppi: ['spalle'],
      insiemeAlPrecedente: superserie,
      schemaBase: sc(3, { min: 6, max: 8 }),
    }),
  ],
})
const scheda = nuovaScheda({ id: 's1', nome: 'Programma bulle', numeroSettimane: 1, giorni: [giorno] })
// La volta scorsa, gia' col pannello: 8, 8, 7 a 50 kg.
scheda.completamenti = [
  {
    data: '2026-10-19T10:00:00Z',
    nomeScheda: 'Programma bulle',
    esercizi: [
      { nome: 'Rematore T-bar', schema: sc(3, { min: 6, max: 8 }), sets: (parametri.get('corta') === '1' ? [4, 4, 4] : parametri.get('lunga') === '1' ? [10, 10, 10] : [8, 8, 7]).map((rip) => ({ colore: 'giallo', kg: 50, rip })) },
    ],
  },
]
const sessione = creaSessione(scheda, scheda.giorni[0], 1)
if (!superserie) Object.assign(sessione.esercizi[0].sets[0], { colore: 'giallo', kg: 52.5, rip: 8 })
impostaFinto({ schede: [scheda], sessione })

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <style>{'.suggerimento-musica { display: none; }'}</style>
    <WorkoutSession />
  </StrictMode>,
)

// ?fatta=2: dopo il caricamento chiude due serie (Fatta → Chiudi la serie),
// come in palestra. ?apri=1: poi apre la modale e la lascia aperta.
const volte = Number(parametri.get('fatta') || 0)
const clic = (sel, ms) => setTimeout(() => document.querySelector(sel)?.click(), ms)
for (let n = 0; n < volte; n++) {
  clic('.pista-esercizi > .card:not(.non-attiva) .serie-sforzo-fatta', 1200 + n * 800)
  clic('.serie-sforzo-chiudi', 1500 + n * 800)
}
if (parametri.get('apri') === '1') clic('.pista-esercizi > .card:not(.non-attiva) .serie-sforzo-fatta', 1400 + volte * 800)
