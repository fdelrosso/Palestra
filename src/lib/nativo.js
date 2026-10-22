// ---------------------------------------------------------------------------
// Nell'app Android (Capacitor), quello che il sito si aspetta dal browser e il
// WebView non ha. Si mette una volta all'avvio (main.jsx), e il resto del
// codice non sa niente dell'app:
//
//   · il tasto indietro del telefono = indietro nella cronologia (di suo
//     chiuderebbe l'app), cosi' valgono anche le guardie di lib/router;
//   · navigator.share / canShare → il foglio di condivisione di Android (il
//     WebView non li ha, e il recap mostrava "Scarica" al posto di
//     "Condividi");
//   · i link <a download> con un blob → "Salva con nome" di Android (il
//     WebView li ignora: Excel, PDF, immagini non uscivano).
//
// ⚠️ Il plugin `Sistema` (android/…/SistemaPlugin.java) arriva con l'APK: un
// APK piu' vecchio non lo ha, e allora resta tutto come nel browser.
// ---------------------------------------------------------------------------

import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'

const Sistema = registerPlugin('Sistema')

// ponytail: i file passano al nativo in base64, ~1/3 in piu' e tutto in
// memoria; per i video lunghi, scriverli a pezzi con @capacitor/filesystem.
function base64(blob) {
  return new Promise((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1] || '')
    r.onerror = () => ko(r.error)
    r.readAsDataURL(blob)
  })
}

/** Si e' nell'app e c'e' il plugin: i permessi si cambiano dalla sua pagina. */
export const puoAprireImpostazioni = () => Capacitor.isPluginAvailable('Sistema')

export function apriImpostazioni() {
  return Sistema.apriImpostazioni().catch(() => {})
}

export function installaNativo() {
  if (!Capacitor.isNativePlatform()) return

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.exitApp()
  })

  // Il WebView di Android, a un <video> senza `poster` che non ha ancora un
  // fotogramma (la fotocamera che si accende, un video che arriva), disegna il
  // suo segnaposto: grigio con un tasto play nero. Un poster trasparente lo
  // spegne, e sotto si vede lo sfondo dell'elemento. Qui e non in ogni
  // componente: vale anche per i <video> che verranno. L'osservatore gira
  // prima del disegno, quindi il grigio non lampeggia nemmeno.
  // ⚠️ Solo MENTRE CARICA: un poster resta davanti finché il video non parte,
  // e i video fermi coi controlli (chat, check, allegati) mostrerebbero il
  // vuoto invece del primo fotogramma. Arrivato quello, il nostro si toglie;
  // se il video ricomincia a caricare (`emptied`), torna.
  // ponytail: la cura alla radice e' getDefaultVideoPoster() nel nativo
  // (MainActivity), da fare col prossimo APK; allora questo si toglie.
  const POSTER_VUOTO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const metti = (v) => !v.hasAttribute('poster') && v.setAttribute('poster', POSTER_VUOTO)
  const senzaPoster = (n) => {
    if (n.nodeType !== 1) return
    const video = n.tagName === 'VIDEO' ? [n] : n.querySelectorAll('video')
    for (const v of video) {
      if (v._posterVuoto) continue
      v._posterVuoto = true
      metti(v)
      v.addEventListener('loadeddata', () => v.getAttribute('poster') === POSTER_VUOTO && v.removeAttribute('poster'))
      v.addEventListener('emptied', () => metti(v))
    }
  }
  new MutationObserver((cambi) => {
    for (const c of cambi) c.addedNodes.forEach(senzaPoster)
  }).observe(document.documentElement, { childList: true, subtree: true })

  if (!Capacitor.isPluginAvailable('Sistema')) return

  navigator.canShare = () => true
  navigator.share = async ({ files, title, text, url } = {}) => {
    const f = files?.[0]
    await Sistema.condividi({
      titolo: title || '',
      testo: [text, url].filter(Boolean).join('\n') || undefined,
      file: f ? { dati: await base64(f), nome: f.name, tipo: f.type || 'application/octet-stream' } : undefined,
    })
  }

  // In cattura, prima del WebView. ⚠️ Il blob si legge SUBITO: chi crea il
  // link lo revoca dopo un secondo.
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target?.closest?.('a[download]')
      if (!a || !a.href.startsWith('blob:')) return
      e.preventDefault()
      fetch(a.href)
        .then((r) => r.blob())
        .then(async (b) => Sistema.salva({ dati: await base64(b), nome: a.download || 'file', tipo: b.type || 'application/octet-stream' }))
        .catch(() => {})
    },
    true,
  )
}
