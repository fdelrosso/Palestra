// ---------------------------------------------------------------------------
// La card del RECUPERO, da sola, in un browser vero.
//
//   npm run dev  →  http://localhost:5173/scratchpad/prova-timer.html
//
// Perché esiste: l'allenamento sta dietro al login e dentro a uno store vero,
// ma un timer si rompe con le dita — si preme un preimpostato mentre corre,
// si mette in pausa, si fa reset, si cambia esercizio a metà recupero. Qui la
// card è quella VERA (components/TimerRecupero) col gancio VERO
// (hooks/useRestTimer): di finto c'è solo il recupero della scheda, che si
// cambia col menù in alto per far finta di passare a un altro esercizio.
//
// ⚠️ Il beep a zero suona davvero, e lo schermo non si spegne (wake lock).
// ---------------------------------------------------------------------------
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import TimerRecupero from '../src/components/TimerRecupero.jsx'
import { useRestTimer } from '../src/hooks/useRestTimer.js'
import { formatSec } from '../src/lib/parseRecupero.js'
import '../src/index.css'

// Come nella scheda: qualche recupero scritto a mano dal PT, compreso uno che
// non cade sulla scala dei 15 secondi (80" = "1,20min").
const ESERCIZI = [
  { nome: 'Panca piana', recupero: 90 },
  { nome: 'Croci ai cavi', recupero: 45 },
  { nome: 'Stacchi', recupero: 180 },
  { nome: 'Curl manubri ("1,20min")', recupero: 80 },
]

export function Prova() {
  const timer = useRestTimer()
  const [i, setI] = useState(0)
  const recuperoScheda = ESERCIZI[i].recupero

  // Quello che in WorkoutSession fa l'effetto al cambio di esercizio: rimette
  // il recupero della scheda, senza disturbare un recupero già partito.
  useEffect(() => {
    timer.imposta(recuperoScheda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Recupero</h2>
      <p className="vis-hint">
        Prove da fare: premere un preimpostato a timer fermo e a timer acceso; cambiare esercizio
        mentre il recupero corre (non si deve toccare) e a timer fermo (deve tornare quello della
        scheda); start, pausa, reset.
      </p>

      <div className="field">
        <label htmlFor="quale">Esercizio (finto)</label>
        <select id="quale" className="select" value={i} onChange={(e) => setI(Number(e.target.value))}>
          {ESERCIZI.map((e, k) => (
            <option key={e.nome} value={k}>
              {e.nome} — scheda {formatSec(e.recupero)}
            </option>
          ))}
        </select>
      </div>

      <TimerRecupero timer={timer} recuperoScheda={recuperoScheda} />

      <pre style={{ fontSize: 12 }}>
        {`durata ${timer.durata}  ·  rimanente ${Math.round(timer.rimanente)}  ·  ` +
          `attivo ${timer.attivo}  ·  avviato ${timer.avviato}`}
      </pre>
    </div>
  )
}

// ⚠️ La radice si crea UNA volta sola: Vite ri-esegue questo file a ogni
// salvataggio, e un createRoot() in più sullo stesso nodo riempie la console
// di errori di React che non c'entrano niente con quello che si sta provando.
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <Prova />
  </StrictMode>,
)
