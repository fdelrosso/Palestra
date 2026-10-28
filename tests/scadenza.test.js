import test from 'node:test'
import assert from 'node:assert/strict'
import { giorniA, piuGiorni, quandoScade, scadenzaProposta, scadenzaValida, statoScadenza } from '../src/lib/scadenza.js'
import { conParteNuova, divisibileAParti, taglioScheda } from '../src/lib/schedaAParti.js'

// La scadenza delle schede del PT e la scheda a parti (2026-10-28).
const OGGI = '2026-10-28'

test('la scadenza proposta: le settimane della scheda, 4 se senza fine', () => {
  assert.equal(scadenzaProposta({ numeroSettimane: 6 }, OGGI), '2026-12-09')
  assert.equal(scadenzaProposta({ senzaFine: true, numeroSettimane: 10 }, OGGI), '2026-11-25')
})

test('scaduta dal giorno della scadenza compreso', () => {
  assert.deepEqual(statoScadenza('2026-10-29', OGGI), { scaduta: false, giorni: 1 })
  assert.deepEqual(statoScadenza(OGGI, OGGI), { scaduta: true, giorni: 0 })
  assert.equal(statoScadenza(null, OGGI), null)
  assert.equal(quandoScade('2026-10-25', OGGI), '3 giorni fa')
})

test('i conti passano i mesi e il cambio dell’ora', () => {
  assert.equal(piuGiorni('2026-10-24', 2), '2026-10-26')
  assert.equal(giorniA('2027-01-01', '2026-12-31'), 1)
})

test('una scadenza va da domani in poi', () => {
  assert.equal(scadenzaValida(OGGI, OGGI), false)
  assert.equal(scadenzaValida('2026-10-29', OGGI), true)
  assert.equal(scadenzaValida('', OGGI), false)
})

const sch = (settimane) => ({ s: settimane })
const SCHEDA = {
  nome: 'Tre mesi',
  numeroSettimane: 12,
  settimanaCorrente: 1,
  giorni: [
    {
      id: 'g1',
      esercizi: [
        { id: 'e1', variaPerSettimana: true, settimane: Array.from({ length: 12 }, (_, i) => sch(i + 1)) },
        { id: 'e2', variaPerSettimana: false, schemaBase: sch(0), settimane: [] },
      ],
    },
  ],
}

test('il taglio lascia solo le prime settimane', () => {
  const t = taglioScheda(SCHEDA, 4)
  assert.equal(t.numeroSettimane, 4)
  assert.deepEqual(t.giorni[0].esercizi[0].settimane.map((x) => x.s), [1, 2, 3, 4])
  assert.equal(t.giorni[0].esercizi[1], SCHEDA.giorni[0].esercizi[1])
  assert.equal(SCHEDA.numeroSettimane, 12)
})

test('a parti solo con una fine e più settimane di una parte', () => {
  assert.equal(divisibileAParti(SCHEDA, 4), true)
  assert.equal(divisibileAParti(SCHEDA, 12), false)
  assert.equal(divisibileAParti({ ...SCHEDA, senzaFine: true }, 4), false)
})

test('la parte nuova allunga la scheda dell’atleta e tiene il resto suo', () => {
  const mia = {
    ...taglioScheda(SCHEDA, 4),
    id: 'pt-1',
    settimanaCorrente: 3,
    completamenti: [{ data: 'x' }],
    daPt: { id: 'pt', propostaId: '1', settimaneVisibili: 4, settimaneTotali: 12 },
  }
  mia.giorni[0].esercizi[0] = { ...mia.giorni[0].esercizi[0], nota: 'mia' }
  const nuova = conParteNuova(mia, taglioScheda(SCHEDA, 8), 8)
  assert.equal(nuova.numeroSettimane, 8)
  assert.equal(nuova.settimanaCorrente, 3)
  assert.deepEqual(nuova.completamenti, [{ data: 'x' }])
  assert.equal(nuova.giorni[0].esercizi[0].settimane.length, 8)
  assert.equal(nuova.giorni[0].esercizi[0].nota, 'mia')
  assert.equal(nuova.daPt.settimaneVisibili, 8)
})
