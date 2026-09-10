import { MathUtils, Quaternion, Vector3 } from 'three'

const X = new Vector3(1, 0, 0)
const Z = new Vector3(0, 0, 1)
export const ORIGINE_BUSTO = new Vector3(0, 0.76, -0.35)

function gomitoTra(spalla, mano, polo) {
  const asse = mano.clone().sub(spalla)
  const distanza = asse.length()
  if (distanza >= 0.76 || distanza < 1e-6) throw new Error('Posa del braccio irraggiungibile')
  asse.normalize()
  const direzione = polo.clone().addScaledVector(asse, -polo.dot(asse)).normalize()
  return spalla.clone().addScaledVector(asse, distanza / 2)
    .addScaledVector(direzione, Math.sqrt(0.38 ** 2 - (distanza / 2) ** 2))
}

// Coordinate del busto locali: +z verso la testa, +y davanti al petto.
// Le mani in appoggio si risolvono nello spazio della scena, così non slittano.
export function posaPetto(e, fase) {
  const t = (1 - Math.cos(fase * Math.PI * 2)) / 2
  const seduto = ['chest-press', 'pec-deck'].includes(e.tipo)
  const inPiedi = e.tipo === 'cavi'
  let angolo = e.inclinazione || 0
  const bacino = new Vector3(0, 0.76, -0.35)
  if (seduto) bacino.set(0, 0.69, 0.1)
  if (inPiedi) { bacino.set(0, 1.02, 0); angolo = 90 }
  if (e.tipo === 'dips') { bacino.set(0, 0.67 + 0.29 * t, 0.04); angolo = 105 }
  if (e.tipo === 'push-up') {
    angolo = 8 + 16 * t
    const a = MathUtils.degToRad(angolo)
    bacino.set(0, 0.12 + 1.03 * Math.sin(a), -1.2 + 1.03 * Math.cos(a))
  }
  const rotazione = new Quaternion().setFromAxisAngle(X, -MathUtils.degToRad(angolo))
  if (e.tipo === 'push-up') rotazione.multiply(new Quaternion().setFromAxisAngle(Z, Math.PI))
  const mondo = (p) => p.clone().applyQuaternion(rotazione).add(bacino)
  const locale = (x, y, z) => mondo(new Vector3(x, y, z))
  const braccia = [-1, 1].map((lato) => {
    const spalla = locale(lato * 0.25, 0.07, 0.75)
    let mano
    let gomito
    let polo = new Vector3(lato, 0, -1).applyQuaternion(rotazione)
    if (e.tipo === 'spinte') {
      const basso = locale(lato * 0.48, 0.23, 0.55)
      const alto = spalla.clone().add(new Vector3(lato * 0.23, e.attrezzo === 'smith' ? 0.7 : 0.72, 0))
      mano = basso.lerp(alto, t)
      if (e.attrezzo === 'manubri') mano.x = lato * (0.49 - 0.29 * t)
      if (e.attrezzo === 'smith') mano.z = 0.3
      polo = new Vector3(lato, 0, -1)
    } else if (e.tipo === 'croci') {
      const a = MathUtils.lerp(0.08, 1.76, t)
      mano = locale(lato * (0.25 + 0.7 * Math.cos(a)), 0.07 + 0.7 * Math.sin(a), 0.67)
      polo = new Vector3(0, 0, -1).applyQuaternion(rotazione)
    } else if (e.tipo === 'pullover') {
      const a = MathUtils.lerp(0.06, 1.68, t)
      mano = locale(lato * 0.065, 0.07 + 0.72 * Math.sin(a), 0.75 + 0.72 * Math.cos(a))
      polo = new Vector3(lato, 0, 0).applyQuaternion(rotazione)
    } else if (e.tipo === 'chest-press') {
      mano = locale(lato * (0.43 - 0.09 * t), 0.19 + 0.6 * t, 0.63 + 0.07 * t)
    } else if (e.tipo === 'cavi') {
      const a = MathUtils.lerp(0.04, 1.78, t)
      const altezza = e.altezzaCavo > 2 ? MathUtils.lerp(0.18, -0.28, t)
        : e.altezzaCavo < 0.5 ? MathUtils.lerp(-0.28, 0.2, t) : 0
      const r = Math.sqrt(0.7 ** 2 - altezza ** 2)
      mano = locale(lato * (0.25 + r * Math.cos(a)), 0.07 + r * Math.sin(a), 0.75 + altezza)
      polo = new Vector3(0, 0, -1).applyQuaternion(rotazione)
    } else if (e.tipo === 'pec-deck') {
      const a = MathUtils.lerp(0.05, 1.83, t)
      // Gomito a 90°: chiusura dell'omero, avambraccio verticale sul cuscinetto.
      gomito = locale(lato * (0.25 + 0.38 * Math.cos(a)), 0.07 + 0.38 * Math.sin(a), 0.75)
      mano = gomito.clone().add(new Vector3(0, 0.38, 0))
    } else if (e.tipo === 'dips') {
      mano = new Vector3(lato * 0.43, 1.1, -0.04)
      polo = new Vector3(lato * 0.3, 0, 1)
    } else if (e.tipo === 'push-up') {
      mano = new Vector3(-lato * 0.43, 0.065, 0.53)
      polo = new Vector3(-lato, 0, -0.5)
    } else {
      throw new Error(`Esercizio 3D sconosciuto: ${e.tipo}`)
    }
    return { spalla, mano, gomito: gomito || gomitoTra(spalla, mano, polo) }
  })
  const gambe = [-1, 1].map((lato) => {
    const anca = locale(lato * 0.13, 0, -0.02)
    let ginocchio, caviglia, piede
    if (inPiedi) {
      ginocchio = new Vector3(lato * 0.2, 0.57, -0.03)
      caviglia = new Vector3(lato * 0.24, 0.14, 0)
      piede = new Vector3(lato * 0.24, 0.085, -0.1)
    } else if (e.tipo === 'dips') {
      ginocchio = bacino.clone().add(new Vector3(lato * 0.16, -0.43, 0.12))
      caviglia = bacino.clone().add(new Vector3(lato * 0.16, -0.49, 0.53))
      piede = caviglia.clone().add(new Vector3(0, -0.03, 0.1))
    } else if (e.tipo === 'push-up') {
      ginocchio = locale(lato * 0.16, 0, -0.48)
      caviglia = locale(lato * 0.17, 0, -0.95)
      piede = new Vector3(-lato * 0.17, 0.075, -1.16)
    } else if (seduto) {
      ginocchio = new Vector3(lato * 0.24, 0.58, -0.4)
      caviglia = new Vector3(lato * 0.27, 0.14, -0.55)
      piede = new Vector3(lato * 0.27, 0.085, -0.65)
    } else {
      ginocchio = new Vector3(lato * 0.29, 0.52, -0.8)
      caviglia = new Vector3(lato * 0.34, 0.14, -0.99)
      piede = new Vector3(lato * 0.34, 0.085, -1.08)
    }
    return { anca, ginocchio, caviglia, piede }
  })
  return { bacino, rotazione, braccia, gambe }
}
