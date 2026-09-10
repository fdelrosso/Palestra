import * as THREE from 'three'
import { geometriaTorace, superficieDorso } from './torace3d.js'

// Rilievi aderenti al busto: dorsali a ventaglio, trapezi e fasce lombari.
function muscoloDorso(contorno, centro, lato) {
  const curva = new THREE.CatmullRomCurve3(contorno.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.3)
  const punti = [], indici = [], anelli = 10, lati = 48
  for (let r = 0; r <= anelli; r++) {
    const t = r / anelli
    for (let j = 0; j <= lati; j++) {
      const p = new THREE.Vector3(centro[0], 0, centro[1]).lerp(curva.getPoint(j / lati), t)
      const rilievo = 0.003 + 0.016 * Math.cos(t * Math.PI / 2) ** 1.4
      punti.push(lato * p.x, superficieDorso(p.x, p.z) - rilievo, p.z)
      if (r < anelli && j < lati) {
        const a = r * (lati + 1) + j, b = a + lati + 1
        if (lato > 0) indici.push(a, b, a + 1, a + 1, b, b + 1)
        else indici.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3))
  g.setIndex(indici); g.computeVertexNormals()
  return g
}

export function creaBaseSchiena(e) {
  const modello = new THREE.Group()
  const materiali = {
    corpo: new THREE.MeshStandardMaterial({ color: '#c7d4da', roughness: 0.56, metalness: 0.12 }),
    dorso: new THREE.MeshStandardMaterial({ color: '#da7868', roughness: 0.7 }),
    giunti: new THREE.MeshStandardMaterial({ color: '#899da8', roughness: 0.65 }),
    pantaloni: new THREE.MeshStandardMaterial({ color: '#354a61', roughness: 0.85 }),
    cuscino: new THREE.MeshStandardMaterial({ color: '#293746', roughness: 0.92 }),
    metallo: new THREE.MeshStandardMaterial({ color: '#80939e', metalness: 0.8, roughness: 0.3 }),
    pesi: new THREE.MeshStandardMaterial({ color: '#25303e', metalness: 0.35, roughness: 0.5 }),
    anello: new THREE.MeshStandardMaterial({ color: '#e89873', metalness: 0.5, roughness: 0.4 }),
    cavo: new THREE.MeshStandardMaterial({ color: '#b6c0c9', metalness: 0.4, roughness: 0.65 }),
  }
  const sfera = new THREE.SphereGeometry(1, 24, 16)
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 24)
  const cubo = new THREE.BoxGeometry(1, 1, 1)
  const su = new THREE.Vector3(0, 1, 0)
  function mesh(geo, mat, p = [0, 0, 0], s = [1, 1, 1], parent = modello) {
    const m = new THREE.Mesh(geo, materiali[mat])
    m.position.set(...p); m.scale.set(...s)
    m.castShadow = true; m.receiveShadow = true
    parent.add(m)
    return m
  }
  function segmento(m, a, b, r) {
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.scale.set(r, a.distanceTo(b), r)
    m.quaternion.setFromUnitVectors(su, b.clone().sub(a).normalize())
  }
  function asta(a, b, r = 0.025, mat = 'metallo', parent = modello) {
    const m = mesh(cilindro, mat, [0, 0, 0], [1, 1, 1], parent)
    segmento(m, new THREE.Vector3(...a), new THREE.Vector3(...b), r)
    return m
  }
  const box = (mat, p, s, parent) => mesh(cubo, mat, p, s, parent)
  const ovale = (mat, p, s, parent) => mesh(sfera, mat, p, s, parent)
  const disco = (mat, p, s, parent) => mesh(cilindro, mat, p, s, parent)
  const busto = new THREE.Group(), anatomia = new THREE.Group()
  anatomia.position.set(0, -0.76, 0.35)
  busto.add(anatomia); modello.add(busto)
  mesh(geometriaTorace(), 'corpo', [0, 0, 0], [1, 1, 1], anatomia)
  const regioni = [
    { nome: 'dorsali', centro: [0.13, 0.07], bordo: [[0.035, -0.18], [0.12, -0.08], [0.235, 0.09], [0.269, 0.31], [0.23, 0.32], [0.17, 0.2], [0.052, 0.08]] },
    { nome: 'alto', centro: [0.09, 0.36], bordo: [[0.018, 0.15], [0.12, 0.28], [0.235, 0.36], [0.218, 0.45], [0.055, 0.53], [0.018, 0.57]] },
    { nome: 'lombari', centro: [0.053, -0.1], bordo: [[0.022, -0.27], [0.067, -0.23], [0.085, -0.09], [0.041, 0.065], [0.022, 0.08]] },
  ]
  for (const regione of regioni) {
    const attivo = e.muscoli === 'Lombari' ? regione.nome === 'lombari' : e.muscoli === 'Dorso alto' ? regione.nome === 'alto' : true
    for (const lato of [-1, 1]) mesh(muscoloDorso(regione.bordo, regione.centro, lato), attivo ? 'dorso' : 'corpo', [0, 0, 0], [1, 1, 1], anatomia)
  }
  ovale('pantaloni', [0, 0.76, -0.35], [0.23, 0.13, 0.21], anatomia)
  asta([0, 0.82, 0.5], [0, 0.82, 0.68], 0.075, 'corpo', anatomia)
  ovale('corpo', [0, 0.825, 0.81], [0.125, 0.14, 0.17], anatomia)
  ovale('corpo', [0, 0.955, 0.8], [0.034, 0.024, 0.046], anatomia)
  const arti = [-1, 1].map(() => ({
    spalla: ovale('corpo', [0, 0, 0], [0.105, 0.085, 0.115]),
    braccio: mesh(cilindro, 'corpo'), gomito: ovale('giunti', [0, 0, 0], [0.061, 0.061, 0.061]),
    avambraccio: mesh(cilindro, 'corpo'), mano: ovale('corpo', [0, 0, 0], [0.055, 0.046, 0.065]),
    pollice: ovale('giunti', [0, 0, 0], [0.018, 0.023, 0.027]),
    coscia: mesh(cilindro, 'pantaloni'), ginocchio: ovale('giunti', [0, 0, 0], [0.082, 0.082, 0.082]),
    tibia: mesh(cilindro, 'corpo'), piede: ovale('pesi', [0, 0, 0], [0.09, 0.085, 0.18]),
  }))
  function aggiornaCorpo(p) {
    busto.position.copy(p.bacino); busto.quaternion.copy(p.rotazione)
    for (let i = 0; i < 2; i++) {
      const a = p.braccia[i], g = p.gambe[i], m = arti[i], lato = i === 0 ? -1 : 1
      m.spalla.position.copy(a.spalla); m.spalla.quaternion.copy(p.rotazione)
      m.gomito.position.copy(a.gomito); m.mano.position.copy(a.mano)
      m.mano.rotation.x = e.presa === 'supina' ? Math.PI : 0
      m.mano.rotation.y = e.presa === 'neutra' ? Math.PI / 2 : 0
      m.pollice.position.copy(a.mano).add(new THREE.Vector3(-lato * 0.038, e.presa === 'supina' ? -0.018 : 0.018, e.presa === 'supina' ? 0.037 : -0.037))
      segmento(m.braccio, a.spalla, a.gomito, 0.072)
      segmento(m.avambraccio, a.gomito, a.mano, 0.053)
      segmento(m.coscia, g.anca, g.ginocchio, 0.105)
      segmento(m.tibia, g.ginocchio, g.caviglia, 0.065)
      m.ginocchio.position.copy(g.ginocchio); m.piede.position.copy(g.piede)
    }
  }
  return { modello, asta, box, ovale, disco, segmento, aggiornaCorpo }
}
