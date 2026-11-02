import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// lib/recap e le sue dipendenze importano senza estensione (Vite li risolve,
// Node no): un loader minimo aggiunge `.js` agli import relativi che non ce l'hanno.
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
const { volumeEsercizio, statisticheRecap, conRecord, ultimaVolta, sfondoGruppi, paletteFondo, altraPalette } = await import('../src/lib/recap.js')
const { obiettivoSerie, ripNumero, kgAlzati } = await import('../src/lib/schema.js')

// Ripetizioni e peso (in kg alzati) della serie `i`, da uno schema scritto
// come lo scriveva il PT: i dati vecchi si convertono quando si leggono.
const ripetizioniSerie = (testo, i) => ripNumero(obiettivoSerie({ ripetizioni: testo }, i).rip)
const pesoSerie = (testo, i) => kgAlzati(obiettivoSerie({ carico: testo }, i).carico)

const fatte = (n, tot = n) =>
  Array.from({ length: tot }, (_, i) => ({ colore: i < n ? 'verde' : null }))

test('ripetizioni serie per serie', () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => ripetizioniSerie('15/12/10', i)), [15, 12, 10, 10])
  assert.equal(ripetizioniSerie('8-10', 0), 8)
  assert.equal(ripetizioniSerie('10+5', 0), 15)
  assert.equal(ripetizioniSerie('max', 0), null)
  assert.equal(ripetizioniSerie('', 0), null)
})

test('peso serie per serie', () => {
  assert.deepEqual([0, 1, 2].map((i) => pesoSerie('60/70/80', i)), [60, 70, 80])
  assert.equal(pesoSerie('80kg', 3), 80)
  assert.equal(pesoSerie('2x20 kg', 0), 40, 'due manubri da 20')
  assert.equal(pesoSerie('12rm', 0), null)
  assert.equal(pesoSerie('70%', 0), null)
  assert.equal(pesoSerie('RPE 8', 0), null)
  assert.equal(pesoSerie('', 0), null)
})

test('volume = somma di peso × ripetizioni delle sole serie fatte', () => {
  // Piramide: 60×15 + 70×12 + 80×10 = 900 + 840 + 800
  assert.equal(
    volumeEsercizio({ schema: { carico: '60/70/80', ripetizioni: '15/12/10' }, sets: fatte(3) }),
    2540,
  )
  // 4 serie previste, 3 fatte: la quarta non conta.
  assert.equal(volumeEsercizio({ schema: { carico: '100', ripetizioni: '5' }, sets: fatte(3, 4) }), 1500)
  // A corpo libero: niente peso, niente volume.
  assert.equal(volumeEsercizio({ schema: { carico: '', ripetizioni: '12' }, sets: fatte(3) }), 0)
})

test('calorie solo se inserite, e niente numero del mese', () => {
  const riep = {
    data: '2026-09-18T10:00:00.000Z',
    durataSec: 3600,
    esercizi: [{ nome: 'Panca piana', schema: { carico: '60', ripetizioni: '10' }, sets: fatte(3) }],
  }
  const dati = { peso: '80', sesso: 'm', eta: '30', altezza: '180' }
  const senza = statisticheRecap(riep, { dati })
  assert.equal(senza.calorie, null, 'la stima non va sul recap')
  assert.equal(senza.volume, 1800)
  assert.equal('nelMese' in senza, false)
  const con = statisticheRecap({ ...riep, calorieReali: '412' }, { dati })
  assert.equal(con.calorie, 412)
  assert.equal(con.calorieMisurate, true)
})

const { eserciziDeiGruppi, gruppiAllenati } = await import('../src/lib/recap.js')

