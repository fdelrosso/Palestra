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

// Il consiglio sul peso per lo schema di OGGI (lib/carico): i pallini della
// volta scorsa passano da un massimale stimato, così un 5×5 tutto verde non
// diventa "+5%" su un 2×10.
const { conPesoUltimaVolta, consiglioCarico, storicoCarichi, stimaMassimale, tecnicaDi, coloreUltimaVolta, coloreDelloSforzo, cannaDelCarico } =
  await import('../src/lib/carico.js')

const kg = (valore) => ({ tipo: 'kg', valore })
const schema = (serie, rip, carico = null, nota = '') => ({ fasi: [{ serie, rip, carico }], recuperoSec: 120, nota })
const serie = (colori, peso, rip) => colori.map((colore) => ({ colore, kg: peso, rip }))
const tutte = (colore, n) => Array(n).fill(colore)
const storico = (schemaPrima, sets) =>
  storicoCarichi([
    { nome: 'Scheda', completamenti: [{ data: '2026-10-01T10:00:00Z', esercizi: [{ nome: 'Squat', schema: schemaPrima, sets }] }] },
  ])
const consiglio = (carichi, opts) => consiglioCarico('Squat', carichi, opts)

// Rimettere il consiglio come peso di oggi non deve far comparire un altro
// "Usa": il numero è un punto fermo.
function stabile(carichi, opts, c) {
  const oggi = { ...opts.schemaOggi, fasi: opts.schemaOggi.fasi.map((f) => ({ ...f, carico: c.caricoSuggerito })) }
  const dopo = consiglio(carichi, { ...opts, schemaOggi: oggi, caricoAttuale: c.caricoSuggerito })
  assert.deepEqual(dopo.caricoSuggerito, c.caricoSuggerito)
}

const cinqueVerdi = storico(schema(5, 5, kg(100)), serie(tutte('verde', 5), 100, 5))

test('5×5 a 100 kg tutto verde, oggi 2×10: si scende, non si sale a 105', () => {
  const opts = { schemaOggi: schema(2, 10) }
  const c = consiglio(cinqueVerdi, opts)
  assert.equal(c.schemaCambiato, true)
  assert.ok(c.caricoSuggerito.valore < 100 && c.caricoSuggerito.valore >= 85, c.caricoSuggerito.valore)
  assert.match(c.testo, /Oggi è 2×10, con più ripetizioni e meno serie/)
  stabile(cinqueVerdi, opts, c)
})

test('con lo stesso schema i conti sono quelli di sempre', () => {
  // Tutto verde: +5% (un passo pieno).
  assert.equal(consiglio(cinqueVerdi, { schemaOggi: schema(5, 5, kg(100)) }).caricoSuggerito.valore, 105)
  // Senza lo schema di oggi si dà per uguale.
  assert.equal(consiglio(cinqueVerdi).caricoSuggerito.valore, 105)
  // Due verdi e una gialla: un passo.
  const quasi = storico(schema(3, 10, kg(60)), serie(['verde', 'verde', 'giallo'], 60, 10))
  assert.equal(consiglio(quasi, { schemaOggi: schema(3, 10, kg(60)) }).caricoSuggerito.valore, 62.5)
  // Gialle: si resta.
  const gialle = storico(schema(3, 10, kg(60)), serie(tutte('giallo', 3), 60, 10))
  const g = consiglio(gialle, { schemaOggi: schema(3, 10, kg(60)) })
  assert.equal(g.caricoSuggerito.valore, 60)
  assert.equal(g.azione, 'mantieni')
  // Rosse, e le ripetizioni non sono arrivate: giù, e più di un passo.
  const dure = storico(schema(3, 10, kg(60)), [8, 7, 6].map((rip) => ({ colore: 'rosso', kg: 60, rip })))
  const d = consiglio(dure, { schemaOggi: schema(3, 10, kg(60)) })
  assert.equal(d.azione, 'riduci')
  assert.ok(d.caricoSuggerito.valore <= 55)
})

