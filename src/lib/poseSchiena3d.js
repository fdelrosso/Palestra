import { MathUtils, Quaternion, Vector3 } from 'three'

const X = new Vector3(1, 0, 0)
const v = (x, y, z) => new Vector3(x, y, z)
function articolazione(a, b, lunghezzaA, lunghezzaB, polo) {
  const asse = b.clone().sub(a), d = asse.length()
  if (d >= lunghezzaA + lunghezzaB || d <= Math.abs(lunghezzaA - lunghezzaB)) {
    throw new Error(`Arto irraggiungibile: distanza ${d.toFixed(3)}`)
  }
  asse.normalize()
  const lungo = (lunghezzaA ** 2 - lunghezzaB ** 2 + d ** 2) / (2 * d)
  const fuori = polo.clone().addScaledVector(asse, -polo.dot(asse)).normalize()
  return a.clone().addScaledVector(asse, lungo).addScaledVector(fuori, Math.sqrt(lunghezzaA ** 2 - lungo ** 2))
}

export function posaSchiena(e, fase) {
  const t = (1 - Math.cos(fase * Math.PI * 2)) / 2
  const bacino = v(0, 1.02, 0.12)
  let angolo = 90
  switch (e.tipo) {
    case 'trazioni': bacino.set(0, 1.23 + 0.5 * t, 0.12); break
    case 'lat': bacino.set(0, 0.7, 0.12); angolo = 90; break
    case 'pulley': bacino.set(0, 0.58, 0.22); angolo = 95; break
    case 'rematore': case 't-bar': bacino.set(0, 1.02, 0.2); angolo = 150; break
    case 'pendlay': bacino.set(0, 0.79, 0.33); angolo = 175; break
    case 'rematore-singolo': bacino.set(0, 1.01, 0.4); angolo = 160; break
    case 'rematore-macchina': bacino.set(0, 0.68, 0.12); angolo = 100; break
    case 'pullover-cavi': angolo = 100; break
    case 'stacco': bacino.set(0, MathUtils.lerp(0.625, 1.02, t), MathUtils.lerp(0.33, 0.12, t)); angolo = MathUtils.lerp(145, 90, t); break
    case 'rumeno': bacino.set(0, MathUtils.lerp(0.96, 1.02, t), MathUtils.lerp(0.45, 0.12, t)); angolo = MathUtils.lerp(155, 90, t); break
    case 'hyperextension': bacino.set(0, 0.87, 0.05); angolo = MathUtils.lerp(200, 135, t); break
    case 'face-pull': break
    default: throw new Error(`Esercizio schiena sconosciuto: ${e.tipo}`)
  }
  const rotazione = new Quaternion().setFromAxisAngle(X, -MathUtils.degToRad(angolo))
  const locale = (x, y, z) => v(x, y, z).applyQuaternion(rotazione).add(bacino)
  const braccia = [-1, 1].map((lato) => {
    const spalla = locale(lato * 0.25, 0.07, 0.75)
    let mano
    let polo = v(lato, 0, 0.5)
    switch (e.tipo) {
      case 'trazioni': mano = v(lato * e.larghezza, 2.65, -0.18); break
      case 'lat': mano = v(lato * e.larghezza, MathUtils.lerp(2.04, 1.42, t), -0.32); break
      case 'pulley': mano = v(lato * 0.13, MathUtils.lerp(1.15, 0.96, t), MathUtils.lerp(-0.5, -0.03, t)); break
      case 'rematore': mano = v(lato * 0.35, MathUtils.lerp(0.76, 1.15, t), MathUtils.lerp(-0.55, -0.12, t)); break
      case 'pendlay': mano = v(lato * 0.35, MathUtils.lerp(0.265, 0.77, t), MathUtils.lerp(-0.46, -0.02, t)); break
      case 'rematore-singolo':
        mano = lato < 0 ? v(-0.25, 0.54, -0.55) : v(0.32, MathUtils.lerp(0.49, 1.05, t), MathUtils.lerp(-0.42, 0.12, t))
        break
      case 't-bar': {
        const a = MathUtils.degToRad(MathUtils.lerp(20, 34, t))
        mano = v(lato * 0.15, 0.12 + 1.8 * Math.sin(a), 1.25 - 1.8 * Math.cos(a))
        break
      }
      case 'rematore-macchina': mano = v(lato * 0.31, MathUtils.lerp(1.21, 1.08, t), MathUtils.lerp(-0.77, -0.25, t)); break
      case 'stacco': case 'rumeno': {
        // Braccia quasi distese: l'altezza del carico segue spalle e anca.
        const x = lato * 0.34, z = -0.2
        const discesa = Math.sqrt(0.748 ** 2 - (x - spalla.x) ** 2 - (z - spalla.z) ** 2)
        mano = v(x, spalla.y - discesa, z)
        polo = v(lato * 0.25, 0, 1)
        break
      }
      case 'pullover-cavi': {
        const a = MathUtils.lerp(0.4, -1.2, t)
        mano = spalla.clone().add(v(-lato * 0.1, 0.72 * Math.sin(a), -0.72 * Math.cos(a)))
        break
      }
      case 'face-pull':
        mano = v(lato * MathUtils.lerp(0.16, 0.42, t), MathUtils.lerp(1.7, 2.1, t), MathUtils.lerp(-0.66, -0.18, t))
        polo = v(lato, 0.3, 0.2)
        break
      case 'hyperextension':
        mano = locale(-lato * 0.16, 0.22, 0.58)
        polo = v(lato, 1, -0.5).applyQuaternion(rotazione)
        break
    }
    return { spalla, mano, gomito: articolazione(spalla, mano, 0.38, 0.38, polo) }
  })
  const gambe = [-1, 1].map((lato) => {
    const anca = locale(lato * 0.13, 0, -0.02)
    let ginocchio, caviglia, piede
    if (e.tipo === 'trazioni') {
      ginocchio = bacino.clone().add(v(lato * 0.17, -0.43, 0.12))
      caviglia = bacino.clone().add(v(lato * 0.17, -0.7, 0.42))
      piede = caviglia.clone().add(v(0, -0.05, -0.07))
    } else if (['lat', 'rematore-macchina'].includes(e.tipo)) {
      caviglia = v(lato * 0.27, 0.14, -0.49)
      piede = v(lato * 0.27, 0.085, -0.59)
      ginocchio = articolazione(anca, caviglia, 0.48, 0.45, v(0, 1, -1))
    } else if (e.tipo === 'pulley') {
      caviglia = v(lato * 0.22, 0.19, -0.55)
      piede = v(lato * 0.22, 0.13, -0.65)
      ginocchio = articolazione(anca, caviglia, 0.48, 0.45, v(0, 1, 0))
    } else if (e.tipo === 'rematore-singolo' && lato < 0) {
      ginocchio = v(-0.17, 0.59, 0.52)
      caviglia = v(-0.17, 0.59, 0.96)
      piede = v(-0.17, 0.6, 1.06)
    } else {
      const laterale = e.tipo === 'rematore-singolo' ? 0.36 : 0.22
      const z = e.tipo === 'hyperextension' ? 0.58 : e.tipo === 'rematore-singolo' ? 0.5 : 0.22
      caviglia = v(lato * laterale, 0.14, z)
      piede = v(lato * laterale, 0.085, z - 0.1)
      ginocchio = articolazione(anca, caviglia, 0.48, 0.45, v(0, 0, -1))
    }
    return { anca, ginocchio, caviglia, piede }
  })
  return { bacino, rotazione, braccia, gambe }
}
