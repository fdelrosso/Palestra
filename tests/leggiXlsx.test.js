import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { creaXlsx } from '../src/lib/excel.js'
import { testoDaXlsx } from '../src/lib/leggiXlsx.js'

test('legge quello che scrive lib/excel (ZIP senza compressione, testo in linea)', async () => {
  const byte = creaXlsx([
    { nome: 'Giorno A', righe: [['Esercizio', 'Serie', 'Rip'], ['Panca piana', 4, '8'], [], [null, 'solo B']] },
    { nome: 'Vuoto', righe: [] },
    { nome: 'Giorno B', righe: [['Squat & affondi', 5, '5']] },
  ])
  assert.equal(
    await testoDaXlsx(byte.buffer),
    'Giorno A\nEsercizio | Serie | Rip\nPanca piana | 4 | 8\n\n | solo B\n\nGiorno B\nSquat & affondi | 5 | 5',
  )
})

// Come li salvano Excel e Google Fogli: compressi, con le stringhe condivise.
function zip(file) {
  const locali = []
  const centrali = []
  let offset = 0
  for (const [nome, testo] of Object.entries(file)) {
    const n = Buffer.from(nome)
    const dati = deflateRawSync(Buffer.from(testo))
    const l = Buffer.alloc(30)
    l.writeUInt32LE(0x04034b50, 0)
    l.writeUInt16LE(8, 8)
    l.writeUInt32LE(dati.length, 18)
    l.writeUInt16LE(n.length, 26)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0)
    c.writeUInt16LE(8, 10)
    c.writeUInt32LE(dati.length, 20)
    c.writeUInt16LE(n.length, 28)
    c.writeUInt32LE(offset, 42)
    locali.push(l, n, dati)
    centrali.push(c, n)
    offset += 30 + n.length + dati.length
  }
  const dir = Buffer.concat(centrali)
  const fine = Buffer.alloc(22)
  fine.writeUInt32LE(0x06054b50, 0)
  fine.writeUInt16LE(centrali.length / 2, 10)
  fine.writeUInt32LE(dir.length, 12)
  fine.writeUInt32LE(offset, 16)
  const b = Buffer.concat([...locali, dir, fine])
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length)
}

test('legge un xlsx compresso con stringhe condivise e testo a pezzi', async () => {
  const buffer = zip({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Petto &amp; tricipiti" sheetId="1" r:id="rId7"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId7" Target="/xl/worksheets/foglio.xml"/></Relationships>',
    'xl/sharedStrings.xml':
      '<sst><si><t>Dip</t></si><si><r><t>Croci </t></r><r><rPr><b/></rPr><t xml:space="preserve">ai cavi</t></r></si></sst>',
    'xl/worksheets/foglio.xml':
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c><c r="C1"><v>12</v></c></row>' +
      '<row r="2"><c r="B2" t="s"><v>0</v></c><c r="C2" t="str"><f>A1</f><v>3x10</v></c></row></sheetData></worksheet>',
  })
  assert.equal(await testoDaXlsx(buffer), 'Petto & tricipiti\nCroci ai cavi |  | 12\n | Dip | 3x10')
})

test('un file che non è uno ZIP si dice', async () => {
  await assert.rejects(testoDaXlsx(new TextEncoder().encode('ciao a tutti, non sono un excel').buffer), /non sembra un Excel/)
})
