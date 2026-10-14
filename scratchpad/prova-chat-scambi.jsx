// ---------------------------------------------------------------------------
// Le cose mandate fra amici DENTRO la chat, senza login e senza database.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-chat-scambi.html
//       una scheda ricevuta, un allenamento mandato, una foto permanente,
//       una foto "una volta" ricevuta e una mandata, in fila coi messaggi.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFinto } from './finto-store-vivo.js'
import { filaChat, scambiCon } from '../src/lib/scambi.js'
import { BollaScambio } from '../src/components/Scambiati.jsx'
import '../src/index.css'

const io = 'io'
const ale = 'ale'
const ora = Date.now()
const fa = (min) => new Date(ora - min * 60000).toISOString()
const fra = (ore) => new Date(ora + ore * 3600000).toISOString()

const scheda = {
  id: 's1',
  nome: 'Push Pull Legs',
  numeroSettimane: 8,
  nota: 'Recuperi 2 minuti sui multiarticolari.',
  giorni: [
    {
      id: 'g1',
      tipo: 'workout',
      nome: 'Giorno A · Push',
      esercizi: [
        { id: 'e1', nome: 'Panca piana', schemaBase: { serie: 4, rip: 8 } },
        { id: 'e2', nome: 'Military press', schemaBase: { serie: 3, rip: 10 } },
        { id: 'e3', nome: 'Dip', schemaBase: { serie: 3, rip: 12 } },
      ],
    },
    {
      id: 'g2',
      tipo: 'workout',
      nome: 'Giorno B · Pull',
      esercizi: [
        { id: 'e4', nome: 'Trazioni', schemaBase: { serie: 4, rip: 6 } },
        { id: 'e5', nome: 'Rematore', schemaBase: { serie: 3, rip: 10 } },
      ],
    },
  ],
}

const allenamento = {
  nomeScheda: 'Forza 5x5',
  nomeGiorno: 'Giorno A',
  durataSec: 3900,
  esercizi: [
    { nome: 'Squat', schema: { serie: 5, rip: 5 }, sets: Array.from({ length: 5 }, () => ({ colore: 'verde', rip: 5 })) },
    { nome: 'Panca piana', schema: { serie: 5, rip: 5 }, sets: Array.from({ length: 5 }, (_, i) => ({ colore: i < 4 ? 'verde' : 'giallo', rip: 5 })) },
  ],
}

const condivisioni = {
  ricevute: [{ id: 'c1', tipo: 'scheda', titolo: scheda.nome, daId: ale, daNome: 'Ale', aId: io, creataIl: fa(50), vistaIl: fa(10), payload: scheda }],
  inviate: [{ id: 'c2', tipo: 'allenamento', titolo: 'Giorno A', daId: io, aId: ale, creataIl: fa(30), vistaIl: null, payload: allenamento }],
}
const effimeri = {
  ricevuti: [
    { id: 'p1', tipo: 'foto', permanente: true, daId: ale, daNome: 'Ale', aId: io, inviatoIl: fa(20), apertoIl: null, scadeIl: '9999-12-31T23:59:59Z' },
    { id: 'u1', tipo: 'foto', permanente: false, daId: ale, daNome: 'Ale', aId: io, inviatoIl: fa(5), apertoIl: null, scadeIl: fra(23) },
  ],
  inviati: [{ id: 'u2', tipo: 'video', permanente: false, daId: io, aId: ale, inviatoIl: fa(2), consumato: true, scadeIl: fra(23) }],
}
const messaggi = [
  { id: 'm1', da_id: ale, a_id: io, testo: 'Ti mando la scheda nuova', creato_il: fa(51) },
  { id: 'm2', da_id: io, a_id: ale, testo: 'Grazie! Ecco il mio di oggi', creato_il: fa(31) },
]

// Una "foto" finta: un riquadro colorato disegnato al volo.
const tela = document.createElement('canvas')
tela.width = 600
tela.height = 450
const g = tela.getContext('2d')
const sf = g.createLinearGradient(0, 0, 600, 450)
sf.addColorStop(0, '#3aa0ff')
sf.addColorStop(1, '#1b2a44')
g.fillStyle = sf
g.fillRect(0, 0, 600, 450)
g.fillStyle = '#fff'
g.font = 'bold 54px sans-serif'
g.fillText('Foto di Ale', 150, 240)
tela.toBlob((blob) => {
  impostaFinto({ io: { id: io, nome: 'Filippo' }, blobFinto: blob })
  const fila = filaChat(messaggi, scambiCon(condivisioni, effimeri, ale))
  createRoot(document.getElementById('radice')).render(
    <StrictMode>
      <div className="app chat-app">
        <div className="chat-righe">
          {fila.map((x) =>
            x.genere === 'messaggio' ? (
              <div key={x.id} className={'chat-bolla' + (x.m.da_id === io ? ' mia' : '')}>
                <div className="chat-testo">{x.m.testo}</div>
              </div>
            ) : (
              <BollaScambio key={x.genere + x.id} s={x} onApri={() => console.log('apri', x.id)} />
            ),
          )}
        </div>
      </div>
    </StrictMode>,
  )
})
