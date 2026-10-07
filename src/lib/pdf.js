// ---------------------------------------------------------------------------
// Un PDF scritto a mano, senza librerie — stessa scelta di lib/excel per
// l'xlsx: qui serve SCRIVERE delle tabelle con qualche colore, e per quello
// bastano queste righe. (lib/pdfTesto è l'opposto: LEGGE i PDF della dieta.)
//
// Due pezzi:
//   · `creaPdf(pagine)`: impacchetta le pagine (già disegnate, in operatori
//     PDF) in un file valido — oggetti, tabella xref, trailer;
//   · `pdfDaFoglio(foglio)`: disegna un FOGLIO di lib/excel (le stesse righe,
//     larghezze, unioni e STILI che diventano l'xlsx) come tabella impaginata
//     su A4 orizzontale. Così scheda e risultati in PDF sono gli stessi fogli
//     dell'Excel, non un secondo disegno destinato a divergere.
//
// ⚠️ I caratteri: si usano i font standard del PDF (Helvetica), che ogni
// lettore ha già, con la codifica WinAnsi. Copre le lettere accentate, "×",
// "—", "·", "’": quello che scriviamo. Le emoji si tolgono, il resto che non
// c'è (ideogrammi, alfabeti non latini) diventa "?": incorporare un font
// vorrebbe dire centinaia di KB.
// ⚠️ Le larghezze dei caratteri servono ad andare a capo dentro le caselle:
// sono quelle ufficiali di Helvetica (le metriche AFM), in millesimi di em.
// ---------------------------------------------------------------------------

import { STILI } from './excel.js'

export const MIME_PDF = 'application/pdf'

// ASCII da 32 (spazio) a 126 (~).
// prettier-ignore
const LARGHEZZE = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
// prettier-ignore
const LARGHEZZE_GRASSETTO = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

// Fuori dall'ASCII: carattere → [byte WinAnsi, larghezza, larghezza in grassetto].
const EXTRA = new Map([
  ['€', [0x80, 556, 556]], ['‚', [0x82, 222, 278]], ['„', [0x84, 333, 500]], ['…', [0x85, 1000, 1000]],
  ['‘', [0x91, 222, 278]], ['’', [0x92, 222, 278]], ['“', [0x93, 333, 500]], ['”', [0x94, 333, 500]],
  ['•', [0x95, 350, 350]], ['–', [0x96, 556, 556]], ['—', [0x97, 1000, 1000]], ['™', [0x99, 1000, 1000]],
  [' ', [0xa0, 278, 278]], ['°', [0xb0, 400, 400]], ['±', [0xb1, 584, 584]], ['²', [0xb2, 333, 333]],
  ['³', [0xb3, 333, 333]], ['·', [0xb7, 278, 278]], ['½', [0xbd, 834, 834]], ['×', [0xd7, 584, 584]],
  ['÷', [0xf7, 584, 584]],
])
// Le lettere accentate (0xC0–0xFF in Latin-1 e in WinAnsi): stessa larghezza
// della lettera di base, tranne poche eccezioni.
const LATINE = {
  À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A', Ç: 'C', È: 'E', É: 'E', Ê: 'E', Ë: 'E',
  Ì: 'I', Í: 'I', Î: 'I', Ï: 'I', Ð: 'D', Ñ: 'N', Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O',
  Ø: 'O', Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U', Ý: 'Y', à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a',
  å: 'a', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i', ñ: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y',
}
// Quelli che WinAnsi non ha ma hanno un parente stretto.
const SOSTITUTI = { '″': '"', '′': "'", '−': '-', '‐': '-', '‑': '-', '⁄': '/', '✓': 'v', '✔': 'v' }

/** Un carattere → { b: byte, r: larghezza, g: larghezza in grassetto }, o null. */
function glifo(ch) {
  const c = ch.codePointAt(0)
  if (c >= 32 && c <= 126) return { b: c, r: LARGHEZZE[c - 32], g: LARGHEZZE_GRASSETTO[c - 32] }
  const e = EXTRA.get(ch)
  if (e) return { b: e[0], r: e[1], g: e[2] }
  const base = LATINE[ch]
  if (base) {
    const g = glifo(base)
    return { b: c, r: g.r, g: g.g }
  }
  if (SOSTITUTI[ch]) return glifo(SOSTITUTI[ch])
  return null
}

