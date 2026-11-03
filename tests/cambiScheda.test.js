import test from 'node:test'
import assert from 'node:assert/strict'
import { cambiScheda, progressiSulla } from '../src/lib/cambiScheda.js'

// Il PT modifica la scheda di un atleta, e ne guarda i progressi (2026-10-28).
const schema = (serie, rip) => ({ fasi: [{ serie, rip }] })
const es = (id, nome, serie = 4, rip = 8) => ({ id, nome, variaPerSettimana: false, schemaBase: schema(serie, rip) })
const scheda = (giorni, extra = {}) => ({ nome: 'Massa', numeroSettimane: 4, giorni, ...extra })

test('niente cambiato, niente da dire', () => {
  const s = scheda([{ id: 'A', nome: 'Giorno A', tipo: 'workout', esercizi: [es('p', 'Panca')] }])
  assert.deepEqual(cambiScheda(s, structuredClone(s)), [])
})

test('settimane, esercizi aggiunti, tolti e con serie diverse', () => {
  const prima = scheda([{ id: 'A', nome: 'Giorno A', tipo: 'workout', esercizi: [es('p', 'Panca'), es('c', 'Croci')] }])
  const dopo = scheda(
    [
      { id: 'A', nome: 'Giorno A', tipo: 'workout', esercizi: [es('p', 'Panca', 5, 5), es('d', 'Dip', 3, 10)] },
      { id: 'B', nome: 'Giorno B', tipo: 'workout', esercizi: [] },
    ],
    { numeroSettimane: 6 },
  )
  const c = cambiScheda(prima, dopo)
  assert.ok(c.includes('Settimane: 4 → 6'))
  assert.ok(c.includes('Giorno A: tolto Croci'))
  assert.ok(c.some((x) => x.startsWith('Giorno A: aggiunto Dip')))
  assert.ok(c.some((x) => x.startsWith('Giorno A: Panca ') && x.includes('→')))
  assert.ok(c.includes('Nuovo giorno «Giorno B»'))
})

test('i progressi di un atleta su una scheda', () => {
  const s = { id: 's1', giorni: [{ id: 'A', esercizi: [es('p', 'Panca'), es('d', 'Dip')] }] }
  const serie = (...kg) => kg.map((k) => ({ colore: 'verde', kg: k }))
  const p = progressiSulla(s, [
    { schedaId: 's1', data: '2026-10-20', esercizi: [{ nome: 'Panca', sets: serie(60, 62.5) }] },
    { schedaId: 's1', data: '2026-10-27', esercizi: [{ nome: 'panca', sets: serie(70, 65) }] },
    { schedaId: 'altra', data: '2026-10-28', esercizi: [{ nome: 'Panca', sets: serie(100) }] },
  ])
  assert.equal(p.volte, 2)
  assert.equal(p.ultimo, '2026-10-27')
  assert.deepEqual(p.esercizi[0], { nome: 'Panca', volte: 2, primoKg: 62.5, ultimoKg: 70, maxKg: 70 })
  assert.deepEqual(p.esercizi[1], { nome: 'Dip', volte: 0, primoKg: null, ultimoKg: null, maxKg: null })
})
