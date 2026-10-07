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

// Le FASI di un esercizio ("3×5 a 80kg poi 2×2 a 90kg") nello schema in numeri
// (lib/schema): sono le voci di `fasi`.
const {
  caricoDellaFase,
  conCaricoFase,
  faseDiSerie,
  fasiDi,
  formatCarico,
  formatSerieRip,
  haFasi,
  obiettivoSerie,
} = await import('../src/lib/schema.js')
const { volumeEsercizio } = await import('../src/lib/recap.js')
const { vocePerFase } = await import('../src/lib/carico.js')

const kg = (valore) => ({ tipo: 'kg', valore })
const military = {
  fasi: [
    { serie: 3, rip: 5, carico: kg(80) },
    { serie: 2, rip: 2, carico: kg(90) },
  ],
  recuperoSec: 180,
  nota: '',
}

test('come si mostra', () => {
  assert.equal(formatSerieRip(military), '3×5 + 2×2')
  assert.equal(formatCarico(military), '80kg + 90kg')
  assert.equal(haFasi(military), true)
  const stesso = { ...military, fasi: military.fasi.map((f) => ({ ...f, carico: kg(80) })) }
  assert.equal(formatCarico(stesso), '80kg')
  const senza = { ...military, fasi: [military.fasi[0], { ...military.fasi[1], carico: null }] }
  assert.equal(formatCarico(senza), '80kg + —')
})

test('serie per serie: fase, ripetizioni e carico', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((j) => faseDiSerie(military, j)), [0, 0, 0, 1, 1])
  assert.deepEqual(obiettivoSerie(military, 3), { rip: 2, carico: kg(90) })
  assert.deepEqual(caricoDellaFase(military, 1), kg(90))
  assert.equal(faseDiSerie({ fasi: [{ serie: 4, rip: 8, carico: null }], recuperoSec: null, nota: '' }, 3), 0)
})

test('cambiare il peso di una fase lascia stare le altre', () => {
  assert.deepEqual(fasiDi(conCaricoFase(military, 1, kg(95))), [military.fasi[0], { ...military.fasi[1], carico: kg(95) }])
})

test('il volume del recap conta ogni fase col suo peso', () => {
  const sets = Array.from({ length: 5 }, () => ({ colore: 'verde' }))
  assert.equal(volumeEsercizio({ schema: military, sets }), 3 * 5 * 80 + 2 * 2 * 90)
})

test('lo storico ristretto a una fase: il suo carico e i colori delle sue serie', () => {
  const voce = {
    schema: military,
    colori: ['verde', 'verde', 'verde', 'rosso', 'giallo'],
    verde: 3,
    giallo: 1,
    rosso: 1,
    tot: 5,
  }
  const seconda = vocePerFase(voce, 1)
  assert.deepEqual(seconda.schema.fasi, [military.fasi[1]])
  assert.deepEqual([seconda.verde, seconda.giallo, seconda.rosso, seconda.tot], [0, 1, 1, 2])
  assert.equal(vocePerFase(voce, 0).verde, 3)
  // Una volta di quando l'esercizio aveva una fase sola resta com'era.
  const vecchia = { schema: { serie: '4', ripetizioni: '8', carico: '70kg' }, colori: ['verde'], verde: 1, tot: 1 }
  assert.equal(vocePerFase(vecchia, 1), vecchia)
})

const { parseSchedaTesto } = await import('../src/lib/parser.js')
const { statisticheRecap } = await import('../src/lib/recap.js')

const primoEsercizio = (riga) =>
  parseSchedaTesto(`Giorno A\n\n${riga}`).giorni[0].esercizi[0]

test('il messaggio del PT: "Military press 3x5 poi 2x2"', () => {
  const e = primoEsercizio('Military press 3x5 poi 2x2')
  assert.equal(e.nome, 'Military press')
  assert.equal(formatSerieRip(e.schemaBase), '3×5 + 2×2')
  assert.equal(e.nota, '', 'il "poi" non deve finire nelle note')
})

