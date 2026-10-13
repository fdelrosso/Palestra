import { useSyncExternalStore } from 'react'
import { useAccount } from '../store/AccountContext'
import { isPt } from '../lib/pt'

// ---------------------------------------------------------------------------
// La modalità di un PT: 'atleta' (l'app di sempre: le sue schede, i suoi
// allenamenti) o 'pt' (la Home diventa Lavoro: gli atleti che segue).
//
// Si cambia dal Profilo ("Passa a modalità PT" / "Passa a modalità Atleta") e
// dall'interruttore Personale | Lavoro (components/ModoPtSwitch). UNA per tutta
// l'app: la guarda App per decidere cosa mostrare come Home.
//
// È per DISPOSITIVO e per persona (localStorage, chiave con l'id), come i
// colori: è un modo di guardare l'app, non un dato dell'account. Chi non è un
// PT è sempre in modalità atleta, qualunque cosa ci sia scritta.
// ---------------------------------------------------------------------------

const ascoltatori = new Set()
const chiave = (id) => `palestra:modalita:${id}`

function leggi(id) {
  if (!id) return 'atleta'
  try {
    return localStorage.getItem(chiave(id)) === 'pt' ? 'pt' : 'atleta'
  } catch {
    return 'atleta'
  }
}

export function impostaModalita(id, modalita) {
  if (!id) return
  try {
    localStorage.setItem(chiave(id), modalita === 'pt' ? 'pt' : 'atleta')
  } catch {
    // Niente storage: la modalità non si ricorda, l'app funziona lo stesso.
  }
  for (const f of ascoltatori) f()
}

/** { modoPt, sonoPt, passaA(modalita) } per chi è entrato. */
export default function useModalitaPt() {
  const { utenteCorrente } = useAccount()
  const id = utenteCorrente?.id || null
  const sonoPt = isPt(utenteCorrente)
  const modalita = useSyncExternalStore(
    (f) => {
      ascoltatori.add(f)
      return () => ascoltatori.delete(f)
    },
    () => leggi(id),
  )
  return {
    sonoPt,
    modoPt: sonoPt && modalita === 'pt',
    passaA: (m) => impostaModalita(id, m),
  }
}