test('gli esercizi di un gruppo del recap: stessa regola delle pastiglie', () => {
  const fatto = (nome, gruppi) => ({ nome, gruppo: gruppi[0], gruppi, sets: [{ colore: 'verde' }, { colore: 'giallo' }] })
  const esercizi = [
    fatto('Panca piana', ['petto']),
    fatto('Dip', ['petto', 'tricipiti']),
    fatto('Lat machine', ['schiena']),
    fatto('Push down', ['tricipiti']),
  ]
  const nomi = (gruppi) => eserciziDeiGruppi(esercizi, gruppi).map((x) => x.esercizio.nome)
  // I dip stanno sotto il petto E sotto i tricipiti, come nelle pastiglie.
  assert.deepEqual(nomi(['tricipiti']), ['Dip', 'Push down'])
  assert.deepEqual(nomi(['petto']), ['Panca piana', 'Dip'])
  // Più gruppi insieme: basta che l'esercizio ne lavori uno.
  assert.deepEqual(nomi(['schiena', 'tricipiti']), ['Dip', 'Lat machine', 'Push down'])
  // Nessun gruppo: tutti.
  assert.equal(nomi([]).length, 4)
  // Il posto nell'allenamento resta quello vero (serve alla superserie).
  assert.deepEqual(eserciziDeiGruppi(esercizi, ['tricipiti']).map((x) => x.indice), [1, 3])
  // E le serie tornano con la pastiglia: "Tricipiti · 4" sono le 4 serie
  // degli esercizi che il filtro fa vedere.
  const tricipiti = gruppiAllenati(esercizi).find((g) => g.id === 'tricipiti')
  const serie = eserciziDeiGruppi(esercizi, ['tricipiti']).reduce(
    (n, x) => n + x.esercizio.sets.filter((s) => s.colore).length,
    0,
  )
  assert.equal(tricipiti.serie, serie)
})

// ------------------------------------------------- l'orario dell'allenamento
const { orarioAllenamento } = await import('../src/lib/recap.js')

test('orarioAllenamento: dalla fine e dalla durata, "inizio–fine"', () => {
  const fine = new Date(2026, 9, 12, 10, 33)
  assert.equal(orarioAllenamento(fine.toISOString(), 70 * 60), '9:23–10:33')
})

test('orarioAllenamento: senza durata (un "fatto" a mano) l’orario non si inventa', () => {
  assert.equal(orarioAllenamento(new Date().toISOString(), 0), '')
  assert.equal(orarioAllenamento(new Date().toISOString(), undefined), '')
  assert.equal(orarioAllenamento('', 600), '')
})

