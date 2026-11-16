import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtraAtleti, isPt, isSoloPt, ruoloScelto, vistaUtente } from '../src/lib/pt.js'

const dueRuoli = { id: 'a', ruolo: 'pt', siAllena: true }

test('Tutti e due in modalità atleta è come un solo atleta', () => {
  const v = vistaUtente(dueRuoli, 'atleta')
  assert.equal(isPt(v), false)
  assert.equal(ruoloScelto(v), 'atleta')
})

test('Tutti e due in modalità PT è come un solo PT', () => {
  const v = vistaUtente(dueRuoli, 'pt')
  assert.equal(isSoloPt(v), true)
  assert.equal(ruoloScelto(v), 'pt')
})

test('il profilo vero non cambia', () => {
  vistaUtente(dueRuoli, 'pt')
  vistaUtente(dueRuoli, 'atleta')
  assert.deepEqual(dueRuoli, { id: 'a', ruolo: 'pt', siAllena: true })
})

test('la modalità non tocca chi ha un ruolo solo', () => {
  const atleta = { id: 'b', ruolo: 'atleta' }
  const soloPt = { id: 'c', ruolo: 'pt', siAllena: false }
  assert.equal(vistaUtente(atleta, 'pt'), atleta)
  assert.equal(vistaUtente(soloPt, 'atleta'), soloPt)
  assert.equal(vistaUtente(null, 'pt'), null)
})

test('filtraAtleti: nome o username, senza accenti né maiuscole; vuoto = tutti', () => {
  const l = [
    { nome: 'Niccolò Rossi', username: 'nico' },
    { nome: 'Anna', username: 'annabella' },
  ]
  assert.deepEqual(filtraAtleti(l, 'NICCO').map((a) => a.nome), ['Niccolò Rossi'])
  assert.deepEqual(filtraAtleti(l, 'bella').map((a) => a.nome), ['Anna'])
  assert.equal(filtraAtleti(l, '  ').length, 2)
  assert.deepEqual(filtraAtleti([{ n: 'Lucà' }], 'luca', (x) => x.n).length, 1)
})
