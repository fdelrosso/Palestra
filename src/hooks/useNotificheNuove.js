import { useEffect, useState } from 'react'
import { contaNotificheNuove } from '../lib/notifiche'

// ---------------------------------------------------------------------------
// Quanti mi piace e commenti nuovi sui propri allenamenti: il numero rosso
// sulla voce Profilo e sul cuoricino (lib/notifiche).
//
// Si rilegge a ogni cambio di schermata (aprire il cuoricino lo azzera, e il
// numero deve scendere subito), ogni minuto mentre l'app è aperta e al ritorno
// sull'app. Niente tempo reale: si dovrebbe ascoltare ogni mi piace di tutta
// l'app per tenere quelli sui propri allenamenti.
//
// ⚠️ Solo il NUMERO (`notifiche_nuove()`), non le liste: prima ogni minuto
// partivano dieci chiamate con tutte le notifiche dentro, per contarle. E con
// l'app in secondo piano non si chiede niente: nessuno vede il pallino.
// ---------------------------------------------------------------------------

const OGNI_MS = 60000

export default function useNotificheNuove(ioId, rotta) {
  const [quante, setQuante] = useState(0)

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const aggiorna = () => {
      if (document.hidden) return
      contaNotificheNuove().then((n) => vivo && n !== null && setQuante(n))
    }
    aggiorna()
    const timer = setInterval(aggiorna, OGNI_MS)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      vivo = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
    }
    // `rotta` fra le dipendenze apposta: cambiare schermata rifà il conto.
  }, [ioId, rotta])

  return ioId ? quante : 0
}
