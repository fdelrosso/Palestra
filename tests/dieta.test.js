import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { deflateSync } from 'node:zlib'

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

const { testoDaPdf } = await import('../src/lib/pdfTesto.js')
const { parseDietaTesto } = await import('../src/lib/parserDieta.js')
const { conPastiBase, giornataDelGiorno, normalizzaDieta, nuovaDieta, nuovaGiornataTipo, TIPO_GIORNATA } =
  await import('../src/lib/dieta.js')
const { slotDaNome } = await import('../src/lib/pastiBase.js')
const { categoriaDi, categorieDi, pastoConCategoria, schemaDaPagine, versioniConSchema } = await import(
  '../src/lib/schemaDieta.js'
)

// ---- Un PDF finto, fatto come li fa Word ------------------------------------
// Due font: uno "semplice" (WinAnsi) e uno Type0/Identity-H, dove i codici sono
// indici di glifi (lettera − 29) e solo la ToUnicode dice che lettera sono.
// Le righe si disegnano in ordine SPARSO: è l'ordine delle coordinate, non
// quello del file, che deve venire fuori.

const esc = (s) => s.replace(/[()\\]/g, (c) => `\\${c}`)
const glifi = (s) => [...s].map((c) => (c.charCodeAt(0) - 29).toString(16).padStart(4, '0')).join('')

