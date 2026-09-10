import * as THREE from 'three'
import { geometriaPettorale, geometriaTorace } from './torace3d.js'
import { ORIGINE_BUSTO, posaPetto } from './posePetto3d.js'

// Un solo modello e un solo set di geometrie per l'esercizio aperto.
export function creaScenaPetto(e) {
  const modello = new THREE.Group()
  const materiali = {
    corpo: new THREE.MeshStandardMaterial({ color: '#c7d4da', roughness: 0.56, metalness: 0.12 }),
    giunti: new THREE.MeshStandardMaterial({ color: '#899da8', roughness: 0.65 }),
    petto: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }),
    pantaloni: new THREE.MeshStandardMaterial({ color: '#354a61', roughness: 0.85 }),
    cuscino: new THREE.MeshStandardMaterial({ color: '#293746', roughness: 0.92 }),
    imbottitura: new THREE.MeshStandardMaterial({ color: '#4c6579', roughness: 0.92 }),
    metallo: new THREE.MeshStandardMaterial({ color: '#80939e', metalness: 0.8, roughness: 0.3 }),
    pesi: new THREE.MeshStandardMaterial({ color: '#25303e', metalness: 0.35, roughness: 0.5 }),
    anello: new THREE.MeshStandardMaterial({ color: '#e89873', metalness: 0.5, roughness: 0.4 }),
    cavo: new THREE.MeshStandardMaterial({ color: '#b6c0c9', metalness: 0.5, roughness: 0.65 }),
  }
  const sfera = new THREE.SphereGeometry(1, 24, 16)
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 24)
  const cubo = new THREE.BoxGeometry(1, 1, 1)
  const su = new THREE.Vector3(0, 1, 0)
  const v = (p) => new THREE.Vector3(...p)
  function mesh(geometria, materiale, posizione = [0, 0, 0], scala = [1, 1, 1], parent = modello) {
    const m = new THREE.Mesh(geometria, materiali[materiale])
    m.position.set(...posizione)
    m.scale.set(...scala)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function segmento(m, a, b, r) {
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.scale.set(r, a.distanceTo(b), r)
    m.quaternion.setFromUnitVectors(su, b.clone().sub(a).normalize())
  }
  function asta(a, b, r, materiale = 'metallo', parent = modello) {
    const m = mesh(cilindro, materiale, [0, 0, 0], [1, 1, 1], parent)
    segmento(m, v(a), v(b), r)
    return m
  }
  const box = (mat, p, s, parent) => mesh(cubo, mat, p, s, parent)
  const ovale = (mat, p, s, parent) => mesh(sfera, mat, p, s, parent)
  const seduto = ['chest-press', 'pec-deck'].includes(e.tipo)
  const panca = ['spinte', 'croci', 'pullover'].includes(e.tipo)

  if (panca) {
    // Seduta fissa, schienale inclinabile: i piedi rimangono a terra.
    box('cuscino', [0, 0.595, -0.59], [0.43, 0.11, 0.48])
    const schienale = new THREE.Group()
    schienale.position.set(0, 0.595, -0.35)
    schienale.rotation.x = -THREE.MathUtils.degToRad(e.inclinazione)
    modello.add(schienale)
    box('cuscino', [0, 0, 0.68], [0.43, 0.11, 1.36], schienale)
    for (const z of [-0.56, 0.72]) {
      const a = THREE.MathUtils.degToRad(e.inclinazione)
      const altezza = z > 0 ? 0.595 + Math.tan(a) * (z + 0.35) - 0.055 / Math.cos(a) : 0.54
      box('metallo', [0, (altezza + 0.04) / 2, z], [0.09, altezza - 0.04, 0.09])
      box('pesi', [0, 0.045, z], [0.85, 0.09, 0.22])
    }
    box('metallo', [0, 0.34, 0.08], [0.07, 0.08, 1.35])
    if (e.inclinazione > 0) asta([0, 0.35, 0.65], [0, 0.99, 0.45], 0.04)
    if (e.inclinazione < 0) {
      // Rullo di fermo per la panca declinata.
      asta([-0.35, 0.4, -0.95], [0.35, 0.4, -0.95], 0.08, 'cuscino')
    }
    if (e.attrezzo === 'bilanciere') {
      for (const x of [-0.77, 0.77]) {
        const h = e.inclinazione > 0 ? 1.62 : e.inclinazione < 0 ? 1.02 : 1.3
        box('metallo', [x, h / 2, 0.72], [0.065, h, 0.065])
        box('pesi', [x, 0.04, 0.62], [0.32, 0.08, 0.65])
        box('metallo', [x, h - 0.1, 0.65], [0.09, 0.055, 0.2])
      }
    }
  }
  if (seduto) {
    box('cuscino', [0, 0.54, -0.08], [0.47, 0.12, 0.6])
    const schienale = new THREE.Group()
    schienale.position.set(0, 0.6, 0.23)
    schienale.rotation.x = -THREE.MathUtils.degToRad(e.inclinazione)
    modello.add(schienale)
    box('cuscino', [0, 0, 0.5], [0.43, 0.1, 1], schienale)
    box('metallo', [0, 0.27, 0], [0.12, 0.5, 0.12])
    box('pesi', [0, 0.04, 0.15], [1.6, 0.08, 1.2])
    for (const x of [-0.75, 0.75]) box('metallo', [x, 1, 0.5], [0.075, 2, 0.075])
    box('metallo', [0, 1.98, 0.5], [1.6, 0.09, 0.09])
    for (let i = 0; i < 7; i++) box('pesi', [0, 0.12 + i * 0.08, 0.63], [0.44, 0.06, 0.25])
  }
  if (e.tipo === 'cavi') {
    for (const lato of [-1, 1]) {
      box('metallo', [lato * 1.35, 1.25, 0.5], [0.08, 2.5, 0.08])
      box('pesi', [lato * 1.35, 0.04, 0.45], [0.5, 0.08, 0.75])
      for (let i = 0; i < 7; i++) box('pesi', [lato * 1.35, 0.14 + i * 0.075, 0.58], [0.32, 0.055, 0.22])
      const puleggia = mesh(cilindro, 'anello', [lato * 1.35, e.altezzaCavo, 0.4], [0.065, 0.04, 0.065])
      puleggia.rotation.z = Math.PI / 2
    }
    box('metallo', [0, 2.49, 0.5], [2.78, 0.08, 0.08])
  }
  if (e.attrezzo === 'smith') {
    for (const x of [-1.18, 1.18]) {
      asta([x, 0.06, 0.3], [x, 2.2, 0.3], 0.035)
      box('pesi', [x, 0.045, 0.3], [0.42, 0.09, 1.35])
      box('metallo', [x, 1.1, 0.65], [0.09, 2.2, 0.09])
    }
    box('metallo', [0, 2.2, 0.3], [2.5, 0.08, 0.5])
  }
  if (e.tipo === 'dips') {
    for (const x of [-0.43, 0.43]) {
      asta([x, 1.07, -0.52], [x, 1.07, 0.62], 0.034)
      for (const z of [-0.45, 0.5]) asta([x, 0.05, z], [x, 1.07, z], 0.032)
      box('pesi', [x, 0.035, 0.05], [0.38, 0.07, 1.25])
    }
  }
  if (e.tipo === 'push-up') box('cuscino', [0, 0.015, -0.15], [1.3, 0.025, 2.65])

  const busto = new THREE.Group()
  const anatomia = new THREE.Group()
  anatomia.position.copy(ORIGINE_BUSTO).negate()
  busto.add(anatomia)
  modello.add(busto)
  mesh(geometriaTorace(), 'corpo', [0, 0, 0], [1, 1, 1], anatomia)
  ovale('pantaloni', [0, 0.76, -0.35], [0.23, 0.13, 0.21], anatomia)
  mesh(cilindro, 'corpo', [0, 0.82, 0.59], [0.075, 0.18, 0.075], anatomia).rotation.x = Math.PI / 2
  ovale('corpo', [0, 0.825, 0.81], [0.125, 0.14, 0.17], anatomia).name = 'testa'
  ovale('corpo', [0, 0.955, 0.8], [0.034, 0.024, 0.046], anatomia)
  for (const lato of [-1, 1]) mesh(geometriaPettorale(lato), 'petto', [0, 0, 0], [1, 1, 1], anatomia)
  const braccia = [-1, 1].map(() => ({
    spalla: ovale('corpo', [0, 0, 0], [0.105, 0.085, 0.115]),
    braccio: mesh(cilindro, 'corpo'),
    gomito: ovale('giunti', [0, 0, 0], [0.061, 0.061, 0.061]),
    avambraccio: mesh(cilindro, 'corpo'),
    mano: ovale('corpo', [0, 0, 0], [0.057, 0.05, 0.065]),
  }))
  const gambe = [-1, 1].map(() => ({
    coscia: mesh(cilindro, 'pantaloni'),
    ginocchio: ovale('giunti', [0, 0, 0], [0.082, 0.082, 0.082]),
    tibia: mesh(cilindro, 'corpo'),
    piede: ovale('pesi', [0, 0, 0], [0.09, 0.085, 0.18]),
  }))

  function peso(manubrio = false) {
    const g = new THREE.Group()
    modello.add(g)
    const lunghezza = manubrio ? 0.37 : 2.45
    mesh(cilindro, 'metallo', [0, 0, 0], [0.022, lunghezza, 0.022], g).rotation.z = Math.PI / 2
    for (const lato of [-1, 1]) {
      for (const [x, r, larghezza, mat] of manubrio
        ? [[0.135, 0.115, 0.085, 'pesi'], [0.185, 0.045, 0.015, 'anello']]
        : [[0.95, 0.265, 0.085, 'pesi'], [1.04, 0.22, 0.065, 'pesi'], [1.09, 0.07, 0.025, 'anello']]) {
        mesh(cilindro, mat, [lato * x, 0, 0], [r, larghezza, r], g).rotation.z = Math.PI / 2
      }
    }
    return g
  }
  const bilanciere = ['bilanciere', 'smith'].includes(e.attrezzo) ? peso() : null
  const manubri = e.attrezzo === 'manubri' ? [peso(true), peso(true)] : []
  const pullover = e.tipo === 'pullover' ? peso(true) : null
  if (pullover) {
    pullover.name = 'pullover-manubrio'
    pullover.rotation.z = Math.PI / 2
    pullover.scale.set(0.85, 0.9, 0.9)
    braccia.forEach((b) => b.mano.scale.set(0.055, 0.028, 0.065))
  }
  const cavi = e.tipo === 'cavi' ? [-1, 1].map(() => mesh(cilindro, 'cavo')) : []
  const maniglie = ['cavi', 'chest-press'].includes(e.tipo)
    ? [-1, 1].map(() => mesh(cilindro, 'anello')) : []
  const leve = e.tipo === 'chest-press' ? [-1, 1].map(() => mesh(cilindro, 'metallo')) : []
  // Bracci a L rigidi: il perno è sopra la spalla e i cuscinetti ruotano
  // insieme all'avambraccio, senza aste che cambiano lunghezza.
  const bracciPec = e.tipo === 'pec-deck' ? [-1, 1].map((lato, i) => {
    const spalla = posaPetto(e, 0).braccia[i].spalla
    const g = new THREE.Group()
    g.name = `pec-deck-braccio-${i}`
    g.position.set(spalla.x, 1.98, spalla.z)
    modello.add(g)
    asta([spalla.x, 1.98, 0.5], [spalla.x, 1.98, spalla.z], 0.035)
    mesh(cilindro, 'anello', [spalla.x, 1.98, spalla.z], [0.065, 0.09, 0.065])
    asta([0, 0, 0], [lato * 0.38, 0, -0.13], 0.028, 'metallo', g)
    asta([lato * 0.38, 0, -0.13], [lato * 0.38, -0.52, -0.13], 0.024, 'metallo', g)
    box('imbottitura', [lato * 0.38, -0.38, -0.085], [0.15, 0.28, 0.075], g)
    asta([lato * 0.38, -0.16, -0.13], [lato * 0.38, -0.16, 0], 0.017, 'metallo', g)
    asta([lato * 0.38, -0.225, 0], [lato * 0.38, -0.095, 0], 0.024, 'anello', g)
    return g
  }) : []
  const cursori = e.attrezzo === 'smith'
    ? [-1, 1].map((lato) => box('anello', [lato * 1.18, 0, 0.3], [0.09, 0.14, 0.09])) : []

  function aggiorna(fase) {
    const p = posaPetto(e, fase)
    busto.position.copy(p.bacino)
    busto.quaternion.copy(p.rotazione)
    for (let i = 0; i < 2; i++) {
      const a = p.braccia[i], b = braccia[i], g = p.gambe[i], m = gambe[i]
      b.spalla.position.copy(a.spalla)
      b.spalla.quaternion.copy(p.rotazione)
      b.gomito.position.copy(a.gomito)
      b.mano.position.copy(a.mano)
      segmento(b.braccio, a.spalla, a.gomito, 0.072)
      segmento(b.avambraccio, a.gomito, a.mano, 0.053)
      segmento(m.coscia, g.anca, g.ginocchio, 0.105)
      segmento(m.tibia, g.ginocchio, g.caviglia, 0.065)
      m.ginocchio.position.copy(g.ginocchio)
      m.piede.position.copy(g.piede)
      if (manubri[i]) {
        manubri[i].position.copy(a.mano)
        manubri[i].rotation.y = e.tipo === 'croci' ? Math.PI / 2 : 0
      }
      const lato = i === 0 ? -1 : 1
      if (cavi[i]) segmento(cavi[i], v([lato * 1.35, e.altezzaCavo, 0.4]), a.mano, 0.004)
      if (maniglie[i]) segmento(maniglie[i], a.mano.clone().add(v([0, -0.065, 0])), a.mano.clone().add(v([0, 0.065, 0])), 0.024)
      if (leve[i]) {
        segmento(leve[i], v([lato * 0.75, 1.94, 0.5]), a.mano, 0.026)
      }
      if (bracciPec[i]) {
        const direzione = a.gomito.clone().sub(a.spalla)
        bracciPec[i].rotation.y = lato * Math.atan2(-direzione.z, lato * direzione.x)
      }
      if (cursori[i]) cursori[i].position.y = a.mano.y
    }
    if (bilanciere) bilanciere.position.copy(p.braccia[0].mano).add(p.braccia[1].mano).multiplyScalar(0.5)
    // I palmi sostengono la faccia inferiore del disco superiore.
    if (pullover) pullover.position.copy(p.braccia[0].mano).add(p.braccia[1].mano).multiplyScalar(0.5).add(v([0, -0.05, 0]))
  }
  aggiorna(0)
  const bersaglio = e.tipo === 'cavi' ? [0, 1.2, 0]
    : e.tipo === 'dips' ? [0, 1.02, 0]
      : seduto ? [0, 1.0, 0] : e.tipo === 'pullover' ? [0, 0.85, 0.2] : [0, 0.75, 0]
  const camera = e.tipo === 'cavi' ? [3.7, 2.8, -4.5]
    : e.tipo === 'pec-deck' ? [2.3, 2.35, -4.3]
      : e.tipo === 'pullover' ? [3.6, 2.2, 1.8]
    : seduto || e.tipo === 'dips' ? [3.2, 2.5, -4]
      : e.tipo === 'push-up' ? [3.3, 2.4, 3] : [3.2, 2.8, -3.8]
  return { modello, aggiorna, bersaglio, camera }
}
