import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
//
// ⚠️ E come in progressi.test.js, `src/lib/supabase.js` va sostituito: legge
// `import.meta.env`, che fuori da Vite non esiste. Il finto client qui si segna
// anche le OPZIONI passate a `upload`, perché è lì che sta la cosa da sorvegliare.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        globalThis.__upload = []
        export const supabase = {
          storage: {
            from: (bucket) => ({
              upload: async (percorso, blob, opzioni) => {
                globalThis.__upload.push({ bucket, percorso, opzioni })
                return { error: globalThis.__erroreUpload || null }
              },
            }),
          },
          from: () => ({ upsert: async () => ({ error: null }) }),
        }
        export function erroreDiRete(e) { return !!(e && e.diRete) }
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

const { caricaFile, percorsoMedia } = await import('../src/lib/media.js')

function azzera() {
  globalThis.__upload = []
  globalThis.__erroreUpload = null
}

const blob = { size: 10, type: 'image/jpeg' }

// ---------------------------------------------------------------- il percorso
test('la cartella di un media è chi l\'ha caricato', () => {
  assert.equal(percorsoMedia('autore-1', 'media-9'), 'autore-1/media-9')
})

// ------------------------------------------------------------- niente upsert
// ⚠️ LA PROVA CHE CONTA. Con `upsert: true` lo Storage non fa un insert ma un
// insert-or-update su `storage.objects`, che pretende una policy di UPDATE che
// nessun bucket del progetto ha — e che non vogliamo, perché lascerebbe
// riscrivere il contenuto di un file altrui lasciando intatta la riga.
// Quel flag è rimasto qui dentro per mesi e ha reso gli allegati degli esercizi
// silenziosamente inutili: il file restava in locale e sembrava tutto a posto.
test('il file non si manda mai con upsert', async () => {
  azzera()
  await caricaFile('media', 'autore-1/media-9', blob)
  const opzioni = globalThis.__upload[0].opzioni || {}
  assert.notEqual(opzioni.upsert, true)
  assert.equal(globalThis.__upload[0].bucket, 'media')
})

test('un caricamento riuscito è ok e non porta errori', async () => {
  azzera()
  const esito = await caricaFile('media', 'autore-1/media-9', blob)
  assert.deepEqual(esito, { ok: true, errore: null, diRete: false })
})

// ------------------------------------------------------- il percorso occupato
// Senza upsert, un riprova dopo un caricamento andato a metà (file su, riga no)
// ritrova il percorso occupato. È lo stato che volevamo, non un errore: gli id
// sono UUID, quindi un conflitto VERO non può esistere.
test('un 409 sul percorso vale come riuscito', async () => {
  azzera()
  globalThis.__erroreUpload = { statusCode: '409', message: 'Duplicate' }
  const esito = await caricaFile('media', 'autore-1/media-9', blob)
  assert.equal(esito.ok, true)
  assert.equal(esito.errore, null)
})

test('anche il messaggio "already exists" vale come riuscito', async () => {
  azzera()
  globalThis.__erroreUpload = { message: 'The resource already exists' }
  const esito = await caricaFile('media', 'autore-1/media-9', blob)
  assert.equal(esito.ok, true)
})

// ------------------------------------------------------------ i rifiuti veri
test('un rifiuto vero resta un rifiuto, e l\'errore si vede', async () => {
  azzera()
  globalThis.__erroreUpload = { message: 'new row violates row-level security policy' }
  const esito = await caricaFile('media', 'autore-1/media-9', blob)
  assert.equal(esito.ok, false)
  assert.match(esito.errore.message, /row-level security/)
  assert.equal(esito.diRete, false)
})

test('la rete caduta si distingue dal rifiuto del server', async () => {
  azzera()
  globalThis.__erroreUpload = { message: 'Failed to fetch', diRete: true }
  const esito = await caricaFile('media', 'autore-1/media-9', blob)
  assert.equal(esito.ok, false)
  // ⚠️ È la differenza su cui l'app decide cosa dire all'utente: "non è
  // partito" non è "il server ha detto di no".
  assert.equal(esito.diRete, true)
})
