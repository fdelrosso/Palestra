import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: un loader minimo aggiunge `.js` agli import di src/.
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

// L'anello di un giorno nel calendario (lib/oggi anelloDi): spicchi grandi
// quanto gli esercizi SVOLTI di ogni gruppo (un cardio saltato non c'e').
const { anelloDi } = await import('../src/lib/oggi.js')
const { gruppoDi } = await import('../src/lib/muscoli.js')

test('spicchi proporzionali agli esercizi', () => {
  const es = (g) => ({ gruppo: g, sets: [{ colore: 'verde' }, { colore: null }] })
  const saltato = { gruppo: 'cardio', sets: [{ colore: null }] }
  const r = anelloDi([{ esercizi: [es('petto'), es('petto'), saltato, es('petto'), es('bicipiti')] }])
  assert.equal(r, `conic-gradient(${gruppoDi('petto').colore} 0% 75%, ${gruppoDi('bicipiti').colore} 75% 100%)`)
})

test('senza esercizi niente anello', () => {
  assert.equal(anelloDi([{ esercizi: [] }]), undefined)
})
