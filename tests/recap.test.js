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
const { volumeEsercizio, statisticheRecap, ultimaVolta, sfondoGruppi, paletteFondo, altraPalette } = await import('../src/lib/recap.js')
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
