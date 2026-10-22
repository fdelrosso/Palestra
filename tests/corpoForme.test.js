import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVELLI_CALORE, coloreCalore, coloreMuscolo, livelloCalore, stileCalore } from '../src/lib/corpoForme.js'

test('"Per intensità": livelli fissi, uguali per tutti i gruppi', () => {
  assert.equal(coloreCalore(0), LIVELLI_CALORE[0].colore)
  assert.equal(coloreCalore(1), LIVELLI_CALORE.at(-1).colore)
  assert.equal(coloreMuscolo('petto', 0.5, true), coloreMuscolo('schiena', 0.5, true))
})

test('cinque livelli in parti uguali della quota sul gruppo più lavorato', () => {
  assert.equal(LIVELLI_CALORE.length, 5)
  assert.deepEqual([0, 0.2, 0.21, 0.4, 0.41, 0.6, 0.61, 0.8, 0.81, 1].map(livelloCalore), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
  assert.equal(livelloCalore(-1), 0)
  assert.equal(livelloCalore(7), 4)
})

test('la pastiglia prende colore e inchiostro del suo livello', () => {
  assert.deepEqual(stileCalore(1), { '--h': LIVELLI_CALORE[4].colore, '--h-ink': '#ffffff' })
})
