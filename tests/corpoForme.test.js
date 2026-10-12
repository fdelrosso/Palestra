import test from 'node:test'
import assert from 'node:assert/strict'
import { coloreCalore, coloreMuscolo } from '../src/lib/corpoForme.js'

test('la scala calore va dal bianco (poco) al blu (tanto), uguale per tutti i gruppi', () => {
  assert.equal(coloreCalore(0), 'rgb(255, 255, 255)')
  assert.equal(coloreCalore(1), 'rgb(29, 95, 214)')
  assert.equal(coloreMuscolo('petto', 0.5, true), coloreMuscolo('schiena', 0.5, true))
})
