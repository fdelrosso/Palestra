// ---------------------------------------------------------------------------
// Estrarre il testo da un PDF, senza librerie.
//
// Perché a mano: le librerie serie (pdf.js) pesano ~1MB, e questa è una PWA che
// deve stare leggera e installarsi al volo sul telefono. Per il nostro caso —
// il PDF della dieta scritto col computer dal nutrizionista — basta molto meno,
// perché il testo dentro un PDF così è davvero lì, solo compresso.
//
// Come funziona:
//   1. si leggono gli OGGETTI del PDF (anche quelli chiusi dentro gli
//      "object stream") e si segue l'albero delle pagine;
//   2. per ogni pagina si prendono i suoi FONT: la tabella ToUnicode dice che
//      lettera è ogni codice, e le larghezze dicono dove finisce ogni parola;
//   3. si esegue il content stream tenendo il conto delle coordinate, e ogni
//      pezzo di testo finisce in un "run" con la sua x, la sua y e la sua fine;
//   4. i run si rimettono in RIGHE per posizione sulla pagina, dall'alto in
//      basso e da sinistra a destra.
//
// ⚠️ Il passo 4 è quello che conta. Word scrive il PDF nell'ordine in cui
// disegna, non in quello in cui si legge: le caselle di testo arrivano dopo
// l'intestazione, e il contenuto della colazione finiva sotto la merenda. Le
// coordinate invece non mentono.
//
// ⚠️ Il passo 2 non è un lusso: senza ToUnicode i font "Identity-H" (Word li
// usa appena c'è un simbolo o un carattere accentato in un certo stile) sono
// indici di glifi, e "extravergine" usciva "H[WUDYHUJLQH".
//
// Non funziona sempre, e va bene così:
//   - PDF che sono una FOTO della pagina (scansioni) → dentro non c'è testo,
//     nessuna libreria al mondo lo tira fuori senza OCR;
//   - PDF cifrati, o con font senza tabella dei caratteri.
// In quei casi si torna con `ok:false` e si chiede all'utente di copiare e
// incollare il testo: è la strada che funziona sempre.
// ---------------------------------------------------------------------------

const MAX_BYTE = 20 * 1024 * 1024 // oltre, non è il PDF di una dieta

// I byte come stringa "latin-1": un carattere per byte. È il modo giusto di
// SCANDIRE un PDF, che è per metà testo (le parole chiave) e per metà binario.
function bytesInStringa(bytes) {
  let out = ''
  const passo = 0x8000 // a blocchi: String.fromCharCode ha un limite di argomenti
  for (let i = 0; i < bytes.length; i += passo) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + passo))
  }
  return out
}

function stringaInBytes(s) {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

export function decompressioneDisponibile() {
  return typeof DecompressionStream !== 'undefined'
}

// zlib ('deflate') o raw ('deflate-raw'): certi PDF scrivono lo stream senza
// intestazione zlib, quindi si prova l'uno e poi l'altro.
//
// Si legge a pezzi e si TIENE quello che è uscito prima di un eventuale errore:
// dentro un PDF lo stream è quasi sempre seguito da un a capo che non fa parte
// dei dati compressi, e DecompressionStream considera un errore tutto ciò che
// arriva dopo la fine. Buttare via una pagina intera per un byte di troppo
// sarebbe assurdo.
async function inflate(bytes) {
  for (const formato of ['deflate', 'deflate-raw']) {
    let pezzi = []
    try {
      const ds = new DecompressionStream(formato)
      const writer = ds.writable.getWriter()
      writer.write(bytes).catch(() => {})
      writer.close().catch(() => {})
      const reader = ds.readable.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          pezzi.push(value)
        }
      } catch {
        /* dati in coda: si tiene quello che è già uscito */
      }
    } catch {
      pezzi = []
    }
    const totale = pezzi.reduce((n, p) => n + p.length, 0)
    if (totale > 0) {
      const out = new Uint8Array(totale)
      let i = 0
      for (const p of pezzi) {
        out.set(p, i)
        i += p.length
      }
      return out
    }
  }
  return null
}

