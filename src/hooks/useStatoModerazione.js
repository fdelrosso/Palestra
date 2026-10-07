import { useEffect, useSyncExternalStore } from 'react'
import { STATO_LIBERO, statoModerazione } from '../lib/segnalazioni'

// ---------------------------------------------------------------------------
// Come sono messo con la moderazione: pubblicazione o account bloccati, e se
// ho già chiesto lo sblocco (lib/segnalazioni, Termini punto 7).
//
// UNO per tutta l'app: lo guardano la shell (account bloccato → la sua
// schermata), il Feed, i commenti e le foto. Si rilegge quando l'app torna in
// primo piano e quando lo chiede qualcuno (`aggiornaStatoModerazione`, per
// esempio dopo aver letto un avviso o mandato una richiesta): un blocco deciso
// mentre l'app era aperta arriva al prossimo ritorno, non serve ricaricare.
// ⚠️ È solo per MOSTRARE: i blocchi veri li fa il database.
// ---------------------------------------------------------------------------

let stato = STATO_LIBERO
let perChi = null
const ascoltatori = new Set()

function avvisa() {
  for (const f of ascoltatori) f()
}

export async function aggiornaStatoModerazione() {
  if (!perChi) return
  const chi = perChi
  const nuovo = await statoModerazione()
  if (chi !== perChi) return
  stato = nuovo
  avvisa()
}

export default function useStatoModerazione(ioId) {
  useEffect(() => {
    if (!ioId) return undefined
    if (perChi !== ioId) {
      perChi = ioId
      stato = STATO_LIBERO
      avvisa()
    }
    aggiornaStatoModerazione()
    const torna = () => document.visibilityState === 'visible' && aggiornaStatoModerazione()
    document.addEventListener('visibilitychange', torna)
    return () => document.removeEventListener('visibilitychange', torna)
  }, [ioId])

  return useSyncExternalStore(
    (f) => {
      ascoltatori.add(f)
      return () => ascoltatori.delete(f)
    },
    () => stato,
  )
}
