import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come media.test.js: loader che aggiunge `.js` e sostituisce lib/supabase con
// un finto Storage. `__file` e' { bucket: Set(percorsi) }; i percorsi in
// `__bloccati` si elencano ma non si cancellano, come quando una regola dice no.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = {
          storage: {
            from: (bucket) => ({
              list: async (cartella, { limit, offset }) => {
                const tutti = [...(globalThis.__file[bucket] || [])]
                  .filter((p) => p.startsWith(cartella + '/'))
                  .map((p) => ({ name: p.slice(cartella.length + 1), created_at: globalThis.__creato[p] || '2026-01-01T00:00:00Z' }))
                return { data: tutti.slice(offset || 0, (offset || 0) + limit), error: null }
              },
              remove: async (percorsi) => {
                const tolti = percorsi.filter((p) => !globalThis.__bloccati.has(p))
                tolti.forEach((p) => globalThis.__file[bucket].delete(p))
                return { data: tolti.map((name) => ({ name })), error: null }
              },
            }),
          },
          // Le righe: __righe e' { tabella: [riga] }. Basta quello che usano
          // eliminaOrfani (select/eq/in) e pulisciScaduti (select/lte, delete/in).
          from: (tabella) => {
            const righe = () => globalThis.__righe[tabella] || []
            const filtro = (tieni) => ({
              eq: (c, v) => filtro((r) => tieni(r) && r[c] === v),
              in: async (c, vv) => ({ data: righe().filter((r) => tieni(r) && vv.includes(r[c])), error: null }),
              lte: async (c, v) => ({ data: righe().filter((r) => tieni(r) && r[c] <= v), error: null }),
            })
            return {
              select: () => filtro(() => true),
              delete: () => ({
                in: async (c, vv) => {
                  globalThis.__righe[tabella] = righe().filter((r) => !vv.includes(r[c]))
                  return { error: null }
                },
              }),
            }
          },
        }
        export function messaggioErrore(e) { return e?.message || '' }
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

const { eliminaFileUtente, eliminaOrfani } = await import('../src/lib/fileUtente.js')
const { pulisciScaduti } = await import('../src/lib/effimeri.js')

function azzera() {
  globalThis.__file = {}
  globalThis.__bloccati = new Set()
  globalThis.__righe = {}
  globalThis.__creato = {}
}

test('toglie tutti i file dell\'utente, anche oltre una pagina, e solo i suoi', async () => {
  const molti = Array.from({ length: 2500 }, (_, i) => `io/${i}`)
  azzera()
  globalThis.__file = {
    progressi: new Set([...molti, 'altro/1']),
    avatar: new Set(['io/a.jpg']),
  }
  assert.deepEqual(await eliminaFileUtente('io'), { ok: true })
  assert.deepEqual([...globalThis.__file.progressi], ['altro/1'])
  assert.equal(globalThis.__file.avatar.size, 0)
})

test('se un file non si lascia togliere si ferma, invece di girare all\'infinito', async () => {
  azzera()
  globalThis.__file = { media: new Set(['io/1', 'io/2']) }
  globalThis.__bloccati = new Set(['io/2'])
  const esito = await eliminaFileUtente('io')
  assert.equal(esito.ok, false)
  assert.match(esito.errore, /media/)
})

test('toglie i file senza riga vecchi di un giorno, non quelli vivi né quelli appena caricati', async () => {
  azzera()
  const ora = Date.parse('2026-10-22T12:00:00Z')
  globalThis.__file = {
    media: new Set(['io/vivo', 'io/avanzo', 'io/appena']),
    effimeri: new Set(['io/scaduto-senza-riga']),
  }
  globalThis.__creato = { 'io/appena': '2026-10-22T11:00:00Z' }
  globalThis.__righe = { media: [{ user_id: 'io', percorso: 'io/vivo' }], effimeri: [] }
  assert.equal(await eliminaOrfani('io', ora), 2)
  assert.deepEqual([...globalThis.__file.media].sort(), ['io/appena', 'io/vivo'])
  assert.equal(globalThis.__file.effimeri.size, 0)
})

test('pulisciScaduti toglie la riga solo se il file se n\'è andato davvero', async () => {
  azzera()
  globalThis.__file = { effimeri: new Set(['amico/a', 'amico/b']) }
  // Il file di `b` non si lascia togliere (chi pulisce l'ha ricevuto, non mandato).
  globalThis.__bloccati = new Set(['amico/b'])
  globalThis.__righe = {
    effimeri: [
      { id: 'a', da_id: 'amico', consumato: false, scade_il: '2026-01-01T00:00:00Z' },
      { id: 'b', da_id: 'amico', consumato: false, scade_il: '2026-01-01T00:00:00Z' },
      { id: 'c', da_id: 'amico', consumato: true, scade_il: '2026-01-01T00:00:00Z' },
    ],
  }
  assert.equal(await pulisciScaduti(), 2)
  assert.deepEqual(globalThis.__righe.effimeri.map((r) => r.id), ['b'])
})
