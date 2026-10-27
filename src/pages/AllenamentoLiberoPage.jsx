import { useEffect, useRef } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'

// "Allenamento libero" dalla Home (pages/InizioPage, components/StradeInizio):
// un allenamento solo per oggi, senza scheda, che parte SUBITO.
// Per prepararne uno prima, e magari tenerlo, c'è "Nuovo allenamento" nella
// sezione Allenamento (pages/NuovoAllenamentoPage).
//
// ⚠️ Non c'è più niente da scrivere prima (dal 2026-10-27): si apre SUBITO
// l'allenamento, vuoto, e gli esercizi — riscaldamento compreso — si
// aggiungono man mano che si fanno, dalla card "Aggiungi" in fondo alla
// pista (pages/WorkoutSession). Prima qui c'era un editor in cui scrivere
// tutto e poi "Avvia".
//
// Si appoggia alla scheda-contenitore `libera:true` (iniziaAllenamentoLibero):
// il completamento arriva in calendario e nello storico, e a fine allenamento
// il riepilogo chiede se tenerlo (Giorno.salvato).
//
// Con un allenamento già in corso non se ne apre un altro: si torna a quello.
// La rotta resta solo per non cambiare chi ci porta: qui si passa e basta
// (`sostituisci`, così "indietro" dalla sessione non riapre questa).
export default function AllenamentoLiberoPage() {
  const { sessione, iniziaAllenamentoLibero } = useStore()
  // Una volta sola: in sviluppo React monta due volte, e ne aprirebbe due.
  const fatto = useRef(false)
  useEffect(() => {
    if (fatto.current) return
    fatto.current = true
    if (!sessione) iniziaAllenamentoLibero({ nome: 'Allenamento libero' })
    navigate(routes.allenamento(), { sostituisci: true })
  }, [sessione, iniziaAllenamentoLibero])
  return null
}
