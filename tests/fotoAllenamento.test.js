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

const { chiaveAllenamento, dividiFoto, percorsoFotoAllenamento } = await import('../src/lib/fotoAllenamento.js')
const { riepilogoSessione } = await import('../src/lib/session.js')

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

// La chiave di un allenamento (106ª): il suo id, che non dipende dalla data.
test('la chiave è l’id, e correggere la data non la cambia', () => {
  const c = { id: 'a1', schedaId: 's1', data: '2026-10-01T11:00:00.000Z' }
  assert.equal(chiaveAllenamento(c), 'a1')
  assert.equal(chiaveAllenamento({ ...c, data: '2026-09-30T18:00:00.000Z' }), 'a1')
})

test('senza id (copia locale di prima) vale la chiave vecchia', () => {
  assert.equal(chiaveAllenamento({ schedaId: 's1', data: '2026-10-01T11:00:00.000Z' }), 's1|2026-10-01T11:00:00.000Z')
})

test('un allenamento nuovo nasce con un id; uno ripreso tiene il suo', () => {
  const sessione = { schedaId: 's1', giornoId: 'g1', settimana: 1, inizio: '2026-10-01T10:00:00.000Z', esercizi: [] }
  const nuovo = riepilogoSessione(sessione, '2026-10-01T11:00:00.000Z')
  assert.ok(nuovo.id && !nuovo.id.includes('|'))
  const ripreso = riepilogoSessione({ ...sessione, idAllenamento: nuovo.id }, '2026-10-01T11:20:00.000Z')
  assert.equal(ripreso.id, nuovo.id)
})
