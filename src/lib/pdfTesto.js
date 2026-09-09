// ---------------------------------------------------------------------------
// Estrarre il testo da un PDF, senza librerie.
//
// Perché a mano: le librerie serie (pdf.js) pesano ~1MB, e questa è una PWA che
// deve stare leggera e installarsi al volo sul telefono. Per il nostro caso —
// il PDF della dieta scritto col computer dal nutrizionista — basta molto meno,
// perché il testo dentro un PDF così è davvero lì, solo compresso.
//
// Come funziona, in tre passi:
//   1. si cercano i blocchi `stream … endstream` e si tiene solo quelli che
//      NON sono immagini;
//   2. si decomprimono con DecompressionStream('deflate'), che è nel browser da
//      Safari 16.4 / Chrome 80 (la stessa soglia delle notifiche push in PWA);
//   3. dal "content stream" si prendono le stringhe degli operatori di testo
//      (Tj, TJ, ', ") e si va a capo quando cambia la coordinata Y.
//
// ⚠️ Non funziona sempre, e va bene così:
//   - PDF che sono una FOTO della pagina (scansioni) → dentro non c'è testo,
//     nessuna libreria al mondo lo tira fuori senza OCR;
//   - font con codifica CID/Identity-H → i caratteri sono indici di glifi, e
//     senza la tabella del font escono simboli a caso.
// In tutti e due i casi si torna con `ok:false` e si chiede all'utente di
// copiare e incollare il testo: è la strada che funziona sempre, e per un
// foglio di dieta sono dieci secondi.
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

// Il dizionario che precede uno `stream` (dall'ultimo `<<` prima di esso).
function dizionarioPrimaDi(raw, posStream) {
  const inizio = raw.lastIndexOf('<<', posStream)
  if (inizio < 0 || posStream - inizio > 2000) return ''
  return raw.slice(inizio, posStream)
}

// Uno stream è "di testo" se è compresso con Flate e non è un'immagine.
function streamDiTesto(dizionario) {
  if (!dizionario.includes('/FlateDecode')) return false
  return !/\/(Image|DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)\b/.test(dizionario)
}

// ---- dal content stream al testo -----------------------------------------

// Una stringa PDF letterale: (testo con \( parentesi \) e \ooo ottali).
function leggiStringaLetterale(s, i) {
  let out = ''
  let livello = 1
  let j = i
  while (j < s.length) {
    const c = s[j]
    if (c === '\\') {
      const next = s[j + 1]
      const ottale = s.slice(j + 1, j + 4).match(/^[0-7]{1,3}/)
      if (ottale) {
        out += String.fromCharCode(parseInt(ottale[0], 8))
        j += 1 + ottale[0].length
        continue
      }
      const mappa = { n: '\n', r: '\n', t: '\t', b: '', f: '', '(': '(', ')': ')', '\\': '\\' }
      out += mappa[next] ?? next ?? ''
      j += 2
      continue
    }
    if (c === '(') livello += 1
    if (c === ')') {
      livello -= 1
      if (livello === 0) return { testo: out, fine: j + 1 }
    }
    out += c
    j += 1
  }
  return { testo: out, fine: j }
}

function leggiStringaEsadecimale(s, i) {
  const fine = s.indexOf('>', i)
  if (fine < 0) return { testo: '', fine: s.length }
  const hex = s.slice(i, fine).replace(/[^0-9a-fA-F]/g, '')
  let out = ''
  for (let k = 0; k + 1 < hex.length; k += 2) {
    out += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16))
  }
  return { testo: out, fine: fine + 1 }
}

/**
 * Il testo dentro un content stream già decompresso.
 * Si va a capo quando la Y del testo cambia (Td/TD/Tm) o su T*; uno spazio
 * quando dentro un TJ c'è uno scarto grande (è così che i PDF separano le
 * parole senza scrivere lo spazio).
 */
