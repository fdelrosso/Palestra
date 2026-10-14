import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  CORPO, Z_ALTO, Z_BASSO, Z_CINTURA, liscio, sezione,
  maschiaAddome, maschiaDorsali, maschiaGlutei, maschiaPettorale, maschiaTrapezio,
  rilievoAddome, rilievoGlutei, rilievoPettorale,
} from './misureCorpo3d.js'

// ---------------------------------------------------------------------------
// Il corpo "realistico" delle scene 3D: busto scolpito (pettorali, addome,
// glutei, la V delle dorsali), arti a fuso con i ventri muscolari (deltoidi,
// bicipiti, tricipiti, quadricipiti, polpacci), mani che impugnano o stanno
// aperte, testa con viso e capelli, pantaloncini e scarpe.
//
// I muscoli dell'esercizio si accendono: rosso i principali, rosa quelli che
// aiutano. Nomi: petto, addome, dorsali, trapezio, glutei (sul busto);
// deltoideAnteriore, deltoideLaterale, deltoidePosteriore, bicipiti,
// tricipiti, avambracci, quadricipiti, femorali, polpacci (sugli arti).
//
// La posa è quella delle scene (lib/posePetto3d): bacino, rotazione del busto,
// per lato spalla/gomito/mano e anca/ginocchio/caviglia/tallone/pianta/punta.
// Le misure stanno in lib/misureCorpo3d.
// ---------------------------------------------------------------------------

const PELLE = new THREE.Color('#d9a283')
const PANTALONCINI = new THREE.Color('#283a52')
const CINTURA = new THREE.Color('#1c2a3c')
const PRINCIPALE = new THREE.Color('#e5483a')
const SECONDARIO = new THREE.Color('#ef9479')

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

