// ---------------------------------------------------------------------------
// Harness: DISEGNA DAVVERO le pagine della dieta, in Node, senza browser.
//
//   node scratchpad/prova-dieta.mjs
//
// Perché esiste: le pagine della dieta stanno dietro al login, e il login
// dell'app passa da Supabase vero. Per guardarle in un browser bisognerebbe
// creare un account vero sul database di produzione — che per una prova non si
// fa. Questo le monta con `renderToStaticMarkup` e degli store finti, così un
// errore a schermo (una variabile che non c'è, un campo letto su `undefined`,
// un piano vuoto) salta fuori qui invece che sul telefono di qualcuno.
//
// ⚠️ NON è un unit test e non passa da `npm test`: i conti hanno le loro prove
// in tests/diario.test.js. Questo serve a LEGGERE cosa esce, come
// scratchpad/prova-collettivo.mjs.
//
// ⚠️ Store e router sono finti e la sostituzione la fa Vite con un alias: il
// codice delle pagine non lo sa e non è stato toccato per farlo. Gli effetti
// non partono (React in SSR non li esegue), quindi niente rete e niente
// localStorage — il che è anche il motivo per cui questo file non può provare
// il salvataggio, solo il disegno.
// ---------------------------------------------------------------------------
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

// I due store e il router, finti. Stessi nomi esportati di quelli veri.
const FINTO = `
let _store = {}
let _account = {}
export function impostaStore(s) { _store = s }
export function impostaAccount(a) { _account = a }
export function useStore() { return _store }
export function useAccount() { return _account }
export const navigate = () => {}
export const goBack = () => {}
export const routes = new Proxy({}, { get: () => () => '#/' })
`

const fintoStore = {
  name: 'finto-store',
  resolveId: (id) => (id === 'virtual:finto-store' ? '\0virtual:finto-store' : null),
  load: (id) => (id === '\0virtual:finto-store' ? FINTO : null),
}

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  // Senza, Vite va a caccia delle dipendenze di TUTTA l app e si lamenta di
  // virtual:pwa-register, che in questo harness non c entra niente.
  optimizeDeps: { noDiscovery: true },
  plugins: [react(), fintoStore],
  resolve: {
    alias: [
      // Tutto ciò che sa di store, account o navigazione finisce sul finto.
      { find: /^\.\.\/store\/(StoreContext|AccountContext)$/, replacement: 'virtual:finto-store' },
      { find: /^\.\.\/lib\/router$/, replacement: 'virtual:finto-store' },
    ],
  },
})

const { disegna, nuovaDieta, normalizzaGiornoDiario, oggiISO } = await server.ssrLoadModule(
  '/scratchpad/prova-dieta-pagine.jsx',
)

// ---- i dati delle prove ---------------------------------------------------

const DATI_COMPLETI = {
  sesso: 'm', eta: 30, peso: 78, altezza: 180,
  movimento: 'leggero', obiettivo: 'mantenimento', livello: 'medio',
}
const oggi = oggiISO()

// Una scheda che dice "oggi ci si allena": serve a far scegliere alla pagina il
// piano dei giorni di allenamento invece di quello di riposo.
// ⚠️ Il giorno sta in `giorniSettimana` della SCHEDA (0 = lunedi, vedi
// GIORNI_SETTIMANA in data/model), non dentro il giorno: e da li che
// lib/consiglio ricava se oggi e un giorno di palestra.
const indiceOggi = (new Date().getDay() + 6) % 7
const schedaDiOggi = () => [
  {
    id: 's1', nome: 'Scheda', numeroSettimane: 1, dataInizio: oggi,
    completamenti: [], giorniSettimana: [indiceOggi],
    giorni: [{ id: 'g1', nome: 'Oggi', tipo: 'workout', esercizi: [] }],
  },
]

const dietaDiProva = () =>
  nuovaDieta({
    nome: 'Dieta di prova',
    obiettivo: 'mantenimento',
    allenamento: {
      kcal: 2400, proteine: 160, carbo: 260, grassi: 70,
      pasti: [
        {
          id: 'p1', nome: 'Colazione',
          testo: "Yogurt greco 0%: 200g · Fiocchi d'avena: 60g",
          opzioni: ['Uova intere: 110g · Pane integrale: 80g'],
        },
        {
          id: 'p2', nome: 'Pranzo',
          testo: 'Petto di pollo: 150g · Riso (a crudo): 90g · Olio EVO: 15g · Verdure: a piacere',
          opzioni: [],
        },
        { id: 'p3', nome: 'Cena', testo: 'Merluzzo: 200g · Patate: 300g · Olio EVO: 15g', opzioni: [] },
      ],
    },
    riposo: { kcal: 2100, proteine: 160, carbo: 200, grassi: 65, pasti: [] },
  })

const storeBase = (extra = {}) => ({
  diete: [], schede: [], preferenze: {},
  aggiungiDieta: (d) => d,
  giornoDiario: (d) => normalizzaGiornoDiario({ id: d, data: d, voci: [] }),
  aggiungiVociDiario: () => {},
  eliminaVoceDiario: () => {},
  togliPastoDiario: () => {},
  ...extra,
})

