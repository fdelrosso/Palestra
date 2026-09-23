import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) return next(spec + '.js', ctx)
          throw e
        }
      }`),
)

const { alternaGruppo, gruppiEsercizio, gruppiScritti, patchGruppi } = await import(
  '../src/lib/eserciziLibreria.js'
)
const { gruppiAllenati } = await import('../src/lib/recap.js')
const { gruppiDi, filtraFeed } = await import('../src/lib/feed.js')

const serie = (n) => Array.from({ length: n }, () => ({ colore: 'verde' }))

// ---------------------------------------------------------- quali gruppi
test('i gruppi scritti vincono su tutto', () => {
  assert.deepEqual(gruppiEsercizio({ nome: 'Dip', gruppo: 'petto', gruppi: ['petto', 'tricipiti'] }), [
    'petto',
    'tricipiti',
  ])
})

test('senza elenco vale il vecchio gruppo: le schede di prima non cambiano', () => {
  assert.deepEqual(gruppiEsercizio({ nome: 'Qualcosa', gruppo: 'spalle' }), ['spalle'])
  assert.deepEqual(gruppiEsercizio({ nome: 'Qualcosa', gruppo: 'spalle', gruppi: [] }), ['spalle'])
})

test('senza niente di scritto si indovina dal nome, e UN gruppo solo', () => {
  assert.deepEqual(gruppiEsercizio({ nome: 'Panca piana con bilanciere' }), ['petto'])
})

test('id sconosciuti e doppioni si scartano', () => {
  assert.deepEqual(gruppiEsercizio({ gruppi: ['petto', 'boh', 'petto', 'tricipiti'] }), [
    'petto',
    'tricipiti',
  ])
})

test('nell’editor si vedono solo quelli scritti, non le ipotesi', () => {
  // ⚠️ Un gruppo acceso che nel salvataggio non c'è farebbe credere di averlo
  // già scelto.
  assert.deepEqual(gruppiScritti({ nome: 'Panca piana con bilanciere' }), [])
  assert.deepEqual(gruppiScritti({ gruppo: 'petto' }), ['petto'])
})

// ------------------------------------------------------------ scriverli
test('il principale resta allineato al primo dell’elenco', () => {
  assert.deepEqual(patchGruppi(['tricipiti', 'petto']), {
    gruppi: ['tricipiti', 'petto'],
    gruppo: 'tricipiti',
  })
  assert.deepEqual(patchGruppi([]), { gruppi: [], gruppo: '' })
})

test('toccare un gruppo lo accende o lo spegne, e l’ordine è quello dei tocchi', () => {
  let g = []
  g = alternaGruppo(g, 'petto')
  g = alternaGruppo(g, 'tricipiti')
  assert.deepEqual(g, ['petto', 'tricipiti'])
  // Spegnere il principale promuove il secondo.
  g = alternaGruppo(g, 'petto')
  assert.deepEqual(patchGruppi(g).gruppo, 'tricipiti')
})

// ------------------------------------------------------ il recap e il feed
test('i dip accendono petto E tricipiti, con le stesse serie', () => {
  // ⚠️ Il difetto da cui nasce tutto: un gruppo solo per esercizio, e il recap
  // di un allenamento di dip lasciava spenti i tricipiti.
  const g = gruppiAllenati([{ nome: 'Dip', gruppi: ['petto', 'tricipiti'], sets: serie(3) }])
  const per = Object.fromEntries(g.map((x) => [x.id, x.serie]))
  assert.deepEqual(per, { petto: 3, tricipiti: 3 })
})

test('le serie si sommano per muscolo fra esercizi diversi', () => {
  const g = gruppiAllenati([
    { nome: 'Dip', gruppi: ['petto', 'tricipiti'], sets: serie(3) },
    { nome: 'French press', gruppi: ['tricipiti'], sets: serie(4) },
  ])
  const per = Object.fromEntries(g.map((x) => [x.id, x.serie]))
  assert.equal(per.tricipiti, 7)
  assert.equal(per.petto, 3)
  // Dal più lavorato.
  assert.equal(g[0].id, 'tricipiti')
})

test('il filtro del feed trova i dip cercando i tricipiti', () => {
  const voce = { utenteId: 'u', esercizi: [{ nome: 'Dip', gruppo: 'petto', gruppi: ['petto', 'tricipiti'] }] }
  assert.ok(gruppiDi(voce).has('tricipiti'))
  assert.equal(filtraFeed([voce], { gruppi: ['tricipiti'] }).length, 1)
})
