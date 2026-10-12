import test from 'node:test'
import assert from 'node:assert/strict'
import { modoAttuale } from '../src/lib/tema.js'

function conSalvato(valori, f) {
  const prima = globalThis.localStorage
  globalThis.localStorage = { getItem: (k) => valori[k] ?? null, setItem() {}, removeItem() {} }
  try {
    return f()
  } finally {
    globalThis.localStorage = prima
  }
}

const salvato = (v) => ({ 'palestra:colori:v1': JSON.stringify(v) })

test('senza niente di salvato: sfondo nero', () => {
  assert.equal(conSalvato({}, modoAttuale), 'scuro')
})

test('chi aveva scelto il bianco lo ritrova, chi aveva "automatico" riparte dal nero', () => {
  assert.equal(conSalvato(salvato({ modo: 'chiaro', colore: '#f472b6' }), modoAttuale), 'chiaro')
  assert.equal(conSalvato(salvato({ modo: 'scuro', colore: '#f472b6' }), modoAttuale), 'scuro')
  assert.equal(conSalvato(salvato({ modo: 'auto', colore: '#5cc8f5' }), modoAttuale), 'scuro')
})

test('il formato con lo sfondo a scelta: chiaro o scuro a seconda dello sfondo', () => {
  assert.equal(conSalvato(salvato({ sfondo: '#0c1a13', colore: '#f472b6' }), modoAttuale), 'scuro')
  assert.equal(conSalvato(salvato({ sfondo: '#f6f1e7', colore: '#f472b6' }), modoAttuale), 'chiaro')
})

test('il vecchio interruttore chiaro/scuro', () => {
  assert.equal(conSalvato({ 'palestra:tema:v1': 'chiaro' }, modoAttuale), 'chiaro')
})
