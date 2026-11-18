// La prima slide del carosello Social come VIDEO: il feed che scorre al post
// dopo e torna indietro, dentro il telefono di feed.html. Esce
// instagram/feed-1.mp4 (per Instagram: nei caroselli le GIF restano ferme) e
// instagram/feed-1.gif.
//   serve il server dei banchi: npx vite --config scratchpad/vite.prova.config.js
//   FFMPEG=<ffmpeg con libx264> node poster/video-feed.mjs
// (il ffmpeg di Playwright sa fare solo WebM; uno completo: pip install imageio-ffmpeg)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire('/home/matte/.local/lib/node_modules/rea-agents/package.json')
const { chromium } = require('playwright-core')

const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const qui = (f) => fileURLToPath(new URL(f, import.meta.url))
const FPS = 30
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
})

// Il percorso dello scorrimento, in "schermate": fermo, giù al post dopo,
// fermo, su, fermo. Ogni tratto con un'andatura morbida.
const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const tratti = [[0, 0, 0.8], [0, 1, 1.1], [1, 1, 1.2], [1, 0, 1.1], [0, 0, 0.4]] // da, a, secondi
const posizioni = tratti.flatMap(([da, a, s]) =>
  Array.from({ length: Math.round(s * FPS) }, (_, i) => da + (a - da) * morbido(i / (s * FPS))),
)

// 1. Il feed: un fotogramma per posizione.
const app = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark' })
await app.clock.setFixedTime(new Date('2026-11-02T09:30:00'))
await app.goto('http://localhost:5174/scratchpad/prova-poster-feed.html')
await app.waitForTimeout(1500)
const scorri = (y) => app.evaluate(async (y) => {
  const s = document.querySelector('.feed-schermo')
  s.style.scrollSnapType = 'none'
  s.scrollTop = s.clientHeight * y
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}, y)
// Lo sfondo del secondo post si carica solo quando ci si arriva: prima un giro.
await scorri(1)
await app.waitForTimeout(2500)
await scorri(0)
await app.waitForTimeout(1500)
const scatti = []
for (const y of posizioni) {
  await scorri(y)
  await app.waitForTimeout(40)
  scatti.push(await app.screenshot())
}

// 2. Ogni fotogramma dentro il telefono della prima slide.
const dir = mkdtempSync(join(tmpdir(), 'video-feed-'))
const slide = await browser.newPage({ viewport: { width: 794, height: 993 }, deviceScaleFactor: 1080 / 794 })
await slide.goto(`file://${qui('feed.html')}`)
await slide.evaluate(() => document.fonts.ready)
const img = slide.locator('.slide').first().locator('.telefono img')
for (const [i, png] of scatti.entries()) {
  await img.evaluate((el, src) => { el.src = src; return el.decode() }, `data:image/png;base64,${png.toString('base64')}`)
  await slide.screenshot({ path: join(dir, `${String(i).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: 794, height: 993 } })
}
await browser.close()

// 3. Il video (1080×1350, H.264) e la GIF.
const ingresso = ['-y', '-framerate', String(FPS), '-i', join(dir, '%04d.png')]
execFileSync(ffmpeg, [...ingresso, '-vf', 'crop=1080:1350:0:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', qui('instagram/feed-1.mp4')], { stdio: 'inherit' })
execFileSync(ffmpeg, [...ingresso, '-vf', 'crop=1080:1350:0:0,fps=15,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', qui('instagram/feed-1.gif')], { stdio: 'inherit' })
rmSync(dir, { recursive: true })
