import test from 'node:test'
import assert from 'node:assert/strict'
import { conAllungamento, parteDopoAllungamento } from '../src/lib/schedaAParti.js'

// L'allungamento della scheda del PT (2026-10-28).
const es = (id, n) => ({ id, nome: id, variaPerSettimana: true, settimane: Array.from({ length: n }, (_, i) => ({ i })) })
const scheda = (n, esercizi) => ({ numeroSettimane: n, giorni: [{ id: 'A', tipo: 'workout', esercizi }] })

test('chi vedeva tutto vede anche le settimane nuove', () => {
  const intera = scheda(8, [es('panca', 8)])
  assert.deepEqual(parteDopoAllungamento(intera, null, null), { visibili: 8, dati: intera })
  assert.equal(parteDopoAllungamento(intera, 4, 4).visibili, 8)
})

test('a parti con settimane ancora chiuse: le nuove restano da sbloccare', () => {
  const r = parteDopoAllungamento(scheda(12, [es('panca', 12)]), 4, 8)
  assert.equal(r.visibili, 4)
  assert.equal(r.dati.numeroSettimane, 4)
  assert.equal(r.dati.giorni[0].esercizi[0].settimane.length, 4)
})

test("sulla scheda dell'atleta: esercizi nuovi del PT, il resto suo", () => {
  const mia = {
    ...scheda(4, [es('panca', 4)]),
    id: 'pt-1', nome: 'La mia', attiva: true, settimanaCorrente: 4, completamenti: [{ x: 1 }],
    daPt: { id: 'p', propostaId: '1' },
  }
  const nuova = scheda(6, [es('panca', 6), es('dip', 6)])
  const s = conAllungamento(mia, nuova, { visibili: 6, totali: 6, allungataIl: 't' })
  assert.equal(s.numeroSettimane, 6)
  assert.deepEqual(s.giorni[0].esercizi.map((e) => e.id), ['panca', 'dip'])
  assert.equal(s.nome, 'La mia')
  assert.equal(s.settimanaCorrente, 4)
  assert.deepEqual(s.completamenti, [{ x: 1 }])
  assert.deepEqual(s.daPt, { id: 'p', propostaId: '1', settimaneVisibili: 6, settimaneTotali: 6, allungataIl: 't' })
})

import { allegatoNuovo, conAllegatiDelPt } from '../src/lib/schedaAParti.js'

// Gli allegati del PT sugli esercizi (2026-10-28).
const conAllegati = (media, commenti) => ({ giorni: [{ id: 'A', nome: 'Giorno A', esercizi: [{ id: 'panca', nome: 'Panca', media, commenti }] }] })

test('arrivano gli allegati del PT, restano quelli dell’atleta', () => {
  const mia = conAllegati([{ id: 'm1', autoreId: 'mario' }, { id: 'v0', autoreId: 'pt' }], [{ id: 'c0', testo: 'vecchio' }])
  const nuova = conAllegati([{ id: 'v1', autoreId: 'pt', tipo: 'video' }], [{ id: 'c1', autoreId: 'pt' }])
  const e = conAllegatiDelPt(mia, nuova, 'pt').giorni[0].esercizi[0]
  assert.deepEqual(e.media.map((x) => x.id), ['m1', 'v1'])
  assert.deepEqual(e.commenti.map((x) => x.id), ['c0', 'c1'])
})

test('allungata: esercizi del PT, allegati dell’atleta ripresi', () => {
  const mia = { ...conAllegati([{ id: 'm1', autoreId: 'mario' }], []), daPt: { id: 'pt' }, numeroSettimane: 4 }
  const nuova = { numeroSettimane: 6, giorni: [{ id: 'A', esercizi: [{ id: 'panca', media: [{ id: 'v1', autoreId: 'pt' }] }, { id: 'dip' }] }] }
  const s = conAllungamento(mia, nuova, { visibili: 6, totali: 6, allungataIl: 't' })
  assert.deepEqual(s.giorni[0].esercizi[0].media.map((x) => x.id), ['m1', 'v1'])
  assert.deepEqual(s.giorni[0].esercizi[1].media, [])
})

test('quale allegato è nuovo, e dove', () => {
  const prima = conAllegati([], [])
  assert.deepEqual(allegatoNuovo(prima, conAllegati([{ id: 'v1', autoreId: 'pt', tipo: 'video' }], []), 'pt'), { giorno: 'Giorno A', esercizio: 'Panca', cosa: 'video' })
  assert.deepEqual(allegatoNuovo(prima, conAllegati([], [{ id: 'c', autoreId: 'pt' }]), 'pt').cosa, 'consiglio')
  assert.equal(allegatoNuovo(conAllegati([{ id: 'v1', autoreId: 'pt' }], []), conAllegati([], []), 'pt'), null)
})
