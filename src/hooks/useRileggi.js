import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Rilegge da solo quello che può cambiare dall'altra parte (l'atleta che
// accetta un orario, e il PT se lo trova in agenda): tornando sull'app e ogni
// minuto, con l'app in vista. Come gli appuntamenti in lib/appuntamenti.
// `rileggi` deve restare la stessa fra un render e l'altro (useCallback).
// ---------------------------------------------------------------------------

const OGNI_MS = 60000

export default function useRileggi(rileggi) {
  useEffect(() => {
    const seVisibile = () => document.visibilityState === 'visible' && rileggi()
    document.addEventListener('visibilitychange', seVisibile)
    const timer = setInterval(seVisibile, OGNI_MS)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', seVisibile)
    }
  }, [rileggi])
}
