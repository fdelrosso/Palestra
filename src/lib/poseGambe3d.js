import {
  ALTEZZA_CAVIGLIA, LATI, braccio, busto, daAnche, gamba, gambaLibera, gradi, lerp, lerpV, onda,
  piede, piedeATerra, piedeInPunta, spallaLocale, ancaLocale, tappa, v,
} from './corpo3d.js'

// Come si muove il corpo negli esercizi per le gambe. Ogni posa dice dove stanno
// bacino, busto, spalle, mani, anche, ginocchia e piedi a una certa `fase` (0..1)
// della ripetizione; la scena ci appoggia sopra il modello e gli attrezzi.
//
// I vincoli sono quelli veri dell'esercizio, non una sagoma che oscilla:
// i piedi a terra non scivolano, le ginocchia si trovano da sole tra anca e
// caviglia, il bilanciere dello squat resta sopra il centro del piede, e sulle
// macchine è la leva a girare attorno al ginocchio.

// Mani a braccia distese sotto le spalle (manubri lungo i fianchi, bilanciere
// davanti alle cosce): a `z` dato, l'altezza è quella del braccio quasi teso.
function manoPendente(spalla, x, z, lunghezza = 0.745) {
  const dx = x - spalla.x, dz = z - spalla.z
  return v(x, spalla.y - Math.sqrt(lunghezza ** 2 - dx ** 2 - dz ** 2), z)
}

function spalle(locale, su = 0) {
  return LATI.map((lato) => locale(...spallaLocale(lato, su)))
}
function anche(locale) {
  return LATI.map((lato) => locale(...ancaLocale(lato)))
}

// ---- Squat (bilanciere dietro, davanti, goblet) -------------------------------
const SQUAT = {
  // centro anche in alto e in basso, busto (gradi) in alto e in basso
  dietro: { su: v(0, 1.02, -0.05), giu: v(0, 0.53, 0.2), busto: [94, 116] },
  // Il carico davanti al petto sposta le anche indietro, non il busto in avanti.
  davanti: { su: v(0, 1.02, 0.1), giu: v(0, 0.49, 0.24), busto: [88, 97] },
  goblet: { su: v(0, 1.02, 0.05), giu: v(0, 0.47, 0.22), busto: [90, 102] },
}
function squat(e, t) {
  const c = SQUAT[e.carico]
  const { bacino, rotazione, locale, direzione } = daAnche(lerpV(c.su, c.giu, t), lerp(c.busto[0], c.busto[1], t))
  // Punte leggermente aperte, ginocchia che seguono le punte.
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    return gamba(anca, piedeATerra(lato * 0.21, 0, 0, 12), v(lato * 0.3, 0, -1))
  })
  let carico, braccia
  const s = spalle(locale)
  if (e.carico === 'dietro') {
    carico = locale(0, -0.105, 0.8)
    braccia = s.map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.5, -0.105, 0.8), direzione(LATI[i] * 0.2, -0.6, -1)))
  } else if (e.carico === 'davanti') {
    // Presa "clean": gomiti alti e avanti, il bilanciere poggia sui deltoidi.
    carico = locale(0, 0.2, 0.8)
    braccia = s.map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.23, 0.2, 0.81), direzione(LATI[i] * 0.2, 1, -0.15)))
  } else {
    // Manubrio in verticale contro lo sterno, mani a coppa sotto il disco alto.
    carico = locale(0, 0.31, 0.5)
    braccia = s.map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.065, 0.31, 0.6), direzione(LATI[i] * 0.4, 0.2, -1)))
  }
  return { bacino, rotazione, braccia, gambe, carico, asseCarico: e.carico === 'goblet' ? direzione(0, 0, 1) : v(1, 0, 0) }
}

// ---- Hack squat: la slitta scende lungo il binario, parallela allo schienale ----
const HACK = { angolo: 48, anche: v(0, 1.2, 0.3), corsa: 0.5, pedana: 12 }
function hack(e, t) {
  const rot = busto(HACK.angolo)
  const binario = v(0, 0, 1).applyQuaternion(rot)
  const centro = HACK.anche.clone().addScaledVector(binario, -HACK.corsa * t)
  const { bacino, rotazione, locale, direzione } = daAnche(centro, HACK.angolo)
  // Pedana inclinata: punte più alte dei talloni.
  const p = gradi(20)
  const avanti = v(0, Math.sin(p), -Math.cos(p)), su = v(0, Math.cos(p), Math.sin(p))
  const caviglia = HACK.anche.clone().add(v(0, -0.9 * Math.cos(gradi(HACK.pedana)), -0.9 * Math.sin(gradi(HACK.pedana))))
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    return gamba(anca, piede(caviglia.clone().setX(lato * 0.2), avanti, su), v(lato * 0.25, 0.3, -1))
  })
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.36, 0.12, 0.84), direzione(LATI[i] * 0.4, -0.2, -1)))
  return { bacino, rotazione, braccia, gambe, slitta: centro.clone().sub(HACK.anche), binario }
}

