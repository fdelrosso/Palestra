// ---------------------------------------------------------------------------
// Il rifacimento della 40ª (home a riquadri, sezioni, feed a schermo intero),
// senza login e senza database.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-ui.html?p=inizio&tema=chiaro
//
// `p`: inizio · schede · calendario · dieta · dieta-elenco · feed · profilo ·
// altro · benvenuto (`scorri=<px>`: il racconto, da quel punto). `tema`: chiaro | scuro. Le pagine sono quelle VERE, con la barra in
// basso; finti sono lo store (una scheda in corso con due allenamenti questa
// settimana), gli allenamenti "di tutti" e il conto dei non letti.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto } from './finto-store-vivo.js'
import { impostaCollettivo } from './finto-collettivo.js'
import { seminaInterazioni } from './finte-interazioni.js'
import { seminaFoto } from './finte-foto-allenamento.js'
import InizioPage from '../src/pages/InizioPage.jsx'
import HomePage from '../src/pages/HomePage.jsx'
import CalendarPage from '../src/pages/CalendarPage.jsx'
import DietaOggiPage from '../src/pages/DietaOggiPage.jsx'
import DietaPage from '../src/pages/DietaPage.jsx'
import FeedPage from '../src/pages/FeedPage.jsx'
import ProfiloPage from '../src/pages/ProfiloPage.jsx'
import LavoroPage from '../src/pages/LavoroPage.jsx'
import AmiciPage from '../src/pages/AmiciPage.jsx'
import useModalitaPt from '../src/hooks/useModalitaPt.js'
import AltroPage from '../src/pages/AltroPage.jsx'
import BarraBasso from '../src/components/BarraBasso.jsx'
import TestataApp from '../src/components/TestataApp.jsx'
import UserGate from '../src/pages/UserGate.jsx'
import SchedaPage from '../src/pages/SchedaPage.jsx'
import NotifichePage from '../src/pages/NotifichePage.jsx'
import EserciziPage from '../src/pages/EserciziPage.jsx'
import Tutorial, { useTutorial } from '../src/components/Tutorial.jsx'
import GuidaBreve, { useGuidaPrimaVolta } from '../src/components/GuidaBreve.jsx'
import GuidaPage from '../src/pages/GuidaPage.jsx'
import { preferenzeVuote } from '../src/lib/preferenzeCibo.js'
import { useRoute } from '../src/lib/router.js'
import '../src/index.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.tema = q.get('tema') === 'scuro' ? 'scuro' : 'chiaro'

const sc = (serie, ripetizioni, carico = '') => schemaVuoto({ serie, ripetizioni, carico })
const serie = (n, colore = 'verde') => Array.from({ length: n }, () => ({ colore, kg: 60, rip: 8 }))
const es = (nome, gruppo, n) => ({ nome, gruppo, gruppi: [gruppo], schema: sc(String(n), '8', '60kg'), sets: serie(n) })

const petto = nuovoGiorno({
  id: 'g1',
  nome: 'Petto e tricipiti',
  esercizi: [
    nuovoEsercizio({ nome: 'Panca piana', gruppo: 'petto', gruppi: ['petto'], schemaBase: sc('4', '8', '70kg') }),
    nuovoEsercizio({ nome: 'Push down', gruppo: 'tricipiti', gruppi: ['tricipiti'], schemaBase: sc('3', '12', '25kg') }),
  ],
})
const schiena = nuovoGiorno({ id: 'g2', nome: 'Schiena e bicipiti', esercizi: [] })
const gambe = nuovoGiorno({ id: 'g3', nome: 'Gambe', esercizi: [] })

const oggi = new Date()
const giorniFa = (n) => new Date(oggi.getTime() - n * 864e5).toISOString()
const lun = (oggi.getDay() + 6) % 7 // quanti giorni da lunedì

const scheda = nuovaScheda({
  id: 's1',
  nome: 'Massa 4 giorni',
  numeroSettimane: 6,
  giorni: [petto, schiena, gambe],
  completamenti: lun >= 1
    ? [
        { data: giorniFa(Math.min(lun, 2)), giornoId: 'g2', settimana: 1, esercizi: [es('Rematore', 'schiena', 4)] },
        { data: giorniFa(lun), giornoId: 'g3', settimana: 1, esercizi: [es('Squat', 'gambe', 5)] },
      ]
    : [],
})

