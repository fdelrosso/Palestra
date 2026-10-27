import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come in interazioni.test.js: `src/lib/supabase.js` legge `import.meta.env`,
// che fuori da Vite non esiste, e al suo posto entra un finto client.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = { rpc: async () => ({ data: null, error: null }) }
        export function messaggioErrore(e) { return String(e?.message || e || '') }
      \`)
      export async function resolve(spec, ctx, next) {
        const esito = await next(spec.startsWith('.') && !spec.endsWith('.js') ? spec + '.js' : spec, ctx)
        if (esito.url.endsWith('/lib/supabase.js')) return { url: STUB, format: 'module', shortCircuit: true }
        return esito
      }`),
)

const { luogoPalestra } = await import('../src/lib/palestre.js')

test('luogoPalestra: indirizzo e comune con la sigla, quello che c’è', () => {
  assert.equal(luogoPalestra({ indirizzo: 'Via Volturno', comune: 'Milano', provincia: 'MI' }), 'Via Volturno · Milano (MI)')
  assert.equal(luogoPalestra({ indirizzo: '', comune: 'Milano', provincia: 'MI' }), 'Milano (MI)')
  assert.equal(luogoPalestra({ indirizzo: 'Via Roma 3', comune: 'Pisa', provincia: '' }), 'Via Roma 3 · Pisa')
  assert.equal(luogoPalestra({ indirizzo: '', comune: '', provincia: '' }), '')
  assert.equal(luogoPalestra(null), '')
})