test('sfondo del post: una palette come le storie di Instagram, scelta col dado o fissa per allenamento', () => {
  assert.equal(sfondoGruppi([]), null)
  const push = [{ id: 'petto', serie: 9 }, { id: 'tricipiti', serie: 6 }]
  const pull = [{ id: 'schiena', serie: 11 }, { id: 'bicipiti', serie: 7 }]
  // Senza scelta: sempre la stessa per lo stesso allenamento.
  assert.equal(paletteFondo(push).id, paletteFondo(push).id)
  assert.ok(paletteFondo(pull))
  // La scelta del dado vince, anche senza gruppi; una che non esiste no.
  assert.equal(paletteFondo([], 'laguna').id, 'laguna')
  assert.equal(paletteFondo(push, 'boh').id, paletteFondo(push).id)
  assert.match(sfondoGruppi(push, 'tramonto'), /linear-gradient\(165deg, #f0185a .*#f47a14/)
  // Il dado non ridà mai quella di adesso.
  for (let i = 0; i < 50; i++) assert.notEqual(altraPalette('tramonto'), 'tramonto')
})

test('sul recap solo gli esercizi fatti: uno della scheda saltato non accende il suo gruppo', () => {
  const riep = {
    esercizi: [
      { nome: 'Panca piana', gruppi: ['petto'], schema: '3x8 80kg', sets: [{ colore: 'verde', kg: 80 }, { colore: 'rosso', kg: 80 }, {}] },
      { nome: 'Squat', gruppi: ['gambe'], schema: '4x8 140kg', sets: [{ kg: 140 }, {}, {}, {}] },
    ],
  }
  const stat = statisticheRecap(riep)
  assert.deepEqual(stat.gruppi.map((g) => g.id), ['petto'])
  assert.deepEqual(stat.esercizi.map((e) => e.nome), ['Panca piana'])
  assert.equal(stat.numEsercizi, 1)
  assert.equal(stat.pesoMax?.esercizio, 'Panca piana')
  // La figurina di un giorno della scheda conta 1 per esercizio: lì ci sono tutti.
  assert.equal(gruppiAllenati(riep.esercizi, () => 1).length, 2)
})

test("ultimaVolta: il peso dell'ultima volta prima di oggi, non il massimo di sempre", () => {
  const panca = (data, kg) => ({ data, esercizi: [{ nome: 'Panca piana', sets: [{ colore: 'verde', kg, rip: 8 }] }] })
  const schede = [{ completamenti: [panca('2026-10-01T10:00:00Z', 90), panca('2026-10-10T10:00:00Z', 80), panca('2026-10-21T10:00:00Z', 85)] }]
  const u = ultimaVolta(schede, '2026-10-21T10:00:00Z')
  assert.equal([...u.values()][0].numero, 80)
  assert.equal(ultimaVolta(schede, '2026-09-01T00:00:00Z').size, 0)
})

test('recap: i minuti di cardio sono una voce a parte, il plank no', async () => {
  const { serieChiusa } = await import('../src/lib/session.js')
  const cyclette = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null }], recuperoSec: null, nota: '' }
  const plank = { fasi: [{ serie: 2, rip: { sec: 60 }, carico: null }], recuperoSec: 60, nota: '' }
  const riep = {
    durataSec: 1800,
    esercizi: [
      // Fermato prima: valgono i secondi fatti.
      { nome: 'Cyclette', gruppo: 'cardio', schema: cyclette, sets: [serieChiusa(cyclette, 0, 'verde', { sec: 480 })] },
      { nome: 'Plank', gruppo: 'addome', schema: plank, sets: [serieChiusa(plank, 0, 'giallo'), serieChiusa(plank, 1, 'giallo')] },
      // Saltato: non conta e non è un errore.
      { nome: 'Ellittica', gruppo: 'cardio', schema: cyclette, sets: [{ colore: null }] },
    ],
  }
  const stat = statisticheRecap(riep)
  assert.equal(stat.minutiCardio, 8)
  assert.equal(stat.numEsercizi, 2)
  assert.equal(riep.esercizi[1].sets[0].sec, 60)
})

test('recap: il cardio chiuso con "Termina" (colore fatto) conta come esercizio e minuti, non fra facili-medie-dure', async () => {
  const { serieChiusa } = await import('../src/lib/session.js')
  const ellittica = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null }], recuperoSec: null, nota: '' }
  const stat = statisticheRecap({
    durataSec: 900,
    esercizi: [{ nome: 'Ellittica', gruppo: 'cardio', schema: ellittica, sets: [serieChiusa(ellittica, 0, 'fatto')] }],
  })
  assert.equal(stat.numEsercizi, 1)
  assert.equal(stat.minutiCardio, 10)
  assert.equal(stat.sforzo.tot, 0)
})

test('recap: il riscaldamento in testa alla lista, o via se spento', async () => {
  const { eserciziDelRecap, haRiscaldamento } = await import('../src/lib/recap.js')
  const cardio = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null }], recuperoSec: null, nota: '' }
  const panca = { fasi: [{ serie: 3, rip: 8, carico: null }], recuperoSec: 90, nota: '' }
  const nomi = (l) => l.map((e) => (e.titoloRiscaldamento ? '[R]' : e.nome))
  // Solo scritto: una riga "Riscaldamento".
  const soloTesto = statisticheRecap({ riscaldamento: true, esercizi: [{ nome: 'Panca', schema: panca, sets: [{ colore: 'verde' }] }] })
  assert.ok(haRiscaldamento(soloTesto))
  assert.deepEqual(nomi(eserciziDelRecap(soloTesto, true)), ['[R]', 'Panca'])
  // Col cardio di riscaldamento: sotto la riga, prima degli altri.
  const conCardio = statisticheRecap({
    esercizi: [
      { nome: 'Panca', schema: panca, sets: [{ colore: 'verde' }] },
      { nome: 'Ellittica', gruppo: 'cardio', riscaldamento: true, schema: cardio, sets: [{ colore: 'fatto' }] },
    ],
  })
  assert.deepEqual(nomi(eserciziDelRecap(conCardio, true)), ['[R]', 'Ellittica', 'Panca'])
  // Spento: niente riscaldamento, nemmeno il cardio.
  assert.deepEqual(nomi(eserciziDelRecap(conCardio, false)), ['Panca'])
  // Senza riscaldamento non c'è la riga.
  const senza = statisticheRecap({ esercizi: [{ nome: 'Panca', schema: panca, sets: [{ colore: 'verde' }] }] })
  assert.ok(!haRiscaldamento(senza))
  assert.deepEqual(nomi(eserciziDelRecap(senza, true)), ['Panca'])
})

