import * as THREE from 'three'

// Sezioni del busto dalla vita alle clavicole: z, larghezza, profondità.
const sezioni = [
  [-0.34, 0.155, 0.085], [-0.24, 0.175, 0.105], [-0.1, 0.2, 0.12],
  [0.06, 0.245, 0.145], [0.23, 0.278, 0.157], [0.39, 0.285, 0.145],
  [0.49, 0.25, 0.12], [0.57, 0.15, 0.085], [0.6, 0.07, 0.055],
]

function sezioneA(z) {
  for (let i = 1; i < sezioni.length; i++) {
    if (z <= sezioni[i][0]) {
      const a = sezioni[i - 1]
      const b = sezioni[i]
      const t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1)
      return [THREE.MathUtils.lerp(a[1], b[1], t), THREE.MathUtils.lerp(a[2], b[2], t)]
    }
  }
  return sezioni.at(-1).slice(1)
}

export function superficieDorso(x, z) {
  const [larghezza, profondita] = sezioneA(z)
  return 0.785 - profondita * 0.8 * Math.sqrt(Math.max(0.02, 1 - (x / larghezza) ** 2))
}

export function geometriaTorace() {
  const punti = []
  const indici = []
  const anelli = 40
  const lati = 48
  for (let r = 0; r <= anelli; r++) {
    const z = THREE.MathUtils.lerp(sezioni[0][0], sezioni.at(-1)[0], r / anelli)
    const [larghezza, profondita] = sezioneA(z)
    for (let j = 0; j <= lati; j++) {
      const angolo = j / lati * Math.PI * 2
      const fronte = Math.cos(angolo)
      punti.push(larghezza * Math.sin(angolo), 0.785 + profondita * fronte * (fronte < 0 ? 0.8 : 1), z)
      if (r < anelli && j < lati) {
        const a = r * (lati + 1) + j
        const b = a + lati + 1
        indici.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3))
  geometria.setIndex(indici)
  geometria.computeVertexNormals()
  return geometria
}
