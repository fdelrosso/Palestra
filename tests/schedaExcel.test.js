import test from 'node:test'
import assert from 'node:assert/strict'
import { inflateRawSync } from 'node:zlib'
import { creaXlsx } from '../src/lib/excel.js'
import { foglioScheda, nomeFileScheda, trattiSettimane } from '../src/lib/schedaExcel.js'

// Legge lo ZIP dalla directory centrale, come fa Excel: se i conti (offset,
// lunghezze, CRC) non tornano, qui si rompe prima che su un telefono.
function apriZip(byte) {
  const dv = new DataView(byte.buffer, byte.byteOffset, byte.byteLength)
  const fine = byte.length - 22
  assert.equal(dv.getUint32(fine, true), 0x06054b50, 'manca la fine della directory centrale')
  const quanti = dv.getUint16(fine + 10, true)
  let p = dv.getUint32(fine + 16, true)
  const file = {}
  for (let i = 0; i < quanti; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50)
    const metodo = dv.getUint16(p + 10, true)
    const lung = dv.getUint32(p + 20, true)
    const lNome = dv.getUint16(p + 28, true)
    const offset = dv.getUint32(p + 42, true)
    const nome = new TextDecoder().decode(byte.subarray(p + 46, p + 46 + lNome))
    assert.equal(dv.getUint32(offset, true), 0x04034b50, `intestazione locale di ${nome}`)
    const inizio = offset + 30 + dv.getUint16(offset + 26, true) + dv.getUint16(offset + 28, true)
    const dati = byte.subarray(inizio, inizio + lung)
    file[nome] = new TextDecoder().decode(metodo === 8 ? inflateRawSync(dati) : dati)
    p += 46 + lNome
  }
  return file
}

const esercizio = (nome, extra) => ({
  id: nome,
  nome,
  nota: '',
  gruppo: '',
  variaPerSettimana: false,
  schemaBase: { serie: '', ripetizioni: '', carico: '', recupero: '', nota: '' },
  settimane: [],
  ...extra,
})

const scheda = {
  nome: 'Forza & massa <inverno>',
  nota: 'Riscaldamento 10 minuti prima di ogni seduta',
  numeroSettimane: 4,
  giorniSettimana: [0, 2, 4],
  giorni: [
    {
      id: 'a',
      tipo: 'workout',
      nome: 'Giorno A',
      nota: '',
      esercizi: [
        esercizio('Panca piana', {
          gruppo: 'petto',
          nota: 'fermo 1" al petto',
          schemaBase: { serie: '4', ripetizioni: '15/12', carico: '60', recupero: '1,30', nota: '' },
        }),
        esercizio('Squat', {
          gruppo: 'gambe',
          variaPerSettimana: true,
          settimane: [
            { serie: '4', ripetizioni: '8', carico: '80kg', recupero: '2min', nota: '' },
            { serie: '4', ripetizioni: '8', carico: '80kg', recupero: '2min', nota: '' },
            { serie: '5', ripetizioni: '5', carico: '90kg', recupero: '3min', nota: 'cedimento' },
            { serie: '5', ripetizioni: '5', carico: '90kg', recupero: '3min', nota: 'cedimento' },
          ],
        }),
      ],
    },
    { id: 'r', tipo: 'rest', nome: 'Rest', nota: 'bici', esercizi: [] },
  ],
}

test('i tratti di settimane uguali si raggruppano', () => {
  const squat = scheda.giorni[0].esercizi[1]
  assert.deepEqual(
    trattiSettimane(squat, 4).map(({ da, a }) => [da, a]),
    [[1, 2], [3, 4]],
  )
  assert.deepEqual(
    trattiSettimane(scheda.giorni[0].esercizi[0], 4).map(({ da, a }) => [da, a]),
    [[1, 4]],
  )
})

test('il foglio rispetta la notazione del PT', () => {
  const { righe } = foglioScheda(scheda, { atleta: 'Marco', oggi: new Date(2026, 8, 18) })
  const testo = righe.map((r) => r.map((c) => (c && typeof c === 'object' ? c.v : c)))
  const panca = testo.find((r) => r[0] === 'Panca piana')
  // colonne: Esercizio, Gruppo, Settimane, Serie, Ripetizioni, Carico, Recupero, Note
  assert.deepEqual(panca, ['Panca piana', 'Petto', '1–4', 4, '15/12', 60, '1,30', 'fermo 1" al petto'])
  const squat = testo.filter((r) => r[0] === 'Squat' || (r[0] === '' && r[2] === '3–4'))
  assert.equal(squat.length, 2)
  assert.deepEqual(squat[1].slice(2), ['3–4', 5, 5, '90kg', '3min', 'cedimento'])
  assert.match(testo[1][0], /^Atleta: Marco · 4 settimane · ci si allena Lun, Mer, Ven · esportata il 18\/09\/2026$/)
  assert.ok(testo.some((r) => r[0] === 'bici'), 'la nota del giorno di riposo')
})

test('senza settimane diverse la colonna Settimane non c’è', () => {
  const semplice = { ...scheda, giorni: [{ ...scheda.giorni[0], esercizi: [scheda.giorni[0].esercizi[0]] }] }
  const { righe } = foglioScheda(semplice)
  const intestazione = righe.find((r) => r[0]?.v === 'Esercizio').map((c) => c.v)
  assert.deepEqual(intestazione, ['Esercizio', 'Gruppo', 'Serie', 'Ripetizioni', 'Carico', 'Recupero', 'Note'])
})

test('lo xlsx è uno ZIP valido con XML ben formato', () => {
  const file = apriZip(creaXlsx([foglioScheda(scheda, { atleta: 'Marco' })]))
  assert.deepEqual(Object.keys(file).sort(), [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/workbook.xml',
    'xl/worksheets/sheet1.xml',
  ])
  const foglio = file['xl/worksheets/sheet1.xml']
  assert.match(foglio, /Forza &amp; massa &lt;inverno&gt;/)
  assert.match(foglio, /<mergeCell ref="A1:H1"\/>/)
  assert.doesNotMatch(foglio, /[<>]inverno/)
})

test('il nome del file', () => {
  assert.equal(nomeFileScheda({ nome: 'Forza: 5/3/1' }, 'Marco'), 'Marco - Forza 531.xlsx')
  assert.equal(nomeFileScheda({ nome: '' }), 'Scheda.xlsx')
})
