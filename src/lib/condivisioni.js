// ---------------------------------------------------------------------------
// Condivisioni: mandare a un AMICO una scheda, un allenamento svolto o il
// recap di fine allenamento.
//
// È l'altra metà delle relazioni (lib/relazioni): lì si decide CHI è amico di
// chi, qui cosa gli si manda. Una condivisione è una COPIA congelata al momento
// dell'invio, non un puntatore: se domani cambio la scheda, quella che ho
// mandato resta com'era. Serve perché chi la riceve la deve poter leggere anche
// se io nel frattempo la cancello.
//
// Tre tipi, tutti con lo stesso involucro:
//   'scheda'      → payload = la scheda intera (chi la riceve può salvarsela);
//   'allenamento' → payload = la voce di storico (riepilogo con le serie);
//   'recap'       → payload = { riep, stat, commento }, cioè quanto basta per
//                   ridisegnare la card di fine allenamento sul dispositivo di
//                   chi guarda (l'immagine NON viaggia: pesa e non serve).
//
// Le foto e i video NON passano di qui: sono momentanei e hanno il loro posto
// (lib/effimeri), perché il punto è proprio che non restino.
//
// Come utenti e relazioni: localStorage, per dispositivo. Con Supabase (Fase 2)
// diventa una tabella con daId/aId e il payload in jsonb.
// ---------------------------------------------------------------------------

import { normalizzaScheda, nuovoId } from '../data/model'
import { VISIBILITA } from './visibilita'

const KEY_CONDIVISIONI = 'palestra:condivisioni:v1'

export const TIPO_CONDIVISIONE = {
  SCHEDA: 'scheda',
  ALLENAMENTO: 'allenamento',
  RECAP: 'recap',
}

export const ETICHETTA_TIPO = {
  [TIPO_CONDIVISIONE.SCHEDA]: 'Scheda',
  [TIPO_CONDIVISIONE.ALLENAMENTO]: 'Allenamento',
  [TIPO_CONDIVISIONE.RECAP]: 'Recap',
}

function nuovoIdCondivisione() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function caricaCondivisioni() {
  try {
    const raw = localStorage.getItem(KEY_CONDIVISIONI)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.warn('Lettura condivisioni fallita', e)
  }
  return []
}

export function salvaCondivisioni(condivisioni) {
  try {
    localStorage.setItem(KEY_CONDIVISIONI, JSON.stringify(condivisioni))
  } catch (e) {
    // Quota piena: è il segnale che stiamo tenendo troppa roba in localStorage.
    console.warn('Salvataggio condivisioni fallito', e)
  }
}

/**
 * @typedef {Object} Condivisione
 * @property {string} id
 * @property {'scheda'|'allenamento'|'recap'} tipo
 * @property {string} daId      chi ha mandato
 * @property {string} daNome    il suo nome al momento dell'invio (per le liste)
 * @property {string} aId       a chi
 * @property {string} titolo    es. il nome della scheda
 * @property {string} sottotitolo
 * @property {object} payload   la copia congelata (vedi in testa al file)
 * @property {string} creataIl
 * @property {string|null} vistaIl   quando il destinatario l'ha aperta
 * @property {string|null} salvataIl quando l'ha salvata tra le proprie schede
 */

export function nuovaCondivisione({ tipo, daId, daNome, aId, titolo, sottotitolo, payload }) {
  return {
    id: nuovoIdCondivisione(),
    tipo,
    daId,
    daNome: daNome || '',
    aId,
    titolo: titolo || '',
    sottotitolo: sottotitolo || '',
    payload,
    creataIl: new Date().toISOString(),
    vistaIl: null,
    salvataIl: null,
  }
}

const perDataDecrescente = (a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0)

/** Quello che mi hanno mandato, dal più recente. */
export function condivisioniRicevute(condivisioni, ioId) {
  if (!ioId) return []
  return (condivisioni || []).filter((c) => c.aId === ioId).sort(perDataDecrescente)
}

/** Quello che ho mandato io, dal più recente. */
export function condivisioniInviate(condivisioni, ioId) {
  if (!ioId) return []
  return (condivisioni || []).filter((c) => c.daId === ioId).sort(perDataDecrescente)
}

/** Quante cose non ho ancora aperto (il pallino sul menu). */
export function daVedere(condivisioni, ioId) {
  return condivisioniRicevute(condivisioni, ioId).filter((c) => !c.vistaIl).length
}

/**
 * La scheda ricevuta, pronta per entrare tra le proprie.
 *
 * Ids nuovi (altrimenti due schede diverse si chiamerebbero uguale e si
 * pesterebbero i piedi), niente completamenti — lo storico è di chi l'ha fatta,
 * non di chi riceve la scheda — e si riparte dalla settimana 1.
 *
 * Nasce NASCOSTA di proposito: è roba di un altro, se la si vuole rimettere in
 * circolo lo si decide apposta dall'editor.
 */
export function copiaSchedaRicevuta(scheda, daNome) {
  const nome = scheda?.nome || 'Scheda'
  return normalizzaScheda({
    ...scheda,
    id: nuovoId(),
    nome: daNome ? `${nome} (da ${daNome})` : nome,
    giorni: (scheda?.giorni || []).map((g) => ({
      ...g,
      id: nuovoId(),
      esercizi: (g.esercizi || []).map((e) => ({ ...e, id: nuovoId() })),
    })),
    completamenti: [],
    settimanaCorrente: 1,
    libera: false,
    visibilita: VISIBILITA.NASCOSTA,
    creataIl: new Date().toISOString(),
  })
}

/** Toglie ogni condivisione che tocca un profilo (quando lo si elimina). */
export function condivisioniSenzaUtente(condivisioni, id) {
  return (condivisioni || []).filter((c) => c.daId !== id && c.aId !== id)
}
