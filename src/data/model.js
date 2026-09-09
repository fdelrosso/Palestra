// ---------------------------------------------------------------------------
// Modello dati dell'app.
//
// Gerarchia:
//   Scheda  ->  Giorno[]  ->  Esercizio[]  ->  Schema (per settimana)
//
// Uno "Schema" descrive serie / ripetizioni / carico / recupero / nota.
// Un esercizio può usare UN solo schema uguale per tutte le settimane
// (variaPerSettimana = false, campo `schemaBase`) oppure UNO schema per
// settimana (variaPerSettimana = true, array `settimane` lungo numeroSettimane).
// Tutti i campi dello schema sono stringhe libere per rispettare la notazione
// del PT (es. ripetizioni "15/12", recupero "1,15min").
// ---------------------------------------------------------------------------

import { VISIBILITA_DEFAULT, visibilitaDi } from '../lib/visibilita'

/** @returns {string} id univoco */
export function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Giorni della settimana (lunedì-first, come il calendario). Gli indici 0..6
// sono la convenzione usata da `Scheda.giorniSettimana` (i giorni in cui ci si
// allena di solito), così sono confrontabili con `indiceSettimana(data)`.
export const GIORNI_SETTIMANA = [
  { id: 0, breve: 'Lun', label: 'Lunedì' },
  { id: 1, breve: 'Mar', label: 'Martedì' },
  { id: 2, breve: 'Mer', label: 'Mercoledì' },
  { id: 3, breve: 'Gio', label: 'Giovedì' },
  { id: 4, breve: 'Ven', label: 'Venerdì' },
  { id: 5, breve: 'Sab', label: 'Sabato' },
  { id: 6, breve: 'Dom', label: 'Domenica' },
]

/**
 * Indice 0..6 (lunedì-first) di una data, coerente con `GIORNI_SETTIMANA` e con
 * `Scheda.giorniSettimana`. Es. lunedì → 0, domenica → 6.
 * @param {Date} [data]
 * @returns {number}
 */
export function indiceSettimana(data = new Date()) {
  return (data.getDay() + 6) % 7
}

/**
 * @typedef {Object} Schema
 * @property {string} serie        es. "8", "4 giri"
 * @property {string} ripetizioni  es. "3", "15/12"
 * @property {string} carico       es. "90kg", "12rm", ""
 * @property {string} recupero     es. "1min", "1,15min", ""
 * @property {string} nota         es. "cedimento", ""
 */

export function schemaVuoto(overrides = {}) {
  return { serie: '', ripetizioni: '', carico: '', recupero: '', nota: '', ...overrides }
}

/**
 * @typedef {Object} Commento
 * @property {string} id
 * @property {string} testo
 * @property {string} autore     nome dell'utente che l'ha scritto
 * @property {string} creatoIl   ISO string
 */

/**
 * @typedef {Object} MediaRef
 * @property {string} id         chiave del blob in IndexedDB (vedi lib/media)
 * @property {'foto'|'video'} tipo
 * @property {string} nome       nome originale del file
 * @property {string} autore     nome dell'utente che l'ha aggiunto
 * @property {'privata'|'pubblica'} visibilita  'privata' = solo l'autore la vede;
 *                                'pubblica' = la vede chiunque guardi la scheda
 * @property {string} creatoIl   ISO string
 */

/**
 * @typedef {Object} Esercizio
 * @property {string} id
 * @property {string} nome
 * @property {string} nota                 nota generale dell'esercizio
 * @property {string} gruppo               id gruppo muscolare (vedi lib/muscoli), '' = nessuno
 * @property {boolean} variaPerSettimana
 * @property {Schema} schemaBase           usato se variaPerSettimana = false
 * @property {Schema[]} settimane          usato se variaPerSettimana = true
 * @property {Commento[]} commenti         commenti/note libere (con autore)
 * @property {MediaRef[]} media            foto/video allegati (blob in IndexedDB)
 */

export function nuovoEsercizio(overrides = {}) {
  return {
    id: nuovoId(),
    nome: '',
    nota: '',
    gruppo: '',
    variaPerSettimana: false,
    schemaBase: schemaVuoto(),
    settimane: [],
    commenti: [],
    media: [],
    ...overrides,
  }
}

/**
 * @typedef {Object} Giorno
 * @property {string} id
 * @property {'workout'|'rest'} tipo
 * @property {string} nome        es. "Giorno A", "Rest"
 * @property {string} nota        es. "bici" per un rest attivo
 * @property {Esercizio[]} esercizi
 */

