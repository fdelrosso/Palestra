import test from 'node:test'
import assert from 'node:assert/strict'
import { chiaveOrario, ordinaOrari, orarioValido, problemaOrari } from '../src/lib/orariAppuntamento.js'

// Gli orari degli appuntamenti atleta–PT (2026-10-28).
const ADESSO = new Date(2026, 9, 28, 12, 0)
const o = (giorno, ora) => ({ giorno, ora })

test('un orario vale se è scritto bene e da adesso in poi', () => {
  assert.equal(orarioValido(o('2026-10-28', '18:00'), ADESSO), true)
  assert.equal(orarioValido(o('2026-10-28', '09:00'), ADESSO), false)
  assert.equal(orarioValido(o('2026-10-29', ''), ADESSO), false)
  assert.equal(orarioValido(o('', '18:00'), ADESSO), false)
})

test('dal più vicino', () => {
  const lista = [o('2026-11-02', '09:00'), o('2026-10-30', '18:00'), o('2026-10-30', '08:30')]
  assert.deepEqual(ordinaOrari(lista).map(chiaveOrario), ['2026-10-30 08:30', '2026-10-30 18:00', '2026-11-02 09:00'])
})

test('cosa non va negli orari', () => {
  assert.equal(problemaOrari([], new Set(), ADESSO), 'Metti almeno un giorno con l’orario.')
  assert.match(problemaOrari([o('2026-10-27', '18:00')], new Set(), ADESSO), /da adesso in poi/)
  assert.match(problemaOrari([o('2026-10-30', '18:00'), o('2026-10-30', '18:00')], new Set(), ADESSO), /due volte/)
  assert.equal(problemaOrari([o('2026-10-30', '18:00')], new Set(), ADESSO), '')
})

test('un orario rifiutato non si ripropone', () => {
  const scartati = new Set(['2026-10-30 18:00'])
  assert.match(problemaOrari([o('2026-10-30', '18:00')], scartati, ADESSO), /già stato rifiutato/)
  assert.equal(problemaOrari([o('2026-10-30', '19:00')], scartati, ADESSO), '')
})

test('al massimo dieci per volta', () => {
  const tanti = Array.from({ length: 11 }, (_, i) => o('2026-11-0' + ((i % 9) + 1), `1${i % 10}:00`))
  assert.match(problemaOrari(tanti, new Set(), ADESSO), /Al massimo 10/)
})

import { FASCE, orarioImpegnato, primaFasciaLibera } from '../src/lib/orariAppuntamento.js'

test('le fasce: ogni mezz’ora dalle 6 alle 22:30', () => {
  assert.equal(FASCE[0], '06:00')
  assert.equal(FASCE[1], '06:30')
  assert.equal(FASCE.at(-1), '22:30')
})

test('una fascia è occupata a meno di un’ora da un impegno', () => {
  const impegni = [{ giorno: '2026-11-03', ora: '18:00' }, { giorno: '2026-11-03', ora: '' }]
  assert.ok(orarioImpegnato({ giorno: '2026-11-03', ora: '18:30' }, impegni))
  assert.ok(orarioImpegnato({ giorno: '2026-11-03', ora: '17:30' }, impegni))
  assert.equal(orarioImpegnato({ giorno: '2026-11-03', ora: '19:00' }, impegni), null)
  assert.equal(orarioImpegnato({ giorno: '2026-11-04', ora: '18:00' }, impegni), null)
  assert.equal(primaFasciaLibera('2026-11-03', impegni), '19:00')
  assert.match(problemaOrari([{ giorno: '2099-11-03', ora: '18:00' }], new Set(), new Date(), [{ giorno: '2099-11-03', ora: '18:30' }]), /impegnato/)
})
