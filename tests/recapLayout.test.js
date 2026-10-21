import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BLOCCHI_RECAP,
  acceso,
  alterna,
  eLayoutDefault,
  layoutDefault,
  normalizzaLayout,
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
  // Il titolo è spento di base (54ª): un layout vecchio non l'ha mai acceso.
  assert.deepEqual(n.nascosti, ['data', 'pallini', 'titolo', 'calore', 'caloreLegenda'])
})

test('di base il commento sta in alto e la data in fondo', () => {
  const { ordine } = layoutDefault()
  assert.ok(ordine.indexOf('commento') < ordine.indexOf('durata'))
  assert.equal(ordine[ordine.length - 1], 'data')
})

test('il titolo: spento di base, anche nei layout salvati prima', () => {
  assert.equal(acceso(null, 'titolo'), false)
  assert.equal(acceso({ ordine: ORDINE, nascosti: [] }, 'titolo'), false)
  assert.equal(acceso({ ordine: ORDINE, nascosti: ['durata'] }, 'durata'), false)
})

test('il titolo acceso a mano resta acceso, anche dopo un giro di salvataggio', () => {
  const l = alterna(null, 'titolo')
  assert.equal(acceso(l, 'titolo'), true)
  assert.equal(eLayoutDefault(l), false)
  // Salvato e riletto (normalizzaLayout) non torna spento.
  assert.equal(acceso(normalizzaLayout(JSON.parse(JSON.stringify(l))), 'titolo'), true)
  // Rispento: è di nuovo la card di sempre, che non serve salvare.
  assert.ok(eLayoutDefault(alterna(l, 'titolo')))
})

test('alterna: spegne e riaccende', () => {
  let l = alterna(null, 'durata')
  assert.equal(acceso(l, 'durata'), false)
  assert.equal(eLayoutDefault(l), false)
  l = alterna(l, 'durata')
  assert.ok(eLayoutDefault(l))
})

test("l'ordine è sempre quello fisso, anche se ne è stato salvato un altro", () => {
  const rimescolato = { ordine: [...ORDINE].reverse(), nascosti: ['durata'] }
  const n = normalizzaLayout(rimescolato)
  assert.deepEqual(n.ordine, ORDINE)
  // Quello che era spento resta spento: si toglie solo l'ordine.
  assert.equal(acceso(n, 'durata'), false)
  // Un ordine diverso da solo non rende la card "personalizzata".
  assert.ok(eLayoutDefault({ ordine: [...ORDINE].reverse(), nascosti: [] }))
})
