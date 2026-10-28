// ---------------------------------------------------------------------------
// "È andato tutto bene?": la domanda che compare da sola dopo aver salvato un
// allenamento (components/FeedbackAllenamento). Qui c'è solo la regola di
// QUANDO chiederlo, a parte perché si prova senza React (tests/).
//
//   - la prima volta: subito, al primo allenamento salvato. Vale anche per
//     chi c'era già prima di questa funzione: non ha la data, quindi glielo
//     si chiede al prossimo;
//   - poi di rado: non prima di GIORNI_TRA_UNA_E_L_ALTRA giorni dall'ultima
//     volta che è comparsa (inviata o chiusa con "Non ora", è uguale: chi l'ha
//     chiusa non la vuole rivedere dopo un'ora).
//
// La data dell'ultima volta sta nelle preferenze del profilo, negli `avvisi`
// (come le mini-guide, lib/guide), così vale su tutti i dispositivi.
// ---------------------------------------------------------------------------

export const CHIAVE_FEEDBACK = 'feedback-allenamento'
export const GIORNI_TRA_UNA_E_L_ALTRA = 7

const GIORNO_MS = 24 * 60 * 60 * 1000

// `ultima`: la data ISO dell'ultima volta che è comparsa (o niente).
export function deveChiedereFeedback(ultima, adesso = new Date()) {
  if (!ultima) return true
  const t = Date.parse(ultima)
  // Una data rovinata non deve far comparire la domanda a ogni allenamento,
  // ma nemmeno spegnerla per sempre: si tratta come mai vista.
  if (Number.isNaN(t)) return true
  return adesso.getTime() - t >= GIORNI_TRA_UNA_E_L_ALTRA * GIORNO_MS
}
