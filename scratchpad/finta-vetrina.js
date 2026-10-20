// lib/vetrinaPt FINTA (scratchpad/prova-pt): una vetrina per id, in memoria.
export { LIMITI, SPECIALIZZAZIONI, VETRINA_VUOTA } from '../src/lib/vetrinaPt.js'
const vetrine = new Map()
window.__vetrine = vetrine
export function vetrinaVuota(v) {
  return !v || (!v.bio.trim() && !v.specializzazioni.length && !v.dove.trim() && !v.tariffe.trim())
}
export async function leggiVetrina(id) {
  return vetrine.get(id) || null
}
export async function salvaVetrina(id, v) {
  await new Promise((r) => setTimeout(r, 120))
  vetrine.set(id, { ...v, bio: v.bio.trim(), dove: v.dove.trim(), tariffe: v.tariffe.trim() })
  return { ok: true, errore: '' }
}