// `saltato=1`: Petto, poi Gambe saltando Schiena, poi di nuovo Petto — Schiena
// è persa e la Home chiede cosa farne (lib/saltati).
if (q.get('saltato')) {
  scheda.completamenti = [
    { data: giorniFa(4), giornoId: 'g1', settimana: 1, esercizi: [es('Panca piana', 'petto', 4)] },
    { data: giorniFa(3), giornoId: 'g3', settimana: 1, esercizi: [es('Squat', 'gambe', 5)] },
    { data: giorniFa(1), giornoId: 'g1', settimana: 1, esercizi: [es('Panca piana', 'petto', 4)] },
  ]
}

// Due allenamenti singoli TENUTI (la scheda-contenitore `libera`): la sezione
// Allenamento li mostra sotto le schede (p=schede).
const libera = nuovaScheda({
  id: 'libera',
  nome: 'Allenamenti',
  libera: true,
  giorni: [
    { ...nuovoGiorno({ id: 'l1', nome: 'Full body veloce', esercizi: petto.esercizi }), salvato: true },
    { ...nuovoGiorno({ id: 'l2', nome: 'Spalle e addome', esercizi: [petto.esercizi[0]] }), salvato: true },
  ],
  completamenti: [{ data: giorniFa(2), giornoId: 'l1', settimana: 1, esercizi: [es('Panca piana', 'petto', 4)] }],
})

impostaFinto({
  schede: [scheda, libera],
  sessione: null,
  io: { id: 'io', nome: 'Matteo Rossi', username: 'matteo', codiceAmico: 'MATT4K9', ...(q.get('pt') ? { ruolo: 'pt', codicePt: 'MATTEOUZ' } : {}), dati: { peso: 78, altezza: 180, eta: 30, sesso: 'm', obiettivo: 'massa', attivita: 'moderata' } },
  richiesteAmicizia: { ricevute: [{ rel: { id: 'r1' }, utente: { id: 'x', nome: 'Giulia' } }], inviate: [] },
})

const ore = (h) => new Date(oggi.getTime() - h * 3600e3).toISOString()
const lungo = {
  // `mio=1`: l'allenamento è del profilo di prova (i commenti sui PROPRI post).
  utenteId: q.get('mio') ? 'io' : 'nico',
  utenteNome: 'Nico',
  schedaId: 's-nico',
  completamento: {
    schedaId: 's-nico',
    data: ore(2),
    nomeScheda: 'Forza & Ipertrofia',
    nomeGiorno: 'Gambe',
    settimana: 3,
    durataSec: 4200,
    visibilita: 'pubblica',
    esercizi: [es('Squat', 'gambe', 5), es('Leg press', 'gambe', 4), es('Hip thrust', 'glutei', 4), es('Calf', 'polpacci', 4)],
    // `musica=1`: la canzone dell'allenamento sotto il nome (lib/musica).
    ...(q.get('musica')
      ? {
          nota: 'Gambe distrutte, ma ne valeva la pena',
          musica: {
            id: '207445080',
            titolo: 'Eye of the Tiger',
            artista: 'Survivor',
            copertina: 'https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/49/21/4d/49214d77-2eb5-60a1-75d3-67d30b449326/dj.szkhyuyj.jpg/200x200bb.jpg',
          },
        }
      : {}),
  },
}
const aMano = {
  utenteId: 'sara',
  utenteNome: 'Sara',
  schedaId: 's-sara',
  completamento: { data: ore(30), nomeGiorno: 'Corsa e core', nomeScheda: 'La mia scheda', visibilita: 'pubblica' },
}
// `molti=N`: N copie dell'allenamento lungo, per scorrere un feed pieno.
const copie = Array.from({ length: Number(q.get('molti')) || 0 }, (_, i) => ({
  ...lungo,
  utenteId: `copia${i}`,
  utenteNome: `Copia ${i + 1}`,
  schedaId: `s-copia${i}`,
  completamento: { ...lungo.completamento, schedaId: `s-copia${i}`, data: ore(3 + i) },
}))
impostaCollettivo([lungo, ...copie, aMano])
seminaInterazioni(`s-nico|${lungo.completamento.data}`, {
  like: ['giulia', 'marco'],
  righe: [{ userId: 'giulia', testo: 'Che volume 💪' }],
})
// `commenti=1` (con p=amici&mio=1): i commenti del proprio allenamento già
// aperti, come arrivando da una notifica.
if (q.get('commenti')) {
  const u = new URL(location.href)
  u.searchParams.set('post', `s-nico|${lungo.completamento.data}`)
  u.searchParams.set('apri', 'commento')
  history.replaceState(null, '', u)
}

