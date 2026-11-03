import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodoInParole } from '../src/lib/format.js'

test('il periodo con un ex atleta', () => {
  assert.equal(periodoInParole('2026-03-03T10:00:00', '2026-11-01T10:00:00'), 'Dal 3 mar 2026 al 1 nov 2026')
  assert.equal(periodoInParole(null, '2026-11-01T10:00:00'), 'Fino al 1 nov 2026')
})
