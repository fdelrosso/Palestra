// tests/circuiti.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CIRCUITO_INIZIALE,
  PRONTI_SEC,
  allineaCircuiti,
  circuitoChiuso,
  circuitoDaEmom,
  conOrologio,
  esercizioDelMinuto,
  intervalli,
  nomeCircuito,
  posizioneCircuito,
  sciogliCircuito,
  serieCircuito,
  statoOrologio,
  testoCircuito,
  turnoCircuito,
  vistaCircuito,
} from '../src/lib/circuiti.js'
import { normalizzaScheda } from '../src/data/model.js'

const EMOM = { tipo: 'emom', ogniSec: 60, minuti: 12 }
const TABATA = { tipo: 'tabata', lavoroSec: 20, riposoSec: 10, giri: 8 }
const AMRAP = { tipo: 'amrap', minuti: 12 }
const FORTIME = { tipo: 'fortime', giri: 3, capMinuti: 20 }
const GIRI = { tipo: 'giri', giri: 3, recuperoSec: 90 }
const es = (id, extra = {}) => ({
  id,
  nome: id,
  schemaBase: { fasi: [{ serie: null, rip: 10, carico: null }], recuperoSec: 60, nota: '' },
  ...extra,
})
const t0 = 1_000_000
const a = (c, sec) => statoOrologio(c, t0, t0 + (PRONTI_SEC + sec) * 1000)

test('nomi, valori di base, chi ha l’orologio', () => {
  assert.equal(nomeCircuito('fortime'), 'For time')
  assert.equal(nomeCircuito('giri'), 'Circuito')
  assert.deepEqual(CIRCUITO_INIZIALE.tabata, TABATA)
  assert.equal(conOrologio(GIRI), false)
  assert.equal(conOrologio(AMRAP), true)
})

test('il campo vecchio emom diventa circuito', () => {
  const e = circuitoDaEmom({ id: 'A', emom: { ogniSec: 60, minuti: 12, minutiFatti: 9 } })
  assert.deepEqual(e, { id: 'A', circuito: { tipo: 'emom', ogniSec: 60, minuti: 12, intervalliFatti: 9 } })
  const x = { id: 'B' }
  assert.equal(circuitoDaEmom(x), x)
})

test('normalizzaScheda: anche gli allenamenti salvati col vecchio `emom` passano a `circuito`', () => {
  const s = normalizzaScheda({
    completamenti: [{ data: '2026-11-01', esercizi: [{ id: 'A', emom: { ogniSec: 60, minuti: 12, minutiFatti: 9 } }] }],
  })
  const e = s.completamenti[0].esercizi[0]
  assert.equal(e.emom, undefined)
  assert.deepEqual(e.circuito, { tipo: 'emom', ogniSec: 60, minuti: 12, intervalliFatti: 9 })
})

test('serie per tipo', () => {
  assert.deepEqual([0, 1].map((k) => serieCircuito(EMOM, 2, k)), [6, 6])
  assert.deepEqual([0, 1, 2].map((k) => serieCircuito(TABATA, 3, k)), [3, 3, 2])
  assert.equal(serieCircuito(AMRAP, 2, 0), null)
  assert.equal(serieCircuito(FORTIME, 2, 1), 3)
  assert.equal(serieCircuito(GIRI, 2, 1), 3)
  assert.equal(intervalli(TABATA), 8)
  assert.deepEqual(esercizioDelMinuto(2, 3), { k: 1, j: 1 })
})

test("l'orologio dell'EMOM", () => {
  assert.deepEqual(statoOrologio(EMOM, t0, t0 + 2000), { fase: 'pronti', numero: 3, intervallo: 0, finito: false })
  assert.deepEqual(a(EMOM, 59.5), { fase: 'lavoro', numero: 1, intervallo: 0, finito: false })
  assert.deepEqual(a(EMOM, 60), { fase: 'lavoro', numero: 60, intervallo: 1, finito: false })
  assert.deepEqual(a(EMOM, 720), { fase: 'fine', numero: 0, intervallo: 12, finito: true })
})

test("l'orologio del Tabata: lavoro e riposo", () => {
  assert.deepEqual(a(TABATA, 0), { fase: 'lavoro', numero: 20, intervallo: 0, finito: false })
  assert.deepEqual(a(TABATA, 21), { fase: 'riposo', numero: 9, intervallo: 0, finito: false })
  assert.deepEqual(a(TABATA, 30), { fase: 'lavoro', numero: 20, intervallo: 1, finito: false })
  assert.deepEqual(a(TABATA, 240), { fase: 'fine', numero: 0, intervallo: 8, finito: true })
})

test("l'orologio di AMRAP (alla rovescia) e For time (in avanti, col cap)", () => {
  assert.deepEqual(a(AMRAP, 100), { fase: 'corre', numero: 620, intervallo: null, finito: false })
  assert.deepEqual(a(AMRAP, 720), { fase: 'fine', numero: 0, intervallo: null, finito: true })
  assert.deepEqual(a(FORTIME, 100.4), { fase: 'corre', numero: 100, intervallo: null, finito: false })
  assert.deepEqual(a(FORTIME, 1200), { fase: 'fine', numero: 1200, intervallo: null, finito: true })
  assert.equal(a({ tipo: 'fortime', giri: 3, capMinuti: null }, 99999).finito, false)
})

