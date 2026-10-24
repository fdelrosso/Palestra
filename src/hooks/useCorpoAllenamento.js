import { useAccount } from '../store/AccountContext'
import { corpoDiAllenamento, useCorpo } from '../lib/corpoImmagini'

// ---------------------------------------------------------------------------
// Il corpo ('uomo'|'donna') con cui disegnare un allenamento: quello salvato
// con lui (`riep.corpo`, lo mette terminaSessione dal sesso di chi si
// allena), se no il proprio per i propri e l'uomo per quelli degli altri
// (lib/corpoImmagini corpoDiAllenamento).
// ---------------------------------------------------------------------------
export default function useCorpoAllenamento(riep) {
  const { utenteCorrente } = useAccount()
  return useCorpo(corpoDiAllenamento(riep, utenteCorrente?.id))
}
