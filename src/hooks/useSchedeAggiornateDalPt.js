import { useEffect, useRef } from 'react'
import { useStore } from '../store/StoreContext'
import { aggiornaSchedeDalPt } from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Le schede del PT tenute al passo sul telefono dell'atleta, in tutta l'app e
// non solo in Home: la notifica di una modifica arriva da ogni pagina, e la
// scheda aperta deve già essere quella nuova.
//
// Si guarda a ogni cambio di schermata, al ritorno sull'app e ogni minuto, come
// le notifiche (hooks/useNotificheNuove). Non durante l'allenamento: gli
// esercizi non devono cambiare sotto le mani.
// ---------------------------------------------------------------------------

const OGNI_MS = 60000

export default function useSchedeAggiornateDalPt(rotta) {
  const { schede, aggiornaScheda } = useStore()
  // Da un ref: l'aggiornamento cambia le schede, e la lettura non deve
  // ripartire da capo.
  const store = useRef({ schede, aggiornaScheda })
  const inCorso = useRef(false)
  useEffect(() => {
    store.current = { schede, aggiornaScheda }
  }, [schede, aggiornaScheda])

  useEffect(() => {
    if (rotta === 'allenamento') return undefined
    const guarda = async () => {
      if (inCorso.current || document.visibilityState !== 'visible') return
      inCorso.current = true
      try {
        await aggiornaSchedeDalPt(store.current.schede, (s) => store.current.aggiornaScheda(s))
      } finally {
        inCorso.current = false
      }
    }
    guarda()
    const timer = setInterval(guarda, OGNI_MS)
    document.addEventListener('visibilitychange', guarda)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', guarda)
    }
  }, [rotta])
}
