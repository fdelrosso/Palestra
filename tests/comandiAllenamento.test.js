import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione.
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
const { applicaTocchi, codaSerie } = await import('../src/lib/comandiAllenamento.js')
const { chiediPermessoNotifiche, promemoriaDa, promemoriaDisponibile } = await import('../src/lib/promemoria.js')
const { comandiDisponibili } = await import('../src/lib/allenamentoNativo.js')

const es = (id, n, extra = {}) => ({
  esercizioId: id,
  nome: id,
  schema: { fasi: [{ serie: n, rip: 10, carico: { tipo: 'kg', valore: 60 } }], recuperoSec: 60, nota: '' },
  sets: Array.from({ length: n }, () => ({ colore: null })),
  ...extra,
})
const dove = (coda) => coda.map((s) => `${s.esercizioId}${s.j}`)

test('il recupero parte fra due serie e fra due esercizi, non dopo l’ultima', () => {
  const coda = codaSerie([es('a', 2), es('b', 1)])
  assert.deepEqual(dove(coda), ['a0', 'a1', 'b0'])
  assert.deepEqual(coda.map((s) => s.recupero), [60, 60, null])
})

test('la notifica dice esercizio, serie e cosa fare', () => {
  const [s] = codaSerie([es('Panca', 3)])
  assert.equal(s.titolo, 'Panca · Serie 1/3')
  assert.match(s.dettaglio, /^10 reps · 60\s?kg$/)
})

test('senza recupero automatico non parte mai', () => {
  const coda = codaSerie([es('a', 2)], null, { auto: false })
  assert.deepEqual(coda.map((s) => s.recupero), [null, null])
})

test('in superserie il giro si fa senza recupero, che parte a fine giro', () => {
  const coda = codaSerie([es('a', 2), es('b', 2, { insiemeAlPrecedente: true })])
  assert.deepEqual(dove(coda), ['a0', 'b0', 'a1', 'b1'])
  assert.deepEqual(coda.map((s) => s.recupero), [null, 60, null, null])
})

test('si parte da dove si è, e i blocchi lasciati indietro vengono in fondo', () => {
  const lista = [es('a', 2), es('b', 2)]
  assert.deepEqual(dove(codaSerie(lista, { i: 1, j: null })), ['b0', 'b1', 'a0', 'a1'])
  assert.deepEqual(dove(codaSerie(lista, { i: 0, j: 1 })), ['a1', 'a0', 'b0', 'b1'])
})

test('le serie già fatte non ci sono più', () => {
  const lista = [es('a', 2)]
  lista[0].sets[0] = { colore: 'verde' }
  assert.deepEqual(dove(codaSerie(lista)), ['a1'])
  lista[0].sets[1] = { colore: 'verde' }
  assert.deepEqual(codaSerie(lista), [])
})

test('una serie a RIR dal blocco schermo non si chiude: apre l’app', () => {
  const rir = es('a', 1, { schema: { fasi: [{ serie: 1, rip: 8, carico: { tipo: 'rir', valore: 2 } }], recuperoSec: 60, nota: '' } })
  assert.equal(codaSerie([rir])[0].app, true)
  assert.equal(codaSerie([es('b', 1)])[0].app, false)
})

test('un tocco chiude la serie di quell’esercizio, e letto due volte non cambia niente', () => {
  const lista = [es('a', 2), es('b', 1)]
  const t = { esercizioId: 'b', j: 0, colore: 'giallo' }
  const dopo = applicaTocchi(lista, [t])
  assert.equal(dopo[1].sets[0].colore, 'giallo')
  assert.equal(dopo[0].sets[0].colore, null)
  assert.deepEqual(applicaTocchi(dopo, [{ ...t, colore: 'verde' }]), dopo)
})

test('"Duro" dal blocco schermo non chiude niente: le ripetizioni le chiede l’app', () => {
  const lista = [es('a', 1)]
  assert.deepEqual(applicaTocchi(lista, [{ esercizioId: 'a', j: 0, colore: 'rosso', chiedi: true }]), lista)
})

test('nel browser (e su iPhone) non c’è niente di tutto questo, e non si chiede nessun permesso', async () => {
  assert.equal(promemoriaDisponibile(), false)
  assert.equal(comandiDisponibili(), false)
  assert.equal(await chiediPermessoNotifiche(), false)
})

test('senza un’ora scelta o senza scheda niente promemoria', () => {
  assert.deepEqual(promemoriaDa({ schede: [], ora: '18:00' }), [])
})

test('promemoria: solo nei giorni di allenamento, e oggi no se è già fatto', () => {
  const giorni = [
    { id: 'g1', tipo: 'workout', nome: 'Push', esercizi: [es('x', 1)] },
    { id: 'r', tipo: 'rest', nome: 'Riposo', esercizi: [] },
  ]
  const scheda = { id: 's', nome: 'S', attiva: true, numeroSettimane: 8, settimanaCorrente: 1, giorniSettimana: [], giorni, completamenti: [] }
  const adesso = new Date(2026, 10, 6, 9)
  const lista = promemoriaDa({ schede: [scheda], ora: '18:30', adesso })
  assert.ok(lista.length > 0)
  assert.equal(lista[0].schedule.at.getHours(), 18)
  assert.equal(lista[0].schedule.at.getMinutes(), 30)
  assert.ok(lista.every((p) => p.title === 'Oggi: Push'))
  const conSessione = promemoriaDa({ schede: [scheda], sessione: { id: 'x' }, ora: '18:30', adesso })
  assert.ok(conSessione.every((p) => p.schedule.at.getDate() !== 6))
  // Le 18:30 di oggi sono già passate: si comincia da un altro giorno.
  const tardi = promemoriaDa({ schede: [scheda], ora: '18:30', adesso: new Date(2026, 10, 6, 20) })
  assert.ok(tardi.every((p) => p.schedule.at.getDate() !== 6))
})