test('senza la storia (feed, profilo) valgono i record congelati a fine allenamento', () => {
  const es = { nome: 'Panca', schema: { carico: '80 kg' }, sets: [{ colore: 'verde', kg: 80 }] }
  const prima = { data: '2026-10-01T10:00:00Z', esercizi: [{ ...es, sets: [{ colore: 'verde', kg: 70 }] }] }
  const riep = { data: '2026-10-20T10:00:00Z', esercizi: [es] }
  const { record } = statisticheRecap(riep, { schede: [{ completamenti: [prima] }] })
  assert.equal(record.length, 1)
  assert.deepEqual(statisticheRecap({ ...riep, record }).record, record)
  assert.deepEqual(statisticheRecap(riep).record, [])
})

test('i record si rifanno da tutta la storia: un carico corretto dopo non resta record', () => {
  const panca = (kg) => [{ nome: 'Panca', schema: { carico: '80 kg' }, sets: [{ colore: 'verde', kg }] }]
  const prima = { data: '2026-10-01T10:00:00Z', esercizi: panca(70) }
  const oggi = { data: '2026-10-20T10:00:00Z', esercizi: panca(80) }
  const [p, o] = conRecord([prima, oggi])
  assert.equal(p, prima) // niente da cambiare: lo stesso oggetto
  assert.deepEqual(o.record, [{ esercizio: 'Panca', carico: '80kg', precedente: 70 }])
  // Corretto a 65 kg: il record se ne va.
  assert.equal(conRecord([prima, { ...o, esercizi: panca(65) }])[1].record, undefined)
  // Riaperto dopo un allenamento più pesante, il record resta.
  const dopo = { data: '2026-10-25T10:00:00Z', esercizi: panca(90) }
  assert.equal(statisticheRecap(oggi, { schede: [{ completamenti: [prima, oggi, dopo] }] }).record.length, 1)
})

test('sulla card ci vanno tutti i record: oltre due in un riquadro solo', async () => {
  const { pezziRecap } = await import('../src/lib/recap.js')
  const record = (n) => Array.from({ length: n }, (_, i) => ({ esercizio: `E${i}`, carico: '50kg', precedente: 40 }))
  const righe = (n) => pezziRecap({ record: record(n) }, statisticheRecap({ record: record(n) })).pezzi.find((p) => p.tipo === 'record').righe
  assert.deepEqual(righe(2), ['🏆 Record · E0 50kg', '🏆 Record · E1 50kg'])
  assert.deepEqual(righe(4), ['🏆 4 record · E0 50kg · E1 50kg · E2 50kg · E3 50kg'])
})

test('schema a più fasi sul recap: una riga per fase, col suo peso', async () => {
  const { righeSchemaRecap } = await import('../src/lib/recap.js')
  const fase = (kg) => ({ serie: 1, rip: 'max', perLato: true, carico: { tipo: 'kg', valore: kg } })
  const schema = { fasi: [fase(12.5), fase(10), fase(7.5)], recuperoSec: null, nota: '' }
  const righe = righeSchemaRecap({ nome: 'Curl panca Scott', schema, serie: 3 })
  assert.equal(righe.length, 3)
  assert.match(righe[0], /^1×max.* · 12,5kg$/)
  assert.match(righe[2], / · 7,5kg$/)
  // Una fase sola: la riga di sempre.
  assert.equal(righeSchemaRecap({ schema: { fasi: [{ serie: 3, rip: 8, carico: { tipo: 'kg', valore: 60 } }] }, serie: 3 }).length, 1)
})

