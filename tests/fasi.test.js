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
  caricoDellaFase,
  conCaricoFase,
  faseDiSerie,
  fasiDi,
  haFasi,
  obiettivoSerie,
  schemaDaFasi,
  vocePerFase,
} = await import('../src/lib/fasi.js')
const { formatCarico, formatSerieRip } = await import('../src/lib/format.js')
const { volumeEsercizio } = await import('../src/lib/recap.js')

const military = [
  { serie: '3', ripetizioni: '5', carico: '80kg' },
  { serie: '2', ripetizioni: '2', carico: '90kg' },
]

test('3×5 poi 2×2 si scrive serie per serie nei campi di sempre', () => {
  assert.deepEqual(schemaDaFasi(military), {
    serie: '5',
    ripetizioni: '5/5/5/2/2',
    carico: '80kg/80kg/80kg/90kg/90kg',
  })
  // Un campo uguale per tutte resta scritto una volta.
  assert.deepEqual(
    schemaDaFasi([
      { serie: '3', ripetizioni: '5', carico: '80kg' },
      { serie: '2', ripetizioni: '2', carico: '80kg' },
    ]),
    { serie: '5', ripetizioni: '5/5/5/2/2', carico: '80kg' },
  )
})

test('e si rilegge nelle stesse fasi', () => {
  assert.deepEqual(fasiDi(schemaDaFasi(military)), military)
  assert.equal(haFasi(schemaDaFasi(military)), true)
})

test('una piramide e gli schemi di sempre restano una fase sola, com’erano', () => {
  const piramide = { serie: '3', ripetizioni: '12/10/8', carico: '60/70/80kg' }
  assert.deepEqual(fasiDi(piramide), [piramide])
  assert.equal(formatSerieRip(piramide), '3×12/10/8')
  assert.equal(formatCarico(piramide), '60/70/80kg')
  // "15/12" su 4 serie non dice come si divide: non si indovina.
  assert.equal(haFasi({ serie: '4', ripetizioni: '15/12', carico: '' }), false)
  assert.equal(haFasi({ serie: '4 giri', ripetizioni: '10', carico: '20kg' }), false)
  assert.deepEqual(schemaDaFasi([{ serie: '4 giri', ripetizioni: '10', carico: '' }]), {
    serie: '4 giri',
    ripetizioni: '10',
    carico: '',
  })
})

test('la fase appena aggiunta e ancora vuota non cambia niente', () => {
  assert.deepEqual(schemaDaFasi([military[0], { serie: '', ripetizioni: '', carico: '' }]), military[0])
})

test('come si mostra', () => {
  const s = schemaDaFasi(military)
  assert.equal(formatSerieRip(s), '3×5 + 2×2')
  assert.equal(formatCarico(s), '80kg + 90kg')
  assert.equal(formatCarico(schemaDaFasi([military[0], { ...military[1], carico: '80kg' }])), '80kg')
  assert.equal(formatCarico(schemaDaFasi([military[0], { ...military[1], carico: '' }])), '80kg + —')
})

test('serie per serie: fase, ripetizioni e carico', () => {
  const s = schemaDaFasi(military)
  assert.deepEqual([0, 1, 2, 3, 4].map((j) => faseDiSerie(s, j)), [0, 0, 0, 1, 1])
  assert.deepEqual(obiettivoSerie(s, 3), { ripetizioni: '2', carico: '90kg' })
  assert.equal(caricoDellaFase(s, 1), '90kg')
  assert.equal(faseDiSerie({ serie: '4', ripetizioni: '8', carico: '' }, 3), 0)
})

test('cambiare il peso di una fase lascia stare le altre', () => {
  const s = schemaDaFasi(military)
  assert.deepEqual(fasiDi({ ...s, ...conCaricoFase(s, 1, '95kg') }), [
    military[0],
    { ...military[1], carico: '95kg' },
  ])
  // Con una fase sola è il carico e basta.
  assert.deepEqual(conCaricoFase({ serie: '4', ripetizioni: '8', carico: '50kg' }, 0, '55kg'), {
    carico: '55kg',
  })
})

