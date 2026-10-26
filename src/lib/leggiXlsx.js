// ---------------------------------------------------------------------------
// LEGGERE un file Excel (.xlsx), senza librerie: il rovescio di lib/excel.
//
// Serve all'import della scheda (pages/ImportPage): il foglio del PT diventa
// testo, una riga per riga del foglio e le celle separate da " | " (come la
// trascrizione delle foto in api/riscrivi), e quel testo
// va nella casella come se l'avessero incollato. Poi lo legge l'AI come
// qualsiasi altro testo: niente da indovinare qui su quale colonna sia cosa.
//
// Un .xlsx è uno ZIP di XML: si legge l'indice dello ZIP, si scompatta quello
// che serve (DecompressionStream, come lib/pdfTesto) e dagli XML si tirano
// fuori i valori delle celle. Formattazione, formule e celle unite non contano:
// conta il testo che si vede. Il vecchio .xls (binario) no: lo si risalva.
// ---------------------------------------------------------------------------

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// I file dello ZIP, dall'indice in fondo (la "central directory").
async function apriZip(buffer) {
  const b = new Uint8Array(buffer)
  const dv = new DataView(buffer)
  let fine = b.length - 22
  while (fine >= 0 && dv.getUint32(fine, true) !== 0x06054b50) fine--
  if (fine < 0) throw new Error('Questo file non sembra un Excel (.xlsx)')
  const n = dv.getUint16(fine + 10, true)
  let p = dv.getUint32(fine + 16, true)
  const voci = {}
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++) {
    const metodo = dv.getUint16(p + 10, true)
    const compresso = dv.getUint32(p + 20, true)
    const lNome = dv.getUint16(p + 28, true)
    const locale = dv.getUint32(p + 42, true)
    const nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + lNome))
    voci[nome] = { metodo, compresso, locale }
    p += 46 + lNome + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true)
  }
  return async (nome) => {
    const v = voci[nome]
    if (!v) return null
    const inizio = v.locale + 30 + dv.getUint16(v.locale + 26, true) + dv.getUint16(v.locale + 28, true)
    const dati = b.subarray(inizio, inizio + v.compresso)
    return new TextDecoder().decode(v.metodo === 8 ? await inflateRaw(dati) : dati)
  }
}

const entita = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')

// Il testo di un pezzo di XML: tutti i suoi <t> (un testo con grassetti è
// spezzato in più <t>).
const testi = (x) => [...x.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => entita(m[1])).join('')

const attributo = (tag, nome) => tag.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1]

// 'C7' → 2
function colonna(rif) {
  let c = 0
  for (const ch of rif.replace(/\d+$/, '')) c = c * 26 + ch.charCodeAt(0) - 64
  return c - 1
}

function righeFoglio(x, condivise) {
  const righe = []
  for (const [, apriRiga, riga] of x.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    // Le righe vuote nel file non ci sono: si rimettono, perché spesso sono
    // proprio lo stacco fra un giorno e l'altro.
    const numero = +attributo(apriRiga, 'r') || righe.length + 1
    while (righe.length < numero - 1) righe.push('')
    const celle = []
    for (const [, apertura, dentro = ''] of riga.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tipo = attributo(apertura, 't')
      const v = dentro.match(/<v>([^<]*)<\/v>/)?.[1]
      const valore =
        tipo === 's' ? condivise[+v] ?? '' : tipo === 'inlineStr' ? testi(dentro) : v != null ? entita(v) : ''
      const r = attributo(apertura, 'r')
      celle[r ? colonna(r) : celle.length] = valore.replace(/\s*\n\s*/g, ' ').trim()
    }
    const piene = Array.from(celle, (c) => c ?? '')
    while (piene.length && !piene.at(-1)) piene.pop()
    righe.push(piene.join(' | '))
  }
  return righe
}

/**
 * Il testo di un .xlsx: ogni foglio col suo nome in testa, una riga per riga,
 * le celle separate da " | ". Le righe vuote in fila si stringono in una.
 */
export async function testoDaXlsx(buffer) {
  const leggi = await apriZip(buffer)
  const condivise = [...((await leggi('xl/sharedStrings.xml')) || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    testi(m[1]),
  )
  const workbook = (await leggi('xl/workbook.xml')) || ''
  const rels = (await leggi('xl/_rels/workbook.xml.rels')) || ''
  const fogli = []
  for (const [tag] of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const id = attributo(tag, 'r:id')
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].find(([r]) => attributo(r, 'Id') === id)?.[0]
    const target = rel && attributo(rel, 'Target')
    if (!target) continue
    const x = await leggi(target.startsWith('/') ? target.slice(1) : `xl/${target}`)
    if (!x) continue
    const righe = righeFoglio(x, condivise)
    if (righe.some(Boolean)) fogli.push([entita(attributo(tag, 'name') || ''), ...righe].join('\n'))
  }
  return fogli.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}