function testoDaContentStream(contenuto) {
  let out = ''
  let numeri = [] // gli ultimi operandi numerici incontrati
  let ultimaY = null
  let i = 0

  const vaiACapo = () => {
    if (out && !out.endsWith('\n')) out += '\n'
  }

  while (i < contenuto.length) {
    const c = contenuto[i]

    if (c === '(') {
      const { testo, fine } = leggiStringaLetterale(contenuto, i + 1)
      out += testo
      i = fine
      continue
    }
    if (c === '<' && contenuto[i + 1] !== '<') {
      const { testo, fine } = leggiStringaEsadecimale(contenuto, i + 1)
      out += testo
      i = fine
      continue
    }
    // Dentro un array TJ: un numero molto negativo è uno spazio tipografico.
    if (c === ']') {
      i += 1
      continue
    }

    const resto = contenuto.slice(i)
    const num = resto.match(/^-?\d*\.?\d+/)
    if (num) {
      const v = parseFloat(num[0])
      numeri.push(v)
      if (numeri.length > 6) numeri.shift()
      // Lo scarto dentro TJ vale come spazio (soglia empirica, in millesimi di em).
      if (v < -120 && out && !out.endsWith(' ') && !out.endsWith('\n')) out += ' '
      i += num[0].length
      continue
    }

    const op = resto.match(/^(T\*|TD|Td|Tm|Tj|TJ|ET|BT|'|")/)
    if (op) {
      const nome = op[1]
      if (nome === 'T*' || nome === 'ET' || nome === "'" || nome === '"') vaiACapo()
      else if (nome === 'Td' || nome === 'TD') {
        const y = numeri[numeri.length - 1]
        if (ultimaY != null && Math.abs(y - ultimaY) > 0.5) vaiACapo()
        else if (ultimaY != null && out && !out.endsWith(' ') && !out.endsWith('\n')) out += ' '
        ultimaY = y
      } else if (nome === 'Tm') {
        const y = numeri[numeri.length - 1]
        if (ultimaY != null && Math.abs(y - ultimaY) > 0.5) vaiACapo()
        ultimaY = y
      }
      numeri = []
      i += nome.length
      continue
    }

    i += 1
  }
  return out
}

// Il testo estratto ha senso? Se la maggior parte dei caratteri non è roba che
// si scrive in una dieta, abbiamo pescato glifi e non lettere.
function sembraTesto(testo) {
  const pulito = testo.replace(/\s/g, '')
  if (pulito.length < 40) return false
  const buoni = pulito.match(/[a-zA-Z0-9àèéìòùÀÈÉÌÒÙ.,;:()%/'-]/g)?.length || 0
  return buoni / pulito.length > 0.72
}

// Righe ripulite: via gli spazi doppi e le righe vuote di troppo.
function ripulisci(testo) {
  return testo
    .split('\n')
    .map((r) => r.replace(/[ \t]+/g, ' ').trim())
    .filter((r, i, arr) => r !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim()
}

/**
 * Prova a leggere il testo di un PDF.
 * @param {File|Blob} file
 * @returns {Promise<{ok:boolean, testo:string, motivo:string}>}
 *   `motivo` è già la frase da mostrare quando `ok` è false.
 */
export async function testoDaPdf(file) {
  if (!file) return { ok: false, testo: '', motivo: 'Nessun file selezionato.' }
  if (file.size > MAX_BYTE) {
    return { ok: false, testo: '', motivo: 'Il PDF è troppo grande (oltre 20MB).' }
  }
  if (!decompressioneDisponibile()) {
    return {
      ok: false,
      testo: '',
      motivo:
        'Questo browser non sa decomprimere i PDF. Apri il PDF, copia il testo e incollalo qui sotto.',
    }
  }

  let raw
  try {
    raw = bytesInStringa(new Uint8Array(await file.arrayBuffer()))
  } catch {
    return { ok: false, testo: '', motivo: 'Non riesco a leggere il file.' }
  }
  if (!raw.startsWith('%PDF')) {
    return { ok: false, testo: '', motivo: 'Questo file non sembra un PDF.' }
  }

  const pezzi = []
  let pos = 0
  while (true) {
    const inizio = raw.indexOf('stream', pos)
    if (inizio < 0) break
    // `endstream`/`endobj` contengono "stream": non sono l'inizio di uno stream.
    const primaChar = raw[inizio - 1]
    if (primaChar === 'd') {
      pos = inizio + 6
      continue
    }
    const fine = raw.indexOf('endstream', inizio)
    if (fine < 0) break
    const dizionario = dizionarioPrimaDi(raw, inizio)
    if (streamDiTesto(dizionario)) {
      // Dopo `stream` c'è \r\n o \n, e prima di `endstream` di solito un a capo.
      let dati = inizio + 6
      if (raw[dati] === '\r') dati += 1
      if (raw[dati] === '\n') dati += 1
      // L'a capo prima di `endstream` non fa parte dei dati compressi.
      pezzi.push(raw.slice(dati, fine).replace(/[\r\n]+$/, ''))
    }
    pos = fine + 9
  }

  if (pezzi.length === 0) {
    return {
      ok: false,
      testo: '',
      motivo:
        'Dentro questo PDF non c’è testo da leggere (succede con le scansioni e le foto). Copia il testo e incollalo qui sotto.',
    }
  }

  let testo = ''
  for (const pezzo of pezzi) {
    const inflato = await inflate(stringaInBytes(pezzo))
    if (!inflato) continue
    const contenuto = bytesInStringa(inflato)
    // Gli stream che non sono pagine (font, metadati) non hanno operatori di
    // testo: si riconoscono così, senza dover interpretare tutto il PDF.
    if (!/\bBT\b/.test(contenuto)) continue
    testo += testoDaContentStream(contenuto) + '\n'
  }

  const pulito = ripulisci(testo)
  if (!sembraTesto(pulito)) {
    return {
      ok: false,
      testo: pulito,
      motivo:
        'Il testo di questo PDF è scritto con font che non so decifrare. Aprilo, copia il testo e incollalo qui sotto: funziona sempre.',
    }
  }
  return { ok: true, testo: pulito, motivo: '' }
}
