import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

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

const { muscoliDaCompletare, conMuscoliCompletati, sceltaCompleta, chiaveMuscoli } = await import(
  '../src/lib/muscoliDaCompletare.js'
)

// I muscoli indovinati degli esercizi salvati prima del 2026-10-20 (components/AvvisoMuscoli).

const scheda = {
  giorni: [
    {
      esercizi: [
        { nome: 'Macchina di Marco', gruppi: ['gambe'] },
        { nome: 'Leg extension', gruppi: ['gambe'] },
        { nome: 'Panca piana bilanciere', gruppi: ['petto'] },
        { nome: 'Leg curl', gruppi: ['gambe'], sottogruppi: ['femorali'] },
      ],
    },
  ],
  completamenti: [{ data: 'x', esercizi: [{ nome: 'Macchina di Marco', gruppi: ['gambe'] }] }],
}

test('da completare: gambe, spalle e schiena senza muscoli scritti, quelli che non si sanno prima', () => {
  const righe = muscoliDaCompletare([scheda])
  assert.deepEqual(
    righe.map((r) => [r.nome, r.ipotesi, r.inScheda, r.fatti]),
    [
      ['Macchina di Marco', [], 1, 1],
      ['Leg extension', ['quadricipiti'], 1, 0],
    ],
  )
})

test('la scelta va a tutti gli esercizi uguali, nella scheda e negli allenamenti fatti', () => {
  const k = chiaveMuscoli({ nome: 'Macchina di Marco', gruppi: ['gambe'] })
  const nuova = conMuscoliCompletati(scheda, new Map([[k, { gruppi: ['gambe', 'glutei'], sottogruppi: ['adduttori'] }]]))
  assert.deepEqual(nuova.giorni[0].esercizi[0].sottogruppi, ['adduttori'])
  assert.deepEqual(nuova.giorni[0].esercizi[0].gruppi, ['gambe', 'glutei'])
  assert.deepEqual(nuova.completamenti[0].esercizi[0].sottogruppi, ['adduttori'])
  // Gli altri non si toccano.
  assert.equal(nuova.giorni[0].esercizi[1], scheda.giorni[0].esercizi[1])
  // Niente da applicare: la stessa scheda.
  assert.equal(conMuscoliCompletati(scheda, new Map()), scheda)
  assert.equal(muscoliDaCompletare([nuova]).length, 1)
})

test('una scelta è completa con un gruppo e un muscolo per ogni gruppo che si divide', () => {
  assert.equal(sceltaCompleta({ gruppi: ['gambe'], sottogruppi: [] }), false)
  assert.equal(sceltaCompleta({ gruppi: ['gambe', 'glutei'], sottogruppi: ['quadricipiti'] }), true)
  assert.equal(sceltaCompleta({ gruppi: ['gambe', 'schiena'], sottogruppi: ['quadricipiti'] }), false)
  assert.equal(sceltaCompleta({ gruppi: [], sottogruppi: [] }), false)
})
