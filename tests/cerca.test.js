import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

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

const { cercaEsercizi, eserciziPropri, nomeInLibreria } = await import('../src/lib/eserciziLibreria.js')

test('la ricerca: tutte le parole, dall’inizio delle parole, i propri prima', () => {
  assert.equal(cercaEsercizi('panca bil')[0].nome, 'Panca piana bilanciere')
  assert.ok(cercaEsercizi('panca bil').every((e) => /panca/i.test(e.nome) && /bil/i.test(e.nome)))
  assert.equal(cercaEsercizi('lat')[0].nome, 'Lat machine avanti')
  const conMio = cercaEsercizi('curl', ['Curl a 45 manubri'])
  assert.deepEqual(conMio[0], { nome: 'Curl a 45 manubri', gruppo: 'bicipiti', proprio: true })
  // Senza testo: tutto, i propri in cima.
  assert.equal(cercaEsercizi('', ['Seal row'])[0].nome, 'Seal row')
})

test('il nome della libreria si propone solo se ci sono tutte le parole', () => {
  assert.equal(nomeInLibreria('Panca piana'), 'Panca piana bilanciere')
  assert.equal(nomeInLibreria('Military'), 'Lento avanti bilanciere (military)')
  assert.equal(nomeInLibreria('Curl a 45 manubri'), null)
  assert.equal(nomeInLibreria('Croci ai cavi'), null, 'è già lui')
})

test('gli esercizi propri: dal più recente, con lo schema dell’ultima volta', () => {
  const schede = [
    {
      creataIl: '2026-09-01T00:00:00Z',
      giorni: [{ esercizi: [{ nome: 'Panca', schemaBase: { serie: '4', ripetizioni: '8' } }, { nome: 'Seal row', schemaBase: null }] }],
      completamenti: [
        { data: '2026-09-20T00:00:00Z', esercizi: [{ nome: 'panca', schema: { serie: '5', ripetizioni: '5' } }] },
      ],
    },
  ]
  const propri = eserciziPropri(schede)
  assert.deepEqual(propri.map((p) => p.nome), ['panca', 'Seal row'])
  assert.deepEqual(propri[0].schema, { serie: '5', ripetizioni: '5' })
})
