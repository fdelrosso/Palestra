import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Usa la porta passata via env (PORT) se presente, altrimenti la 5173 di
  // default: così il dev server locale resta sulla 5173 mentre gli strumenti
  // che assegnano una porta la rispettano.
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
