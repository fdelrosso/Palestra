import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come media.test.js: loader che aggiunge `.js` e sostituisce lib/supabase con
// un finto Storage. `__file` e' { bucket: Set(percorsi) }; i percorsi in
// `__bloccati` si elencano ma non si cancellano, come quando una regola dice no.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = {
          storage: {
            from: (bucket) => ({
              list: async (cartella, { limit }) => {
                const tutti = [...(globalThis.__file[bucket] || [])]
                  .filter((p) => p.startsWith(cartella + '/'))
                  .map((p) => ({ name: p.slice(cartella.length + 1) }))
                return { data: tutti.slice(0, limit), error: null }
              },
              remove: async (percorsi) => {
                const tolti = percorsi.filter((p) => !globalThis.__bloccati.has(p))
                tolti.forEach((p) => globalThis.__file[bucket].delete(p))
                return { data: tolti.map((name) => ({ name })), error: null }
              },
            }),
          },
        }
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

const { eliminaFileUtente } = await import('../src/lib/fileUtente.js')

test('toglie tutti i file dell\'utente, anche oltre una pagina, e solo i suoi', async () => {
  const molti = Array.from({ length: 2500 }, (_, i) => `io/${i}`)
  globalThis.__file = {
    progressi: new Set([...molti, 'altro/1']),
    avatar: new Set(['io/a.jpg']),
  }
  globalThis.__bloccati = new Set()
  assert.deepEqual(await eliminaFileUtente('io'), { ok: true })
  assert.deepEqual([...globalThis.__file.progressi], ['altro/1'])
  assert.equal(globalThis.__file.avatar.size, 0)
})

test('se un file non si lascia togliere si ferma, invece di girare all\'infinito', async () => {
  globalThis.__file = { media: new Set(['io/1', 'io/2']) }
  globalThis.__bloccati = new Set(['io/2'])
  const esito = await eliminaFileUtente('io')
  assert.equal(esito.ok, false)
  assert.match(esito.errore, /media/)
})
