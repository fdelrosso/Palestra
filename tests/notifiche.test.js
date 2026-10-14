import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// `src/lib/supabase.js` legge `import.meta.env`, che fuori da Vite non esiste:
// al suo posto entra un finto client. Qui non serve che faccia niente: si
// provano le parole delle notifiche, che il database non decide.
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

const { chiInParole, contaNuove, daRiga, fraseNotifica } = await import('../src/lib/notifiche.js')

const riga = (x) =>
  daRiga({ allenamento_key: 's|2026-10-14T10:00:00.000Z', tipo: 'mi_piace', quanti: 1, persone: 1, nuovi: 0, nomi: ['Ale'], ...x })

test('chi: uno, due, tanti', () => {
  assert.equal(chiInParole(['Ale'], 1), 'Ale')
  assert.equal(chiInParole(['Ale', 'Bea'], 2), 'Ale e Bea')
  assert.equal(chiInParole(['Ale', 'Bea', 'Ciro'], 3), 'Ale, Bea e un altro')
  assert.equal(chiInParole(['Ale', 'Bea', 'Ciro'], 7), 'Ale, Bea e altri 5')
})

test('più mi piace allo stesso allenamento sono una frase sola', () => {
  assert.equal(fraseNotifica(riga({})), 'Ale ha messo mi piace')
  assert.equal(fraseNotifica(riga({ persone: 4, quanti: 4, nomi: ['Ale', 'Bea', 'Ciro'] })), 'Ale, Bea e altri 2 hanno messo mi piace')
})

test('commenti: chi e quanti, anche se è uno solo a commentare tre volte', () => {
  assert.equal(fraseNotifica(riga({ tipo: 'commento', quanti: 3, persone: 1 })), 'Ale ha commentato (3 commenti)')
  assert.equal(fraseNotifica(riga({ tipo: 'commento', quanti: 2, persone: 2, nomi: ['Ale', 'Bea'] })), 'Ale e Bea hanno commentato (2 commenti)')
})

test('il numero rosso somma i nuovi di tutte le notifiche', () => {
  assert.equal(contaNuove([riga({ nuovi: 2 }), riga({ tipo: 'commento', nuovi: 1 }), riga({})]), 3)
})
