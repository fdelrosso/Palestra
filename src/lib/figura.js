// ---------------------------------------------------------------------------
// Il "manichino": la geometria che regge le animazioni degli esercizi.
//
// PERCHE' NON DELLE GIF. Le gif/video degli esercizi sono file da centinaia di
// KB l'uno: con 110 esercizi sarebbero decine di MB da scaricare e da tenere
// nella cache di una PWA che deve funzionare offline, piu' il problema delle
// licenze (le animazioni belle che si trovano in giro sono quasi tutte
// protette). Qui invece ogni esercizio e' un pugno di numeri: due pose, e il
// browser interpola. Pesa niente, funziona offline, si tinge del colore del
// gruppo muscolare e resta nitido a qualsiasi dimensione.
//
// COME FUNZIONA. Il corpo e' una catena di segmenti di lunghezza fissa
// (MISURE): bacino -> tronco -> spalla -> braccio -> avambraccio, e
// bacino -> coscia -> tibia -> piede. Una POSA e' l'insieme degli angoli di
// quei segmenti piu' la posizione del bacino. Da due pose (`a` = partenza,
// `b` = arrivo) si generano N fotogrammi interpolando gli ANGOLI: interpolare
// gli angoli e non i punti e' l'unica cosa che tiene le braccia della stessa
// lunghezza per tutto il movimento (interpolando i punti, a meta' corsa un
// avambraccio piegato si accorcerebbe visibilmente).
//
// GLI ANGOLI sono in gradi, convenzione matematica: 0 = verso destra,
// 90 = verso l'alto, -90 = verso il basso, 180 = verso sinistra. La figura di
// profilo guarda sempre a destra. La y dello schermo cresce verso il basso, e
// la conversione la fa `estendi()` una volta per tutte.
//
// LE POSE SI SCRIVONO ANCHE COL PUNTO D'ARRIVO. Per molti esercizi non conta
// l'angolo del braccio ma DOVE sta la mano: alla sbarra delle trazioni, sul
// pavimento nei piegamenti, sul manubrio. Per questo una posa puo' dire
// `mano: [x, y]` invece degli angoli: ci pensa `ik()` (cinematica inversa) a
// trovare gli angoli che ci arrivano, col gomito piegato dal verso giusto.
// ---------------------------------------------------------------------------

const RAD = Math.PI / 180
const GRAD = 180 / Math.PI

/** Misure del manichino, in unita' del viewBox (120 x 112, pavimento a y=100). */
export const MISURE = {
  tronco: 26,
  collo: 5,
  testa: 6.6,
  raggioTesta: 6.4,
  braccio: 15,
  avambraccio: 14,
  coscia: 19,
  tibia: 19,
  piede: 8,
  mezzeSpalle: 9, // solo in vista frontale: mezza larghezza delle spalle
  mezzeAnche: 6, // idem per il bacino
}

export const PAVIMENTO = 100
export const VIEWBOX = '0 0 120 112'

/** Punto a distanza `len` da `p` nella direzione `deg`. */
export function estendi(p, len, deg) {
  const r = deg * RAD
  return [p[0] + len * Math.cos(r), p[1] - len * Math.sin(r)]
}

/** Angolo (gradi) del vettore da `a` a `b`. */
function angolo(a, b) {
  return Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * GRAD
}

