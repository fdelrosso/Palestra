// ---------------------------------------------------------------------------
// Un file Excel (.xlsx) scritto a mano, senza librerie.
//
// Un .xlsx è uno ZIP con dentro qualche file XML: si scrivono gli XML e li si
// chiude in uno ZIP "senza compressione" (metodo STORE), che è il più semplice
// che esista e che Excel, Numbers, Google Fogli e LibreOffice aprono tutti.
// Per una scheda si parla di pochi KB: comprimere non varrebbe il codice.
//
// ⚠️ Perché non una libreria: SheetJS su npm è ferma a una versione con
// problemi noti, ExcelJS pesa quanto mezza app. Qui serve SCRIVERE un foglio
// con qualche grassetto, non leggerne uno qualsiasi — e per quello bastano
// queste righe (stessa scelta di lib/pdfTesto per i PDF della dieta).
//
// Uso:
//   const blob = creaXlsx([{ nome: 'Scheda', righe, larghezze, unioni }])
//   righe:     array di righe; ogni cella è una stringa, un numero, null (vuota)
//              oppure { v, stile } con stile tra quelli di STILI.
//   larghezze: larghezza di ogni colonna, in caratteri.
//   unioni:    celle unite, es. ['A1:H1'].
// ---------------------------------------------------------------------------

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Gli stili disponibili per le celle (indici in `cellXfs` di styles.xml). */
export const STILI = {
  normale: 0,
  titolo: 1,
  intestazione: 2,
  giorno: 3,
  nota: 4,
  aCapo: 5,
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="13"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="11"/><color rgb="FF666666"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF1D6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

// Caratteri che XML non ammette nemmeno escapati (i controlli ASCII, tranne
// tab e a capo): un testo incollato da WhatsApp può portarseli dietro, e un
// solo carattere così rende il file "danneggiato" per Excel.
// eslint-disable-next-line no-control-regex
const NON_XML = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g

function xml(testo) {
  return String(testo)
    .replace(NON_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 0 → 'A', 25 → 'Z', 26 → 'AA'. */
export function lettera(col) {
  let s = ''
  let n = col + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function cellaXml(cella, rif) {
  if (cella == null || cella === '') return ''
  const { v, stile = 0 } = typeof cella === 'object' ? cella : { v: cella }
  if (v == null || v === '') {
    return stile ? `<c r="${rif}" s="${stile}"/>` : ''
  }
  const s = stile ? ` s="${stile}"` : ''
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${rif}"${s}><v>${v}</v></c>`
  return `<c r="${rif}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`
}

function foglioXml({ righe = [], larghezze = [], unioni = [], orizzontale = true }) {
  const cols = larghezze.length
    ? `<cols>${larghezze
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : ''
  const dati = righe
    .map((riga, r) => {
      const celle = (riga || []).map((c, col) => cellaXml(c, `${lettera(col)}${r + 1}`)).join('')
      return celle ? `<row r="${r + 1}">${celle}</row>` : ''
    })
    .join('')
  const merge = unioni.length
    ? `<mergeCells count="${unioni.length}">${unioni.map((u) => `<mergeCell ref="${u}"/>`).join('')}</mergeCells>`
    : ''
  // In stampa: una pagina di larghezza, quante servono in altezza.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols}<sheetData>${dati}</sheetData>${merge}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${orizzontale ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
}

// I nomi dei fogli: al massimo 31 caratteri, e niente \ / ? * [ ] :
function nomeFoglio(nome, i, usati) {
  let n = String(nome || `Foglio ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || `Foglio ${i + 1}`
  let k = 2
  while (usati.has(n.toLowerCase())) n = `${n.slice(0, 27)} (${k++})`
  usati.add(n.toLowerCase())
  return n
}

/**
 * I file che compongono il .xlsx: percorso → contenuto XML.
 * Separato da `creaXlsx` perché è la parte che si può provare senza browser.
 */
export function fileXlsx(fogli) {
  const usati = new Set()
  const nomi = fogli.map((f, i) => nomeFoglio(f.nome, i, usati))
  const file = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${fogli
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join('\n')}
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nomi.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${fogli
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  )
  .join('\n')}
<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'xl/styles.xml': STYLES_XML,
  }
  fogli.forEach((f, i) => {
    file[`xl/worksheets/sheet${i + 1}.xml`] = foglioXml(f)
  })
  return file
}

// ---- ZIP (solo STORE) ------------------------------------------------------

let TABELLA_CRC = null
function crc32(byte) {
  if (!TABELLA_CRC) {
    TABELLA_CRC = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      TABELLA_CRC[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < byte.length; i++) crc = TABELLA_CRC[(crc ^ byte[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Data e ora nel formato MS-DOS che vuole lo ZIP.
function dataDos(d) {
  const ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const giorno = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { ora, giorno }
}

/**
 * Chiude dei file in uno ZIP non compresso.
 * @param {Record<string, string|Uint8Array>} file percorso → contenuto
 * @param {Date} [quando]
 * @returns {Uint8Array}
 */
export function zipStore(file, quando = new Date()) {
  const enc = new TextEncoder()
  const { ora, giorno } = dataDos(quando)
  const locali = []
  const centrali = []
  let offset = 0

  for (const [percorso, contenuto] of Object.entries(file)) {
    const nome = enc.encode(percorso)
    const dati = typeof contenuto === 'string' ? enc.encode(contenuto) : contenuto
    const crc = crc32(dati)

    const loc = new DataView(new ArrayBuffer(30))
    loc.setUint32(0, 0x04034b50, true) // firma dell'intestazione locale
    loc.setUint16(4, 20, true) // versione minima
    loc.setUint16(6, 0x0800, true) // nomi in UTF-8
    loc.setUint16(8, 0, true) // metodo: STORE
    loc.setUint16(10, ora, true)
    loc.setUint16(12, giorno, true)
    loc.setUint32(14, crc, true)
    loc.setUint32(18, dati.length, true)
    loc.setUint32(22, dati.length, true)
    loc.setUint16(26, nome.length, true)
    loc.setUint16(28, 0, true)
    locali.push(new Uint8Array(loc.buffer), nome, dati)

    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true) // firma della directory centrale
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, 0x0800, true)
    cen.setUint16(10, 0, true)
    cen.setUint16(12, ora, true)
    cen.setUint16(14, giorno, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, dati.length, true)
    cen.setUint32(24, dati.length, true)
    cen.setUint16(28, nome.length, true)
    cen.setUint32(42, offset, true)
    centrali.push(new Uint8Array(cen.buffer), nome)

    offset += 30 + nome.length + dati.length
  }

  const lunghezzaCentrale = centrali.reduce((n, b) => n + b.length, 0)
  const fine = new DataView(new ArrayBuffer(22))
  fine.setUint32(0, 0x06054b50, true) // fine della directory centrale
  fine.setUint16(8, centrali.length / 2, true)
  fine.setUint16(10, centrali.length / 2, true)
  fine.setUint32(12, lunghezzaCentrale, true)
  fine.setUint32(16, offset, true)

  const pezzi = [...locali, ...centrali, new Uint8Array(fine.buffer)]
  const out = new Uint8Array(pezzi.reduce((n, b) => n + b.length, 0))
  let p = 0
  for (const b of pezzi) {
    out.set(b, p)
    p += b.length
  }
  return out
}

/**
 * Il file .xlsx, pronto da scaricare o condividere.
 * @returns {Uint8Array}
 */
export function creaXlsx(fogli) {
  return zipStore(fileXlsx(fogli))
}
