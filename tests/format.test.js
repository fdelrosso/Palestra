import test from 'node:test'
import assert from 'node:assert/strict'
import { quandoBreve } from '../src/lib/format.js'

test("quandoBreve: l'ora oggi, poi Ieri, il giorno in settimana, la data", () => {
  const ora = new Date(2026, 8, 24, 20, 0)
  const q = (d) => quandoBreve(d.toISOString(), ora)
  assert.equal(q(new Date(2026, 8, 24, 18, 30)), '18:30')
  // Ieri sera tardi resta "Ieri" anche se sono passate meno di 24 ore.
  assert.equal(q(new Date(2026, 8, 23, 23, 50)), 'Ieri')
  assert.equal(q(new Date(2026, 8, 21, 9, 0)), 'Lun')
  assert.equal(q(new Date(2026, 8, 12, 9, 0)), '12 set')
  assert.equal(q(new Date(2025, 8, 12, 9, 0)), '12/09/25')
  assert.equal(quandoBreve('non una data', ora), '')
})
