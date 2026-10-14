import { MathUtils, Vector3 } from 'three'
import { ALTEZZA_CAVIGLIA, PIANTA, articolazione, busto, gradi, piede, piedeATerra, tappa } from './corpo3d.js'
import { CORPO, superficieDavanti } from './misureCorpo3d.js'

// ---------------------------------------------------------------------------
// Le pose degli esercizi del petto per il corpo realistico (lib/umano3d).
//
// Mondo: y in alto. In piedi o seduti si guarda verso -z; sdraiati sulla panca
// la testa va verso +z. Il busto ha le sue coordinate (lib/misureCorpo3d):
// x il fianco, +y davanti al petto, +z verso la testa, origine fra le anche.
//
// `posaPetto(e, fase)` → { bacino, rotazione, braccia, gambe, attrezzo }:
// braccia e gambe hanno i giunti nel mondo; `attrezzo` porta lo stato delle
// parti che si muovono (l'angolo delle leve, l'altezza del bilanciere...).
// Le parti fisse (la panca, le pulegge) le dà `misurePetto(e)`.
//
// Il ritmo è quello di una ripetizione vera: si parte in alto, si scende piano
// (2 tempi), fermo sotto, si spinge più svelti, fermo in alto.
// ---------------------------------------------------------------------------

const { OMERO, AVAMBRACCIO, COSCIA, TIBIA } = CORPO
const v = (x, y, z) => new Vector3(x, y, z)
const lerp = MathUtils.lerp

// fase → t: 1 in alto (braccia distese, muscolo accorciato), 0 sotto (allungato).
// `fondo` è la sosta in basso: più lunga nella panca col fermo.
export function ritmo(fase, fondo = 0.05) {
  const f = ((fase % 1) + 1) % 1
  if (f < 0.07) return 1
  if (f < 0.5) return 1 - tappa(f, 0.07, 0.5)
  if (f < 0.5 + fondo) return 0
  const fine = Math.min(0.93, 0.5 + fondo + 0.3)
  if (f < fine) return tappa(f, 0.5 + fondo, fine)
  return 1
}

// Il corpo dato bacino e inclinazione del busto (gradi: 0 supino con la testa
// verso +z, 90 in piedi, 180 prono con la testa verso -z).
function telaio(bacino, angolo) {
  const rotazione = busto(angolo)
  const locale = (x, y, z) => v(x, y, z).applyQuaternion(rotazione).add(bacino)
  const direzione = (x, y, z) => v(x, y, z).applyQuaternion(rotazione).normalize()
  const spalla = (lato) => locale(lato * CORPO.SPALLA[0], CORPO.SPALLA[1], CORPO.SPALLA[2])
  const anca = (lato) => locale(lato * CORPO.ANCA[0], CORPO.ANCA[1], CORPO.ANCA[2])
  return { bacino, rotazione, locale, direzione, spalla, anca }
}

// Con la mano chiusa il bersaglio è il centro del pugno; con la mano aperta
// (`palmo`) è il polso, perché è il palmo che si appoggia.
function braccio(spalla, bersaglio, polo, extra = {}) {
  if (!extra.palmo) return { spalla, mano: bersaglio, gomito: articolazione(spalla, bersaglio, OMERO, AVAMBRACCIO, polo), ...extra }
  const gomito = articolazione(spalla, bersaglio, OMERO, CORPO.POLSO, polo)
  const mano = gomito.clone().addScaledVector(bersaglio.clone().sub(gomito).normalize(), AVAMBRACCIO)
  return { spalla, gomito, mano, polso: bersaglio, ...extra }
}
const gamba = (anca, appoggio, polo) => ({
  anca, ...appoggio, ginocchio: articolazione(anca, appoggio.caviglia, COSCIA, TIBIA, polo),
})
// Piedi piatti a terra davanti alla panca (o al sedile), un po' aperti.
const piediATerra = (T, x, z, polo, aperti = 12) => [-1, 1].map((lato) => gamba(T.anca(lato), piedeATerra(lato * x, z, 0, aperti), polo(lato)))

// Il punto dove un bilanciere tocca il petto, a una certa altezza z del busto.
const alPetto = (T, x, z, raggio = 0.016) => T.locale(x, superficieDavanti(0, z) + raggio, z)

// ---- Le misure fisse (panche, altezze) -------------------------------------
// La panca: cuscino a 0.5 da terra (≈ 45 cm).
export const PANCA = 0.5
const DIETRO = 0.103 // dalla linea delle anche alla schiena appoggiata

