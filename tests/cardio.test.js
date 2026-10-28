import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizzaScheda } from '../src/data/model.js'
import { misuraProposta, parametriProposti, tipoEsercizio } from '../src/lib/eserciziLibreria.js'
import { testoTempo } from '../src/lib/schema.js'

test('riscaldamento e stretching restano testo: non diventano esercizi', () => {
  const s = normalizzaScheda({
    giorni: [{ id: 'g', riscaldamento: "10' ellittica", stretching: 'Quadricipiti 30"', esercizi: [{ id: 'x', nome: 'Panca' }] }],
  })
  const g = s.giorni[0]
  assert.equal(g.riscaldamento, "10' ellittica")
  assert.equal(g.stretching, 'Quadricipiti 30"')
  assert.deepEqual(g.esercizi.map((e) => e.id), ['x'])
})

test('tipo, misura e parametri proposti dalla libreria', () => {
  assert.equal(tipoEsercizio({ nome: 'Tapis roulant (corsa)' }), 'cardio')
  assert.equal(tipoEsercizio({ nome: 'Rotazioni esterne ai cavi (cuffia)' }), 'forza')
  assert.equal(tipoEsercizio({ nome: 'Qualcosa', gruppo: 'cardio' }), 'cardio')
  assert.equal(tipoEsercizio({ nome: 'Corsa al parco', tipo: 'cardio' }), 'cardio')
  assert.equal(misuraProposta({ nome: 'Cyclette' }), 'tempo')
  assert.equal(misuraProposta({ nome: 'Burpees' }), 'rip')
  assert.equal(misuraProposta({ nome: 'Plank' }), 'tempo')
  assert.deepEqual(parametriProposti({ nome: 'Tapis roulant (corsa)' }), ['velocita', 'pendenza', 'distanza', 'zona'])
})

test('un esercizio a tempo in una riga', () => {
  const uno = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null, parametri: { livello: 8, zona: 2 } }], recuperoSec: null, nota: '' }
  assert.equal(testoTempo(uno), '10 min · liv 8 · zona 2')
  const intervalli = { fasi: [{ serie: 8, rip: { sec: 30 }, carico: null, parametri: { distanza: 1500 } }], recuperoSec: 90, nota: '' }
  assert.equal(testoTempo(intervalli), '8×30" · 1,5 km · rec 1\'30"')
})

test('un esercizio a tempo esportato si rilegge uguale', async () => {
  const { leggiRiga } = await import('../src/lib/parser.js')
  const { schemaInTesto } = await import('../src/lib/schema.js')
  const fase = { serie: 1, rip: { sec: 600 }, carico: null, parametri: { velocita: 10, pendenza: 5, livello: 8, watt: 150, distanza: 2500, zona: 2 } }
  const testo = schemaInTesto({ fasi: [fase], recuperoSec: null, nota: '' })
  const r = leggiRiga(`Tapis roulant ${testo}`)
  assert.equal(r.nome, 'Tapis roulant')
  assert.deepEqual(r.fasi, [fase])
  assert.deepEqual(leggiRiga('Plank 3x1\'30" rec 1\'').fasi[0].rip, { sec: 90 })
})

test('il cardio di riscaldamento va in testa e non è in superserie', async () => {
  const { riscaldamentoInTesta, diRiscaldamento } = await import('../src/lib/preparazione.js')
  const lista = [
    { id: 'panca', nome: 'Panca piana bilanciere' },
    { id: 'croci', nome: 'Croci ai cavi', insiemeAlPrecedente: true },
    { id: 'tapis', nome: 'Tapis roulant (corsa)', riscaldamento: true, insiemeAlPrecedente: true },
    { id: 'curl', nome: 'Curl manubri', insiemeAlPrecedente: true },
  ]
  const r = riscaldamentoInTesta(lista)
  assert.deepEqual(r.map((e) => e.id), ['tapis', 'panca', 'croci', 'curl'])
  assert.deepEqual(r.map((e) => !!e.insiemeAlPrecedente), [false, false, true, false])
  // Il segno vale solo sul cardio, e una lista già in ordine resta quella.
  assert.equal(diRiscaldamento({ nome: 'Panca piana bilanciere', riscaldamento: true }), false)
  assert.equal(riscaldamentoInTesta(r), r)
})

