import {
  AVAMBRACCIO, LATI, OMERO, braccio, daAnche, gamba, gradi, lerp, lerpV, onda, piedeATerra, spallaLocale, ancaLocale, tappa, v,
} from './corpo3d.js'

// Come si muove il corpo negli esercizi per le spalle. Stesso contratto delle
// pose delle gambe: bacino, busto, braccia (spalla, gomito, mano) e gambe a una
// certa `fase` della ripetizione. In più `scapole`: quanto salgono (scrollate,
// tirate) e quanto si stringono (alzate posteriori, face pull, reverse pec deck).

const IN_PIEDI = v(0, 1.02, 0)
const SEDUTI = v(0, 0.66, 0.12)

function corpo(centro, angolo, { su = 0, indietro = 0 } = {}) {
  const base = daAnche(centro, angolo)
  const spalle = LATI.map((lato) => base.locale(...spallaLocale(lato, su, indietro)))
  const anche = LATI.map((lato) => base.locale(...ancaLocale(lato)))
  return { ...base, spalle, anche, scapole: { su, indietro } }
}
function gambeInPiedi(anche, larghezza = 0.19) {
  return anche.map((anca, i) => gamba(anca, piedeATerra(LATI[i] * larghezza, 0, 0, 6), v(LATI[i] * 0.15, 0, -1)))
}
function gambeSedute(anche) {
  return anche.map((anca, i) => gamba(anca, piedeATerra(LATI[i] * 0.26, -0.4, 0, 8), v(LATI[i] * 0.2, 0.5, -1)))
}
// Braccio che si apre di `angolo` gradi: la mano sta a `distanza` dalla spalla.
function aperto(spalla, direzione, distanza, polo) {
  return braccio(spalla, spalla.clone().addScaledVector(direzione.normalize(), distanza), polo)
}

// ---- Spinte sopra la testa -------------------------------------------------------
// Lento avanti: il bilanciere sale davanti al viso e, superata la fronte, rientra
// sopra la testa; alla fine le braccia sono in linea con le orecchie.
function lento(e, t) {
  const c = corpo(IN_PIEDI, 90)
  const z = lerp(0.86, 1.5, t)
  const y = 0.26 - 0.2 * tappa(z, 1.2, 1.5)
  const braccia = c.spalle.map((spalla, i) => braccio(spalla, c.locale(LATI[i] * 0.3, y, z), c.direzione(LATI[i] * 0.25, 0.4, -1)))
  return { ...c, braccia, gambe: gambeInPiedi(c.anche, 0.21), carico: c.locale(0, y, z), asseCarico: v(1, 0, 0) }
}

// Spinte coi manubri, costruite dagli angoli invece che dalla mano: il gomito
// sta nel piano della scapola (`giro` gradi dal davanti, `alzo` gradi sopra
// l'orizzontale) e l'avambraccio resta verticale sopra di lui, tranne l'ultimo
// tratto in cui si inclina verso il centro e i manubri si avvicinano.
function spinta(c, spalla, lato, giro, alzo, verso = 0) {
  const g = gradi(giro), a = gradi(alzo)
  const gomito = spalla.clone().addScaledVector(c.direzione(lato * Math.cos(a) * Math.sin(g), Math.cos(a) * Math.cos(g), Math.sin(a)), OMERO)
  const mano = gomito.clone().addScaledVector(c.direzione(-lato * verso, 0, 1), AVAMBRACCIO)
  return { spalla, gomito, mano }
}

// Manubri dalle orecchie a sopra la testa, e un po' verso il centro. Seduti.
function lentoManubri(e, t) {
  const c = corpo(SEDUTI, 90)
  const braccia = c.spalle.map((spalla, i) => spinta(c, spalla, LATI[i], 75, lerp(-10, 75, t), 0.35 * tappa(t, 0.55, 1)))
  return { ...c, braccia, gambe: gambeSedute(c.anche), manubri: braccia.map(() => c.direzione(1, 0, 0)) }
}

// Arnold press: si parte coi gomiti davanti e stretti e i palmi verso di sé, si
// ruota aprendo i gomiti di lato e intanto si spinge. Il manubrio fa mezzo giro.
function arnold(e, t) {
  const c = corpo(SEDUTI, 90)
  const apertura = tappa(t, 0, 0.5)
  const su = tappa(t, 0.3, 1)
  const braccia = c.spalle.map((spalla, i) => spinta(
    c, spalla, LATI[i], lerp(-5, 75, apertura), lerp(-40, -10, apertura) + 85 * su, 0.35 * tappa(t, 0.7, 1),
  ))
  const manubri = LATI.map((lato) => c.direzione(Math.cos(lato * Math.PI * apertura), Math.sin(lato * Math.PI * apertura), 0))
  return { ...c, braccia, gambe: gambeSedute(c.anche), manubri }
}