test('il peso della scheda è il riferimento: si tiene se è vicino, si corregge se è lontano', () => {
  // Vicino alla stima: va bene quello della scheda.
  const vicino = consiglio(cinqueVerdi, { schemaOggi: schema(2, 10, kg(92.5)) })
  assert.equal(vicino.caricoSuggerito.valore, 92.5)
  assert.equal(vicino.azione, 'mantieni')
  assert.match(vicino.testo, /: 92,5kg va bene\./)
  // Lo stesso 100 del 5×5 su un 2×10: troppi.
  const tanti = consiglio(cinqueVerdi, { schemaOggi: schema(2, 10, kg(100)) })
  assert.equal(tanti.azione, 'riduci')
  assert.match(tanti.testo, /prova 92,5kg, 100kg sono tanti\./)
  // A schema uguale, un passo in più del PT su una volta "giusta" si accetta;
  // un salto di due no.
  const gialle = storico(schema(3, 10, kg(60)), serie(tutte('giallo', 3), 60, 10))
  assert.equal(consiglio(gialle, { schemaOggi: schema(3, 10, kg(62.5)) }).caricoSuggerito.valore, 62.5)
  const salto = consiglio(gialle, { schemaOggi: schema(3, 10, kg(65)) })
  assert.equal(salto.caricoSuggerito.valore, 60)
  assert.match(salto.testo, /resta su 60kg, non 65kg\./)
})

test('serie in più pesano, serie in meno non regalano niente', () => {
  const gialle = storico(schema(3, 10, kg(100)), serie(tutte('giallo', 3), 100, 10))
  const piu = consiglio(gialle, { schemaOggi: schema(7, 10) }).caricoSuggerito.valore
  const meno = consiglio(gialle, { schemaOggi: schema(1, 10) }).caricoSuggerito.valore
  assert.ok(piu < 100, piu)
  assert.equal(meno, 100)
})

test('le tecniche d’intensità: cedimento più pesante, fermo e discesa lenta più leggeri, il drop', () => {
  assert.equal(tecnicaDi(schema(3, 10, null, 'Ultima a cedimento')).inCanna, 0)
  assert.equal(tecnicaDi(schema(3, 10, null, 'fermo 2" sotto')).fattore, 0.9)
  assert.equal(tecnicaDi(schema(3, 10, null, 'eccentrica in 3 secondi')).id, 'lento')
  // "Lento avanti" è un esercizio, non una tecnica.
  assert.equal(tecnicaDi(schema(3, 10, null, 'come il lento avanti')).id, '')

  const base = consiglio(cinqueVerdi, { schemaOggi: schema(5, 5) }).caricoSuggerito.valore
  const cedimento = consiglio(cinqueVerdi, { schemaOggi: schema(5, 5, null, 'a cedimento') })
  const fermo = consiglio(cinqueVerdi, { schemaOggi: schema(5, 5, null, 'fermo al petto') })
  assert.ok(cedimento.caricoSuggerito.valore > base)
  assert.ok(fermo.caricoSuggerito.valore < base)
  assert.match(cedimento.testo, /Oggi è 5×5 a cedimento/)
  const drop = consiglio(cinqueVerdi, { schemaOggi: schema(3, 10, null, 'drop set') })
  assert.match(drop.testo, /Nel drop togli circa un quinto/)
})

test('RPE, RIR, RM e percentuale diventano un peso in kg', () => {
  const rpe8 = consiglio(cinqueVerdi, { schemaOggi: schema(3, 8, { tipo: 'rpe', valore: 8 }) })
  const rpe10 = consiglio(cinqueVerdi, { schemaOggi: schema(3, 8, { tipo: 'rpe', valore: 10 }) })
  assert.equal(rpe8.caricoSuggerito.tipo, 'kg')
  assert.ok(rpe10.caricoSuggerito.valore > rpe8.caricoSuggerito.valore)
  assert.match(rpe8.testo, /a RPE 8/)
  const rir0 = consiglio(cinqueVerdi, { schemaOggi: schema(3, 8, { tipo: 'rir', valore: 0 }) })
  assert.equal(rir0.caricoSuggerito.valore, rpe10.caricoSuggerito.valore)
  const pct = consiglio(cinqueVerdi, { schemaOggi: schema(3, 5, { tipo: 'pct', valore: 70 }) })
  assert.ok(pct.caricoSuggerito.valore > 80 && pct.caricoSuggerito.valore < 100)
})

test('senza kg o senza ripetizioni: niente numeri inventati', () => {
  const corpoLibero = storico(schema(3, 10), serie(tutte('verde', 3), undefined, 10))
  assert.equal(stimaMassimale(corpoLibero.get('squat')[0]), null)
  const uguale = consiglio(corpoLibero, { schemaOggi: schema(3, 10) })
  assert.equal(uguale.caricoSuggerito, null)
  assert.match(uguale.testo, /aggiungi peso/)
  const diverso = consiglio(corpoLibero, { schemaOggi: schema(3, 6) })
  assert.equal(diverso.caricoSuggerito, null)
  assert.equal(diverso.titolo, 'Oggi lo schema cambia')
  // A tempo, stesso schema: il passo di sempre sul peso che c'era.
  const plank = storico(schema(3, { sec: 30 }, kg(10)), serie(tutte('verde', 3), 10))
  assert.equal(consiglio(plank, { schemaOggi: schema(3, { sec: 30 }, kg(10)) }).caricoSuggerito.valore, 11)
})