/** Il testo come glifi WinAnsi: quello che non c'è diventa "?", i controlli spariscono. */
function glifi(testo) {
  const out = []
  for (const ch of String(testo ?? '')) {
    if (ch === '\t') {
      out.push(glifo(' '))
      continue
    }
    const c = ch.codePointAt(0)
    // Controlli, emoji e i loro accessori (varianti, giunture, tonalità).
    if (c < 32 || (c >= 0xfe00 && c <= 0xfe0f) || c === 0x200d || (c >= 0x1f3fb && c <= 0x1f3ff)) continue
    if (/\p{Extended_Pictographic}/u.test(ch)) continue
    out.push(glifo(ch) || glifo(ch.normalize('NFD')[0]) || glifo('?'))
  }
  return out
}

/** Larghezza di un testo in punti. */
export function misura(testo, dimensione, grassetto = false) {
  return (glifi(testo).reduce((n, g) => n + (grassetto ? g.g : g.r), 0) * dimensione) / 1000
}

// Una stringa PDF letterale: parentesi e barra si escapano, tutto quello che
// non è ASCII stampabile va in ottale. Così il file resta ASCII puro e le
// lunghezze dei flussi si contano in caratteri.
function stringaPdf(testo) {
  let s = '('
  for (const { b } of glifi(testo)) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) s += '\\' + String.fromCharCode(b)
    else if (b < 32 || b > 126) s += '\\' + b.toString(8).padStart(3, '0')
    else s += String.fromCharCode(b)
  }
  return s + ')'
}

// Il titolo nei metadati: lì i testi non sono WinAnsi ma PDFDocEncoding, e
// l'unico modo sicuro per gli accenti e le lineette è UTF-16 con il BOM.
function stringaUnicode(testo) {
  let hex = 'FEFF'
  for (const ch of String(testo ?? '')) {
    const c = ch.codePointAt(0)
    if (c < 32) continue
    const unita = c > 0xffff ? [0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)] : [c]
    for (const u of unita) hex += u.toString(16).toUpperCase().padStart(4, '0')
  }
  return `<${hex}>`
}

const n2 = (x) => String(Math.round(x * 100) / 100)
const colore = (hex) =>
  [0, 2, 4].map((i) => n2(parseInt(hex.slice(i, i + 2), 16) / 255)).join(' ')

/**
 * Il file PDF da pagine già disegnate.
 * @param {string[]} pagine  il flusso di operatori di ogni pagina
 * @param {{ larghezza: number, altezza: number, titolo?: string }} formato
 * @returns {Uint8Array}
 */