// ---- I valori del PDF ------------------------------------------------------
// Un sottoinsieme della sintassi, quello che serve per pagine e font:
//   numero → number · /Nome → '/Nome' · (stringa) e <esadecimale> → {s: byte}
//   [array] → [] · <<dizionario>> → {Chiave: valore} · 12 0 R → {ref: 12}

const SPAZI = ' \t\r\n\f\0'
const DELIMITATORI = '()<>[]{}/%'

function saltaSpazi(s, i) {
  while (i < s.length) {
    const c = s[i]
    if (SPAZI.includes(c)) i += 1
    else if (c === '%') {
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i += 1
    } else break
  }
  return i
}

function leggiParola(s, i) {
  let j = i
  while (j < s.length && !SPAZI.includes(s[j]) && !DELIMITATORI.includes(s[j])) j += 1
  return j
}

function leggiLetterale(s, i) {
  let out = ''
  let livello = 1
  let j = i
  while (j < s.length) {
    const c = s[j]
    if (c === '\\') {
      const ottale = s.slice(j + 1, j + 4).match(/^[0-7]{1,3}/)
      if (ottale) {
        out += String.fromCharCode(parseInt(ottale[0], 8) & 0xff)
        j += 1 + ottale[0].length
        continue
      }
      const next = s[j + 1]
      const mappa = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }
      if (next === '\r' || next === '\n') {
        // Barra a fine riga: la stringa continua a capo.
        j += next === '\r' && s[j + 2] === '\n' ? 3 : 2
        continue
      }
      out += mappa[next] ?? next ?? ''
      j += 2
      continue
    }
    if (c === '(') livello += 1
    if (c === ')') {
      livello -= 1
      if (livello === 0) return [out, j + 1]
    }
    out += c
    j += 1
  }
  return [out, j]
}

function leggiEsadecimale(s, i) {
  const fine = s.indexOf('>', i)
  const hex = s.slice(i, fine < 0 ? s.length : fine).replace(/[^0-9a-fA-F]/g, '')
  const pari = hex.length % 2 ? `${hex}0` : hex
  let out = ''
  for (let k = 0; k < pari.length; k += 2) out += String.fromCharCode(parseInt(pari.slice(k, k + 2), 16))
  return [out, fine < 0 ? s.length : fine + 1]
}

/**
 * Un valore a partire da `i`. `conRiferimenti` riconosce "12 0 R": vale negli
 * oggetti, NON nei content stream, dove "0 0 0 RG" è un colore.
 */
function leggiValore(s, i, conRiferimenti = true) {
  i = saltaSpazi(s, i)
  const c = s[i]
  if (c === '/') {
    const j = leggiParola(s, i + 1)
    return [s.slice(i, j), j]
  }
  if (c === '<' && s[i + 1] === '<') {
    const diz = {}
    let j = i + 2
    for (let giri = 0; giri < 10000; giri += 1) {
      j = saltaSpazi(s, j)
      if (j >= s.length) break
      if (s[j] === '>' && s[j + 1] === '>') return [diz, j + 2]
      const [chiave, dopo] = leggiValore(s, j, conRiferimenti)
      if (typeof chiave !== 'string' || !chiave.startsWith('/')) {
        j = dopo > j ? dopo : j + 1
        continue
      }
      const [valore, fine] = leggiValore(s, dopo, conRiferimenti)
      diz[chiave.slice(1)] = valore
      j = fine
    }
    return [diz, j]
  }
  if (c === '<') {
    const [str, j] = leggiEsadecimale(s, i + 1)
    return [{ s: str }, j]
  }
  if (c === '(') {
    const [str, j] = leggiLetterale(s, i + 1)
    return [{ s: str }, j]
  }
  if (c === '[') {
    const arr = []
    let j = i + 1
    for (let giri = 0; giri < 100000; giri += 1) {
      j = saltaSpazi(s, j)
      if (j >= s.length) break
      if (s[j] === ']') return [arr, j + 1]
      const [v, dopo] = leggiValore(s, j, conRiferimenti)
      arr.push(v)
      j = dopo > j ? dopo : j + 1
    }
    return [arr, j]
  }
  const j = leggiParola(s, i)
  const parola = s.slice(i, j)
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(parola)) {
    const n = parseFloat(parola)
    if (conRiferimenti && /^\d+$/.test(parola)) {
      const m = /^\s+(\d+)\s+R(?=[\s/<>[\]()%]|$)/.exec(s.slice(j, j + 24))
      if (m) return [{ ref: n }, j + m[0].length]
    }
    return [n, j]
  }
  if (parola === 'true') return [true, j]
  if (parola === 'false') return [false, j]
  if (parola === 'null') return [null, j]
  return [{ parola }, Math.max(j, i + 1)]
}