test('il messaggio del PT: un peso per fase, o uno solo in fondo per tutte', () => {
  const perFase = primoEsercizio('Military press 3x5 80kg poi 2x2 90kg rec 3min')
  assert.deepEqual(fasiDi(perFase.schemaBase), military.fasi)
  assert.equal(perFase.schemaBase.recuperoSec, 180)
  const unoSolo = primoEsercizio('Military press 3x5 poi 2x2 80kg')
  assert.equal(formatCarico(unoSolo.schemaBase), '80kg')
  assert.equal(formatSerieRip(unoSolo.schemaBase), '3×5 + 2×2')
})

test('il messaggio del PT: "2x12kg" sono due manubri, non una seconda fase', () => {
  const e = primoEsercizio('Curl 3x10 2x12kg')
  assert.equal(haFasi(e.schemaBase), false)
  assert.equal(e.schemaBase.fasi[0].serie, 3)
  assert.equal(e.schemaBase.fasi[0].rip, 10)
})

test('nel recap il peso massimo è quello della fase più pesante', () => {
  const riep = {
    data: '2026-09-29T19:00:00Z',
    esercizi: [
      { nome: 'Military press', schema: military, sets: Array.from({ length: 5 }, () => ({ colore: 'verde' })) },
    ],
  }
  assert.equal(statisticheRecap(riep).pesoMax?.numero, 90)
})

const { consiglioCarico, storicoCarichi } = await import('../src/lib/carico.js')

test('il consiglio sul peso ragiona fase per fase, e senza fase non propone un peso', () => {
  const schede = [
    {
      completamenti: [
        {
          data: '2026-09-22T19:00:00Z',
          esercizi: [
            {
              nome: 'Military press',
              schema: military,
              // Il 3×5 tutto facile, il 2×2 tutto duro.
              sets: ['verde', 'verde', 'verde', 'rosso', 'rosso'].map((colore) => ({ colore })),
            },
          ],
        },
      ],
    },
  ]
  const carichi = storicoCarichi(schede)
  const prima = consiglioCarico('Military press', carichi, { fase: 0 })
  assert.equal(prima.azione, 'aumenta')
  assert.ok(prima.caricoSuggerito.valore > 80 && prima.caricoSuggerito.valore < 90)
  const seconda = consiglioCarico('Military press', carichi, { fase: 1 })
  assert.equal(seconda.azione, 'riduci')
  assert.ok(seconda.caricoSuggerito.valore < 90)
  // Senza dire la fase non si propone un numero: ogni fase ha il suo peso.
  assert.equal(consiglioCarico('Military press', carichi).caricoSuggerito, null)
})

test('le schede salvate prima, con le fasi serie per serie, si leggono uguali', () => {
  const vecchio = { serie: '5', ripetizioni: '5/5/5/2/2', carico: '80kg/80kg/80kg/90kg/90kg', recupero: '3min' }
  assert.deepEqual(fasiDi(vecchio), military.fasi)
  assert.equal(formatSerieRip(vecchio), '3×5 + 2×2')
})

const { foglioScheda } = await import('../src/lib/schedaExcel.js')
const { nuovaScheda, nuovoEsercizio, nuovoGiorno } = await import('../src/data/model.js')

test('in Excel una fase per "+", come la scriverebbe il PT', () => {
  const scheda = nuovaScheda({
    nome: 'Forza',
    numeroSettimane: 1,
    giorni: [
      nuovoGiorno({
        nome: 'Giorno A',
        esercizi: [nuovoEsercizio({ nome: 'Military press', schemaBase: military })],
      }),
    ],
  })
  const valori = foglioScheda(scheda).righe.flat().map((c) => c?.v)
  assert.ok(valori.includes('3 + 2'))
  assert.ok(valori.includes('5 + 2'))
  assert.ok(valori.includes('80kg + 90kg'))
})