test('il consiglio resta fermo dopo "Usa", qualunque sia lo schema', () => {
  const gialle = storico(schema(3, 10, kg(60)), serie(tutte('giallo', 3), 60, 10))
  for (const [carichi, oggi] of [
    [cinqueVerdi, schema(2, 10)],
    [cinqueVerdi, schema(2, 10, kg(80))],
    [cinqueVerdi, schema(3, 3, kg(100))],
    [cinqueVerdi, schema(5, 5, kg(100), 'fermo')],
    [cinqueVerdi, schema(3, 8, { tipo: 'rpe', valore: 8 })],
    [gialle, schema(3, 10, kg(65))],
    [gialle, schema(4, 12, kg(60))],
  ]) {
    const opts = { schemaOggi: oggi }
    stabile(carichi, opts, consiglio(carichi, opts))
  }
})

test('rosso/giallo/rosso e oggi uno schema non più leggero: si scende, non "va bene"', () => {
  for (const [peso, oggi, atteso] of [
    [40, schema(4, 10, kg(40)), 37.5],
    [40, schema(3, 12, kg(40)), 37.5],
    [10, schema(3, 12, kg(10)), 9],
  ]) {
    const carichi = storico(schema(3, 10, kg(peso)), serie(['rosso', 'giallo', 'rosso'], peso, 10))
    const opts = { schemaOggi: oggi }
    const c = consiglio(carichi, opts)
    assert.equal(c.azione, 'riduci')
    assert.equal(c.caricoSuggerito.valore, atteso)
    stabile(carichi, opts, c)
  }
})

test("coloreUltimaVolta: la stessa serie dell'allenamento piu' recente", () => {
  const carichi = storicoCarichi([
    {
      nome: 'Scheda',
      completamenti: [
        { data: '2026-09-01T10:00:00Z', esercizi: [{ nome: 'Squat', schema: schema(3, 5), sets: serie(tutte('rosso', 3), 80, 5) }] },
        { data: '2026-10-01T10:00:00Z', esercizi: [{ nome: 'Squat', schema: schema(3, 5), sets: serie(['verde', 'giallo', ''], 80, 5) }] },
      ],
    },
  ])
  assert.equal(coloreUltimaVolta('squat', carichi, 0), 'verde')
  assert.equal(coloreUltimaVolta('Squat', carichi, 1), 'giallo')
  assert.equal(coloreUltimaVolta('Squat', carichi, 2), null) // non chiusa
  assert.equal(coloreUltimaVolta('Squat', carichi, 7), null) // quella volta non c'era
  assert.equal(coloreUltimaVolta('Panca', carichi, 0), null)
})

// A RIR/RPE lo sforzo lo fissa la scheda: le serie si chiudono col colore
// del RIR (coloreDelloSforzo), con kg e ripetizioni (WorkoutSession, SerieASforzo), e il peso lo decidono le
// ripetizioni, non i colori.
test('a RIR/RPE parlano le ripetizioni: in cima al range si sale, in fondo si resta', () => {
  const rir2 = { tipo: 'rir', valore: 2 }
  const oggi = schema(3, { min: 6, max: 8 }, rir2)
  const alto = consiglio(storico(oggi, serie(tutte('giallo', 3), 50, 8)), { schemaOggi: oggi })
  assert.equal(alto.azione, 'aumenta')
  assert.equal(alto.caricoSuggerito.valore, 52.5)
  assert.match(alto.testo, /hai chiuso 8, 8 e 8 ripetizioni a RIR 2/)
  assert.doesNotMatch(alto.testo, /punto giusto/)
  const basso = consiglio(storico(oggi, serie(tutte('giallo', 3), 50, 6)), { schemaOggi: oggi })
  assert.equal(basso.caricoSuggerito.valore, 50)
  // RPE 8 è RIR 2: stesso conto.
  const rpe = { ...oggi, fasi: [{ ...oggi.fasi[0], carico: { tipo: 'rpe', valore: 8 } }] }
  assert.equal(consiglio(storico(rpe, serie(tutte('giallo', 3), 50, 8)), { schemaOggi: rpe }).caricoSuggerito.valore, 52.5)
})

test('a RIR senza kg segnati (gli allenamenti di prima) i colori valgono come sempre', () => {
  const oggi = schema(3, 8, { tipo: 'rir', valore: 2 })
  const c = consiglio(storico(oggi, tutte('verde', 3).map((colore) => ({ colore }))), { schemaOggi: oggi })
  assert.equal(c.azione, 'aumenta')
  assert.match(c.testo, /facili/)
})