// ---- Gli oggetti -----------------------------------------------------------

/**
 * Tutti gli oggetti del PDF, per numero. Non si legge la tabella xref: si
 * scandisce il file cercando "N 0 obj", saltando i dati degli stream (dove una
 * sequenza di byte a caso potrebbe sembrare un oggetto). Se un numero torna
 * due volte vince l'ultimo, come negli aggiornamenti incrementali.
 */
async function leggiOggetti(raw) {
  const oggetti = new Map()
  const re = /(\d+)\s+(\d+)\s+obj\b/g
  let m
  while ((m = re.exec(raw))) {
    const num = Number(m[1])
    let valore
    let dopo
    try {
      ;[valore, dopo] = leggiValore(raw, m.index + m[0].length)
    } catch {
      continue
    }
    const j = saltaSpazi(raw, dopo)
    let stream = null
    if (raw.startsWith('stream', j)) {
      let inizio = j + 6
      if (raw[inizio] === '\r') inizio += 1
      if (raw[inizio] === '\n') inizio += 1
      let fine = -1
      const lung = valore?.Length
      if (typeof lung === 'number' && /^\s*endstream/.test(raw.slice(inizio + lung, inizio + lung + 12))) {
        fine = inizio + lung
      } else {
        fine = raw.indexOf('endstream', inizio)
        if (fine < 0) fine = raw.length
        // L'a capo prima di `endstream` non fa parte dei dati.
        while (fine > inizio && (raw[fine - 1] === '\n' || raw[fine - 1] === '\r')) fine -= 1
      }
      stream = { inizio, fine }
      re.lastIndex = Math.max(re.lastIndex, fine)
    }
    oggetti.set(num, { valore, stream })
  }

  // Gli oggetti compressi dentro gli "object stream" (PDF 1.5+): Word ci mette
  // la struttura del documento, altri programmi anche pagine e font.
  for (const o of [...oggetti.values()]) {
    if (o.valore?.Type !== '/ObjStm' || !o.stream) continue
    const dati = await datiDelloStream(raw, o)
    if (!dati) continue
    const n = Number(o.valore.N) || 0
    const primo = Number(o.valore.First) || 0
    const intestazione = dati.slice(0, primo).trim().split(/\s+/).map(Number)
    for (let k = 0; k < n; k += 1) {
      const numero = intestazione[k * 2]
      const offset = intestazione[k * 2 + 1]
      if (!Number.isFinite(numero) || !Number.isFinite(offset) || oggetti.has(numero)) continue
      try {
        oggetti.set(numero, { valore: leggiValore(dati, primo + offset)[0], stream: null })
      } catch {
        /* un oggetto illeggibile non ferma gli altri */
      }
    }
  }
  return oggetti
}

// Solo Flate (o niente filtro): è quello che usano Word, LibreOffice e i
// generatori di PDF di tutti i giorni.
async function datiDelloStream(raw, oggetto) {
  if (!oggetto?.stream) return null
  const grezzi = raw.slice(oggetto.stream.inizio, oggetto.stream.fine)
  const filtro = oggetto.valore?.Filter
  const filtri = Array.isArray(filtro) ? filtro : filtro ? [filtro] : []
  if (filtri.length === 0) return grezzi
  if (filtri.length !== 1 || filtri[0] !== '/FlateDecode') return null
  const out = await inflate(stringaInBytes(grezzi))
  return out ? bytesInStringa(out) : null
}