test('la sessione porta il cardio di riscaldamento in testa, segnato', async () => {
  const { creaSessione } = await import('../src/lib/session.js')
  const cardio = { fasi: [{ serie: 1, rip: { sec: 600 }, carico: null }], recuperoSec: null, nota: '' }
  const s = normalizzaScheda({
    id: 's',
    giorni: [
      {
        id: 'g',
        riscaldamento: 'Mobilità spalle',
        esercizi: [
          { id: 'panca', nome: 'Panca piana bilanciere' },
          { id: 'cyc', nome: 'Cyclette', riscaldamento: true, schemaBase: cardio },
        ],
      },
    ],
  })
  const sess = creaSessione(s, s.giorni[0], 1)
  assert.deepEqual(sess.esercizi.map((e) => [e.esercizioId, !!e.riscaldamento]), [['cyc', true], ['panca', false]])
  assert.equal(sess.riscaldamento, 'Mobilità spalle')
})

test('il disegno del cardio: quello della macchina, se no tutti a rotazione', async () => {
  const { immaginiCardio, RISCALDAMENTO } = await import('../src/lib/preparazione.js')
  assert.deepEqual(immaginiCardio('Tapis roulant (corsa)'), ['/preparazione/riscaldamento-1.png'])
  assert.deepEqual(immaginiCardio('Vogatore'), ['/preparazione/riscaldamento-4.png'])
  assert.deepEqual(immaginiCardio('Burpees'), RISCALDAMENTO.sfondo)
})

test('la distanza dalla velocità e dal tempo', async () => {
  const { distanzaStimata } = await import('../src/lib/schema.js')
  const { serieChiusa, ricalcolaDistanza } = await import('../src/lib/session.js')
  assert.equal(distanzaStimata(10, 600), 1667)
  assert.equal(distanzaStimata(null, 600), null)
  const schema = { fasi: [{ serie: 1, rip: { sec: 600 } }] }
  // Chiudendo: la distanza calcolata, ma non sopra quella scritta.
  const s = serieChiusa(schema, 0, 'fatto', { sec: 600, parametri: { velocita: 12 } })
  assert.equal(s.parametri.distanza, 2000)
  assert.equal(serieChiusa(schema, 0, 'fatto', { sec: 600, parametri: { velocita: 12, distanza: 1900 } }).parametri.distanza, 1900)
  // Corretto il tempo: la calcolata segue, la scritta a mano resta.
  assert.equal(ricalcolaDistanza(s, { ...s, sec: 300 }).parametri.distanza, 1000)
  const mano = { ...s, parametri: { velocita: 12, distanza: 1900 } }
  assert.equal(ricalcolaDistanza(mano, { ...mano, sec: 300 }).parametri.distanza, 1900)
  // Toccata a mano dopo: non si ricalcola sopra.
  assert.equal(ricalcolaDistanza(s, { ...s, parametri: { velocita: 12, distanza: 2100 } }).parametri.distanza, 2100)
})

test('il timer appena avviato non conta un tempo negativo (niente secondi in più per un istante)', async () => {
  const { secondiFatti } = await import('../src/lib/session.js')
  // L'ultimo tick del timer è di 3 secondi prima di play.
  assert.equal(secondiFatti({ fatti: 0, da: 10_000 }, 7_000), 0)
  assert.equal(secondiFatti({ fatti: 20, da: 10_000 }, 7_000), 20)
  assert.equal(secondiFatti({ fatti: 20, da: 10_000 }, 15_500), 25)
})
