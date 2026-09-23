import { useEffect, useState } from 'react'
import { contaNonLetti } from '../lib/chat'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Quanti messaggi non letti: il pallino sulla linguetta Amici.
//
// Il conto lo fa il database (`messaggi_non_letti()`), non l'app: contare qui
// vorrebbe dire scaricare tutti i messaggi per sapere quanti non se ne sono
// letti.
//
// Due cose lo aggiornano, e servono tutte e due:
//   · il TEMPO REALE, per quelli che arrivano mentre l'app è aperta;
//   · il cambio di ROTTA, perché leggere una chat li segna letti e il pallino
//     deve scendere. Senza, resterebbe acceso fino alla riapertura dell'app —
//     cioè un pallino che dice una bugia.
// ---------------------------------------------------------------------------

export default function useMessaggiNonLetti(ioId, rotta) {
  const [quanti, setQuanti] = useState(0)

  useEffect(() => {
    if (!ioId) return
    let vivo = true
    const aggiorna = () => contaNonLetti().then((n) => vivo && setQuanti(n))
    aggiorna()

    const canale = supabase
      .channel('non-letti:' + ioId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `a_id=eq.${ioId}` },
        aggiorna,
      )
      .subscribe()

    return () => {
      vivo = false
      supabase.removeChannel(canale)
    }
    // `rotta` fra le dipendenze apposta: cambiare schermata rifà il conto.
  }, [ioId, rotta])

  // Senza un utente il conto e' zero e basta: si deduce, non si azzera a mano
  // dentro l'effetto — quel modo lascia il valore vecchio a schermo per un
  // istante, cioe' il pallino di chi si e' appena disconnesso.
  return ioId ? quanti : 0
}
