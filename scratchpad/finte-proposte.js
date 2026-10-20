// lib/proposteScheda FINTA (scratchpad/prova-pt): le proposte in memoria, la
// stessa tabella vista dal PT e dall'atleta. Le funzioni pure sono le vere.
import { normalizzaScheda } from '../src/data/model.js'

export const proposte = []
window.__proposte = proposte
const pausa = () => new Promise((r) => setTimeout(r, 120))

export async function proponiScheda(atletaId, scheda, nota = '') {
  await pausa()
  const id = 'prop-' + (proposte.length + 1)
  proposte.unshift({ id, ptId: window.__io || 'io', atletaId, nome: scheda.nome?.trim() || 'Scheda senza nome', nota: nota.trim(), dati: structuredClone({ ...scheda, completamenti: undefined }), stato: 'attesa', creataIl: new Date().toISOString(), rispostaIl: null })
  return { ok: true, id, errore: '' }
}
export async function ritiraProposta(id) {
  await pausa()
  const p = proposte.find((x) => x.id === id && x.stato === 'attesa')
  if (!p) return { ok: false, errore: 'È già stata decisa: ricarica.' }
  p.stato = 'ritirata'
  return { ok: true, errore: '' }
}
export async function rispondiProposta(id, accetto) {
  await pausa()
  const p = proposte.find((x) => x.id === id && x.stato === 'attesa')
  if (!p) return { ok: false, errore: 'È già stata decisa: ricarica.' }
  p.stato = accetto ? 'accettata' : 'rifiutata'
  return { ok: true, errore: '' }
}
export async function proposteInArrivo(ioId) {
  return proposte.filter((p) => p.atletaId === ioId && p.stato === 'attesa').map((p) => ({ ...p }))
}
export async function proposteMandate(ioId) {
  return proposte.filter((p) => p.ptId === ioId).map((p) => ({ ...p, dati: null }))
}
export function schedaDaProposta(proposta, nomePt = '') {
  return normalizzaScheda({ ...proposta.dati, id: 'pt-' + proposta.id, completamenti: [], settimanaCorrente: 1, libera: false, attiva: false, visibilita: 'solo-pt', creataIl: new Date().toISOString(), daPt: { id: proposta.ptId, nome: nomePt, propostaId: proposta.id } })
}
const BOZZA = 'palestra:bozza-per-atleta'
export const BOZZA_LAVORO = '__lavoro'
export function lavoroDellaBozza(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.daLavoroId || null : null
}
export async function propostaCompleta(id) {
  return proposte.find((p) => p.id === id) || null
}
export function salvaBozzaPerAtleta(atletaId, scheda, daLavoroId = null) {
  sessionStorage.setItem(BOZZA, JSON.stringify({ atletaId, scheda, daLavoroId }))
}
export function prendiBozzaPerAtleta(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.scheda : null
}
