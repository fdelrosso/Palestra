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
  DURATA_SLIDE,
  storiaIniziale,
  avanzaStoria,
  conGiorno,
  dataBreve,
  chiaveAvvisoMese,
  meseDaAnnunciare,
  recordPerCrescita,
  dischiDelMese,
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

test('i record del mese: uno per esercizio, da prima del mese al più alto, al massimo 5', () => {
  const prima = fatto('2026-09-20T10:00:00', { kg: [50] })
  const ott = [60, 62, 64, 66, 68, 70].map((kg, i) => fatto(`2026-10-${String(i + 1).padStart(2, '0')}T10:00:00`, { kg: [kg] }))
  const voci = [prima, ...ott]
  const r = recapDelMese(voci, OTTOBRE, { schede: [{ completamenti: voci }] })
  // Sei record di panca nel mese: uno solo, 50 → 70.
  assert.equal(r.numRecord, 1)
  assert.deepEqual(r.record, [{ esercizio: 'Panca', prima: '50', primaKg: 50, carico: '70kg', dopoKg: 70, data: '2026-10-06T10:00:00' }])
  // Sette esercizi diversi: i 5 più recenti, e il conto di tutti.
  const tanti = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].flatMap((nome, i) => [
    fatto('2026-09-01T10:00:00', { nome, kg: [40] }),
    fatto(`2026-10-${String(i + 1).padStart(2, '0')}T10:00:00`, { nome, kg: [45] }),
  ])
  const r2 = recapDelMese(tanti, OTTOBRE, { schede: [{ completamenti: tanti }] })
  assert.equal(r2.numRecord, 7)
  assert.deepEqual(r2.record.map((x) => x.esercizio), ['G', 'F', 'E', 'D', 'C'])
  // Senza la storia (schede vuote) i record non si possono sapere.
  assert.equal(recapDelMese(voci, OTTOBRE).numRecord, 0)
})

test('i pallini dello sforzo e il volume rispetto al mese prima', () => {
  const sett = [fatto('2026-09-10T10:00:00', { kg: [50] })]
  const ott = [fatto('2026-10-03T10:00:00', { kg: [60, 60] }), fatto('2026-10-09T10:00:00', { kg: [60], colore: 'rosso' })]
  const r = recapDelMese([...sett, ...ott], OTTOBRE)
  assert.deepEqual(r.pallini, [{ giorno: 3, colori: ['verde', 'verde'] }, { giorno: 9, colori: ['rosso'] }])
  assert.equal(r.volumeInPiu, r.volume - 400)
  // Sceso, o senza il mese prima: niente.
  assert.equal(recapDelMese(ott, OTTOBRE).volumeInPiu, null)
})

test('i record per crescita e i dischi della fatica', () => {
  const r = (esercizio, primaKg, dopoKg, data) => ({ esercizio, primaKg, dopoKg, data })
  assert.deepEqual(recordPerCrescita([r('B', 59, 66, '3'), r('A', 20, 65, '2')]).map((x) => x.esercizio), ['A', 'B'])
  assert.deepEqual(recordPerCrescita(undefined), [])
  // Un disco per allenamento, dal più pesante; il colore secondo la sua parte.
  const d = dischiDelMese([{ data: 'a', volume: 500 }, { data: 'b', volume: 1000 }, { data: 'c', volume: 0 }, { data: 'd', volume: 200 }])
  assert.deepEqual(d.map((x) => [x.data, x.quota, x.colore]), [['b', 1, 'rosso'], ['a', 0.5, 'giallo'], ['d', 0.2, 'bianco']])
  assert.deepEqual(dischiDelMese([{ data: 'a', volume: 0 }]), [])
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
  // Tutte le canzoni, con quante volte: la più scelta davanti.
  assert.deepEqual(recapDelMese([...voci, fatto('2026-10-05T10:00:00', { musica: canzone('3') })], OTTOBRE).canzoni.map((c) => [c.musica.id, c.volte]), [
    ['2', 2], ['1', 2], ['3', 1],
  ])
  assert.equal(recapDelMese([fatto('2026-10-05T10:00:00')], OTTOBRE).musica, null)
})

