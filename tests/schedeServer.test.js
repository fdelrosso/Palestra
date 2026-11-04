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

const { vociDaRigheSchede } = await import('../src/lib/schedeServer.js')

const workout = (nome) => ({ id: 'g' + nome, tipo: 'workout', nome, esercizi: [{ id: 'e' + nome, nome: 'Panca' }] })
const riga = (id, user_id, giorni, extra = {}) => ({
  id, user_id, relazione_pt: 0, autore_pt: false,
  dati: { id, nome: 'Scheda ' + id, numeroSettimane: 4, giorni, ...extra },
})

test('vociDaRigheSchede: nome, relazione, allenamenti a settimana, ordine del server', () => {
  const voci = vociDaRigheSchede(
    [
      riga('b', 'u2', [workout('A'), { id: 'r', tipo: 'rest' }, workout('B')], { }),
      { ...riga('a', 'u1', [workout('A')]), relazione_pt: 2, autore_pt: true },
    ],
    new Map([['u1', 'Uno']]),
  )
  assert.deepEqual(voci.map((v) => v.scheda.id), ['b', 'a'])
  assert.equal(voci[0].utenteNome, '')
  assert.equal(voci[0].numAllenamenti, 2)
  assert.equal(voci[1].utenteNome, 'Uno')
  assert.equal(voci[1].relazionePt, 2)
  assert.equal(voci[1].autoreEPt, true)
  assert.equal(vociDaRigheSchede(null, new Map()).length, 0)
})
