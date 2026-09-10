import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Usa la porta passata via env (PORT) se presente, altrimenti la 5173 di
  // default: così il dev server locale resta sulla 5173 mentre gli strumenti
  // che assegnano una porta la rispettano.
  server: { port: Number(process.env.PORT) || 5173 },

  // ⚠️ `three` in un pezzo suo, con un nome STABILE. Serve al service worker
  // qui sotto, che deve poterlo riconoscere per non precaricarlo: senza un
  // nome fisso il pezzo si chiamerebbe come il primo modulo che ci finisce
  // dentro (`torace3d-…`), e basterebbe che qualcuno rinominasse un file
  // perche' la regola smettesse di corrispondere — in silenzio.
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      // ⚠️ 'prompt' e non 'autoUpdate': con autoUpdate la versione nuova si
      // installa da sola e si vede alla riapertura successiva — senza che
      // nessuno sappia che c'e' stata, e senza poter scegliere QUANDO. Adesso
      // l'app la usano piu' persone e ricaricare al momento sbagliato vuol dire
      // ricaricare in faccia a chi sta allenandosi: si chiede (components/
      // AggiornamentoApp.jsx).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Palestra — Le mie schede',
        short_name: 'Palestra',
        description: 'Le mie schede di allenamento, giorno per giorno.',
        lang: 'it',
        theme_color: '#0d0f14',
        background_color: '#0d0f14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          // File separato: l'icona "maskable" viene ritagliata da Android
          // (cerchio/goccia a seconda del telefono), quindi il manubrio è
          // disegnato più piccolo per restare dentro la zona sicura.
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // ⚠️ `three` NON si precarica. Le viste 3D sono gia' caricate in `lazy`,
        // quindi non pesano sul primo avvio — ma il service worker, se lo si
        // lascia fare, mette in precache tutto quello che trova: ~580KB in piu'
        // scaricati a ogni installazione E a ogni aggiornamento dell'app, anche
        // da chi non aprira' mai un esercizio 3D. Su un telefono sotto rete
        // mobile e' la differenza tra 0,8MB e 1,4MB per un aggiornamento.
        globIgnores: ['**/three-*.js'],
        // Chi invece una vista 3D la apre se la ritrova offline dalla volta
        // dopo: si scarica una volta e resta.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/three-[^/]*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'palestra-3d',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
