// ---------------------------------------------------------------------------
// Il FEED per il carosello Social (poster/feed.html): due post con le foto
// vere di poster/foto/ come sfondo. Scatto: poster/screenshot.mjs.
//   → http://localhost:5174/scratchpad/prova-poster-feed.html
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import { impostaCollettivo } from './finto-collettivo.js'
import { seminaFoto } from './finte-foto-allenamento.js'
import { seminaInterazioni } from './finte-interazioni.js'
import FeedPage from '../src/pages/FeedPage.jsx'
import '../src/index.css'

const colori = ['verde', 'verde', 'giallo', 'giallo', 'rosso']
const es = (nome, gruppo, n, rip) => ({ nome, gruppo, gruppi: [gruppo], schema: { serie: String(n), ripetizioni: rip }, sets: colori.slice(0, n).map((colore) => ({ colore })) })
const ore = (h) => new Date(Date.now() - h * 3600e3).toISOString()

const post = (utenteId, utenteNome, h, nomeScheda, nomeGiorno, durataSec, esercizi, sfondo, musica) => ({
  utenteId, utenteNome, schedaId: 's-' + utenteId,
  completamento: { schedaId: 's-' + utenteId, data: ore(h), nomeScheda, nomeGiorno, settimana: 2, durataSec, visibilita: 'pubblica', sfondo, musica, esercizi },
})
const gambe = post('nico', 'Nico', 5, 'Forza', 'Gambe', 3900, [
  es('Leg press', 'quadricipiti', 4, '10'), es('Squat', 'quadricipiti', 4, '6'),
  es('Affondi', 'glutei', 3, '12'), es('Leg curl', 'femorali', 3, '12'), es('Calf raise', 'polpacci', 4, '15'),
], 'f0', { id: '1727526894', titolo: 'Training Season', artista: 'Dua Lipa', copertina: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/82/89/15/828915ea-d716-61c4-3de7-ef00c1f800fb/5054197853630.jpg/600x600bb.jpg' })
const braccia = post('giulia', 'Giulia', 2, 'Tonificazione', 'Braccia e spalle', 2700, [
  es('Curl manubri', 'bicipiti', 3, '12'), es('Alzate laterali', 'spalle', 4, '15'),
  es('French press', 'tricipiti', 3, '12'), es('Push down', 'tricipiti', 3, '15'),
], 'f1', { id: '1869008371', titolo: 'We Shine', artista: '22simba', copertina: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7d/48/41/7d48415c-1685-3796-89ec-5305cb660868/26UMGIM03127.rgb.jpg/600x600bb.jpg' })
impostaCollettivo([braccia, gambe])

const blob = (f) => fetch('/poster/foto/' + f).then((r) => r.blob())
const chiave = (p) => `${p.schedaId}|${p.completamento.data}`
seminaFoto(chiave(gambe), await blob('pressa.jpg'))
seminaFoto(chiave(braccia), await blob('manubri.jpg'), { user_id: 'giulia' })
seminaInterazioni(chiave(gambe), { like: ['giulia', 'marco'], righe: [{ userId: 'marco', testo: 'Bella pressa!' }] })
seminaInterazioni(chiave(braccia), { like: ['nico'], righe: [] })

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(<FeedPage />)
