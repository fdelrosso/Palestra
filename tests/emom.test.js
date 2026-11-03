// tests/emom.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allineaEmom,
  esercizioDelMinuto,
  intervalli,
  posizioneEmom,
  sciogliEmom,
  serieEmom,
  statoOrologio,
  testoEmom,
  turnoEmom,
  vistaEmom,
} from '../src/lib/emom.js'

const E12 = { ogniSec: 60, minuti: 12 }
const es = (id, extra = {}) => ({
  id,
  nome: id,
  schemaBase: { fasi: [{ serie: null, rip: 10, carico: null }], recuperoSec: 90, nota: '' },
  ...extra,
})

test('intervalli e serie per esercizio', () => {
  assert.equal(intervalli(E12), 12)
  assert.equal(intervalli({ ogniSec: 90, minuti: 10 }), 6, 'il pezzo che avanza non si fa')
  assert.equal(intervalli({ ogniSec: 60, minuti: null }), null)
  assert.deepEqual([0, 1].map((k) => serieEmom(E12, 2, k)), [6, 6])
  assert.deepEqual([0, 1, 2].map((k) => serieEmom({ ogniSec: 60, minuti: 10 }, 3, k)), [4, 3, 3])
  assert.equal(serieEmom({ ogniSec: 60, minuti: null }, 2, 0), null)
})

test('i minuti di ogni esercizio e chi tocca al minuto m', () => {
  assert.equal(turnoEmom(1, 0), null)
  assert.equal(turnoEmom(2, 0), '1° di 2')
  assert.equal(turnoEmom(3, 1), '2° di 3')
  assert.deepEqual(esercizioDelMinuto(2, 0), { k: 0, j: 0 })
  assert.deepEqual(esercizioDelMinuto(2, 3), { k: 1, j: 1 })
  assert.deepEqual(esercizioDelMinuto(3, 7), { k: 1, j: 2 })
})

test("l'orologio: pronti, durante, a cavallo, finito", () => {
  const t0 = 1_000_000
  const s = (sec) => statoOrologio(t0, E12, t0 + sec * 1000)
  assert.deepEqual(s(3), { pronti: 7, minuto: 0, restanteSec: 60, finito: false })
  assert.deepEqual(s(10), { pronti: 0, minuto: 0, restanteSec: 60, finito: false })
  assert.deepEqual(s(10 + 59.5), { pronti: 0, minuto: 0, restanteSec: 1, finito: false })
  assert.deepEqual(s(10 + 60), { pronti: 0, minuto: 1, restanteSec: 60, finito: false })
  assert.deepEqual(s(10 + 12 * 60), { pronti: 0, minuto: 12, restanteSec: 0, finito: true })
  const oltranza = statoOrologio(t0, { ogniSec: 60, minuti: null }, t0 + (10 + 600) * 1000)
  assert.equal(oltranza.minuto, 10)
  assert.equal(oltranza.finito, false)
})

test('il testo', () => {
  assert.equal(testoEmom(E12), "EMOM 12' · ogni 1'")
  assert.equal(testoEmom({ ogniSec: 90, minuti: 9 }), "EMOM 9' · ogni 1'30\"")
  assert.equal(testoEmom({ ogniSec: 60, minuti: null }), "EMOM · ogni 1' · finché ce la faccio")
  assert.equal(testoEmom({ ogniSec: 60, minuti: null, minutiFatti: 9 }), "EMOM · ogni 1' · fino al 9° minuto")
  assert.equal(testoEmom({ ogniSec: 60, minuti: 12, minutiFatti: 7 }), "EMOM · ogni 1' · fino al 7° minuto")
  assert.equal(testoEmom({ ogniSec: 60, minuti: 12, minutiFatti: 12 }), "EMOM 12' · ogni 1'")
  assert.equal(testoEmom({ ogniSec: 120, minuti: null, minutiFatti: 4 }), "EMOM · ogni 2' · 4 intervalli")
})

test('allineaEmom: serie calcolate, niente recupero, emom solo sul primo', () => {
  const lista = [es('X'), es('A', { emom: E12 }), es('B', { insiemeAlPrecedente: true })]
  const out = allineaEmom(lista)
  assert.equal(out[0], lista[0], 'chi non è in un EMOM non si tocca')
  assert.equal(out[1].schemaBase.fasi[0].serie, 6)
  assert.equal(out[2].schemaBase.fasi[0].serie, 6)
  assert.equal(out[1].schemaBase.recuperoSec, null)
  assert.equal(out[2].emom, undefined)
  assert.deepEqual(allineaEmom(out), out, 'idempotente')
})