function baseSdraiato(e) {
  const i = e.inclinazione || 0
  if (e.tipo === 'floor-press') return telaio(v(0, DIETRO + 0.014, -0.35), 0)
  if (i < 0) return telaio(v(0, 0.76, -0.42), i)
  if (i > 0) {
    // Seduti sulla seduta, schiena sullo schienale inclinato: il gluteo più
    // basso tocca la seduta.
    return telaio(v(0, PANCA + 0.118, -0.42), i)
  }
  return telaio(v(0, PANCA + DIETRO, -0.35), 0)
}

// ---- Le pose -----------------------------------------------------------------
export function posaPetto(e, fase) {
  const t = ritmo(fase, e.fermo ? 0.16 : 0.05)
  const f = POSE[e.tipo]
  if (!f) throw new Error(`Esercizio 3D sconosciuto: ${e.tipo}`)
  return f(e, t)
}

// Le spinte su panca: bilanciere, manubri, multipower; piana, inclinata,
// declinata, col fermo; e la floor press a terra (si ferma coi gomiti al suolo).
function spinte(e, t) {
  const T = baseSdraiato(e)
  const i = e.inclinazione || 0
  const zPetto = e.tipo === 'floor-press' ? 0.5 : i > 0 ? 0.585 : i < 0 ? 0.46 : 0.5
  const smith = e.attrezzo === 'smith'
  const manubri = e.attrezzo === 'manubri'
  const braccia = [-1, 1].map((lato) => {
    const spalla = T.spalla(lato)
    let basso, alto, presa
    if (manubri) {
      // Manubri ai lati del petto, sopra le spalle a braccia distese.
      basso = T.locale(lato * 0.3, superficieDavanti(0.3, zPetto) + 0.05, zPetto)
      alto = spalla.clone().add(v(-lato * 0.06, 0, 0))
      alto.y += 0.665
      presa = T.direzione(1, 0, lato * 0.35 * (1 - t))
    } else {
      basso = alPetto(T, lato * 0.42, zPetto)
      alto = spalla.clone()
      alto.x = lato * 0.42
      alto.y += 0.635
      presa = v(1, 0, 0)
    }
    if (smith) alto.z = basso.z // guida verticale
    if (e.tipo === 'floor-press') {
      // Sotto si ferma quando i gomiti toccano terra: avambraccio verticale.
      const gy = 0.05
      const dx = basso.x - spalla.x, dy = gy - spalla.y
      const dz = Math.sqrt(OMERO ** 2 - dx * dx - dy * dy)
      basso = v(basso.x, gy + AVAMBRACCIO, spalla.z - dz)
    }
    // Traiettoria a J: sale e intanto torna sopra le spalle (non col multipower).
    const avanti = smith ? 0 : 1 - (1 - t) ** 2
    const mano = v(basso.x + (alto.x - basso.x) * t, lerp(basso.y, alto.y, t), lerp(basso.z, alto.z, avanti))
    const polo = manubri ? T.direzione(lato, -1, -0.3) : T.direzione(lato, -0.9, -0.75)
    return braccio(spalla, mano, polo, { presa })
  })
  let gambe
  if (i < 0) {
    // Declinata: le ginocchia agganciate sopra il rullo, le caviglie sotto.
    gambe = [-1, 1].map((lato) => {
      const anca = T.anca(lato)
      const caviglia = v(lato * 0.1, 0.4, T.bacino.z - 0.62)
      const ginocchio = articolazione(anca, caviglia, COSCIA, TIBIA, v(0, 1, -0.6))
      const avanti = v(0, 0, -1)
      const su = ginocchio.clone().sub(caviglia).normalize()
      return { anca, ginocchio, ...piede(caviglia, avanti.addScaledVector(su, -avanti.dot(su)).normalize(), su) }
    })
  } else if (e.tipo === 'floor-press') {
    gambe = piediATerra(T, 0.17, T.bacino.z - 0.5, () => v(0, 1, -0.2), 6)
  } else {
    gambe = piediATerra(T, 0.3, T.bacino.z - (i > 0 ? 0.52 : 0.47), (lato) => v(lato * 0.35, 1, -0.4))
  }
  const centro = braccia[0].mano.clone().add(braccia[1].mano).multiplyScalar(0.5)
  return { ...T, braccia, gambe, attrezzo: { centro, t } }
}

