import test from 'node:test'
import assert from 'node:assert/strict'
import { completamentoDi, isCompletato } from '../src/lib/progression.js'

test('completamentoDi: un giorno rifatto mostra l’ultima volta, la prima resta', () => {
  const prima = { settimana: 1, giornoId: 'g1', data: '2026-09-20T10:00:00.000Z', esercizi: [{}] }
  const ripetuto = { settimana: 1, giornoId: 'g1', data: '2026-09-25T10:00:00.000Z', esercizi: [{}] }
  const scheda = { completamenti: [prima, ripetuto] }
  assert.equal(completamentoDi(scheda, 1, 'g1'), ripetuto)
  assert.ok(isCompletato(scheda, 1, 'g1'))
  assert.equal(scheda.completamenti.length, 2)
})

test('scheda senza fine: finita la settimana parte la successiva, e non si chiude mai', async () => {
  const { segnaCompletato, statoScheda, impostaSettimana } = await import('../src/lib/progression.js')
  const giorni = [{ id: 'a', tipo: 'workout' }, { id: 'r', tipo: 'rest' }, { id: 'b', tipo: 'workout' }]
  let s = { giorni, completamenti: [], numeroSettimane: 1, settimanaCorrente: 1, senzaFine: true }
  s = segnaCompletato(s, 1, 'a')
  assert.equal(s.settimanaCorrente, 1)
  s = segnaCompletato(s, 1, 'b')
  assert.equal(s.settimanaCorrente, 2)
  assert.equal(statoScheda(s).schedaCompletata, false)
  assert.equal(statoScheda(s).giornoCorrente.id, 'a')
  assert.equal(impostaSettimana(s, 40).settimanaCorrente, 40)

  // Una scheda normale resta com'era: all'ultima settimana si chiude.
  let n = { giorni, completamenti: [], numeroSettimane: 1, settimanaCorrente: 1 }
  n = segnaCompletato(segnaCompletato(n, 1, 'a'), 1, 'b')
  assert.equal(n.settimanaCorrente, 1)
  assert.equal(statoScheda(n).schedaCompletata, true)
})

test('scheda con fine: finita una settimana parte da sola la successiva', async () => {
  const { segnaCompletato, statoScheda } = await import('../src/lib/progression.js')
  const giorni = [{ id: 'a', tipo: 'workout' }, { id: 'b', tipo: 'workout' }]
  let s = { giorni, completamenti: [], numeroSettimane: 3, settimanaCorrente: 2 }
  s = segnaCompletato(segnaCompletato(s, 2, 'a'), 2, 'b')
  assert.equal(s.settimanaCorrente, 3)
  assert.equal(statoScheda(s).giornoCorrente.id, 'a')
})

test('cancellato l’allenamento che chiudeva la settimana, si torna a quella', async () => {
  const { segnaCompletato, riapriSeTolto } = await import('../src/lib/progression.js')
  const giorni = [{ id: 'a', tipo: 'workout' }, { id: 'b', tipo: 'workout' }]
  const s = segnaCompletato(segnaCompletato({ giorni, completamenti: [], numeroSettimane: 1, settimanaCorrente: 1, senzaFine: true }, 1, 'a'), 1, 'b')
  assert.equal(s.settimanaCorrente, 2)
  const senzaB = { ...s, completamenti: s.completamenti.filter((c) => c.giornoId !== 'b') }
  assert.equal(riapriSeTolto(senzaB, 1).settimanaCorrente, 1)
  // Già allenato nella nuova settimana: resta dov'è.
  const conNuova = { ...senzaB, completamenti: [...senzaB.completamenti, { settimana: 2, giornoId: 'a', data: '2026-10-20' }] }
  assert.equal(riapriSeTolto(conNuova, 1).settimanaCorrente, 2)
  // Tolto uno di una settimana più vecchia: niente.
  assert.equal(riapriSeTolto({ ...senzaB, settimanaCorrente: 3 }, 1).settimanaCorrente, 3)
})