test('chiuso', () => {
  assert.equal(circuitoChiuso(EMOM), false)
  assert.equal(circuitoChiuso({ ...EMOM, intervalliFatti: 4 }), true)
  assert.equal(circuitoChiuso({ ...AMRAP, giriFatti: 0 }), true)
})

test('il testo, coi risultati', () => {
  assert.equal(testoCircuito(EMOM), "EMOM 12' · ogni 1'")
  assert.equal(testoCircuito({ ...EMOM, minuti: null }), "EMOM · ogni 1' · finché ce la faccio")
  assert.equal(testoCircuito({ ...EMOM, minuti: null, intervalliFatti: 9 }), "EMOM · ogni 1' · fino al 9° minuto")
  assert.equal(testoCircuito(TABATA), 'Tabata 20"/10" × 8')
  assert.equal(testoCircuito({ ...TABATA, intervalliFatti: 5 }), 'Tabata 20"/10" × 8 · fino al 5° giro')
  assert.equal(testoCircuito(AMRAP), "AMRAP 12'")
  assert.equal(testoCircuito({ ...AMRAP, giriFatti: 7, ripExtra: 5 }), "AMRAP 12' · 7 giri + 5")
  assert.equal(testoCircuito(FORTIME), "For time · 3 giri · cap 20'")
  assert.equal(testoCircuito({ ...FORTIME, giriFatti: 3, tempoSec: 754 }), "For time · 3 giri · 12'34\"")
  assert.equal(testoCircuito({ ...FORTIME, giriFatti: 2, tempoSec: 1200 }), "For time · 2 giri su 3 · cap 20'")
  assert.equal(testoCircuito(GIRI), 'Circuito · 3 giri · rec 1\'30"')
  assert.equal(turnoCircuito(2, 0), '1° di 2')
  assert.equal(turnoCircuito(1, 0), null)
})

test('allineaCircuiti: serie, recupero, reps di base', () => {
  const lista = [es('X'), es('A', { circuito: TABATA }), es('B', { insiemeAlPrecedente: true, schemaBase: { fasi: [{ serie: null, rip: null, carico: null }], recuperoSec: null, nota: '' } })]
  const out = allineaCircuiti(lista)
  assert.equal(out[0], lista[0])
  assert.equal(out[1].schemaBase.fasi[0].serie, 4)
  assert.equal(out[1].schemaBase.recuperoSec, null)
  assert.equal(out[2].schemaBase.fasi[0].rip, 'max', 'nel Tabata, senza reps, max')
  assert.deepEqual(allineaCircuiti(out), out)
  const giri = allineaCircuiti([es('A', { circuito: GIRI }), es('B', { insiemeAlPrecedente: true })])
  assert.deepEqual(giri.map((e) => e.schemaBase.fasi[0].serie), [3, 3])
  assert.deepEqual(giri.map((e) => e.schemaBase.recuperoSec), [null, 90], 'A giri: il recupero sull’ultimo')
})

test('posizioneCircuito, sciogliCircuito, vistaCircuito', () => {
  const lista = allineaCircuiti([es('X'), es('A', { circuito: EMOM }), es('B', { insiemeAlPrecedente: true })])
  assert.equal(posizioneCircuito(lista, 0), null)
  const p = posizioneCircuito(lista, 2)
  assert.deepEqual([p.circuito, p.n, p.k], [EMOM, 2, 1])
  assert.equal(posizioneCircuito(sciogliCircuito(lista, 'B'), 1), null)
  const b = { inizio: 0, fine: 1, indici: [0, 1] }
  const s = (c = null) => ({ colore: c })
  const sess = (c) => [{ circuito: c, sets: [s('verde'), s()] }, { sets: [s(), s()] }]
  assert.deepEqual(vistaCircuito(sess(EMOM), b, null), { i: 0, j: 1 }, 'prima di partire')
  const ora = t0 + (PRONTI_SEC + 61) * 1000
  assert.deepEqual(vistaCircuito(sess({ ...EMOM, inizio: t0 }), b, null, ora), { i: 1, j: 0 })
  const riposo = t0 + (PRONTI_SEC + 25) * 1000
  assert.deepEqual(vistaCircuito(sess({ ...TABATA, inizio: t0 }), b, null, riposo), { i: 0, j: 0 }, 'nel riposo, chi ha appena fatto')
  assert.deepEqual(vistaCircuito(sess({ ...EMOM, inizio: t0 }), b, { i: 0, j: 0 }, ora), { i: 0, j: 0 })
})

const { register } = await import('node:module')
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
const { annullaGiro, chiudiAGiri, chiudiCircuitiAperti, chiudiCircuito, esitoCircuito, giriFattiDi, giroFatto, serieCircuitoFinoA } =
  await import('../src/lib/session.js')

