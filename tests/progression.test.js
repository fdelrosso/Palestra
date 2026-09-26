import test from 'node:test'
import assert from 'node:assert/strict'
import { completamentoDi, isCompletato } from '../src/lib/progression.js'

test('completamentoDi: un giorno rifatto mostra l’ultima volta, la prima resta', () => {
  const prima = { settimana: 1, giornoId: 'g1', data: '2026-09-20T10:00:00.000Z', esercizi: [{}] }
  const ripetuto = { settimana: 1, giornoId: 'g1', data: '2026-09-25T10:00:00.000Z', esercizi: [{}] }
  const scheda = { completamenti: [prima, ripetuto] }
  assert.equal(completamentoDi(scheda, 1, 'g1'), ripetuto)
  assert.ok(isCompletato(scheda, 1, 'g1'))
  assert.equal(scheda.completamenti.length, 2)
})
