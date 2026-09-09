// ---------------------------------------------------------------------------
// Logica di progressione della scheda.
//
// Regole:
//  - I giorni di tipo "workout" vanno svolti nell'ordine in cui compaiono.
//  - I giorni "rest" non si completano: sono solo informativi e vengono saltati
//    dal suggerimento "prossimo allenamento".
//  - Un allenamento è completato quando esiste un Completamento con la sua
//    coppia (settimana corrente, giornoId).
//  - Il "corrente/suggerito" è il primo giorno workout non ancora completato
//    nella settimana corrente.
//  - Completati tutti i giorni workout della settimana, la settimana è finita e
//    si può avanzare a quella successiva (fino a numeroSettimane).
// ---------------------------------------------------------------------------

/** @returns {import('../data/model').Giorno[]} solo i giorni di allenamento */
export function giorniWorkout(scheda) {
  return scheda.giorni.filter((g) => g.tipo === 'workout')
}

export function isCompletato(scheda, settimana, giornoId) {
  return scheda.completamenti.some((c) => c.settimana === settimana && c.giornoId === giornoId)
}

export function completamentoDi(scheda, settimana, giornoId) {
  return scheda.completamenti.find((c) => c.settimana === settimana && c.giornoId === giornoId)
}

/**
 * Stato sintetico della scheda per l'interfaccia.
 * @returns {{
 *   settimana: number,
 *   giornoCorrente: import('../data/model').Giorno|null,
 *   fattiSettimana: number,
 *   totaliSettimana: number,
 *   settimanaCompletata: boolean,
 *   schedaCompletata: boolean,
 * }}
 */
export function statoScheda(scheda) {
  const settimana = scheda.settimanaCorrente
  const workout = giorniWorkout(scheda)
  const totaliSettimana = workout.length
  const fattiSettimana = workout.filter((g) => isCompletato(scheda, settimana, g.id)).length
  const giornoCorrente = workout.find((g) => !isCompletato(scheda, settimana, g.id)) || null
  const settimanaCompletata = totaliSettimana > 0 && fattiSettimana === totaliSettimana
  const schedaCompletata = settimanaCompletata && settimana >= scheda.numeroSettimane
  return {
    settimana,
    giornoCorrente,
    fattiSettimana,
    totaliSettimana,
    settimanaCompletata,
    schedaCompletata,
  }
}

/** Ritorna una nuova scheda con il giorno segnato come completato nella settimana indicata. */
export function segnaCompletato(scheda, settimana, giornoId) {
  if (isCompletato(scheda, settimana, giornoId)) return scheda
  return {
    ...scheda,
    completamenti: [
      ...scheda.completamenti,
      { settimana, giornoId, data: new Date().toISOString() },
    ],
  }
}

/** Rimuove il completamento (annulla "fatto"). */
export function annullaCompletato(scheda, settimana, giornoId) {
  return {
    ...scheda,
    completamenti: scheda.completamenti.filter(
      (c) => !(c.settimana === settimana && c.giornoId === giornoId),
    ),
  }
}

/** Imposta la settimana corrente (con clamp 1..numeroSettimane). */
export function impostaSettimana(scheda, settimana) {
  const s = Math.min(Math.max(settimana, 1), scheda.numeroSettimane)
  return { ...scheda, settimanaCorrente: s }
}

/** Avanza alla settimana successiva se possibile. */
export function avanzaSettimana(scheda) {
  return impostaSettimana(scheda, scheda.settimanaCorrente + 1)
}
