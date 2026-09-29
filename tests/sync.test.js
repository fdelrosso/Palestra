import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione, e
// `src/lib/supabase.js` va sostituito (legge `import.meta.env`). Qui il finto
// client è un finto SERVER: tiene le righe, e può perdere la rete, rispondere in
// ritardo o non rispondere affatto — le tre cose che in palestra succedono.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        globalThis.__server = new Map()
        globalThis.__arrivi = []
        globalThis.__rete = { scritture: 'ok', letture: 'ok' }
        globalThis.__ritardo = () => 0
        globalThis.__tabelleAssenti = new Set()
        const giu = { error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 }
        const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
        function righe(tabella) {
          if (!__server.has(tabella)) __server.set(tabella, new Map())
          return __server.get(tabella)
        }
        function scrittura(tabella, op, riga, chiave) {
          return {
            then(ok, ko) {
              return (async () => {
                if (__rete.scritture === 'appesa') return new Promise((r) => { globalThis.__sblocca = () => r(giu) })
                await pausa(__ritardo({ tabella, op, riga }))
                if (__rete.scritture === 'giu') return giu
                if (__tabelleAssenti.has(tabella)) return { error: { code: 'PGRST205', message: 'no table' }, status: 404 }
                if (op === 'delete') righe(tabella).delete(chiave)
                else righe(tabella).set(chiave, riga)
                __arrivi.push({ tabella, op, dati: riga?.dati })
                return { error: null, status: 201 }
              })().then(ok, ko)
            },
          }
        }
        function lettura(tabella, filtri, singola) {
          return {
            maybeSingle: () => lettura(tabella, filtri, true),
            eq(col, v) { return lettura(tabella, { ...filtri, [col]: v }, singola) },
            then(ok, ko) {
              return (async () => {
                if (__rete.letture === 'giu') return { data: null, ...giu }
                const tutte = [...righe(tabella).values()].filter((r) => r.user_id === filtri.user_id)
                return { data: singola ? tutte[0] || null : tutte, error: null, status: 200 }
              })().then(ok, ko)
            },
          }
        }
        export const supabase = {
          from: (tabella) => ({
            upsert: (riga) => scrittura(tabella, 'upsert', riga, riga.id ?? riga.user_id),
            delete: () => ({ eq: (_c, id) => ({ eq: () => scrittura(tabella, 'delete', null, id) }) }),
            select: () => lettura(tabella, {}, false),
          }),
        }
        export function erroreDiRete(e) { return /failed to fetch/i.test(String(e?.message)) }
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

if (typeof globalThis.localStorage === 'undefined') {
  const dati = new Map()
  globalThis.localStorage = {
    getItem: (k) => (dati.has(k) ? dati.get(k) : null),
    setItem: (k, v) => dati.set(k, String(v)),
    removeItem: (k) => dati.delete(k),
  }
}

const sync = await import('../src/lib/sync.js')
const { codaSospesa, dopoLaCoda, leggiCollezione, leggiSingolo, riprovaCoda } = sync
const { sincronizzaCollezione, sincronizzaSingolo, svuotaCoda } = sync

const IO = 'utente-1'
const sessione = (fatte) => ({ schedaId: 's1', inizio: '2026-09-29T18:00:00Z', fatte })
const sulServer = (tabella, chiave) => globalThis.__server.get(tabella)?.get(chiave)?.dati

function daCapo() {
  svuotaCoda()
  globalThis.__server.clear()
  globalThis.__arrivi.length = 0
  globalThis.__rete.scritture = 'ok'
  globalThis.__rete.letture = 'ok'
  globalThis.__ritardo = () => 0
  globalThis.__tabelleAssenti.clear()
}

test('una serie rimasta in coda non riapre un allenamento terminato', async () => {
  daCapo()
  await sincronizzaSingolo('sessione', IO, sessione(3))
  // In palestra la rete va via per un attimo: la serie non parte.
  globalThis.__rete.scritture = 'giu'
  await sincronizzaSingolo('sessione', IO, sessione(4))
  // Torna, e il "Termina" arriva.
  globalThis.__rete.scritture = 'ok'
  await sincronizzaSingolo('sessione', IO, null)
  assert.equal(sulServer('sessione', IO), null)
  assert.deepEqual(codaSospesa(), [], 'la serie vecchia non deve restare in coda')

  // Riapertura dell'app: prima la coda, poi la lettura.
  const letta = await dopoLaCoda(() => leggiSingolo('sessione', IO))
  assert.equal(letta, null)
  assert.equal(sulServer('sessione', IO), null)
})

