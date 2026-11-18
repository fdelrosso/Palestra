// ---------------------------------------------------------------------------
// Per il carosello Social (poster/feed.html): il riepilogo di oggi con la
// foto della pressa come sfondo e Training Season come canzone.
// Copiato da prova-riepilogo.jsx. Sotto, il commento originale.
// ---------------------------------------------------------------------------
// Il RIEPILOGO (components/Riepilogo, quello vero) sopra lo store finto,
// senza fare un allenamento: card, pillole dei campi facoltativi coi loro
// fogli, "Altro", "Riprendi" e "Fatto".
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-riepilogo.html            fine allenamento
//   → …/prova-riepilogo.html?v=vecchio   lo stesso riaperto dal calendario
//                                        (pages/AllenamentoSvoltoPage)
//   → …?v=sospetto   uno di 16 ore: "Correggi" si apre da solo
//   → …?v=amano      uno segnato a mano, senza serie
// Dopo Salva → "Chi può vederlo?" compare "È andato tutto bene?"
// (components/FeedbackAllenamento): la seconda volta, nella stessa pagina, no.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { impostaFinto } from './finto-store-vivo.js'
import Riepilogo from '../src/components/Riepilogo.jsx'
import { chiaveAllenamento } from '../src/lib/fotoAllenamento.js'
import { seminaFoto } from './finte-foto-allenamento.js'
import '../src/index.css'

// ------------------------------------------------------------- i dati finti
const sc = (serie, ripetizioni, carico = '', recupero = '') =>
  schemaVuoto({ serie, ripetizioni, carico, recupero })
const esercizi = [
  ['Panca piana', 'petto', sc('4', '8', '70kg', '2min'), ['verde', 'verde', 'giallo', 'rosso']],
  ['Lat machine', 'schiena', sc('4', '10', '55kg', '1,30min'), ['verde', 'giallo', 'giallo', 'giallo']],
  ['Lento avanti', 'spalle', sc('3', '10', '30kg', '1,30min'), ['verde', 'giallo', 'giallo']],
  ['Curl manubri', 'bicipiti', sc('3', '12', '2x14kg', '1min'), ['verde', 'verde', 'giallo']],
  ['Push down', 'tricipiti', sc('3', '12', '25kg', '1min'), ['giallo', 'rosso', 'rosso']],
]
const giorno = nuovoGiorno({
  nome: 'Push A',
  esercizi: esercizi.map(([nome, gruppo, schemaBase]) => nuovoEsercizio({ nome, gruppo, gruppi: [gruppo], schemaBase })),
})
const fine = new Date()
fine.setMinutes(fine.getMinutes() - 2)
const riep = {
  schedaId: 's1',
  nomeScheda: 'Allenamenti',
  settimana: 1,
  giornoId: giorno.id,
  nomeGiorno: 'Push A',
  data: fine.toISOString(),
  durataSec: 58 * 60,
  sfondo: 'f0',
  musica: { id: '1727526894', titolo: 'Training Season', artista: 'Dua Lipa', copertina: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/82/89/15/828915ea-d716-61c4-3de7-ef00c1f800fb/5054197853630.jpg/600x600bb.jpg' },
  esercizi: esercizi.map(([nome, gruppo, schema, colori]) => ({
    nome,
    gruppo,
    gruppi: [gruppo],
    schema,
    sets: colori.map((colore) => ({ colore })),
  })),
}
seminaFoto(chiaveAllenamento(riep), await fetch('/poster/foto/pressa.jpg').then((r) => r.blob()), { user_id: 'io' })
const scheda = nuovaScheda({ id: 's1', nome: 'Allenamenti', libera: true, numeroSettimane: 1, giorni: [giorno], completamenti: [] })
impostaFinto({ schede: [scheda], sessione: null })
const niente = () => {}
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <Riepilogo riep={riep} dest="#" giornoLibero={giorno} onRiprendi={niente} onSalvaAllenamento={niente}
    eserciziInScheda={giorno.esercizi} onAllegati={niente} onElimina={niente} schede={[scheda]} diete={[]} dati={{}}
    utente="Nico" ioId="io" onSalvaCommento={niente} onSalvaNome={niente} onSalvaOrologio={niente}
    onSalvaVisibilita={niente} onSalvaLayout={niente} onSalvaSfondo={niente} />,
)
