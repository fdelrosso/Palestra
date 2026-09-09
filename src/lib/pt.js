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

/**
 * Quanti atleti segue ciascun PT.
 * È la "fama" con cui lib/comunita pesa i PT per chi è autodidatta: quello che
 * un PT seguito da molti fa fare ai suoi è un default migliore del caso.
 * @returns {Map<string, number>} ptId → numero di atleti
 */
export function famaPt(utenti) {
  const conte = new Map()
  for (const u of utenti || []) {
    if (!u.ptId || u.ptId === u.id) continue
    conte.set(u.ptId, (conte.get(u.ptId) || 0) + 1)
  }
  // Solo PT che esistono ancora.
  for (const id of [...conte.keys()]) {
    if (!(utenti || []).some((u) => u.id === id && isPt(u))) conte.delete(id)
  }
  return conte
}
