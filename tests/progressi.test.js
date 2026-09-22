import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
//
// ⚠️ In più, qui, `src/lib/supabase.js` va SOSTITUITO. Quel file legge
// `import.meta.env`, che esiste solo dentro Vite: in Node è `undefined` e
// l'import esploderebbe prima ancora di arrivare alla prima assert. Al suo
// posto entra un finto client che si limita a segnarsi cosa gli è stato
// chiesto — che è anche l'unico modo per provare le due regole che contano:
// dove finisce il file, e con quale visibilità nasce la riga.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        globalThis.__chiamate = { upload: [], righe: [] }
        export const supabase = {
          storage: {
            from: () => ({
              upload: async (percorso) => {
                globalThis.__chiamate.upload.push(percorso)
                return { error: globalThis.__erroreUpload || null }
              },
            }),
          },
          from: () => ({
            upsert: async (riga) => {
              globalThis.__chiamate.righe.push(riga)
              return { error: null }
            },
          }),
        }
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

// Node non ha `localStorage`, e la coda dei sospesi lo usa. Il try/catch dentro
// lib/progressi regge benissimo, ma stampa uno stack per ogni salvataggio e
// l'output della prova diventa illeggibile. Un magazzino finto in memoria è
// anche più onesto: la coda si comporta come sul telefono.
if (typeof globalThis.localStorage === 'undefined') {
  const dati = new Map()
  globalThis.localStorage = {
    getItem: (k) => (dati.has(k) ? dati.get(k) : null),
    setItem: (k, v) => dati.set(k, String(v)),
    removeItem: (k) => dati.delete(k),
  }
}

const {
  VISIBILITA_FOTO,
  VISIBILITA_FOTO_DEFAULT,
  giornoLungo,
  oggiIso,
  perGiorno,
  percorsoProgresso,
  salvaProgresso,
} = await import('../src/lib/progressi.js')

const chiamate = () => globalThis.__chiamate

// ⚠️ Si azzera all'INIZIO di ogni prova, non alla fine: una prova che fallisce
// non arriva mai alla fine, e lascerebbe l'errore finto acceso per quella dopo
// — che fallirebbe per un motivo che non è il suo.
function azzera() {
  globalThis.__chiamate = { upload: [], righe: [] }
  globalThis.__erroreUpload = null
}

// --------------------------------------------------------------- il percorso
test('la cartella è l\'atleta, non chi carica', () => {
  assert.equal(percorsoProgresso('atleta-1', 'scatto-9'), 'atleta-1/scatto-9')
})

// ------------------------------------------------------------- la visibilità
test('chi non sceglie non pubblica: il default è privata', () => {
  assert.equal(VISIBILITA_FOTO_DEFAULT, VISIBILITA_FOTO.PRIVATA)
  assert.equal(VISIBILITA_FOTO_DEFAULT, 'privata')
})

test('uno scatto caricato dall\'atleta nasce privato', async () => {
  azzera()
  await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'atleta-1',
    nome: 'check.jpg',
    data: '2026-03-03',
  })
  const riga = chiamate().righe[0]
  assert.equal(riga.visibilita, 'privata')
  assert.equal(riga.atleta_id, 'atleta-1')
  assert.equal(riga.caricato_da, 'atleta-1')
})

test('uno scatto caricato dal PT nasce già aperto al PT, ma nella cartella dell\'atleta', async () => {
  azzera()
  await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'pt-7',
    nome: 'check.jpg',
    data: '2026-03-03',
  })
  const riga = chiamate().righe[0]
  // Nascondere al PT una foto che ha scattato lui sarebbe teatro.
  assert.equal(riga.visibilita, 'pt')
  // Ma il padrone è l'atleta: la cartella è la sua, e resta scritto chi ha
  // premuto il pulsante.
  assert.equal(riga.atleta_id, 'atleta-1')
  assert.equal(riga.caricato_da, 'pt-7')
  assert.ok(chiamate().upload[0].startsWith('atleta-1/'))
})

test('una visibilità passata a mano vince sul default', async () => {
  azzera()
  await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'pt-7',
    visibilita: 'privata',
  })
  assert.equal(chiamate().righe[0].visibilita, 'privata')
})

// --------------------------------------------------- il file già caricato
// ⚠️ Queste due fissano un bug che è costato un pomeriggio. Il file NON si
// manda con `upsert: true`: con quel flag lo Storage fa un insert-or-update su
// `storage.objects` e pretende una policy di UPDATE che di proposito non c'è
// (darebbe al PT il potere di riscrivere il contenuto di una foto dell'atleta).
// Senza upsert, però, un riprova dopo un caricamento andato a metà ritrova il
// percorso occupato: quello è lo stato che volevamo, non un errore.
test('il percorso già occupato non blocca la riga: è il caso del riprova', async () => {
  azzera()
  globalThis.__erroreUpload = { statusCode: '409', message: 'The resource already exists' }
  const esito = await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'atleta-1',
  })
  assert.equal(esito.soloLocale, false)
  assert.equal(chiamate().righe.length, 1, 'la riga va scritta lo stesso')
})

test('un rifiuto vero dello Storage lascia lo scatto sul telefono, e lo dice', async () => {
  azzera()
  globalThis.__erroreUpload = { message: 'new row violates row-level security policy' }
  const esito = await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'atleta-1',
  })
  // Lo scatto non si annulla: il file ce l'hai, e si vede.
  assert.equal(esito.ok, true)
  assert.equal(esito.soloLocale, true)
  assert.match(esito.errore, /row-level security/)
  assert.equal(chiamate().righe.length, 0, 'senza file non si scrive la riga')
})

// ---------------------------------------------------------------- le date
test('il giorno del check parte da oggi e ha il formato della colonna', () => {
  assert.match(oggiIso(), /^\d{4}-\d{2}-\d{2}$/)
})

test('senza una data scelta si mette oggi', async () => {
  azzera()
  await salvaProgresso({
    blob: { size: 10, type: 'image/jpeg' },
    atletaId: 'atleta-1',
    caricatoDa: 'atleta-1',
  })
  assert.equal(chiamate().righe[0].data, oggiIso())
})

test('il giorno si scrive per esteso, senza passare per i fusi orari', () => {
  assert.equal(giornoLungo('2026-03-03'), '3 marzo 2026')
  assert.equal(giornoLungo('2026-12-31'), '31 dicembre 2026')
  assert.equal(giornoLungo(''), 'Senza data')
  // Una data che non capiamo si mostra com'è, invece di inventarne una.
  assert.equal(giornoLungo('boh'), 'boh')
})

// ------------------------------------------------------------ i raggruppamenti
test('gli scatti si raggruppano per giorno, dal più recente', () => {
  const giorni = perGiorno([
    { id: 'a', data: '2026-03-03' },
    { id: 'b', data: '2026-05-01' },
    { id: 'c', data: '2026-03-03' },
  ])
  assert.deepEqual(
    giorni.map((g) => g.data),
    ['2026-05-01', '2026-03-03'],
  )
  assert.deepEqual(
    giorni[1].righe.map((r) => r.id),
    ['a', 'c'],
  )
})

test('un elenco vuoto non produce gruppi', () => {
  assert.deepEqual(perGiorno([]), [])
  assert.deepEqual(perGiorno(null), [])
})
