// Prova del modulo "Correggi l'allenamento" (src/components/ModificaAllenamento).
//
//     node scratchpad/prova-modifica.mjs
//
// Il caso che conta: chi ha dimenticato di premere "Termina" non sa di dover
// cercare un pulsante. Con una durata sospetta il modulo deve aprirsi da solo e
// dire perche'; con una normale deve restare un pulsante e basta.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const server = await createServer({
  configFile: false, root: process.cwd(), logLevel: 'error',
  server: { middlewareMode: true }, appType: 'custom',
  optimizeDeps: { noDiscovery: true }, plugins: [react()],
})
const { disegna } = await server.ssrLoadModule('/scratchpad/prova-modifica-pagine.jsx')

const testo = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&rsquo;|’/g, "'").replace(/\s+/g, ' ')
let falliti = 0
const prova = (nome, ok) => { console.log((ok ? '  ok   ' : '  NO   ') + nome); if (!ok) falliti++ }

const ieri = new Date(Date.now() - 20 * 3600 * 1000).toISOString()

const sospetto = disegna({ completamento: { data: ieri, durataSec: 16 * 3600, esercizi: [] } })
prova('16 ore: il modulo si apre da solo', testo(sospetto).includes('Correggi l'))
prova('16 ore: dice quanto risulta e perche', testo(sospetto).includes('16 h') && testo(sospetto).includes('Termina'))
prova('ci sono giorno, ora e durata', /type="date"/.test(sospetto) && /type="time"/.test(sospetto) && /aria-label="Ore"/.test(sospetto))
prova('dice che le serie non si toccano', testo(sospetto).includes('Le serie e i colori restano'))

const normale = disegna({ completamento: { data: ieri, durataSec: 70 * 60 } })
prova('durata normale: solo il pulsante', testo(normale).includes('Correggi giorno e durata') && !/type="date"/.test(normale))

const aMano = disegna({ completamento: { data: ieri } })
prova('segnato a mano: resta chiuso', !/type="date"/.test(aMano))

await server.close()
console.log(falliti === 0 ? '\nTutto a posto.\n' : `\n${falliti} prove fallite.\n`)
process.exit(falliti ? 1 : 0)
