// ---------------------------------------------------------------------------
// Il FEED con mi piace e commenti, con le dita, senza login e senza database.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-feed-social.html
//
// La pagina è quella VERA (pages/FeedPage); finti sono gli allenamenti "di
// tutti" (finto-collettivo), le foto (finte-foto-allenamento) e mi piace e
// commenti (finte-interazioni), tutti in memoria: si ricarica e si riparte.
//
// Ci sono di proposito:
//   - un allenamento con TANTI esercizi e due foto, una verticale e una
//     orizzontale: le foto devono riempire la pagina del recap senza lasciare
//     spazio vuoto sotto gli esercizi;
//   - un allenamento segnato a mano (recap basso) con una foto: la pagina non
//     deve schiacciarla;
//   - mi piace e commenti già messi, uno con una foto.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaCollettivo } from './finto-collettivo.js'
import { seminaFoto } from './finte-foto-allenamento.js'
import { seminaInterazioni } from './finte-interazioni.js'
import FeedPage from '../src/pages/FeedPage.jsx'
import '../src/index.css'

// Un'immagine disegnata al volo: un colore, una scritta e le proporzioni.
function immagine(larghezza, altezza, colore, scritta) {
  const c = document.createElement('canvas')
  c.width = larghezza
  c.height = altezza
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, larghezza, altezza)
  grad.addColorStop(0, colore)
  grad.addColorStop(1, '#111')
  g.fillStyle = grad
  g.fillRect(0, 0, larghezza, altezza)
  g.fillStyle = '#fff'
  g.font = 'bold 64px sans-serif'
  g.fillText(scritta, 40, altezza / 2)
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8))
}

const serie = (n, colore = 'verde') => Array.from({ length: n }, () => ({ colore }))
const es = (nome, gruppo, n) => ({ nome, gruppo, gruppi: [gruppo], schema: { serie: String(n), ripetizioni: '8' }, sets: serie(n) })

const oggi = new Date()
const ore = (h) => new Date(oggi.getTime() - h * 3600e3).toISOString()

const lungo = {
  utenteId: 'nico',
  utenteNome: 'Nico',
  schedaId: 's-nico',
  completamento: {
    schedaId: 's-nico',
    data: ore(2),
    nomeScheda: 'Forza & Ipertrofia',
    nomeGiorno: 'Petto e tricipiti',
    settimana: 3,
    durataSec: 4200,
    visibilita: 'pubblica',
    esercizi: [
      es('Panca piana', 'petto', 5),
      es('Panca inclinata manubri', 'petto', 4),
      es('Croci ai cavi', 'petto', 3),
      es('Dip', 'tricipiti', 3),
      es('Push down', 'tricipiti', 3),
      es('French press', 'tricipiti', 3),
      es('Alzate laterali', 'spalle', 4),
      es('Crunch', 'addome', 3),
    ],
  },
}

const aMano = {
  utenteId: 'io',
  utenteNome: 'Prova',
  schedaId: 's-io',
  completamento: {
    // Senza schedaId nel json, come quelli segnati a mano: la chiave la fa la scheda.
    data: ore(26),
    nomeGiorno: 'Giorno B',
    nomeScheda: 'La mia scheda',
    visibilita: 'pubblica',
  },
}

impostaCollettivo([lungo, aMano])

const chiaveLungo = `s-nico|${lungo.completamento.data}`
const chiaveAMano = `s-io|${aMano.completamento.data}`


const [verticale, orizzontale, quadrata, fotoCommento] = await Promise.all([
  immagine(1080, 1350, '#2b6cb0', 'Verticale'),
  immagine(1600, 900, '#c05621', 'Orizzontale'),
  immagine(1080, 1080, '#2f855a', 'Quadrata'),
  immagine(1200, 900, '#6b46c1', 'Nel commento'),
])
seminaFoto(chiaveLungo, verticale)
seminaFoto(chiaveLungo, orizzontale)
seminaFoto(chiaveAMano, quadrata)
seminaInterazioni(chiaveAMano, { like: [], righe: [] })
// Tre mi piace (uno è il mio) e tre commenti, l'ultimo solo con una foto.
seminaInterazioni(chiaveLungo, {
  like: ['giulia', 'marco', 'io'],
  righe: [
    { userId: 'giulia', testo: 'Che volume oggi 💪' },
    { userId: 'marco', testo: 'Quanto hai messo sulla panca?' },
    { userId: 'nico', testo: '', fotoUrl: URL.createObjectURL(fotoCommento) },
  ],
})

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <FeedPage />
  </StrictMode>,
)
