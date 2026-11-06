import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        // Il client di Supabase vuole Vite: qui non serve.
        if (spec === './supabase') return { url: 'data:text/javascript,export const supabase = {}', shortCircuit: true }
        try { return await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) return next(spec + '.js', ctx)
          throw e
        }
      }`),
)
const { frase } = await import('../supabase/functions/invia-push/frase.js')
const { percorsoValido, pushDisponibile, avviaPush, chiediPush } = await import('../src/lib/push.js')

test('la frase: una persona, due, tante, e i commenti', () => {
  assert.equal(frase({ tipo: 'mi_piace', nomi: ['Ale'], persone: 1, quanti: 1 }), 'Ale ha messo mi piace')
  assert.equal(frase({ tipo: 'mi_piace', nomi: ['Ale', 'Bea'], persone: 2, quanti: 2 }), 'Ale e Bea hanno messo mi piace')
  assert.equal(frase({ tipo: 'mi_piace', nomi: ['Ale', 'Bea', 'Cri'], persone: 10, quanti: 10 }), 'Ale, Bea e altri 8 hanno messo mi piace')
  assert.equal(frase({ tipo: 'commento', nomi: ['Ale'], persone: 1, quanti: 3 }), 'Ale ha commentato (3 commenti)')
})

test('da una notifica si va solo dentro l’app', () => {
  assert.ok(percorsoValido('/notifiche'))
  for (const p of ['https://sito-cattivo.it', '//sito-cattivo.it', 'javascript:alert(1)', '', null, undefined, 3]) {
    assert.equal(percorsoValido(p), false, String(p))
  }
})

test('nel browser le push non ci sono, e non si chiede nessun permesso', async () => {
  assert.equal(pushDisponibile(), false)
  await avviaPush()
  assert.equal(await chiediPush(), false)
})
