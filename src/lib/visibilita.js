// ---------------------------------------------------------------------------
// Chi vede cosa: visibilità di un ALLENAMENTO svolto o di una SCHEDA.
//
// Tre livelli, scelti da chi crea la cosa:
//   'pubblica'  — la vedono gli amici e compare nelle sezioni generali
//                 (Storico Allenamenti, Schede Generali).
//   'solo-pt'   — non la vede nessuno TRANNE il proprio personal trainer, nella
//                 sua sezione Lavoro. Ha senso solo per chi un PT ce l'ha.
//   'nascosta'  — non la vede nessuno, PT compreso.
//
// ⚠️ CAMPO ASSENTE = 'nascosta', e chi non sceglie non pubblica (deciso il
// 2026-09-10, prima di far entrare altre persone). Fino a quel giorno era il
// contrario — campo assente = 'pubblica' — per retro-compatibilità con la roba
// salvata prima che questo campo esistesse. Quella roba non esiste più (col
// cloud si è ripartiti da zero), mentre il rischio del default sbagliato sì:
// un amico che si iscrive, importa la scheda del suo PT e fa il primo
// allenamento pubblicava carichi, ripetizioni e cronologia senza aver scelto
// niente. Una scelta che si subisce non è una scelta.
//
// ⚠️ IL DEFAULT È SCRITTO IN DUE POSTI E DEVONO DIRE LA STESSA FRASE: qui, e
// dentro `allenamenti_visibili()` / `nomi_di()` in supabase/schema.sql. Il
// filtro che conta è quello del database — se i due divergono, vince il
// database e l'app racconta una cosa che non è.
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

// Quello che si ottiene NON scegliendo: la cosa più prudente.
export const VISIBILITA_DEFAULT = VISIBILITA.NASCOSTA

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

/**
 * La visibilità di un oggetto salvato, col default per chi non ce l'ha.
 * ⚠️ Solo un 'pubblica' SCRITTO rende pubblico: qualunque altra cosa — campo
 * assente, vuoto, valore che non riconosciamo — resta nascosta. Nel dubbio non
 * si mostra, che è la stessa regola di tutto il resto dell'app.
 */
export function visibilitaDi(oggetto) {
  const v = oggetto?.visibilita
  if (v === VISIBILITA.PUBBLICA || v === VISIBILITA.SOLO_PT) return v
  return VISIBILITA.NASCOSTA
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
