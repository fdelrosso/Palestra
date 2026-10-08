// ---------------------------------------------------------------------------
// La MODERAZIONE senza login e senza database (finte-segnalazioni).
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-moderazione.html
//       la pagina del moderatore: un commento segnalato da tre persone (già
//       nascosto), una foto con "Altro"; Nico ha già 2 contenuti tolti, quindi
//       togliere il prossimo gli blocca la pubblicazione. In cima un campo per
//       provare il filtro delle parole.
//   → …?modo=avvisi        l'avviso che trova chi si è visto togliere qualcosa
//   → …?modo=pubblicazione il riquadro con la pubblicazione bloccata
//   → …?modo=account       la schermata dell'account bloccato
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { impostaFintaModerazione, segnala, seminaRichiesta } from './finte-segnalazioni.js'
import { MESSAGGIO_PAROLE, installaFiltroLinguaggio } from '../src/lib/linguaggio.js'
import ModerazionePage from '../src/pages/ModerazionePage.jsx'
import { AccountBloccato, AvvisiModerazione, BloccoPubblicazione } from '../src/components/Moderazione.jsx'
import '../src/index.css'

installaFiltroLinguaggio({
  onCoperto: () => {
    let el = document.getElementById('avviso-parole')
    if (!el) {
      el = document.createElement('div')
      el.id = 'avviso-parole'
      el.className = 'avviso-parole'
      document.body.appendChild(el)
    }
    el.textContent = MESSAGGIO_PAROLE
    el.classList.add('visibile')
    setTimeout(() => el.classList.remove('visibile'), 3000)
  },
})

const modo = new URLSearchParams(location.search).get('modo') || 'moderatore'

let pagina
if (modo === 'moderatore') {
  await segnala({ tipo: 'commento', oggetto: 'c1', motivo: 'volgare', da: 'giulia' })
  await segnala({ tipo: 'commento', oggetto: 'c1', motivo: 'offensivo', dettaglio: 'Prende in giro il fisico di Giulia', da: 'marco' })
  await segnala({ tipo: 'commento', oggetto: 'c1', motivo: 'offensivo', da: 'luca' })
  await segnala({ tipo: 'foto', oggetto: 'f1', motivo: 'altro', dettaglio: 'C’è il viso di un bambino', da: 'giulia' })
  // Due contenuti già tolti a Nico (due decisioni finte).
  for (const o of ['x1', 'x2']) {
    await segnala({ tipo: 'commento', oggetto: o, motivo: 'volgare', da: 'marco' })
    const { decidi } = await import('./finte-segnalazioni.js')
    await decidi({ tipo: 'commento', oggetto: o }, 'rimossa', 'volgare')
  }
  pagina = (
    <>
      <input className="input" placeholder="Prova il filtro: scrivi qui" style={{ margin: 12, width: 'calc(100% - 24px)' }} />
      <ModerazionePage />
    </>
  )
} else if (modo === 'avvisi') {
  impostaFintaModerazione({
    avvisiDaMostrare: [
      {
        titolo: 'Un tuo contenuto è stato tolto',
        testo:
          'Il tuo commento «sei proprio un *****» è stato tolto perché segnalato come offensivo o di odio, contro le regole della community. È il secondo avviso. Al terzo contenuto tolto non potrai più pubblicare nel Feed, al quarto l’account verrà bloccato.',
      },
    ],
  })
  pagina = <AvvisiModerazione ioId="io" />
} else if (modo === 'pubblicazione') {
  impostaFintaModerazione({ stato: { tolti: 3, pubblicazioneBloccata: true } })
  pagina = (
    <div className="app">
      <BloccoPubblicazione ioId="io" />
    </div>
  )
} else {
  impostaFintaModerazione({ stato: { tolti: 4, pubblicazioneBloccata: true, accountBloccato: true } })
  pagina = <AccountBloccato ioId="io" />
}
if (modo === 'moderatore') seminaRichiesta('pubblicazione', 'Scusate, ho esagerato. Non succederà più.')

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(<StrictMode>{pagina}</StrictMode>)