function distanza(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/**
 * Cinematica inversa a due segmenti: dati la spalla `base`, la mano `meta` e le
 * lunghezze, restituisce i due angoli. `verso` decide da che parte si piega il
 * gomito (+1 / -1): a occhio, +1 lo manda da una parte, -1 dall'altra.
 * Se la mano e' piu' lontana della somma dei segmenti l'arto si stende e basta.
 */
export function ik(base, meta, l1, l2, verso = 1) {
  const d = distanza(base, meta)
  const dritto = angolo(base, meta)
  if (d >= l1 + l2 - 0.001 || d < 0.001) return [dritto, dritto]
  const ux = (meta[0] - base[0]) / d
  const uy = (meta[1] - base[1]) / d
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const nodo = [base[0] + a * ux - verso * h * uy, base[1] + a * uy + verso * h * ux]
  return [angolo(base, nodo), angolo(nodo, meta)]
}

// Campi angolari di una posa, con i loro valori di riserva.
function risolviArto(posa, lato, base) {
  const suffisso = lato === 2 ? '2' : ''
  const mano = posa['mano' + suffisso]
  if (mano) return ik(base, mano, MISURE.braccio, MISURE.avambraccio, posa['gomito' + suffisso] ?? 1)
  return null
}

function risolviGamba(posa, lato, base) {
  const suffisso = lato === 2 ? '2' : ''
  const caviglia = posa['caviglia' + suffisso]
  if (caviglia) return ik(base, caviglia, MISURE.coscia, MISURE.tibia, posa['ginocchio' + suffisso] ?? -1)
  return null
}

/**
 * Espande una posa "scritta a mano" in un record di soli numeri, pronto per
 * essere interpolato. Risolve le riserve (arto 2 = specchio o copia dell'arto
 * 1) e la cinematica inversa.
 */
export function normalizza(posa) {
  const spec = !!posa.specchio
  const sp = (v) => (spec ? 180 - v : v)
  const bacino = posa.bacino
  const tronco = posa.tronco
  const spalla = estendi(bacino, MISURE.tronco, tronco)
  const dx = spec ? MISURE.mezzeSpalle : 0
  const dxA = spec ? MISURE.mezzeAnche : 0

  const ik1 = risolviArto(posa, 1, [spalla[0] + dx, spalla[1]])
  const braccio = ik1 ? ik1[0] : posa.braccio
  const avambraccio = ik1 ? ik1[1] : posa.avambraccio
  const ik2 = risolviArto(posa, 2, [spalla[0] - dx, spalla[1]])
  const braccio2 = ik2 ? ik2[0] : posa.braccio2 ?? sp(braccio)
  const avambraccio2 = ik2 ? ik2[1] : posa.avambraccio2 ?? sp(avambraccio)

  const ig1 = risolviGamba(posa, 1, [bacino[0] + dxA, bacino[1]])
  const coscia = ig1 ? ig1[0] : posa.coscia
  const tibia = ig1 ? ig1[1] : posa.tibia
  const ig2 = risolviGamba(posa, 2, [bacino[0] - dxA, bacino[1]])
  const coscia2 = ig2 ? ig2[0] : posa.coscia2 ?? sp(coscia)
  const tibia2 = ig2 ? ig2[1] : posa.tibia2 ?? sp(tibia)

  const piede = posa.piede ?? 0
  return {
    bx: bacino[0],
    by: bacino[1],
    tronco,
    collo: posa.collo ?? tronco,
    braccio,
    avambraccio,
    braccio2,
    avambraccio2,
    coscia,
    tibia,
    coscia2,
    tibia2,
    piede,
    piede2: posa.piede2 ?? sp(piede),
    largo: spec ? 1 : 0,
  }
}

/** Da posa normalizzata ai punti del corpo. */
export function punti(o) {
  const bacino = [o.bx, o.by]
  const spalla = estendi(bacino, MISURE.tronco, o.tronco)
  const collo = estendi(spalla, MISURE.collo, o.collo)
  const testa = estendi(collo, MISURE.testa, o.collo)
  const dx = o.largo * MISURE.mezzeSpalle
  const dxA = o.largo * MISURE.mezzeAnche
  const spallaA = [spalla[0] + dx, spalla[1]]
  const spallaB = [spalla[0] - dx, spalla[1]]
  const ancaA = [bacino[0] + dxA, bacino[1]]
  const ancaB = [bacino[0] - dxA, bacino[1]]
  const gomito = estendi(spallaA, MISURE.braccio, o.braccio)
  const polso = estendi(gomito, MISURE.avambraccio, o.avambraccio)
  const gomito2 = estendi(spallaB, MISURE.braccio, o.braccio2)
  const polso2 = estendi(gomito2, MISURE.avambraccio, o.avambraccio2)
  const ginocchio = estendi(ancaA, MISURE.coscia, o.coscia)
  const caviglia = estendi(ginocchio, MISURE.tibia, o.tibia)
  const punta = estendi(caviglia, MISURE.piede, o.piede)
  const ginocchio2 = estendi(ancaB, MISURE.coscia, o.coscia2)
  const caviglia2 = estendi(ginocchio2, MISURE.tibia, o.tibia2)
  const punta2 = estendi(caviglia2, MISURE.piede, o.piede2)
  return {
    bacino,
    spalla,
    spallaA,
    spallaB,
    ancaA,
    ancaB,
    collo,
    testa,
    gomito,
    polso,
    gomito2,
    polso2,
    ginocchio,
    caviglia,
    punta,
    ginocchio2,
    caviglia2,
    punta2,
    // punto di mezzo tra le due mani: ci si appende il bilanciere in vista frontale
    mani: [(polso[0] + polso2[0]) / 2, (polso[1] + polso2[1]) / 2],
  }
}

// Differenza tra due angoli riportata in [-180, 180]: senza questo un
// passaggio da 350 a 10 gradi farebbe girare l'arto dalla parte lunga.
function delta(a, b) {
  let d = (b - a) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

function interpola(a, b, t) {
  const o = {}
  for (const k of Object.keys(a)) {
    if (k === 'bx' || k === 'by' || k === 'largo') o[k] = a[k] + (b[k] - a[k]) * t
    else o[k] = a[k] + delta(a[k], b[k]) * t
  }
  return o
}

/**
 * I fotogrammi del movimento: parte da `a`, arriva a `b`, torna ad `a`.
 * Il primo e l'ultimo fotogramma coincidono, cosi' il ciclo SMIL si richiude
 * senza scatti. L'andamento e' un coseno: rallenta agli estremi come fa un
 * carico vero, invece di sbattere avanti e indietro a velocita' costante.
 */
export function fotogrammi(a, b, n = 13) {
  const na = normalizza(a)
  const nb = normalizza(b)
  const out = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push(punti(interpola(na, nb, (1 - Math.cos(2 * Math.PI * t)) / 2)))
  }
  return out
}

const r1 = (v) => Math.round(v * 10) / 10

/**
 * Riquadro (viewBox) stretto attorno alla figura, su tutti i fotogrammi.
 * Serve alle miniature: nel riquadro intero, pensato per starci anche la
 * panca e il cavo, la figura resta un francobollo illeggibile. `rapporto` e'
 * la forma voluta (larghezza / altezza): si allarga il lato corto attorno al
 * centro, cosi' tutte le miniature restano della stessa forma e le righe della
 * lista si allineano.
 */
export function riquadro(frames, margine = 11, rapporto = 1.1) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const f of frames) {
    for (const k of Object.keys(f)) {
      const p = f[k]
      if (!Array.isArray(p)) continue
      if (p[0] < minX) minX = p[0]
      if (p[0] > maxX) maxX = p[0]
      if (p[1] < minY) minY = p[1]
      if (p[1] > maxY) maxY = p[1]
    }
  }
  minX -= margine
  maxX += margine
  minY -= margine
  maxY += margine
  let l = maxX - minX
  let h = maxY - minY
  if (l / h < rapporto) {
    const nuova = h * rapporto
    minX -= (nuova - l) / 2
    l = nuova
  } else {
    const nuova = l / rapporto
    minY -= (nuova - h) / 2
    h = nuova
  }
  return `${r1(minX)} ${r1(minY)} ${r1(l)} ${r1(h)}`
}

/** Lista `values` per l'attributo `points` di una polyline animata. */
export function serie(frames, nomi) {
  return frames.map((f) => nomi.map((n) => `${r1(f[n][0])},${r1(f[n][1])}`).join(' ')).join(';')
}

/** Lista `values` per un animateTransform di tipo translate su un punto. */
export function serieTrasla(frames, nome, offX = 0, offY = 0) {
  return frames.map((f) => `${r1(f[nome][0] + offX)} ${r1(f[nome][1] + offY)}`).join(';')
}

/** Lista `values` per un singolo numero calcolato su ogni fotogramma. */
export function serieNumero(frames, fn) {
  return frames.map((f) => r1(fn(f))).join(';')
}
