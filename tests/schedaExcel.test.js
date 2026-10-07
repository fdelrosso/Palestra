import test from 'node:test'
import assert from 'node:assert/strict'
import { inflateRawSync } from 'node:zlib'
import { creaXlsx } from '../src/lib/excel.js'
import { foglioRisultati, foglioScheda, nomeFileScheda, trattiSettimane } from '../src/lib/schedaExcel.js'
import { STILI } from '../src/lib/excel.js'

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

test('il foglio scrive lo schema come lo si legge nell’app', () => {
  const { righe } = foglioScheda(scheda, { atleta: 'Marco', oggi: new Date(2026, 8, 18) })
  const testo = righe.map((r) => r.map((c) => (c && typeof c === 'object' ? c.v : c)))
  const panca = testo.find((r) => r[0] === 'Panca piana')
  // colonne: Esercizio, Gruppo, Settimane, Serie, Ripetizioni, Carico, Recupero, Note
  // Gli schemi qui sono scritti come li salvava l'app di prima: si leggono lo stesso.
  assert.deepEqual(panca, ['Panca piana', 'Petto', '1–4', 4, '15/12', '60kg', "1'30\"", 'fermo 1" al petto'])
  const squat = testo.filter((r) => r[0] === 'Squat' || (r[0] === '' && r[2] === '3–4'))
  assert.equal(squat.length, 2)
  assert.deepEqual(squat[1].slice(2), ['3–4', 5, 5, '90kg', "3'", 'cedimento'])
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

test('la superserie si scrive nelle note del secondo esercizio', () => {
  const conSuperserie = {
    nome: 'Jumpset',
    numeroSettimane: 1,
    giorni: [
      {
        id: 'c',
        tipo: 'workout',
        nome: 'Giorno C',
        nota: '',
        esercizi: [
          esercizio('Lat machine', { nota: '12rm' }),
          esercizio('Curl martello', { insiemeAlPrecedente: true }),
        ],
      },
    ],
  }
  const { righe } = foglioScheda(conSuperserie)
  const testo = righe.map((r) => r.map((c) => (c && typeof c === 'object' ? c.v : c)))
  const note = (nome) => testo.find((r) => r[0] === nome).at(-1)
  assert.equal(note('Lat machine'), '12rm')
  assert.equal(note('Curl martello'), 'Superserie con Lat machine')
})

test('riscaldamento sopra la tabella del giorno, stretching sotto; vuoti non ci sono', () => {
  const conPrep = {
    ...scheda,
    giorni: [
      { ...scheda.giorni[0], riscaldamento: "5' bici\n\nRotazioni spalle", stretching: 'Pettorali 30"' },
      scheda.giorni[1],
    ],
  }
  const testi = foglioScheda(conPrep).righe.map((r) => r[0]?.v ?? '')
  const iRisc = testi.indexOf("Riscaldamento e mobilità: 5' bici · Rotazioni spalle")
  const iTab = testi.indexOf('Esercizio')
  const iStr = testi.indexOf('Stretching finale: Pettorali 30"')
  assert.ok(iRisc !== -1 && iTab !== -1 && iStr !== -1, testi.join(' | '))
  assert.ok(iRisc < iTab && iTab < iStr)
  assert.ok(!foglioScheda(scheda).righe.some((r) => /^(Riscaldamento e|Stretching finale)/.test(r[0]?.v ?? '')))
})

// ---------------------------------------------------------------------------
// I risultati: pesi e pallini, settimana per settimana.

const kgSchema = (serie, rip, kg) => ({
  fasi: [{ serie, rip, carico: kg != null ? { tipo: 'kg', valore: kg } : null }],
  recuperoSec: 90,
  nota: '',
})

const conRisultati = {
  nome: 'Massa',
  numeroSettimane: 2,
  settimanaCorrente: 1,
  giorni: [
    {
      id: 'a',
      tipo: 'workout',
      nome: 'Giorno A',
      esercizi: [
        { id: 'panca', nome: 'Panca piana', variaPerSettimana: false, schemaBase: kgSchema(3, 8, 80), settimane: [] },
        { id: 'curl', nome: 'Curl', variaPerSettimana: false, schemaBase: kgSchema(2, 12, 14), settimane: [] },
      ],
    },
    { id: 'r', tipo: 'rest', nome: 'Rest', esercizi: [] },
  ],
  completamenti: [
    // Fatto con l'app di oggi: ripetizioni e kg per serie, e un esercizio in più.
    {
      settimana: 1,
      giornoId: 'a',
      data: '2026-10-01T18:00:00.000Z',
      esercizi: [
        {
          esercizioId: 'panca',
          nome: 'Panca piana (rinominata dopo)',
          schema: kgSchema(3, 8, 80),
          sets: [{ colore: 'verde', rip: 8, kg: 80 }, { colore: 'giallo', rip: 8, kg: 82.5 }, { colore: 'rosso', rip: 6, kg: 82.5 }],
        },
        { nome: 'Curl', schema: kgSchema(2, 12, 14), sets: [{ colore: 'verde', rip: 12, kg: 14 }, { colore: null }] },
        { nome: 'Plank', schema: { fasi: [{ serie: 1, rip: { sec: 45 }, carico: null }], recuperoSec: null, nota: '' }, sets: [{ colore: 'giallo' }] },
      ],
    },
    // Rifatto la stessa settimana, con un allenamento di prima: solo i colori.
    {
      settimana: 1,
      giornoId: 'a',
      data: '2026-10-03T18:00:00.000Z',
      esercizi: [{ nome: 'panca  PIANA', schema: kgSchema(3, 8, 80), sets: [{ colore: 'verde' }, { colore: 'verde' }, { colore: 'giallo' }] }],
    },
  ],
}

const testi = (righe) => righe.map((r) => r.map((c) => (c && typeof c === 'object' ? c.v : c ?? '')))

test('i risultati: una riga per settimana e per volta, una casella per serie col colore del pallino', () => {
  const { righe, larghezze } = foglioRisultati(conRisultati, { oggi: new Date(2026, 9, 7) })
  const t = testi(righe)
  assert.equal(t[0][0], 'Massa — progressi')
  assert.match(t[1][0], /in corso: settimana 1 di 2 · 2 allenamenti fatti · esportata il 07\/10\/2026/)
  // Esercizio, Sett., Data, Previsto e tre serie (la panca ne ha tre).
  assert.equal(larghezze.length, 7)
  const intestazione = t.findIndex((r) => r[0] === 'Esercizio')
  assert.deepEqual(t[intestazione], ['Esercizio', 'Sett.', 'Data', 'Previsto', 'Serie 1', 'Serie 2', 'Serie 3'])

  const panca = righe.slice(intestazione + 1, intestazione + 4)
  // Settimana 1, prima volta: ritrovata per id anche se il nome è cambiato.
  assert.deepEqual(testi([panca[0]])[0], ['Panca piana', 1, '01/10/2026', "3x8 80kg rec 1'30\"", '8 × 80kg', '8 × 82,5kg', '6 × 82,5kg'])
  assert.deepEqual(panca[0].slice(4).map((c) => c.stile), [STILI.verde, STILI.giallo, STILI.rosso])
  // La seconda volta, di prima: per nome, e il peso è quello previsto.
  assert.deepEqual(testi([panca[1]])[0], ['', 1, '03/10/2026', "3x8 80kg rec 1'30\"", '8 × 80kg', '8 × 80kg', '8 × 80kg'])
  assert.deepEqual(panca[1].slice(4).map((c) => c.stile), [STILI.verde, STILI.verde, STILI.giallo])
  // Settimana 2: non ancora fatta, c'è quello che è previsto.
  assert.deepEqual(testi([panca[2]])[0], ['', 2, '', "3x8 80kg rec 1'30\""])

  // Il curl: una serie non chiusa è un trattino; la seconda volta non c'era.
  const curl = t.slice(intestazione + 4, intestazione + 7)
  assert.deepEqual(curl[0].slice(0, 6), ['Curl', 1, '01/10/2026', "2x12 14kg rec 1'30\"", '12 × 14kg', '—'])
  assert.deepEqual(curl[1].slice(0, 5), ['', 1, '03/10/2026', "2x12 14kg rec 1'30\"", 'non fatto quel giorno'])
  // Il plank fatto solo quel giorno non sparisce: in fondo al giorno.
  const plank = t.find((r) => /Plank/.test(r[0]))
  assert.deepEqual(plank.slice(0, 5), ['Plank (fuori scheda)', 1, '01/10/2026', '1x45"', '45"'])
})

test('a scheda finita è il recap; segnato a mano non ha serie; senza allenamenti la scheda resta intera', () => {
  const finita = {
    ...conRisultati,
    numeroSettimane: 1,
    completamenti: [{ settimana: 1, giornoId: 'a', data: '2026-10-05T18:00:00.000Z' }],
  }
  const t = testi(foglioRisultati(finita).righe)
  assert.equal(t[0][0], 'Massa — recap')
  assert.ok(t.some((r) => r[0] === 'Panca piana' && r[4] === 'segnato come fatto, senza le serie'))

  const vuota = testi(foglioRisultati({ ...conRisultati, completamenti: [] }).righe)
  assert.ok(vuota.filter((r) => r[3] === "3x8 80kg rec 1'30\"").length === 2)
})

test('lo xlsx dei risultati è valido, con gli stili dei tre colori', () => {
  const file = apriZip(creaXlsx([foglioRisultati(conRisultati)]))
  const stili = file['xl/styles.xml']
  const xf = stili.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/)
  assert.equal(Number(xf[1]), (xf[2].match(/<xf /g) || []).length)
  assert.ok(Number(xf[1]) > STILI.rosso)
  for (const tag of ['fonts', 'fills', 'borders']) {
    const m = stili.match(new RegExp(String.raw`<${tag} count="(\d+)">([\s\S]*?)</${tag}>`))
    const figlio = tag.slice(0, -1)
    assert.equal(Number(m[1]), (m[2].match(new RegExp(`<${figlio}>|<${figlio} `, 'g')) || []).length, tag)
  }
  assert.match(file['xl/worksheets/sheet1.xml'], new RegExp(`s="${STILI.rosso}" t="inlineStr"><is><t xml:space="preserve">6 × 82,5kg`))
})