// ---- Busto -----------------------------------------------------------------
function geometriaBusto(principali, secondari) {
  const anelli = 120, lati = 112
  const punti = [], colori = [], indici = []
  const tinta = (nome) => (principali.includes(nome) ? PRINCIPALE : secondari.includes(nome) ? SECONDARIO : null)
  const maschere = [
    ['petto', (ax, z, c) => (c > 0 ? maschiaPettorale(ax, z) : 0)],
    ['addome', (ax, z, c) => (c > 0 ? maschiaAddome(ax, z) : 0)],
    ['glutei', (ax, z, c) => (c < 0 ? maschiaGlutei(ax, z) : 0)],
    ['dorsali', (ax, z, c) => maschiaDorsali(ax, z, c)],
    ['trapezio', (ax, z, c) => maschiaTrapezio(ax, z, c)],
  ].map(([nome, f]) => [tinta(nome), f]).filter(([t]) => t)
  const colore = new THREE.Color()
  for (let r = 0; r <= anelli; r++) {
    const z = THREE.MathUtils.lerp(Z_BASSO, Z_ALTO, r / anelli)
    const [larghezza, davanti, dietro] = sezione(z)
    for (let j = 0; j <= lati; j++) {
      // Cucitura dietro, al centro della schiena (φ = π).
      const fi = j / lati * Math.PI * 2
      const s = Math.sin(fi), c = Math.cos(fi)
      const x = larghezza * Math.sign(s) * Math.abs(s) ** 0.85
      const ax = Math.abs(x)
      let y = (c >= 0 ? davanti : dietro) * Math.sign(c) * Math.abs(c) ** 0.9
      if (c > 0) y += (rilievoPettorale(ax, z) + rilievoAddome(ax, z)) * liscio(0, 0.35, c)
      else y -= rilievoGlutei(ax, z) * liscio(0, 0.35, -c)
      // La V: le scapole e il solco della colonna dietro.
      if (c < 0) y += 0.006 * liscio(0.03, 0, ax) * liscio(0.1, 0.25, z) * -c
      punti.push(x, y, z)
      // Pantaloncini sotto la cintura, con la fascia elastica più scura.
      const pantaloncini = z < Z_CINTURA
      colore.copy(pantaloncini ? (z > Z_CINTURA - 0.022 ? CINTURA : PANTALONCINI) : PELLE)
      for (const [t, f] of maschere) {
        const m = f(ax, z, c)
        if (m > 0) colore.lerp(t, Math.min(1, m * 1.5) * (pantaloncini ? 0.55 : 1))
      }
      colori.push(colore.r, colore.g, colore.b)
      if (r < anelli && j < lati) {
        const a = r * (lati + 1) + j, b = a + lati + 1
        indici.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  let g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3))
  g.setIndex(indici)
  // La cucitura e i poli: vertici doppi uniti, così le normali sono continue.
  g = mergeVertices(g, 1e-5)
  g.computeVertexNormals()
  return g
}

// Un arto "a fuso": profilo [raggio, distanza dal giunto] fatto ruotare
// attorno al proprio asse (+y), schiacciato in `sx` (fianco) e `sz` (davanti).
function fuso(profilo, sx = 1, sz = 1) {
  const g = new THREE.LatheGeometry(profilo.map(([r, y]) => new THREE.Vector2(r, y)), 32)
  g.scale(sx, 1, sz)
  g.computeVertexNormals()
  return g
}

const P_OMERO = [[0, -0.03], [0.034, -0.022], [0.05, 0], [0.054, 0.05], [0.052, 0.13], [0.047, 0.22], [0.041, 0.3], [0.038, 0.345], [0.03, 0.37], [0, 0.38]]
const P_AVAMBRACCIO = [[0, -0.02], [0.03, -0.012], [0.04, 0.02], [0.045, 0.07], [0.042, 0.13], [0.033, 0.21], [0.026, 0.27], [0.024, 0.29], [0, 0.3]]
const P_COSCIA = [[0, -0.05], [0.05, -0.04], [0.078, 0], [0.084, 0.07], [0.08, 0.18], [0.07, 0.3], [0.057, 0.4], [0.05, 0.45], [0.036, 0.48], [0, 0.49]]
const P_PANTALONCINO = [[0.05, -0.05], [0.083, -0.03], [0.09, 0.04], [0.089, 0.14], [0.086, 0.2], [0.083, 0.205], [0.075, 0.2]]
const P_TIBIA = [[0, -0.02], [0.038, -0.012], [0.046, 0.03], [0.047, 0.1], [0.042, 0.2], [0.033, 0.32], [0.027, 0.41], [0.026, 0.44], [0, 0.455]]

// Base ortonormale per un segmento: y lungo l'osso, z verso il suo "davanti".
const _x = V(), _y = V(), _z = V(), _m = new THREE.Matrix4()
function orienta(g, da, a, davanti, riserva) {
  _y.copy(a).sub(da).normalize()
  _z.copy(davanti).addScaledVector(_y, -davanti.dot(_y))
  if (_z.lengthSq() < 1e-6) _z.copy(riserva).addScaledVector(_y, -riserva.dot(_y))
  _z.normalize()
  _x.crossVectors(_y, _z)
  _m.makeBasis(_x, _y, _z)
  g.quaternion.setFromRotationMatrix(_m)
  g.position.copy(da)
}
// La parte di `v` perpendicolare a `asse`, normalizzata (o zero).
const perp = (v, asse) => {
  const p = v.clone().addScaledVector(asse, -v.dot(asse))
  return p.lengthSq() < 1e-8 ? p.set(0, 0, 0) : p.normalize()
}

export function creaUmano({ principali = [], secondari = [] } = {}) {
  const gruppo = new THREE.Group()
  const materiali = {
    busto: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }),
    pelle: new THREE.MeshStandardMaterial({ color: PELLE, roughness: 0.6 }),
    principale: new THREE.MeshStandardMaterial({ color: PRINCIPALE, roughness: 0.55 }),
    secondario: new THREE.MeshStandardMaterial({ color: SECONDARIO, roughness: 0.58 }),
    pantaloncini: new THREE.MeshStandardMaterial({ color: PANTALONCINI, roughness: 0.85 }),
    capelli: new THREE.MeshStandardMaterial({ color: '#2e221b', roughness: 0.9 }),
    occhi: new THREE.MeshStandardMaterial({ color: '#1b1714', roughness: 0.3 }),
    scarpe: new THREE.MeshStandardMaterial({ color: '#2d323a', roughness: 0.7 }),
    suola: new THREE.MeshStandardMaterial({ color: '#e9e6e1', roughness: 0.8 }),
  }
  const tono = (nome) => (principali.includes(nome) ? 'principale' : secondari.includes(nome) ? 'secondario' : 'pelle')
  const sfera = new THREE.SphereGeometry(1, 28, 20)
  function pezzo(geometria, materiale, parent, p = [0, 0, 0], s = [1, 1, 1]) {
    const m = new THREE.Mesh(geometria, materiali[materiale])
    m.position.set(...p)
    m.scale.set(...s)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  const ovale = (mat, parent, p, s) => pezzo(sfera, mat, parent, p, s)
  const nuovo = (parent = gruppo) => {
    const g = new THREE.Group()
    parent.add(g)
    return g
  }

  // ---- Busto, collo e testa (rigidi col bacino) -------------------------------
  const busto = nuovo()
  pezzo(geometriaBusto(principali, secondari), 'busto', busto)
  // Collo: un fuso inclinato appena in avanti, dentro il trapezio.
  const collo = pezzo(fuso([[0, -0.01], [0.058, 0], [0.054, 0.08], [0.05, 0.15], [0, 0.17]], 1, 0.92), 'pelle', busto, [0, -0.005, 0.68])
  collo.rotation.x = Math.PI / 2 - 0.12
  const [tx, ty, tz] = CORPO.TESTA
  const testa = nuovo(busto)
  testa.position.set(tx, ty, tz)
  // Il cranio si chiama 'testa': i test controllano che gli attrezzi non ci passino dentro.
  ovale('pelle', testa, [0, -0.008, 0.012], [0.079, 0.098, 0.108]).name = 'testa'
  ovale('pelle', testa, [0, 0.018, -0.05], [0.06, 0.07, 0.06]) // mascella e mento
  ovale('pelle', testa, [0, 0.1, -0.015], [0.014, 0.018, 0.026]) // naso
  for (const l of [-1, 1]) {
    ovale('pelle', testa, [l * 0.078, -0.012, -0.004], [0.012, 0.02, 0.03]) // orecchie
    ovale('occhi', testa, [l * 0.03, 0.084, 0.014], [0.009, 0.006, 0.007])
    ovale('pelle', testa, [l * 0.032, 0.085, 0.03], [0.022, 0.008, 0.007]) // sopracciglia
  }
  // Capelli corti: una calotta spostata in alto e indietro, la fronte resta libera.
  ovale('capelli', testa, [0, -0.022, 0.032], [0.083, 0.098, 0.1])

  // ---- Arti ----------------------------------------------------------------
  const geo = {
    omero: fuso(P_OMERO, 1, 1.02),
    avambraccio: fuso(P_AVAMBRACCIO, 1.12, 0.88),
    coscia: fuso(P_COSCIA, 0.95, 1.05),
    pantaloncino: fuso(P_PANTALONCINO, 0.96, 1.06),
    tibia: fuso(P_TIBIA, 0.95, 1),
  }
  const arti = [-1, 1].map((lato) => {
    // Omero: deltoide in tre capi intorno alla testa dell'omero, bicipite
    // davanti, tricipite dietro (il "davanti" del braccio è dove si piega).
    const omero = nuovo()
    pezzo(geo.omero, 'pelle', omero)
    ovale(tono('deltoideAnteriore'), omero, [lato * 0.012, 0.045, 0.03], [0.042, 0.085, 0.036])
    ovale(tono('deltoideLaterale'), omero, [lato * 0.034, 0.05, 0], [0.034, 0.09, 0.044])
    ovale(tono('deltoidePosteriore'), omero, [lato * 0.012, 0.045, -0.03], [0.042, 0.085, 0.036])
    ovale(tono('bicipiti'), omero, [0, 0.19, 0.024], [0.034, 0.1, 0.031])
    ovale(tono('tricipiti'), omero, [lato * 0.006, 0.15, -0.024], [0.039, 0.12, 0.031])
    const avambraccio = nuovo()
    pezzo(geo.avambraccio, 'pelle', avambraccio)
    ovale(tono('avambracci'), avambraccio, [lato * 0.012, 0.075, 0.008], [0.04, 0.075, 0.034])
    const mano = nuovo()
    // Pugno chiuso intorno all'impugnatura (asse x del gruppo).
    const pugno = nuovo(mano)
    ovale('pelle', pugno, [0, -0.012, -0.012], [0.046, 0.045, 0.034])
    ovale('pelle', pugno, [0, 0.008, 0.018], [0.043, 0.026, 0.024]) // dita chiuse
    const pollice = ovale('pelle', pugno, [0.042, -0.02, 0.012], [0.013, 0.03, 0.013])
    // Mano aperta: palmo e dita lungo +y, il palmo guarda verso +z.
    const aperta = nuovo(mano)
    ovale('pelle', aperta, [0, 0.045, 0], [0.042, 0.05, 0.016])
    ovale('pelle', aperta, [0, 0.112, 0.002], [0.038, 0.04, 0.011])
    ovale('pelle', aperta, [0.045, 0.035, 0.008], [0.012, 0.032, 0.012]).rotation.z = 0.5
    const polso = ovale('pelle', mano, [0, 0, 0], [0.027, 0.02, 0.022])

    const coscia = nuovo()
    pezzo(geo.coscia, 'pelle', coscia)
    ovale(tono('quadricipiti'), coscia, [0, 0.22, 0.03], [0.062, 0.16, 0.05])
    ovale(tono('quadricipiti'), coscia, [-lato * 0.032, 0.38, 0.02], [0.036, 0.055, 0.032]) // vasto mediale
    ovale(tono('femorali'), coscia, [0, 0.24, -0.032], [0.058, 0.15, 0.045])
    pezzo(geo.pantaloncino, 'pantaloncini', coscia)
    const tibia = nuovo()
    pezzo(geo.tibia, 'pelle', tibia)
    ovale(tono('polpacci'), tibia, [lato * 0.008, 0.13, -0.025], [0.043, 0.1, 0.038])
    ovale('pelle', tibia, [0, -0.005, 0.03], [0.034, 0.036, 0.022]) // rotula
    const scarpa = nuovo()
    ovale('scarpe', scarpa, [0, 0.042, 0], [0.047, 0.04, 1])
    ovale('suola', scarpa, [0, 0.012, 0], [0.051, 0.012, 1])
    return { omero, avambraccio, mano, pugno, pollice, aperta, polso, coscia, tibia, scarpa }
  })

  const davantiBusto = V(), suBusto = V(), centro = V()
  function aggiorna(p) {
    busto.position.copy(p.bacino)
    busto.quaternion.copy(p.rotazione)
    davantiBusto.set(0, 1, 0).applyQuaternion(p.rotazione)
    suBusto.set(0, 0, 1).applyQuaternion(p.rotazione)
    centro.set(0, 0, 0.45).applyQuaternion(p.rotazione).add(p.bacino)
    for (let i = 0; i < 2; i++) {
      const lato = i === 0 ? -1 : 1
      const b = p.braccia[i], g = p.gambe[i], m = arti[i]
      // --- braccio: il "davanti" è da dove si piega il gomito; teso, il petto.
      const dOmero = b.gomito.clone().sub(b.spalla).normalize()
      const dAvamb = b.mano.clone().sub(b.gomito).normalize()
      const piega = perp(dAvamb, dOmero)
      const flessione = liscio(0.12, 0.45, dOmero.clone().cross(dAvamb).length())
      const riserva = perp(davantiBusto, dOmero).lengthSq() ? perp(davantiBusto, dOmero) : perp(suBusto, dOmero)
      const davantiBraccio = riserva.clone().lerp(piega, flessione)
      orienta(m.omero, b.spalla, b.gomito, davantiBraccio, suBusto)
      orienta(m.avambraccio, b.gomito, b.mano, perp(davantiBraccio, dAvamb), davantiBusto)
      // --- mano
      const polso = b.gomito.clone().addScaledVector(dAvamb, CORPO.POLSO)
      const aperta = b.palmo != null
      m.pugno.visible = !aperta
      m.aperta.visible = aperta
      if (aperta) {
        // Base: y lungo le dita, z la normale del palmo.
        const dita = b.dita.clone().normalize()
        const palmo = perp(b.palmo, dita)
        _x.crossVectors(dita, palmo)
        _m.makeBasis(_x, dita, palmo)
        m.mano.quaternion.setFromRotationMatrix(_m)
        m.mano.position.copy(polso)
        // Il pollice dalla parte del corpo.
        m.aperta.scale.x = Math.sign(_x.dot(centro.clone().sub(polso))) || 1
        m.polso.position.set(0, 0, 0)
      } else {
        // Asse x del pugno lungo l'impugnatura, y lungo l'avambraccio.
        const presa = perp(b.presa || davantiBusto.clone().cross(dAvamb), dAvamb)
        if (!presa.lengthSq()) presa.copy(perp(_x.set(1, 0, 0), dAvamb))
        _z.crossVectors(presa, dAvamb)
        _m.makeBasis(presa, dAvamb, _z)
        m.mano.quaternion.setFromRotationMatrix(_m)
        m.mano.position.copy(b.mano)
        // Il pollice verso il centro del corpo (la presa prona del bilanciere).
        m.pollice.position.x = 0.042 * (Math.sign(presa.dot(centro.clone().sub(b.mano))) || -lato)
        m.polso.position.set(0, -(CORPO.AVAMBRACCIO - CORPO.POLSO), 0)
      }
      // --- gamba: la tibia guarda dove guarda il piede, la coscia dove il ginocchio.
      const dTibia = g.caviglia.clone().sub(g.ginocchio).normalize()
      const avantiPiede = g.punta.clone().sub(g.tallone).normalize()
      const davantiTibia = perp(avantiPiede, dTibia)
      orienta(m.tibia, g.ginocchio, g.caviglia, davantiTibia, davantiBusto)
      const dCoscia = g.ginocchio.clone().sub(g.anca).normalize()
      orienta(m.coscia, g.anca, g.ginocchio, perp(davantiTibia, dCoscia), davantiBusto)
      // --- scarpa: dal tallone alla punta, la suola sotto.
      const lunghezza = g.tallone.distanceTo(g.punta)
      const su = perp(g.caviglia.clone().sub(g.tallone), avantiPiede)
      _x.crossVectors(su, avantiPiede)
      _m.makeBasis(_x, su, avantiPiede)
      m.scarpa.quaternion.setFromRotationMatrix(_m)
      m.scarpa.position.copy(g.tallone).add(g.punta).multiplyScalar(0.5)
      m.scarpa.children.forEach((c) => { c.scale.z = lunghezza / 2 + 0.018 })
    }
  }
  return { gruppo, aggiorna, materiali }
}
