// lib/appuntamenti FINTA (scratchpad/prova-pt, 2026-10-28): gli appuntamenti in
// memoria, le stesse regole del database (turno, orari rifiutati che non
// tornano). Le parti pure sono copiate dalla vera.
import { useEffect, useState } from 'react'
import { chiaveOrario, ordinaOrari, piuMinuti } from '../src/lib/orariAppuntamento.js'

export const appuntamenti = []
window.__appuntamenti = appuntamenti
let n = 0
const io = () => window.__io || 'io'
const ptDi = { mario: 'pt', giulia: 'pt' }
const no = (errore) => ({ ok: false, errore })
const si = { ok: true, errore: '' }

function metti(a, orari, nota) {
  const scartati = new Set(a.orari.filter((o) => o.stato === 'rifiutato').map(chiaveOrario))
  if (orari.some((o) => scartati.has(chiaveOrario(o)))) return 'Uno di questi orari è già stato rifiutato: scegline un altro.'
  for (const o of orari) a.orari.push({ id: 'o' + ++n, daId: io(), giorno: o.giorno, ora: o.ora, fine: o.fine, durata: o.durata, stato: 'aperto', nota })
  a.orari = ordinaOrari(a.orari)
  return ''
}

export async function leggiAppuntamenti(ioId) {
  return appuntamenti.filter((a) => a.atletaId === ioId || a.ptId === ioId).map((a) => structuredClone(a))
}
export async function chiediAppuntamento(motivo, orari) {
  const pt = ptDi[io()]
  if (!pt) return no('Serve un PT collegato per chiedere un appuntamento.')
  const a = { id: 'a' + ++n, atletaId: io(), ptId: pt, motivo: motivo.trim(), stato: 'trattativa', turno: 'pt', giorno: null, ora: null, orari: [] }
  metti(a, orari, '')
  appuntamenti.unshift(a)
  return { ...si, id: a.id }
}
export async function proponiAppuntamento(atletaId, motivo, orari) {
  if (ptDi[atletaId] !== io()) return no('Questa persona non è fra i tuoi atleti.')
  const a = { id: 'a' + ++n, atletaId, ptId: io(), motivo: motivo.trim(), stato: 'trattativa', turno: 'atleta', giorno: null, ora: null, orari: [] }
  metti(a, orari, '')
  appuntamenti.unshift(a)
  return { ...si, id: a.id }
}
const alMioTurno = (id) => {
  const a = appuntamenti.find((x) => x.id === id)
  return a && toccaAMe(a, io()) ? a : null
}
export async function accettaOrario(orarioId, ora = null) {
  const a = appuntamenti.find((x) => x.orari.some((o) => o.id === orarioId))
  if (!a || !alMioTurno(a.id)) return no('Adesso tocca all’altro rispondere: ricarica.')
  const o = a.orari.find((x) => x.id === orarioId)
  a.orari.forEach((x) => x.stato === 'aperto' && (x.stato = 'rifiutato'))
  Object.assign(o, { stato: 'scelto' })
  const alle = ora || o.ora
  Object.assign(a, { stato: 'fissato', turno: null, giorno: o.giorno, ora: alle, fine: piuMinuti(alle, o.durata || 60) })
  return si
}
export async function controproponiOrari(id, orari, nota = '') {
  const a = alMioTurno(id)
  if (!a) return no('Adesso tocca all’altro rispondere: ricarica.')
  const prima = structuredClone(a.orari)
  a.orari.forEach((x) => x.stato === 'aperto' && x.daId !== io() && (x.stato = 'rifiutato'))
  const e = metti(a, orari, nota.trim())
  if (e) {
    a.orari = prima
    return no(e)
  }
  a.turno = a.turno === 'pt' ? 'atleta' : 'pt'
  return si
}
export async function annullaAppuntamento(id) {
  const a = appuntamenti.find((x) => x.id === id)
  Object.assign(a, { stato: 'annullato', turno: null, ultimoDa: io() })
  return si
}

export function toccaAMe(app, ioId) {
  if (app.stato !== 'trattativa') return false
  return app.turno === 'pt' ? app.ptId === ioId : app.atletaId === ioId
}
export const orariDellAltro = (app, ioId) => app.orari.filter((o) => o.stato === 'aperto' && o.daId !== ioId)
export const mieiAperti = (app, ioId) => app.orari.filter((o) => o.stato === 'aperto' && o.daId === ioId)
export const rifiutati = (app) => new Set(app.orari.filter((o) => o.stato === 'rifiutato').map(chiaveOrario))
export function notaDellAltro(app, ioId) {
  return orariDellAltro(app, ioId).find((o) => o.nota)?.nota || ''
}
export function useAppuntamentiDaDecidere(ioId) {
  const [k, setK] = useState(0)
  useEffect(() => {
    leggiAppuntamenti(ioId).then((t) => setK(t.filter((a) => toccaAMe(a, ioId)).length))
  }, [ioId])
  return k
}
export function useAppuntamentiFissati(ioId) {
  const [f, setF] = useState([])
  useEffect(() => {
    leggiAppuntamenti(ioId).then((t) => setF(t.filter((a) => a.stato === 'fissato' && a.atletaId === ioId)))
  }, [ioId])
  return f
}// 2026-10-28: le fasce impegnate (in tutti i ruoli).
import { leggiAgenda as agendaFinta } from './finta-agenda.js'
export function useFasceInAttesa(ioId, come = 'pt') {
  const [f, setF] = useState([])
  useEffect(() => {
    leggiAppuntamenti(ioId).then((t) => setF(t.filter((a) => a.stato === 'trattativa' && (come === 'pt' ? a.ptId : a.atletaId) === ioId).flatMap((a) => (come === 'pt' ? mieiAperti(a, ioId) : a.orari.filter((o) => o.stato === 'aperto')).map((o) => ({ ...o, appId: a.id, atletaId: a.atletaId, ptId: a.ptId, motivo: a.motivo })))))
  }, [ioId, come])
  return f
}
export function useOrariImpegnati(ioId, versione = 0) {
  const [imp, setImp] = useState([])
  useEffect(() => {
    Promise.all([leggiAppuntamenti(ioId), agendaFinta('2000-01-01', '2100-01-01')]).then(([app, ag]) =>
      setImp([
        ...app.filter((a) => a.stato === 'fissato').map((a) => ({ giorno: a.giorno, ora: a.ora, fine: a.fine, titolo: 'un appuntamento' })),
        ...app.filter((a) => a.stato === 'trattativa').flatMap((a) => a.orari.filter((o) => o.stato === 'aperto').map((o) => ({ giorno: o.giorno, ora: o.ora, fine: o.fine, titolo: 'una richiesta in attesa', appId: a.id }))),
        ...(ioId === 'pt' ? (ag.righe || []).filter((r) => r.ora).map((r) => ({ giorno: r.data, ora: r.ora, titolo: r.titolo })) : []),
      ]),
    )
  }, [ioId, versione])
  return imp
}
