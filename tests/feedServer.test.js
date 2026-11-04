import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come fotoAllenamento.test.js: un loader aggiunge `.js` e sostituisce
// `src/lib/supabase.js` (legge `import.meta.env`) con un finto client.
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

const { serveAltraPagina, vociDaRighe, vociProprie } = await import('../src/lib/feedServer.js')

const riga = (id, data, user_id = 'u1', extra = {}) => ({
  id, user_id, scheda_id: 's1', data, relazione_pt: 0,
  dati: { id, data, nomeGiorno: 'Giorno A', esercizi: [], ...extra },
})

test('vociDaRighe: nomi, username e chiave come voceStorico', () => {
  const voci = vociDaRighe(
    [riga('a1', '2026-11-03T10:00:00Z'), riga('a2', '2026-11-02T10:00:00Z', 'u2')],
    new Map([['u1', 'Uno'], ['u2', 'Due']]),
    new Map([['u1', 'uno']]),
  )
  assert.equal(voci.length, 2)
  assert.equal(voci[0].utenteNome, 'Uno')
  assert.equal(voci[0].utenteUsername, 'uno')
  assert.equal(voci[1].utenteUsername, '')
  assert.equal(voci[0].schedaId, 's1')
  assert.equal(voci[0].id, 'a1')
})

test('serveAltraPagina: sotto soglia, con pagine e sotto il massimo', () => {
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 1, ancora: true }), true)
  assert.equal(serveAltraPagina({ visibili: 10, pagineLette: 1, ancora: true }), false)
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 1, ancora: false }), false)
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 5, ancora: true }), false)
})

test('vociProprie: tutte le schede, nascosti compresi, dal più recente', () => {
  const schede = [
    { id: 's1', completamenti: [{ data: '2026-11-01T10:00:00Z', visibilita: 'nascosta' }] },
    { id: 's2', completamenti: [{ data: '2026-11-03T10:00:00Z', visibilita: 'pubblica' }] },
  ]
  const voci = vociProprie(schede, { id: 'me', nome: 'Io', username: 'io' })
  assert.deepEqual(voci.map((v) => v.schedaId), ['s2', 's1'])
  assert.equal(voci[0].utenteId, 'me')
  assert.ok(voci[1].id, 'ogni voce ha la sua chiave')
})
