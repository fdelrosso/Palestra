// Legge il QR dall'immagine del poster e stampa cosa contiene.
//   node poster/verifica-qr.mjs poster/poster-a4.png
import { readFile } from 'node:fs/promises'
import { readBarcodes } from 'zxing-wasm/reader'

const file = process.argv[2] || new URL('poster-a4.png', import.meta.url).pathname
const r = await readBarcodes(new Blob([await readFile(file)]), { formats: ['QRCode'], tryHarder: true })
console.log(r.length ? r.map((x) => `${x.text} (correzione ${x.ecLevel})`).join('\n') : 'NESSUN QR LETTO')
