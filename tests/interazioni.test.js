import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come in chat.test.js: `src/lib/supabase.js` legge `import.meta.env`, che
// fuori da Vite non esiste, e al suo posto entra un finto client. Si provano le
// funzioni pure, quelle che decidono cosa si vede sotto un post.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = { from: () => ({}), channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }), rpc: async () => ({ data: null, error: null }) }
        export function erroreDiRete() { return false }
        export function messaggioErrore(e) { return String(e?.message || e || '') }
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

const { NESSUNA, commentoValido, conMiPiace, daRiga } = await import('../src/lib/interazioni.js')

test("daRiga: numeri veri, e l'ultimo commento solo se c'è", () => {
  assert.deepEqual(
    daRiga({ mi_piace: '3', mio: true, commenti: '2', ultimo_nome: 'Nico', ultimo_testo: 'forte', ultimo_foto: false }),
    { miPiace: 3, mio: true, commenti: 2, ultimo: { nome: 'Nico', testo: 'forte', foto: false } },
  )
  assert.deepEqual(daRiga({ mi_piace: 0, mio: false, commenti: 0, ultimo_nome: null }), {
    miPiace: 0,
    mio: false,
    commenti: 0,
    ultimo: null,
  })
  // Un commento fatto solo di foto: niente testo, ma c'è.
  assert.deepEqual(daRiga({ mi_piace: 0, commenti: 1, ultimo_nome: 'Ale', ultimo_testo: '', ultimo_foto: true }).ultimo, {
    nome: 'Ale',
    testo: '',
    foto: true,
  })
})

test('conMiPiace: il cuore si accende e si spegne contando giusto', () => {
  const acceso = conMiPiace({ ...NESSUNA, miPiace: 4 }, true)
  assert.equal(acceso.mio, true)
  assert.equal(acceso.miPiace, 5)
  const spento = conMiPiace(acceso, false)
  assert.equal(spento.mio, false)
  assert.equal(spento.miPiace, 4)
  // Premere di nuovo lo stesso stato non conta due volte.
  assert.equal(conMiPiace(acceso, true), acceso)
  // Mai sotto zero, anche con un conteggio sballato.
  assert.equal(conMiPiace({ ...NESSUNA, mio: true, miPiace: 0 }, false).miPiace, 0)
  // Senza niente di prima si parte da zero.
  assert.equal(conMiPiace(undefined, true).miPiace, 1)
})

test('commentoValido: testo o foto, ma non vuoto e non infinito', () => {
  assert.equal(commentoValido('  ', null), false)
  assert.equal(commentoValido('bravo', null), true)
  assert.equal(commentoValido('', { name: 'foto.jpg' }), true)
  assert.equal(commentoValido('x'.repeat(2001), null), false)
})
