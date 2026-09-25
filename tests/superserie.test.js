import test from 'node:test'
import assert from 'node:assert/strict'
import {
  blocchi,
  bloccoDi,
  giro,
  recuperoBlocco,
  spostaEsercizio,
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

test("spostare un esercizio lo fa uscire dalla superserie, e non spezza quella da cui esce", () => {
  const lista = [es('X'), es('A'), es('B', true), es('C', true)]
  // C sale sopra B: esce dal blocco, A e B restano uniti.
  assert.equal(ids(spostaEsercizio(lista, 'C', -1)), 'X A C B')
  // X scende sotto A, cioè dentro la tri-serie A+B+C: la spezza. A resta
  // da solo, B e C restano uniti fra loro.
  assert.equal(ids(spostaEsercizio(lista, 'X', +1)), 'A X B C*')
  // Ai bordi non si muove niente.
  assert.equal(spostaEsercizio(lista, 'X', -1), lista)
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