test('recap: le serie fatte con pesi o ripetizioni diversi, una riga per combinazione', async () => {
  const { righeSchemaRecap } = await import('../src/lib/recap.js')
  const schema = { fasi: [{ serie: 4, rip: 10, carico: { tipo: 'kg', valore: 80 } }] }
  const sets = [
    { colore: 'verde', rip: 10, kg: 80 },
    { colore: 'verde', rip: 10, kg: 80 },
    { colore: 'giallo', rip: 12, kg: 80 },
    { colore: 'rosso', rip: 8, kg: 85 },
  ]
  assert.deepEqual(righeSchemaRecap({ schema, serie: 4, sets }), ['2×10 · 80kg', '1×12 · 80kg', '1×8 · 85kg'])
  // Tutte uguali: una riga sola, e le serie non chiuse non contano.
  const uguali = [{ colore: 'verde', rip: 10, kg: 80 }, { colore: 'verde', rip: 10, kg: 80 }, { colore: null }]
  assert.deepEqual(righeSchemaRecap({ schema, serie: 4, sets: uguali }), ['2×10 · 80kg'])
  // Niente di registrato (gli allenamenti di prima): lo schema.
  assert.deepEqual(righeSchemaRecap({ schema, serie: 4, sets: [{ colore: 'verde' }] }), ['4×10 · 80kg'])
})

// ------------------------------------- assistiti e corpo libero (2026-10-28)
const { prestazione, confronto, assistito } = await import('../src/lib/recap.js')
const fatto = (nome, sets, data = '2026-10-20T10:00:00Z') => ({ data, esercizi: [{ nome, sets: sets.map((s) => ({ colore: 'verde', ...s })) }] })

test("assistiti: l'aiuto non è peso alzato, né volume né peso max", () => {
  assert.ok(assistito({ nome: 'Trazioni assistite (macchina)' }))
  assert.ok(assistito({ nome: 'Dips con elastico' }))
  assert.ok(!assistito({ nome: 'Trazioni zavorrate' }))
  const stat = statisticheRecap(fatto('Dips alla macchina assistita', [{ kg: 30, rip: 8 }, { kg: 30, rip: 8 }]))
  assert.equal(stat.volume, 0)
  assert.equal(stat.volumeTesto, null)
  assert.equal(stat.pesoMax, null)
})

test('assistiti: il record è meno aiuto, a pari aiuto più ripetizioni', () => {
  const nome = 'Trazioni assistite (macchina)'
  const prima = fatto(nome, [{ kg: 30, rip: 8 }], '2026-10-01T10:00:00Z')
  const record = (sets) => conRecord([prima, fatto(nome, sets)])[1].record
  assert.deepEqual(record([{ kg: 25, rip: 6 }]), [
    { esercizio: nome, carico: '25 kg di aiuto × 6', precedente: 30, prima: '30 kg di aiuto × 8' },
  ])
  assert.equal(record([{ kg: 35, rip: 12 }]), undefined) // più aiuto: non è un record
  assert.equal(record([{ kg: 30, rip: 10 }])[0].carico, '30 kg di aiuto × 10')
  assert.equal(record([{ kg: 30, rip: 8 }]), undefined)
  // L'aiuto più basso del giorno, con le sue ripetizioni.
  assert.deepEqual(prestazione(fatto(nome, [{ kg: 30, rip: 10 }, { kg: 20, rip: 5 }, { kg: 20, rip: 6 }]).esercizi[0]),
    { misura: 'aiuto', numero: 20, rip: 6, testo: '20 kg di aiuto × 6' })
})

