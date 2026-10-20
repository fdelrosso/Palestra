import test from 'node:test'
import assert from 'node:assert/strict'
import { andamentoAtleta, quandoUltimo, schedaCorrente } from '../src/lib/lavoro.js'

// A che punto è un atleta, visto dal PT (LavoroPage, AtletiPage).

const adesso = new Date(2026, 9, 20, 18, 0)
const giorniFa = (n) => new Date(2026, 9, 20 - n, 10, 0).toISOString()
const scheda = (p = {}) => ({
  id: 's', nome: 'A', numeroSettimane: 4, settimanaCorrente: 2, giorniSettimana: [],
  giorni: [{ tipo: 'workout' }, { tipo: 'rest' }, { tipo: 'workout' }, { tipo: 'workout' }], ...p,
})

test("la scheda corrente è l'attiva, se no la più recente non archiviata", () => {
  const a = scheda({ id: 'a' })
  const b = scheda({ id: 'b', attiva: true })
  const c = scheda({ id: 'c', archiviata: true })
  assert.equal(schedaCorrente([c, a, b]).id, 'b')
  assert.equal(schedaCorrente([c, a]).id, 'a')
  assert.equal(schedaCorrente([c]), null)
})

test('allenamenti degli ultimi 7 giorni rispetto ai giorni della scheda', () => {
  const r = andamentoAtleta({
    schede: [scheda()],
    allenamenti: [{ data: giorniFa(1) }, { data: giorniFa(3) }, { data: giorniFa(9) }],
    adesso,
  })
  assert.equal(r.ultimi7, 2)
  assert.equal(r.obiettivo, 3)
  assert.equal(r.giorniDallUltimo, 1)
  assert.deepEqual(r.avvisi, [])
  // I giorni scelti in settimana contano più dell'elenco.
  assert.equal(andamentoAtleta({ schede: [scheda({ giorniSettimana: ['lun', 'gio'] })], adesso }).obiettivo, 2)
})

test('fermo, mai allenato, senza scheda, ultima settimana', () => {
  const tipi = (r) => r.avvisi.map((a) => a.tipo)
  assert.deepEqual(tipi(andamentoAtleta({ schede: [scheda()], allenamenti: [{ data: giorniFa(8) }], adesso })), ['fermo'])
  assert.deepEqual(tipi(andamentoAtleta({ schede: [], allenamenti: [], adesso })), ['mai', 'senza-scheda'])
  assert.deepEqual(
    tipi(andamentoAtleta({ schede: [scheda({ settimanaCorrente: 4 })], allenamenti: [{ data: giorniFa(0) }], adesso })),
    ['scade'],
  )
  // Senza fine non scade mai.
  const sf = andamentoAtleta({ schede: [scheda({ senzaFine: true, settimanaCorrente: 9 })], allenamenti: [{ data: giorniFa(0) }], adesso })
  assert.equal(sf.settimaneRimaste, null)
  assert.deepEqual(sf.avvisi, [])
})

test('quandoUltimo', () => {
  assert.equal(quandoUltimo(null), null)
  assert.equal(quandoUltimo(0), 'oggi')
  assert.equal(quandoUltimo(1), 'ieri')
  assert.equal(quandoUltimo(4), '4 giorni fa')
})
