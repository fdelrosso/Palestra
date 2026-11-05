import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
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
  conMisura,
  senzaMisura,
  normalizzaMisure,
  andamento,
  ultimaMisura,
  variazione,
  erroreMisura,
  valoreMisura,
  testoVariazione,
  pesoDaAllineare,
} = await import('../src/lib/misure.js')
const { normalizzaPreferenze, preferenzeVuote } = await import('../src/lib/preferenzeCibo.js')

test('misure: una voce per giorno, la seconda pesata dello stesso giorno corregge la prima', () => {
  let m = conMisura([], { data: '2026-11-01', peso: '80,2' })
  m = conMisura(m, { data: '2026-10-01', peso: 82, vita: '90' })
  m = conMisura(m, { data: '2026-11-01', peso: '79,8' })
  assert.deepEqual(m, [
    { data: '2026-10-01', peso: 82, vita: 90 },
    { data: '2026-11-01', peso: 79.8 },
  ])
  assert.deepEqual(senzaMisura(m, '2026-10-01'), [{ data: '2026-11-01', peso: 79.8 }])
})

test('misure: via i valori fuori scala, le voci vuote e quelle senza data', () => {
  assert.deepEqual(
    normalizzaMisure([
      { data: '2026-11-01', peso: '7840', vita: '85' },
      { data: '2026-11-02', peso: '' },
      { peso: 80 },
      'spazzatura',
      { data: '2026-11-03', grasso: '18,5', ignoto: 3 },
    ]),
    [
      { data: '2026-11-01', vita: 85 },
      { data: '2026-11-03', grasso: 18.5 },
    ],
  )
  assert.equal(valoreMisura('peso', '78,44'), 78.4)
  assert.equal(erroreMisura('peso', '784'), 'Peso: tra 30 e 300 kg')
  assert.equal(erroreMisura('peso', ''), '')
  assert.equal(normalizzaMisure(null).length, 0)
})

test('misure: andamento e ultima solo coi giorni in cui il campo c\'è', () => {
  const m = [
    { data: '2026-09-01', peso: 84 },
    { data: '2026-09-15', vita: 92 },
    { data: '2026-10-01', peso: 82.5, vita: 90 },
  ]
  assert.deepEqual(andamento(m, 'peso'), [
    { data: '2026-09-01', valore: 84 },
    { data: '2026-10-01', valore: 82.5 },
  ])
  assert.deepEqual(ultimaMisura(m, 'vita'), { data: '2026-10-01', valore: 90 })
  assert.equal(ultimaMisura(m, 'fianchi'), null)
})

test('misure: la variazione è sul mese, con la pesata più vicina a 30 giorni prima', () => {
  const m = [
    { data: '2026-09-01', peso: 85 },
    { data: '2026-10-01', peso: 83 },
    { data: '2026-10-20', peso: 82 },
    { data: '2026-11-04', peso: 81.6 },
  ]
  // 30 giorni prima del 4/11 è il 5/10: la più recente almeno così vecchia è l'1/10.
  assert.deepEqual(variazione(m, 'peso', 30), { differenza: -1.4, da: '2026-10-01', a: '2026-11-04', giorni: 34 })
  // Se nessuna è abbastanza vecchia, dalla prima, e si dice da quanti giorni.
  assert.deepEqual(variazione(m.slice(2), 'peso', 30), { differenza: -0.4, da: '2026-10-20', a: '2026-11-04', giorni: 15 })
  assert.equal(variazione(m.slice(3), 'peso'), null)
  assert.equal(testoVariazione(-1.4, 'kg'), '−1,4 kg')
  assert.equal(testoVariazione(0.5, 'cm'), '+0,5 cm')
})

test('misure: stanno nelle preferenze e passano dalla loro pulizia', () => {
  assert.deepEqual(preferenzeVuote().misure, [])
  const p = normalizzaPreferenze({ misure: [{ data: '2026-11-04', peso: '81,6' }, { data: 'ieri', peso: 80 }] })
  assert.deepEqual(p.misure, [{ data: '2026-11-04', peso: 81.6 }])
  // Le preferenze di prima, senza misure, restano buone.
  assert.deepEqual(normalizzaPreferenze({ regime: 'onnivoro' }).misure, [])
})

test('misure: il peso delle calorie segue solo l\'ultima pesata', () => {
  const m = [{ data: '2026-10-01', peso: 82 }, { data: '2026-11-01', peso: 80 }]
  // Tolta l'ultima (un errore di battitura), si torna a quella di prima.
  assert.equal(pesoDaAllineare(m, senzaMisura(m, '2026-11-01')), 82)
  assert.equal(pesoDaAllineare(m, conMisura(m, { data: '2026-11-01', peso: 79 })), 79)
  // Una voce vecchia corretta o tolta non copre il peso scritto a mano nei dati.
  assert.equal(pesoDaAllineare(m, conMisura(m, { data: '2026-10-01', peso: 83 })), null)
  assert.equal(pesoDaAllineare(m, senzaMisura(m, '2026-10-01')), null)
  // Senza più pesate non c'è niente da riportare.
  assert.equal(pesoDaAllineare(m.slice(1), []), null)
})
