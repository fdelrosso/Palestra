import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Le foto e i video fatti durante l'allenamento (lib/mediaSessione). Come in
// media.test.js: un loader aggiunge `.js` e sostituisce lib/supabase.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent('export const supabase = {}; export const erroreDiRete = () => false')
      export async function resolve(spec, ctx, next) {
        let esito
        try { esito = await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) esito = await next(spec + '.js', ctx)
          else throw e
        }
        if (esito.url.endsWith('/lib/supabase.js')) return { url: STUB, format: 'module', shortCircuit: true }
        return esito
      }`),
)

const { conNuovoMedia } = await import('../src/lib/mediaSessione.js')

test('gli allegati si sommano', () => {
  const a = { id: 'a', uso: 'allegato' }
  const b = { id: 'b', uso: 'allegato' }
  const { lista, via } = conNuovoMedia([a], b)
  assert.deepEqual(lista, [a, b])
  assert.deepEqual(via, [])
})

test('lo sfondo è uno solo: il nuovo prende il posto del vecchio', () => {
  const a = { id: 'a', uso: 'allegato' }
  const s1 = { id: 's1', uso: 'sfondo' }
  const s2 = { id: 's2', uso: 'sfondo' }
  const { lista, via } = conNuovoMedia([a, s1], s2)
  assert.deepEqual(lista, [a, s2])
  assert.deepEqual(via, [s1])
})
