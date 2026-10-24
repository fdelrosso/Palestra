import { createContext, useContext, useEffect, useState } from 'react'

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
// vanno rifatte anche loro (e quelle dei sottogruppi, rilanciando
// scratchpad/maschere-sottogruppi.py). Tutte le immagini hanno la stessa misura.
//
// I CORPI sono due: l'uomo (public/corpo) e la donna (public/corpo/donna, gli
// stessi nomi di file). Le maschere della donna si ricavano da quelle
// dell'uomo con scratchpad/maschere-donna.py: si rifanno dopo le sue.
// Quale corpo: il proprio dal sesso del profilo (CorpoContext, messo da
// App.jsx); quello di un allenamento di altri dal campo `corpo` che
// l'allenamento si porta dietro (corpoDiAllenamento), perche' il sesso degli
// altri non arriva (supabase/schema.sql, "I DATI FISICI LI VEDONO SOLO IL
// TITOLARE").
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

export const CORPI = ['uomo', 'donna']
const CARTELLA = { uomo: '/corpo', donna: '/corpo/donna' }
const corpoValido = (corpo) => (CORPI.includes(corpo) ? corpo : 'uomo')

/** Il corpo dal sesso dei dati fisici (lib/datiFisici): 'f' e' la donna. */
export const corpoDaSesso = (sesso) => (sesso === 'f' ? 'donna' : 'uomo')

/** Il proprio corpo: lo mette App.jsx dal sesso del profilo. */
export const CorpoContext = createContext('uomo')

/** Il corpo da disegnare: quello dato, se no il proprio. */
export function useCorpo(corpo) {
  const mio = useContext(CorpoContext)
  return corpoValido(corpo || mio)
}

/**
 * Il corpo di un allenamento (una voce di storico o un riepilogo): quello
 * salvato con lui. Quelli di prima non ce l'hanno: se sono miei (nessun
 * `utenteId` o il mio) vale il mio corpo (undefined: lo decide useCorpo), se
 * sono di altri l'uomo, come si sono sempre visti.
 */
export function corpoDiAllenamento(riep, mioId) {
  if (riep?.corpo) return corpoValido(riep.corpo)
  return !riep?.utenteId || riep.utenteId === mioId ? undefined : 'uomo'
}

/**
 * I SOTTOGRUPPI (lib/muscoli) che hanno una maschera in ogni vista: pezzi delle
 * maschere dei loro gruppi, ricavati con scratchpad/maschere-sottogruppi.py.
 */
export const SOTTOGRUPPI_VISTA = {
  fronte: ['trapezio', 'deltoideAnteriore', 'deltoideLaterale', 'quadricipiti', 'adduttori'],
  dietro: ['trapezio', 'romboidi', 'dorsali', 'lombari', 'deltoidePosteriore', 'deltoideLaterale', 'femorali', 'adduttori', 'quadricipiti'],
}

/** Tutte le zone con una maschera in una vista: prima i gruppi, poi i sottogruppi. */
export const ZONE_VISTA = {
  fronte: [...GRUPPI_VISTA.fronte, ...SOTTOGRUPPI_VISTA.fronte],
  dietro: [...GRUPPI_VISTA.dietro, ...SOTTOGRUPPI_VISTA.dietro],
}

/**
 * Le ZONE da accendere, { id: quota 0..1 }, dai gruppi allenati (lib/recap
 * gruppiAllenati). La quota è sul gruppo più lavorato, come sempre. Un gruppo
 * coi `sotto` si accende per sottogruppi (i femorali di un leg curl, non tutta
 * la gamba), e intero solo per le serie di esercizi che non dicono quali
 * (`intere`). Prima i gruppi interi e poi i sottogruppi: chi disegna li mette
 * uno sopra l'altro in quest'ordine.
 * @param {{id:string, serie:number, sotto?:Object<string,number>, intere?:number}[]} gruppi
 */
export function quoteZone(gruppi = []) {
  const max = Math.max(0, ...gruppi.map((g) => g.serie || 0))
  // Con serie tutte a zero (allenamento segnato ma non svolto) si accende
  // tutto pieno: il gruppo è stato comunque toccato.
  const quota = (n) => (max > 0 ? (n || 0) / max : 1)
  const quote = {}
  for (const g of gruppi) {
    if (!g.sotto) quote[g.id] = quota(g.serie)
    else if (g.intere > 0) quote[g.id] = quota(g.intere)
  }
  for (const g of gruppi) {
    for (const [id, n] of Object.entries(g.sotto || {})) quote[id] = Math.max(quote[id] ?? 0, quota(n))
  }
  return quote
}

/** Dove sta il cuore del cardio, in frazioni della figura (mezzo petto). */
export const CUORE_IMG = { x: 0.5, y: 0.245, lato: 0.2 }

export const urlFigura = (vista, corpo) => `${CARTELLA[corpoValido(corpo)]}/${FILE[vista]}.png`
export const urlMaschera = (vista, id, corpo) => `${CARTELLA[corpoValido(corpo)]}/${FILE[vista]}-${id}.png`
export const haMaschera = (vista, id) => ZONE_VISTA[vista]?.includes(id) ?? false

// --- Le immagini caricate, per il canvas e per il tocco ----------------------
const IMMAGINI = new Map()
const PRONTE = new Map()

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

/** Carica tutte le immagini di un corpo una volta sola; la promessa vale per tutti. */
export function caricaCorpo(corpo) {
  const c = corpoValido(corpo)
  if (!PRONTE.has(c)) {
    const urls = Object.entries(ZONE_VISTA).flatMap(([v, ids]) => [
      urlFigura(v, c),
      ...ids.map((id) => urlMaschera(v, id, c)),
    ])
    PRONTE.set(c, Promise.all(urls.map(carica)).then((imgs) => imgs.every(Boolean)))
  }
  return PRONTE.get(c)
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
export function useCorpoPronto(corpo) {
  const pronto = () => ZONE_VISTA.fronte.every((id) => immagine(urlMaschera('fronte', id, corpo)))
  const [ok, setOk] = useState(pronto)
  // Cambiando corpo si riparte: "pronto" era dell'altro.
  const [di, setDi] = useState(corpo)
  if (di !== corpo) {
    setDi(corpo)
    setOk(pronto())
  }
  useEffect(() => {
    let vivo = true
    caricaCorpo(corpo).then(() => vivo && setOk(true))
    return () => {
      vivo = false
    }
  }, [corpo])
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
export function gruppoNelPunto(vista, fx, fy, ids, corpo) {
  const x0 = Math.round(fx * LARGHEZZA_IMG)
  const y0 = Math.round(fy * ALTEZZA_IMG)
  for (const r of [0, 6, 14, 24]) {
    for (const id of ids) {
      const px = pixelDi(urlMaschera(vista, id, corpo))
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
export function disegnaFigura(ctx, vista, x, y, h, colori, corpo) {
  const figura = immagine(urlFigura(vista, corpo))
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
    const m = haMaschera(vista, id) && immagine(urlMaschera(vista, id, corpo))
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
