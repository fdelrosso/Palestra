// La modalità di chi è "Tutti e due" (lib/pt, RUOLI): 'atleta' o 'pt'. È per
// DISPOSITIVO e per persona (localStorage, chiave con l'id), come i colori: è
// un modo di guardare l'app, non un dato dell'account. La usa AccountContext
// per decidere come si presenta l'utente (lib/pt, vistaUtente).

const ascoltatori = new Set()
const chiave = (id) => `palestra:modalita:${id}`

export function leggiModalita(id) {
  if (!id) return 'atleta'
  try {
    return localStorage.getItem(chiave(id)) === 'pt' ? 'pt' : 'atleta'
  } catch {
    return 'atleta'
  }
}

export function impostaModalita(id, modalita) {
  if (!id) return
  try {
    localStorage.setItem(chiave(id), modalita === 'pt' ? 'pt' : 'atleta')
  } catch {
    // Niente storage: la modalità non si ricorda, l'app funziona lo stesso.
  }
  for (const f of ascoltatori) f()
}

export function ascoltaModalita(f) {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}
