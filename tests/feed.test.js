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

const { DURATE, contieneEsercizio, filtraFeed, gruppiDi, quantiFiltri, staNellaDurata } =
  await import('../src/lib/feed.js')

const min = (m) => m * 60

// ------------------------------------------------------------- i gruppi
test('i gruppi si prendono dalla scheda, e si indovinano dal nome se mancano', () => {
  const scritti = gruppiDi({ esercizi: [{ nome: 'Qualcosa', gruppo: 'petto' }] })
  assert.ok(scritti.has('petto'))

  // Senza `gruppo` scritto — le schede importate dal messaggio del PT sono
  // così — si ricava dal nome.
  const indovinati = gruppiDi({ esercizi: [{ nome: 'Panca piana con bilanciere' }] })
  assert.ok(indovinati.has('petto'), 'la panca piana è petto')
})

test('un allenamento senza esercizi non tocca nessun gruppo', () => {
  assert.equal(gruppiDi({ esercizi: [] }).size, 0)
  assert.equal(gruppiDi({}).size, 0)
  assert.equal(gruppiDi(null).size, 0)
})

// ------------------------------------------------------------ le durate
test('le fasce di durata non si sovrappongono ai bordi in modo ambiguo', () => {
  const a45 = { durataSec: min(45) }
  // 45 minuti esatti sta sia in "fino a 45" sia in "45-75": è voluto, il bordo
  // appartiene a tutte e due le fasce che lo nominano.
  assert.equal(staNellaDurata(a45, ['corto']), true)
  assert.equal(staNellaDurata(a45, ['medio']), true)
  assert.equal(staNellaDurata({ durataSec: min(80) }, ['medio']), false)
  assert.equal(staNellaDurata({ durataSec: min(80) }, ['lungo']), true)
})

test('senza filtro di durata passano tutti, anche quelli senza durata', () => {
  assert.equal(staNellaDurata({ durataSec: 0 }, []), true)
  assert.equal(staNellaDurata({}, []), true)
})

test('un allenamento senza durata non entra in nessuna fascia', () => {
  // ⚠️ Se passasse, comparirebbe sotto OGNI filtro di durata e il filtro non
  // vorrebbe più dire niente.
  for (const f of DURATE) {
    assert.equal(staNellaDurata({ durataSec: null }, [f.id]), false, f.id)
    assert.equal(staNellaDurata({}, [f.id]), false, f.id)
  }
})

// --------------------------------------------------------- per esercizio
test("l'esercizio si cerca per pezzi di nome", () => {
  const v = { esercizi: [{ nome: 'Panca piana con bilanciere' }, { nome: 'Croci ai cavi' }] }
  assert.equal(contieneEsercizio(v, 'panca'), true)
  assert.equal(contieneEsercizio(v, 'PANCA PIANA'), true)
  assert.equal(contieneEsercizio(v, 'croci'), true)
  assert.equal(contieneEsercizio(v, 'stacco'), false)
})

test('una ricerca vuota non filtra niente', () => {
  const v = { esercizi: [{ nome: 'Stacco da terra' }] }
  assert.equal(contieneEsercizio(v, ''), true)
  assert.equal(contieneEsercizio(v, '   '), true)
})

// -------------------------------------------------------------- tutti/amici
const VOCI = [
  { utenteId: 'io', esercizi: [{ nome: 'Panca piana', gruppo: 'petto' }], durataSec: min(40) },
  { utenteId: 'amico', esercizi: [{ nome: 'Stacco', gruppo: 'schiena' }], durataSec: min(60) },
  { utenteId: 'estraneo', esercizi: [{ nome: 'Squat', gruppo: 'gambe' }], durataSec: min(90) },
]

test('"tutti" mostra tutto quello che è arrivato', () => {
  assert.equal(filtraFeed(VOCI, { chi: 'tutti' }).length, 3)
})

test('"amici" tiene gli amici E i propri', () => {
  const r = filtraFeed(VOCI, { chi: 'amici', amiciIds: ['amico'], ioId: 'io' })
  assert.deepEqual(
    r.map((v) => v.utenteId),
    ['io', 'amico'],
  )
})

test('senza amici, "amici" mostra comunque i propri', () => {
  // ⚠️ Una schermata vuota al primo avvio sembra un guasto, non una scelta.
  const r = filtraFeed(VOCI, { chi: 'amici', amiciIds: [], ioId: 'io' })
  assert.deepEqual(
    r.map((v) => v.utenteId),
    ['io'],
  )
})

// --------------------------------------------------------- tutto insieme
test('i filtri si sommano, non si sostituiscono', () => {
  const r = filtraFeed(VOCI, { chi: 'tutti', gruppi: ['petto', 'schiena'], durate: ['medio'] })
  // petto sta sotto i 45 min, quindi resta solo la schiena a 60.
  assert.deepEqual(
    r.map((v) => v.utenteId),
    ['amico'],
  )
})

test("l'ordine di arrivo non si tocca: il feed resta dal più recente", () => {
  const r = filtraFeed(VOCI, {})
  assert.deepEqual(
    r.map((v) => v.utenteId),
    ['io', 'amico', 'estraneo'],
  )
})

test('nessun filtro acceso: passa tutto', () => {
  assert.equal(filtraFeed(VOCI, {}).length, 3)
  assert.equal(filtraFeed(VOCI).length, 3)
})

test('il conteggio dei filtri accesi serve al pallino', () => {
  assert.equal(quantiFiltri({}), 0)
  assert.equal(quantiFiltri({ gruppi: ['petto'], durate: ['corto'] }), 2)
  assert.equal(quantiFiltri({ esercizio: 'panca' }), 1)
  assert.equal(quantiFiltri({ esercizio: '   ' }), 0)
})
