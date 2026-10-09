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
//  - Una scheda `senzaFine` non finisce mai: completata la settimana, la
//    successiva parte da sola (avanzaSeFinita) e il contatore va avanti.
// ---------------------------------------------------------------------------

/** @returns {import('../data/model').Giorno[]} solo i giorni di allenamento */
export function giorniWorkout(scheda) {
  return scheda.giorni.filter((g) => g.tipo === 'workout')
}

export function isCompletato(scheda, settimana, giornoId) {
  return scheda.completamenti.some((c) => c.settimana === settimana && c.giornoId === giornoId)
}

// Un giorno rifatto ha piu' completamenti: vale l'ultimo (sono in ordine di fine).
export function completamentoDi(scheda, settimana, giornoId) {
  return scheda.completamenti.findLast((c) => c.settimana === settimana && c.giornoId === giornoId)
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
  const schedaCompletata = !scheda.senzaFine && settimanaCompletata && settimana >= scheda.numeroSettimane
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
  return avanzaSeFinita({
    ...scheda,
    completamenti: [
      ...scheda.completamenti,
      { settimana, giornoId, data: new Date().toISOString() },
    ],
  })
}

/**
 * Su una scheda senza fine, a settimana completata passa alla successiva. Le
 * altre schede restano dove sono: lì si avanza col tasto, e l'ultima finisce.
 */
export function avanzaSeFinita(scheda) {
  if (!scheda.senzaFine || !statoScheda(scheda).settimanaCompletata) return scheda
  return { ...scheda, settimanaCorrente: scheda.settimanaCorrente + 1 }
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

/** Imposta la settimana corrente (con clamp 1..numeroSettimane; senza fine, solo da 1). */
export function impostaSettimana(scheda, settimana) {
  const s = Math.max(1, scheda.senzaFine ? settimana : Math.min(settimana, scheda.numeroSettimane))
  return { ...scheda, settimanaCorrente: s }
}

/** Avanza alla settimana successiva se possibile. */
export function avanzaSettimana(scheda) {
  return impostaSettimana(scheda, scheda.settimanaCorrente + 1)
}