test('corpo libero: il record è la serie con più ripetizioni, e non si mescola coi kg', () => {
  const nome = 'Trazioni presa prona'
  const prima = fatto(nome, [{ rip: 8 }, { rip: 7 }], '2026-10-01T10:00:00Z')
  assert.deepEqual(conRecord([prima, fatto(nome, [{ rip: 12 }, { rip: 9 }])])[1].record, [
    { esercizio: nome, carico: '12 rip', precedente: 8, prima: '8 rip' },
  ])
  assert.equal(conRecord([prima, fatto(nome, [{ rip: 8 }])])[1].record, undefined)
  // Fatte zavorrate: è un'altra storia, nessun record contro le rip.
  assert.equal(conRecord([prima, fatto(nome, [{ kg: 10, rip: 5 }])])[1].record, undefined)
  // A RPE, RIR, RM o % senza i kg scritti il peso non si sa: nessun record in rip.
  for (const carico of ['RPE 8', 'RIR 2', '12RM', '70%']) {
    const piano = (sets, data) => ({ data, esercizi: [{ nome: 'Panca', schema: { carico }, sets: sets.map((r) => ({ colore: 'verde', rip: r })) }] })
    assert.equal(prestazione(piano([10]).esercizi[0]), null, carico)
    assert.equal(conRecord([piano([8], '2026-10-01T10:00:00Z'), piano([12], '2026-10-20T10:00:00Z')])[1].record, undefined, carico)
  }
  // Coi kg scritti, invece, il record è in kg come sempre.
  const rpe = (kg, data) => ({ data, esercizi: [{ nome: 'Panca', schema: { carico: 'RPE 8' }, sets: [{ colore: 'verde', kg, rip: 8 }] }] })
  assert.equal(conRecord([rpe(70, '2026-10-01T10:00:00Z'), rpe(75, '2026-10-20T10:00:00Z')])[1].record[0].carico, '75kg')
  // Il plank (a tempo) non ne ha.
  assert.equal(prestazione({ nome: 'Plank', schema: { fasi: [{ serie: 3, rip: { sec: 60 } }] }, sets: [{ colore: 'verde', sec: 60 }] }), null)
})

test("confronto: l'ultima volta in kg, in aiuto e in ripetizioni", () => {
  const kg = (n) => ({ misura: 'kg', numero: n })
  const aiuto = (n, rip) => ({ misura: 'aiuto', numero: n, rip })
  const rip = (n) => ({ misura: 'rip', numero: n })
  assert.deepEqual(confronto(kg(82.5), kg(80)), ['su', '▲ +2,5 kg dall’ultima volta'])
  assert.deepEqual(confronto(aiuto(25, 6), aiuto(30, 8)), ['su', '▲ −5 kg di aiuto dall’ultima volta'])
  assert.deepEqual(confronto(aiuto(35, 8), aiuto(30, 8)), ['giu', '▼ +5 kg di aiuto dall’ultima volta'])
  assert.deepEqual(confronto(aiuto(30, 10), aiuto(30, 8)), ['su', '▲ +2 rip dall’ultima volta'])
  assert.deepEqual(confronto(rip(10), rip(12)), ['giu', '▼ −2 rip dall’ultima volta'])
  assert.deepEqual(confronto(rip(10), rip(10)), ['pari', '= come l’ultima volta'])
  assert.equal(confronto(rip(10), kg(10)), null)
})

// ------------------------------------------------- la palestra (2026-10-28)
test('la palestra è una riga della card, se c’è e se è accesa', async () => {
  const { pezziRecap } = await import('../src/lib/recap.js')
  const { alterna } = await import('../src/lib/recapLayout.js')
  const riga = (voce) => pezziRecap(voce, statisticheRecap(voce)).pezzi.find((p) => p.testo?.startsWith('📍'))?.testo
  const palestra = { nome: 'Fit Lab', comune: 'Prato', provincia: 'PO' }
  assert.equal(riga({ palestra }), '📍 Fit Lab · Prato')
  assert.equal(riga({ palestra: { nome: 'Fit Lab' } }), '📍 Fit Lab')
  // Solo l'id (non ancora letta, o una da approvare per chi guarda): niente.
  assert.equal(riga({ palestraId: 'x' }), undefined)
  // Un layout salvato prima che la palestra ci fosse: entra accesa.
  assert.equal(riga({ palestra, recap: { ordine: ['data'], nascosti: ['titolo'] } }), '📍 Fit Lab · Prato')
  // Spenta a mano: niente.
  assert.equal(riga({ palestra, recap: alterna(null, 'palestra') }), undefined)
})