// Shoulder press alla macchina: le maniglie stanno su due leve che girano
// attorno a un perno dietro lo schienale, quindi fanno un arco e non una retta.
// Il perno si ricava dai due estremi della corsa. L'angolo si misura dal
// davanti (-z) verso l'alto: resta continuo, senza il salto a ±180° che farebbe
// girare la maniglia dalla parte sbagliata.
const CORSA_LEVA = [v(0, 1.5, -0.03), v(0, 2.12, 0)]
function levaDaCorsa([basso, alto]) {
  const corda = alto.clone().sub(basso)
  const perno = basso.clone().add(alto).multiplyScalar(0.5).addScaledVector(v(0, -corda.z, corda.y).normalize(), 0.9)
  return { perno, raggio: perno.distanceTo(basso), x: 0.48 }
}
export const LEVA_SPALLE = levaDaCorsa(CORSA_LEVA)
const angoloLeva = (p) => Math.atan2(p.y - LEVA_SPALLE.perno.y, LEVA_SPALLE.perno.z - p.z)
function macchina(e, t) {
  const c = corpo(SEDUTI, 90)
  const a = lerp(angoloLeva(CORSA_LEVA[0]), angoloLeva(CORSA_LEVA[1]), t)
  const { perno, raggio } = LEVA_SPALLE
  const maniglia = (lato) => v(lato * LEVA_SPALLE.x, perno.y + raggio * Math.sin(a), perno.z - raggio * Math.cos(a))
  const braccia = c.spalle.map((spalla, i) => braccio(spalla, maniglia(LATI[i]), c.direzione(LATI[i] * 0.3, 0.15, -1)))
  return { ...c, braccia, gambe: gambeSedute(c.anche), leva: a }
}

// ---- Alzate ----------------------------------------------------------------------
// Laterali: braccia quasi tese, fino alla linea delle spalle e non oltre. Il
// braccio sale un po' davanti al busto (piano della scapola), il gomito guida.
function alzateLaterali(e, t) {
  const c = corpo(IN_PIEDI, 92)
  const a = gradi(lerp(12, 88, t))
  const scapola = gradi(15)
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    const direzione = c.direzione(lato * Math.sin(a) * Math.cos(scapola), Math.sin(a) * Math.sin(scapola) + 0.05, -Math.cos(a))
    return aperto(spalla, direzione, 0.735, c.direzione(0, -0.5, 1))
  })
  return { ...c, braccia, gambe: gambeInPiedi(c.anche), manubri: braccia.map(() => c.direzione(0, 1, 0)) }
}

// Al cavo, un braccio alla volta: il cavo parte dalla carrucola bassa dal lato
// opposto e attraversa il corpo; l'altra mano tiene la colonna.
export const CAVO_LATERALE = { colonna: -0.72, carrucola: v(-0.66, 0.14, 0) }
function alzateCavo(e, t) {
  const c = corpo(IN_PIEDI, 90)
  const a = gradi(lerp(-20, 85, t))
  const scapola = gradi(15)
  const [sx, dx] = c.spalle
  const direzione = c.direzione(Math.sin(a) * Math.cos(scapola), 0.25 * Math.cos(a) + Math.sin(a) * Math.sin(scapola), -Math.cos(a))
  const braccia = [
    braccio(sx, v(CAVO_LATERALE.colonna + 0.06, 1.3, -0.02), v(-1, -0.3, 0.5)),
    aperto(dx, direzione, 0.735, c.direzione(0, -0.5, 1)),
  ]
  return { ...c, braccia, gambe: gambeInPiedi(c.anche, 0.22) }
}

// Frontali: davanti fino poco sopra la linea delle spalle, senza dondolare.
function alzateFrontali(e, t) {
  const c = corpo(IN_PIEDI, 90)
  const a = gradi(lerp(8, 100, t))
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    return aperto(spalla, c.direzione(lato * 0.1, Math.sin(a), -Math.cos(a)), 0.745, c.direzione(lato, -0.2, 0))
  })
  return { ...c, braccia, gambe: gambeInPiedi(c.anche), manubri: braccia.map(() => c.direzione(1, 0, 0)) }
}

