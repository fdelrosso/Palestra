// Esporta tutto: il poster (PDF A4 di una pagina + PNG di anteprima, e la
// versione 2 per foglio in A5) e
// Instagram, tutto 4:5 (1080×1350) — la storia (poster.html?ig) e le slide
// del carosello (carosello.html), che sono due cose separate.
//   node poster/esporta.mjs
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const require = createRequire('/home/matte/.local/lib/node_modules/rea-agents/package.json')
const { chromium } = require('playwright-core')

const qui = (f) => fileURLToPath(new URL(f, import.meta.url))
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
})

async function apri(file, larghezza, altezza, scala, query = '') {
  const p = await browser.newPage({ viewport: { width: larghezza, height: altezza }, deviceScaleFactor: scala })
  await p.goto(`file://${qui(file)}${query}`)
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  return p
}

// La misura della pagina la dà @page nell'HTML (preferCSSPageSize): con
// format: 'A4' Chrome la faceva di 842,88 pt, più del disegno, e su un lato
// restava un filo bianco.
// Il poster, scuro, chiaro (?chiaro: meno inchiostro) e misto (?misto: fondo
// chiaro, app scura), singolo e 2 per foglio.
for (const [nome, query] of [['', ''], ['-chiaro', '?chiaro'], ['-misto', '?misto']]) {
  const a4 = await apri('poster.html', 794, 1123, 2, query)
  await a4.screenshot({ path: qui(`poster-a4${nome}.png`), clip: { x: 0, y: 0, width: 794, height: 1123 } })
  await a4.pdf({ path: qui(`poster-a4${nome}.pdf`), preferCSSPageSize: true, printBackground: true, pageRanges: '1' })

  // 2 per foglio: due A5 su un A4 orizzontale, da tagliare (poster-2x.html).
  const x2 = await apri('poster-2x.html', 1123, 794, 2, query)
  await x2.waitForTimeout(500)
  await x2.screenshot({ path: qui(`poster-2x${nome}.png`), clip: { x: 0, y: 0, width: 1123, height: 794 } })
  await x2.pdf({ path: qui(`poster-2x${nome}.pdf`), preferCSSPageSize: true, printBackground: true, pageRanges: '1' })
}

// Instagram: si disegna a 794 di larghezza e si scala a 1080. Il fattore non dà
// pixel interi, quindi alla fine si ritaglia alla misura esatta.
mkdirSync(qui('instagram'), { recursive: true })
const S = 1080 / 794
const usciti = []
async function scatta(pagina, nome, y) {
  const path = qui(`instagram/${nome}`)
  await pagina.screenshot({ path, scale: 'device', fullPage: true, clip: { x: 0, y, width: 794, height: 993 } })
  usciti.push(path)
}

await scatta(await apri('poster.html', 794, 993, S, '?ig'), 'storia.png', 0)
// Un carosello per file: carosello.html (l'app) e uno per ogni feature.
for (const nome of ['carosello', 'feed']) {
  const car = await apri(`${nome}.html`, 794, 993, S)
  const slide = await car.locator('.slide').count()
  for (let i = 0; i < slide; i++) await scatta(car, `${nome}-${i + 1}.png`, i * 993)
}
await browser.close()

for (const path of usciti) {
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${path}').crop((0, 0, 1080, 1350)).save('${path}')`])
}
