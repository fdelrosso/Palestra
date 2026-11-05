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

const { macroConStime } = await import('../src/lib/piatti.js')
const { adattaPastiRimasti, macroDelPasto } = await import('../src/lib/diario.js')
const NESSUNA = dosiScritte([], [])
const stima = (t, d = NESSUNA) => macroConStime(t, d, [])
const coppie = (m) => m.voci.map((v) => [v.alimento.id, v.grammi])

test('stime: senza dosi nella dieta, porzioni normali e "≈" (il pranzo non vale i soli pomodori)', () => {
  const m = stima('Petto di pollo alla griglia e pomodori + pane + frutta')
  assert.deepEqual(coppie(m).sort(), [['frutta', 150], ['pane', 50], ['pollo', 150], ['pomodori', 200]])
  assert.equal(m.completo, true)
  assert.equal(m.stimato, true)
  assert.ok(m.voci.find((v) => v.alimento.id === 'pollo').tipica)
})

test('stime: vince la dose scritta nella dieta, non la porzione normale', () => {
  const d = dosiScritte(['200g di pollo', '100g di riso'], [])
  const m = stima('Tagliata di pollo con peperoni + riso', d)
  assert.deepEqual(coppie(m).sort(), [['peperoni', 200], ['pollo', 200], ['riso', 100]])
  assert.deepEqual(m.voci.filter((v) => !v.tipica).map((v) => v.alimento.id).sort(), ['pollo', 'riso'])
  // La verdura non è una dose della dieta: è la porzione normale.
  assert.ok(m.voci.find((v) => v.alimento.id === 'peperoni').tipica)
})

test('stime: i grammi scritti restano, e non sono stimati', () => {
  const m = stima('Petto di pollo alla griglia + 80g di riso')
  assert.deepEqual(m.voci.map((v) => [v.alimento.id, v.grammi, Boolean(v.stimata)]), [['riso', 80, false], ['pollo', 150, true]])
  // Una quantità a parole è scritta anche lei: niente stime, niente ≈.
  assert.equal(stima('Un vasetto di yogurt greco').stimato, false)
})

test('stime: il pane accanto al riso si conta, e cibi diversi pure', () => {
  assert.deepEqual(coppie(stima('80g di riso + pane')), [['riso', 80], ['pane', 50]])
  assert.deepEqual(coppie(stima('Mela e banana')).map(([id]) => id).length, 2)
})

test('stime: accanto a un cereale scritto il pane è di contorno, non una dose di scambio', () => {
  const d = dosiScritte(['80g di pasta'], [])
  assert.deepEqual(coppie(stima('80g di riso + pane', d)), [['riso', 80], ['pane', 50]])
  // Senza il riso accanto, il pane prende la dose della dieta (è al posto della pasta).
  assert.ok(stima('Petto di pollo + pane', d).voci.find((v) => v.alimento.id === 'pane').grammi > 100)
})

test('stime: le alternative non si sommano', () => {
  assert.deepEqual(coppie(stima('Pollo/filetto di merluzzo')).length, 1)
  assert.deepEqual(coppie(stima('Yogurt greco bianco/alla frutta')).map(([id]) => id), ['yogurt-greco'])
  assert.deepEqual(coppie(stima('80g di pasta, riso, cous cous')), [['pasta', 80]])
  assert.deepEqual(coppie(stima('10g di frutta secca (es. mandorle, pistacchi, semi di zucca)')), [['mandorle', 10]])
  // Ma "Un vasetto…, 2-3 noci" sono tre cose, e "Pane, fette biscottate, crackers (50g)" una sola.
  assert.deepEqual(coppie(stima('Un vasetto di yogurt greco con un cucchiaino di miele, 2-3 noci')).map(([id]) => id), ['yogurt-greco', 'miele', 'noci'])
  assert.deepEqual(coppie(stima('Pane, fette biscottate, crackers (50g)')), [['crackers', 50]])
})

test('stime: il ≥ resta per i buchi veri, e il caffè a piacere non è un buco', () => {
  assert.equal(stima('Una porzione di secondo piatto + pane').completo, false)
  assert.equal(stima('80g di riso + verdure a piacere').completo, false)
  assert.equal(stima('80g di riso\nCaffè a piacere').completo, true)
  assert.equal(stima('Prosciutto crudo').voci[0].grammi, 60)
})

test('le stime NON entrano nelle dosi scritte né nei grammi da riscrivere', () => {
  const d = dosiScritte(['Petto di pollo alla griglia + pane', '200g di petto di pollo + 100g di pane'], [])
  assert.equal(d.perId.get('pollo'), 200)
  assert.equal(d.perId.get('pane'), 100)
  assert.equal(macroDelPasto('Petto di pollo + pane').totale.kcal, 0)
  // Un pasto senza grammi non si può riscrivere: niente "li ho alleggeriti".
  const a = adattaPastiRimasti([{ id: 'x', nome: 'Cena', testo: 'Petto di pollo alla griglia + pane' }], { kcal: 200, proteine: 20, carbo: 10, grassi: 5 })
  assert.equal(a.attendibile, false)
})