// ---- I font ----------------------------------------------------------------

// Windows-1252 da 0x80 a 0x9F: è lì che stanno ’ “ ” – € e compagnia, e sono
// proprio i caratteri che Word mette nei testi.
const CP1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ',
  0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“',
  0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›',
  0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
}

function utf16(hex) {
  let out = ''
  for (let k = 0; k + 3 < hex.length; k += 4) out += String.fromCharCode(parseInt(hex.slice(k, k + 4), 16))
  if (hex.length === 2) out = String.fromCharCode(parseInt(hex, 16))
  return out
}

/** La tabella ToUnicode: codice → testo, e quanti byte è lungo un codice. */
function leggiCMap(testo) {
  const mappa = new Map()
  let byte = 1
  const spazio = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(testo)
  if (spazio) byte = Math.max(1, spazio[1].length / 2)
  for (const blocco of testo.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const c of blocco[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      mappa.set(parseInt(c[1], 16), utf16(c[2]))
      byte = Math.max(byte, c[1].length / 2)
    }
  }
  for (const blocco of testo.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const re = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]*)>|\[([^\]]*)\])/g
    for (const c of blocco[1].matchAll(re)) {
      const da = parseInt(c[1], 16)
      const a = Math.min(parseInt(c[2], 16), da + 0xffff)
      byte = Math.max(byte, c[1].length / 2)
      if (c[3] != null) {
        const base = c[3]
        for (let k = da; k <= a; k += 1) {
          // Si incrementa l'ultimo carattere della destinazione.
          const s = utf16(base)
          mappa.set(k, s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) + (k - da)))
        }
      } else {
        const dest = [...c[4].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => utf16(x[1]))
        for (let k = da; k <= a && k - da < dest.length; k += 1) mappa.set(k, dest[k - da])
      }
    }
  }
  return { mappa, byte }
}

// Le larghezze dei font CID: [primo [w1 w2 …]] oppure [primo ultimo w].
function larghezzeCid(w, risolvi) {
  const out = new Map()
  const arr = risolvi(w)
  if (!Array.isArray(arr)) return out
  for (let k = 0; k < arr.length; ) {
    const primo = risolvi(arr[k])
    const dopo = risolvi(arr[k + 1])
    if (Array.isArray(dopo)) {
      dopo.forEach((v, i) => out.set(primo + i, Number(risolvi(v)) || 0))
      k += 2
    } else {
      const ultimo = dopo
      const larg = Number(risolvi(arr[k + 2])) || 0
      for (let c = primo; c <= ultimo && c - primo < 0xffff; c += 1) out.set(c, larg)
      k += 3
    }
  }
  return out
}

async function leggiFont(rif, contesto) {
  const { risolvi, oggetti, raw } = contesto
  const f = risolvi(rif) || {}
  const tipo0 = f.Subtype === '/Type0'
  let cmap = null
  if (f.ToUnicode?.ref != null) {
    const dati = await datiDelloStream(raw, oggetti.get(f.ToUnicode.ref))
    if (dati) cmap = leggiCMap(dati)
  }
  let larghezza
  if (tipo0) {
    const discendente = risolvi(risolvi(f.DescendantFonts)?.[0]) || {}
    const dw = Number(risolvi(discendente.DW)) || 1000
    const w = larghezzeCid(discendente.W, risolvi)
    larghezza = (c) => w.get(c) ?? dw
  } else {
    const primo = Number(risolvi(f.FirstChar)) || 0
    const w = risolvi(f.Widths)
    const manca = Number(risolvi(risolvi(f.FontDescriptor)?.MissingWidth)) || 0
    // I 14 font standard (Helvetica, Times…) non scrivono le larghezze: mezzo
    // em è una media onesta, e serve solo a capire dove cadono gli spazi.
    larghezza = (c) => {
      const v = Array.isArray(w) ? Number(risolvi(w[c - primo])) : NaN
      return Number.isFinite(v) && v > 0 ? v : manca || 500
    }
  }
  return { byte: tipo0 ? 2 : cmap?.byte === 2 ? 2 : 1, mappa: cmap?.mappa || null, larghezza }
}