const conDiario = (voci) => (d) => normalizzaGiornoDiario({ id: d, data: d, voci })
const voce = (v) => ({
  id: 'v' + Math.random().toString(36).slice(2, 7),
  pasto: '', pastoId: '', stimata: false, ora: new Date().toISOString(), ...v,
})
const utente = (dati) => ({ utenteCorrente: { nome: 'Prova', dati } })

// ---- le prove -------------------------------------------------------------

const testo = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

let errori = 0
function prova(nome, fn) {
  try {
    const righe = fn()
    console.log(`\n✓ ${nome}`)
    for (const r of righe) console.log(`    ${r}`)
  } catch (e) {
    errori += 1
    console.log(`\n✗ ${nome}\n    ${e.message}`)
  }
}
const deve = (html, frase) => {
  if (!testo(html).includes(frase)) throw new Error(`manca a schermo: «${frase}»`)
  return `c'è: «${frase}»`
}
const nonDeve = (html, frase) => {
  if (testo(html).includes(frase)) throw new Error(`non ci doveva essere: «${frase}»`)
  return `non c'è, giusto così: «${frase}»`
}

prova('Dieta giornaliera · dieta salvata, diario vuoto', () => {
  const html = disegna('oggi', storeBase({ diete: [dietaDiProva()] }), utente(DATI_COMPLETI))
  return [
    deve(html, '0 / 2100 kcal'),
    deve(html, 'Ti restano 2100 kcal'),
    deve(html, 'Ancora niente'),
    deve(html, 'Aggiungi quello che hai mangiato'),
    nonDeve(html, 'Grammi ricalcolati'),
  ]
})

prova('Dieta giornaliera · giorno di allenamento: pasti e alternative', () => {
  const html = disegna(
    'oggi',
    storeBase({ diete: [dietaDiProva()], schede: schedaDiOggi() }),
    utente(DATI_COMPLETI),
  )
  return [
    deve(html, '0 / 2400 kcal'),
    deve(html, 'Petto di pollo: 150g'),
    deve(html, 'Alternativa 1'),
    deve(html, "L'ho mangiato"),
  ]
})

prova('Dieta giornaliera · con quello che si è già mangiato', () => {
  const voci = [
    voce({ nome: 'Pizza margherita', alimentoId: 'pizza', grammi: 300, kcal: 906, proteine: 33, carbo: 99, grassi: 30, pasto: 'Pranzo' }),
  ]
  const html = disegna(
    'oggi',
    storeBase({ diete: [dietaDiProva()], giornoDiario: conDiario(voci) }),
    utente(DATI_COMPLETI),
  )
  return [
    deve(html, '906 / 2100 kcal'),
    deve(html, 'Ti restano 1194 kcal'),
    deve(html, 'Pizza margherita'),
    deve(html, 'Finora:'),
  ]
})

prova('Dieta giornaliera · i pasti rimasti si riscrivono su quanto resta', () => {
  const voci = [
    voce({ nome: 'Pizza', alimentoId: 'pizza', grammi: 600, kcal: 1812, proteine: 66, carbo: 198, grassi: 60 }),
  ]
  const html = disegna(
    'oggi',
    storeBase({ diete: [dietaDiProva()], schede: schedaDiOggi(), giornoDiario: conDiario(voci) }),
    utente(DATI_COMPLETI),
  )
  const pollo = testo(html).match(/Petto di pollo: (\d+)g/)
  return [
    deve(html, 'Grammi ricalcolati'),
    deve(html, 'Vedi originali'),
    nonDeve(html, 'Petto di pollo: 150g'),
    `il pollo del pranzo è passato da 150g a ${pollo?.[1]}g`,
  ]
})

prova('Dieta giornaliera · oltre l\'obiettivo lo dice', () => {
  const voci = [
    voce({ nome: 'Pizza', alimentoId: 'pizza', grammi: 900, kcal: 2718, proteine: 99, carbo: 297, grassi: 90 }),
  ]
  const html = disegna(
    'oggi',
    storeBase({ diete: [dietaDiProva()], giornoDiario: conDiario(voci) }),
    utente(DATI_COMPLETI),
  )
  return [deve(html, "618 kcal oltre l'obiettivo"), nonDeve(html, 'Ti restano')]
})

prova('Dieta giornaliera · nessuna dieta ma dati completi → la proposta', () => {
  const html = disegna('oggi', storeBase(), utente(DATI_COMPLETI))
  return [
    deve(html, 'Dieta consigliata dai tuoi dati'),
    deve(html, 'Salva come mia dieta'),
    deve(html, 'Ho i miei numeri'),
  ]
})

prova('Dieta giornaliera · dati mancanti → non si inventa niente', () => {
  const html = disegna('oggi', storeBase(), utente({}))
  return [deve(html, 'Completa i miei dati'), nonDeve(html, 'Ti restano')]
})

prova('Calorie e macro · si apre vuota e aspetta i numeri', () => {
  const html = disegna('macro', storeBase(), {})
  return [
    deve(html, 'Il tuo obiettivo giornaliero'),
    deve(html, 'Proponimi i pasti'),
    deve(html, 'Scrivi almeno uno dei tre macro'),
  ]
})

await server.close()
console.log(errori === 0 ? '\n— tutto disegnato, niente di rotto —' : `\n— ${errori} pagine con problemi —`)
process.exit(errori === 0 ? 0 : 1)
