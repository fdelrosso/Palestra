// lib/proposteScheda FINTA (scratchpad/prova-pt): le proposte in memoria, la
// stessa tabella vista dal PT e dall'atleta. Le funzioni pure sono le vere.
import { normalizzaScheda } from '../src/data/model.js'
import { allegatoNuovo, conAllegatiDelPt, conAllungamento, conParteNuova, divisibileAParti, parteDopoAllungamento, taglioScheda } from '../src/lib/schedaAParti.js'

export const proposte = []
window.__proposte = proposte
const pausa = () => new Promise((r) => setTimeout(r, 120))

// 2026-10-28: scadenza e parti. `intera` sta solo qui (la legge il PT).
export async function proponiScheda(atletaId, scheda, nota = '', scadeIl = null, passo = null) {
  await pausa()
  const id = 'prop-' + (proposte.length + 1)
  const intera = structuredClone({ ...scheda, completamenti: undefined })
  const aParti = passo && divisibileAParti(intera, passo)
  proposte.unshift({ id, ptId: window.__io || 'io', atletaId, atletaNome: { mario: 'Mario', giulia: 'Giulia' }[atletaId] || '', nome: scheda.nome?.trim() || 'Scheda senza nome', nota: nota.trim(), dati: aParti ? taglioScheda(intera, passo) : intera, intera: aParti ? intera : null, settimaneVisibili: aParti ? passo : null, settimaneTotali: aParti ? intera.numeroSettimane : null, settimanePasso: aParti ? passo : null, scadeIl, stato: 'attesa', creataIl: new Date().toISOString(), rispostaIl: null })
  return { ok: true, id, errore: '' }
}
export const rinnovi = []
window.__rinnovi = rinnovi
export async function sbloccaSettimane(propostaId, fino, scadeIl = null) {
  await pausa()
  const p = proposte.find((x) => x.id === propostaId && x.intera)
  if (!p || fino <= p.settimaneVisibili || fino > p.settimaneTotali) return { ok: false, errore: 'Queste settimane non si possono sbloccare: ricarica.' }
  p.dati = taglioScheda(p.intera, fino)
  p.settimaneVisibili = fino
  if (scadeIl) p.scadeIl = scadeIl
  return { ok: true, errore: '' }
}
export async function partiSbloccate(mieSchede) {
  return (mieSchede || [])
    .filter((s) => s.daPt?.propostaId && s.daPt?.settimaneTotali)
    .map((s) => [s, proposte.find((p) => p.id === s.daPt.propostaId)])
    .filter(([s, p]) => p && p.settimaneVisibili > (s.daPt.settimaneVisibili || 0))
    .map(([s, p]) => normalizzaScheda(conParteNuova(s, p.dati, p.settimaneVisibili)))
}
export async function scadenzaDellaScheda(propostaId) {
  const p = proposte.find((x) => x.id === propostaId)
  if (!p?.scadeIl) return null
  const r = rinnovi.filter((x) => x.propostaId === propostaId).at(-1) || null
  return { scadeIl: p.scadeIl, ptId: p.ptId, rinnovo: r ? { ...r } : null }
}
export async function chiediRinnovo(propostaId, nota = '') {
  await pausa()
  const p = proposte.find((x) => x.id === propostaId)
  const rinnovo = { id: 'rin-' + (rinnovi.length + 1), propostaId, ptId: p.ptId, atletaId: p.atletaId, nota: nota.trim(), stato: 'attesa', risposta: '', creataIl: new Date().toISOString() }
  rinnovi.push(rinnovo)
  return { ok: true, errore: '', rinnovo: { ...rinnovo } }
}
export async function rispondiRinnovo(id, accetto, scadenza = null, risposta = '') {
  await pausa()
  const r = rinnovi.find((x) => x.id === id && x.stato === 'attesa')
  if (!r) return { ok: false, errore: 'È già stata decisa: ricarica.' }
  Object.assign(r, { stato: accetto ? 'accettata' : 'rifiutata', risposta: risposta.trim(), nuovaScadenza: accetto ? scadenza : null })
  if (accetto) proposte.find((p) => p.id === r.propostaId).scadeIl = scadenza
  return { ok: true, errore: '' }
}
export async function rinnoviDaDecidere(ioId) {
  return rinnovi.filter((r) => r.ptId === ioId && r.stato === 'attesa').map((r) => {
    const p = proposte.find((x) => x.id === r.propostaId)
    return { ...r, nome: p.nome, scadeIl: p.scadeIl }
  })
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
  return proposte.filter((p) => p.ptId === ioId).map((p) => ({ ...p, dati: null, intera: null }))
}
export function schedaDaProposta(proposta, nomePt = '') {
  return normalizzaScheda({ ...proposta.dati, id: 'pt-' + proposta.id, completamenti: [], settimanaCorrente: 1, libera: false, attiva: false, visibilita: 'solo-pt', creataIl: new Date().toISOString(), daPt: { id: proposta.ptId, nome: nomePt, propostaId: proposta.id, ...(proposta.settimaneTotali ? { settimaneVisibili: proposta.settimaneVisibili, settimaneTotali: proposta.settimaneTotali } : {}) } })
}
const BOZZA = 'palestra:bozza-per-atleta'
export const BOZZA_LAVORO = '__lavoro'
export const BOZZA_MIA = '__mia'
export function controlloDellaBozza(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.controllo || null : null
}
export function lavoroDellaBozza(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.daLavoroId || null : null
}
export async function propostaCompleta(id) {
  const p = proposte.find((x) => x.id === id)
  return p ? { ...p, dati: p.intera || p.dati } : null
}
export function salvaBozzaPerAtleta(atletaId, scheda, daLavoroId = null, controllo = null, allunga = null) {
  sessionStorage.setItem(BOZZA, JSON.stringify({ atletaId, scheda, daLavoroId, controllo, allunga }))
}
export function allungamentoDellaBozza(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.allunga || null : null
}
// 2026-10-28: l'allungamento.
export const allungamenti = []
window.__allungamenti = allungamenti
export async function ultimoAllungamento(propostaId) {
  const a = allungamenti.filter((x) => x.propostaId === propostaId).at(-1)
  return a ? { ...a } : null
}
export async function chiediAllungamento(propostaId, nota = '') {
  await pausa()
  const p = proposte.find((x) => x.id === propostaId)
  const a = { id: 'all-' + (allungamenti.length + 1), propostaId, ptId: p.ptId, atletaId: p.atletaId, nota: nota.trim(), stato: 'attesa', risposta: '', settimaneAggiunte: null, creataIl: new Date().toISOString() }
  allungamenti.push(a)
  return { ok: true, errore: '', allungamento: { ...a } }
}
export async function allungamentiDaDecidere(ioId) {
  return allungamenti.filter((a) => a.ptId === ioId && a.stato === 'attesa').map((a) => ({ ...a, nome: proposte.find((p) => p.id === a.propostaId).nome }))
}
export async function rifiutaAllungamento(id, risposta = '') {
  await pausa()
  Object.assign(allungamenti.find((a) => a.id === id), { stato: 'rifiutata', risposta: risposta.trim() })
  return { ok: true, errore: '' }
}
export async function accettaAllungamento(allunga, scheda, scadeIl = null, risposta = '') {
  await pausa()
  const a = allungamenti.find((x) => x.id === allunga.richiestaId)
  const p = proposte.find((x) => x.id === a.propostaId)
  const intera = structuredClone({ ...scheda, completamenti: undefined })
  if (intera.numeroSettimane <= allunga.settimanePrima) return { ok: false, errore: 'Le settimane devono essere più di prima.' }
  const { visibili, dati } = parteDopoAllungamento(intera, allunga.visibili, allunga.totali)
  Object.assign(p, { intera, dati, settimaneVisibili: visibili, settimaneTotali: intera.numeroSettimane, allungataIl: new Date().toISOString(), scadeIl: scadeIl || p.scadeIl })
  Object.assign(a, { stato: 'accettata', risposta: risposta.trim(), settimaneAggiunte: intera.numeroSettimane - allunga.settimanePrima })
  return { ok: true, errore: '' }
}
export async function allungamentiArrivati(mieSchede) {
  return (mieSchede || [])
    .filter((s) => s.daPt?.propostaId)
    .map((s) => [s, proposte.find((p) => p.id === s.daPt.propostaId)])
    .filter(([s, p]) => p?.allungataIl && (!s.daPt.allungataIl || p.allungataIl > s.daPt.allungataIl))
    .map(([s, p]) => normalizzaScheda(conAllungamento(s, p.dati, { visibili: p.settimaneVisibili, totali: p.settimaneTotali, allungataIl: p.allungataIl })))
}
export function prendiBozzaPerAtleta(atletaId) {
  const v = JSON.parse(sessionStorage.getItem(BOZZA) || 'null')
  return v && v.atletaId === atletaId ? v.scheda : null
}
// 2026-10-28: gli allegati del PT sugli esercizi.
export const eventiAllegati = []
window.__eventiAllegati = eventiAllegati
export async function aggiornaAllegatiProposta(propostaId, giornoId, esercizio, ptId) {
  await pausa()
  const p = proposte.find((x) => x.id === propostaId)
  const metti = (s) => s && { ...s, giorni: s.giorni.map((g) => (g.id !== giornoId ? g : { ...g, esercizi: g.esercizi.map((e) => (e.id === esercizio.id ? { ...e, media: esercizio.media || [], commenti: esercizio.commenti || [] } : e)) })) }
  const dati = metti(p.dati)
  const nuovo = allegatoNuovo(p.dati, dati, ptId)
  Object.assign(p, { dati, intera: metti(p.intera), allegatiIl: new Date().toISOString() })
  if (p.stato === 'accettata' && nuovo) eventiAllegati.push({ propostaId, ...nuovo })
  return { ok: true, errore: '' }
}
export async function allegatiArrivati(mieSchede) {
  return (mieSchede || [])
    .filter((s) => s.daPt?.propostaId)
    .map((s) => [s, proposte.find((p) => p.id === s.daPt.propostaId)])
    .filter(([s, p]) => p?.allegatiIl && (!s.daPt.allegatiIl || p.allegatiIl > s.daPt.allegatiIl))
    .map(([s, p]) => normalizzaScheda({ ...conAllegatiDelPt(s, p.dati, s.daPt.id), daPt: { ...s.daPt, allegatiIl: p.allegatiIl } }))
}
// 2026-10-28: la modifica del PT.
import { cambiScheda } from '../src/lib/cambiScheda.js'
export const modifiche = []
window.__modifiche = modifiche
export async function preparaModifica(proposta) {
  const p = proposte.find((x) => x.id === proposta.id)
  if (!p) return { ok: false, errore: 'La scheda non si trova: ricarica.' }
  const scheda = structuredClone({ ...(p.intera || p.dati), nome: (p.intera || p.dati).nome || p.nome })
  salvaBozzaPerAtleta(p.atletaId, scheda, null, null, { modo: 'modifica', propostaId: p.id, prima: scheda, visibili: p.settimaneVisibili, totali: p.settimaneTotali, nome: p.nome })
  return { ok: true, errore: '' }
}
export async function modificaProposta(modifica, scheda, nota = '') {
  await pausa()
  const p = proposte.find((x) => x.id === modifica.propostaId)
  const intera = structuredClone({ ...scheda, completamenti: undefined })
  const cambi = cambiScheda(modifica.prima, intera)
  if (!cambi.length && !nota.trim()) return { ok: false, cambi, errore: 'Non hai cambiato niente.' }
  let dati = intera
  if (p.settimaneTotali) {
    p.settimaneTotali = intera.numeroSettimane
    p.settimaneVisibili = Math.min(p.settimaneVisibili, p.settimaneTotali)
    if (p.settimaneVisibili < p.settimaneTotali) dati = taglioScheda(intera, p.settimaneVisibili)
    p.intera = intera
  }
  Object.assign(p, { dati, allungataIl: new Date().toISOString() })
  if (p.stato === 'accettata') modifiche.push({ propostaId: p.id, cambi, nota })
  return { ok: true, cambi, errore: '' }
}