// I codici di una stringa, con il loro testo.
function decodifica(str, font) {
  const out = []
  const passo = font?.byte || 1
  for (let i = 0; i + passo <= str.length; i += passo) {
    const codice = passo === 2 ? (str.charCodeAt(i) << 8) | str.charCodeAt(i + 1) : str.charCodeAt(i)
    let testo = font?.mappa?.get(codice)
    if (testo == null) testo = passo === 1 ? CP1252[codice] || String.fromCharCode(codice) : ''
    out.push({ codice, testo })
  }
  return out
}

// ---- Il content stream -----------------------------------------------------

const IDENTITA = [1, 0, 0, 1, 0, 0]
const per = (a, b) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
]

// I caratteri che non si leggono: controlli e l'area "uso privato", dove i
// font simbolo (Wingdings, Symbol) mettono i pallini degli elenchi.
function ripulisciRun(testo) {
  return testo
    .replace(/[\uE000-\uF8FF\u2022\u25AA\u25CF\u25E6\u2023\u27A2\u2713\u2714\u00B7]/g, '•')
    // eslint-disable-next-line no-control-regex -- sono proprio i caratteri di controllo da togliere
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
    .replace(/[\u00A0\t]/g, ' ')
}

/** Esegue un content stream e raccoglie i run di testo con le loro coordinate. */
async function eseguiContenuto(contenuto, risorse, ctmIniziale, contesto, runs, profondita = 0) {
  const { risolvi } = contesto
  const fontRisorse = risolvi(risorse?.Font) || {}
  const xobject = risolvi(risorse?.XObject) || {}
  const fontPerNome = new Map()
  for (const [nome, rif] of Object.entries(fontRisorse)) {
    const chiave = rif?.ref ?? nome
    if (!contesto.fontCache.has(chiave)) contesto.fontCache.set(chiave, await leggiFont(rif, contesto))
    fontPerNome.set(nome, contesto.fontCache.get(chiave))
  }

  let g = { ctm: ctmIniziale, font: null, dim: 0, tc: 0, tw: 0, th: 1, tl: 0, rise: 0 }
  const pila = []
  let tm = IDENTITA
  let tlm = IDENTITA
  let operandi = []

  const mostra = (str) => {
    if (!g.font || typeof str?.s !== 'string') return
    const glifi = decodifica(str.s, g.font)
    const trm = per(per([g.dim * g.th, 0, 0, g.dim, 0, g.rise], tm), g.ctm)
    let avanza = 0
    let testo = ''
    for (const gl of glifi) {
      const w = g.font.larghezza(gl.codice) / 1000
      const spazio = gl.codice === 32 && g.font.byte === 1 ? g.tw : 0
      avanza += (w * g.dim + g.tc + spazio) * g.th
      testo += gl.testo
    }
    tm = per([1, 0, 0, 1, avanza, 0], tm)
    const fine = per(per([g.dim * g.th, 0, 0, g.dim, 0, g.rise], tm), g.ctm)
    const h = Math.hypot(trm[2], trm[3]) || g.dim
    const pulito = ripulisciRun(testo)
    if (pulito) runs.push({ x: trm[4], x1: fine[4], y: trm[5], h, testo: pulito, ordine: runs.length })
  }

  const vaiACapo = () => {
    tlm = per([1, 0, 0, 1, 0, -g.tl], tlm)
    tm = tlm
  }

  let i = 0
  while (i < contenuto.length) {
    i = saltaSpazi(contenuto, i)
    if (i >= contenuto.length) break
    const c = contenuto[i]
    if ('/([<'.includes(c) || /[-+.\d]/.test(c)) {
      const [v, j] = leggiValore(contenuto, i, false)
      operandi.push(v)
      i = j > i ? j : i + 1
      continue
    }
    if (DELIMITATORI.includes(c)) {
      i += 1
      continue
    }
    const j = leggiParola(contenuto, i)
    const op = contenuto.slice(i, j)
    i = Math.max(j, i + 1)
    const n = (k) => Number(operandi[k]) || 0

    switch (op) {
      case 'q':
        pila.push({ ...g })
        break
      case 'Q':
        if (pila.length) g = pila.pop()
        break
      case 'cm':
        if (operandi.length >= 6) g = { ...g, ctm: per([n(0), n(1), n(2), n(3), n(4), n(5)], g.ctm) }
        break
      case 'BT':
        tm = IDENTITA
        tlm = IDENTITA
        break
      case 'Tf':
        g = { ...g, font: fontPerNome.get(String(operandi[0]).slice(1)) || null, dim: n(1) }
        break
      case 'Tc':
        g = { ...g, tc: n(0) }
        break
      case 'Tw':
        g = { ...g, tw: n(0) }
        break
      case 'Tz':
        g = { ...g, th: n(0) / 100 }
        break
      case 'TL':
        g = { ...g, tl: n(0) }
        break
      case 'Ts':
        g = { ...g, rise: n(0) }
        break
      case 'Td':
      case 'TD':
        if (op === 'TD') g = { ...g, tl: -n(1) }
        tlm = per([1, 0, 0, 1, n(0), n(1)], tlm)
        tm = tlm
        break
      case 'Tm':
        if (operandi.length >= 6) {
          tlm = [n(0), n(1), n(2), n(3), n(4), n(5)]
          tm = tlm
        }
        break
      case 'T*':
        vaiACapo()
        break
      case 'Tj':
        mostra(operandi[0])
        break
      case "'":
        vaiACapo()
        mostra(operandi[0])
        break
      case '"':
        g = { ...g, tw: n(0), tc: n(1) }
        vaiACapo()
        mostra(operandi[2])
        break
      case 'TJ':
        for (const el of Array.isArray(operandi[0]) ? operandi[0] : []) {
          if (typeof el === 'number') tm = per([1, 0, 0, 1, (-el / 1000) * g.dim * g.th, 0], tm)
          else mostra(el)
        }
        break
      case 'Do': {
        // Un "form XObject": un pezzo di pagina riusabile, con le sue risorse.
        // Alcuni programmi ci mettono intestazioni e caselle di testo.
        const rif = xobject[String(operandi[0]).slice(1)]
        const o = rif?.ref != null ? contesto.oggetti.get(rif.ref) : null
        if (o?.valore?.Subtype === '/Form' && profondita < 4) {
          const dati = await datiDelloStream(contesto.raw, o)
          const matrice = Array.isArray(o.valore.Matrix) ? o.valore.Matrix.map(Number) : IDENTITA
          if (dati) {
            await eseguiContenuto(dati, risolvi(o.valore.Resources) || risorse, per(matrice, g.ctm), contesto, runs, profondita + 1)
          }
        }
        break
      }
      case 'BI': {
        // Immagine in linea: i suoi byte non sono operatori.
        const fine = contenuto.indexOf('EI', i)
        i = fine < 0 ? contenuto.length : fine + 2
        break
      }
      default:
        break
    }
    operandi = []
  }
}

