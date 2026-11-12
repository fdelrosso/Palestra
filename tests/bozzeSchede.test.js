import { test } from 'node:test'
import assert from 'node:assert/strict'

const mem = {}
globalThis.localStorage = {
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => (mem[k] = String(v)),
}
const { bozzeDi, bozzaDi, salvaBozza, togliBozza } = await import('../src/lib/bozzeSchede.js')

test('le bozze: per utente, si tolgono, la più recente prima', () => {
  salvaBozza('u1', { id: 'a', nome: 'A' }, true)
  salvaBozza('u2', { id: 'b', nome: 'B' }, false)
  salvaBozza('u1', { id: 'c', nome: 'C' }, false)
  assert.deepEqual(bozzeDi('u1').map((b) => b.scheda.id).sort(), ['a', 'c'])
  assert.equal(bozzaDi('u1', 'b'), null)
  assert.equal(bozzaDi('u2', 'b').scheda.nome, 'B')
  togliBozza('a')
  assert.deepEqual(bozzeDi('u1').map((b) => b.scheda.id), ['c'])
})
