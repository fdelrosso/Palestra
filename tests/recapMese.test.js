import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come tests/recap.test.js: lib importa senza estensione (Vite li risolve,
// Node no), il loader aggiunge `.js` agli import relativi che non ce l'hanno.
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
const {
  MESI,
  meseDaPercorso,
  percorsoMese,
  meseFinito,
  mesePrima,
  celleDelMese,
  recapDelMese,
  slideDelMese,
  caselleCard,
} = await import('../src/lib/recapMese.js')

const OTTOBRE = { anno: 2026, mese: 9 }
// Un allenamento: `kg` per serie fatte (pallino verde), 8 ripetizioni.
const fatto = (data, { nome = 'Panca', kg = [60], durataSec = 3600, musica, colore = 'verde', gruppi = ['petto'] } = {}) => ({
  data,
  nomeGiorno: 'Giorno A',
  durataSec,
  musica,
  esercizi: [{ nome, gruppi, schema: { ripetizioni: '8', carico: `${kg[0]} kg` }, sets: kg.map((k) => ({ colore, kg: k, rip: 8 })) }],
})
const canzone = (id) => ({ id, titolo: `Brano ${id}`, artista: 'Qualcuno', copertina: '' })

test('mesi: dal percorso e ritorno, finiti e precedenti', () => {
  assert.equal(MESI[9], 'ottobre')
  assert.deepEqual(meseDaPercorso('2026-10'), OTTOBRE)
  for (const rotto of ['', '2026-13', '2026-00', '2026-1', 'ottobre', null]) assert.equal(meseDaPercorso(rotto), null)
  assert.equal(percorsoMese(OTTOBRE), '2026-10')
  assert.equal(percorsoMese({ anno: 2026, mese: 0 }), '2026-01')
  const oggi = new Date(2026, 9, 28)
  assert.equal(meseFinito(OTTOBRE, oggi), false)
  assert.equal(meseFinito({ anno: 2026, mese: 8 }, oggi), true)
  assert.equal(meseFinito({ anno: 2025, mese: 11 }, oggi), true)
  assert.deepEqual(mesePrima({ anno: 2026, mese: 0 }), { anno: 2025, mese: 11 })
})

test('le celle del mese partono da lunedì', () => {
  // Il 1° ottobre 2026 è un giovedì: tre vuoti prima.
  const c = celleDelMese(2026, 9)
  assert.deepEqual(c.slice(0, 4), [null, null, null, 1])
  assert.equal(c.length % 7, 0)
  assert.equal(c.filter(Boolean).length, 31)
})

test('un mese senza allenamenti non ha recap', () => {
  assert.equal(recapDelMese([], OTTOBRE), null)
  assert.equal(recapDelMese([fatto('2026-09-30T10:00:00')], OTTOBRE), null)
})

test('il mese è quello della data in ora locale', () => {
  // Le 23:30 del 31 ottobre, ora locale: è ottobre anche se in UTC fosse novembre.
  const r = recapDelMese([fatto(new Date(2026, 9, 31, 23, 30).toISOString())], OTTOBRE)
  assert.equal(r.allenamenti, 1)
  assert.deepEqual(r.giorni, [31])
})

test('i numeri del mese sono la somma di quelli di ogni allenamento', () => {
  const voci = [
    fatto('2026-10-02T18:00:00', { kg: [60, 60], durataSec: 3000 }),
    fatto('2026-10-02T20:00:00', { nome: 'Squat', kg: [100], durataSec: 1800, gruppi: ['gambe'] }),
    fatto('2026-10-09T18:00:00', { kg: [70], durataSec: 4000, colore: 'rosso' }),
  ]
  const r = recapDelMese(voci, OTTOBRE)
  assert.equal(r.nomeMese, 'ottobre')
  assert.equal(r.allenamenti, 3)
  assert.deepEqual(r.giorni, [2, 9])
  assert.equal(r.durataSec, 8800)
  assert.deepEqual(r.piuLungo, { nome: 'Giorno A', data: '2026-10-09T18:00:00', durataSec: 4000 })
  // (60+60+100+70) × 8
  assert.equal(r.volume, 2320)
  assert.deepEqual(r.pesoMax, { testo: '100kg', esercizio: 'Squat' })
  assert.deepEqual(r.sforzo, { verde: 3, giallo: 0, rosso: 1, tot: 4 })
  assert.equal(r.piuDuro.data, '2026-10-09T18:00:00')
  assert.deepEqual(r.gruppi.map((g) => g.id), ['petto', 'gambe'])
})

test('senza durate, pesi o pallini la cifra è null, non 0', () => {
  const v = fatto('2026-10-02T18:00:00', { durataSec: 0 })
  v.esercizi[0].sets = [{ colore: 'verde' }] // niente peso: niente volume
  v.esercizi[0].schema = { ripetizioni: 'max' }
  const r = recapDelMese([v], OTTOBRE)
  assert.equal(r.durataSec, null)
  assert.equal(r.piuLungo, null)
  assert.equal(r.volume, null)
  assert.equal(r.pesoMax, null)
})

test('il confronto col mese prima: solo se c’era e solo in più', () => {
  const sett = [fatto('2026-09-10T10:00:00')]
  const ott = [fatto('2026-10-01T10:00:00'), fatto('2026-10-05T10:00:00')]
  assert.equal(recapDelMese([...sett, ...ott], OTTOBRE).inPiu, 1)
  assert.equal(recapDelMese([...sett, ...ott], OTTOBRE).nomeMesePrima, 'settembre')
  assert.equal(recapDelMese(ott, OTTOBRE).inPiu, null)
  // Un calo non si mostra.
  assert.equal(recapDelMese([...sett, ...sett, ...sett, ott[0]], OTTOBRE).inPiu, null)
})

test('i record del mese: dalla storia intera, i più recenti per primi, al massimo 5', () => {
  const prima = fatto('2026-09-20T10:00:00', { kg: [50] })
  const ott = [60, 62, 64, 66, 68, 70].map((kg, i) => fatto(`2026-10-${String(i + 1).padStart(2, '0')}T10:00:00`, { kg: [kg] }))
  const voci = [prima, ...ott]
  const r = recapDelMese(voci, OTTOBRE, { schede: [{ completamenti: voci }] })
  assert.equal(r.numRecord, 6)
  assert.equal(r.record.length, 5)
  assert.equal(r.record[0].carico, '70kg')
  assert.equal(r.record[0].data, '2026-10-06T10:00:00')
  // Senza la storia (schede vuote) i record non si possono sapere.
  assert.equal(recapDelMese(voci, OTTOBRE).numRecord, 0)
})

test('le abitudini solo da 3 allenamenti in su', () => {
  const due = [fatto('2026-10-12T10:00:00'), fatto('2026-10-19T10:00:00')]
  assert.equal(recapDelMese(due, OTTOBRE).abitudini, null)
  // Giovedì 1 (settimana del 28 settembre), un buco (la settimana del 5), poi
  // lunedì 12, 19 e 26: tre settimane di fila.
  const voci = [fatto('2026-10-01T10:00:00'), ...due, fatto('2026-10-26T10:00:00', { nome: 'Squat' })]
  const a = recapDelMese(voci, OTTOBRE).abitudini
  assert.deepEqual(a.esercizio, { nome: 'Panca', volte: 3 })
  assert.equal(a.giorno, 'lunedì')
  assert.equal(a.settimaneDiFila, 3)
})

test('la canzone del mese: la più scelta, a pari merito la più recente', () => {
  const voci = [
    fatto('2026-10-01T10:00:00', { musica: canzone('1') }),
    fatto('2026-10-02T10:00:00', { musica: canzone('2') }),
    fatto('2026-10-03T10:00:00', { musica: canzone('1') }),
    fatto('2026-10-04T10:00:00', { musica: canzone('2') }),
    fatto('2026-10-05T10:00:00'),
  ]
  assert.equal(recapDelMese(voci, OTTOBRE).musica.id, '2')
  assert.equal(recapDelMese(voci.slice(0, 3), OTTOBRE).musica.id, '1')
  assert.equal(recapDelMese([fatto('2026-10-05T10:00:00')], OTTOBRE).musica, null)
})

test('le slide: solo quelle col loro dato, nell’ordine', () => {
  assert.deepEqual(slideDelMese(null), [])
  const scarso = fatto('2026-10-02T18:00:00', { durataSec: 0 })
  scarso.esercizi[0].sets = [{}] // niente fatto: niente muscoli, sforzo, volume
  assert.deepEqual(slideDelMese(recapDelMese([scarso], OTTOBRE)), ['intro', 'allenamenti', 'riepilogo'])

  const pieno = [1, 2, 3].map((g) => fatto(`2026-10-0${g}T18:00:00`, { musica: canzone('1') }))
  assert.deepEqual(slideDelMese(recapDelMese(pieno, OTTOBRE)), [
    'intro', 'allenamenti', 'tempo', 'volume', 'muscoli', 'sforzo', 'abitudini', 'canzone', 'riepilogo',
  ])
})

test('le caselle della card: solo quelle con un numero', () => {
  assert.deepEqual(caselleCard(null), [])
  const uno = recapDelMese([fatto('2026-10-02T18:00:00', { kg: [100], durataSec: 3720 })], OTTOBRE)
  assert.deepEqual(caselleCard(uno), [
    { id: 'allenamenti', valore: '1', etichetta: 'allenamento' },
    { id: 'tempo', valore: '1 h 02 min', etichetta: 'di allenamento' },
    { id: 'volume', valore: '800 kg', etichetta: 'sollevati' },
  ])
  const senzaDurata = recapDelMese([fatto('2026-10-02T18:00:00', { durataSec: 0 }), fatto('2026-10-03T18:00:00', { durataSec: 0 })], OTTOBRE)
  assert.deepEqual(caselleCard(senzaDurata).map((c) => c.id), ['allenamenti', 'volume'])
  assert.equal(caselleCard(senzaDurata)[0].etichetta, 'allenamenti')
})
