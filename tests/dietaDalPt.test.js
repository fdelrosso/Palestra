import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
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

const { dietaPerIlViaggio, dietaDaMacro, dietaDaProposta } = await import('../src/lib/dietaDalPt.js')
const { nuovaDieta } = await import('../src/lib/dieta.js')

const DEL_PT = nuovaDieta({
  nome: 'Massa',
  obiettivo: 'massa',
  allenamento: { kcal: 0, proteine: 150, carbo: 300, grassi: 70, pasti: [{ id: 'p1', slot: 'pranzo', nome: 'Pranzo', testo: '100g di riso', opzioni: [] }] },
  riposo: { kcal: 0, proteine: 150, carbo: 200, grassi: 70, pasti: [] },
  attivataIl: '2026-10-01T10:00:00Z',
  dataInizio: '2026-09-01',
})

test('il piano viaggia coi pasti, ma senza la scelta e il periodo del PT', () => {
  const d = dietaPerIlViaggio(DEL_PT, 'piano')
  assert.equal(d.allenamento.pasti.length, 1)
  assert.equal(d.attivataIl, undefined)
  assert.equal(d.dataInizio, undefined)
})

test('solo i macro: i numeri, con le calorie contate, e nessun pasto', () => {
  const d = dietaPerIlViaggio(DEL_PT, 'macro')
  assert.equal(d.allenamento.pasti.length, 0)
  assert.equal(d.allenamento.kcal, 150 * 4 + 300 * 4 + 70 * 9)
  assert.equal(d.schema, undefined)
})

test('i macro scritti dal PT diventano una dieta', () => {
  const d = dietaDaMacro({ nome: 'Def', obiettivo: 'dimagrimento', allenamento: { proteine: '160', carbo: '200', grassi: '60' }, riposo: { proteine: '160', carbo: '120', grassi: '60' } })
  assert.equal(d.allenamento.proteine, 160)
  assert.equal(d.riposo.kcal, 160 * 4 + 120 * 4 + 60 * 9)
})

test('accettata, la dieta parte da oggi, dice che viene dal PT e non si duplica', () => {
  const proposta = { id: 'abc', ptId: 'pt1', dati: dietaPerIlViaggio(DEL_PT, 'piano') }
  const a = dietaDaProposta(proposta, 'Marco')
  const b = dietaDaProposta(proposta, 'Marco')
  assert.equal(a.id, 'pt-abc')
  assert.equal(a.id, b.id)
  assert.equal(a.fonte, 'esterna')
  assert.equal(a.daPt.id, 'pt1')
  assert.equal(a.dataFine, '')
})

test('modoDi: coi pasti è il piano, coi soli numeri sono i macro', async () => {
  const { modoDi } = await import('../src/lib/dietaDalPt.js')
  assert.equal(modoDi(DEL_PT), 'piano')
  const soloNumeri = nuovaDieta({
    allenamento: { kcal: 2500, proteine: 150, carbo: 300, grassi: 70, pasti: [{ id: 'x', slot: 'pranzo', nome: 'Pranzo', testo: '  ', opzioni: [] }] },
    riposo: { kcal: 2200, proteine: 150, carbo: 200, grassi: 70, pasti: [] },
  })
  assert.equal(modoDi(soloNumeri), 'macro')
})

test('mandateDi: prima gli id segnati, poi per nome quelle che nessuna reclama', async () => {
  const { mandateDi } = await import('../src/lib/dietaDalPt.js')
  const proposte = [
    { id: 'a', nome: 'Massa' },
    { id: 'b', nome: 'Massa' },
    { id: 'c', nome: 'Definizione' },
  ]
  const reclamate = new Set(['a'])
  assert.deepEqual(mandateDi({ nome: 'Altra', mandate: ['a'] }, proposte, reclamate).map((p) => p.id), ['a'])
  // "b" ha lo stesso nome ma nessuno la reclama: è di quella che si chiama così.
  assert.deepEqual(mandateDi({ nome: 'Massa' }, proposte, reclamate).map((p) => p.id), ['b'])
  assert.deepEqual(mandateDi({ nome: '' }, proposte, reclamate), [])
})