// ---- Leg press orizzontale: seduti, la pedana scorre in avanti -----------------
const LEG_PRESS = { angolo: 58, anche: v(0, 0.62, 0.2), piedi: 0.8, pedana: [-0.79, -0.43] }
function legPress(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(LEG_PRESS.anche, LEG_PRESS.angolo)
  const zPedana = lerp(LEG_PRESS.pedana[0], LEG_PRESS.pedana[1], t)
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    // Suola contro la pedana verticale, punte in su.
    const appoggio = piede(v(lato * 0.2, LEG_PRESS.piedi, zPedana + ALTEZZA_CAVIGLIA), v(0, 1, 0), v(0, 0, 1))
    return gamba(anca, appoggio, v(lato * 0.3, 1, 0))
  })
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.36, 0.02, 0.12), direzione(LATI[i], -0.3, 0.2)))
  return { bacino, rotazione, braccia, gambe, pedana: zPedana }
}

// ---- Pressa 45°: sdraiati, la slitta sale lungo il binario a 45° ---------------
const PRESSA = { angolo: 28, anche: v(0, 0.5, 0.35), corsa: 0.4 }
const PRESSA_SU = v(0, Math.SQRT1_2, -Math.SQRT1_2) // verso in cui sale la slitta
const PRESSA_NORMALE = v(0, -Math.SQRT1_2, Math.SQRT1_2) // la pedana guarda chi spinge
const PRESSA_CAVIGLIA = PRESSA.anche.clone().addScaledVector(PRESSA_SU, 0.9)
function pressa(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(PRESSA.anche, PRESSA.angolo)
  const corsa = -PRESSA.corsa * t
  const verso = v(0, Math.SQRT1_2, Math.SQRT1_2) // punte verso il bordo alto della pedana
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    const caviglia = PRESSA_CAVIGLIA.clone().addScaledVector(PRESSA_SU, corsa).setX(lato * 0.2)
    return gamba(anca, piede(caviglia, verso, PRESSA_NORMALE), v(lato * 0.35, 1, 0.2))
  })
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.36, 0.02, 0.12), direzione(LATI[i], 0.3, 0.2)))
  return { bacino, rotazione, braccia, gambe, slitta: corsa }
}

// ---- Affondi: passo lungo, si scende in verticale ------------------------------
function affondi(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(v(0, lerp(0.9, 0.55, t), -0.02), 92)
  const [sx, dx] = anche(locale)
  const gambe = [
    // Dietro: sulla punta, il tallone si alza mentre il ginocchio scende.
    gamba(sx, piedeInPunta(v(-0.19, 0, 0.36), lerp(38, 56, t)), v(0, -0.5, -1)),
    gamba(dx, piedeATerra(0.19, -0.42), v(0.2, 0, -1)),
  ]
  const braccia = spalle(locale).map((spalla, i) => {
    const lato = LATI[i]
    return braccio(spalla, manoPendente(spalla, lato * 0.3, spalla.z + 0.02), direzione(lato * 0.3, -1, 0))
  })
  return { bacino, rotazione, braccia, gambe, manubri: true }
}

// ---- Affondi bulgari: piede dietro sulla panca --------------------------------
const BULGARI = { panca: 0.5 }
function bulgari(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(v(0, lerp(0.92, 0.57, t), 0), lerp(94, 99, t))
  const [sx, dx] = anche(locale)
  // Collo del piede sulla panca, dita all'indietro: la suola guarda in su.
  const dietro = piede(v(-0.17, BULGARI.panca, 0.62), v(0, 0, 1), v(0, -1, 0))
  const gambe = [
    gamba(sx, dietro, v(0, -1, -0.3)),
    gamba(dx, piedeATerra(0.18, -0.38), v(0.15, 0, -1)),
  ]
  const braccia = spalle(locale).map((spalla, i) => {
    const lato = LATI[i]
    return braccio(spalla, manoPendente(spalla, lato * 0.3, spalla.z + 0.02), direzione(lato * 0.3, -1, 0))
  })
  return { bacino, rotazione, braccia, gambe, manubri: true }
}

// ---- Macchine con la leva sul ginocchio: si muove solo la tibia ----------------
// Direzione della tibia per un ginocchio piegato di `k` gradi con la coscia
// distesa in avanti (seduti): 0 = gamba tesa in avanti, 90 = tibia in verticale.
const tibiaSeduti = (k) => v(0, -Math.sin(gradi(k)), -Math.cos(gradi(k)))
const puntaSeduti = (k) => v(0, Math.cos(gradi(k)), -Math.sin(gradi(k)))
const SEDUTI = { anche: v(0, 0.62, 0.1), curl: v(0, 0.68, 0.1) }

