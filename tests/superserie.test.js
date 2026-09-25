import test from 'node:test'
import assert from 'node:assert/strict'
import {
  blocchi,
  bloccoDi,
  giro,
  recuperoBlocco,
  spostaBlocco,
  spostaNelBlocco,
  togliEsercizio,
} from '../src/lib/superserie.js'

const es = (id, insieme = false, extra = {}) => ({ id, insiemeAlPrecedente: insieme, ...extra })
const ids = (lista) => lista.map((e) => e.id + (e.insiemeAlPrecedente ? '*' : '')).join(' ')

test('i blocchi: da soli, una superserie, una tri-serie', () => {
  const lista = [es('A'), es('B'), es('C', true), es('D'), es('E', true), es('F', true)]
  assert.deepEqual(
    blocchi(lista).map((b) => b.indici),
    [[0], [1, 2], [3, 4, 5]],
  )
  assert.equal(bloccoDi(lista, 2), 1)
  assert.equal(bloccoDi(lista, 5), 2)
})

test('il flag sul primo esercizio del giorno non conta', () => {
  assert.deepEqual(
    blocchi([es('A', true), es('B')]).map((b) => b.indici),
    [[0], [1]],
  )
})

test('togliere il primo di una superserie: il secondo diventa il primo, non si attacca a quello prima', () => {
  const lista = [es('X'), es('A'), es('B', true)]
  assert.equal(ids(togliEsercizio(lista, 'A')), 'X B')
  // Togliere il secondo lascia il primo com'era.
  assert.equal(ids(togliEsercizio(lista, 'B')), 'X A')
  // Da una tri-serie si toglie quello in mezzo: gli altri due restano uniti.
  assert.equal(ids(togliEsercizio([es('A'), es('B', true), es('C', true)], 'B')), 'A C*')
})

test('spostare un blocco: la superserie si sposta tutta e resta intera', () => {
  const lista = [es('X'), es('A'), es('B', true), es('Y')]
  // La superserie A+B va prima di X.
  assert.equal(ids(spostaBlocco(lista, 'B', -1)), 'A B* X Y')
  // X va dopo la superserie.
  assert.equal(ids(spostaBlocco(lista, 'X', +1)), 'A B* X Y')
  // La superserie va dopo Y.
  assert.equal(ids(spostaBlocco(lista, 'A', +1)), 'X Y A B*')
  // Ai bordi non si muove niente.
  assert.equal(spostaBlocco(lista, 'X', -1), lista)
  assert.equal(spostaBlocco(lista, 'Y', +1), lista)
  // Un flag sporco sul primo di un blocco non incolla niente dopo lo scambio.
  assert.equal(ids(spostaBlocco([es('A', true), es('B')], 'B', -1)), 'B A')
})

test('spostare dentro la superserie cambia chi va per primo, e la superserie resta', () => {
  const lista = [es('X'), es('A'), es('B', true), es('C', true)]
  assert.equal(ids(spostaNelBlocco(lista, 'B', -1)), 'X B A* C*')
  assert.equal(ids(spostaNelBlocco(lista, 'B', +1)), 'X A C* B*')
  // Fuori dal blocco non si esce: A non passa sopra X.
  assert.equal(spostaNelBlocco(lista, 'A', -1), lista)
  assert.equal(spostaNelBlocco(lista, 'C', +1), lista)
})

test('il giro: A1 B1, A2 B2 — e chi ha meno serie salta i giri in più', () => {
  const sess = [
    { sets: [{}, {}, {}] },
    { sets: [{}, {}] },
  ]
  const b = blocchi([es('A'), es('B', true)])[0]
  assert.deepEqual(
    giro(sess, b).map((p) => `${p.i}:${p.j}`),
    ['0:0', '1:0', '0:1', '1:1', '0:2'],
  )
  // Da solo è l'ordine di sempre.
  assert.deepEqual(
    giro(sess, { indici: [0] }).map((p) => p.j),
    [0, 1, 2],
  )
})

test('il recupero della superserie è quello di fine giro', () => {
  const sess = [{ schema: { recupero: '' } }, { schema: { recupero: '1,30min' } }]
  assert.equal(recuperoBlocco(sess, { indici: [0, 1] }), '1,30min')
  // Scritto solo sul primo: vale quello.
  const primo = [{ schema: { recupero: '2min' } }, { schema: { recupero: '' } }]
  assert.equal(recuperoBlocco(primo, { indici: [0, 1] }), '2min')
})
