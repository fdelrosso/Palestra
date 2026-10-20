import test from 'node:test'
import assert from 'node:assert/strict'
import { conGiorno, normalizzaScheda, nuovaScheda, nuovoEsercizio, nuovoGiorno } from '../src/data/model.js'
import { statoScheda, segnaCompletato } from '../src/lib/progression.js'

// 2 allenamenti su 4 giorni: A B A B, con A e B scritti una volta sola.
function abab() {
  const a = nuovoGiorno({ nome: 'Giorno A', esercizi: [nuovoEsercizio({ nome: 'Squat' })] })
  const b = nuovoGiorno({ nome: 'Giorno B', esercizi: [nuovoEsercizio({ nome: 'Panca' })] })
  return normalizzaScheda(
    nuovaScheda({
      giorniSettimana: [0, 1, 3, 4],
      giorni: [a, b, nuovoGiorno({ copiaDi: a.id }), nuovoGiorno({ copiaDi: b.id })],
    }),
  )
}

test('le copie prendono nome ed esercizi dal loro originale', () => {
  const [a, , a2] = abab().giorni
  assert.equal(a2.nome, 'Giorno A')
  assert.deepEqual(a2.esercizi, a.esercizi)
  assert.notEqual(a2.id, a.id)
})

test('una modifica fatta su una copia finisce sull’originale e sulle altre copie', () => {
  const s = abab()
  const [a, , a2] = s.giorni
  const dopo = conGiorno(s, a2.id, (g) => ({ esercizi: [...g.esercizi, nuovoEsercizio({ nome: 'Affondi' })] }))
  assert.equal(dopo.giorni[0].esercizi.length, 2)
  assert.equal(dopo.giorni[2].esercizi.length, 2)
  assert.equal(dopo.giorni[2].copiaDi, a.id)
})

test('la settimana si chiude dopo i 4 allenamenti, non dopo A e B', () => {
  let s = abab()
  const [a, b, a2, b2] = s.giorni
  s = segnaCompletato(segnaCompletato(s, 1, a.id), 1, b.id)
  assert.equal(statoScheda(s).settimanaCompletata, false)
  assert.equal(statoScheda(s).giornoCorrente.id, a2.id)
  s = segnaCompletato(segnaCompletato(s, 1, a2.id), 1, b2.id)
  assert.equal(statoScheda(s).settimanaCompletata, true)
})