// Croci con i manubri (o ai cavi bassi) su panca: le braccia si aprono a
// semicerchio coi gomiti morbidi e fermi.
function croci(e, t) {
  const T = baseSdraiato(e)
  const a = gradi(lerp(-4, 98, t))
  const braccia = [-1, 1].map((lato) => {
    const spalla = T.spalla(lato)
    const mano = spalla.clone().add(T.direzione(lato * Math.cos(a), Math.sin(a), -0.08).multiplyScalar(0.64))
    return braccio(spalla, mano, T.direzione(0, -1, -0.35), { presa: T.direzione(0, 0, 1) })
  })
  const gambe = piediATerra(T, 0.3, T.bacino.z - (e.inclinazione > 0 ? 0.52 : 0.47), (lato) => v(lato * 0.35, 1, -0.4))
  return { ...T, braccia, gambe, attrezzo: { t } }
}

// Pullover: un manubrio tenuto coi palmi sotto il disco alto, braccia quasi
// tese che vanno da sopra il petto a dietro la testa.
function pullover(e, t) {
  const T = baseSdraiato(e)
  const a = gradi(lerp(104, 4, t))
  const braccia = [-1, 1].map((lato) => {
    const spalla = T.spalla(lato)
    const mano = T.locale(lato * 0.045, CORPO.SPALLA[1] + 0.645 * Math.cos(a), CORPO.SPALLA[2] + 0.645 * Math.sin(a))
    return braccio(spalla, mano, T.direzione(lato, 0, 0.35), { presa: T.direzione(1, 0, 0) })
  })
  const gambe = piediATerra(T, 0.3, T.bacino.z - 0.47, (lato) => v(lato * 0.35, 1, -0.4))
  const asse = T.direzione(0, Math.cos(a), Math.sin(a))
  return { ...T, braccia, gambe, attrezzo: { asse, t } }
}

// Macchine con le leve (chest press piana e inclinata, Hammer): seduti, la
// maniglia gira attorno al perno della leva, da `S` (al petto) a `E`.
export function levaPetto(e) {
  const varianti = {
    piana: { S: [0.37, 1.12, 0.1], E: [0.3, 1.1, -0.38], presa: [0, 1, 0] },
    inclinata: { S: [0.36, 1.2, 0.07], E: [0.26, 1.56, -0.3], presa: [0, 1, 0] },
    hammer: { S: [0.41, 1.12, 0.11], E: [0.15, 1.12, -0.37], presa: [0.35, 1, 0] },
  }
  const { S, E, presa } = varianti[e.leva || 'piana']
  const R = 1.05
  return [-1, 1].map((lato) => {
    const s = v(lato * S[0], S[1], S[2]), en = v(lato * E[0], E[1], E[2])
    const corda = en.clone().sub(s)
    const meta = s.clone().add(en).multiplyScalar(0.5)
    const c = corda.clone().normalize()
    // Il perno sta "sopra" la corda: la maniglia scende e risale appena.
    const n = v(0, 1, 0).addScaledVector(c, -c.y).normalize()
    const perno = meta.addScaledVector(n, Math.sqrt(R * R - corda.lengthSq() / 4))
    const u0 = s.clone().sub(perno), u1 = en.clone().sub(perno)
    const asse = u0.clone().cross(u1).normalize()
    return { perno, u0, asse, angolo: u0.angleTo(u1), presa: v(lato * presa[0], presa[1], presa[2]).normalize() }
  })
}
function chestPress(e, t) {
  const T = telaio(v(0, PANCA + 0.1, 0.13), 78)
  const leve = levaPetto(e)
  const braccia = [-1, 1].map((lato, i) => {
    const L = leve[i]
    const mano = L.u0.clone().applyAxisAngle(L.asse, L.angolo * t).add(L.perno)
    return braccio(T.spalla(lato), mano, v(lato, -0.7, 0.8), { presa: L.presa })
  })
  const gambe = piediATerra(T, 0.24, -0.4, (lato) => v(lato * 0.25, 0.5, -1), 8)
  return { ...T, braccia, gambe, attrezzo: { leve: leve.map((L) => L.angolo * t), t } }
}

// Pectoral machine: gomiti a 90°, gli omeri girano attorno a un asse
// verticale sopra la spalla e chiudono davanti al petto.
function pecDeck(e, t) {
  const T = telaio(v(0, PANCA + 0.1, 0.12), 90)
  const a = gradi(lerp(-14, 98, t))
  const braccia = [-1, 1].map((lato) => {
    const spalla = T.spalla(lato)
    const gomito = spalla.clone().add(v(lato * Math.cos(a), -0.06, -Math.sin(a)).normalize().multiplyScalar(OMERO))
    const mano = gomito.clone().add(v(0, AVAMBRACCIO, 0))
    return { spalla, gomito, mano, presa: v(-Math.sin(a) * lato, 0, -Math.cos(a)).normalize() }
  })
  const gambe = piediATerra(T, 0.22, -0.4, (lato) => v(lato * 0.25, 0.5, -1), 8)
  return { ...T, braccia, gambe, attrezzo: { angolo: a, t } }
}