// ---- Dai run alle righe ------------------------------------------------------

/**
 * I run di una pagina rimessi in righe: dall'alto in basso, e in ogni riga da
 * sinistra a destra. Dentro la riga i run vicini si fondono (con uno spazio se
 * fra i due c'è il vuoto di uno spazio); quelli lontani restano SEGMENTI
 * separati, che è come si riconoscono le colonne di una tabella.
 *
 * @returns {{y:number, h:number, testo:string, segmenti:{x:number,x1:number,testo:string}[]}[]}
 */
export function righeDaRun(runs) {
  const utili = runs.filter((r) => r.testo.trim())
  const ordinati = [...utili].sort((a, b) => b.y - a.y || a.x - b.x)
  const righe = []
  for (const r of ordinati) {
    const ultima = righe[righe.length - 1]
    if (ultima && Math.abs(ultima.y - r.y) <= 0.4 * Math.min(ultima.h, r.h || ultima.h)) {
      ultima.runs.push(r)
    } else {
      righe.push({ y: r.y, h: r.h || 10, runs: [r] })
    }
  }
  return righe.map((riga) => {
    const runsRiga = riga.runs.sort((a, b) => a.x - b.x)
    const segmenti = []
    for (const r of runsRiga) {
      const s = segmenti[segmenti.length - 1]
      const vuoto = s ? r.x - s.x1 : Infinity
      if (!s || vuoto > 2.5 * riga.h) {
        segmenti.push({ x: r.x, x1: r.x1, testo: r.testo })
        continue
      }
      // Run sovrapposti (lo stesso testo scritto due volte per fare il
      // grassetto finto) non si ripetono.
      if (vuoto < -0.5 * riga.h && s.testo.endsWith(r.testo)) continue
      const serveSpazio = vuoto > 0.15 * riga.h && !/\s$/.test(s.testo) && !/^\s/.test(r.testo)
      s.testo += (serveSpazio ? ' ' : '') + r.testo
      s.x1 = Math.max(s.x1, r.x1)
    }
    for (const s of segmenti) s.testo = s.testo.replace(/\s+/g, ' ').trim()
    return {
      y: riga.y,
      h: riga.h,
      runs: runsRiga,
      segmenti: segmenti.filter((s) => s.testo),
      testo: segmenti.map((s) => s.testo).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    }
  })
}

