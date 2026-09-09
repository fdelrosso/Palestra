// ---------------------------------------------------------------------------
// Utenti (profili) dell'app.
//
// L'app è multi-profilo: ogni persona ha le proprie schede e i propri
// allenamenti, completamente separati. Qui vive tutta la logica di
// persistenza degli utenti e la costruzione delle chiavi localStorage
// "namespacizzate" per utente, così lo StoreContext non deve sapere nulla
// di come gli utenti sono fatti.
//
// Ogni profilo ha anche un RUOLO: "atleta" (chi si allena) o "pt" (personal
// trainer). Un PT ha un `codicePt` da dare ai propri atleti; un atleta che lo
// inserisce si salva il `ptId` del suo PT. La logica sta in lib/pt.js: qui
// resta solo la forma del dato salvato.
//
// E ha i suoi DATI FISICI (`dati`): sesso, età, peso, altezza, movimento,
// obiettivo e livello di esperienza. Si chiedono quando si crea l'account e si
// cambiano dal menu del profilo; li leggono il recap (le calorie bruciate
// dipendono da quanto pesi), la dieta consigliata e il generatore di
// allenamenti (che dal livello sa cosa proporre). La forma e le formule stanno
// in lib/datiFisici, le regole del livello in lib/livello.
// ---------------------------------------------------------------------------

import { normalizzaDatiFisici } from './datiFisici'

const KEY_UTENTI = 'palestra:utenti:v1'

// Vecchie chiavi globali (app a utente singolo). Servono solo alla migrazione.
const VECCHIE = {
  schede: 'palestra:schede:v1',
  seed: 'palestra:seed:v1',
  sessione: 'palestra:sessione:v1',
}

// Chiavi localStorage dei dati di un singolo utente.
export function chiaviUtente(id) {
  const base = `palestra:u:${id}`
  return {
    schede: `${base}:schede:v1`,
    seed: `${base}:seed:v1`,
    sessione: `${base}:sessione:v1`,
    diete: `${base}:diete:v1`,
    // Allergie, intolleranze e gusti: stanno sul profilo, non sulla singola
    // dieta, perché valgono per tutte (vedi lib/preferenzeCibo).
    preferenze: `${base}:preferenze:v1`,
  }
}

export function nuovoId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Forma di un profilo salvato. I campi del personal trainer non esistono nei
// profili creati prima di questa funzione: qui prendono il loro default, così
// il resto dell'app può darli per scontati (chi c'era già è un atleta senza PT).
// Lo stesso vale per i dati fisici: chi c'era già ha `dati` vuoti, e chi legge
// deve reggerlo — quello che manca sparisce, non si sostituisce con una media.
export function normalizzaUtente(u) {
  const pt = u?.ruolo === 'pt'
  return {
    ...u,
    ruolo: pt ? 'pt' : 'atleta',
    // Il codice da condividere ha senso solo per un PT.
    codicePt: pt ? String(u.codicePt || '') : '',
    // Il PT a cui si è associati (id di un altro profilo) e da quando.
    ptId: u?.ptId || null,
    associatoIl: u?.associatoIl || null,
    // Sesso, età, peso, altezza, movimento, obiettivo, livello (lib/datiFisici).
    dati: normalizzaDatiFisici(u?.dati),
  }
}

export function caricaUtenti() {
  try {
    const raw = localStorage.getItem(KEY_UTENTI)
    if (raw) return JSON.parse(raw).map(normalizzaUtente)
  } catch (e) {
    console.warn('Lettura utenti fallita', e)
  }
  return []
}

export function salvaUtenti(utenti) {
  try {
    localStorage.setItem(KEY_UTENTI, JSON.stringify(utenti))
  } catch (e) {
    console.warn('Salvataggio utenti fallito', e)
  }
}

// Migrazione una-tantum dall'app a utente singolo a quella multi-profilo.
// Se esistono dati salvati con le vecchie chiavi globali, li assegniamo a un
// primo profilo "Io" (così l'utente non perde le sue schede) e rimuoviamo le
// chiavi vecchie. Da eseguire una sola volta, prima di leggere la lista utenti.
export function migraSeNecessario() {
  // Se la lista utenti esiste già, la migrazione è stata fatta (o è un'app nuova).
  if (localStorage.getItem(KEY_UTENTI) != null) return

  const vecchieSchede = localStorage.getItem(VECCHIE.schede)
  const vecchioSeed = localStorage.getItem(VECCHIE.seed)
  const vecchiaSess = localStorage.getItem(VECCHIE.sessione)

  // Nessun dato pregresso: parti da una lista utenti vuota.
  if (vecchieSchede == null && vecchioSeed == null) {
    salvaUtenti([])
    return
  }

  // C'erano dati: crea l'utente "Io" e sposta tutto nel suo namespace.
  const id = nuovoId()
  const keys = chiaviUtente(id)
  try {
    if (vecchieSchede != null) localStorage.setItem(keys.schede, vecchieSchede)
    if (vecchioSeed != null) localStorage.setItem(keys.seed, vecchioSeed)
    if (vecchiaSess != null) localStorage.setItem(keys.sessione, vecchiaSess)
    localStorage.removeItem(VECCHIE.schede)
    localStorage.removeItem(VECCHIE.seed)
    localStorage.removeItem(VECCHIE.sessione)
  } catch (e) {
    console.warn('Migrazione dati utente fallita', e)
  }
  salvaUtenti([{ id, nome: 'Io', creatoIl: new Date().toISOString() }])
}

// Cancella tutti i dati localStorage di un utente (usato quando lo si elimina).
export function eliminaDatiUtente(id) {
  const keys = chiaviUtente(id)
  try {
    for (const k of Object.values(keys)) localStorage.removeItem(k)
  } catch (e) {
    console.warn('Rimozione dati utente fallita', e)
  }
}
