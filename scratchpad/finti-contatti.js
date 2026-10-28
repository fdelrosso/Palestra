// lib/contattiPt FINTA (scratchpad/prova-pt, 2026-10-28): chi si è messo in
// mostra sta in window.__inMostra (id), i contatti in memoria.
window.__inMostra = window.__inMostra || ['giulia']
export const contatti = []
const si = { ok: true, errore: '' }
const ePt = () => (window.__io || 'pt') === 'pt'

export async function contattaPt(ptId) {
  contatti.push({ atletaId: window.__io, ptId, stato: 'attesa', daPt: false })
  return { ...si, stato: 'attesa' }
}
export async function rispondiContatto() {
  return si
}
export async function confermaContatto() {
  return si
}
export async function contattoCon(ioId, altroId) {
  return contatti.find((c) => (c.atletaId === ioId && c.ptId === altroId) || (c.atletaId === altroId && c.ptId === ioId)) || null
}
export async function possoContattareAtleta(id) {
  return ePt() && window.__inMostra.includes(id)
}
export async function contattaAtleta(id) {
  contatti.push({ atletaId: id, ptId: window.__io, stato: 'proposta', daPt: true })
  return { ...si, stato: 'proposta' }
}
export async function contattabiliFra(ids) {
  return new Set(ePt() ? ids.filter((x) => window.__inMostra.includes(x)) : [])
}
