import { useEffect, useState } from 'react'
import { contaNuove, leggiNotifiche } from '../lib/notifiche'

// ---------------------------------------------------------------------------
// Quanti mi piace e commenti nuovi sui propri allenamenti: il numero rosso
// sulla voce Profilo e sul cuoricino (lib/notifiche).
//
// Si rilegge a ogni cambio di schermata (aprire il cuoricino lo azzera, e il
// numero deve scendere subito) e ogni minuto mentre l'app è aperta. Niente
// tempo reale: si dovrebbe ascoltare ogni mi piace di tutta l'app per tenere
// quelli sui propri allenamenti.
// ---------------------------------------------------------------------------

const OGNI_MS = 60000

export default function useNotificheNuove(ioId, rotta) {
  const [quante, setQuante] = useState(0)

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const aggiorna = () =>
      leggiNotifiche().then((esito) => vivo && esito.ok && setQuante(contaNuove(esito.righe)))
    aggiorna()
    const timer = setInterval(aggiorna, OGNI_MS)
    return () => {
      vivo = false
      clearInterval(timer)
    }
    // `rotta` fra le dipendenze apposta: cambiare schermata rifà il conto.
  }, [ioId, rotta])

  return ioId ? quante : 0
}