test('il colore di una serie a RIR/RPE viene dallo sforzo della scheda', () => {
  const colore = (tipo, valore) => coloreDelloSforzo(cannaDelCarico({ tipo, valore }))
  assert.equal(colore('rir', 0), 'rosso')
  assert.equal(colore('rir', 1), 'rosso')
  assert.equal(colore('rir', 2), 'giallo')
  assert.equal(colore('rir', 3), 'giallo')
  assert.equal(colore('rir', 10), 'verde')
  assert.equal(colore('rpe', 10), 'rosso')
  assert.equal(colore('rpe', 8.5), 'giallo')
  assert.equal(colore('rpe', 6), 'verde')
  // 4 ripetizioni su un 6–8: non ce l'hai fatta, rossa anche a RIR 2 o 10.
  assert.equal(coloreDelloSforzo(2, 4, 6), 'rosso')
  assert.equal(coloreDelloSforzo(10, 4, 6), 'rosso')
  assert.equal(coloreDelloSforzo(2, 6, 6), 'giallo')
  // 10 su un 6–8: il peso era leggero, verde anche a RIR 0.
  assert.equal(coloreDelloSforzo(2, 10, 6, 8), 'verde')
  assert.equal(coloreDelloSforzo(0, 10, 6, 8), 'verde')
  assert.equal(coloreDelloSforzo(2, 8, 6, 8), 'giallo')
})

test('a RIR sotto il range si conta il cedimento: zero in canna, non il RIR', () => {
  const oggi = schema(3, { min: 6, max: 8 }, { tipo: 'rir', valore: 2 })
  const voce = storico(oggi, serie(tutte('rosso', 3), 50, 4)).get('squat')[0]
  // 50 × (1 + 4/30), non 50 × (1 + 6/30).
  assert.equal(Math.round(stimaMassimale(voce) * 10) / 10, 56.7)
  assert.equal(consiglio(storico(oggi, serie(tutte('rosso', 3), 50, 4)), { schemaOggi: oggi }).azione, 'riduci')
})

test('a RIR 0 le serie rosse non tirano giù il peso: parlano le ripetizioni', () => {
  const oggi = schema(3, { min: 6, max: 8 }, { tipo: 'rir', valore: 0 })
  const c = consiglio(storico(oggi, serie(tutte('rosso', 3), 50, 8)), { schemaOggi: oggi })
  assert.equal(c.azione, 'aumenta')
  // E a RIR 4 il verde e' chiesto, non "fili liscio".
  const facile = schema(3, 8, { tipo: 'rir', valore: 4 })
  const due = storicoCarichi([
    { nome: 'S', completamenti: ['2026-10-01', '2026-10-08'].map((data) => ({ data, esercizi: [{ nome: 'Squat', schema: facile, sets: serie(tutte('verde', 3), 50, 8) }] })) },
  ])
  assert.equal(consiglio(due, { schemaOggi: facile }).cambiaStile, false)
})

test('a RIR, sceso di peso a metà: il testo dice ogni serie col suo peso', () => {
  const oggi = schema(3, { min: 6, max: 8 }, { tipo: 'rir', valore: 2 })
  const sets = [
    { colore: 'giallo', kg: 52.5, rip: 8 },
    { colore: 'giallo', kg: 52.5, rip: 6 },
    { colore: 'giallo', kg: 45, rip: 8 },
  ]
  const c = consiglio(storico(oggi, sets), { schemaOggi: oggi })
  assert.match(c.testo, /hai chiuso 8×52,5, 6×52,5 e 8×45kg a RIR 2/)
  assert.equal(c.caricoSuggerito.valore, 52.5)
})

test('il peso di base è quello dell’ultima volta, non quello della scheda', () => {
  const carichi = storico(schema(3, 8, kg(60)), serie(tutte('verde', 3), 70, 8))
  // In scheda 60 (o niente): si parte dai 70 segnati.
  assert.deepEqual(conPesoUltimaVolta('Squat', carichi, schema(3, 8, kg(60))).fasi[0].carico, kg(70))
  assert.deepEqual(conPesoUltimaVolta('Squat', carichi, schema(3, 8)).fasi[0].carico, kg(70))
  // Mai fatto, o a RPE: resta la scheda.
  assert.deepEqual(conPesoUltimaVolta('Panca', carichi, schema(3, 8, kg(60))).fasi[0].carico, kg(60))
  const rpe = { tipo: 'rpe', valore: 8 }
  assert.deepEqual(conPesoUltimaVolta('Squat', carichi, schema(3, 8, rpe)).fasi[0].carico, rpe)
})
