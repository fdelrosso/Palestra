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

const { ESEMPIO_DIETA, PROMPT_AI_DIETA, NESSUNA_DIETA, sistemaGiornate } = await import('../src/lib/formatoDieta.js')
const { parseDietaTesto } = await import('../src/lib/parserDieta.js')
const { slotDaNome } = await import('../src/lib/pastiBase.js')
const { TIPO_GIORNATA } = await import('../src/lib/dieta.js')
const { testoDellaDieta } = await import('../api/riscrivi-dieta.js')
const { segnaRipetute, testoDaPagine } = await import('../src/lib/pdfTesto.js')

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

test('parserDieta: lo spuntino della sera tiene il suo nome, quello dopo pranzo è la merenda', () => {
  for (const nome of ['Spuntino serale', 'Spuntino pre-nanna', 'Spuntino prima di dormire']) {
    assert.equal(slotDaNome(nome), '', nome)
  }
  const r = parseDietaTesto('Colazione: latte\nPranzo: riso\nSpuntino: yogurt\nCena: pollo\nSpuntino pre-nanna: latte, noci')
  // Prima: "Spuntino" + "pre-nanna" nel testo, e col primo spuntino già preso diventava la "Merenda".
  // Lo "Spuntino" dopo il pranzo è quello del pomeriggio: la merenda, non quello della mattina.
  assert.deepEqual(pasti(r.giornate[0]), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino pre-nanna'])
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

// Quello che ministral ha risposto davvero sul piano vero (in produzione, il
// 27/10): i titoli di riposo e allenamento IN MEZZO alla giornata, sotto uno
// "Spuntino:" vuoto, invece di due giornate intere. Il parser ne faceva tre
// giornate rotte. Le note sono tagliate: qui non contano.
const RISPOSTA_AI_TITOLI_IN_MEZZO = `GIORNATA TIPO

Colazione: una tazza di latte parzialmente scremato; 40-50g di cereali (cornflakes, fiocchi di riso o avena)
oppure: una tazza di latte parzialmente scremato + 3-4 biscotti frollini o 6-8 biscotti secchi (tipo marie)
oppure: un vasetto di yogurt greco + una porzione di frutta fresca + 3 cucchiai di muesli

Pranzo: 80g di pasta, riso, cous cous, farro, quinoa (oppure 2-3 fette di pane 100g, oppure 4 fette di pan bauletto); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca (1 frutto medio-grande o 2 piccoli)
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: pasta/riso/cous cous con tonno e pomodori + frutta

Spuntino:
GIORNO DI RIPOSO
un vasetto di yogurt greco 0% (bianco/alla frutta/alla vaniglia/al caffè); una porzione di frutta fresca (1 frutto medio-grande o 2 piccoli); un bicchiere di succo di frutta con 4-5g di creatina
oppure: un budino/dessert proteico (Milk Pro, Milbona, Ehrmann) + succo di frutta e creatina
oppure: 2 gallette con 6 fette di bresaola + succo di frutta e creatina

GIORNO DI ALLENAMENTO
un pacchetto di crackers; un bicchiere di succo di frutta con 4-5g di creatina
oppure: un pacchetto di Pavesini + una banana + succo di frutta e creatina
oppure: una crostatina con marmellata + succo di frutta e creatina

Pre workout: (se allenamento <2 ore dopo colazione)
un piatto di pasta in bianco/al pomodoro; pane e marmellata; crackers; frutta

Post workout: 1-2 bicchieri di acqua; 4-5g di creatina (in associazione a carboidrati)
oppure: un misurino di proteine in polvere (25-30g)

Cena: 80g di pasta, riso, cous cous, farro, quinoa (oppure 2-3 fette di pane 100g, oppure 4 fette di pan bauletto, oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura cotta o cruda; 1 cucchiaio di olio; una porzione di frutta fresca (1 frutto medio-grande o 2 piccoli)
oppure: pollo alla brace con patate e verdure al forno + frutta
oppure: trancio di salmone in padella con verdure miste e patate + frutta

Spuntino serale: un bicchiere di latte parzialmente scremato oppure un vasetto di yogurt o yogurt greco; 10g di frutta secca e/o semi (mandorle, pistacchi, noci pecan, anacardi, semi di zucca, semi di girasole)
oppure: un pezzetto di Parmigiano o snack Parmareggio (15-20g) + 10g di frutta secca e/o semi

Note:
Sono previsti 20g di olio extravergine d'oliva al giorno (2 cucchiai o 4 cucchiaini), preferibilmente a crudo.
Sostituzioni per 80g di pasta: 80g riso, cous cous, farro, orzo, quinoa; 70-80g farina di mais; 160-170g gnocchi di patate; 80-90g pasta fresca; 90-100g pasta ripiena; 100g pane; 300g patate.`

// Del piano vero, quanto basta: i pasti di workout NON ci sono, solo i
// consigli su prima e dopo l'allenamento.
const PIANO_SENZA_WORKOUT = `Spuntino
Nei giorni di rest:
• Un vasetto di yogurt greco 0%
Nei giorni di allenamento:
• Un pacchetto di crackers
Prima dell'allenamento..
• Se il tempo prima dell'allenamento è poco (<2 ore) l'energia dovrebbe provenire dai carboidrati
Dopo l'allenamento..
• Subito dopo l'allenamento la cosa più importante da fare è idratarsi`

test('sistemaGiornate: i titoli in mezzo ai pasti diventano due giornate intere', () => {
  const r = parseDietaTesto(sistemaGiornate(RISPOSTA_AI_TITOLI_IN_MEZZO, PIANO_SENZA_WORKOUT))
  // Prima erano tre giornate rotte.
  assert.equal(r.giornate.length, 2)
  const allen = r.giornate.find((g) => g.tipo === TIPO_GIORNATA.ALLENAMENTO)
  const riposo = r.giornate.find((g) => g.tipo === TIPO_GIORNATA.RIPOSO)
  assert.ok(allen && riposo)
  // Pre e post workout erano inventati dai consigli: via.
  assert.deepEqual(pasti(allen), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino serale'])
  assert.deepEqual(pasti(riposo), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino serale'])
  // Il pasto che cambia, al posto giusto in ognuna.
  const merenda = (g) => g.pasti.find((p) => p.nome === 'Merenda')
  assert.match(merenda(allen).testo, /crackers/)
  assert.equal(merenda(allen).opzioni.length, 2)
  assert.match(merenda(riposo).testo, /yogurt greco 0%/)
  assert.equal(merenda(riposo).opzioni.length, 2)
  // I pasti in comune, uguali in tutte e due, con le loro alternative.
  for (const nome of ['Colazione', 'Pranzo', 'Cena', 'Spuntino serale']) {
    const a = allen.pasti.find((p) => p.nome === nome)
    const b = riposo.pasti.find((p) => p.nome === nome)
    assert.equal(a.testo, b.testo, nome)
    assert.deepEqual(a.opzioni, b.opzioni, nome)
  }
  assert.match(allen.pasti.find((p) => p.nome === 'Pranzo').testo, /oppure 2-3 fette di pane/)
  // Le note in fondo, una volta sola.
  assert.match(r.note, /gnocchi di patate/)
  assert.equal(r.note.match(/Sostituzioni/g).length, 1)
  assert.deepEqual(r.avvisi, [])
})

test('sistemaGiornate: pre e post workout restano se la dieta li nomina', () => {
  const r = parseDietaTesto(sistemaGiornate(RISPOSTA_AI_TITOLI_IN_MEZZO, 'Pre-workout: una banana\nPost workout: proteine'))
  const allen = r.giornate.find((g) => g.tipo === TIPO_GIORNATA.ALLENAMENTO)
  const riposo = r.giornate.find((g) => g.tipo === TIPO_GIORNATA.RIPOSO)
  assert.deepEqual(pasti(allen), ['Colazione', 'Pranzo', 'Merenda', 'Pre workout', 'Post workout', 'Cena', 'Spuntino serale'])
  assert.deepEqual(pasti(riposo), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino serale'])
})

test('sistemaGiornate: uno "Spuntino" dopo pranzo è la merenda, dopo cena lo spuntino serale', () => {
  const t = sistemaGiornate('Colazione: latte\nPranzo: riso\nSpuntino: yogurt\nCena: pollo\nSpuntino: noci')
  assert.equal(t, 'Colazione: latte\nPranzo: riso\nMerenda: yogurt\nCena: pollo\nSpuntino serale: noci')
  const r = parseDietaTesto(t)
  assert.deepEqual(pasti(r.giornate[0]), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino serale'])
})

test('sistemaGiornate: un testo già in ordine esce identico', () => {
  assert.equal(sistemaGiornate(ESEMPIO_DIETA), ESEMPIO_DIETA)
  assert.equal(sistemaGiornate(PIANO_RISCRITTO), PIANO_RISCRITTO)
  const mattina = 'Colazione: latte\nSpuntino: mela\nPranzo: riso'
  assert.equal(sistemaGiornate(mattina), mattina)
})

test('formatoDieta: il prompt vieta i titoli in mezzo e i pasti di workout inventati', () => {
  assert.match(PROMPT_AI_DIETA, /mai un titolo di giornata in mezzo ai pasti/)
  assert.match(PROMPT_AI_DIETA, /SOLO se la dieta li scrive come pasti/)
})

// Senza AI (Mistral giù, il 5/11): il testo come lo tira fuori lib/pdfTesto
// dal PDF vero, tagliato. Lo spuntino del pomeriggio ha due versioni, "Nei
// giorni di rest:" e "Nei giorni di allenamento:", e il parser ne faceva un
// pasto solo con dentro la prima, e la seconda nelle note.
const PDF_SENZA_AI = `ESEMPIO DI DISTRIBUZIONE GIORNALIERA
Colazione
• Una tazza di latte parz. scremato
• 40-50g di cereali da colazione semplici tipo cornflakes, fiocchi di riso/avena..
In alternativa, ricordandosi di variare, è possibile consumare:
• Una tazza di latte parz. scremato + 3 fette biscottate con marmellata
Pranzo
• Circa 80g di pasta, riso, cous cous, farro, quinoa..
oppure 2-3 fette di pane (100g)
• Una porzione di secondo piatto
Esempi:
• Petto di pollo alla griglia e pomodori + pane + frutta
Spuntino
Nei giorni di rest:
• Un vasetto di yogurt greco 0% bianco/alla frutta/alla vaniglia/al caffè..
• Un bicchiere di succo di frutta con 4-5g di creatina
In alternativa, è possibile consumare:
• 2 gallette con 6 fette di bresaola + succo di frutta e creatina
• Una barretta proteica (da 40-60g con 15-20g proteine) tipo “Barrette Proteiche Macro Munch” Bulk,
“The Protein Deal” Enervit,” Barretta Proteica 50% protein” Lidl + succo di frutta e creatina
Nei giorni di allenamento:
• Un pacchetto di crackers
• Un bicchiere di succo di frutta con 4-5g di creatina
In alternativa, è possibile consumare:
• Un pacchetto di Pavesini + una banana + succo di frutta e creatina
• Una crostatina con marmellata + succo di frutta e creatina
Cena
• Circa 80g di pasta, riso, cous cous, farro, quinoa..
• Una porzione di secondo piatto
Spuntino pre-nanna
• Un bicchiere di latte parz. screm.
• 10g di frutta secca e/o semi
In alternativa, è possibile consumare:
• Un vasetto di yogurt o yogurt greco + un quadretto di cioccolato fondente
Sono previsti 20g di olio extravergine d’oliva al giorno, corrispondenti a 2 cucchiai (o 4 cucchiaini) da
utilizzare preferibilmente a crudo.
SOSTITUZIONI:
La quantità di pasta (80g) può essere sostituita con:
160-170g Gnocchi di patate`

test('parserDieta: "Nei giorni di rest / di allenamento" sotto un pasto fa due giornate intere', () => {
  const r = parseDietaTesto(PDF_SENZA_AI)
  assert.equal(r.giornate.length, 2)
  const [allen, riposo] = r.giornate
  assert.equal(allen.tipo, TIPO_GIORNATA.ALLENAMENTO)
  assert.equal(riposo.tipo, TIPO_GIORNATA.RIPOSO)
  assert.equal(allen.nome, 'Giorno di allenamento')
  // Lo spuntino dopo pranzo è la merenda, al suo posto fra pranzo e cena.
  assert.deepEqual(pasti(allen), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino pre-nanna'])
  assert.deepEqual(pasti(riposo), ['Colazione', 'Pranzo', 'Merenda', 'Cena', 'Spuntino pre-nanna'])
  const merenda = (g) => g.pasti.find((p) => p.nome === 'Merenda')
  assert.match(merenda(allen).testo, /crackers/)
  assert.doesNotMatch(merenda(allen).testo, /yogurt|rest/i)
  assert.equal(merenda(allen).opzioni.length, 2)
  assert.match(merenda(riposo).testo, /yogurt greco 0%/)
  assert.doesNotMatch(merenda(riposo).testo, /crackers|Nei giorni/)
  // La barretta va a capo su “The Protein Deal”: resta una voce sola.
  assert.equal(merenda(riposo).opzioni.length, 2)
  assert.match(merenda(riposo).opzioni[1], /Macro Munch.*Protein Deal.*Lidl/)
  // Il resto uguale nelle due, con id suoi.
  assert.equal(allen.pasti[0].testo, riposo.pasti[0].testo)
  assert.notEqual(allen.pasti[0].id, riposo.pasti[0].id)
  assert.ok(allen.pasti.every((p) => !('varianti' in p)))
  // Le note non si portano via lo spuntino di allenamento.
  assert.match(r.note, /20g di olio/)
  assert.doesNotMatch(r.note, /crackers|Nei giorni/)
  assert.ok(!r.avvisi.some((a) => /una sola giornata/.test(a)))
})

test('parserDieta: "GIORNO DI RIPOSO" da solo resta il titolo di una giornata', () => {
  const r = parseDietaTesto('GIORNO DI ALLENAMENTO\nColazione: latte\nPranzo: riso\nGIORNO DI RIPOSO\nColazione: yogurt\nPranzo: pasta')
  assert.deepEqual(r.giornate.map((g) => g.tipo), [TIPO_GIORNATA.ALLENAMENTO, TIPO_GIORNATA.RIPOSO])
})

test('pdfTesto: una riga in cima alla pagina non sparisce se è uguale a una a metà di un\'altra pagina', () => {
  const riga = (y, testo) => ({ y, h: 12, testo, runs: [{ testo }] })
  const pagine = [
    { altezza: 842, righe: [riga(820, 'Dr.ssa Rossi - Dietista'), riga(400, 'Un bicchiere di succo di frutta'), riga(20, '1')] },
    { altezza: 842, righe: [riga(820, 'Dr.ssa Rossi - Dietista'), riga(790, 'Un bicchiere di succo di frutta'), riga(20, '2')] },
  ]
  segnaRipetute(pagine)
  // L'intestazione uguale in cima a ogni pagina e i numeri di pagina via…
  assert.ok(pagine[0].righe[0].ripetuta && pagine[1].righe[0].ripetuta)
  assert.ok(pagine[0].righe[2].ripetuta && pagine[1].righe[2].ripetuta)
  // …la riga della dieta in cima a pagina 2 resta.
  assert.equal(pagine[1].righe[1].ripetuta, false)
  assert.equal(testoDaPagine(pagine), 'Un bicchiere di succo di frutta\nUn bicchiere di succo di frutta')
})

test('parserDieta: i titoli di giornata al plurale o "Nei giorni di…" non sono varianti di un pasto', () => {
  const plurale = parseDietaTesto('GIORNI DI ALLENAMENTO\nColazione: latte\nPranzo: riso\nGIORNI DI RIPOSO\nColazione: yogurt\nPranzo: pasta')
  assert.deepEqual(plurale.giornate.map((g) => [g.tipo, g.pasti.length]), [[TIPO_GIORNATA.ALLENAMENTO, 2], [TIPO_GIORNATA.RIPOSO, 2]])
  const aParole = parseDietaTesto('Nei giorni di allenamento:\nColazione: latte\nPranzo: riso\nNei giorni di riposo:\nColazione: yogurt\nPranzo: pasta')
  assert.deepEqual(aParole.giornate.map((g) => [g.tipo, g.pasti.map((p) => p.testo)]), [
    [TIPO_GIORNATA.ALLENAMENTO, ['latte', 'riso']],
    [TIPO_GIORNATA.RIPOSO, ['yogurt', 'pasta']],
  ])
})

test('parserDieta: lo spuntino dopo cena resta spuntino', () => {
  const r = parseDietaTesto('Colazione: latte\nPranzo: riso\nCena: pollo\nSpuntino: yogurt')
  assert.deepEqual(pasti(r.giornate[0]), ['Colazione', 'Pranzo', 'Cena', 'Spuntino'])
})

test('parserDieta: un pasto scritto per un solo tipo di giorno, nell\'altro non c\'è', () => {
  const r = parseDietaTesto('Colazione: latte\nPranzo: riso\nSpuntino\nNei giorni di allenamento:\n- crackers\nCena: pollo')
  assert.deepEqual(pasti(r.giornate[0]), ['Colazione', 'Pranzo', 'Merenda', 'Cena'])
  assert.deepEqual(pasti(r.giornate[1]), ['Colazione', 'Pranzo', 'Cena'])
})
