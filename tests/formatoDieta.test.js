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

const { ESEMPIO_DIETA, PROMPT_AI_DIETA, NESSUNA_DIETA } = await import('../src/lib/formatoDieta.js')
const { parseDietaTesto } = await import('../src/lib/parserDieta.js')
const { slotDaNome } = await import('../src/lib/pastiBase.js')
const { TIPO_GIORNATA } = await import('../src/lib/dieta.js')
const { testoDellaDieta } = await import('../api/riscrivi-dieta.js')

const pasti = (g) => g.pasti.map((p) => p.nome)

test("formatoDieta: l'esempio del prompt si legge come promesso", () => {
  const r = parseDietaTesto(ESEMPIO_DIETA)
  assert.equal(r.giornate.length, 2)
  const [allen, riposo] = r.giornate
  assert.equal(allen.tipo, TIPO_GIORNATA.ALLENAMENTO)
  assert.equal(riposo.tipo, TIPO_GIORNATA.RIPOSO)
  assert.deepEqual(pasti(allen), ['Colazione', 'Spuntino', 'Pranzo', 'Cena', 'Spuntino serale'])
  assert.deepEqual(pasti(riposo), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino serale'])
  // Le alternative di tutto il pasto sono opzioni; quelle di un ingrediente
  // (tra parentesi) restano nel testo del pasto.
  const pranzo = allen.pasti.find((p) => p.nome === 'Pranzo')
  assert.equal(pranzo.opzioni.length, 2)
  assert.match(pranzo.testo, /80g di pasta o riso \(oppure 100g di pane/)
  // Le note in fondo, non appiccicate allo spuntino serale.
  assert.match(r.note, /20g di olio/)
  assert.doesNotMatch(allen.pasti.at(-1).testo, /olio extravergine/)
  assert.deepEqual(r.avvisi, [])
})

test('formatoDieta: il prompt porta regole, esempio e la parola per "non è una dieta"', () => {
  assert.ok(PROMPT_AI_DIETA.includes(ESEMPIO_DIETA))
  assert.ok(PROMPT_AI_DIETA.includes(NESSUNA_DIETA))
  assert.ok(PROMPT_AI_DIETA.trimEnd().endsWith('Ecco la dieta da riscrivere:'))
})

test('parserDieta: lo spuntino della sera tiene il suo nome e non diventa la merenda', () => {
  for (const nome of ['Spuntino serale', 'Spuntino pre-nanna', 'Spuntino prima di dormire']) {
    assert.equal(slotDaNome(nome), '', nome)
  }
  const r = parseDietaTesto('Colazione: latte\nPranzo: riso\nSpuntino: yogurt\nCena: pollo\nSpuntino pre-nanna: latte, noci')
  // Prima: "Spuntino" + "pre-nanna" nel testo, e col primo spuntino già preso diventava la "Merenda".
  assert.deepEqual(pasti(r.giornate[0]), ['Colazione', 'Pranzo', 'Spuntino', 'Cena', 'Spuntino pre-nanna'])
  assert.equal(r.giornate[0].pasti.at(-1).testo, 'latte, noci')
})

// Un piano vero (Word, 5 pagine) riscritto come lo riscrive l'AI col prompt:
// due spuntini diversi fra allenamento e riposo, il pre-nanna, le
// sostituzioni. Il parser da solo, sul PDF, perdeva lo spuntino di allenamento
// e faceva del pane un pranzo intero; riscritto, si legge tutto.
const PIANO_RISCRITTO = `GIORNO DI ALLENAMENTO
Colazione: una tazza di latte parz. scremato; 40-50g di cereali da colazione semplici tipo cornflakes, fiocchi di riso/avena
oppure: una tazza di latte parz. scremato + 3-4 biscotti frollini o 6-8 biscotti secchi tipo marie
oppure: una tazza di latte parz. scremato + 3 fette biscottate con marmellata
oppure: un vasetto di yogurt greco + una porzione di frutta fresca + 3 cucchiai di muesli
Pranzo: circa 80g di pasta, riso, cous cous, farro, quinoa (oppure 2-3 fette di pane 100g, oppure 4 fette di Pan Bauletto); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: pasta/riso/cous cous con tonno e pomodori + frutta
Merenda: un pacchetto di crackers; un bicchiere di succo di frutta con 4-5g di creatina
oppure: un pacchetto di Pavesini + una banana + succo di frutta e creatina
oppure: una crostatina con marmellata + succo di frutta e creatina
Cena: circa 80g di pasta, riso, cous cous, farro, quinoa (oppure 2-3 fette di pane 100g, oppure 4 fette di Pan Bauletto, oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca
oppure: pollo alla brace con patate e verdure al forno + frutta
Spuntino serale: un bicchiere di latte parz. screm. (oppure un vasetto di yogurt o yogurt greco); 10g di frutta secca e/o semi
oppure: un pezzetto di Parmigiano o snack Parmareggio (15-20g) + 10g di frutta secca e/o semi

GIORNO DI RIPOSO
Colazione: una tazza di latte parz. scremato; 40-50g di cereali da colazione semplici tipo cornflakes, fiocchi di riso/avena
oppure: una tazza di latte parz. scremato + 3 fette biscottate con marmellata
Pranzo: circa 80g di pasta, riso, cous cous, farro, quinoa (oppure 2-3 fette di pane 100g, oppure 4 fette di Pan Bauletto); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca
oppure: petto di pollo alla griglia e pomodori + pane + frutta
Merenda: un vasetto di yogurt greco 0% bianco/alla frutta/alla vaniglia/al caffè; una porzione di frutta fresca; un bicchiere di succo di frutta con 4-5g di creatina
oppure: un budino/dessert proteico tipo Milk Pro, Milbona, Ehrmann + succo di frutta e creatina
oppure: una barretta proteica (da 40-60g con 15-20g proteine) + succo di frutta e creatina
Cena: circa 80g di pasta, riso, cous cous, farro, quinoa (oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca
oppure: trancio di salmone in padella con verdure miste e patate + frutta
Spuntino serale: un bicchiere di latte parz. screm. (oppure un vasetto di yogurt o yogurt greco); 10g di frutta secca e/o semi

Note:
Sono previsti 20g di olio extravergine d'oliva al giorno (2 cucchiai), preferibilmente a crudo.
Il peso degli alimenti è al netto degli scarti e prima della cottura.
Sostituzioni della pasta (80g): riso, cous cous, farro, orzo, quinoa 80g; polenta 70-80g; gnocchi di patate 160-170g; pasta fresca 80-90g; pasta ripiena 90-100g; pane 100g; patate 300g.
Pesce almeno 2-3 volte a settimana: filetti 200-250g; salmone, tonno, sgombro, pesce spada 150g; totani, seppie, polpo 300g.
Carne 3-4 volte a settimana (150-200g), preferendo quelle bianche.
Uova 1-2 volte a settimana: una porzione sono 3 uova.
Legumi almeno 2-3 volte a settimana: 70-80g secchi oppure 220-240g cotti.`

test('formatoDieta: un piano vero riscritto tiene allenamento, riposo, spuntini e sostituzioni', () => {
  const r = parseDietaTesto(PIANO_RISCRITTO)
  assert.equal(r.giornate.length, 2)
  const [allen, riposo] = r.giornate
  assert.equal(allen.tipo, TIPO_GIORNATA.ALLENAMENTO)
  assert.equal(riposo.tipo, TIPO_GIORNATA.RIPOSO)
  // Lo spuntino dei giorni di allenamento (i crackers) c'è, ed è diverso da quello di riposo.
  const merAllen = allen.pasti.find((p) => p.nome === 'Merenda')
  const merRiposo = riposo.pasti.find((p) => p.nome === 'Merenda')
  assert.match(merAllen.testo, /crackers/)
  assert.match(merRiposo.testo, /yogurt greco 0%/)
  // Il pane è un'alternativa alla pasta, dentro il pranzo, non un pranzo a sé.
  const pranzo = allen.pasti.find((p) => p.nome === 'Pranzo')
  assert.match(pranzo.testo, /oppure 2-3 fette di pane/)
  assert.ok(pranzo.opzioni.every((o) => !/^2-3 fette di pane/.test(o)))
  // Lo spuntino prima di dormire tiene il suo nome.
  assert.equal(allen.pasti.at(-1).nome, 'Spuntino serale')
  // Le sostituzioni restano una riga sola, coi grammi accanto agli alimenti.
  assert.match(r.note, /gnocchi di patate 160-170g/)
  assert.deepEqual(r.avvisi, [])
})

test('riscrivi-dieta: dalla risposta dell\'AI via markdown e pallini', () => {
  const r = { choices: [{ message: { content: '```\n**GIORNO DI ALLENAMENTO**\n- Colazione: latte\n---\n# Note:\n\n\n\nolio' } }] }
  assert.equal(testoDellaDieta(r), 'GIORNO DI ALLENAMENTO\nColazione: latte\n\nNote:\n\nolio')
})
