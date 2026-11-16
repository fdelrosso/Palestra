import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EVENTO_PROPOSTE as EVENTO } from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Quante schede e diete mi ha mandato il PT e aspettano una risposta: il
// numero rosso sulle voci Allenamento e Dieta della barra (components/
// BarraBasso), dove stanno le loro card (SchedeDalPt, DieteDalPt). Prima una
// dieta arrivata non si vedeva finché non si apriva Dieta per caso.
//
// Come hooks/useNotificheNuove: si rilegge a ogni cambio di schermata, ogni
// minuto, al ritorno sull'app, e subito dopo una risposta (EVENTO_PROPOSTE,
// lanciato da lib/proposteScheda e lib/proposteDieta). Solo i conti, non le
// proposte: `head` non si porta dietro le righe.
// ---------------------------------------------------------------------------

const OGNI_MS = 60000

async function conta(tabella, ioId) {
  const { count, error } = await supabase
    .from(tabella)
    .select('id', { count: 'exact', head: true })
    .eq('atleta_id', ioId)
    .eq('stato', 'attesa')
  return error ? null : count || 0
}

export default function useProposteDalPt(ioId, rotta) {
  const [quante, setQuante] = useState({ schede: 0, diete: 0 })

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const aggiorna = () => {
      if (document.hidden) return
      Promise.all([conta('schede_proposte', ioId), conta('diete_proposte', ioId)]).then(([schede, diete]) => {
        // Senza rete si tiene il numero di prima invece di azzerarlo.
        if (vivo) setQuante((q) => ({ schede: schede ?? q.schede, diete: diete ?? q.diete }))
      })
    }
    aggiorna()
    const timer = setInterval(aggiorna, OGNI_MS)
    document.addEventListener('visibilitychange', aggiorna)
    window.addEventListener(EVENTO, aggiorna)
    return () => {
      vivo = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
      window.removeEventListener(EVENTO, aggiorna)
    }
    // `rotta` fra le dipendenze apposta: cambiare schermata rifà il conto.
  }, [ioId, rotta])

  return ioId ? quante : { schede: 0, diete: 0 }
}
