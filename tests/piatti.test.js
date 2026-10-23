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

const { dosiScritte, macroDelPiatto } = await import('../src/lib/piatti.js')
const { trovaAlimenti } = await import('../src/lib/alimenti.js')

// Le dosi di una dieta come quelle di una dietista: il piano base del pranzo
// e lo schema, che dà la porzione di ogni categoria.
const casella = (porzione) => `${porzione}\nPasta, riso, cous cous (circa 100g) oppure 120g di pane\nUna porzione di verdura`
const DOSI = dosiScritte(
  [
    '100g di pasta/riso/farro/cous cous\noppure 120g di pane\nUna porzione di secondo piatto\n1 cucchiaio di olio',
    casella('1 porzione di legumi (220-250g cotti o 70-80g secchi)'),
    casella('1 porzione di carne bianca (180-200g)'),
    casella('1 porzione di uova (3 uova o 2 uova e 150ml di albume)'),
  ],
  [],
)
const grammi = (piatto) => Object.fromEntries(macroDelPiatto(piatto, DOSI, []).voci.map((v) => [v.alimento.id, v.grammi]))

test('trovaAlimenti: tutti gli alimenti di un pezzo, non solo il nome più lungo', () => {
  assert.deepEqual(
    trovaAlimenti('ceci al pomodoro').map((a) => a.id),
    ['ceci', 'pomodori'],
  )
  // "petto di pollo" è il pollo una volta sola.
  assert.deepEqual(trovaAlimenti('petto di pollo').map((a) => a.id), ['pollo'])
})

test('un piatto d esempio: ogni alimento con la sua dose, poi la somma', () => {
  const g = grammi('Tagliata di pollo con peperoni + riso')
  assert.equal(g.pollo, 190) // la porzione della carne bianca
  assert.equal(g.riso, 100) // "100g di pasta/riso/…": la dose del riso
  assert.equal(g.peperoni, 200) // una porzione di verdura
  assert.equal(g.olio, 10) // l'olio del pasto, che il piatto non nomina
  const m = macroDelPiatto('Tagliata di pollo con peperoni + riso', DOSI, [])
  assert.equal(m.totale.kcal, m.voci.reduce((t, v) => t + v.kcal, 0))
})

test('le alternative danno le dosi: il pane è quello del "oppure 120g di pane"', () => {
  assert.equal(grammi('Bistecca di manzo con insalata + pane').pane, 120)
})

test('due verdure si dividono una porzione, non ne fanno due', () => {
  const g = grammi('Riso con ceci al pomodoro e melanzane')
  assert.equal(g.ceci, 75)
  assert.equal(g.pomodori + g.melanzane, 200)
})

test('una proteina sola per pezzo: l hamburger di tacchino è tacchino', () => {
  const g = grammi('Hamburger di tacchino e verdure + pane')
  assert.ok(g.tacchino > 0)
  assert.equal(g.manzo, undefined)
})

test('un alimento senza nessuna dose lascia il conto per difetto', () => {
  // Il salmone: né lui né un pesce hanno una dose in questa dieta.
  assert.equal(macroDelPiatto('Salmone con patate', DOSI, []).completo, false)
})
