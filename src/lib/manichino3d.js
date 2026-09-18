import * as THREE from 'three'
import { geometriaTorace } from './torace3d.js'
import { COSCIA, OMERO, TIBIA } from './corpo3d.js'

// Il manichino delle scene di gambe e spalle. Busto, testa e colori sono quelli
// di petto e schiena; in più ha i muscoli degli arti, che si accendono secondo
// l'esercizio: rosso pieno i principali, rosa quelli che aiutano.
//
// Ogni segmento (braccio, coscia, tibia) è un gruppo che parte dal giunto e
// scende lungo il suo -z: dentro ci sono l'osso e i ventri muscolari, disegnati
// una volta sola e poi solo orientati. L'orientamento è la rotazione più corta
// dalla posa a riposo (arto disteso lungo il busto) alla posa vera, applicata
// sopra quella del busto: così il deltoide laterale finisce in cima al braccio
// quando il braccio si apre, e i polpacci guardano in su da proni.
//
// Nomi dei muscoli che i cataloghi possono accendere: quadricipiti, femorali,
// glutei, polpacci, adduttori, abduttori (medio gluteo), deltoideAnteriore,
// deltoideLaterale, deltoidePosteriore, trapezio.

export function creaManichino({ principali = [], secondari = [] } = {}) {
  const modello = new THREE.Group()
  const materiali = {
    corpo: new THREE.MeshStandardMaterial({ color: '#c7d4da', roughness: 0.56, metalness: 0.12 }),
    muscolo: new THREE.MeshStandardMaterial({ color: '#da7868', roughness: 0.7 }),
    secondario: new THREE.MeshStandardMaterial({ color: '#e0aa9c', roughness: 0.72 }),
    giunti: new THREE.MeshStandardMaterial({ color: '#899da8', roughness: 0.65 }),
    pantaloni: new THREE.MeshStandardMaterial({ color: '#354a61', roughness: 0.85 }),
    scarpe: new THREE.MeshStandardMaterial({ color: '#25303e', metalness: 0.35, roughness: 0.5 }),
    cuscino: new THREE.MeshStandardMaterial({ color: '#293746', roughness: 0.92 }),
    imbottitura: new THREE.MeshStandardMaterial({ color: '#4c6579', roughness: 0.92 }),
    metallo: new THREE.MeshStandardMaterial({ color: '#80939e', metalness: 0.8, roughness: 0.3 }),
    pesi: new THREE.MeshStandardMaterial({ color: '#25303e', metalness: 0.35, roughness: 0.5 }),
    anello: new THREE.MeshStandardMaterial({ color: '#e89873', metalness: 0.5, roughness: 0.4 }),
    cavo: new THREE.MeshStandardMaterial({ color: '#b6c0c9', metalness: 0.4, roughness: 0.65 }),
  }
  const tono = (nome, riposo = 'corpo') => (principali.includes(nome) ? 'muscolo' : secondari.includes(nome) ? 'secondario' : riposo)
  const sfera = new THREE.SphereGeometry(1, 24, 16)
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 24)
  const cubo = new THREE.BoxGeometry(1, 1, 1)
  const Y = new THREE.Vector3(0, 1, 0)
  const vec = (p) => (p.isVector3 ? p : new THREE.Vector3(...p))

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
    m.scale.set(r, Math.max(a.distanceTo(b), 1e-6), r)
    m.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize())
  }
  function asta(a, b, r = 0.025, materiale = 'metallo', parent = modello) {
    const m = mesh(cilindro, materiale, [0, 0, 0], [1, 1, 1], parent)
    segmento(m, vec(a), vec(b), r)
    return m
  }
  const box = (mat, p, s, parent) => mesh(cubo, mat, p, s, parent)
  const ovale = (mat, p, s, parent) => mesh(sfera, mat, p, s, parent)
  const disco = (mat, p, s, parent) => mesh(cilindro, mat, p, s, parent)
  function gruppo(parent = modello) {
    const g = new THREE.Group()
    parent.add(g)
    return g
  }
  // Un osso lungo -z dentro il gruppo del segmento.
  const osso = (g, lunghezza, r, mat = 'corpo') => {
    disco(mat, [0, 0, -lunghezza / 2], [r, lunghezza, r], g).rotation.x = Math.PI / 2
  }

  // ---- Busto ----------------------------------------------------------------
  const busto = gruppo()
  const anatomia = gruppo(busto)
  anatomia.position.set(0, -0.76, 0.35)
  mesh(geometriaTorace(), 'corpo', [0, 0, 0], [1, 1, 1], anatomia)
  ovale('pantaloni', [0, 0, 0], [0.23, 0.13, 0.21], busto)
  disco('corpo', [0, 0.06, 0.94], [0.075, 0.18, 0.075], busto).rotation.x = Math.PI / 2
  ovale('corpo', [0, 0.065, 1.16], [0.125, 0.14, 0.17], busto).name = 'testa'
  ovale('corpo', [0, 0.195, 1.15], [0.034, 0.024, 0.046], busto)
  const trapezi = []
  for (const lato of [-1, 1]) {
    // Glutei sul retro del bacino, medio gluteo (gli abduttori) sul fianco.
    ovale(tono('glutei', 'pantaloni'), [lato * 0.1, -0.085, -0.02], [0.11, 0.075, 0.12], busto).name = `gluteo-${lato}`
    ovale(tono('abduttori', 'pantaloni'), [lato * 0.19, -0.02, 0.07], [0.065, 0.085, 0.09], busto)
    // Trapezio alto: la pendenza tra collo e spalla.
    const t = ovale(tono('trapezio'), [lato * 0.12, -0.035, 0.87], [0.12, 0.07, 0.05], busto)
    t.rotation.y = lato * 0.3
    trapezi.push(t)
  }
  // Trapezio medio, tra le scapole.
  ovale(tono('trapezio'), [0, -0.075, 0.68], [0.12, 0.04, 0.15], busto)

  // ---- Arti -----------------------------------------------------------------
  const arti = [-1, 1].map((lato) => {
    const omero = gruppo()
    osso(omero, OMERO, 0.068)
    ovale(tono('deltoideAnteriore'), [lato * 0.015, 0.052, -0.06], [0.062, 0.05, 0.1], omero)
    ovale(tono('deltoideLaterale'), [lato * 0.062, 0, -0.065], [0.05, 0.064, 0.1], omero)
    ovale(tono('deltoidePosteriore'), [lato * 0.015, -0.052, -0.06], [0.062, 0.05, 0.1], omero)
    const coscia = gruppo()
    osso(coscia, COSCIA, 0.092)
    ovale(tono('quadricipiti'), [0, 0.04, -0.26], [0.088, 0.07, 0.2], coscia)
    ovale(tono('quadricipiti'), [-lato * 0.045, 0.035, -0.4], [0.055, 0.05, 0.07], coscia)
    ovale(tono('femorali'), [0, -0.04, -0.25], [0.082, 0.065, 0.19], coscia)
    ovale(tono('adduttori'), [-lato * 0.05, 0, -0.13], [0.06, 0.07, 0.15], coscia)
    const tibia = gruppo()
    osso(tibia, TIBIA, 0.058)
    ovale(tono('polpacci'), [0, -0.04, -0.14], [0.066, 0.058, 0.13], tibia)
    ovale(tono('polpacci'), [0, -0.03, -0.27], [0.054, 0.045, 0.08], tibia)
    return {
      omero, coscia, tibia,
      spalla: ovale('corpo', [0, 0, 0], [0.1, 0.085, 0.1]),
      gomito: ovale('giunti', [0, 0, 0], [0.061, 0.061, 0.061]),
      avambraccio: mesh(cilindro, 'corpo'),
      mano: ovale('corpo', [0, 0, 0], [0.055, 0.05, 0.062]),
      ginocchio: ovale('giunti', [0, 0, 0], [0.078, 0.078, 0.078]),
      caviglia: ovale('giunti', [0, 0, 0], [0.05, 0.05, 0.05]),
      piede: ovale('scarpe', [0, 0, 0], [1, 1, 1]),
      dita: ovale('scarpe', [0, 0, 0], [1, 1, 1]),
    }
  })

  const riposo = new THREE.Vector3()
  const oscillazione = new THREE.Quaternion()
  function orienta(g, da, a, rotazione) {
    g.position.copy(da)
    oscillazione.setFromUnitVectors(riposo, a.clone().sub(da).normalize())
    g.quaternion.multiplyQuaternions(oscillazione, rotazione)
  }
  const base = new THREE.Matrix4()
  function orientaPiede(m, dietro, davanti, su, spessore, larghezza) {
    const avanti = davanti.clone().sub(dietro)
    const lunghezza = avanti.length()
    avanti.normalize()
    const s = su.clone().addScaledVector(avanti, -su.dot(avanti)).normalize()
    const fianco = new THREE.Vector3().crossVectors(s, avanti)
    base.makeBasis(fianco, s, avanti)
    m.quaternion.setFromRotationMatrix(base)
    m.position.copy(dietro).add(davanti).multiplyScalar(0.5).addScaledVector(s, spessore * 0.8)
    m.scale.set(larghezza, spessore, lunghezza / 2 + 0.02)
  }

  function aggiornaCorpo(p) {
    busto.position.copy(p.bacino)
    busto.quaternion.copy(p.rotazione)
    riposo.set(0, 0, -1).applyQuaternion(p.rotazione)
    // Le scapole che salgono gonfiano il trapezio alto.
    const su = p.scapole?.su || 0
    for (const t of trapezi) t.scale.z = 0.05 + su * 0.7
    for (let i = 0; i < 2; i++) {
      const a = p.braccia[i], g = p.gambe[i], m = arti[i]
      m.spalla.position.copy(a.spalla)
      m.spalla.quaternion.copy(p.rotazione)
      orienta(m.omero, a.spalla, a.gomito, p.rotazione)
      m.gomito.position.copy(a.gomito)
      segmento(m.avambraccio, a.gomito, a.mano, 0.053)
      m.mano.position.copy(a.mano)
      orienta(m.coscia, g.anca, g.ginocchio, p.rotazione)
      orienta(m.tibia, g.ginocchio, g.caviglia, p.rotazione)
      m.ginocchio.position.copy(g.ginocchio)
      m.caviglia.position.copy(g.caviglia)
      const su = g.caviglia.clone().sub(g.tallone)
      orientaPiede(m.piede, g.tallone, g.pianta, su, 0.045, 0.052)
      const dita = g.punta.clone().sub(g.pianta).normalize()
      orientaPiede(m.dita, g.pianta.clone().addScaledVector(dita, -0.02), g.punta, su, 0.026, 0.05)
    }
  }

  // ---- Attrezzi comuni ------------------------------------------------------
  // Bilanciere lungo x, centrato nell'origine del gruppo.
  function bilanciere(raggio = 0.265, lunghezza = 2.3) {
    const g = gruppo()
    disco('metallo', [0, 0, 0], [0.022, lunghezza, 0.022], g).rotation.z = Math.PI / 2
    for (const lato of [-1, 1]) {
      for (const [x, r, spessore, mat] of [[0.87, raggio, 0.085, 'pesi'], [0.95, raggio * 0.83, 0.065, 'pesi'], [1.0, 0.07, 0.025, 'anello']]) {
        disco(mat, [lato * x, 0, 0], [r, spessore, r], g).rotation.z = Math.PI / 2
      }
    }
    return g
  }
  // Manubrio con l'impugnatura lungo x.
  function manubrio() {
    const g = gruppo()
    disco('metallo', [0, 0, 0], [0.022, 0.37, 0.022], g).rotation.z = Math.PI / 2
    for (const lato of [-1, 1]) {
      disco('pesi', [lato * 0.135, 0, 0], [0.105, 0.085, 0.105], g).rotation.z = Math.PI / 2
      disco('anello', [lato * 0.185, 0, 0], [0.045, 0.015, 0.045], g).rotation.z = Math.PI / 2
    }
    return g
  }
  // Colonna con il pacco pesi, larga lungo x, centrata in (x, z). Le piastre di
  // sopra (`mobili`) stanno in un gruppo a parte: la scena lo alza quando il
  // carico sale, così il pacco si muove con la leva e non per conto suo.
  function pacco(x, z, altezza = 2.2, piastre = 9, mobili = 0) {
    for (const dx of [-0.28, 0.28]) box('metallo', [x + dx, altezza / 2, z], [0.055, altezza, 0.06])
    box('pesi', [x, 0.04, z], [0.85, 0.08, 0.6])
    box('metallo', [x, altezza, z], [0.62, 0.065, 0.1])
    const su = gruppo()
    for (let i = 0; i < piastre; i++) box('pesi', [x, 0.13 + i * 0.075, z], [0.4, 0.055, 0.23], i >= piastre - mobili ? su : modello)
    if (mobili) asta([x, 0.13 + (piastre - mobili) * 0.075, z], [x, 0.13 + piastre * 0.075 + 0.3, z], 0.012, 'metallo', su)
    return su
  }
  // Panca piana: piano alto `y`, lunga lungo z.
  function panca(x, y, z, lunghezza = 1.1, larghezza = 0.42) {
    box('cuscino', [x, y - 0.05, z], [larghezza, 0.1, lunghezza])
    for (const dz of [-lunghezza * 0.36, lunghezza * 0.36]) {
      box('metallo', [x, (y - 0.1) / 2, z + dz], [0.07, y - 0.1, 0.07])
      box('pesi', [x, 0.035, z + dz], [0.6, 0.07, 0.16])
    }
  }
  // Seduta: piano alto `y`, centrata in z, con la colonna sotto.
  function seduta(y, z, profondita = 0.5, larghezza = 0.46) {
    box('cuscino', [0, y - 0.05, z], [larghezza, 0.1, profondita])
    box('metallo', [0, (y - 0.1) / 2, z], [0.1, y - 0.1, 0.1])
    box('pesi', [0, 0.035, z], [0.7, 0.07, 0.7])
  }
  // Schienale incollato alla schiena di una posa: segue il busto dal bacino in su.
  function schienale(posa, da = -0.05, a = 0.95, spessore = 0.08) {
    const g = gruppo()
    g.position.copy(posa.bacino)
    g.quaternion.copy(posa.rotazione)
    box('cuscino', [0, -0.16 - spessore / 2, (da + a) / 2], [0.44, spessore, a - da], g)
    return g
  }

  return {
    modello, materiali, mesh, segmento, asta, box, ovale, disco, gruppo,
    aggiornaCorpo, bilanciere, manubrio, pacco, panca, seduta, schienale,
  }
}

// Dove la scena piega le braccia per tenere un manubrio: impugnatura lungo `asse`.
export function orientaManubrio(m, mano, asse) {
  m.position.copy(mano)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), asse.clone().normalize())
}

