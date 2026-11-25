import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// I moduli di src/ importano senza estensione (Vite li risolve, Node no).
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

const memoria = new Map()
globalThis.sessionStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
}

const { inOspite, entraOspite, esciOspite, prendiSchermataDopoOspite, rottaPerOspite, soloLettura } = await import(
  '../src/lib/ospite.js'
)

test('il flag ospite: entra, esce, e "crea" si prende una volta sola', () => {
  assert.equal(inOspite(), false)
  entraOspite()
  assert.equal(inOspite(), true)
  esciOspite('crea')
  assert.equal(inOspite(), false)
  assert.equal(prendiSchermataDopoOspite(), 'crea')
  assert.equal(prendiSchermataDopoOspite(), null)
})

test('rotte: si guarda, non si modifica né si socializza', () => {
  for (const r of ['inizio', 'home', 'scheda', 'calendario', 'recap-mese', 'dieta', 'esercizi', 'feed']) {
    assert.equal(rottaPerOspite(r), true, r)
  }
  for (const r of ['editor', 'importa', 'allenamento', 'chat', 'amici', 'profilo', 'lavoro', 'cerca', 'post']) {
    assert.equal(rottaPerOspite(r), false, r)
  }
})

test('soloLettura: i dati restano, ogni funzione chiede l’account e non fa niente', () => {
  const chiesti = []
  let toccato = false
  const v = soloLettura(
    { schede: [1], getScheda: (id) => id, salva: () => (toccato = true) },
    (cosa) => chiesti.push(cosa),
    ['getScheda'],
  )
  assert.deepEqual(v.schede, [1])
  assert.equal(v.getScheda(7), 7)
  assert.equal(v.salva(), undefined)
  assert.equal(toccato, false)
  assert.deepEqual(chiesti, ['salva'])
})
