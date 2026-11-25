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

const { costruisciEsempio } = await import('../src/data/ospite.js')

test('l’esempio: due schede, una attiva, allenamenti nelle ultime settimane, una dieta', () => {
  const oggi = new Date('2026-11-25T10:00:00')
  const e = costruisciEsempio(oggi)
  assert.equal(e.utente.id, null)
  assert.equal(e.utente.ospite, true)
  assert.equal(e.schede.length, 2)
  assert.equal(e.schede.filter((s) => s.attiva).length, 1)
  const fatti = e.schede.flatMap((s) => s.completamenti)
  assert.ok(fatti.length >= 8, `solo ${fatti.length} allenamenti`)
  for (const c of fatti) {
    const giorni = (oggi - new Date(c.data)) / 86400000
    assert.ok(giorni > 0 && giorni < 36, c.data)
    assert.equal(c.daSalvare, undefined)
    assert.ok(c.esercizi.every((es) => es.sets.every((s) => s.colore)))
  }
  assert.equal(e.diete.length, 1)
  assert.ok(e.diete[0].attiva)
})
