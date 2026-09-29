import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BLOCCHI_RECAP,
  acceso,
  alterna,
  eLayoutDefault,
  layoutDefault,
  normalizzaLayout,
  sposta,
} from '../src/lib/recapLayout.js'

const ORDINE = BLOCCHI_RECAP.map((b) => b.id)

test('normalizzaLayout: senza niente è la card di sempre', () => {
  assert.deepEqual(normalizzaLayout(null), layoutDefault())
  assert.deepEqual(normalizzaLayout('boh'), layoutDefault())
  assert.ok(eLayoutDefault(undefined))
})

test('normalizzaLayout: via doppioni e sconosciuti, i blocchi nuovi entrano al loro posto', () => {
  // Un layout salvato "prima" che esistessero battito e sforzo.
  const vecchio = {
    ordine: ORDINE.filter((id) => id !== 'battito' && id !== 'sforzo').concat(['titolo', 'inventato']),
    nascosti: ['data', 'inventato', 'pallini', 'data'],
  }
  const n = normalizzaLayout(vecchio)
  assert.deepEqual(n.ordine, ORDINE)
  assert.deepEqual(n.nascosti, ['data', 'pallini'])
})

test('alterna e sposta: spengono, riaccendono e scambiano di un posto', () => {
  let l = alterna(null, 'durata')
  assert.equal(acceso(l, 'durata'), false)
  assert.equal(eLayoutDefault(l), false)
  l = alterna(l, 'durata')
  assert.ok(eLayoutDefault(l))

  l = sposta(null, 'commento', -1)
  const i = l.ordine.indexOf('commento')
  assert.equal(l.ordine[i + 1], 'esercizi')
  // Ai bordi non succede niente.
  assert.deepEqual(sposta(null, 'data', -1).ordine, ORDINE)
  assert.deepEqual(sposta(null, 'commento', 1).ordine, ORDINE)
  // Le opzioni non hanno un posto: spostarle non fa niente.
  assert.deepEqual(sposta(null, 'pallini', 1).ordine, ORDINE)
})