function pdfFinto({ larghezza = 595, altezza = 842, contenuto }) {
  const cmap = [
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap',
    '1 begincodespacerange <0000> <FFFF> endcodespacerange',
    '1 beginbfrange <0003> <005D> <0020> endbfrange',
    'endcmap end end',
  ].join('\n')
  const stream = deflateSync(Buffer.from(contenuto, 'latin1')).toString('latin1')
  const oggetti = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larghezza} ${altezza}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    `<< /Type /Font /Subtype /TrueType /BaseFont /Times /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 126 /Widths [${Array(95).fill(500).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type0 /BaseFont /TimesCID /Encoding /Identity-H /DescendantFonts [7 0 R] /ToUnicode 8 0 R >>',
    `<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /TimesCID /DW 500 >>',
    `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`,
  ]
  let out = '%PDF-1.7\n'
  oggetti.forEach((o, i) => {
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  out += 'trailer << /Root 1 0 R >>\n%%EOF\n'
  return new Blob([Buffer.from(out, 'latin1')])
}

// Una riga a (x, y) col font semplice; `pezzi` = run consecutivi senza spazio.
const riga = (x, y, ...pezzi) =>
  `BT /F1 12 Tf 1 0 0 1 ${x} ${y} Tm ${pezzi.map((p) => `(${esc(p)}) Tj`).join(' ')} ET\n`
const rigaCid = (x, y, testo) => `BT /F2 12 Tf 1 0 0 1 ${x} ${y} Tm <${glifi(testo)}> Tj ET\n`

test('pdf: le righe tornano nell’ordine della pagina, e i font Identity-H si leggono', async () => {
  const contenuto =
    // Prima il contenuto della colazione (come le caselle di testo di Word)…
    riga(50, 680, 'Yogurt greco e 30g di cereali') +
    // …poi il titolo, che sulla pagina sta SOPRA.
    riga(50, 700, 'Colazione') +
    // "10" e "0g" sono due run attaccati: devono diventare "100g", senza spazio.
    riga(50, 640, '10', '0g di pasta') +
    riga(50, 660, 'Pranzo') +
    // Una parola nel font a glifi, staccata dalla precedente di uno spazio.
    riga(50, 620, 'olio') +
    rigaCid(80, 620, 'extravergine')
  const esito = await testoDaPdf(pdfFinto({ contenuto }))
  assert.equal(esito.ok, true, esito.motivo)
  assert.deepEqual(esito.testo.split('\n'), [
    'Colazione',
    'Yogurt greco e 30g di cereali',
    'Pranzo',
    '100g di pasta',
    'olio extravergine',
  ])
})

test('pdf: la tabella della settimana diventa lo schema, casella per casella', async () => {
  const giorni = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI']
  const xs = [100, 250, 400, 550]
  let contenuto = ''
  giorni.forEach((g, i) => {
    contenuto += riga(xs[i], 500, g)
  })
  // L'etichetta di riga scritta in verticale, a pezzi, come fa Word.
  contenuto += riga(20, 300, 'PR') + riga(20, 312, 'AN') + riga(20, 324, 'ZO')
  contenuto += riga(100, 470, '1 porzione di legumi') + riga(100, 456, '+ Pasta o pane')
  contenuto += riga(100, 430, 'Esempi:') + riga(100, 416, 'Pasta e ceci') + riga(100, 390, 'Riso con piselli e')
  contenuto += riga(100, 376, 'funghi')
  contenuto += riga(250, 470, '1 porzione di uova')
  contenuto += riga(400, 470, '1 porzione di carne bianca')
  contenuto += riga(550, 470, 'PASTO FUORI A SCELTA')
  contenuto += riga(20, 200, 'CENA') + riga(250, 190, '1 porzione di pesce')

  const esito = await testoDaPdf(pdfFinto({ larghezza: 842, altezza: 595, contenuto }))
  const { caselle, trovato } = schemaDaPagine(esito.pagine)
  assert.equal(trovato, true)
  const di = (giorno, pasto) => caselle.find((c) => c.giorno === giorno && c.pasto === pasto)
  assert.equal(di(0, 'pranzo').categoria, 'legumi')
  assert.equal(di(0, 'pranzo').testo, '1 porzione di legumi\nPasta o pane')
  // Gli esempi si separano dove c'è più aria fra le righe.
  assert.deepEqual(di(0, 'pranzo').esempi, ['Pasta e ceci', 'Riso con piselli e funghi'])
  assert.equal(di(1, 'pranzo').categoria, 'uova')
  assert.equal(di(2, 'pranzo').categoria, 'carne-bianca')
  assert.equal(di(3, 'pranzo').categoria, 'libero')
  assert.equal(di(1, 'cena').categoria, 'pesce')
  assert.equal(caselle.length, 5)
})

// ---- Il testo del piano ------------------------------------------------------

const PIANO = `Dott.ssa Esempio - Dietista
Mario Rossi
ESEMPIO DI DISTRIBUZIONE GIORNALIERA
Colazione
• Una tazza di latte e caffè
• 30g di cereali
In alternativa, cercando di variare, è possibile consumare:
• Latte e caffè + 2 fette biscottate con marmellata
• Finto tiramisù: 3 fette biscottate inzuppate nel caffè, alternate da yogurt greco (un vasetto bianco con un
cucchiaino di miele)
Spuntino
• Una porzione di frutta fresca
Pranzo
• 100g di pasta/riso
oppure 120g di pane
• Una porzione di secondo piatto
Esempi:
• Tagliata di pollo con peperoni + riso
• Riso con piselli e funghi
Spuntino
• 2 fette di pane con:
3 fette di bresaola
oppure 100g di formaggio spalmabile
• Una banana
Cena
• Una porzione di secondo piatto
Esempi:
• Frittata con verdure + pane
Sono previsti 20g di olio extravergine al giorno, corrispondenti a 2 cucchiai da usare preferibilmente a
crudo.
N.B. Il peso degli alimenti è a crudo.
SOSTITUZIONI
Pasta di semola 100g 200g`

test('parser: i cinque pasti, le alternative a elenco, gli esempi e le note', () => {
  const r = parseDietaTesto(PIANO)
  assert.equal(r.giornate.length, 1)
  const pasti = r.giornate[0].pasti
  assert.deepEqual(
    pasti.map((p) => [p.slot, p.nome]),
    [
      ['colazione', 'Colazione'],
      ['spuntino', 'Spuntino'],
      ['pranzo', 'Pranzo'],
      // Il secondo "Spuntino", dopo il pranzo, è la merenda.
      ['merenda', 'Merenda'],
      ['cena', 'Cena'],
    ],
  )
  const [colazione, , pranzo, merenda, cena] = pasti
  assert.equal(colazione.testo, 'Una tazza di latte e caffè\n30g di cereali')
  // La riga andata a capo resta dentro la sua alternativa.
  assert.deepEqual(colazione.opzioni, [
    'Latte e caffè + 2 fette biscottate con marmellata',
    'Finto tiramisù: 3 fette biscottate inzuppate nel caffè, alternate da yogurt greco (un vasetto bianco con un cucchiaino di miele)',
  ])
  // "oppure 120g di pane" sotto un punto è un'alternativa al PUNTO, non al pranzo.
  assert.equal(pranzo.testo, '100g di pasta/riso oppure 120g di pane\nUna porzione di secondo piatto')
  assert.deepEqual(pranzo.opzioni, ['Tagliata di pollo con peperoni + riso', 'Riso con piselli e funghi'])
  assert.equal(
    merenda.testo,
    '2 fette di pane con: 3 fette di bresaola oppure 100g di formaggio spalmabile\nUna banana',
  )
  assert.deepEqual(merenda.opzioni, [])
  // Dopo gli esempi della cena comincia la parte di indicazioni: non è cena.
  assert.deepEqual(cena.opzioni, ['Frittata con verdure + pane'])
  assert.match(r.note, /^Sono previsti 20g di olio extravergine al giorno, .* a crudo\.$/m)
  assert.match(r.note, /N\.B\. Il peso/)
  assert.match(r.note, /SOSTITUZIONI\nPasta di semola 100g 200g/)
})

test('parser: i messaggi scritti a mano funzionano come prima', () => {
  const r = parseDietaTesto('Colazione: 150g yogurt, 60g avena\nPranzo: riso e pollo\nOppure: pasta e tonno\nCena: pesce')
  const [colazione, pranzo, cena] = r.giornate[0].pasti
  assert.equal(colazione.testo, '150g yogurt, 60g avena')
  assert.equal(pranzo.testo, 'riso e pollo')
  assert.deepEqual(pranzo.opzioni, ['pasta e tonno'])
  assert.equal(cena.slot, 'cena')
})

// ---- I cinque pasti ------------------------------------------------------------

test('pasti: i nomi dei nutrizionisti si riconducono ai cinque', () => {
  assert.equal(slotDaNome('Spuntino di metà mattina'), 'spuntino')
  assert.equal(slotDaNome('Spuntino del pomeriggio'), 'merenda')
  assert.equal(slotDaNome('Seconda colazione'), 'spuntino')
  assert.equal(slotDaNome('Prima colazione'), 'colazione')
  assert.equal(slotDaNome('Pre workout'), '')
  assert.equal(slotDaNome('Spuntino serale'), '')
})

test('pasti: sempre i cinque in ordine, e gli extra restano dove stavano', () => {
  const pasti = conPastiBase([
    { id: 'a', nome: 'Pranzo', testo: 'riso' },
    { id: 'b', nome: 'Pre workout', testo: 'banana' },
    { id: 'c', nome: 'Cena', testo: 'pesce' },
  ])
  assert.deepEqual(
    pasti.map((p) => p.nome),
    ['Colazione', 'Spuntino', 'Pranzo', 'Pre workout', 'Merenda', 'Cena'],
  )
  assert.equal(pasti.find((p) => p.nome === 'Pre workout').slot, '')
})

test('dieta: i nomi vecchi dei pasti generati diventano i nuovi, e le kcal si contano dai macro', () => {
  const d = normalizzaDieta(
    nuovaDieta({
      riposo: {
        kcal: 0,
        proteine: 150,
        carbo: 200,
        grassi: 60,
        pasti: [
          { id: '1', nome: 'Spuntino di metà mattina', testo: 'x' },
          { id: '2', nome: 'Spuntino del pomeriggio', testo: 'y' },
        ],
      },
    }),
  )
  assert.deepEqual(d.riposo.pasti.map((p) => p.nome), ['Spuntino', 'Merenda'])
  assert.equal(d.riposo.kcal, 150 * 4 + 200 * 4 + 60 * 9)
  assert.deepEqual(d.schema, [])
  assert.equal(d.note, '')
})

test('giornate tipo: quella che si chiama come oggi esce oggi', () => {
  const dieta = {
    giornate: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map((nome) =>
      nuovaGiornataTipo({ nome, tipo: TIPO_GIORNATA.QUALSIASI }),
    ),
  }
  // 28 settembre 2026 è un lunedì: con la sola rotazione usciva il giovedì.
  assert.equal(giornataDelGiorno(dieta, false, new Date(2026, 8, 28)).nome, 'Lunedì')
  assert.equal(giornataDelGiorno(dieta, false, new Date(2026, 9, 4)).nome, 'Domenica')
})

// ---- Lo schema in "Dieta giornaliera" ------------------------------------------

test('categorie: parole intere, e il primo piatto nominato vince', () => {
  assert.equal(categoriaDi('Riso/pasta al pomodoro + frittata con verdure'), 'uova')
  assert.equal(categoriaDi('Hamburger di tacchino e verdure + pane'), 'carne-bianca')
  assert.equal(categoriaDi('Pasta con Philadelphia e crema di zucchine'), 'formaggio')
  // I fagiolini sono una verdura, e "carne" da sola non dice quale.
  assert.deepEqual(categorieDi('Fettine di carne in salsa con fagiolini'), [])
  assert.equal(categoriaDi('Petto di pollo: 150g · Riso: 80g'), 'carne-bianca')
})

test('schema: prima quello che dice lo schema, in fondo e separato quello che non c’entra', () => {
  const pasto = {
    testo: '100g di pasta + una porzione di secondo piatto',
    opzioni: ['Tagliata di pollo con peperoni + riso', 'Riso con piselli e funghi', 'Pasta e ceci'],
  }
  const casella = { giorno: 0, pasto: 'pranzo', categoria: 'legumi', testo: '1 porzione di legumi + pasta', esempi: ['Pasta e ceci'] }
  const { versioni, nelloSchema } = versioniConSchema(pasto, casella)
  assert.deepEqual(
    versioni.map((v) => [v.testo, v.fuoriSchema]),
    [
      ['1 porzione di legumi + pasta', false],
      // Lo stesso piatto scritto nella casella e nel piano compare una volta.
      ['Pasta e ceci', false],
      ['Riso con piselli e funghi', false],
      // Il piatto senza categoria va bene sempre.
      ['100g di pasta + una porzione di secondo piatto', false],
      ['Tagliata di pollo con peperoni + riso', true],
    ],
  )
  assert.equal(nelloSchema, 4)
})

test('schema: senza casella, o con pasto libero, le versioni sono quelle del piano', () => {
  const pasto = { testo: 'A pollo', opzioni: ['B merluzzo'] }
  assert.deepEqual(versioniConSchema(pasto, null).versioni.map((v) => v.testo), ['A pollo', 'B merluzzo'])
  const libero = { giorno: 5, pasto: 'cena', categoria: 'libero', testo: 'Pasto fuori', esempi: [] }
  const r = versioniConSchema(pasto, libero)
  assert.deepEqual(r.versioni.map((v) => v.testo), ['Pasto fuori', 'A pollo', 'B merluzzo'])
  assert.equal(r.versioni.some((v) => v.fuoriSchema), false)
})

test('schema: a una dieta generata si rifà il pasto con la categoria giusta, a macro invariati', () => {
  const testo = 'Petto di pollo: 150g · Riso: 80g · Olio: 10g · Verdure: a piacere'
  const nuovo = pastoConCategoria(testo, 'legumi', null)
  assert.match(nuovo, /^Lenticchie \(a crudo\): \d+g/)
  // Le lenticchie portano carboidrati: il riso cala (o sparisce), le verdure restano.
  const riso = /Riso: (\d+)g/.exec(nuovo)
  assert.ok(!riso || Number(riso[1]) < 80, nuovo)
  assert.match(nuovo, /Verdure: a piacere/)
  // Già della categoria giusta, o scritto senza grammi: niente da rifare.
  assert.equal(pastoConCategoria(testo, 'carne-bianca', null), null)
  assert.equal(pastoConCategoria('Pollo e riso', 'legumi', null), null)
})
