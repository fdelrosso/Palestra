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

const { consiglioPerPasto, dietaDaMacro, dietaDiOggi, nuovaDieta, pastiDaMacro, rendiAttiva } = await import(
  '../src/lib/dieta.js'
)
const { macroDelPasto } = await import('../src/lib/diario.js')
const { adattaVoce } = await import('../src/lib/alimenti.js')
const { preferenzeVuote } = await import('../src/lib/preferenzeCibo.js')

const OGGI = '2026-09-30'
const dieta = (nome, extra = {}) => nuovaDieta({ nome, dataInizio: '', dataFine: '', ...extra })

test('senza una scelta la dieta di oggi è la prima il cui periodo comprende oggi, come prima', () => {
  const vecchia = dieta('vecchia', { dataFine: '2026-08-31' })
  const a = dieta('a')
  const b = dieta('b')
  assert.equal(dietaDiOggi([vecchia, a, b], OGGI).nome, 'a')
  assert.equal(dietaDiOggi([], OGGI), null)
})

test('vince la dieta resa attiva per ultima', () => {
  const a = dieta('a', { attivataIl: '2026-09-01T10:00:00.000Z' })
  const b = dieta('b', { attivataIl: '2026-09-20T10:00:00.000Z' })
  const c = dieta('c')
  assert.equal(dietaDiOggi([a, b, c], OGGI).nome, 'b')
  const diNuovoA = rendiAttiva(a, new Date('2026-09-30T08:00:00'))
  assert.equal(dietaDiOggi([diNuovoA, b, c], OGGI).nome, 'a')
})

test('una dieta scelta ma col periodo finito lascia il posto alle altre', () => {
  const finita = dieta('finita', { dataFine: '2026-09-15', attivataIl: '2026-09-29T10:00:00.000Z' })
  const altra = dieta('altra')
  assert.equal(dietaDiOggi([finita, altra], OGGI).nome, 'altra')
})

test('rendere attiva una dieta finita la fa ripartire da oggi, senza fine', () => {
  const finita = dieta('finita', { dataInizio: '2026-06-01', dataFine: '2026-08-31' })
  const attiva = rendiAttiva(finita, new Date('2026-09-30T08:00:00'))
  assert.equal(attiva.dataInizio, OGGI)
  assert.equal(attiva.dataFine, '')
  // Una che vale già oggi il suo periodo lo tiene.
  const inCorso = dieta('in corso', { dataInizio: '2026-09-01', dataFine: '2026-12-31' })
  const ancora = rendiAttiva(inCorso, new Date('2026-09-30T08:00:00'))
  assert.equal(ancora.dataInizio, '2026-09-01')
  assert.equal(ancora.dataFine, '2026-12-31')
})

test('"Calorie e macro": la dieta è solo il limite, niente pasti', () => {
  const d = dietaDaMacro({ proteine: 150, carbo: 250, grassi: 70, conPasti: false }, preferenzeVuote())
  assert.equal(d.riposo.pasti.length, 0)
  assert.equal(d.allenamento.pasti.length, 0)
  assert.equal(d.riposo.kcal, 150 * 4 + 250 * 4 + 70 * 9)
  // Chi i pasti li vuole ancora (nessuno chiama più così, ma il default resta).
  assert.equal(dietaDaMacro({ proteine: 150, carbo: 250, grassi: 70 }, preferenzeVuote()).riposo.pasti.length, 5)
})

test('il consiglio di un pasto prende la SUA parte di quello che manca, non tutto', () => {
  const resta = { proteine: 150, carbo: 250, grassi: 70 }
  const colazione = consiglioPerPasto(
    { slot: 'colazione', resta, dopo: ['spuntino', 'pranzo', 'merenda', 'cena'] },
    preferenzeVuote(),
  )
  const cenaUltima = consiglioPerPasto({ slot: 'cena', resta, dopo: [] }, preferenzeVuote())
  const giornata = 150 * 4 + 250 * 4 + 70 * 9
  // A colazione, con tutta la giornata davanti, circa un quinto.
  assert.ok(colazione.obiettivo.kcal < giornata * 0.3, `colazione da ${colazione.obiettivo.kcal} kcal`)
  assert.ok(colazione.obiettivo.kcal > giornata * 0.15, `colazione da ${colazione.obiettivo.kcal} kcal`)
  // A cena, se il resto è fatto, è tutto suo.
  assert.ok(Math.abs(cenaUltima.obiettivo.kcal - giornata) < 10, `cena da ${cenaUltima.obiettivo.kcal} kcal`)
})

