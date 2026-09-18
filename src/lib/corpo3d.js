import { MathUtils, Quaternion, Vector3 } from 'three'

// Cinematica condivisa dalle scene 3D di gambe e spalle. Stesse misure del
// manichino di petto e schiena, così un esercizio non sembra fatto da un altro corpo.
//
// Coordinate del mondo: y in alto, chi si allena guarda verso -z, x è il fianco.
// Coordinate del busto (locali): +z verso la testa, +y davanti al petto,
// origine al centro del bacino.
export const OMERO = 0.38
export const AVAMBRACCIO = 0.38
export const COSCIA = 0.48
export const TIBIA = 0.45
// Il piede: la caviglia sta 0.1 sopra la pianta; dal punto sotto la caviglia
// il tallone è 0.06 indietro, la pianta (l'attaccatura delle dita) 0.13 avanti,
// e le dita arrivano 0.07 oltre.
export const ALTEZZA_CAVIGLIA = 0.1
export const TALLONE = 0.06
export const PIANTA = 0.13
export const DITA = 0.07

export const LATI = [-1, 1]
export const v = (x, y, z) => new Vector3(x, y, z)
export const lerp = MathUtils.lerp
export const lerpV = (a, b, t) => a.clone().lerp(b, t)
export const gradi = MathUtils.degToRad
const X = v(1, 0, 0)
const SU = v(0, 1, 0)

// 0 → 1 → 0 in un giro: parte e torna ferma, come una ripetizione vera.
export const onda = (fase) => (1 - Math.cos(fase * Math.PI * 2)) / 2
// Rampa morbida tra due soglie, per i movimenti fatti a tappe.
export function tappa(t, da, a) {
  const x = MathUtils.clamp((t - da) / (a - da), 0, 1)
  return x * x * (3 - 2 * x)
}

// Inclinazione del busto: 90 in piedi, 0 supino (testa verso +z), 180 prono.
export function busto(angolo) {
  return new Quaternion().setFromAxisAngle(X, -gradi(angolo))
}

// Il bacino si ricava dal centro delle anche, che è il punto intorno a cui si
// pensa il movimento (la cerniera dello stacco, la discesa dello squat).
export function daAnche(centro, angolo) {
  const rotazione = busto(angolo)
  const bacino = centro.clone().sub(v(0, 0, -0.02).applyQuaternion(rotazione))
  const locale = (x, y, z) => v(x, y, z).applyQuaternion(rotazione).add(bacino)
  const direzione = (x, y, z) => v(x, y, z).applyQuaternion(rotazione).normalize()
  return { bacino, rotazione, locale, direzione }
}

// Due segmenti rigidi tra a e b: il giunto in mezzo va dalla parte del polo.
// Se il punto è fuori portata è un errore di posa, non un arto da stirare.
export function articolazione(a, b, lunghezzaA, lunghezzaB, polo) {
  const asse = b.clone().sub(a)
  const d = asse.length()
  if (d >= lunghezzaA + lunghezzaB || d <= Math.abs(lunghezzaA - lunghezzaB)) {
    throw new Error(`Arto irraggiungibile: distanza ${d.toFixed(3)}`)
  }
  asse.normalize()
  const lungo = (lunghezzaA ** 2 - lunghezzaB ** 2 + d ** 2) / (2 * d)
  const fuori = polo.clone().addScaledVector(asse, -polo.dot(asse))
  if (fuori.lengthSq() < 1e-10) throw new Error('Polo parallelo all\'arto')
  fuori.normalize()
  return a.clone().addScaledVector(asse, lungo).addScaledVector(fuori, Math.sqrt(lunghezzaA ** 2 - lungo ** 2))
}

export function braccio(spalla, mano, polo) {
  return { spalla, mano, gomito: articolazione(spalla, mano, OMERO, AVAMBRACCIO, polo) }
}

// Braccio guidato dall'angolo (alzate, aperture): la mano sta a `distanza`
// dalla spalla lungo `direzione`, il gomito si piega verso il polo.
export function braccioVerso(spalla, direzione, distanza, polo) {
  return braccio(spalla, spalla.clone().addScaledVector(direzione.clone().normalize(), distanza), polo)
}

// Il piede come due pezzi: pianta rigida (tallone → attaccatura delle dita) e dita.
// `avanti` va dal tallone alle dita, `su` è la normale della suola verso la caviglia.
export function piede(caviglia, avanti, su, dita = avanti) {
  const suolo = caviglia.clone().addScaledVector(su, -ALTEZZA_CAVIGLIA)
  const pianta = suolo.clone().addScaledVector(avanti, PIANTA)
  return {
    caviglia,
    tallone: suolo.clone().addScaledVector(avanti, -TALLONE),
    pianta,
    punta: pianta.clone().addScaledVector(dita, DITA),
  }
}

// Piede appoggiato in piano: `aperto` ruota la punta verso l'esterno (gradi).
export function piedeATerra(x, z, y = 0, aperto = 0) {
  const lato = Math.sign(x) || 1
  const a = gradi(aperto)
  return piede(v(x, y + ALTEZZA_CAVIGLIA, z), v(lato * Math.sin(a), 0, -Math.cos(a)), SU)
}

// In punta: le dita restano sul piano, il tallone si alza di `alzata` gradi
// (negativo = scende sotto il piano, come sul bordo di un gradino).
export function piedeInPunta(pianta, alzata) {
  const a = gradi(alzata)
  const avanti = v(0, -Math.sin(a), -Math.cos(a))
  const su = v(0, Math.cos(a), -Math.sin(a))
  const caviglia = pianta.clone().addScaledVector(avanti, -PIANTA).addScaledVector(su, ALTEZZA_CAVIGLIA)
  return piede(caviglia, avanti, su, v(0, 0, -1))
}

// Piede in aria: ad angolo retto con la tibia, punta verso cui guarda il ginocchio.
// `flessione` > 0 allunga la punta (flessione plantare).
export function piedeDaTibia(ginocchio, caviglia, verso, flessione = 0) {
  const su = ginocchio.clone().sub(caviglia).normalize()
  const avanti = verso.clone().addScaledVector(su, -verso.dot(su)).normalize()
  const f = gradi(flessione)
  const a = avanti.clone().multiplyScalar(Math.cos(f)).addScaledVector(su, -Math.sin(f))
  const s = su.clone().multiplyScalar(Math.cos(f)).addScaledVector(avanti, Math.sin(f))
  return piede(caviglia, a, s)
}

// Gamba con il piede fermo: il ginocchio si trova da solo, verso il polo.
export function gamba(anca, appoggio, polo) {
  return { anca, ...appoggio, ginocchio: articolazione(anca, appoggio.caviglia, COSCIA, TIBIA, polo) }
}

// Gamba guidata dagli angoli (macchine con la leva sul ginocchio).
export function gambaLibera(anca, dirCoscia, dirTibia, versoPiede, flessionePiede = 0) {
  const ginocchio = anca.clone().addScaledVector(dirCoscia.clone().normalize(), COSCIA)
  const caviglia = ginocchio.clone().addScaledVector(dirTibia.clone().normalize(), TIBIA)
  return { anca, ginocchio, ...piedeDaTibia(ginocchio, caviglia, versoPiede, flessionePiede) }
}

// Spalla nel busto; `su` e `indietro` sono l'elevazione e la retrazione delle scapole.
export function spallaLocale(lato, su = 0, indietro = 0) {
  return [lato * (0.25 - indietro * 0.4), 0.07 - indietro, 0.75 + su]
}
export function ancaLocale(lato) {
  return [lato * 0.13, 0, -0.02]
}