function legExtension(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(SEDUTI.anche, 82)
  const k = lerp(92, 2, t)
  const gambe = anche(locale).map((anca) => gambaLibera(anca, v(0, 0, -1), tibiaSeduti(k), puntaSeduti(k)))
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.34, 0.12, 0.02), direzione(LATI[i], -0.4, 0.4)))
  return { bacino, rotazione, braccia, gambe, leva: k }
}

function legCurlSeduto(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(SEDUTI.curl, 80)
  const k = lerp(8, 100, t)
  const gambe = anche(locale).map((anca) => gambaLibera(anca, v(0, 0, -1), tibiaSeduti(k), puntaSeduti(k), 15))
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.34, 0.22, 0.12), direzione(LATI[i], -0.4, 0.4)))
  return { bacino, rotazione, braccia, gambe, leva: k }
}

// A pancia in giù: la coscia resta sulla panca, il tallone va verso il sedere.
const SDRAIATO = { anche: v(0, 0.88, 0.22), panca: 0.72 }
function legCurlSdraiato(e, t) {
  const { bacino, rotazione, locale, direzione } = daAnche(SDRAIATO.anche, 180)
  const k = gradi(lerp(4, 118, t))
  const tibia = v(0, Math.sin(k), Math.cos(k))
  const punta = v(0, -Math.cos(k), Math.sin(k))
  const gambe = anche(locale).map((anca) => gambaLibera(anca, v(0, 0, 1), tibia, punta, 20))
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, v(LATI[i] * 0.3, 0.62, -0.84), direzione(LATI[i] * 0.3, 0, 1)))
  return { bacino, rotazione, braccia, gambe, leva: lerp(4, 118, t) }
}

// ---- Stacchi -------------------------------------------------------------------
// Il bilanciere sale in verticale sopra il centro del piede; le braccia restano
// distese e l'altezza del bilanciere viene da loro, non da una curva disegnata.
function stacco(e, t, c) {
  const { bacino, rotazione, locale, direzione } = daAnche(lerpV(c.giu, c.su, t), lerp(c.busto[1], c.busto[0], t))
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    return gamba(anca, piedeATerra(lato * c.piedi, 0, 0, c.aperto), v(lato * c.fuori, 0, -1))
  })
  const zBilanciere = lerp(c.barra[1], c.barra[0], t)
  const braccia = spalle(locale).map((spalla, i) => {
    const lato = LATI[i]
    return braccio(spalla, manoPendente(spalla, lato * c.presa, zBilanciere), direzione(lato * 0.4, -1, 0))
  })
  const carico = braccia[0].mano.clone().add(braccia[1].mano).multiplyScalar(0.5)
  return { bacino, rotazione, braccia, gambe, carico, asseCarico: v(1, 0, 0) }
}
// su = in piedi, giu = in fondo; busto [in piedi, in fondo]; barra z [in piedi, in fondo]
const GAMBE_TESE = { su: v(0, 1.02, -0.02), giu: v(0, 0.95, 0.3), busto: [90, 152], piedi: 0.17, aperto: 5, fuori: 0.1, presa: 0.26, barra: [-0.15, -0.12] }
// Nel sumo gli stinchi stanno dietro al bilanciere e lo sfiorano: la barra parte
// davanti a loro, non sopra le caviglie.
const SUMO = { su: v(0, 0.985, 0.08), giu: v(0, 0.54, 0.38), busto: [90, 140], piedi: 0.36, aperto: 35, fuori: 0.7, presa: 0.17, barra: [-0.11, -0.1] }

// ---- Polpacci ------------------------------------------------------------------
// In piedi sul bordo del rialzo: il tallone scende sotto il piano e risale in punta.
const CALF = { rialzo: 0.15 }
function calfPiedi(e, t) {
  const alzata = lerp(-18, 32, t)
  const appoggi = LATI.map((lato) => piedeInPunta(v(lato * 0.17, CALF.rialzo, -0.02), alzata))
  // Il corpo resta dritto sopra le caviglie e sale con loro.
  const caviglia = appoggi[0].caviglia
  const { bacino, rotazione, locale, direzione } = daAnche(v(0, caviglia.y + 0.92, caviglia.z - 0.01), 90)
  const gambe = anche(locale).map((anca, i) => gamba(anca, appoggi[i], v(LATI[i] * 0.2, 0, -1)))
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.33, 0.08, 0.9), direzione(LATI[i], 0, -1)))
  return { bacino, rotazione, braccia, gambe, sollevamento: caviglia.y }
}