// Croci ai cavi in piedi: passo sfalsato, busto appena in avanti, le mani
// chiudono a semicerchio verso il basso (cavi alti), dritte (medi) o in su (bassi).
export const PULEGGE = { alti: 2.2, medi: 1.45, bassi: 0.17 }
function cavi(e, t) {
  const T = telaio(v(0, 0.92, 0.05), 102)
  const [e0, e1] = { alti: [36, -36], medi: [6, -10], bassi: [-46, 14] }[e.cavi]
  const a = gradi(lerp(-12, 104, t))
  const el = gradi(lerp(e0, e1, t))
  const braccia = [-1, 1].map((lato) => {
    const spalla = T.spalla(lato)
    const d = v(lato * Math.cos(a) * Math.cos(el), Math.sin(el), -Math.sin(a) * Math.cos(el))
    const mano = spalla.clone().addScaledVector(d, 0.655)
    return braccio(spalla, mano, v(lato * 0.6, 0.35, 1), { presa: v(0, 1, 0) })
  })
  const gambe = [-1, 1].map((lato) => {
    const z = lato < 0 ? -0.32 : 0.36
    return gamba(T.anca(lato), piedeATerra(lato * 0.15, z, 0, 10), v(lato * 0.15, 0.2, -1))
  })
  return { ...T, braccia, gambe, attrezzo: { t } }
}

// Dip alle parallele, versione petto: busto inclinato in avanti, si scende
// finché l'omero è parallelo a terra. Le mani restano sulle sbarre.
export const PARALLELE = { y: 1.24, x: 0.27 }
function dips(e, t) {
  const angolo = lerp(124, 112, t)
  // Il punto fra le spalle: sopra le mani a braccia tese, sotto e un po' avanti.
  const centroSpalle = v(0, PARALLELE.y + lerp(0.31, 0.655, t), lerp(-0.11, 0.0, t))
  const rot = busto(angolo)
  const bacino = centroSpalle.clone().sub(v(0, CORPO.SPALLA[1], CORPO.SPALLA[2]).applyQuaternion(rot))
  const T = telaio(bacino, angolo)
  const braccia = [-1, 1].map((lato) => braccio(
    T.spalla(lato), v(lato * PARALLELE.x, PARALLELE.y + 0.02, 0), v(lato * 0.45, 0, 1), { presa: v(0, 0, 1) },
  ))
  // Gambe piegate e incrociate dietro: le ginocchia avanti, i piedi indietro.
  const gambe = [-1, 1].map((lato) => {
    const anca = T.anca(lato)
    const ginocchio = anca.clone().add(v(0, -0.96, -0.2).normalize().multiplyScalar(COSCIA))
    const caviglia = ginocchio.clone().add(v(-lato * 0.1, -0.35, 0.93).normalize().multiplyScalar(TIBIA))
    const su = ginocchio.clone().sub(caviglia).normalize()
    const avanti = v(0, -1, 0.3).addScaledVector(su, -v(0, -1, 0.3).dot(su)).normalize()
    return { anca, ginocchio, ...piede(caviglia, avanti, su) }
  })
  return { ...T, braccia, gambe, attrezzo: { t } }
}

