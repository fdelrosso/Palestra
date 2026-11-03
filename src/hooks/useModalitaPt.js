import { useAccount } from '../store/AccountContext'
import { isPt, isSoloPt, ruoloScelto } from '../lib/pt'
import { impostaModalita } from '../lib/modalita'

// ---------------------------------------------------------------------------
// La modalità di chi è "Tutti e due": sceglie in alto a destra nel Profilo
// (components/ModoPtSwitch) e l'app intera diventa quella di un solo atleta o
// di un solo PT. Il lavoro lo fa AccountContext: `utenteCorrente` è già la
// persona come va mostrata (lib/pt, vistaUtente), quindi `sonoPt` e `soloPt`
// qui valgono per quello che si vede; il ruolo vero è in `utenteVero`.
// ---------------------------------------------------------------------------

/** { modoPt, sonoPt, soloPt, dueRuoli, passaA(modalita) } per chi è entrato. */
export default function useModalitaPt() {
  const { utenteCorrente, utenteVero } = useAccount()
  const soloPt = isSoloPt(utenteCorrente)
  return {
    sonoPt: isPt(utenteCorrente),
    soloPt,
    modoPt: soloPt,
    dueRuoli: !!utenteVero && ruoloScelto(utenteVero) === 'entrambi',
    passaA: (m) => impostaModalita(utenteVero?.id, m),
  }
}
