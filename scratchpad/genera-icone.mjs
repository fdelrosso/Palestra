// Genera le icone PWA (manubrio blu su fondo bianco) senza dipendenze:
// rasterizza a mano le forme e scrive i PNG con zlib.
//
//   node genera-icone.mjs <cartella-public>
//
// Le forme sono rettangoli arrotondati in un sistema di riferimento 512×512
// centrato in (0,0), ruotati di ANGOLO. Il test "dentro" è la SDF del
// rettangolo arrotondato; l'antialiasing viene da un supersampling 4×4.

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2]
if (!OUT) {
  console.error('Uso: node genera-icone.mjs <cartella-public>')
  process.exit(1)
}

const BLU = [0x25, 0x63, 0xeb] // #2563EB
const BIANCO = [0xff, 0xff, 0xff]

// Manubrio: barra centrale + due ghiere interne + due dischi esterni.
const FORME = [
  { cx: 0, cy: 0, w: 300, h: 48, r: 24 },
  { cx: -115, cy: 0, w: 32, h: 112, r: 14 },
  { cx: 115, cy: 0, w: 32, h: 112, r: 14 },
  { cx: -170, cy: 0, w: 60, h: 216, r: 25 },
  { cx: 170, cy: 0, w: 60, h: 216, r: 25 },
]
const RIF = 512
const ANGOLO = (-22 * Math.PI) / 180
const COS = Math.cos(ANGOLO)
const SIN = Math.sin(ANGOLO)

function dentro(x, y) {
  for (const f of FORME) {
    const dx = Math.abs(x - f.cx)
    const dy = Math.abs(y - f.cy)
    const qx = Math.max(dx - (f.w / 2 - f.r), 0)
    const qy = Math.max(dy - (f.h / 2 - f.r), 0)
    if (qx * qx + qy * qy <= f.r * f.r) return true
  }
  return false
}

// Copertura 0..1 del pixel (px,py) con supersampling N×N.
function copertura(px, py, lato, scala, N = 4) {
  const k = RIF / lato / scala
  let dentroCount = 0
  for (let sy = 0; sy < N; sy++) {
    for (let sx = 0; sx < N; sx++) {
      const X = (px + (sx + 0.5) / N - lato / 2) * k
      const Y = (py + (sy + 0.5) / N - lato / 2) * k
      // Punto immagine → punto disegno: rotazione inversa.
      const x = X * COS + Y * SIN
      const y = -X * SIN + Y * COS
      if (dentro(x, y)) dentroCount++
    }
  }
  return dentroCount / (N * N)
}

function pixels(lato, scala) {
  const buf = Buffer.alloc(lato * lato * 3)
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const a = copertura(x, y, lato, scala)
      const i = (y * lato + x) * 3
      for (let c = 0; c < 3; c++) {
        buf[i + c] = Math.round(BIANCO[c] * (1 - a) + BLU[c] * a)
      }
    }
  }
  return buf
}

// ------------------------------------------------------------------ PNG
const TAVOLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TAVOLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function blocco(tipo, dati) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(dati.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([len, corpo, crc])
}

function png(lato, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(lato, 0)
  ihdr.writeUInt32BE(lato, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor RGB
  // 10..12 = compressione/filtro/interlacciamento = 0
  // Scanline con filtro 0 (nessuno): basta e avanza per una figura piatta.
  const righe = Buffer.alloc(lato * (lato * 3 + 1))
  for (let y = 0; y < lato; y++) {
    righe[y * (lato * 3 + 1)] = 0
    rgb.copy(righe, y * (lato * 3 + 1) + 1, y * lato * 3, (y + 1) * lato * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blocco('IHDR', ihdr),
    blocco('IDAT', deflateSync(righe, { level: 9 })),
    blocco('IEND', Buffer.alloc(0)),
  ])
}

// scala: quanto il manubrio riempie il quadrato. Le icone "maskable" devono
// stare nel cerchio centrale all'80%, quindi il disegno è più piccolo.
const ICONE = [
  ['pwa-192.png', 192, 0.95],
  ['pwa-512.png', 512, 0.95],
  ['pwa-512-maskable.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 0.88],
]

for (const [nome, lato, scala] of ICONE) {
  const file = join(OUT, nome)
  writeFileSync(file, png(lato, pixels(lato, scala)))
  console.log('scritto', nome, lato + '×' + lato, 'scala', scala)
}