export function creaPdf(pagine, { larghezza, altezza, titolo = '' }) {
  const oggetti = []
  const aggiungi = (corpo) => {
    oggetti.push(corpo)
    return oggetti.length
  }
  // Gli id sono fissi per i primi: 1 catalogo, 2 pagine, 3-5 font, 6 info.
  aggiungi('<< /Type /Catalog /Pages 2 0 R >>')
  aggiungi(null) // le pagine: si scrivono quando si sanno gli id dei figli
  for (const nome of ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique']) {
    aggiungi(`<< /Type /Font /Subtype /Type1 /BaseFont /${nome} /Encoding /WinAnsiEncoding >>`)
  }
  aggiungi(`<< /Title ${stringaUnicode(titolo)} /Producer (ProgettoPalestra) >>`)
  const figli = []
  for (const flusso of pagine.length ? pagine : ['']) {
    const contenuto = aggiungi(`<< /Length ${flusso.length} >>\nstream\n${flusso}\nendstream`)
    figli.push(
      aggiungi(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(larghezza)} ${n2(altezza)}] ` +
          '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ' +
          `/Contents ${contenuto} 0 R >>`,
      ),
    )
  }
  oggetti[1] = `<< /Type /Pages /Kids [${figli.map((i) => `${i} 0 R`).join(' ')}] /Count ${figli.length} >>`

  let pdf = '%PDF-1.4\n'
  const posizioni = []
  oggetti.forEach((corpo, i) => {
    posizioni.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${corpo}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${oggetti.length + 1}\n0000000000 65535 f \n`
  for (const p of posizioni) pdf += `${String(p).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${oggetti.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

// ---------------------------------------------------------------------------
// Un foglio come tabella impaginata.
// ---------------------------------------------------------------------------

// A4 orizzontale, in punti: è anche come si stampa l'Excel (lib/excel).
const A4_LARGO = 841.89
const A4_ALTO = 595.28
const MARGINE = 30
const PIEDE = 22 // lo spazio in fondo per il numero di pagina

// Come si disegna ogni stile del foglio. `fill`/`testo` in esadecimale.
// I tre colori sono quelli dell'Excel: si stampano bene anche in bianco e nero.
function aspetto(stile, base) {
  switch (stile) {
    case STILI.titolo:
      return { font: 'F2', dim: Math.min(18, base * 1.9), testo: '10141C' }
    case STILI.giorno:
      return { font: 'F2', dim: base * 1.2, fill: 'FFF1D6', testo: '10141C' }
    case STILI.intestazione:
      return { font: 'F2', dim: base, fill: 'E8E8E8', testo: '10141C', riga: '999999' }
    case STILI.nota:
      return { font: 'F3', dim: base, testo: '666666' }
    case STILI.verde:
      return { font: 'F1', dim: base, fill: 'C6EFCE', testo: '006100', centro: true }
    case STILI.giallo:
      return { font: 'F1', dim: base, fill: 'FFEB9C', testo: '7A5200', centro: true }
    case STILI.rosso:
      return { font: 'F1', dim: base, fill: 'FFC7CE', testo: '9C0006', centro: true }
    default:
      return { font: 'F1', dim: base, testo: '10141C' }
  }
}

// Va a capo per parole dentro `largo` punti; una parola più lunga della
// casella si spezza dove capita.
function righeDiTesto(testo, largo, dim, grassetto) {
  const out = []
  for (const paragrafo of String(testo).split('\n')) {
    let riga = ''
    for (const parola of paragrafo.split(/ +/)) {
      const prova = riga ? `${riga} ${parola}` : parola
      if (misura(prova, dim, grassetto) <= largo) {
        riga = prova
        continue
      }
      if (riga) out.push(riga)
      riga = ''
      let pezzo = ''
      for (const ch of parola) {
        if (pezzo && misura(pezzo + ch, dim, grassetto) > largo) {
          out.push(pezzo)
          pezzo = ''
        }
        pezzo += ch
      }
      riga = pezzo
    }
    out.push(riga)
  }
  return out
}

const valoreDi = (c) => (c && typeof c === 'object' ? c.v : c)
const stileDi = (c) => (c && typeof c === 'object' ? c.stile || 0 : 0)
const vuota = (c) => {
  const v = valoreDi(c)
  return v == null || v === ''
}

/**
 * Un foglio di lib/excel come PDF.
 * @param {{ righe: any[][], larghezze: number[], unioni?: string[] }} foglio
 * @param {{ titolo?: string }} [opzioni] `titolo` va nei metadati e a piè di pagina
 * @returns {Uint8Array}
 */
export function pdfDaFoglio(foglio, { titolo = '' } = {}) {
  const larghezze = foglio.larghezze?.length ? foglio.larghezze : [20]
  const utile = A4_LARGO - 2 * MARGINE
  const totale = larghezze.reduce((a, b) => a + b, 0)
  const unita = utile / totale
  // La larghezza di Excel si misura in "zeri", e uno zero è 0,556 em: da qui la
  // dimensione del carattere che fa entrare le colonne come nel foglio.
  const base = Math.max(6, Math.min(9.5, unita / 0.556))
  const x = [MARGINE]
  for (const l of larghezze) x.push(x[x.length - 1] + l * unita)
  const PAD = 3

  // Le righe unite su tutta la larghezza (titoli, nomi dei giorni, note lunghe).
  const unite = new Set(
    (foglio.unioni || [])
      .map((u) => u.match(/^A(\d+):[A-Z]+(\d+)$/))
      .filter((m) => m && m[1] === m[2])
      .map((m) => Number(m[1]) - 1),
  )

  // Ogni riga misurata: le caselle con le loro righe di testo e l'altezza.
  const misurate = foglio.righe.map((riga, r) => {
    const celle = riga || []
    if (!celle.some((c) => !vuota(c))) return { vuota: true, alto: base * 1.1 }
    const pezzi = []
    if (unite.has(r)) {
      const a = aspetto(stileDi(celle[0]), base)
      const testo = righeDiTesto(valoreDi(celle[0]), utile - 2 * PAD, a.dim, a.font === 'F2')
      pezzi.push({ da: 0, a: larghezze.length, a1: a, testo, stile: stileDi(celle[0]) })
    } else {
      for (let k = 0; k < larghezze.length; k++) {
        const c = celle[k]
        const a = aspetto(stileDi(c), base)
        if (vuota(c)) {
          // Una casella vuota ma colorata (l'intestazione) si colora lo stesso.
          if (a.fill) pezzi.push({ da: k, a: k + 1, a1: a, testo: [] })
          continue
        }
        // Come in Excel, un testo può allargarsi sulle caselle vuote dopo di
        // lui (la legenda, "segnato come fatto…"): non i numeri, e non le
        // serie colorate, che sono caselle e basta.
        let fine = k + 1
        if (!a.fill && typeof valoreDi(c) !== 'number') while (fine < larghezze.length && vuota(celle[fine]) && !aspetto(stileDi(celle[fine]), base).fill) fine++
        const largo = x[fine] - x[k] - 2 * PAD
        const testo = righeDiTesto(valoreDi(c), largo, a.dim, a.font === 'F2')
        pezzi.push({ da: k, a: fine, a1: a, testo, stile: stileDi(c) })
      }
    }
    const alto = Math.max(...pezzi.map((p) => Math.max(1, p.testo.length) * p.a1.dim * 1.22)) + 2 * PAD
    return { pezzi, alto, stile: stileDi(celle[0]) }
  })

  // Impaginazione: una riga che non entra va sulla pagina dopo, e se si era
  // dentro una tabella la sua intestazione si ripete in cima. Il nome di un
  // giorno non resta da solo in fondo alla pagina.
  const fondo = A4_ALTO - MARGINE - PIEDE
  const pagine = [[]]
  let y = MARGINE
  let intestazione = null
  const metti = (m) => {
    pagine[pagine.length - 1].push({ m, y })
    y += m.alto
  }
  const nuovaPagina = () => {
    pagine.push([])
    y = MARGINE
  }
  misurate.forEach((m, i) => {
    if (m.vuota) {
      if (y > MARGINE) y += m.alto
      return
    }
    if (m.stile === STILI.giorno) intestazione = null
    let serve = m.alto
    if (m.stile === STILI.giorno) {
      // Il giorno, la sua intestazione e almeno una riga.
      for (let k = i + 1, presi = 0; k < misurate.length && presi < 2; k++) {
        if (misurate[k].vuota) continue
        serve += misurate[k].alto
        presi++
      }
    }
    if (y + serve > fondo && y > MARGINE) {
      nuovaPagina()
      if (intestazione && m.stile !== STILI.intestazione) metti(intestazione)
    }
    metti(m)
    if (m.stile === STILI.intestazione) intestazione = m
  })

  // Il disegno.
  const flussi = pagine.map((righe, p) => {
    const ops = []
    const Y = (v) => n2(A4_ALTO - v)
    for (const { m, y: top } of righe) {
      for (const pz of m.pezzi) {
        const sx = x[pz.da]
        const dx = x[pz.a]
        const a = pz.a1
        if (a.fill) {
          // Un filo bianco fra una casella e l'altra: le serie si contano a colpo d'occhio.
          const filo = a.centro ? 0.75 : 0
          ops.push(`${colore(a.fill)} rg ${n2(sx + filo)} ${Y(top + m.alto - filo)} ${n2(dx - sx - 2 * filo)} ${n2(m.alto - 2 * filo)} re f`)
        }
        if (a.riga) ops.push(`${colore(a.riga)} RG 0.6 w ${n2(sx)} ${Y(top + m.alto)} m ${n2(dx)} ${Y(top + m.alto)} l S`)
        pz.testo.forEach((t, k) => {
          if (!t) return
          const largo = misura(t, a.dim, a.font === 'F2')
          // Al centro solo le serie colorate; il resto a sinistra, numeri compresi:
          // "15/12" e "3" nella stessa colonna devono partire dallo stesso punto.
          const tx = a.centro ? sx + (dx - sx - largo) / 2 : sx + PAD
          const ty = top + PAD + a.dim * 0.9 + k * a.dim * 1.22
          ops.push(`BT /${a.font} ${n2(a.dim)} Tf ${colore(a.testo)} rg ${n2(tx)} ${Y(ty)} Td ${stringaPdf(t)} Tj ET`)
        })
      }
    }
    // A piè di pagina: di cosa si tratta e a che pagina si è.
    const piede = 7.5
    const yp = Y(A4_ALTO - MARGINE + 8)
    if (titolo) ops.push(`BT /F1 ${piede} Tf ${colore('8A929E')} rg ${n2(MARGINE)} ${yp} Td ${stringaPdf(titolo)} Tj ET`)
    const num = `Pagina ${p + 1} di ${pagine.length}`
    ops.push(`BT /F1 ${piede} Tf ${colore('8A929E')} rg ${n2(A4_LARGO - MARGINE - misura(num, piede))} ${yp} Td ${stringaPdf(num)} Tj ET`)
    return ops.join('\n')
  })

  return creaPdf(flussi, { larghezza: A4_LARGO, altezza: A4_ALTO, titolo })
}
