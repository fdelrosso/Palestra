// ---------------------------------------------------------------------------
// L'EDITOR DELLA SCHEDA (pagina vera, store finto), per guardarlo e toccarlo.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-editor.html            (scheda esistente)
//   → http://localhost:5174/scratchpad/prova-editor.html?nuova=1    (scheda nuova)
//   → &tema=chiaro per il tema chiaro
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto } from './finto-store-vivo.js'
import EditorPage from '../src/pages/EditorPage.jsx'
import '../src/index.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.tema = q.get('tema') || 'scuro'

const es = (nome, gruppo, serie, rip, kg, recuperoSec = 90, altro = {}) =>
  nuovoEsercizio({
    nome,
    gruppo,
    gruppi: [gruppo],
    schemaBase: schemaVuoto({ fasi: [{ serie, rip, carico: kg ? { tipo: 'kg', valore: kg } : null }], recuperoSec }),
    ...altro,
  })

const push = nuovoGiorno({
  id: 'g1',
  nome: 'Push',
  esercizi: [
    nuovoEsercizio({
      nome: 'Tapis roulant',
      gruppo: 'cardio',
      gruppi: ['cardio'],
      riscaldamento: true,
      schemaBase: schemaVuoto({ fasi: [{ serie: 1, rip: { sec: 600 }, carico: null, parametri: { velocita: 6 } }] }),
    }),
    es('Panca piana', 'petto', 4, 8, 60, 150, { nota: 'Fermo al petto' }),
    es('Spinte manubri inclinata', 'petto', 3, { min: 8, max: 10 }, 22),
    es('Alzate laterali', 'spalle', 3, 15, 8, 60),
    es('Push down', 'tricipiti', 3, 12, 25, 60, { insiemeAlPrecedente: true }),
    es('Croci ai cavi alti', 'petto', 3, 12, null, 60),
  ],
})
const pull = nuovoGiorno({ id: 'g2', nome: 'Pull', esercizi: [es('Trazioni', 'schiena', 4, 'max', null, 120), es('Rematore bilanciere', 'schiena', 4, 10, 50)] })
const legs = nuovoGiorno({ id: 'g3', nome: 'Legs', esercizi: [es('Squat', 'gambe', 5, 5, 80, 180)] })

impostaFinto({
  schede: [nuovaScheda({ id: 's1', nome: 'Push Pull Legs', numeroSettimane: 8, giorni: [push, pull, legs] })],
  sessione: null,
})

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <EditorPage id={q.get('nuova') ? null : 's1'} />
  </StrictMode>,
)

// &passo=2 → dritto agli allenamenti (per gli screenshot headless).
if (q.get('passo') === '2')
  setTimeout(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avanti')?.click(), 500)
// &giorni=Lun,Mer,Ven,Ven → li tocca (due volte = ×2), per gli screenshot.
if (q.get('giorni'))
  setTimeout(() => {
    for (const g of q.get('giorni').split(','))
      [...document.querySelectorAll('.giorno-cerchio > button')].find((b) => b.textContent === g)?.click()
  }, 500)
// &cerca=1 (con passo=2) → apre "Aggiungi un esercizio".
if (q.get('cerca'))
  setTimeout(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Esercizio')?.click(), 900)
// &apri=Nome (con passo=2) → tocca la card di quell'esercizio; &altri=1 apre il "+".
if (q.get('apri'))
  setTimeout(() => {
    ;[...document.querySelectorAll('.ex-card-editor')].find((c) => c.textContent.includes(q.get('apri')))?.click()
    if (q.get('altri')) setTimeout(() => document.querySelector('.gruppo-chip-piu')?.click(), 300)
  }, 900)
// &tendina=1 (con apri) → apre la tendina del carico.
if (q.get('tendina')) setTimeout(() => document.querySelector('.tendina-carico-tasto')?.click(), 1400)
// &perlato=1 (con apri) → accende "per lato" e salva il foglio.
if (q.get('perlato'))
  setTimeout(() => {
    document.querySelector('.per-lato-toggle .switch')?.click()
    setTimeout(() => [...document.querySelectorAll('.foglio-esercizio button')].find((b) => b.textContent.trim() === 'Salva')?.click(), 200)
  }, 1500)
// &mobilita=1 (con passo=2) → apre il testo del riscaldamento.
if (q.get('mobilita'))
  setTimeout(() => [...document.querySelectorAll('.preparazione-aggiungi')].find((b) => b.textContent.includes('Mobilità'))?.click(), 900)
// &provanome=1 (con nuova=1) → Lun, Avanti, Salva: senza nome chiede il nome.
if (q.get('provanome'))
  setTimeout(() => {
    ;[...document.querySelectorAll('.giorno-cerchio > button')].find((b) => b.textContent === 'Lun')?.click()
    setTimeout(() => {
      ;[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avanti')?.click()
      setTimeout(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salva')?.click(), 300)
    }, 300)
  }, 600)
// &nota=1 → apre la nota della scheda (passo 1).
if (q.get('nota')) setTimeout(() => document.querySelector('.passo1-link')?.click(), 700)
// &diversi=N → sceglie N allenamenti diversi (passo 1).
if (q.get('diversi'))
  setTimeout(() => [...document.querySelectorAll('.giorno-chip')].find((b) => b.textContent === q.get('diversi'))?.click(), 800)
// &settimane=1 (con apri) → "Altre opzioni" e "Cambia per settimana".
if (q.get('settimane'))
  setTimeout(() => {
    ;[...document.querySelectorAll('.foglio-esercizio button')].find((b) => b.textContent.includes('Altre opzioni'))?.click()
    setTimeout(() => {
      const r = [...document.querySelectorAll('.foglio-esercizio .toggle-row')].find((x) => x.textContent.includes('Cambia per settimana'))
      r?.querySelector('.switch')?.click()
    }, 300)
  }, 1500)
// &perserie=1 (con apri) → ripetizioni "Una per serie"; &kgserie=1 → anche il carico.
if (q.get('perserie'))
  setTimeout(() => {
    ;[...document.querySelectorAll('.foglio-esercizio .tipi-rip button')].find((b) => b.textContent === 'Una per serie')?.click()
    if (q.get('kgserie'))
      setTimeout(() => {
        document.querySelector('.tendina-carico-tasto')?.click()
        setTimeout(() => [...document.querySelectorAll('.tendina-carico-voce')].find((b) => b.textContent.startsWith('kg per serie'))?.click(), 200)
      }, 200)
  }, 1500)
