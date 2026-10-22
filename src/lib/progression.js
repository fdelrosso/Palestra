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
//    nella settimana corrente — nel GIRO in corso (vedi `giroInCorso`).
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
 * I giorni fatti nel GIRO in corso della settimana corrente.
 *
 * Il caso (55ª, chiesto dall'utente): si salta C, si fa D, e la volta dopo si
 * ricomincia da A. Prima il "da fare" restava C per sempre — il primo non
 * fatto della settimana — e il calendario continuava a proporre C e "potresti
 * riprendere da C". Ma chi riparte da A ha lasciato perdere C: da lì in avanti
 * la scheda deve andare avanti normale, B, C, D.
 *
 * Quindi gli allenamenti della settimana si leggono in ordine di data, e uno
 * che RIFÀ un giorno già fatto nel giro apre un giro nuovo — solo se nel giro
 * c'era un buco (un giorno saltato prima dell'ultimo fatto):
 *   - A B D, poi A → giro nuovo {A}: C è perso, ora tocca B;
 *   - A B D, poi C → è il recupero di C, il giro resta quello;
 *   - A B, poi A   → senza buchi è solo una ripetizione: tocca sempre C.
 * Senza giri nuovi è esattamente la regola di sempre.
 *
 * ⚠️ I RECUPERI (completamenti con `recupera`, lib/saltati) non contano: sono
 * l'allenamento di un giro già chiuso, fatto dopo. Se contassero, recuperare
 * C la settimana dopo segnerebbe fatto anche il C di questa.
 */
export function giroInCorso(scheda, settimana, workout = giorniWorkout(scheda)) {
  const posto = new Map(workout.map((g, i) => [g.id, i]))
  const fatti = (scheda.completamenti || [])
    .filter((c) => c.settimana === settimana && posto.has(c.giornoId) && !c.recupera)
    .map((c, k) => ({ c, k, t: new Date(c.data || 0).getTime() || 0 }))
    // In ordine di data; a parità (o senza data) vale l'ordine in cui sono stati salvati.
    .sort((a, b) => a.t - b.t || a.k - b.k)
  let giro = new Set()
  for (const { c } of fatti) {
    if (giro.has(c.giornoId)) {
      const ultimo = Math.max(...[...giro].map((id) => posto.get(id)))
      const buco = workout.some((g, i) => i < ultimo && !giro.has(g.id))
      if (buco) giro = new Set()
    }
    giro.add(c.giornoId)
  }
  return giro
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
  // Contano i giorni del giro in corso: un giorno saltato e lasciato perdere
  // (si è ricominciato da capo) non è più "da fare" (giroInCorso).
  const giro = giroInCorso(scheda, settimana, workout)
  const fattiSettimana = workout.filter((g) => giro.has(g.id)).length
  const giornoCorrente = workout.find((g) => !giro.has(g.id)) || null
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

/**
 * Tolto un allenamento della settimana PRIMA di quella in corso: se era lui a
 * chiuderla e nella nuova non si è fatto ancora niente, si torna indietro.
 * Se no la settimana resta chiusa coi buchi, e i buchi diventano "saltati"
 * (lib/saltati) — il caso: due allenamenti di prova cancellati.
 */
export function riapriSeTolto(scheda, settimanaTolta) {
  const s = scheda.settimanaCorrente
  if (settimanaTolta !== s - 1) return scheda
  if ((scheda.completamenti || []).some((c) => c.settimana === s)) return scheda
  const indietro = { ...scheda, settimanaCorrente: s - 1 }
  return statoScheda(indietro).settimanaCompletata ? scheda : indietro
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