test('un Termina che non torna mai resta in coda e arriva alla riapertura', async () => {
  daCapo()
  await sincronizzaSingolo('sessione', IO, sessione(5))
  // Rete che non risponde né sì né no, e l'app viene chiusa lì.
  globalThis.__rete.scritture = 'appesa'
  sincronizzaSingolo('sessione', IO, null)
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(codaSospesa().length, 1, 'il Termina deve stare in coda PRIMA di partire')

  // L'app riparte: modulo nuovo (la fila di prima è rimasta appesa), stesso telefono.
  globalThis.__rete.scritture = 'ok'
  const riaperta = await import('../src/lib/sync.js?riapertura')
  const letta = await riaperta.dopoLaCoda(() => riaperta.leggiSingolo('sessione', IO))
  assert.equal(letta, null)
  assert.equal(sulServer('sessione', IO), null)
  assert.deepEqual(codaSospesa(), [])
  // La richiesta di prima, se mai torna, torna come rete assente.
  globalThis.__sblocca()
  await riprovaCoda()
})

test('se il Termina non riesce a partire, la lettura dal server non riapre la sessione', async () => {
  daCapo()
  await sincronizzaSingolo('sessione', IO, sessione(5))
  globalThis.__rete.scritture = 'giu'
  await sincronizzaSingolo('sessione', IO, null)
  // Il server ha ancora la sessione aperta, ma quello che è in coda è più nuovo.
  assert.deepEqual(sulServer('sessione', IO), sessione(5))
  assert.equal(await leggiSingolo('sessione', IO), null)
})

test("in fila: l'ultima scritta è l'ultima che arriva", async () => {
  daCapo()
  // La serie parte lenta, il Termina subito dopo parte veloce.
  globalThis.__ritardo = ({ riga }) => (riga?.dati ? 40 : 0)
  sincronizzaSingolo('sessione', IO, sessione(6))
  await new Promise((r) => setTimeout(r, 5))
  sincronizzaSingolo('sessione', IO, null)
  await riprovaCoda()
  assert.equal(sulServer('sessione', IO), null)
})

test('collezioni: una versione vecchia in coda non torna sopra una nuova', async () => {
  daCapo()
  const v1 = { id: 'sc1', nome: 'Scheda', completamenti: [] }
  const v2 = { ...v1, completamenti: [{ data: '2026-09-29T19:00:00Z' }] }
  globalThis.__rete.scritture = 'giu'
  const ist = await sincronizzaCollezione('schede', IO, [v1], new Map())
  await riprovaCoda()
  globalThis.__rete.scritture = 'ok'
  await sincronizzaCollezione('schede', IO, [v2], ist)
  await riprovaCoda()
  assert.deepEqual(sulServer('schede', 'sc1'), v2)
  assert.deepEqual(codaSospesa(), [])
})

test('collezioni: la lettura rimette sopra quello che è ancora in coda', async () => {
  daCapo()
  const a = { id: 'a', nome: 'A' }
  const b = { id: 'b', nome: 'B' }
  let ist = await sincronizzaCollezione('schede', IO, [a, b], new Map())
  await riprovaCoda()
  globalThis.__rete.scritture = 'giu'
  // B cancellata e A cambiata, senza rete.
  ist = await sincronizzaCollezione('schede', IO, [{ ...a, nome: 'A2' }], ist)
  await riprovaCoda()
  const lette = await leggiCollezione('schede', IO)
  assert.deepEqual(lette, [{ id: 'a', nome: 'A2' }])
})

test('un no del server non ferma le altre righe, una rete assente sì', async () => {
  daCapo()
  globalThis.__tabelleAssenti.add('diario')
  await sincronizzaCollezione('diario', IO, [{ id: '2026-09-29', voci: [] }], new Map())
  await sincronizzaSingolo('sessione', IO, null)
  assert.equal(sulServer('sessione', IO), null)
  assert.equal(codaSospesa().length, 1)
  assert.equal(codaSospesa()[0].tabella, 'diario')

  // Senza rete si prova la prima e ci si ferma.
  globalThis.__rete.scritture = 'giu'
  await sincronizzaSingolo('preferenze', IO, { cibi: [] })
  const prima = globalThis.__arrivi.length
  assert.equal(await riprovaCoda(), 2)
  assert.equal(globalThis.__arrivi.length, prima)
})