// Due foto finte sull'allenamento di Nico (la prima fa da sfondo al post).
// `?foto=0` per il post senza media.
async function fotoFinta(c1, c2, testo) {
  const c = document.createElement('canvas')
  c.width = 900
  c.height = 1600
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 900, 1600)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  x.fillStyle = g
  x.fillRect(0, 0, 900, 1600)
  x.fillStyle = 'rgba(255,255,255,0.85)'
  x.font = 'bold 120px sans-serif'
  x.fillText(testo, 80, 820)
  return new Promise((r) => c.toBlob(r, 'image/jpeg'))
}
if (q.get('foto') !== '0') {
  const k = `s-nico|${lungo.completamento.data}`
  seminaFoto(k, await fotoFinta('#f97316', '#7c2d12', 'FOTO 1'))
  seminaFoto(k, await fotoFinta('#22c55e', '#14532d', 'FOTO 2'))
}

// Come App.jsx: in modalità PT la Home è Lavoro, e il Profilo le sta sopra.
function Home() {
  const { modoPt } = useModalitaPt()
  return modoPt ? <LavoroPage /> : <InizioPage />
}
const PAGINE = {
  inizio: Home,
  schede: HomePage,
  calendario: CalendarPage,
  dieta: DietaOggiPage,
  'dieta-elenco': DietaPage,
  feed: FeedPage,
  profilo: () => (
    <>
      <Home />
      <ProfiloPage />
    </>
  ),
  altro: AltroPage,
  amici: AmiciPage,
  notifiche: NotifichePage,
  // `g` = il gruppo: la pagina degli esercizi di quel gruppo, coi manichini.
  esercizi: () => <EserciziPage gruppo={q.get('g') ?? 'glutei'} />,
  benvenuto: UserGate,
  giorno: () => <SchedaPage id="s1" giorno="g1" />,
}
const Pagina = PAGINE[q.get('p')] || InizioPage

// Il giro dell'app: da solo con `tutorial=1` (come un account che non l'ha
// visto), altrimenti solo da Altro → Guida all'app. Le mini-guide (lib/guide)
// partono da sole solo col giro visto: `guide=1` le lascia tutte da vedere,
// e muovendosi con la barra si aprono quelle delle sezioni.
if (!q.get('tutorial')) impostaFinto({ preferenze: { ...preferenzeVuote(), avvisi: { tutorial: 'visto' } } })
// Il giro entra nelle sezioni: appena l'indirizzo non è più quello del banco,
// la pagina segue la rotta come in App.jsx.
const DALLA_ROTTA = {
  inizio: Home, home: HomePage, 'dieta-oggi': DietaOggiPage, feed: FeedPage, altro: AltroPage, guida: GuidaPage,
  amici: AmiciPage, esercizi: EserciziPage,
}
function Pagine() {
  const r = useRoute()
  const P = location.pathname.includes('prova-ui') ? Pagina : DALLA_ROTTA[r.name] || Pagina
  return <P />
}
function Giro() {
  const t = useTutorial()
  const r = useRoute()
  const m = useGuidaPrimaVolta({ rotta: r.name, modoPt: q.get('pt') === '1', bloccata: t.aperto })
  return (
    <>
      {t.aperto && <Tutorial onChiudi={t.chiudi} modoPt={q.get('pt') === '1'} />}
      {m.guida && <GuidaBreve key={m.guida.id} guida={m.guida} onChiudi={m.chiudi} />}
    </>
  )
}

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    {Pagina !== UserGate && <TestataApp />}
    <Pagine />
    {Pagina !== UserGate && <BarraBasso />}
    {Pagina !== UserGate && <Giro />}
  </StrictMode>,
)

// Per fotografare il racconto del benvenuto: lo scatto headless non segue lo
// scorrimento, quindi si toglie l'hero, si sale di `scorri` px e si
// accendono i riquadri come se fossero entrati in vista.
if (q.get('scorri')) {
  const st = document.createElement('style')
  st.textContent = `.benv *{transition:none!important}.benv-hero{display:none}.benv{margin-top:-${Number(q.get('scorri'))}px}`
  document.head.append(st)
  setTimeout(() => document.querySelectorAll('.benv-capitolo').forEach((c) => c.classList.add('visibile')), 200)
}
