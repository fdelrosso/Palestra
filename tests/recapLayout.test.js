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
  // Il titolo è spento di base (54ª): un layout vecchio non l'ha mai acceso.
  assert.deepEqual(n.nascosti, ['data', 'pallini', 'titolo', 'calore'])
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

test('alterna e sposta: spengono, riaccendono e scambiano di un posto', () => {
  let l = alterna(null, 'durata')
  assert.equal(acceso(l, 'durata'), false)
  assert.equal(eLayoutDefault(l), false)
  l = alterna(l, 'durata')
  assert.ok(eLayoutDefault(l))

  l = sposta(null, 'data', -1)
  const i = l.ordine.indexOf('data')
  assert.equal(l.ordine[i + 1], 'esercizi')
  // Ai bordi non succede niente.
  assert.deepEqual(sposta(null, ORDINE[0], -1).ordine, ORDINE)
  assert.deepEqual(sposta(null, ORDINE[ORDINE.length - 1], 1).ordine, ORDINE)
  // Le opzioni non hanno un posto: spostarle non fa niente.
  assert.deepEqual(sposta(null, 'pallini', 1).ordine, ORDINE)
})
