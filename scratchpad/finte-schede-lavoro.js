// lib/schedeLavoro FINTA (scratchpad/prova-pt): le schede di lavoro in memoria.
const righe = new Map()
window.__schedeLavoro = righe
const ok = { ok: true, errore: '' }
export async function leggiSchedeLavoro() { return { ...ok, schede: [...righe.values()].map((s) => structuredClone(s)).reverse() } }
export async function leggiSchedaLavoro(id) { return righe.has(id) ? structuredClone(righe.get(id)) : null }
export async function salvaSchedaLavoro(io, scheda) { righe.delete(scheda.id); righe.set(scheda.id, structuredClone({ ...scheda, nome: scheda.nome?.trim() || 'Scheda senza nome' })); return ok }
export async function eliminaSchedaLavoro(id) { righe.delete(id); return ok }
