// ---------------------------------------------------------------------------
// Il server dei banchi di prova che montano pagine VERE con lo store finto
// (scratchpad/finto-store-vivo.js), senza login e senza database.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-superserie.html
//
// ⚠️ È un server a parte, non `npm run dev`: l'alias che sostituisce gli
// store deve valere per tutti i moduli della pagina, e nel server vero
// romperebbe l'app.
// ---------------------------------------------------------------------------
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const finto = fileURLToPath(new URL('./finto-store-vivo.js', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  // ⚠️ Una cartella di dipendenze sua: con quella di `npm run dev`, acceso
  // insieme, i due server si pestano i piedi e React arriva a metà.
  cacheDir: 'node_modules/.vite-prova',
  // Si parte dai banchi, non da index.html: l'app vera si porta dietro il
  // service worker (virtual:pwa-register), che qui non c'è.
  optimizeDeps: { entries: ['scratchpad/prova-*.html'] },
  plugins: [react()],
  resolve: {
    alias: [{ find: /^\.\.\/store\/(StoreContext|AccountContext)$/, replacement: finto }],
  },
  server: { port: 5174, strictPort: true },
})
