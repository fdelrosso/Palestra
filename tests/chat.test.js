import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// `src/lib/supabase.js` legge `import.meta.env`, che fuori da Vite non esiste:
// al suo posto entra un finto client. Qui non serve che faccia niente — si
// provano le due funzioni pure, che sono quelle che possono sbagliare in
// silenzio.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = { from: () => ({}), channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }), rpc: async () => ({ data: null, error: null }) }
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

const { coppiaDi, testoValido } = await import('../src/lib/chat.js')

// --------------------------------------------------------------- la coppia
// ⚠️ Queste sorvegliano la cosa piu' facile da rompere di tutta la chat: la
// chiave di conversazione calcolata qui deve dare lo STESSO risultato della
// colonna generata `coppia` sul database (supabase/schema.sql). Se le due
// divergono, la conversazione si legge VUOTA mentre i messaggi ci sono — e non
// somiglia per niente a un errore di chiave, somiglia a "la chat non funziona".
test('la coppia non dipende da chi scrive', () => {
  assert.equal(coppiaDi('aaa', 'bbb'), coppiaDi('bbb', 'aaa'))
})

test('la coppia mette sempre prima il minore, come fa il database', () => {
  // Il database fa `case when da_id < a_id then da||'|'||a else a||'|'||da end`.
  assert.equal(coppiaDi('aaa', 'bbb'), 'aaa|bbb')
  assert.equal(coppiaDi('bbb', 'aaa'), 'aaa|bbb')
})

test('il confronto e fra testi, come sul database', () => {
  // Due uuid veri: l'ordine deve essere quello alfabetico della stringa.
  const a = '0e49ca4f-0000-4000-8000-000000000000'
  const b = 'ee78b311-4cb5-478d-a742-21d33e73b882'
  assert.equal(coppiaDi(a, b), `${a}|${b}`)
  assert.equal(coppiaDi(b, a), `${a}|${b}`)
})

test('due coppie diverse non si confondono', () => {
  assert.notEqual(coppiaDi('aaa', 'bbb'), coppiaDi('aaa', 'ccc'))
})

// ---------------------------------------------------------------- il testo
test('uno spazio non e un messaggio', () => {
  assert.equal(testoValido(''), false)
  assert.equal(testoValido('   '), false)
  assert.equal(testoValido('\n\t '), false)
  assert.equal(testoValido(null), false)
})

test('un messaggio vero passa', () => {
  assert.equal(testoValido('ciao'), true)
  assert.equal(testoValido('  ciao  '), true)
})

test('oltre il limite del database non si manda', () => {
  // ⚠️ 4000 e' il `check` sulla colonna: se qui passasse, l'invio fallirebbe
  // sul server con un errore che non dice niente a chi ha scritto.
  assert.equal(testoValido('a'.repeat(4000)), true)
  assert.equal(testoValido('a'.repeat(4001)), false)
})
