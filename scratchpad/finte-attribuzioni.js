// lib/attribuzioniScheda FINTA (scratchpad/prova-pt): le richieste in memoria.
import { leggiFinto } from './finto-store-vivo.js'
export const richieste = []
window.__attribuzioni = richieste
const pausa = () => new Promise((r) => setTimeout(r, 120))
const ok = { ok: true, errore: '' }
export async function attribuisciScheda(schedaId) {
  await pausa()
  const s = leggiFinto().schede.find((x) => x.id === schedaId)
  const aperta = richieste.find((r) => r.schedaId === schedaId && r.stato === 'attesa')
  if (aperta) return { ...ok, id: aperta.id }
  const r = { id: 'att-' + (richieste.length + 1), atletaId: leggiFinto().io.id, ptId: 'pt', schedaId, nome: s.nome, dati: structuredClone({ ...s, completamenti: [] }), stato: 'attesa', creataIl: new Date().toISOString() }
  richieste.unshift(r)
  return { ...ok, id: r.id }
}
const cambia = (id, da, a) => {
  const r = richieste.find((x) => x.id === id && x.stato === da)
  if (!r) return { ok: false, errore: 'È già stata decisa: ricarica.' }
  r.stato = a
  return ok
}
export async function annullaAttribuzione(id) { await pausa(); return cambia(id, 'attesa', 'annullata') }
export async function rispondiAttribuzione(id, accetto) { await pausa(); return cambia(id, 'attesa', accetto ? 'accettata' : 'rifiutata') }
export async function mieAttribuzioni(io) { return richieste.filter((r) => r.atletaId === io).map((r) => ({ ...r, dati: null })) }
export async function attribuzioniDaDecidere(io) { return richieste.filter((r) => r.ptId === io && r.stato === 'attesa').map((r) => ({ ...r })) }