// Piegamenti: il corpo è una tavola che ruota sulle punte dei piedi. `mani`
// e `piedi` sono le altezze degli appoggi (panca sotto le mani o sotto i piedi).
export function appoggiPushUp(e) {
  return {
    mani: e.mani === 'rialzate' ? PANCA : 0,
    piedi: e.piedi === 'rialzati' ? PANCA : 0,
    largo: e.presa === 'larga' ? 0.43 : 0.27,
  }
}
function pushUp(e, t) {
  const { mani, piedi, largo } = appoggiPushUp(e)
  // Il piede in punta: dita a terra, tallone su, suola verso i talloni.
  const avanti = v(0, -0.88, -0.47).normalize()
  const su = v(0, 0.47, -0.88).normalize()
  const zPianta = 0.85
  const lunghezza = TIBIA + COSCIA - 0.004
  const caviglia0 = v(0, piedi + 0.015, zPianta).addScaledVector(avanti, -PIANTA).addScaledVector(su, ALTEZZA_CAVIGLIA)
  // L'altezza delle spalle decide l'inclinazione della tavola.
  const altezzaSpalle = (s) => caviglia0.y + (lunghezza + CORPO.SPALLA[2]) * s + 0.005 * Math.sqrt(1 - s * s)
  const polso = mani + 0.022
  // In alto le braccia quasi tese: con la presa larga le spalle stanno più basse.
  const sopra = polso + Math.sqrt(0.635 ** 2 - (largo - CORPO.SPALLA[0]) ** 2), sotto = polso + 0.2
  const sinDa = (h) => {
    let s = (h - caviglia0.y) / (lunghezza + CORPO.SPALLA[2])
    for (let k = 0; k < 4; k++) s += (h - altezzaSpalle(s)) / (lunghezza + CORPO.SPALLA[2])
    return MathUtils.clamp(s, -0.95, 0.95)
  }
  const s = lerp(sinDa(sotto), sinDa(sopra), t)
  const th = Math.asin(s)
  const dir = v(0, Math.sin(th), -Math.cos(th))
  const bacino = caviglia0.clone().addScaledVector(dir, lunghezza)
  const T = telaio(bacino, 180 - MathUtils.radToDeg(th))
  // Le mani sotto le spalle a metà discesa (un po' verso i piedi).
  const meta = Math.asin(lerp(sinDa(sotto), sinDa(sopra), 0.5))
  const zMani = caviglia0.z - Math.cos(meta) * (lunghezza + CORPO.SPALLA[2]) + 0.04
  const braccia = [-1, 1].map((lato) => {
    const mano = v(lato * largo, polso, zMani)
    return braccio(T.spalla(lato), mano, v(lato * (largo > 0.3 ? 1 : 0.55), 0.25, 1), {
      palmo: v(0, -1, 0),
      dita: v(lato * (largo > 0.3 ? 0.3 : 0.1), 0, -1),
    })
  })
  const gambe = [-1, 1].map((lato) => {
    const anca = T.anca(lato)
    const caviglia = caviglia0.clone().setX(lato * 0.1)
    return { anca, ginocchio: articolazione(anca, caviglia, COSCIA, TIBIA, T.direzione(0, 1, 0)), ...piede(caviglia, avanti, su, v(0, 0, -1)) }
  })
  return { ...T, braccia, gambe, attrezzo: { zMani, t } }
}

// Svend press: in piedi, un disco stretto fra i palmi davanti al petto,
// spinto in avanti a braccia tese e riportato al petto.
function svend(e, t) {
  const T = telaio(v(0, 0.99, 0.02), 90)
  const y = T.spalla(1).y - 0.13
  const braccia = [-1, 1].map((lato) => {
    const mano = v(lato * 0.035, y, lerp(-0.24, -0.53, t))
    return braccio(T.spalla(lato), mano, v(lato * 0.7, -1, 0.3), {
      palmo: v(-lato, 0, 0),
      dita: v(0, 0.75, -0.6),
    })
  })
  const gambe = piediATerra(T, 0.16, 0.02, () => v(0, 0, -1), 8)
  return { ...T, braccia, gambe, attrezzo: { centro: v(0, y + 0.07, lerp(-0.29, -0.58, t)), t } }
}

// Landmine press: il bilanciere incernierato a terra; le mani sull'estremità
// la spingono in alto e in avanti lungo l'arco attorno al perno.
export const LANDMINE = { perno: [0, 0.07, -1.95], braccio: 2.27, da: 36.5, a: 49 }
function landmine(e, t) {
  const T = telaio(v(0, 0.94, 0.12), 100)
  const b = gradi(lerp(LANDMINE.da, LANDMINE.a, t))
  const asse = v(0, Math.sin(b), Math.cos(b))
  const estremo = v(...LANDMINE.perno).addScaledVector(asse, LANDMINE.braccio)
  const braccia = [-1, 1].map((lato) => braccio(
    T.spalla(lato), estremo.clone().add(v(lato * 0.045, -0.01, 0.02)), v(lato * 0.7, -1, 0.4), { presa: v(0, -asse.z, asse.y) },
  ))
  const gambe = [-1, 1].map((lato) => {
    const z = lato < 0 ? -0.24 : 0.42
    return gamba(T.anca(lato), piedeATerra(lato * 0.15, z, 0, 8), v(lato * 0.15, 0.2, -1))
  })
  return { ...T, braccia, gambe, attrezzo: { angolo: b, t } }
}

const POSE = {
  spinte,
  'floor-press': spinte,
  croci,
  pullover,
  'chest-press': chestPress,
  'pec-deck': pecDeck,
  cavi,
  dips,
  'push-up': pushUp,
  svend,
  landmine,
}
