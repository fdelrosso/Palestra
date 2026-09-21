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

const { ALIMENTI, kcalPer100, macroDi, trovaAlimento } = await import('../src/lib/alimenti.js')
const {
  adattaPastiRimasti,
  analizzaTesto,
  analizzaVoce,
  leggiPorzione,
  macroDelPasto,
  percentualiMacro,
  restante,
  somma,
  vociDaPasto,
} = await import('../src/lib/diario.js')
const { coerenzaMacro, carboDaKcal, dietaDaMacro, pastiDaMacro } = await import('../src/lib/dieta.js')
const { parseDietaTesto } = await import('../src/lib/parserDieta.js')

// --------------------------------------------------------------- il catalogo

test('ogni alimento ha i macro e una densita coerente col suo macro dominante', () => {
  for (const a of ALIMENTI) {
    assert.ok(a.m, `${a.id} senza macro`)
    assert.equal(a.per, a.m[a.macro] / 100, `${a.id}: per non deriva da m`)
    // Il caffe' non ha macro e va bene cosi': sta nel catalogo solo per essere
    // riconosciuto nel diario (peso 0), e nell'aritmetica non entra mai.
    assert.ok(a.per > 0 || a.peso === 0, `${a.id}: densita nulla ma proponibile`)
    for (const k of ['p', 'c', 'g']) assert.ok(a.m[k] >= 0, `${a.id}: ${k} negativo`)
    // 100g di roba non possono pesare piu' di 100g.
    assert.ok(a.m.p + a.m.c + a.m.g <= 100.01, `${a.id}: i macro superano i 100g`)
  }
})

