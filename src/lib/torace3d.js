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

function superficie(x, z) {
  const [larghezza, profondita] = sezioneA(z)
  return 0.785 + profondita * Math.sqrt(Math.max(0.02, 1 - (x / larghezza) ** 2))
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

export function geometriaPettorale(lato) {
  // Contorno a ventaglio: bordo sternale lungo, attacco stretto verso la spalla.
  const contorno = new THREE.CatmullRomCurve3([
    [0.018, 0, 0.49], [0.105, 0, 0.515], [0.2, 0, 0.49],
    [0.258, 0, 0.425], [0.247, 0, 0.355], [0.227, 0, 0.245],
    [0.163, 0, 0.15], [0.066, 0, 0.133], [0.017, 0, 0.17],
  ].map((p) => new THREE.Vector3(...p)), true, 'catmullrom', 0.35)
  const centro = new THREE.Vector3(0.117, 0, 0.32)
  const punti = []
  const colori = []
  const indici = []
  const anelli = 12
  const lati = 64
  const colore = new THREE.Color('#da7868')
  for (let r = 0; r <= anelli; r++) {
    const t = r / anelli
    for (let j = 0; j <= lati; j++) {
      const bordo = contorno.getPoint(j / lati)
      const p = centro.clone().lerp(bordo, t)
      // Un rilievo basso con raccordo morbido; non una sfera appoggiata al busto.
      const rilievo = 0.003 + 0.035 * Math.cos(t * Math.PI / 2) ** 1.4
      punti.push(lato * p.x, superficie(p.x, p.z) + rilievo, p.z)
      // Fibre appena accennate, convergenti verso l'omero, senza texture.
      const angolo = Math.atan2(p.z - 0.42, p.x - 0.285)
      const fibre = Math.cos(angolo * 85) * 0.022 * Math.sin(Math.PI * t)
      const c = colore.clone().multiplyScalar(0.97 + fibre + 0.035 * (1 - t))
      colori.push(c.r, c.g, c.b)
      if (r < anelli && j < lati) {
        const a = r * (lati + 1) + j
        const b = a + lati + 1
        if (lato > 0) indici.push(a, b, a + 1, a + 1, b, b + 1)
        else indici.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3))
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3))
  geometria.setIndex(indici)
  geometria.computeVertexNormals()
  return geometria
}