// Posteriori: busto piegato quasi parallelo al pavimento, i manubri si aprono di
// lato nel piano verticale delle spalle e le scapole si stringono.
function alzatePosteriori(e, t) {
  const c = corpo(v(0, 0.98, 0.26), 158, { indietro: 0.04 * t })
  const a = gradi(lerp(6, 82, t))
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    return aperto(spalla, v(lato * Math.sin(a), -Math.cos(a), 0), 0.72, v(lato * 0.1, 1, 0.3))
  })
  const gambe = c.anche.map((anca, i) => gamba(anca, piedeATerra(LATI[i] * 0.19, 0.05, 0, 6), v(LATI[i] * 0.2, 0, -1)))
  return { ...c, braccia, gambe, manubri: braccia.map(() => v(0, 0, 1)) }
}

// Reverse pec deck: seduti col petto sul cuscino, le maniglie girano su perni
// sopra le spalle, quindi le mani fanno un arco orizzontale.
function reversePecDeck(e, t) {
  const riposo = corpo(SEDUTI, 90)
  const c = corpo(SEDUTI, 90, { indietro: 0.04 * t })
  const a = gradi(lerp(12, 96, t))
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    const perno = riposo.spalle[i]
    const mano = v(perno.x + lato * 0.73 * Math.sin(a), perno.y + 0.02, perno.z - 0.73 * Math.cos(a))
    return braccio(spalla, mano, c.direzione(lato * 0.3, 0, 1))
  })
  return { ...c, braccia, gambe: gambeSedute(c.anche), apertura: a, perni: riposo.spalle }
}

// ---- Tirate e scrollate ----------------------------------------------------------
// Tirate al mento: il bilanciere sale lungo la pancia fino al petto, i gomiti
// restano sopra le mani e le scapole salgono un poco.
function tirate(e, t) {
  const c = corpo(IN_PIEDI, 90, { su: 0.03 * t })
  const z = lerp(0.1, 0.74, t), y = 0.2 + 0.03 * t
  const braccia = c.spalle.map((spalla, i) => braccio(spalla, c.locale(LATI[i] * 0.15, y, z), c.direzione(LATI[i], -0.3, 0.5)))
  return { ...c, braccia, gambe: gambeInPiedi(c.anche), carico: c.locale(0, y, z), asseCarico: v(1, 0, 0) }
}

// Face pull: corda all'altezza del viso, si tira verso le orecchie coi gomiti
// alti e larghi, stringendo le scapole.
export const FACE_PULL = { carrucola: v(0, 1.98, -1.25) }
function facePull(e, t) {
  const c = corpo(IN_PIEDI, 87, { indietro: 0.04 * t })
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    const mano = lerpV(c.locale(lato * 0.12, 0.72, 0.92), c.locale(lato * 0.3, 0.16, 1.05), t)
    return braccio(spalla, mano, c.direzione(lato, 0, 0.6))
  })
  return { ...c, braccia, gambe: gambeInPiedi(c.anche, 0.21) }
}

// Scrollate: solo le spalle salgono verso le orecchie, le braccia restano tese.
function scrollate(e, t) {
  const su = 0.1 * t
  const c = corpo(IN_PIEDI, 90, { su })
  const bilanciere = e.attrezzo === 'bilanciere'
  const braccia = c.spalle.map((spalla, i) => {
    const lato = LATI[i]
    // Bilanciere davanti alle cosce, manubri lungo i fianchi; braccia tese.
    const [x, y] = bilanciere ? [lato * 0.26, 0.2] : [lato * 0.31, 0.03]
    const [sx, sy, sz] = spallaLocale(lato, su)
    const z = sz - Math.sqrt(0.745 ** 2 - (x - sx) ** 2 - (y - sy) ** 2)
    return braccio(spalla, c.locale(x, y, z), c.direzione(lato, -0.5, 0))
  })
  const carico = bilanciere ? braccia[0].mano.clone().add(braccia[1].mano).multiplyScalar(0.5) : null
  return {
    ...c, braccia, gambe: gambeInPiedi(c.anche), carico, asseCarico: v(1, 0, 0),
    manubri: bilanciere ? null : braccia.map(() => c.direzione(0, 1, 0)),
  }
}

export function posaSpalle(e, fase) {
  const t = onda(fase)
  switch (e.tipo) {
    case 'lento': return lento(e, t)
    case 'lento-manubri': return lentoManubri(e, t)
    case 'arnold': return arnold(e, t)
    case 'macchina': return macchina(e, t)
    case 'laterali': return alzateLaterali(e, t)
    case 'laterali-cavo': return alzateCavo(e, t)
    case 'frontali': return alzateFrontali(e, t)
    case 'posteriori': return alzatePosteriori(e, t)
    case 'reverse-pec-deck': return reversePecDeck(e, t)
    case 'tirate': return tirate(e, t)
    case 'face-pull': return facePull(e, t)
    case 'scrollate': return scrollate(e, t)
    default: throw new Error(`Esercizio spalle sconosciuto: ${e.tipo}`)
  }
}
