// ---------------------------------------------------------------------------
// Personal trainer: ruoli dei profili e associazione atleta → PT.
//
// Alla creazione di un profilo si dichiara chi si è:
//   - 'atleta' — chi si allena (il default, e quello che erano tutti i profili
//     esistenti prima di questa funzione);
//   - 'pt'     — un personal trainer, che si crea un CODICE PT da dare ai
//     propri atleti.
// Chi inserisce quel codice (alla creazione o dopo, dal menu del profilo) si
// salva il `ptId` del suo PT: da lì in poi i consigli tengono conto di quello
// che quel PT dà agli altri suoi atleti (vedi lib/comunita → lib/consiglio).
//
// Qui c'è solo la logica: la forma del dato salvato sta in lib/utenti.js e la
// scrittura passa sempre da store/AccountContext.
// ---------------------------------------------------------------------------

// Ruoli selezionabili alla creazione del profilo (UserGate).
export const RUOLI = [
  { id: 'atleta', label: 'Mi alleno', descrizione: 'Uso l’app per le mie schede e i miei allenamenti.' },
  { id: 'pt', label: 'Sono un PT', descrizione: 'Seguo altre persone: mi creo un codice da dare ai miei atleti.' },
]

// Lunghezza ammessa del codice PT.
export const CODICE_MIN = 4
export const CODICE_MAX = 12

// Alfabeto dei codici generati: niente I/O/0/1/Q, che a leggerli da un
// messaggio si confondono tra loro.
const ALFABETO = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789'

export function isPt(utente) {
  return utente?.ruolo === 'pt'
}

// Un codice si scrive come si vuole (spazi, trattini, minuscole): dentro l'app
// esiste in una forma sola, così "mrc-7k2" e "MRC 7K2" sono lo stesso codice.
export function normalizzaCodice(codice) {
  return String(codice || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODICE_MAX)
}

export function codiceValido(codice) {
  return normalizzaCodice(codice).length >= CODICE_MIN
}

/** Il PT che possiede questo codice, o null. */
export function trovaPtDaCodice(codice, utenti) {
  const c = normalizzaCodice(codice)
  if (!c) return null
  return (utenti || []).find((u) => isPt(u) && normalizzaCodice(u.codicePt) === c) || null
}

/** Il codice è già di un ALTRO profilo? (per non avere due PT con lo stesso). */
export function codiceInUso(codice, utenti, escludiId = null) {
  const pt = trovaPtDaCodice(codice, utenti)
  return !!pt && pt.id !== escludiId
}

/**
 * Un codice suggerito: le prime lettere del nome + 3 caratteri casuali, così è
 * riconoscibile ma non indovinabile. Evita i codici già presi; resta comunque
 * modificabile a mano dal PT.
 */
export function generaCodicePt(nome, utenti = []) {
  const base = normalizzaCodice(nome).slice(0, 5) || 'COACH'
  for (let tentativo = 0; tentativo < 50; tentativo += 1) {
    const coda = Array.from(
      { length: 3 },
      () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)],
    ).join('')
    const c = normalizzaCodice(base + coda)
    if (c.length >= CODICE_MIN && !trovaPtDaCodice(c, utenti)) return c
  }
  // Praticamente irraggiungibile: fallback che non può collidere.
  return normalizzaCodice(base + Date.now().toString(36))
}

/** Il PT a cui un utente è associato, o null (anche se il profilo non c'è più). */
export function ptDi(utente, utenti) {
  if (!utente?.ptId) return null
  return (utenti || []).find((u) => u.id === utente.ptId && isPt(u)) || null
}

/** Gli atleti seguiti da un PT (il PT stesso non è un suo atleta). */
export function atletiDiPt(ptId, utenti) {
  if (!ptId) return []
  return (utenti || []).filter((u) => u.ptId === ptId && u.id !== ptId)
}

// ---------------------------------------------------------------------------
// L'avviso del codice PT scritto in registrazione.
//
// ⚠️ Esiste per un motivo preciso: quando la registrazione finisce, la pagina
// che ha raccolto il codice sparisce nello stesso istante (c'e' la sessione,
// quindi l'app prende il posto della schermata di benvenuto). Se il codice non
// e' stato riconosciuto, il messaggio non ha piu' nessuno a cui apparire.
// Quindi lo si lascia qui, e lo raccoglie il menu del profilo appena si apre
// l'app, aprendo il pannello "Personal trainer" col codice gia' scritto.
//
// UNA VOLTA SOLA (`sessionStorage`, e si cancella leggendolo): e' la coda di un
// gesto appena fatto, non uno stato dell'account. Riaprire l'app domani e
// ritrovarsi un errore di ieri sarebbe peggio che non dirlo.
// ---------------------------------------------------------------------------
const KEY_AVVISO_PT = 'palestra:avviso-pt'

export function salvaAvvisoPt(avviso) {
  try {
    sessionStorage.setItem(KEY_AVVISO_PT, JSON.stringify(avviso))
  } catch {
    // Niente sessionStorage (Safari in navigazione privata): si perde
    // l'avviso, non la registrazione.
  }
}

/** Legge l'avviso E lo consuma: la seconda chiamata torna null. */
export function prendiAvvisoPt() {
  try {
    const raw = sessionStorage.getItem(KEY_AVVISO_PT)
    if (!raw) return null
    sessionStorage.removeItem(KEY_AVVISO_PT)
    const a = JSON.parse(raw)
    return a && a.testo ? a : null
  } catch {
    return null
  }
}