// Intestazioni e piè di pagina: le righe che si ripetono uguali su più pagine
// (il nome del nutrizionista, il telefono) e i numeri di pagina. Nel testo
// della dieta finirebbero in mezzo a un pasto, a ogni cambio pagina.
function segnaRipetute(pagine) {
  const conta = new Map()
  for (const p of pagine) {
    for (const t of new Set(p.righe.map((r) => r.testo.toLowerCase()))) conta.set(t, (conta.get(t) || 0) + 1)
  }
  for (const p of pagine) {
    const alto = p.altezza || 842
    for (const r of p.righe) {
      const bordo = r.y > alto * 0.86 || r.y < alto * 0.1
      const numeroPagina = /^(pag\.?\s*|pagina\s*)?\d{1,3}(\s*(di|\/)\s*\d{1,3})?$/i.test(r.testo)
      r.ripetuta = bordo && ((pagine.length > 1 && conta.get(r.testo.toLowerCase()) > 1) || numeroPagina)
      for (const run of r.runs) run.ripetuta = r.ripetuta
    }
  }
}

/**
 * Le pagine di un PDF come righe posizionate.
 * @param {Uint8Array} bytes
 * @returns {Promise<{righe:object[], runs:object[], altezza:number}[]>}
 */
export async function pagineDaPdf(bytes) {
  const raw = bytesInStringa(bytes)
  if (!raw.startsWith('%PDF')) throw new Error('non-pdf')
  const oggetti = await leggiOggetti(raw)
  const risolvi = (v) => {
    let k = 0
    while (v && typeof v === 'object' && v.ref != null && k < 32) {
      v = oggetti.get(v.ref)?.valore
      k += 1
    }
    return v
  }
  const contesto = { raw, oggetti, risolvi, fontCache: new Map() }

  // L'albero delle pagine, in ordine. Risorse e MediaBox si ereditano.
  const elenco = []
  const visita = (nodo, eredita, profondita) => {
    const n = risolvi(nodo)
    if (!n || typeof n !== 'object' || profondita > 40) return
    const risorse = n.Resources ?? eredita.risorse
    const box = n.MediaBox ?? eredita.box
    if (Array.isArray(n.Kids)) {
      for (const k of n.Kids) visita(k, { risorse, box }, profondita + 1)
      return
    }
    if (n.Type === '/Page' || n.Contents) elenco.push({ pagina: n, risorse: risolvi(risorse), box: risolvi(box) })
  }
  const catalogo = [...oggetti.values()].find((o) => o.valore?.Type === '/Catalog')
  if (catalogo) visita(catalogo.valore.Pages, {}, 0)
  if (elenco.length === 0) {
    const numeri = [...oggetti.keys()].sort((a, b) => a - b)
    for (const k of numeri) {
      const v = oggetti.get(k).valore
      if (v?.Type === '/Page') elenco.push({ pagina: v, risorse: risolvi(v.Resources), box: risolvi(v.MediaBox) })
    }
  }

  const pagine = []
  for (const { pagina, risorse, box } of elenco) {
    const contenuti = risolvi(pagina.Contents)
    const rif = Array.isArray(contenuti) ? contenuti : [pagina.Contents]
    let testo = ''
    for (const r of rif) {
      const o = r?.ref != null ? oggetti.get(r.ref) : null
      const dati = await datiDelloStream(raw, o)
      if (dati) testo += `${dati}\n`
    }
    const runs = []
    if (testo) await eseguiContenuto(testo, risorse, IDENTITA, contesto, runs)
    const altezza = Array.isArray(box) ? Number(risolvi(box[3])) - Number(risolvi(box[1])) : 842
    pagine.push({ runs, righe: righeDaRun(runs), altezza: altezza || 842 })
  }
  segnaRipetute(pagine)
  return pagine
}

