// ---------------------------------------------------------------------------
// Le misure del corpo 3D "realistico" (lib/umano3d): proporzioni di una persona
// vera alta circa 2 unità (1 unità ≈ 0,9 m), e la forma del busto come funzione,
// così le pose (lib/posePetto3d) sanno dove sta la superficie del petto (il
// bilanciere lo tocca, non lo attraversa) senza dover caricare la mesh.
//
// Coordinate del busto: x il fianco, +y davanti al petto, +z verso la testa,
// origine al centro delle due anche. Solo matematica: niente Three.js qui,
// così i test e il catalogo la usano gratis.
// ---------------------------------------------------------------------------

export const CORPO = {
  OMERO: 0.36,
  // Dal gomito al centro del pugno; il polso sta prima, a POLSO.
  AVAMBRACCIO: 0.36,
  POLSO: 0.285,
  COSCIA: 0.47,
  TIBIA: 0.45,
  // Giunti nel busto (per lato = +1; l'altro lato è lo specchio).
  SPALLA: [0.19, -0.005, 0.63],
  ANCA: [0.095, 0, 0],
  // Centro del cranio.
  TESTA: [0, 0.012, 0.905],
}

// Sezioni del busto dall'inguine al collo: [z, mezza larghezza, profondità
// davanti, profondità dietro]. In mezzo si passa con una spline, così niente
// gradini dove una sezione finisce.
export const SEZIONI = [
  [-0.12, 0.05, 0.04, 0.05],
  [-0.095, 0.118, 0.07, 0.095],
  [-0.04, 0.163, 0.083, 0.116],
  [0.03, 0.174, 0.088, 0.11],
  [0.12, 0.162, 0.09, 0.088],
  [0.22, 0.146, 0.093, 0.083],
  [0.32, 0.156, 0.099, 0.088],
  [0.42, 0.176, 0.108, 0.096],
  [0.5, 0.192, 0.115, 0.102],
  [0.57, 0.197, 0.116, 0.1],
  [0.63, 0.188, 0.1, 0.094],
  [0.675, 0.158, 0.072, 0.084],
  [0.71, 0.1, 0.052, 0.064],
  [0.745, 0.058, 0.046, 0.05],
]
export const Z_BASSO = SEZIONI[0][0]
export const Z_ALTO = SEZIONI.at(-1)[0]
// La cintura dei pantaloncini.
export const Z_CINTURA = 0.115

const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const liscio = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Catmull-Rom sulle sezioni: [larghezza, davanti, dietro] all'altezza z.
export function sezione(z) {
  const n = SEZIONI.length
  let i = 0
  while (i < n - 2 && z > SEZIONI[i + 1][0]) i++
  const p1 = SEZIONI[i], p2 = SEZIONI[i + 1]
  const p0 = SEZIONI[Math.max(0, i - 1)], p3 = SEZIONI[Math.min(n - 1, i + 2)]
  const t = clamp01((z - p1[0]) / (p2[0] - p1[0]))
  const t2 = t * t, t3 = t2 * t
  const out = [0, 0, 0]
  for (let k = 1; k <= 3; k++) {
    out[k - 1] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t
      + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
      + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
  }
  return out
}

// ---- I rilievi dei muscoli sul busto (0..1, poi scalati) ---------------------

// Pettorale: una piastra larga dallo sterno all'ascella e dalla clavicola al
// bordo basso, che sale andando verso l'esterno. È più spesso in basso, dove
// fa la piega netta sulle costole, e sfuma verso la clavicola. `ax` = |x|.
const zClavicola = (ax) => 0.668 - 0.04 * (ax / 0.19)
// Il bordo basso: più basso a metà del muscolo, sale forte verso l'ascella.
const zBordo = (ax) => 0.478 - 0.012 * Math.sin(Math.min(1, ax / 0.13) * Math.PI) + 0.085 * liscio(0.09, 0.19, ax) ** 1.3
export function maschiaPettorale(ax, z) {
  if (ax > 0.21 || z < 0.44 || z > 0.68) return 0
  const basso = zBordo(ax), alto = zClavicola(ax)
  // Il lato esterno si stringe salendo verso l'attacco sull'omero.
  const fuori = 0.2 - 0.03 * liscio(0.6, 0.67, z)
  return liscio(0.005, 0.028, ax)
    * (1 - liscio(fuori - 0.035, fuori, ax))
    * liscio(basso - 0.006, basso + 0.016, z)
    * (1 - liscio(alto - 0.06, alto, z))
}
export function rilievoPettorale(ax, z) {
  const m = maschiaPettorale(ax, z)
  if (!m) return 0
  const basso = zBordo(ax)
  const su = Math.max(0, (z - basso) / (zClavicola(ax) - basso))
  // Il bordo basso si arrotonda come una piega, poi il muscolo si assottiglia
  // verso la clavicola e verso la spalla.
  const piega = Math.sin(Math.min(1, (z - basso + 0.006) / 0.045) * Math.PI / 2)
  return 0.028 * m * piega * (1 - 0.7 * su) * (1 - 0.45 * liscio(0.1, 0.2, ax))
}

// Retto dell'addome: due colonne con i segmenti accennati e la linea alba.
export function maschiaAddome(ax, z) {
  if (z < 0.1 || z > 0.47 || ax > 0.085) return 0
  return liscio(0.1, 0.16, z) * (1 - liscio(0.41, 0.47, z)) * (1 - liscio(0.06, 0.085, ax)) * liscio(0.002, 0.014, ax)
}
export function rilievoAddome(ax, z) {
  const m = maschiaAddome(ax, z)
  if (!m) return 0
  const segmenti = 0.65 + 0.35 * Math.abs(Math.sin((z - 0.13) * Math.PI / 0.095))
  return 0.009 * m * segmenti
}

// Glutei (dietro, sotto la cintura).
export function maschiaGlutei(ax, z) {
  const u = (ax - 0.085) / 0.085, w = (z + 0.005) / 0.1
  const d = u * u + w * w
  if (d >= 1) return 0
  return liscio(0, 0.6, 1 - d) * liscio(0.004, 0.02, ax)
}
export const rilievoGlutei = (ax, z) => 0.026 * maschiaGlutei(ax, z)

// Dorsali: dietro e sui fianchi, dalle ascelle alla vita.
export function maschiaDorsali(ax, z, fronte) {
  if (fronte > 0.35) return 0
  const u = (ax - 0.14) / 0.07, w = (z - 0.47) / 0.15
  const d = u * u + w * w
  return d >= 1 ? 0 : liscio(0, 0.6, 1 - d) * liscio(0.35, -0.2, fronte)
}
// Trapezio: il rombo dietro, dal collo alle scapole.
export function maschiaTrapezio(ax, z, fronte) {
  if (fronte > 0.3) return 0
  const alto = z > 0.64 ? liscio(0.2, 0.05, ax) : liscio(0.1 + (z - 0.4) * 0.4, 0.02, ax)
  return alto * liscio(0.4, 0.5, z) * liscio(0.3, -0.3, fronte)
}

// La superficie DAVANTI del busto (y) a un punto (x, z), muscoli compresi:
// dove appoggiare un bilanciere al petto o un disco tra le mani.
export function superficieDavanti(x, z) {
  const [larghezza, davanti] = sezione(z)
  const s = Math.min(1, Math.abs(x) / larghezza)
  const c = Math.sqrt(Math.max(0, 1 - s ** (2 / 0.85)))
  const ax = Math.abs(x)
  return davanti * Math.pow(c, 0.9) + rilievoPettorale(ax, z) + rilievoAddome(ax, z)
}
