import test from 'node:test'
import assert from 'node:assert/strict'

// Il filtro delle parole (lib/linguaggio): cosa si copre e, soprattutto, cosa
// NO — una parola innocua bloccata in una scheda o in una dieta è peggio di
// una parolaccia scappata.
const { censura, contieneParole, errorePerParole, trovaParole } = await import('../src/lib/linguaggio.js')

test('le parolacce si coprono, anche scritte coi trucchi', () => {
  for (const t of [
    'che cazzo', 'CAZZO', 'cazzzzo', 'c4zz0', 'c a z z o', 'c.a.z.z.o', 'kazzo', 'merda', 'stronzo',
    'vaffanculo', 'fanculo', 'testadicazzo', 'coglione', 'rompicoglioni', 'puttana', 'figa',
    'minchia', 'pezzo di merda', 'inculare', 'troia', 'sborra', 'pompino', 'fuck you', 'shit',
    'sei un idiota', 'cretino', 'frocio', 'negro', 'bastardo', '$tronzo',
  ]) {
    assert.ok(contieneParole(t), t)
  }
})

test('le bestemmie: due parole vicine, nei due ordini, anche attaccate', () => {
  for (const t of [
    'porco dio', 'Porco Dio!', 'dio cane', 'diocane', 'porcodio', 'porca madonna', 'madonna puttana',
    'dio bestia', 'dio-porco', 'cristo santo cane', 'dio boia', 'gesù cristo maiale', 'porco d1o',
  ]) {
    assert.ok(contieneParole(t), t)
  }
})

test('le parole normali (palestra, dieta, italiano di tutti i giorni) restano libere', () => {
  for (const t of [
    'Squat 5x5 a 100kg', 'calcolo del volume', 'muscolo', 'culturismo', 'culotte', 'figata!',
    'finocchio e pomodori', 'porca miseria', 'porca vacca che fatica', 'porcospino', 'cazzuola',
    'inculcare', 'studio cane', 'la cagna del vicino', 'Dio mio che fatica', 'grazie a dio',
    'mi sono scocciato', 'fucina', 'scimmia', 'negroni', 'Troiani', 'il conto', 'fichi secchi',
    'figo', 'cavolo', 'mannaggia', 'accidenti', 'stretching', 'cornetto', 'Madonna di Campiglio',
    'Lento avanti 3x10', 'riso basmati 80g', 'e a o', 'santo cielo', 'diodo', 'cul de sac',
    // Le doppie contano: "cazzo" non è "caz", quindi le -cazioni restano.
    'Indicazioni del nutrizionista', 'tonificazione', 'comunicazione', 'fagioli e fagiolini',
    'yogurt greco Fage', 'una bella sbornia', 'Kazakistan', 'un pezzo di pane',
  ]) {
    assert.equal(contieneParole(t), false, t)
  }
})

test('la censura tiene la lunghezza: il cursore nei campi non salta', () => {
  assert.equal(censura('che cazzo fai'), 'che ***** fai')
  assert.equal(censura('porco dio'), '***** ***')
  assert.equal(censura('c4zz0!'), '*****!')
  assert.equal(censura('🏋️ merda'), '🏋️ *****')
  // Le parole vicine restano: "di" non è un nome sacro.
  assert.equal(censura('sei un c.a.z.z.o di stronzo'), 'sei un *.*.*.*.* di *******')
  for (const t of ['che cazzo fai', 'porco dio', 'à è ì cazzo', '💪 stronzo 💪']) {
    assert.equal(censura(t).length, t.length)
  }
})

test('mentre si scrive, una parola in fondo non è ancora finita', () => {
  // "cazz" potrebbe diventare "cazzuola": si copre solo quando la parola è chiusa.
  assert.equal(censura('che cazz', { soloFinite: true }), 'che cazz')
  assert.equal(censura('che cazzo ', { soloFinite: true }), 'che ***** ')
  assert.equal(censura('che cazzo'), 'che *****')
})

test('nome e username si rifiutano invece di coprirsi', () => {
  assert.ok(errorePerParole('Stronzo99'))
  assert.ok(errorePerParole('porco_dio'))
  assert.equal(errorePerParole('Filippo'), '')
  assert.equal(trovaParole('').length, 0)
})
