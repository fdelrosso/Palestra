import test from 'node:test'
import assert from 'node:assert/strict'

const {
  daStringhe,
  normalizzaSchema,
  numeroSerie,
  serieEspanse,
  formatSerieRip,
  formatCarico,
  formattaSecondi,
  leggiRip,
  leggiCarico,
  schemaInTesto,
  kgAlzati,
  faseDiSerie,
  conCaricoFase,
  schemaHaContenuto,
} = await import('../src/lib/schema.js')

const kg = (valore, extra = {}) => ({ tipo: 'kg', valore, ...extra })

test('i dati vecchi diventano numeri', () => {
  assert.deepEqual(
    daStringhe({ serie: '4', ripetizioni: '8-10', carico: '80kg', recupero: '1,30min', nota: '' }),
    { fasi: [{ serie: 4, rip: { min: 8, max: 10 }, carico: kg(80) }], recuperoSec: 90, nota: '' },
  )
  assert.deepEqual(daStringhe({ serie: '3', ripetizioni: 'max', recupero: '1,15min' }).recuperoSec, 75)
  assert.equal(daStringhe({ ripetizioni: 'cedimento' }).fasi[0].rip, 'max')
  assert.deepEqual(daStringhe({ carico: '12rm' }).fasi[0].carico, { tipo: 'rm', valore: 12 })
  assert.deepEqual(daStringhe({ carico: '70%' }).fasi[0].carico, { tipo: 'pct', valore: 70 })
  assert.deepEqual(daStringhe({ carico: 'RPE 8' }).fasi[0].carico, { tipo: 'rpe', valore: 8 })
  assert.deepEqual(daStringhe({ carico: '2x20 kg' }).fasi[0].carico, kg(20, { coppia: true }))
  assert.deepEqual(daStringhe({ carico: '42,5kg' }).fasi[0].carico, kg(42.5))
  assert.equal(daStringhe({ serie: '4 giri' }).fasi[0].serie, 4)
  assert.deepEqual(daStringhe({ ripetizioni: '30"' }).fasi[0].rip, { sec: 30 })
  assert.deepEqual(daStringhe({ ripetizioni: '10 per lato' }).fasi[0], {
    serie: null,
    rip: 10,
    carico: null,
    perLato: true,
  })
})

test('quello che non è un numero finisce nella nota', () => {
  const s = daStringhe({ serie: '3', ripetizioni: '12', carico: 'elastico rosso', recupero: 'a piacere', nota: 'lento' })
  assert.equal(s.fasi[0].carico, null)
  assert.equal(s.recuperoSec, null)
  assert.equal(s.nota, 'lento · elastico rosso · rec a piacere')
})

test('piramidi e fasi scritte serie per serie', () => {
  const piramide = daStringhe({ serie: '3', ripetizioni: '12/10/8', carico: '60/70/80kg' })
  assert.deepEqual(piramide.fasi, [{ serie: 3, rip: [12, 10, 8], carico: [kg(60), kg(70), kg(80)] }])
  assert.equal(formatSerieRip(piramide), '3×12/10/8')
  assert.equal(formatCarico(piramide), '60/70/80kg')

  const military = daStringhe({ serie: '5', ripetizioni: '5/5/5/2/2', carico: '80kg/80kg/80kg/90kg/90kg' })
  assert.deepEqual(military.fasi, [
    { serie: 3, rip: 5, carico: kg(80) },
    { serie: 2, rip: 2, carico: kg(90) },
  ])
  assert.equal(formatSerieRip(military), '3×5 + 2×2')
  assert.equal(formatCarico(military), '80kg + 90kg')
  assert.equal(faseDiSerie(military, 3), 1)

  // "15/12" su 4 serie non dice come si divide: resta com'è.
  const s = daStringhe({ serie: '4', ripetizioni: '15/12' })
  assert.deepEqual(s.fasi, [{ serie: 4, rip: [15, 12], carico: null }])
  assert.deepEqual(serieEspanse(s).map((x) => x.rip), [15, 12, 12, 12])
})

test('la forma nuova passa così com’è', () => {
  const s = { fasi: [{ serie: 3, rip: 10, carico: null }], recuperoSec: 60, nota: '' }
  assert.equal(normalizzaSchema(s), s)
  assert.equal(numeroSerie(s), 3)
  assert.equal(numeroSerie(normalizzaSchema(null)), 1)
})

test('formattazione', () => {
  assert.equal(formattaSecondi(45), '45"')
  assert.equal(formattaSecondi(120), "2'")
  assert.equal(formattaSecondi(75), "1'15\"")
  assert.equal(
    schemaInTesto({ fasi: [{ serie: 4, rip: { min: 8, max: 10 }, carico: kg(80) }], recuperoSec: 90, nota: '' }),
    "4x8-10 80kg rec 1'30\"",
  )
})

test('lettura di pezzi', () => {
  assert.deepEqual(leggiRip('12 lenti'), { rip: 12, perLato: false, resto: 'lenti' })
  assert.deepEqual(leggiCarico('80kg per lato'), { carico: kg(80), resto: 'per lato' })
  assert.equal(kgAlzati(kg(20, { coppia: true })), 40)
  assert.equal(kgAlzati({ tipo: 'rm', valore: 12 }), null)
})

test('cambiare il carico di una fase', () => {
  const s = daStringhe({ serie: '5', ripetizioni: '5/5/5/2/2', carico: '80kg' })
  const n = conCaricoFase(s, 1, kg(95))
  assert.deepEqual(n.fasi.map((f) => f.carico), [kg(80), kg(95)])
  assert.equal(schemaHaContenuto(normalizzaSchema(null)), false)
  assert.equal(schemaHaContenuto(n), true)
})

test('formatSerieRip: un campo svuotato nell\'editor non scrive "null" né 0', () => {
  const s = (rip) => formatSerieRip({ fasi: [{ serie: 3, rip, carico: null }] })
  assert.equal(s({ min: null, max: 10 }), '3×10')
  assert.equal(s({ min: 8, max: null }), '3×8')
  assert.equal(s({ sec: null }), '3 serie')
})