test('allineaEmom: il primo cambiato prende emom, gli altri lo perdono', () => {
  const lista = [es('B', { emom: E12 }), es('A', { insiemeAlPrecedente: true })].reverse()
  lista[0] = { ...lista[0], insiemeAlPrecedente: false }
  lista[1] = { ...lista[1], insiemeAlPrecedente: true }
  const out = allineaEmom(lista)
  assert.deepEqual(out[0].emom, E12)
  assert.equal(out[1].emom, undefined)
})

test('posizioneEmom e sciogliEmom', () => {
  const lista = allineaEmom([es('X'), es('A', { emom: E12 }), es('B', { insiemeAlPrecedente: true })])
  assert.equal(posizioneEmom(lista, 0), null)
  const p = posizioneEmom(lista, 2)
  assert.deepEqual([p.emom, p.n, p.k], [E12, 2, 1])
  const sciolti = sciogliEmom(lista, 'B')
  assert.equal(sciolti[1].emom, undefined)
  assert.equal(sciolti[2].insiemeAlPrecedente, false)
  assert.equal(posizioneEmom(sciolti, 1), null)
})

const { register } = await import('node:module')
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) return next(spec + '.js', ctx)
          throw e
        }
      }`),
)
const { chiudiEmom, serieEmomFinoA } = await import('../src/lib/session.js')

const sess = (sets, extra = {}) => ({
  schema: { fasi: [{ serie: null, rip: 10, carico: { tipo: 'kg', valore: 24 } }], recuperoSec: null, nota: '' },
  sets: Array.from({ length: sets }, () => ({ colore: null })),
  ...extra,
})

test('a oltranza le serie crescono con gli intervalli', () => {
  const b = { inizio: 0, fine: 1, indici: [0, 1] }
  const lista = [sess(1, { emom: { ogniSec: 60, minuti: null } }), sess(1)]
  assert.equal(serieEmomFinoA(lista, b, 1), lista, 'niente da aggiungere: stesso oggetto')
  const dopo = serieEmomFinoA(lista, b, 4)
  assert.deepEqual(dopo.map((e) => e.sets.length), [3, 2])
})

test("chiudiEmom: valgono gli intervalli fatti, le serie non date diventano 'fatto'", () => {
  const b = { inizio: 0, fine: 1, indici: [0, 1] }
  const lista = [sess(6, { emom: { ogniSec: 60, minuti: 12, inizio: 5 } }), sess(6)]
  lista[0].sets[0] = { colore: 'verde', rip: 10, kg: 24 }
  const out = chiudiEmom(lista, b, 5)
  assert.deepEqual(out.map((e) => e.sets.length), [3, 2])
  assert.equal(out[0].sets[0].colore, 'verde')
  assert.equal(out[0].sets[1].colore, 'fatto')
  assert.equal(out[0].sets[1].rip, 10, 'fatta come da piano')
  assert.equal(out[0].emom.minutiFatti, 5)
})

test('chiudiEmom: oltre le 30 serie della sessione, gli intervalli fatti restano tutti', () => {
  const b = { inizio: 0, fine: 0, indici: [0] }
  const lista = [sess(30, { emom: { ogniSec: 60, minuti: 40, inizio: 5 } })]
  const out = chiudiEmom(lista, b, 40)
  assert.equal(out[0].sets.length, 40)
  assert.equal(out[0].sets[39].colore, 'fatto')
})

test('vistaEmom: chi tocca adesso, se no il primo alla sua prima serie da dare', () => {
  const b = { inizio: 0, fine: 1, indici: [0, 1] }
  const set = (c = null) => ({ colore: c })
  const lista = (inizio) => [
    { emom: { ogniSec: 60, minuti: 12, ...(inizio != null ? { inizio } : {}) }, sets: [set('verde'), set()] },
    { sets: [set(), set()] },
  ]
  assert.deepEqual(vistaEmom(lista(null), b, null), { i: 0, j: 1 }, 'prima di partire')
  const t0 = 1_000_000
  assert.deepEqual(vistaEmom(lista(t0), b, null, t0 + (10 + 61) * 1000), { i: 1, j: 0 }, 'al minuto 2 tocca al secondo')
  assert.deepEqual(vistaEmom(lista(t0), b, { i: 0, j: 0 }, t0 + 71000), { i: 0, j: 0 }, 'un pallino toccato vince')
})