test('le slide: solo quelle col loro dato, nell’ordine', () => {
  assert.deepEqual(slideDelMese(null), [])
  const scarso = fatto('2026-10-02T18:00:00', { durataSec: 0 })
  scarso.esercizi[0].sets = [{}] // niente fatto: niente muscoli, sforzo, volume
  assert.deepEqual(slideDelMese(recapDelMese([scarso], OTTOBRE)), ['mese', 'riepilogo'])

  const pieno = [1, 2, 3].map((g) => fatto(`2026-10-0${g}T18:00:00`, { musica: canzone('1'), kg: [60 + g] }))
  const storia = [fatto('2026-09-01T18:00:00'), ...pieno]
  // I record (il picco) per ultimi prima della card; le foto solo se ci sono.
  const r = recapDelMese(storia, OTTOBRE, { schede: [{ completamenti: storia }] })
  assert.deepEqual(slideDelMese(r), ['mese', 'fatica', 'stile', 'sforzo', 'canzoni', 'record', 'riepilogo'])
  assert.deepEqual(slideDelMese(r, { foto: [{}] }).slice(0, 2), ['mese', 'foto'])
})

test('la storia: il tempo porta avanti, l’ultima slide si ferma', () => {
  let s = storiaIniziale(3)
  assert.deepEqual(s, { indice: 0, trascorso: 0, inPausa: false, ferma: false, totale: 3 })
  s = avanzaStoria(s, { tipo: 'tempo', ms: DURATA_SLIDE - 1 })
  assert.equal(s.indice, 0)
  s = avanzaStoria(s, { tipo: 'tempo', ms: 1 })
  assert.deepEqual([s.indice, s.trascorso], [1, 0])
  s = avanzaStoria(avanzaStoria(s, { tipo: 'avanti' }), { tipo: 'tempo', ms: DURATA_SLIDE * 3 })
  assert.deepEqual([s.indice, s.trascorso], [2, DURATA_SLIDE])
  assert.deepEqual([avanzaStoria(s, { tipo: 'avanti' }).indice], [2])
  // A fondo sull'ultima: lo stesso oggetto, niente ridisegni a vuoto.
  assert.equal(avanzaStoria(s, { tipo: 'tempo', ms: 16 }), s)
  assert.equal(avanzaStoria(s, { tipo: 'avanti' }), s)
})

test('la storia: indietro, pausa e rivedi', () => {
  let s = avanzaStoria(storiaIniziale(3), { tipo: 'tempo', ms: 2000 })
  // Indietro sulla prima: la ricomincia.
  assert.deepEqual([avanzaStoria(s, { tipo: 'indietro' }).indice, avanzaStoria(s, { tipo: 'indietro' }).trascorso], [0, 0])
  s = avanzaStoria(s, { tipo: 'pausa' })
  assert.equal(avanzaStoria(s, { tipo: 'tempo', ms: 99999 }), s)
  s = avanzaStoria(s, { tipo: 'riprendi' })
  assert.equal(s.inPausa, false)
  s = avanzaStoria(avanzaStoria(s, { tipo: 'avanti' }), { tipo: 'avanti' })
  assert.deepEqual(avanzaStoria(s, { tipo: 'rivedi' }), storiaIniziale(3))
  assert.equal(avanzaStoria(s, { tipo: 'boh' }), s)
})

test('la storia: il tasto pausa resiste a "riprendi" (dito alzato, app tornata)', () => {
  let s = avanzaStoria(storiaIniziale(3), { tipo: 'fermaRiparti' })
  s = avanzaStoria(s, { tipo: 'riprendi' })
  assert.equal(avanzaStoria(s, { tipo: 'tempo', ms: 99999 }), s)
  s = avanzaStoria(s, { tipo: 'fermaRiparti' })
  assert.equal(avanzaStoria(s, { tipo: 'tempo', ms: 1000 }).trascorso, 1000)
})

test('la card della Home: il mese prima, dal 1° al 7', () => {
  assert.deepEqual(meseDaAnnunciare(new Date(2026, 10, 1)), OTTOBRE)
  assert.deepEqual(meseDaAnnunciare(new Date(2026, 10, 7, 23)), OTTOBRE)
  assert.equal(meseDaAnnunciare(new Date(2026, 10, 8)), null)
  assert.deepEqual(meseDaAnnunciare(new Date(2027, 0, 3)), { anno: 2026, mese: 11 })
  assert.equal(chiaveAvvisoMese(OTTOBRE), 'recapMese:2026-10')
})

test('la storia: un ms nullo, negativo o NaN non fa avanzare', () => {
  const s = storiaIniziale(3)
  for (const ms of [NaN, -5, undefined]) assert.equal(avanzaStoria(s, { tipo: 'tempo', ms }).trascorso, 0)
})

test('il giorno: "la domenica", "il lunedì"; la data breve è minuscola e senza anno', () => {
  assert.equal(conGiorno('domenica'), 'la domenica')
  assert.equal(conGiorno('lunedì'), 'il lunedì')
  assert.equal(dataBreve('2026-09-04T10:00:00'), 'venerdì 4')
})