test('il volume del recap conta ogni fase col suo peso', () => {
  const schema = schemaDaFasi(military)
  const sets = Array.from({ length: 5 }, () => ({ colore: 'verde' }))
  assert.equal(volumeEsercizio({ schema, sets }), 3 * 5 * 80 + 2 * 2 * 90)
})

test('lo storico ristretto a una fase: il suo carico e i colori delle sue serie', () => {
  const s = schemaDaFasi(military)
  const voce = {
    ...s,
    colori: ['verde', 'verde', 'verde', 'rosso', 'giallo'],
    verde: 3,
    giallo: 1,
    rosso: 1,
    tot: 5,
  }
  const seconda = vocePerFase(voce, 1)
  assert.equal(seconda.carico, '90kg')
  assert.deepEqual([seconda.verde, seconda.giallo, seconda.rosso, seconda.tot], [0, 1, 1, 2])
  assert.equal(vocePerFase(voce, 0).verde, 3)
  // Una volta di quando l'esercizio aveva una fase sola resta com'era.
  const vecchia = { serie: '4', ripetizioni: '8', carico: '70kg', colori: ['verde'], verde: 1, tot: 1 }
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
  assert.deepEqual(fasiDi(perFase.schemaBase), military)
  assert.equal(perFase.schemaBase.recupero, '3min')
  const unoSolo = primoEsercizio('Military press 3x5 poi 2x2 80kg')
  assert.equal(formatCarico(unoSolo.schemaBase), '80kg')
  assert.equal(formatSerieRip(unoSolo.schemaBase), '3×5 + 2×2')
})

test('il messaggio del PT: "2x12kg" sono due manubri, non una seconda fase', () => {
  const e = primoEsercizio('Curl 3x10 2x12kg')
  assert.equal(e.schemaBase.serie, '3')
  assert.equal(e.schemaBase.ripetizioni, '10')
  assert.equal(haFasi(e.schemaBase), false)
})

test('nel recap il peso massimo è quello della fase più pesante', () => {
  const riep = {
    data: '2026-09-29T19:00:00Z',
    esercizi: [
      { nome: 'Military press', schema: schemaDaFasi(military), sets: Array.from({ length: 5 }, () => ({ colore: 'verde' })) },
    ],
  }
  assert.equal(statisticheRecap(riep).pesoMax?.numero, 90)
})

const { consiglioCarico, storicoCarichi } = await import('../src/lib/carico.js')

test('il consiglio sul peso ragiona fase per fase, e senza fase non tocca il campo', () => {
  const schede = [
    {
      completamenti: [
        {
          data: '2026-09-22T19:00:00Z',
          esercizi: [
            {
              nome: 'Military press',
              schema: schemaDaFasi(military),
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
  assert.match(prima.caricoSuggerito, /^8\d(,\d)?kg$/)
  const seconda = consiglioCarico('Military press', carichi, { fase: 1 })
  assert.equal(seconda.azione, 'riduci')
  assert.match(seconda.caricoSuggerito, /^8\d(,\d)?kg$/)
  // Senza dire la fase non si propone un numero: "85kg/80kg/…" sarebbe un
  // campo rovinato.
  assert.equal(consiglioCarico('Military press', carichi).caricoSuggerito, '')
})

const { foglioScheda } = await import('../src/lib/schedaExcel.js')
const { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } = await import('../src/data/model.js')

test('in Excel una fase per "+", come la scriverebbe il PT', () => {
  const scheda = nuovaScheda({
    nome: 'Forza',
    numeroSettimane: 1,
    giorni: [
      nuovoGiorno({
        nome: 'Giorno A',
        esercizi: [nuovoEsercizio({ nome: 'Military press', schemaBase: schemaVuoto(schemaDaFasi(military)) })],
      }),
    ],
  })
  const valori = foglioScheda(scheda).righe.flat().map((c) => c?.v)
  assert.ok(valori.includes('3 + 2'))
  assert.ok(valori.includes('5 + 2'))
  assert.ok(valori.includes('80kg + 90kg'))
})