// Seduti, ginocchia a 90°: il cuscinetto sulle ginocchia sale con i talloni.
function calfSeduto(e, t) {
  const alzata = lerp(-14, 30, t)
  const { bacino, rotazione, locale, direzione } = daAnche(v(0, 0.62, 0.15), 92)
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    return gamba(anca, piedeInPunta(v(lato * 0.17, 0.08, -0.46), alzata), v(0, 1, -0.3))
  })
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, gambe[i].ginocchio.clone().add(v(LATI[i] * 0.02, 0.17, 0.1)), direzione(LATI[i], -0.3, -0.2)))
  return { bacino, rotazione, braccia, gambe }
}

// ---- Adduttori e abduttori: seduti, le cosce si aprono e si chiudono -----------
function aperture(e, t) {
  const [chiuse, aperte] = [6, 38]
  const a = gradi(e.tipo === 'adduttori' ? lerp(aperte, chiuse, t) : lerp(chiuse, aperte, t))
  const { bacino, rotazione, locale, direzione } = daAnche(v(0, 0.62, 0.12), 80)
  const gambe = anche(locale).map((anca, i) => {
    const lato = LATI[i]
    const coscia = v(lato * Math.sin(a), 0, -Math.cos(a))
    return gambaLibera(anca, coscia, v(0, -1, 0), coscia)
  })
  const braccia = spalle(locale).map((spalla, i) => braccio(spalla, locale(LATI[i] * 0.34, 0.16, 0.06), direzione(LATI[i], -0.4, 0.4)))
  return { bacino, rotazione, braccia, gambe, apertura: a }
}

// ---- Step up: si sale sul rialzo spingendo con la gamba davanti ----------------
const STEP = { rialzo: 0.42, z: -0.45 }
function stepUp(e, t) {
  const salita = tappa(t, 0, 1)
  const centro = lerpV(v(0, 0.92, -0.04), v(0, 1.44, -0.4), salita)
  const { bacino, rotazione, locale, direzione } = daAnche(centro, lerp(104, 91, salita))
  const [sx, dx] = anche(locale)
  // Il piede dietro resta a terra finché la gamba ci arriva, poi si stacca e si
  // lascia portare dal corpo; nell'ultimo tratto raggiunge l'altro sul rialzo.
  const terra = v(-0.17, ALTEZZA_CAVIGLIA, 0.12)
  const appeso = sx.clone().add(terra.clone().sub(sx).setLength(Math.min(0.9, terra.distanceTo(sx))))
  const arrivo = tappa(t, 0.55, 1)
  const sopra = v(-0.17, STEP.rialzo + ALTEZZA_CAVIGLIA, STEP.z + 0.04)
  const caviglia = lerpV(appeso, sopra, arrivo).add(v(0, Math.sin(Math.PI * arrivo) * 0.12, 0))
  const gambe = [
    gamba(sx, piede(caviglia, v(0, 0, -1), v(0, 1, 0)), v(0, 0.2, -1)),
    gamba(dx, piedeATerra(0.17, STEP.z, STEP.rialzo), v(0.15, 0, -1)),
  ]
  const braccia = spalle(locale).map((spalla, i) => {
    const lato = LATI[i]
    return braccio(spalla, manoPendente(spalla, lato * 0.3, spalla.z + 0.02), direzione(lato * 0.3, -1, 0))
  })
  return { bacino, rotazione, braccia, gambe, manubri: true }
}

export function posaGambe(e, fase) {
  const t = onda(fase)
  switch (e.tipo) {
    case 'squat': return squat(e, t)
    case 'hack': return hack(e, t)
    case 'leg-press': return legPress(e, t)
    case 'pressa-45': return pressa(e, t)
    case 'affondi': return affondi(e, t)
    case 'bulgari': return bulgari(e, t)
    case 'leg-extension': return legExtension(e, t)
    case 'leg-curl-seduto': return legCurlSeduto(e, t)
    case 'leg-curl-sdraiato': return legCurlSdraiato(e, t)
    case 'gambe-tese': return stacco(e, 1 - t, GAMBE_TESE)
    case 'sumo': return stacco(e, t, SUMO)
    case 'calf-piedi': return calfPiedi(e, t)
    case 'calf-seduto': return calfSeduto(e, t)
    case 'adduttori': case 'abduttori': return aperture(e, t)
    case 'step-up': return stepUp(e, t)
    default: throw new Error(`Esercizio gambe sconosciuto: ${e.tipo}`)
  }
}

export const MISURE_GAMBE = { LEG_PRESS, PRESSA_SU, PRESSA_NORMALE, PRESSA_CAVIGLIA, BULGARI, SDRAIATO, CALF, STEP }
