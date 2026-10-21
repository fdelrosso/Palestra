import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Sfondo del recap e allegati (lib/fotoAllenamento, `dividiFoto`). Come in
// media.test.js: un loader aggiunge `.js` e `src/lib/supabase.js` (che legge
// `import.meta.env`) si sostituisce con un finto client.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = {}
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

const { dividiFoto, percorsoFotoAllenamento } = await import('../src/lib/fotoAllenamento.js')

const foto = [
  { id: 'a', tipo: 'foto' },
  { id: 'b', tipo: 'video' },
  { id: 'c', tipo: 'foto' },
]

test('senza sfondo scelto, tutte le foto sono allegati (nessuna fa da sfondo da sola)', () => {
  const { sfondo, allegati } = dividiFoto({}, foto)
  assert.equal(sfondo, null)
  assert.deepEqual(allegati.map((f) => f.id), ['a', 'b', 'c'])
})

test('lo sfondo scelto nel recap non compare fra gli allegati', () => {
  const { sfondo, allegati } = dividiFoto({ sfondo: 'c' }, foto)
  assert.equal(sfondo.id, 'c')
  assert.deepEqual(allegati.map((f) => f.id), ['a', 'b'])
})

test('uno sfondo che non si vede (privato, non ancora caricato) non diventa un allegato', () => {
  const { sfondo, allegati } = dividiFoto({ sfondo: 'z' }, foto)
  assert.equal(sfondo, null)
  assert.deepEqual(allegati.map((f) => f.id), ['a', 'b', 'c'])
  const senza = dividiFoto({ sfondo: 'a' }, foto.slice(1))
  assert.equal(senza.sfondo, null)
  assert.equal(senza.allegati.length, 2)
})

test('un video allegato non fa da sfondo, uno spezzone fatto apposta sì', () => {
  assert.equal(dividiFoto({ sfondo: 'b' }, foto).sfondo, null)
  const spezzone = { id: 's', tipo: 'video', nome: 'sfondo-video.mp4' }
  const { sfondo, allegati } = dividiFoto({ sfondo: 's' }, [...foto, spezzone])
  assert.equal(sfondo, spezzone)
  assert.ok(!allegati.includes(spezzone))
})

test('il file dello sfondo sta nella cartella di chi l’ha caricato', () => {
  assert.equal(percorsoFotoAllenamento('u1', 'f9'), 'u1/f9')
})