test('il piatto consigliato vale davvero quello che dice, a grandi linee', () => {
  const c = consiglioPerPasto(
    { slot: 'pranzo', resta: { proteine: 90, carbo: 120, grassi: 40 }, dopo: ['merenda', 'cena'] },
    preferenzeVuote(),
  )
  const { totale } = macroDelPasto(c.testo, [])
  assert.ok(totale.kcal > 0)
  assert.ok(Math.abs(totale.kcal - c.obiettivo.kcal) / c.obiettivo.kcal < 0.15, `${totale.kcal} contro ${c.obiettivo.kcal}`)
  assert.ok(c.opzioni.length >= 1, 'almeno un\'alternativa')
})

test('a obiettivo raggiunto niente consiglio, e un macro finito non mette alimenti da 5g', () => {
  assert.equal(consiglioPerPasto({ slot: 'cena', resta: { proteine: 2, carbo: 1, grassi: 1 } }, preferenzeVuote()), null)
  const senzaCarbo = consiglioPerPasto({ slot: 'cena', resta: { proteine: 40, carbo: 0, grassi: 15 } }, preferenzeVuote())
  assert.ok(!/patate/i.test(senzaCarbo.testo), senzaCarbo.testo)
})

// ⚠️ I grammi si contavano solo sul macro principale di ogni alimento, e i
// macro "in più" (i grassi del formaggio, i carboidrati dei ceci) si
// sommavano: una giornata generata valeva il 30% in più dell'obiettivo, il
// 70-90% per vegetariani e vegani.
const PREFERENZE = [
  ['nessuna', {}],
  ['vegetariano', { regime: 'vegetariano' }],
  ['vegano', { regime: 'vegano' }],
  ['senza lattosio e glutine', { esclusioni: ['lattosio', 'glutine'] }],
]

test('una giornata generata vale le calorie e le proteine dell obiettivo, con qualsiasi preferenza', () => {
  const T = { proteine: 150, carbo: 200, grassi: 60 }
  const kcal = T.proteine * 4 + T.carbo * 4 + T.grassi * 9
  for (const [nome, pref] of PREFERENZE) {
    const giorno = pastiDaMacro(T, pref)
      .map((p) => macroDelPasto(p.testo).totale)
      .reduce((a, m) => ({ kcal: a.kcal + m.kcal, proteine: a.proteine + m.proteine }), { kcal: 0, proteine: 0 })
    assert.ok(Math.abs(giorno.kcal - kcal) / kcal < 0.08, `${nome}: ${giorno.kcal} kcal su ${kcal}`)
    assert.ok(giorno.proteine >= T.proteine * 0.85, `${nome}: ${Math.round(giorno.proteine)}g di proteine su ${T.proteine}`)
  }
})

test('il consiglio di un vegetariano: niente parmigiano al posto del pollo, e resta nella sua parte', () => {
  const c = consiglioPerPasto(
    { slot: 'pranzo', resta: { proteine: 140, carbo: 220, grassi: 60 }, dopo: ['merenda', 'cena'] },
    { regime: 'vegetariano' },
  )
  assert.doesNotMatch(c.testo, /Parmigiano/, c.testo)
  const { totale } = macroDelPasto(c.testo, [])
  assert.ok(Math.abs(totale.kcal - c.obiettivo.kcal) / c.obiettivo.kcal < 0.15, `${totale.kcal} contro ${c.obiettivo.kcal}`)
})

test('il piano del nutrizionista adattato: un secondo resta un secondo, e le calorie non esplodono', () => {
  for (const [testo, pref] of [
    ['Merluzzo: 200g', { regime: 'vegetariano' }],
    ['Petto di pollo: 150g', { regime: 'vegetariano' }],
    ['Salmone: 150g', { regime: 'vegano' }],
  ]) {
    const r = adattaVoce(testo, pref)
    assert.ok(r.sostituzione, testo)
    assert.doesNotMatch(r.testo, /Yogurt|Skyr|Kefir/, `${testo} → ${r.testo}`)
    const prima = macroDelPasto(testo).totale.kcal
    const dopo = macroDelPasto(r.testo).totale.kcal
    assert.ok(dopo < prima * 1.6, `${testo} (${prima} kcal) → ${r.testo} (${dopo} kcal)`)
  }
})
