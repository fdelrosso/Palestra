// Il numero rosso del cuoricino nei banchi di prova: quello delle notifiche
// finte (scratchpad/finte-notifiche.js), senza database.
import { useEffect, useState } from 'react'
import { contaNuove, leggiNotifiche } from './finte-notifiche.js'

export default function useNotificheNuove(ioId, rotta) {
  const [n, setN] = useState(0)
  useEffect(() => {
    leggiNotifiche().then((e) => setN(contaNuove(e.righe)))
  }, [ioId, rotta])
  return ioId ? n : 0
}
