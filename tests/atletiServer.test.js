import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Stesso loader di feedServer.test.js: `.js` implicito e finto `lib/supabase.js`.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = {}
        export function erroreDiRete() { return false }
        export function messaggioErrore(e) { return String(e?.message || e) }
      \`)
      export async function resolve(spec, ctx, next) {
        let esito
        try { esito = await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) esito = await next(spec + '.js', ctx)
          else throw e
        }
        if (esito.url.endsWith('/lib/supabase.js')) {
          return { url: STUB, format: 'module', shortCircuit: true }
        }
        return esito
      }`),
)

const { schedeDaRighe } = await import('../src/lib/atletiServer.js')

const riga = (id, user_id, creataIl, extra = {}) => ({
  id, user_id, dati: { id, nome: id, creataIl, visibilita: 'pubblica', ...extra },
})

test('schedeDaRighe: raggruppa per atleta, la più recente prima, niente solo-me', () => {
  const m = schedeDaRighe([
    riga('a', 'u1', '2026-10-01T10:00:00Z'),
    riga('b', 'u1', '2026-10-05T10:00:00Z'),
    riga('c', 'u2', '2026-10-02T10:00:00Z'),
    riga('d', 'u2', '2026-10-03T10:00:00Z', { visibilita: 'nascosta' }),
  ])
  assert.deepEqual(m.get('u1').map((s) => s.id), ['b', 'a'])
  assert.deepEqual(m.get('u2').map((s) => s.id), ['c'])
  assert.equal(schedeDaRighe(null).size, 0)
})
