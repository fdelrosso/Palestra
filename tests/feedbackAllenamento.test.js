import test from 'node:test'
import assert from 'node:assert/strict'
import { deveChiedereFeedback } from '../src/lib/feedbackAllenamento.js'

const adesso = new Date('2026-10-27T18:00:00Z')

test('la prima volta si chiede, anche a chi c’era già', () => {
  assert.ok(deveChiedereFeedback(undefined, adesso))
  assert.ok(deveChiedereFeedback('', adesso))
})

test('dopo la prima, non prima di una settimana', () => {
  assert.ok(!deveChiedereFeedback('2026-10-27T10:00:00Z', adesso))
  assert.ok(!deveChiedereFeedback('2026-10-21T18:00:01Z', adesso))
  assert.ok(deveChiedereFeedback('2026-10-20T18:00:00Z', adesso))
  assert.ok(deveChiedereFeedback('2026-09-01T08:00:00Z', adesso))
})

test('una data rovinata vale come mai vista', () => {
  assert.ok(deveChiedereFeedback('ieri', adesso))
})
