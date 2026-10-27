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
import AllenamentoSvoltoPage from '../src/pages/AllenamentoSvoltoPage.jsx'
import FeedbackAllenamento from '../src/components/FeedbackAllenamento.jsx'
import { chiaveAllenamento } from '../src/lib/fotoAllenamento.js'
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
  esercizi: esercizi.map(([nome, gruppo, schema, colori]) => ({
    nome,
    gruppo,
    gruppi: [gruppo],
    schema,
    sets: colori.map((colore) => ({ colore })),
  })),
}
// Tre allenamenti vecchi: uno normale, uno di 16 ore e uno segnato a mano.
const giorniFa = (n, h = 0) => {
  const d = new Date(fine)
  d.setDate(d.getDate() - n)
  d.setHours(d.getHours() - h)
  return d.toISOString()
}
const vecchio = { ...riep, data: giorniFa(3), nota: 'Panca pesante oggi, ma chiusa.', fcMedia: 128, visibilita: 'pubblica' }
const sospetto = { ...riep, data: giorniFa(5), durataSec: 16 * 3600 }
const aMano = { schedaId: 's1', nomeScheda: 'Allenamenti', giornoId: giorno.id, nomeGiorno: 'Push A', data: giorniFa(7) }
const scheda = nuovaScheda({
  id: 's1',
  nome: 'Allenamenti',
  libera: true,
  numeroSettimane: 1,
  giorni: [giorno],
  completamenti: [vecchio, sospetto, aMano],
})
impostaFinto({ schede: [scheda], sessione: null })

const niente = () => {}

// ------------------------------------------------------------------ oggi
function Oggi() {
  return (
    <Riepilogo
      riep={riep}
      dest="#"
      giornoLibero={giorno}
      onRiprendi={() => alert('Torni dentro l’allenamento.')}
      onSalvaAllenamento={niente}
      eserciziInScheda={giorno.esercizi}
      onAllegati={niente}
      onElimina={niente}
      schede={[scheda]}
      diete={[]}
      dati={{}}
      utente="Prova"
      ioId="io"
      onSalvaCommento={niente}
      onSalvaNome={niente}
      onSalvaOrologio={niente}
      onSalvaVisibilita={niente}
      onSalvaLayout={niente}
      onSalvaSfondo={niente}
    />
  )
}

const VECCHI = { vecchio, sospetto, amano: aMano }
const v = new URLSearchParams(location.search).get('v')
const Pagina = VECCHI[v] ? () => <AllenamentoSvoltoPage chiave={chiaveAllenamento(VECCHI[v])} /> : Oggi

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Pagina />
    {/* "È andato tutto bene?" dopo "Chi può vederlo?", come in App. */}
    <FeedbackAllenamento />
  </StrictMode>,
)
