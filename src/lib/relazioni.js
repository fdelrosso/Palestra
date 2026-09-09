// ---------------------------------------------------------------------------
// Relazioni tra profili: AMICIZIE e richieste di LAVORO (atleta → PT).
//
// Sono la stessa cosa vista da due lati, quindi vivono in una lista sola:
// qualcuno manda una richiesta, l'altro accetta. Finché non accetta, la
// relazione non esiste per nessuno dei due.
//   - `amicizia`: chiunque può cercare un altro per nome e mandargliela;
//   - `lavoro`:   la manda l'ATLETA inserendo il codice del PT (lib/pt), e la
//                 accetta il PT. Solo all'accettazione l'atleta si ritrova il
//                 `ptId` scritto sul profilo (vedi store/AccountContext).
//
// Un rifiuto CANCELLA la riga invece di ricordarlo: così si può richiedere più
// avanti senza restare bloccati da un "no" di mesi prima. Chi l'aveva mandata
// se la ritrova semplicemente sparita dalle richieste inviate.
//
// Come utenti e storico, sta su localStorage ed è per dispositivo. Con Supabase
// (Fase 2) diventa una tabella con le due colonne degli id.
// ---------------------------------------------------------------------------

const KEY_RELAZIONI = 'palestra:relazioni:v1'

export const TIPO = { AMICIZIA: 'amicizia', LAVORO: 'lavoro' }
export const STATO = { ATTESA: 'attesa', ACCETTATA: 'accettata' }

export function caricaRelazioni() {
  try {
    const raw = localStorage.getItem(KEY_RELAZIONI)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.warn('Lettura relazioni fallita', e)
  }
  return []
}

export function salvaRelazioni(relazioni) {
  try {
    localStorage.setItem(KEY_RELAZIONI, JSON.stringify(relazioni))
  } catch (e) {
    console.warn('Salvataggio relazioni fallito', e)
  }
}

export function nuovaRelazione({ tipo, daId, aId }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    tipo,
    daId, // chi ha mandato la richiesta
    aId, // chi deve rispondere
    stato: STATO.ATTESA,
    creataIl: new Date().toISOString(),
    rispostaIl: null,
  }
}

/** La relazione tra due profili, in qualunque verso sia stata mandata. */
export function trovaRelazione(relazioni, tipo, unoId, altroId) {
  return (
    (relazioni || []).find(
      (r) =>
        r.tipo === tipo &&
        ((r.daId === unoId && r.aId === altroId) || (r.daId === altroId && r.aId === unoId)),
    ) || null
  )
}

/** Gli id dei profili con cui `id` è amico per davvero (richiesta accettata). */
export function amiciDi(relazioni, id) {
  const out = new Set()
  for (const r of relazioni || []) {
    if (r.tipo !== TIPO.AMICIZIA || r.stato !== STATO.ACCETTATA) continue
    if (r.daId === id) out.add(r.aId)
    else if (r.aId === id) out.add(r.daId)
  }
  return out
}

/** Richieste che `id` deve ancora accettare o rifiutare. */
export function richiesteRicevute(relazioni, id, tipo) {
  return (relazioni || []).filter(
    (r) => r.tipo === tipo && r.stato === STATO.ATTESA && r.aId === id,
  )
}

/** Richieste che `id` ha mandato e che aspettano una risposta. */
export function richiesteInviate(relazioni, id, tipo) {
  return (relazioni || []).filter(
    (r) => r.tipo === tipo && r.stato === STATO.ATTESA && r.daId === id,
  )
}

/**
 * Che rapporto c'è, oggi, tra due profili: serve alla lista di ricerca per
 * decidere se mostrare "Aggiungi", "Richiesta inviata", "Deve rispondere" o
 * "Siete amici".
 * @returns {'nessuno'|'amici'|'inviata'|'ricevuta'}
 */
export function statoAmicizia(relazioni, ioId, altroId) {
  const r = trovaRelazione(relazioni, TIPO.AMICIZIA, ioId, altroId)
  if (!r) return 'nessuno'
  if (r.stato === STATO.ACCETTATA) return 'amici'
  return r.daId === ioId ? 'inviata' : 'ricevuta'
}

/** Toglie ogni relazione che tocca un profilo (usata quando lo si elimina). */
export function senzaUtente(relazioni, id) {
  return (relazioni || []).filter((r) => r.daId !== id && r.aId !== id)
}
