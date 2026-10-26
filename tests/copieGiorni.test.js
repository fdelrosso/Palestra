import test from 'node:test'
import assert from 'node:assert/strict'
import {
  conGiorno,
  normalizzaScheda,
  nuovaScheda,
  nuovoEsercizio,
  nuovoGiorno,
  ricomponiGiorni,
} from '../src/data/model.js'
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
  // Chiusa, e la successiva parte da sola (se c'e').
  assert.equal(s.settimanaCorrente > 1 || statoScheda(s).settimanaCompletata, true)
})

test('ricomponiGiorni: 2 allenamenti su 4 giorni → A B e due copie in giro', () => {
  const { giorni, persi } = ricomponiGiorni([], 4, 2)
  assert.equal(giorni.length, 4)
  assert.deepEqual(giorni.slice(2).map((g) => g.copiaDi), [giorni[0].id, giorni[1].id])
  assert.deepEqual(persi, [])
})

test('ricomponiGiorni: 4 allenamenti su 2 giorni → quattro giorni veri, nessuna copia', () => {
  const { giorni } = ricomponiGiorni([], 2, 4)
  assert.equal(giorni.length, 4)
  assert.ok(giorni.every((g) => g.tipo === 'workout' && !g.copiaDi))
})

test('ricomponiGiorni: una scheda esistente tiene allenamenti e copie (coi loro id)', () => {
  const s = abab()
  const [a, b, a2, b2] = s.giorni
  const { giorni } = ricomponiGiorni(s.giorni, 4, 2)
  assert.deepEqual(giorni.map((g) => g.id), [a.id, b.id, a2.id, b2.id])
  assert.equal(giorni[0].esercizi[0].nome, 'Squat')
  // Passando a 3 allenamenti su 3 giorni le copie se ne vanno, B resta.
  const tre = ricomponiGiorni(s.giorni, 3, 3)
  assert.deepEqual(tre.giorni.slice(0, 2).map((g) => g.id), [a.id, b.id])
  assert.ok(tre.giorni.every((g) => !g.copiaDi))
  // A uno solo: B è fra i persi, e l'unica copia rimasta è di A.
  const uno = ricomponiGiorni(s.giorni, 2, 1)
  assert.deepEqual(uno.persi.map((g) => g.id), [b.id])
  assert.deepEqual(uno.giorni.map((g) => g.copiaDi || g.id), [a.id, a.id])
})

test('ricomponiGiorni: senza giorni scelti i riposi restano al loro posto', () => {
  const a = nuovoGiorno({ nome: 'A' })
  const r = nuovoGiorno({ tipo: 'rest', nome: 'Rest' })
  const b = nuovoGiorno({ nome: 'B' })
  assert.deepEqual(ricomponiGiorni([a, r, b], 0, 2).giorni.map((g) => g.id), [a.id, r.id, b.id])
  assert.deepEqual(ricomponiGiorni([a, r, b], 3, 2).giorni.slice(0, 2).map((g) => g.id), [a.id, b.id])
})