test('gli id sono unici', () => {
  const ids = ALIMENTI.map((a) => a.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('le calorie sono 4/4/9, salvo dove sono scritte a mano (alcol)', () => {
  const pollo = ALIMENTI.find((a) => a.id === 'pollo')
  assert.equal(kcalPer100(pollo), 31 * 4 + 3 * 9) // 31g proteine, 0 carboidrati, 3g grassi
  const birra = ALIMENTI.find((a) => a.id === 'birra')
  assert.equal(kcalPer100(birra), 43, 'senza kcal esplicite la birra varrebbe 16')
})

test('i macro di una porzione scalano coi grammi', () => {
  const pollo = ALIMENTI.find((a) => a.id === 'pollo')
  assert.deepEqual(macroDi(pollo, 200), { kcal: 302, proteine: 62, carbo: 0, grassi: 6 })
  assert.deepEqual(macroDi(pollo, 0), { kcal: 0, proteine: 0, carbo: 0, grassi: 0 })
  assert.deepEqual(macroDi(null, 100), { kcal: 0, proteine: 0, carbo: 0, grassi: 0 })
})

test('riso crudo e riso cotto sono due alimenti diversi', () => {
  // E' l'errore che sballa di piu' i conti: 100g di riso crudo sono 78g di
  // carboidrati, 100g di riso cotto 28.
  assert.equal(trovaAlimento('riso cotto').id, 'riso-cotto')
  assert.equal(trovaAlimento('100g di riso').id, 'riso')
})

// --------------------------------------------------------------- le porzioni

test('la quantita si legge dai grammi, dai pezzi o dalle misure da cucina', () => {
  const uova = ALIMENTI.find((a) => a.id === 'uova')
  const olio = ALIMENTI.find((a) => a.id === 'olio')
  const pollo = ALIMENTI.find((a) => a.id === 'pollo')
  assert.equal(leggiPorzione('150g di pollo', pollo).grammi, 150)
  assert.equal(leggiPorzione('150 grammi di pollo', pollo).grammi, 150)
  assert.equal(leggiPorzione('2 uova', uova).grammi, 110)
  assert.equal(leggiPorzione('due uova', uova).grammi, 110)
  assert.equal(leggiPorzione('un cucchiaio di olio', olio).grammi, 10)
  assert.equal(leggiPorzione('2 cucchiai di olio', olio).grammi, 20)
  // Un numero grande accanto a un alimento "a pezzi" sono grammi, non pezzi.
  assert.equal(leggiPorzione('pollo 150', pollo).grammi, 150)
  assert.equal(leggiPorzione('pollo', pollo).grammi, null)
})

test('una voce riconosciuta porta i suoi macro; una sconosciuta resta a zero', () => {
  const v = analizzaVoce('150g di pollo')
  assert.equal(v.riconosciuto, true)
  assert.equal(v.alimentoId, 'pollo')
  assert.equal(v.grammi, 150)
  assert.equal(v.kcal, macroDi(ALIMENTI.find((a) => a.id === 'pollo'), 150).kcal)
  assert.equal(v.stimata, false)

  const ignota = analizzaVoce('parmigiana della nonna')
  assert.equal(ignota.riconosciuto, false)
  assert.equal(ignota.kcal, 0, 'un numero inventato sarebbe peggio di nessun numero')
  assert.equal(ignota.stimata, true)
})

test('senza quantita si stima una porzione, e lo si dichiara', () => {
  const v = analizzaVoce('una banana')
  assert.equal(v.grammi, 120)
  assert.equal(v.stimata, false, 'la quantita c e: e un pezzo')
  const senza = analizzaVoce('pollo')
  assert.equal(senza.grammi, 100)
  assert.equal(senza.stimata, true)
})

// Le calorie attese si CALCOLANO dal catalogo invece di scriverle a mano: la
// prova deve accorgersi se i conti cambiano, non se cambia una tabella
// nutrizionale (quella e' un dato, e si puo' correggere).
const kcalDi = (id, g) => macroDi(ALIMENTI.find((a) => a.id === id), g).kcal

test('piu alimenti in una riga, separati come capita', () => {
  const r = analizzaTesto('150g di pollo, 80g di riso e un cucchiaio di olio')
  assert.equal(r.voci.length, 3)
  assert.deepEqual(r.voci.map((v) => v.alimentoId), ['pollo', 'riso', 'olio'])
  assert.equal(r.ignote.length, 0)
  assert.equal(r.totale.kcal, kcalDi('pollo', 150) + kcalDi('riso', 80) + kcalDi('olio', 10))
})

test('quello che non si riconosce torna indietro elencato', () => {
  const r = analizzaTesto('150g di pollo e parmigiana della nonna')
  assert.equal(r.ignote.length, 1)
  assert.equal(r.ignote[0].nome, 'parmigiana della nonna')
  assert.equal(r.totale.kcal, kcalDi('pollo', 150), 'lo sconosciuto non entra nel totale')
})

// --------------------------------------------------------------- i conti

test('somma e resto, col resto che puo andare sotto zero', () => {
  const tot = somma([
    { kcal: 200, proteine: 10, carbo: 20, grassi: 5 },
    { kcal: 300, proteine: 25, carbo: 10, grassi: 12 },
  ])
  assert.deepEqual(tot, { kcal: 500, proteine: 35, carbo: 30, grassi: 17 })
  const r = restante({ kcal: 400, proteine: 50, carbo: 20, grassi: 10 }, tot)
  assert.equal(r.kcal, -100, 'sforare si deve poter dire')
  assert.equal(r.proteine, 15)
  assert.equal(r.carbo, -10)
})

test('le percentuali dei macro si calcolano sulle calorie dei macro', () => {
  // 100g di carbo (400 kcal) + 100g di proteine (400) + 0 grassi.
  assert.deepEqual(percentualiMacro({ proteine: 100, carbo: 100, grassi: 0 }), {
    proteine: 50, carbo: 50, grassi: 0,
  })
  assert.deepEqual(percentualiMacro({ proteine: 0, carbo: 0, grassi: 0 }), {
    proteine: 0, carbo: 0, grassi: 0,
  })
})

test('i macro di un pasto scritto, e il "almeno" quando manca una quantita', () => {
  const pieno = macroDelPasto('Petto di pollo: 150g · Riso (a crudo): 80g')
  assert.equal(pieno.completo, true)
  assert.equal(pieno.totale.kcal, kcalDi('pollo', 150) + kcalDi('riso', 80))

  // "Verdure: a piacere" non e' un buco: non ha grammi perche' non ne vuole.
  const conPorzioneLibera = macroDelPasto('Petto di pollo: 150g · Verdure: a piacere')
  assert.equal(conPorzioneLibera.completo, false)
  assert.equal(conPorzioneLibera.totale.kcal, kcalDi('pollo', 150))
})

test('"l ho mangiato" trasforma un pasto in voci di diario', () => {
  const voci = vociDaPasto({ id: 'p1', nome: 'Pranzo', testo: 'Petto di pollo: 150g · Riso (a crudo): 80g' })
  assert.equal(voci.length, 2)
  assert.ok(voci.every((v) => v.pastoId === 'p1' && v.pasto === 'Pranzo'))
  assert.ok(voci.every((v) => v.stimata === false))
  assert.equal(somma(voci).kcal, kcalDi('pollo', 150) + kcalDi('riso', 80))
})

// --------------------------------------------------------------- l adattamento

test('i pasti rimasti si riscrivono sui macro che restano', () => {
  const pasti = [{ id: 'c', nome: 'Cena', testo: 'Petto di pollo: 100g · Riso (a crudo): 100g' }]
  const previsto = macroDelPasto(pasti[0].testo).totale
  // Ne resta la meta': i grammi si dimezzano.
  const r = adattaPastiRimasti(pasti, {
    kcal: previsto.kcal / 2,
    proteine: previsto.proteine / 2,
    carbo: previsto.carbo / 2,
    grassi: previsto.grassi / 2,
  })
  assert.equal(r.attendibile, true)
  assert.match(r.pasti[0].testo, /Petto di pollo: 50g/)
  assert.match(r.pasti[0].testo, /Riso \(a crudo\): 50g/)
})

test("l'adattamento non si spinge oltre i limiti, e senza niente da leggere si tira indietro", () => {
  const pasti = [{ id: 'c', nome: 'Cena', testo: 'Petto di pollo: 100g' }]
  // Resta pochissimo: i grammi scendono al minimo consentito (x0,25), non a 2.
  const giu = adattaPastiRimasti(pasti, { kcal: 10, proteine: 1, carbo: 0, grassi: 0 })
  assert.match(giu.pasti[0].testo, /Petto di pollo: 25g/)

  // Un pasto di cui non si capisce niente non si tocca.
  const opaco = [{ id: 'x', nome: 'Cena', testo: 'Quello che avanza in frigo' }]
  const r = adattaPastiRimasti(opaco, { kcal: 500, proteine: 40, carbo: 50, grassi: 15 })
  assert.equal(r.attendibile, false)
  assert.equal(r.pasti[0].testo, 'Quello che avanza in frigo')
})

test('le porzioni libere restano libere anche dopo l adattamento', () => {
  const pasti = [{ id: 'c', nome: 'Cena', testo: 'Petto di pollo: 100g · Verdure: a piacere' }]
  const r = adattaPastiRimasti(pasti, { kcal: 100, proteine: 15, carbo: 0, grassi: 1 })
  assert.match(r.pasti[0].testo, /Verdure: a piacere/)
})

// --------------------------------------------------------------- dieta dai numeri

test('coerenza fra calorie dichiarate e macro', () => {
  assert.equal(coerenzaMacro({ kcal: 2000, proteine: 150, carbo: 250, grassi: 80 }).kcalDaMacro, 2320)
  assert.equal(coerenzaMacro({ kcal: 2000, proteine: 150, carbo: 250, grassi: 80 }).coerente, false)
  assert.equal(coerenzaMacro({ kcal: 2320, proteine: 150, carbo: 250, grassi: 80 }).coerente, true)
  // Senza calorie dichiarate non c'e' niente da contraddire.
  assert.equal(coerenzaMacro({ kcal: 0, proteine: 150, carbo: 250, grassi: 80 }).coerente, true)
})

test('i carboidrati che riempiono le calorie rimaste', () => {
  assert.equal(carboDaKcal({ kcal: 2000, proteine: 150, grassi: 80 }), (2000 - 600 - 720) / 4)
  assert.equal(carboDaKcal({ kcal: 500, proteine: 150, grassi: 80 }), 0, 'mai negativi')
})

test('una dieta dai numeri: i numeri restano quelli, i pasti li mette l app', () => {
  const d = dietaDaMacro(
    { nome: 'Test', kcal: 2000, proteine: 150, carbo: 200, grassi: 60, extraAllenamento: 200 },
    {},
  )
  assert.equal(d.fonte, 'esterna', 'i numeri non sono dell app: non li deve ricalcolare')
  assert.equal(d.riposo.kcal, 2000)
  assert.equal(d.riposo.proteine, 150)
  assert.equal(d.riposo.carbo, 200)
  assert.equal(d.allenamento.kcal, 2200)
  assert.equal(d.allenamento.carbo, 250, 'le kcal in piu vanno tutte in carboidrati')
  assert.equal(d.allenamento.proteine, 150)
  assert.ok(d.riposo.pasti.length > 0)
})

test('i pasti generati hanno alternative, e le alternative non si ripetono', () => {
  const pasti = pastiDaMacro({ proteine: 150, carbo: 200, grassi: 60 }, {})
  assert.ok(pasti.length > 0)
  for (const p of pasti) {
    assert.ok(Array.isArray(p.opzioni))
    assert.ok(!p.opzioni.includes(p.testo), 'un alternativa uguale al pasto non e un alternativa')
    assert.equal(new Set(p.opzioni).size, p.opzioni.length)
  }
  assert.ok(pasti.some((p) => p.opzioni.length > 0), 'almeno un pasto deve avere alternative')
})

test('le alternative valgono piu o meno le stesse calorie del pasto principale', () => {
  // E' la garanzia che rende un'alternativa utile invece che pericolosa: se
  // "oppure" costa 400 kcal in piu', chi lo sceglie sfora senza saperlo.
  // Si prova anche con le preferenze accese, perche' e' li' che il generatore
  // ha meno scelta e potrebbe raschiare il fondo.
  for (const pref of [{}, { regime: 'vegetariano' }, { regime: 'vegano' }, { esclusioni: ['lattosio', 'glutine'] }]) {
    for (const p of pastiDaMacro({ proteine: 150, carbo: 200, grassi: 60 }, pref)) {
      const base = macroDelPasto(p.testo).totale
      for (const o of p.opzioni) {
        const alt = macroDelPasto(o).totale
        const scarto = Math.abs(alt.kcal - base.kcal) / base.kcal
        assert.ok(
          scarto <= 0.25,
          `${p.nome} (${JSON.stringify(pref)}): l'alternativa cambia del ${Math.round(scarto * 100)}%`,
        )
      }
    }
  }
})

test('le alternative non propongono il manzo a colazione', () => {
  // Una variante puo' essere giusta sui macro e sbagliata nel piatto: gli
  // elenchi `alt` dei template servono esattamente a questo.
  const colazione = pastiDaMacro({ proteine: 150, carbo: 200, grassi: 60 }, {})[0]
  assert.equal(colazione.nome, 'Colazione')
  for (const o of [colazione.testo, ...colazione.opzioni]) {
    assert.doesNotMatch(o, /Manzo|Merluzzo|Gamberi|Lonza/, `a colazione: ${o}`)
  }
})

// --------------------------------------------------------------- il PDF

test('le alternative del nutrizionista finiscono in opzioni, non nel pasto', () => {
  const { giornate } = parseDietaTesto(
    [
      'GIORNO DI ALLENAMENTO',
      'Colazione: 150g yogurt greco, 60g avena',
      'oppure: 3 fette biscottate con marmellata',
      'in alternativa: 2 uova e 50g di pane',
      'Pranzo: 100g riso, 150g pollo',
    ].join('\n'),
  )
  assert.equal(giornate.length, 1)
  const [colazione, pranzo] = giornate[0].pasti
  assert.equal(colazione.testo, '150g yogurt greco, 60g avena')
  assert.deepEqual(colazione.opzioni, [
    '3 fette biscottate con marmellata',
    '2 uova e 50g di pane',
  ])
  assert.deepEqual(pranzo.opzioni, [])
})

test('un pasto fatto di sole alternative non resta vuoto', () => {
  const { giornate } = parseDietaTesto(
    ['Colazione:', 'Opzione 1: 150g yogurt greco', 'Opzione 2: 2 uova'].join('\n'),
  )
  const colazione = giornate[0].pasti[0]
  assert.equal(colazione.testo, '150g yogurt greco')
  assert.deepEqual(colazione.opzioni, ['2 uova'])
})

test('una "o" a inizio riga NON apre un alternativa', () => {
  const { giornate } = parseDietaTesto(
    ['Pranzo: 150g pollo', 'o di tacchino, con verdure'].join('\n'),
  )
  assert.match(giornate[0].pasti[0].testo, /o di tacchino/)
  assert.deepEqual(giornate[0].pasti[0].opzioni, [])
})
