// ---------------------------------------------------------------------------
// Chi vede cosa: visibilità di un ALLENAMENTO svolto o di una SCHEDA.
//
// Tre livelli, scelti da chi crea la cosa:
//   'pubblica'  — la vedono gli amici e compare nelle sezioni generali
//                 (Storico Allenamenti, Schede Generali). È il default.
//   'solo-pt'   — non la vede nessuno TRANNE il proprio personal trainer, nella
//                 sua sezione Lavoro. Ha senso solo per chi un PT ce l'ha.
//   'nascosta'  — non la vede nessuno, PT compreso.
//
// Retro-compatibilità: tutto ciò che è stato salvato prima di questo campo era
// visibile a chiunque usasse l'app, quindi campo assente = 'pubblica'. Stessa
// scelta fatta a suo tempo per i media degli esercizi.
//
// NB: i media di un esercizio hanno un loro campo `visibilita` con due soli
// valori ('privata'/'pubblica', vedi EsercizioAllegati): è un'altra cosa, non
// va confusa con questa.
// ---------------------------------------------------------------------------

export const VISIBILITA = {
  PUBBLICA: 'pubblica',
  SOLO_PT: 'solo-pt',
  NASCOSTA: 'nascosta',
}

export const VISIBILITA_DEFAULT = VISIBILITA.PUBBLICA

/**
 * Le scelte da offrire. Senza un personal trainer "mostra solo al PT" non
 * vorrebbe dire niente, quindi restano due opzioni.
 * @param {boolean} haPt
 * @returns {string[]}
 */
export function opzioniVisibilita(haPt) {
  return haPt
    ? [VISIBILITA.PUBBLICA, VISIBILITA.SOLO_PT, VISIBILITA.NASCOSTA]
    : [VISIBILITA.PUBBLICA, VISIBILITA.NASCOSTA]
}

/** La visibilità di un oggetto salvato, col default per chi non ce l'ha. */
export function visibilitaDi(oggetto) {
  const v = oggetto?.visibilita
  return v === VISIBILITA.SOLO_PT || v === VISIBILITA.NASCOSTA ? v : VISIBILITA.PUBBLICA
}

/**
 * Questo allenamento / questa scheda è visibile a chi sta guardando?
 * @param {object} oggetto  completamento o scheda
 * @param {{ comePt?: boolean }} [chi] `comePt` = chi guarda è il personal
 *   trainer di chi l'ha creata (sezione Lavoro). Solo allora 'solo-pt' passa.
 */
export function visibileA(oggetto, { comePt = false } = {}) {
  const v = visibilitaDi(oggetto)
  if (v === VISIBILITA.NASCOSTA) return false
  if (v === VISIBILITA.SOLO_PT) return !!comePt
  return true
}
