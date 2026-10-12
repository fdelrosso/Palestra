import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Il corpo fatto di IMMAGINI (public/corpo), al posto delle forme SVG di
// lib/corpoForme: lo usano tutti i modellini (components/CorpoAllenato,
// components/CorpoMuscoli) e la card del recap su canvas (lib/recapImmagine).
//
// Per ogni vista c'e' la figura grigia (`fronte.png`, `retro.png`) e, per ogni
// gruppo che da li' si vede, una maschera della stessa misura
// (`fronte-petto.png`): bianca dove c'e' il muscolo, trasparente altrove, coi
// solchi fra un muscolo e l'altro lasciati vuoti. Il colore non sta nelle
// immagini: lo mette chi disegna (CSS `--g` o il canvas), lo stesso dei pallini.
//
// ⚠️ Le maschere sono ricavate dalle due figure con uno script (le zone scure
// fra le linee chiare, assegnate a mano ai gruppi): se si cambiano le figure
// vanno rifatte anche loro. Tutte e 15 le immagini hanno la stessa misura.
// ---------------------------------------------------------------------------

export const LARGHEZZA_IMG = 466
export const ALTEZZA_IMG = 1200
export const PROPORZIONE = LARGHEZZA_IMG / ALTEZZA_IMG

/** I gruppi che hanno una maschera in ogni vista. */
export const GRUPPI_VISTA = {
  fronte: ['petto', 'spalle', 'bicipiti', 'addome', 'schiena', 'gambe', 'polpacci'],
  dietro: ['schiena', 'spalle', 'tricipiti', 'glutei', 'gambe', 'polpacci'],
}
const FILE = { fronte: 'fronte', dietro: 'retro' }

/** Dove sta il cuore del cardio, in frazioni della figura (mezzo petto). */
export const CUORE_IMG = { x: 0.5, y: 0.245, lato: 0.2 }

export const urlFigura = (vista) => `/corpo/${FILE[vista]}.png`
export const urlMaschera = (vista, id) => `/corpo/${FILE[vista]}-${id}.png`
export const haMaschera = (vista, id) => GRUPPI_VISTA[vista]?.includes(id) ?? false

// --- Le immagini caricate, per il canvas e per il tocco ----------------------
const IMMAGINI = new Map()
let pronte = null

function carica(url) {
  if (!IMMAGINI.has(url)) {
    const img = new Image()
    img.decoding = 'async'
    const p = new Promise((ok) => {
      img.onload = () => ok(img)
      img.onerror = () => ok(null)
    })
    img.src = url
    IMMAGINI.set(url, { img, p })
  }
  return IMMAGINI.get(url).p
}

/** Carica tutte le immagini una volta sola; la promessa vale per tutti. */
export function caricaCorpo() {
  if (!pronte) {
    const urls = Object.entries(GRUPPI_VISTA).flatMap(([v, ids]) => [urlFigura(v), ...ids.map((id) => urlMaschera(v, id))])
    pronte = Promise.all(urls.map(carica)).then((imgs) => imgs.every(Boolean))
  }
  return pronte
}

/** Un'immagine gia' caricata (o null se non ancora). */
export function immagine(url) {
  const x = IMMAGINI.get(url)
  return x?.img.complete && x.img.naturalWidth ? x.img : null
}

/**
 * true quando le immagini del corpo sono pronte: per chi disegna su canvas,
 * che e' sincrono e deve ridisegnare quando arrivano (lib/recapImmagine).
 */
export function useCorpoPronto() {
  const [ok, setOk] = useState(() => GRUPPI_VISTA.fronte.every((id) => immagine(urlMaschera('fronte', id))))
  useEffect(() => {
    let vivo = true
    caricaCorpo().then(() => vivo && setOk(true))
    return () => {
      vivo = false
    }
  }, [])
  return ok
}

// --- Quale muscolo e' stato toccato ----------------------------------------
// Le maschere sono immagini intere sovrapposte: il tocco non sa da solo quale
// muscolo c'e' sotto il dito. Si guarda il pixel nelle maschere (con un po' di
// margine: col dito un polpaccio si prende male).
const PIXEL = new Map()
function pixelDi(url) {
  if (!PIXEL.has(url)) {
    const img = immagine(url)
    if (!img) return null
    const c = document.createElement('canvas')
    c.width = LARGHEZZA_IMG
    c.height = ALTEZZA_IMG
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    PIXEL.set(url, ctx.getImageData(0, 0, LARGHEZZA_IMG, ALTEZZA_IMG).data)
  }
  return PIXEL.get(url)
}

/**
 * Il gruppo (fra `ids`) sotto il punto (fx, fy), in frazioni della figura;
 * null se non c'e' nessuno. Prima il pixel esatto, poi i dintorni.
 */
export function gruppoNelPunto(vista, fx, fy, ids) {
  const x0 = Math.round(fx * LARGHEZZA_IMG)
  const y0 = Math.round(fy * ALTEZZA_IMG)
  for (const r of [0, 6, 14, 24]) {
    for (const id of ids) {
      const px = pixelDi(urlMaschera(vista, id))
      if (!px) continue
      for (let dy = -r; dy <= r; dy += r || 1) {
        for (let dx = -r; dx <= r; dx += r || 1) {
          const x = x0 + dx
          const y = y0 + dy
          if (x < 0 || y < 0 || x >= LARGHEZZA_IMG || y >= ALTEZZA_IMG) continue
          if (px[(y * LARGHEZZA_IMG + x) * 4 + 3] > 0) return id
        }
      }
    }
  }
  return null
}

// --- Su canvas ---------------------------------------------------------------
const TELA = typeof document !== 'undefined' ? document.createElement('canvas') : null

/**
 * Disegna una vista su un canvas: la figura (schiarita, il fondo della card e'
 * scuro) e i gruppi di `colori` ({id: colore css}). Senza immagini pronte non
 * disegna niente e restituisce false.
 */
export function disegnaFigura(ctx, vista, x, y, h, colori) {
  const figura = immagine(urlFigura(vista))
  if (!figura || !TELA) return false
  const w = h * PROPORZIONE
  // ⚠️ Schiarita con 'lighter' (un quarto di figura sommato alla figura) e non
  // con ctx.filter: Safari il filtro del canvas non lo conosce.
  TELA.width = LARGHEZZA_IMG
  TELA.height = ALTEZZA_IMG
  const t = TELA.getContext('2d')
  t.drawImage(figura, 0, 0)
  t.globalCompositeOperation = 'lighter'
  t.globalAlpha = 0.25
  t.drawImage(figura, 0, 0)
  t.globalAlpha = 1
  t.globalCompositeOperation = 'source-over'
  ctx.drawImage(TELA, x, y, w, h)

  for (const [id, colore] of Object.entries(colori)) {
    const m = haMaschera(vista, id) && immagine(urlMaschera(vista, id))
    if (!m) continue
    t.clearRect(0, 0, LARGHEZZA_IMG, ALTEZZA_IMG)
    t.drawImage(m, 0, 0)
    t.globalCompositeOperation = 'source-in'
    t.fillStyle = colore
    t.fillRect(0, 0, LARGHEZZA_IMG, ALTEZZA_IMG)
    t.globalCompositeOperation = 'source-over'
    ctx.drawImage(TELA, x, y, w, h)
  }
  return true
}