const sess = (sets, extra = {}) => ({
  schema: { fasi: [{ serie: null, rip: 10, carico: { tipo: 'kg', valore: 24 } }], recuperoSec: null, nota: '' },
  sets: Array.from({ length: sets }, () => ({ colore: null })),
  ...extra,
})
const B2 = { inizio: 0, fine: 1, indici: [0, 1] }

test('EMOM: le serie crescono, chiudiCircuito tiene gli intervalli fatti', () => {
  const lista = [sess(1, { circuito: { tipo: 'emom', ogniSec: 60, minuti: null } }), sess(1)]
  assert.equal(serieCircuitoFinoA(lista, B2, 1), lista)
  assert.deepEqual(serieCircuitoFinoA(lista, B2, 4).map((e) => e.sets.length), [3, 2])
  const fissa = [sess(6, { circuito: { tipo: 'emom', ogniSec: 60, minuti: 12, inizio: 5 } }), sess(6)]
  fissa[0].sets[0] = { colore: 'verde', rip: 10, kg: 24 }
  const out = chiudiCircuito(fissa, B2, 5)
  assert.deepEqual(out.map((e) => e.sets.length), [3, 2])
  assert.equal(out[0].sets[1].colore, 'fatto')
  assert.equal(out[0].circuito.intervalliFatti, 5)
})

test('chiudiCircuito: oltre le 30 serie della sessione, gli intervalli fatti restano tutti', () => {
  const lista = [sess(30, { circuito: { tipo: 'emom', ogniSec: 60, minuti: 40, inizio: 5 } })]
  const out = chiudiCircuito(lista, { inizio: 0, fine: 0, indici: [0] }, 40)
  assert.equal(out[0].sets.length, 40)
  assert.equal(out[0].sets[39].colore, 'fatto')
})

test('chiudiCircuito: la serie già valutata dell’intervallo in corso resta', () => {
  const lista = [sess(6, { circuito: { tipo: 'emom', ogniSec: 60, minuti: 12, inizio: 5 } }), sess(6)]
  lista[0].sets = [{ colore: 'verde' }, { colore: 'verde' }, { colore: 'rosso' }, ...lista[0].sets.slice(3)]
  const out = chiudiCircuito(lista, B2, 4)
  assert.deepEqual(out[0].sets.map((s) => s.colore), ['verde', 'verde', 'rosso'])
  assert.equal(out[0].circuito.intervalliFatti, 5)
})

test('AMRAP: giro fatto col colore, annulla, chiusura, esito', () => {
  let l = [sess(1, { circuito: { tipo: 'amrap', minuti: 12, inizio: 5 } }), sess(1)]
  l = giroFatto(giroFatto(giroFatto(l, B2, 'verde'), B2, 'rosso'), B2, 'giallo')
  l = annullaGiro(l, B2)
  assert.equal(giriFattiDi(l, B2), 2)
  assert.deepEqual(l.map((e) => e.sets.map((s) => s.colore)), [['verde', 'rosso', null], ['verde', 'rosso', null]])
  l = l.map((e) => ({ ...e, sets: e.sets.slice(0, 2) }))
  l = chiudiAGiri([...l.slice(0, 1).map((e) => ({ ...e, sets: [...e.sets, { colore: null }] })), l[1]], B2, { giriFatti: 2 })
  assert.deepEqual(l.map((e) => e.sets.length), [2, 2], 'la serie del giro non finito si toglie')
  assert.equal(l[0].circuito.giriFatti, 2)
  l = esitoCircuito(l, B2, 5)
  assert.deepEqual(l.map((e) => e.sets.map((s) => s.colore)), [['verde', 'rosso'], ['verde', 'rosso']])
  assert.equal(l[0].circuito.ripExtra, 5)
})

test('"Termina" a circuito in corso lo chiude dov’è', () => {
  const t0 = 1_000_000
  const adesso = t0 + (PRONTI_SEC + 125) * 1000
  const emom = chiudiCircuitiAperti([sess(6, { circuito: { tipo: 'emom', ogniSec: 60, minuti: 12, inizio: t0 } }), sess(6)], adesso)
  assert.equal(emom[0].circuito.intervalliFatti, 2, 'il minuto in corso non conta')
  const ft = [sess(3, { circuito: { tipo: 'fortime', giri: 3, capMinuti: null, inizio: t0 } }), sess(3)]
  const chiuso = chiudiCircuitiAperti(giroFatto(ft, B2), adesso)
  assert.deepEqual([chiuso[0].circuito.giriFatti, chiuso[0].circuito.tempoSec], [1, 125])
  const fermo = [sess(1, { circuito: { tipo: 'amrap', minuti: 12 } }), sess(1)]
  assert.equal(chiudiCircuitiAperti(fermo, adesso), fermo, 'mai partito: niente')
  const pronti = [sess(6, { circuito: { tipo: 'emom', ogniSec: 60, minuti: 12, inizio: adesso - 1000 } }), sess(6)]
  assert.equal(chiudiCircuitiAperti(pronti, adesso), pronti, 'ancora ai "Pronti": come mai partito')
})