// Il testo estratto ha senso? Se la maggior parte dei caratteri non è roba che
// si scrive in una dieta, abbiamo pescato glifi e non lettere.
function sembraTesto(testo) {
  const pulito = testo.replace(/\s/g, '')
  if (pulito.length < 40) return false
  const buoni = pulito.match(/[a-zA-Z0-9àèéìòùÀÈÉÌÒÙ.,;:()%/'’"“”+½¼¾•€°=!?-]/g)?.length || 0
  return buoni / pulito.length > 0.8
}

/** Le righe di tutte le pagine come testo, senza intestazioni ripetute. */
export function testoDaPagine(pagine) {
  return pagine
    .map((p) => p.righe.filter((r) => !r.ripetuta).map((r) => r.testo).join('\n'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Prova a leggere il testo di un PDF.
 * @param {File|Blob} file
 * @returns {Promise<{ok:boolean, testo:string, motivo:string, pagine:object[]}>}
 *   `motivo` è già la frase da mostrare quando `ok` è false. `pagine` porta le
 *   righe con le coordinate, per chi deve riconoscere una tabella.
 */
export async function testoDaPdf(file) {
  const vuoto = { ok: false, testo: '', pagine: [] }
  if (!file) return { ...vuoto, motivo: 'Nessun file selezionato.' }
  if (file.size > MAX_BYTE) return { ...vuoto, motivo: 'Il PDF è troppo grande (oltre 20MB).' }
  if (!decompressioneDisponibile()) {
    return {
      ...vuoto,
      motivo: 'Questo browser non sa decomprimere i PDF. Apri il PDF, copia il testo e incollalo qui sotto.',
    }
  }

  let bytes
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    return { ...vuoto, motivo: 'Non riesco a leggere il file.' }
  }
  if (!bytesInStringa(bytes.subarray(0, 5)).startsWith('%PDF')) {
    return { ...vuoto, motivo: 'Questo file non sembra un PDF.' }
  }
  if (/\/Encrypt\b/.test(bytesInStringa(bytes.subarray(Math.max(0, bytes.length - 4096))))) {
    return {
      ...vuoto,
      motivo: 'Questo PDF è protetto. Aprilo, copia il testo e incollalo qui sotto: funziona sempre.',
    }
  }

  let pagine
  try {
    pagine = await pagineDaPdf(bytes)
  } catch {
    return { ...vuoto, motivo: 'Non riesco a leggere questo PDF. Aprilo, copia il testo e incollalo qui sotto.' }
  }
  const testo = testoDaPagine(pagine)
  if (!testo) {
    return {
      ...vuoto,
      pagine,
      motivo:
        'Dentro questo PDF non c’è testo da leggere (succede con le scansioni e le foto). Copia il testo e incollalo qui sotto.',
    }
  }
  if (!sembraTesto(testo)) {
    return {
      ok: false,
      testo,
      pagine,
      motivo:
        'Il testo di questo PDF è scritto con font che non so decifrare. Aprilo, copia il testo e incollalo qui sotto: funziona sempre.',
    }
  }
  return { ok: true, testo, pagine, motivo: '' }
}
