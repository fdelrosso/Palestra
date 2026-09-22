import test from 'node:test'
import assert from 'node:assert/strict'

// parseRecupero non importa niente: si carica senza il loader che serve altrove.
import {
  PASSO_RECUPERO,
  formatSec,
  parseRecuperoSec,
  presetRecupero,
} from '../src/lib/parseRecupero.js'

// --------------------------------------------- leggere il recupero del PT

test('il recupero scritto a mano dal PT si legge nei suoi tanti modi', () => {
  assert.equal(parseRecuperoSec('1min'), 60)
  assert.equal(parseRecuperoSec('2 min'), 120)
  // ⚠️ Una cifra dopo la virgola sono DECIMI di minuto, due sono SECONDI:
  // "1,5min" è un minuto e mezzo, "1,15min" è un minuto e un quarto.
  assert.equal(parseRecuperoSec('1,5min'), 90)
  assert.equal(parseRecuperoSec('1,15min'), 75)
  assert.equal(parseRecuperoSec('1,45min'), 105)
  assert.equal(parseRecuperoSec('30"'), 30)
  assert.equal(parseRecuperoSec('45 sec'), 45)
  assert.equal(parseRecuperoSec("2'"), 120)
  // Numero nudo: da 10 in su sono secondi, sotto sono minuti.
  assert.equal(parseRecuperoSec('90'), 90)
  assert.equal(parseRecuperoSec('2'), 120)
  assert.equal(parseRecuperoSec(''), null)
  assert.equal(parseRecuperoSec('a piacere'), null)
})

// ------------------------------------------------- i recuperi preimpostati

test('i preimpostati vanno di 15 secondi in 15 secondi, da 30" a 3 minuti', () => {
  const scala = presetRecupero(90)
  assert.equal(scala[0], 30)
  assert.equal(scala[scala.length - 1], 180)
  for (let i = 1; i < scala.length; i += 1) {
    assert.equal(scala[i] - scala[i - 1], PASSO_RECUPERO, `salto sbagliato a ${scala[i]}`)
  }
})

test('il recupero della scheda c è sempre, anche se non cade sulla scala', () => {
  // "1,20min" fa 80 secondi: non è un multiplo di 15, e deve esserci lo stesso
  // — se no il default non si potrebbe più ripremere dopo averlo cambiato.
  const scala = presetRecupero(80)
  assert.ok(scala.includes(80), 'manca il recupero della scheda')
  // E resta in ordine, in mezzo ai suoi vicini.
  assert.deepEqual([...scala].sort((a, b) => a - b), scala)
  assert.equal(scala[scala.indexOf(80) - 1], 75)
  assert.equal(scala[scala.indexOf(80) + 1], 90)
})

test('un recupero della scheda che è già sulla scala non si duplica', () => {
  const scala = presetRecupero(120)
  assert.equal(scala.filter((s) => s === 120).length, 1)
})

test('senza un recupero della scheda la scala resta quella di sempre', () => {
  assert.deepEqual(presetRecupero(0), presetRecupero(null))
  assert.equal(presetRecupero(null).length, 11)
})

test('i preimpostati si scrivono come li legge una persona', () => {
  assert.deepEqual(presetRecupero(90).map(formatSec), [
    '0:30', '0:45', '1:00', '1:15', '1:30', '1:45', '2:00', '2:15', '2:30', '2:45', '3:00',
  ])
})