export function nuovoGiorno(overrides = {}) {
  return { id: nuovoId(), tipo: 'workout', nome: '', nota: '', esercizi: [], ...overrides }
}

/**
 * @typedef {Object} Completamento
 * @property {number} settimana
 * @property {string} giornoId
 * @property {string} data        ISO string
 * @property {'pubblica'|'solo-pt'|'nascosta'} [visibilita]  chi vede questo
 *   allenamento fuori dal tuo profilo (vedi lib/visibilita); assente = pubblica
 */

/**
 * @typedef {Object} Scheda
 * @property {string} id
 * @property {string} nome
 * @property {string} nota
 * @property {number} numeroSettimane
 * @property {number} settimanaCorrente
 * @property {number[]} giorniSettimana   giorni della settimana (0..6, lunedì-first)
 *                                         in cui ci si allena di solito; usati per
 *                                         consigliare l'allenamento in base al giorno
 * @property {Giorno[]} giorni
 * @property {Completamento[]} completamenti
 * @property {boolean} libera         true = scheda "contenitore" degli allenamenti
 *                                     consigliati/liberi (nascosta dagli elenchi;
 *                                     i suoi completamenti restano in calendario/storico)
 * @property {'pubblica'|'solo-pt'|'nascosta'} visibilita  chi vede questa scheda
 *                                     fuori dal tuo profilo (vedi lib/visibilita)
 * @property {string} creataIl
 */

export function nuovaScheda(overrides = {}) {
  return {
    id: nuovoId(),
    nome: 'Nuova scheda',
    nota: '',
    numeroSettimane: 5,
    settimanaCorrente: 1,
    giorniSettimana: [],
    giorni: [],
    completamenti: [],
    libera: false,
    // Come nasce: visibile agli altri, salvo che l'utente dica il contrario.
    visibilita: VISIBILITA_DEFAULT,
    creataIl: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Restituisce lo schema effettivo di un esercizio per una data settimana (1-based).
 * @param {Esercizio} esercizio
 * @param {number} settimana
 * @returns {Schema}
 */
export function schemaPerSettimana(esercizio, settimana) {
  if (!esercizio.variaPerSettimana) return esercizio.schemaBase || schemaVuoto()
  const idx = Math.min(Math.max(settimana, 1), esercizio.settimane.length) - 1
  return esercizio.settimane[idx] || esercizio.schemaBase || schemaVuoto()
}

/**
 * Normalizza una scheda caricata (retro-compatibilità / campi mancanti) e
 * garantisce che gli array `settimane` abbiano la lunghezza corretta.
 * @param {Scheda} scheda
 * @returns {Scheda}
 */
export function normalizzaScheda(scheda) {
  const numeroSettimane = scheda.numeroSettimane || 5
  const giorni = (scheda.giorni || []).map((g) => ({
    ...nuovoGiorno(),
    ...g,
    esercizi: (g.esercizi || []).map((e) => {
      const es = { ...nuovoEsercizio(), ...e }
      if (es.variaPerSettimana) {
        const arr = Array.from({ length: numeroSettimane }, (_, i) =>
          schemaVuoto(es.settimane[i] || es.settimane[es.settimane.length - 1] || {}),
        )
        es.settimane = arr
      }
      // Retro-compatibilità: gli esercizi salvati prima dei commenti/media.
      es.commenti = Array.isArray(es.commenti) ? es.commenti : []
      // I media salvati prima della visibilità restano pubblici (comportamento
      // storico: erano visibili a chiunque guardasse la scheda).
      es.media = Array.isArray(es.media)
        ? es.media.map((m) => ({ visibilita: 'pubblica', ...m }))
        : []
      return es
    }),
  }))
  return {
    ...nuovaScheda(),
    ...scheda,
    numeroSettimane,
    settimanaCorrente: Math.min(scheda.settimanaCorrente || 1, numeroSettimane),
    // Retro-compatibilità: le schede salvate prima dei giorni di allenamento.
    giorniSettimana: Array.isArray(scheda.giorniSettimana)
      ? scheda.giorniSettimana.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      : [],
    giorni,
    completamenti: scheda.completamenti || [],
    // Le schede salvate prima della visibilità erano visibili a chiunque: il
    // default di visibilitaDi() le lascia pubbliche.
    visibilita: visibilitaDi(scheda),
  }
}
