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
const { ripetizioniSerie, pesoSerie, volumeEsercizio, statisticheRecap } = await import(
  '../src/lib/recap.js'
)

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
