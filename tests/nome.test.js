import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove che toccano il database: loader per gli import senza
// estensione e `src/lib/supabase.js` sostituito. Il finto client risponde
// all'update del nome come farebbe il database: doppione → 23505, regole
// d'accesso che non lasciano passare → nessuna riga e nessun errore.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        globalThis.__db = { nomi: new Map(), mio: 'io', righeToccate: true }
        export const supabase = {
          rpc: async (fn, { p_nome }) => ({
            data: ![...__db.nomi.values()].some((n) => n.toLowerCase() === p_nome.trim().toLowerCase()),
            error: null,
          }),
          from: () => ({
            update: ({ nome }) => ({
              eq: (_c, id) => ({
                select: async () => {
                  const preso = [...__db.nomi].some(([k, n]) => k !== id && n.toLowerCase() === nome.toLowerCase())
                  if (preso) return { data: null, error: { code: '23505', message: 'duplicate key value' } }
                  if (!__db.righeToccate) return { data: [], error: null }
                  __db.nomi.set(id, nome)
                  return { data: [{ nome }], error: null }
                },
              }),
            }),
          }),
        }
        export function messaggioErrore(e) { return e?.message || 'errore' }
        export function erroreDiRete() { return false }
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

const { erroreNome, impostaNome, nomeDisponibile, pulisciNome } = await import('../src/lib/social.js')

function daCapo() {
  globalThis.__db.nomi = new Map([
    ['io', 'capocchia'],
    ['altro', 'Filippo'],
  ])
  globalThis.__db.righeToccate = true
}

test('le regole sono quelle della registrazione', () => {
  assert.equal(pulisciNome('  capocchi   rossi '), 'capocchi rossi')
  assert.equal(erroreNome('capocchi'), '')
  assert.match(erroreNome('   '), /Scrivi un nome/)
  assert.match(erroreNome('capo@cchi'), /@/)
  assert.match(erroreNome('x'.repeat(25)), /24/)
})

test('capocchia diventa capocchi', async () => {
  daCapo()
  assert.equal((await nomeDisponibile('capocchi')).libero, true)
  const esito = await impostaNome(' capocchi ', 'io')
  assert.deepEqual(esito, { ok: true, nome: 'capocchi', errore: '' })
  assert.equal(globalThis.__db.nomi.get('io'), 'capocchi')
})

test('un nome già di un altro si rifiuta, in italiano', async () => {
  daCapo()
  assert.equal((await nomeDisponibile('filippo')).libero, false)
  const esito = await impostaNome('filippo', 'io')
  assert.equal(esito.ok, false)
  assert.match(esito.errore, /già di qualcun altro/)
})

test('cambiare solo una maiuscola del proprio nome va bene', async () => {
  daCapo()
  const esito = await impostaNome('Capocchia', 'io')
  assert.equal(esito.ok, true)
  assert.equal(globalThis.__db.nomi.get('io'), 'Capocchia')
})

test('se il database non tocca nessuna riga, non si dice "fatto"', async () => {
  daCapo()
  globalThis.__db.righeToccate = false
  const esito = await impostaNome('capocchi', 'io')
  assert.equal(esito.ok, false)
  assert.equal(globalThis.__db.nomi.get('io'), 'capocchia')
})
