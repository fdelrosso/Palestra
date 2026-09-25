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

const { allenamentiDaMandare, schedeDaMandare } = await import('../src/lib/condivisioni.js')

const schede = [
  {
    id: 's1',
    nome: 'Forza',
    creataIl: '2026-09-01',
    giorni: [{ id: 'g1', nome: 'Petto', tipo: 'workout' }],
    completamenti: [
      { giornoId: 'g1', data: '2026-09-10T18:00:00.000Z', esercizi: [{ nome: 'Panca' }] },
      { giornoId: 'g1', data: '2026-09-20T18:00:00.000Z' },
      { giornoId: 'g1' }, // senza data: non si manda
    ],
  },
  {
    id: 'lib',
    nome: 'Allenamenti liberi',
    libera: true,
    creataIl: '2026-09-15',
    giorni: [],
    completamenti: [{ nomeGiorno: 'Corsa', data: '2026-09-15T07:00:00.000Z' }],
  },
]

test('le schede da mandare non contano il cassetto degli allenamenti liberi', () => {
  assert.deepEqual(schedeDaMandare(schede).map((s) => s.id), ['s1'])
})

test('gli allenamenti da mandare: tutti quelli con una data, dal piu recente, liberi compresi', () => {
  const voci = allenamentiDaMandare(schede, { id: 'io', nome: 'Pippo' })
  assert.deepEqual(
    voci.map((v) => v.titolo),
    ['Petto', 'Corsa', 'Petto'],
  )
  assert.equal(voci[2].payload.dettagliato, true)
  assert.equal(voci[0].payload.dettagliato, false)
  assert.equal(voci[0].payload.utenteNome, 'Pippo')
  assert.equal(voci[0].sottotitolo, 'Forza')
})
