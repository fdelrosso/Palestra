// Screenshot del banco del cardio (scratchpad/prova-cardio): serve il server
// dei banchi acceso (npx vite --config scratchpad/vite.prova.config.js).
//   node scratchpad/foto-cardio.mjs <p> <file.png> [clic1] [clic2] ...
// Ogni clic è un testo da toccare (il primo elemento che lo contiene), in ordine.
import { createRequire } from 'node:module'
const require = createRequire('/home/matte/.local/lib/node_modules/rea-agents/package.json')
const { chromium } = require('playwright-core')

const [p, file, ...clic] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
})
const pagina = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errori = []
pagina.on('pageerror', (e) => errori.push(e.message))
pagina.on('console', (m) => m.type() === 'error' && errori.push(m.text()))
await pagina.goto(`http://localhost:${process.env.PORTA || 5174}/scratchpad/prova-cardio.html?p=${p}`)
await pagina.waitForTimeout(1500)
for (const t of clic) {
  if (t.startsWith('scroll:')) await pagina.mouse.wheel(0, Number(t.slice(7)))
  else if (t.startsWith('wait:')) await pagina.waitForTimeout(Number(t.slice(5)))
  else if (t.startsWith('fill:')) {
    const k = t.lastIndexOf('=')
    const sel = t.slice(5, k)
    const val = t.slice(k + 1)
    await pagina.locator(sel).first().fill(val)
    await pagina.locator(sel).first().blur()
  } else if (t.startsWith('sel:')) await pagina.locator(t.slice(4)).first().click()
  else await pagina.getByText(t, { exact: false }).first().click()
  await pagina.waitForTimeout(500)
}
await pagina.screenshot({ path: file, fullPage: true })
if (errori.length) console.log('ERRORI:\n' + errori.join('\n'))
await browser.close()
