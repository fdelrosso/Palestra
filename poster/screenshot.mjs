// Screenshot di un banco di prova per il poster (serve il server dei banchi:
// npx vite --config scratchpad/vite.prova.config.js).
//   [TEMA=chiaro] node poster/screenshot.mjs <percorso?query> <file.png> [testo da toccare | wait:ms | sel:<css> | via:<css da togliere> | js:<codice>] ...
import { createRequire } from 'node:module'
const require = createRequire('/home/matte/.local/lib/node_modules/rea-agents/package.json')
const { chromium } = require('playwright-core')

const [url, file, ...clic] = process.argv.slice(2)
const tema = process.env.TEMA === 'chiaro' ? 'chiaro' : 'scuro'
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
})
const pagina = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: tema === 'chiaro' ? 'light' : 'dark' })
pagina.on('pageerror', (e) => console.error(e.message))
// Sempre lo stesso giorno (lunedì 2 novembre 2026, mattina): i dati del banco si
// contano da "oggi", e con un altro giorno la settimana e il saluto cambiano.
await pagina.clock.setFixedTime(new Date('2026-11-02T09:30:00'))
await pagina.goto(`http://localhost:5174/scratchpad/${url}`)
await pagina.waitForTimeout(1500)
for (const t of clic) {
  if (t.startsWith('wait:')) await pagina.waitForTimeout(Number(t.slice(5)))
  else if (t.startsWith('js:')) await pagina.evaluate(t.slice(3))
  else if (t.startsWith('via:')) await pagina.evaluate((q) => document.querySelector(q)?.remove(), t.slice(4))
  else if (t.startsWith('sel:')) await pagina.locator(t.slice(4)).first().click()
  else await pagina.getByText(t, { exact: false }).first().click()
  await pagina.waitForTimeout(600)
}
await pagina.evaluate((t) => { document.documentElement.dataset.tema = t }, tema)
await pagina.waitForTimeout(300)
await pagina.screenshot({ path: file })
await browser.close()
