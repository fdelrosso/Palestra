// ---------------------------------------------------------------------------
// Prova della scheda di recap del Feed: quella che si vede subito e si sfoglia
// di lato (src/components/SchedaRecap).
//
//     node scratchpad/prova-feed.mjs
//
// Perche' esiste: le prove di `npm test` guardano i CONTI (lib/feed), non il
// disegno. Qui si monta davvero il componente e si guarda cosa finisce a
// schermo — che e' l'unico modo di accorgersi dei due casi che contano:
//
//   · l'allenamento SEGNATO A MANO, che non ha ne' esercizi ne' durata e la cui
//     scheda, senza attenzione, diventa un rettangolo vuoto;
//   · quante pagine si sfogliano, che dipende da quante foto ci sono e dal
//     fatto che l'allenamento sia proprio o di un altro.
//
// Stesso impianto di prova-dieta.mjs: Vite in middleware, cosi' il JSX si
// compila e `import.meta.env` esiste.
// ---------------------------------------------------------------------------
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
  plugins: [react()],
})

const { disegna } = await server.ssrLoadModule('/scratchpad/prova-feed-pagine.jsx')

// ---- aiutanti -------------------------------------------------------------
const testo = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // ⚠️ L'app scrive l'apostrofo tipografico (’), che e' un carattere diverso
    // da quello della tastiera ('): senza questa riga ogni assert che contiene
    // un apostrofo fallisce, e sembra un guasto del componente.
    .replace(/&rsquo;|’/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

let falliti = 0
const prova = (nome, f) => {
  try {
    f()
    console.log('  ok   ' + nome)
  } catch (e) {
    falliti += 1
    console.log('  NO   ' + nome + '\n       ' + e.message)
  }
}
const deve = (html, frase) => {
  if (!testo(html).includes(frase)) throw new Error(`manca a schermo: «${frase}»`)
}
const nonDeve = (html, frase) => {
  if (testo(html).includes(frase)) throw new Error(`non ci doveva essere: «${frase}»`)
}
const conta = (html, pezzo) => html.split(pezzo).length - 1

// ---- i dati ---------------------------------------------------------------
const serie = (n, colore = 'verde') => Array.from({ length: n }, () => ({ colore }))

const ALLENAMENTO = {
  utenteId: 'u1',
  utenteNome: 'Filippo',
  schedaId: 's1',
  data: '2026-09-23T18:30:00.000Z',
  nomeGiorno: 'Petto e tricipiti',
  nomeScheda: 'Massa 4 giorni',
  settimana: 2,
  durataSec: 62 * 60,
  calorieReali: 540,
  esercizi: [
    { nome: 'Panca piana con bilanciere', gruppo: 'petto', schema: {}, sets: serie(4) },
    { nome: 'Croci ai cavi', gruppo: 'petto', schema: {}, sets: serie(3) },
    { nome: 'French press', gruppo: 'tricipiti', schema: {}, sets: serie(3) },
  ],
}

// ⚠️ Il caso che questo harness esiste per sorvegliare.
const A_MANO = {
  utenteId: 'u2',
  utenteNome: 'Nico',
  schedaId: '',
  data: '2026-09-22T08:00:00.000Z',
  nomeGiorno: 'Corsa al parco',
  nomeScheda: '',
  settimana: null,
  durataSec: null,
  esercizi: [],
  nota: 'Otto chilometri, piano.',
}

const foto = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: 'f' + i,
    percorso: 'u1/f' + i,
    tipo: 'foto',
    nome: 'scatto.jpg',
  }))

// ---- le prove -------------------------------------------------------------
console.log('\nScheda di recap — allenamento completo')
{
  const html = disegna({ voce: ALLENAMENTO, foto: [], mio: false })
  prova('dice chi e quando', () => {
    deve(html, 'Filippo')
    deve(html, 'Petto e tricipiti')
    deve(html, 'Massa 4 giorni')
  })
  prova('la durata si vede senza aprire niente', () => deve(html, '1 h 02 min'))
  prova('i muscoli allenati sono in chiaro', () => {
    deve(html, 'Petto')
    deve(html, 'Tricipiti')
  })
  prova('i numeri della giornata ci sono', () => {
    deve(html, '10 serie')
    deve(html, '3 esercizi')
    deve(html, '540 kcal')
    deve(html, 'Sett. 2')
  })
  prova('senza foto e non mio, niente pallini ne suggerimento', () => {
    if (conta(html, 'recap-pallino') > 0) throw new Error('pallini di troppo')
    if (conta(html, 'recap-suggerimento') > 0) throw new Error('suggerimento di troppo')
  })
}

console.log('\nScheda di recap — allenamento segnato a mano')
{
  const html = disegna({ voce: A_MANO, foto: [], mio: false })
  prova('non e un rettangolo vuoto: si vede cosa ha fatto', () => {
    deve(html, 'Corsa al parco')
    deve(html, 'Otto chilometri, piano.')
  })
  prova('non inventa numeri che non ha', () => {
    nonDeve(html, '0 serie')
    nonDeve(html, '0 esercizi')
    nonDeve(html, 'Sett.')
  })
  prova('senza nota dice cosa manca, invece di lasciare il buco', () => {
    const vuoto = disegna({ voce: { ...A_MANO, nota: '' }, foto: [], mio: false })
    deve(vuoto, 'Allenamento segnato a mano')
  })
}

console.log('\nLo sfogliare di lato')
{
  const due = disegna({ voce: ALLENAMENTO, foto: foto(2), mio: false })
  prova('una pagina per il recap piu una per foto', () => {
    if (conta(due, 'recap-pagina') !== 3) {
      throw new Error('pagine: ' + conta(due, 'recap-pagina') + ', ne volevo 3')
    }
  })
  prova('i pallini contano le pagine', () => {
    if (conta(due, 'recap-pallino"') + conta(due, 'recap-pallino on') !== 3) {
      throw new Error('pallini sbagliati')
    }
  })
  prova('dice quante foto ci sono, cosi si scopre che ci sono', () =>
    deve(due, '2 foto — scorri di lato'))

  const una = disegna({ voce: ALLENAMENTO, foto: foto(1), mio: false })
  prova('con una foto il conto e al singolare', () => deve(una, '1 foto — scorri di lato'))
}

console.log('\nSolo sui propri: aggiungere')
{
  const mio = disegna({ voce: ALLENAMENTO, foto: [], mio: true })
  prova('compare la pagina per aggiungere', () => {
    deve(mio, 'Aggiungi una foto')
    if (conta(mio, 'recap-pagina') !== 2) throw new Error('doveva avere 2 pagine')
  })
  prova('con gia delle foto il testo cambia', () => {
    const con = disegna({ voce: ALLENAMENTO, foto: foto(3), mio: true })
    deve(con, "Aggiungine un'altra")
    if (conta(con, 'recap-pagina') !== 5) throw new Error('doveva avere 5 pagine')
  })
  prova("su quello di un altro non si puo aggiungere", () => {
    const altrui = disegna({ voce: ALLENAMENTO, foto: foto(1), mio: false })
    nonDeve(altrui, 'Aggiungi una foto')
  })
}

await server.close()
console.log(falliti === 0 ? '\nTutto a posto.\n' : `\n${falliti} prove fallite.\n`)
process.exit(falliti === 0 ? 0 : 1)
