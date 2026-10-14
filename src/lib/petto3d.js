import * as THREE from 'three'
import { creaUmano } from './umano3d.js'
import { bilanciere, creaKit, discoPeso, forcelle, manigliaD, manubrio, paccoPesi, panca, tappetino } from './attrezzi3d.js'
import { LANDMINE, PANCA, PARALLELE, PULEGGE, appoggiPushUp, levaPetto, posaPetto } from './posePetto3d.js'

// ---------------------------------------------------------------------------
// Le scene 3D del petto: il corpo realistico (lib/umano3d) nelle pose di
// lib/posePetto3d, e intorno l'attrezzo vero (lib/attrezzi3d). Le parti che
// si muovono (bilanciere, manubri, leve, carrello del multipower, pacco pesi,
// cavi) seguono la posa a ogni fotogramma: se la posa cambia, l'attrezzo va
// con lei. Un solo modello e un solo set di geometrie per l'esercizio aperto.
// ---------------------------------------------------------------------------

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const X = V(1, 0, 0)
const _m = new THREE.Matrix4()

export function creaScenaPetto(e) {
  const modello = new THREE.Group()
  const kit = creaKit(modello)
  const { box, asta, tubo, cuscino, disco, gruppo, segmento, mesh, cilindro } = kit
  const umano = creaUmano(e)
  modello.add(umano.gruppo)
  const p0 = posaPetto(e, 0)
  const aggiornamenti = []
  const ogni = (f) => aggiornamenti.push(f)

  // Pedana di gomma sotto la scena.
  box('pedana', [0, -0.012, 0], [3.4, 0.02, 3.4])

  // ---- Panca, rack, multipower ------------------------------------------------
  const sdraiato = ['spinte', 'croci', 'pullover'].includes(e.tipo)
  const i = e.inclinazione || 0
  if (sdraiato) {
    if (i > 0) panca(kit, p0, { da: 0.05, a: 0.98, seduta: [p0.bacino.z - 0.12, PANCA, 0.36] })
    else if (i < 0) {
      panca(kit, p0, { da: -0.18, a: 0.98 })
      // Il gancio per le gambe: rullo dietro le ginocchia e rulli sulle caviglie.
      const g = p0.gambe[0]
      const zg = g.ginocchio.z + 0.05, zc = g.caviglia.z - 0.065
      tubo([0, 0.06, zc + 0.02], [0, g.ginocchio.y - 0.08, zg + 0.02], 0.055)
      disco('imbottitura', [0, g.ginocchio.y - 0.085, zg + 0.035], 0.055, 0.42)
      disco('imbottitura', [0, g.caviglia.y + 0.0, zc], 0.05, 0.34)
      disco('imbottitura', [0, g.caviglia.y - 0.1, zc + 0.11], 0.05, 0.34)
      tubo([0, g.caviglia.y - 0.1, zc + 0.11], [0, g.caviglia.y, zc], 0.04)
    } else panca(kit, p0, { da: -0.32, a: e.tipo === 'pullover' ? 0.9 : 0.98 })
  }
  if (e.tipo === 'floor-press') tappetino(kit, p0.bacino.z + 0.15)

  let barra = null
  if (e.attrezzo === 'bilanciere') {
    barra = bilanciere(kit)
    const top = p0.attrezzo.centro
    if (e.tipo !== 'floor-press') forcelle(kit, top.z + 0.09, top.y - 0.05, 0.56)
  }
  if (e.attrezzo === 'smith') {
    barra = bilanciere(kit, modello, { dischi: [[0.2, 0.04], [0.2, 0.04]] })
    const zr = p0.attrezzo.centro.z + 0.075
    for (const l of [-1, 1]) {
      const x = l * 0.66
      asta([x, 0.05, zr], [x, 2.25, zr], 0.018, 'cromo')
      tubo([x * 1.12, 0, zr], [x * 1.12, 2.35, zr], 0.075)
      tubo([x * 1.12, 0.03, zr - 0.55], [x * 1.12, 0.03, zr + 0.55], 0.07)
      box('accento', [x, 0.3, zr], [0.08, 0.05, 0.08]) // fermi di sicurezza
    }
    tubo([-0.74, 2.35, zr], [0.74, 2.35, zr], 0.075)
    // I carrelli sulle guide, agganciati al bilanciere.
    const carrelli = [-1, 1].map((l) => {
      const c = gruppo()
      box('telaio', [l * 0.66, 0, 0.075], [0.07, 0.14, 0.07], c)
      box('accento', [l * 0.66, 0.0, 0.03], [0.04, 0.02, 0.09], c)
      return c
    })
    ogni((p) => carrelli.forEach((c) => { c.position.set(0, p.attrezzo.centro.y, p.attrezzo.centro.z) }))
  }
  if (barra) ogni((p) => barra.position.copy(p.attrezzo.centro))

  // ---- Manubri ----------------------------------------------------------------
  if (e.attrezzo === 'manubri') {
    const m = [manubrio(kit), manubrio(kit)]
    ogni((p) => p.braccia.forEach((b, k) => {
      m[k].position.copy(b.mano)
      m[k].quaternion.setFromUnitVectors(X, b.presa.clone().normalize())
    }))
  }
  if (e.tipo === 'pullover') {
    const m = manubrio(kit)
    m.name = 'pullover-manubrio'
    // Le mani a coppa sotto il disco alto, il manubrio lungo le braccia.
    ogni((p) => {
      const mani = p.braccia[0].mano.clone().add(p.braccia[1].mano).multiplyScalar(0.5)
      m.position.copy(mani).addScaledVector(p.attrezzo.asse, -0.025)
      m.quaternion.setFromUnitVectors(X, p.attrezzo.asse)
    })
  }

  // ---- Cavi ---------------------------------------------------------------------
  function torre(x, z, altezza) {
    const lato = Math.sign(x)
    tubo([x, 0, z - 0.2], [x, 2.45, z - 0.2], 0.08)
    const pacco = paccoPesi(kit, x + lato * 0.36, z + 0.05, { altezza: 2.3, piastre: 12, larghezza: 0.36 })
    // La puleggia regolabile sul montante, girata verso chi si allena.
    box('telaio', [x, altezza, z - 0.2], [0.11, 0.2, 0.11])
    const ruota = mesh(cilindro, 'accento', [x - lato * 0.075, altezza, z - 0.2], [0.055, 0.025, 0.055])
    ruota.rotation.z = Math.PI / 2
    return { puleggia: V(x - lato * 0.08, altezza, z - 0.2), pacco }
  }
  function cavoA(puleggia, pacco, mano, presa, base) {
    const filo = mesh(cilindro, 'cavo')
    const maniglia = manigliaD(kit)
    ogni((p) => {
      const h = mano(p)
      segmento(filo, puleggia, h, 0.0045)
      const dir = puleggia.clone().sub(h).normalize()
      const y = presa(p).clone().addScaledVector(dir, -presa(p).dot(dir)).normalize()
      const z = dir.clone().addScaledVector(y, -dir.dot(y)).normalize()
      _m.makeBasis(y.clone().cross(z), y, z)
      maniglia.quaternion.setFromRotationMatrix(_m)
      maniglia.position.copy(h)
      // Il pacco sale quanto il cavo si allunga.
      pacco.position.y = Math.max(0, puleggia.distanceTo(h) - base) * 0.5
    })
  }
  if (e.tipo === 'cavi' || (e.tipo === 'croci' && e.attrezzo === 'cavi')) {
    const altezza = e.tipo === 'cavi' ? PULEGGE[e.cavi] : 0.17
    const z = e.tipo === 'cavi' ? 0.2 : p0.braccia[0].spalla.z
    const torri = [-1, 1].map((l) => torre(l * 1.3, z, altezza))
    if (e.tipo === 'cavi') tubo([-1.3, 2.45, z - 0.2], [1.3, 2.45, z - 0.2], 0.08)
    // La lunghezza minima del cavo, per sapere quanto sale il pacco.
    const minimi = [0, 1].map((k) => {
      let min = Infinity
      for (let f = 0; f <= 1; f += 0.05) min = Math.min(min, torri[k].puleggia.distanceTo(posaPetto(e, f).braccia[k].mano))
      return min
    })
    ;[0, 1].forEach((k) => cavoA(torri[k].puleggia, torri[k].pacco, (p) => p.braccia[k].mano, (p) => p.braccia[k].presa, minimi[k]))
  }

  // ---- Macchine a leva: chest press, inclinata, Hammer --------------------------
  if (e.tipo === 'chest-press') {
    const hammer = e.leva === 'hammer'
    // Seduta e schienale (lo schienale segue il busto).
    cuscino([0, PANCA - 0.04, -0.02], [0.42, 0.08, 0.42])
    tubo([0, 0, 0.05], [0, PANCA - 0.08, -0.02], 0.08)
    const schiena = gruppo()
    schiena.position.copy(p0.bacino)
    schiena.quaternion.copy(p0.rotazione)
    cuscino([0, -0.145, 0.45], [0.4, 0.08, 0.72], schiena)
    const dietro = V(0, -0.2, 0.45).applyQuaternion(p0.rotazione).add(p0.bacino)
    tubo([0, 0.05, 0.62], [0, 2.2, 0.62], 0.1)
    tubo(dietro, [0, dietro.y, 0.62], 0.06)
    box('telaio', [0, 0.03, 0.15], [0.9, 0.06, 1.4])
    // Pedana per i piedi.
    box('telaio', [0, 0.06, -0.42], [0.62, 0.04, 0.3])
    const leve = levaPetto(e)
    // I perni stanno su una trave che arriva da dietro, sopra la testa: davanti
    // a chi si allena non c'è niente che copra.
    const pp = leve[1].perno
    tubo([0, 2.2, 0.62], [0, pp.y + 0.07, pp.z + 0.05], 0.08)
    tubo([-0.12, pp.y + 0.07, pp.z + 0.05], [0.12, pp.y + 0.07, pp.z + 0.05], 0.09)
    const gruppiLeva = leve.map((L, k) => {
      const lato = k === 0 ? -1 : 1
      tubo([lato * 0.1, pp.y + 0.07, pp.z + 0.05], [L.perno.x, L.perno.y + 0.07, L.perno.z + 0.05], 0.065)
      tubo([L.perno.x, L.perno.y + 0.07, L.perno.z + 0.05], L.perno, 0.05)
      const g = gruppo()
      g.position.copy(L.perno)
      disco('accento', [0, 0, 0], 0.06, 0.09, g)
      // Il braccio della leva fino alla maniglia, e la maniglia lungo la presa.
      tubo(V(), L.u0, 0.055, 'telaio', g)
      const presa = L.presa.clone().normalize()
      asta(L.u0.clone().addScaledVector(presa, -0.08), L.u0.clone().addScaledVector(presa, 0.08), 0.02, 'gomma', g)
      if (hammer) {
        // I portadischi sulla leva, con un disco per parte.
        // in fondo alla leva, sotto le maniglie, in fuori
        const corno = L.u0.clone().multiplyScalar(1.1)
        const fuori = V(lato, 0, 0)
        tubo(L.u0, corno, 0.05, 'telaio', g)
        asta(corno, corno.clone().addScaledVector(fuori, 0.3), 0.026, 'cromo', g)
        const d = discoPeso(kit, g, 0, 0.2, 0.05)
        d.position.copy(corno).addScaledVector(fuori, 0.17)
      }
      return g
    })
    const pacco = hammer ? null : paccoPesi(kit, 0, 0.9, { altezza: 2.0, piastre: 12, larghezza: 0.4 })
    ogni((p) => {
      p.attrezzo.leve.forEach((a, k) => gruppiLeva[k].quaternion.setFromAxisAngle(leve[k].asse, a))
      if (pacco) pacco.position.y = p.attrezzo.t * 0.3
    })
  }

  // ---- Pectoral machine ---------------------------------------------------------
  if (e.tipo === 'pec-deck') {
    cuscino([0, PANCA - 0.04, -0.02], [0.42, 0.08, 0.42])
    tubo([0, 0, 0.05], [0, PANCA - 0.08, -0.02], 0.08)
    cuscino([0, 1.08, 0.3], [0.38, 0.85, 0.08])
    tubo([0, 0.05, 0.55], [0, 2.18, 0.55], 0.1)
    tubo([0, 0.7, 0.36], [0, 0.7, 0.55], 0.06)
    box('telaio', [0, 0.03, 0.2], [0.9, 0.06, 1.2])
    box('telaio', [0, 0.06, -0.42], [0.62, 0.04, 0.3])
    const yp = 2.08
    const gruppiBraccio = p0.braccia.map((b, k) => {
      const lato = k === 0 ? -1 : 1
      tubo([0, yp + 0.1, 0.55], [lato * 0.19, yp + 0.1, b.spalla.z], 0.07)
      const g = gruppo()
      g.name = `pec-deck-braccio-${k}`
      g.position.set(b.spalla.x, yp, b.spalla.z)
      disco('accento', [0, 0.05, 0], 0.06, 0.1, g).rotation.set(0, 0, 0)
      // Braccio a L: in fuori sopra il gomito (a riposo, angolo 0), giù fino al cuscinetto.
      const dx = lato * 0.36
      tubo([0, 0, 0], [dx, 0, -0.07], 0.05, 'telaio', g)
      tubo([dx, 0, -0.07], [dx, -0.62, -0.07], 0.045, 'telaio', g)
      cuscino([dx - lato * 0.005, -0.5, -0.07], [0.1, 0.36, 0.08], g)
      asta([dx, -0.29, -0.11], [dx, -0.29, -0.03], 0.016, 'gomma', g)
      return g
    })
    const pacco = paccoPesi(kit, 0, 0.85, { altezza: 2.0, piastre: 12, larghezza: 0.4 })
    ogni((p) => {
      gruppiBraccio.forEach((g, k) => { g.rotation.y = (k === 0 ? -1 : 1) * p.attrezzo.angolo })
      pacco.position.y = p.attrezzo.t * 0.3
    })
  }

  // ---- Parallele ------------------------------------------------------------------
  if (e.tipo === 'dips') {
    for (const l of [-1, 1]) {
      const x = l * PARALLELE.x
      asta([x, PARALLELE.y, -0.32], [x, PARALLELE.y, 0.42], 0.022, 'cromo')
      cuscino([x, PARALLELE.y, -0.24], [0.05, 0.05, 0.16], modello, 'gomma')
      for (const z of [-0.3, 0.38]) tubo([x, 0, z], [x, PARALLELE.y - 0.02, z], 0.06)
      tubo([x, 0.03, -0.45], [x, 0.03, 0.55], 0.07)
    }
    tubo([-PARALLELE.x, 0.5, 0.38], [PARALLELE.x, 0.5, 0.38], 0.05)
  }

  // ---- Piegamenti -------------------------------------------------------------------
  if (e.tipo === 'push-up') {
    const { mani, piedi } = appoggiPushUp(e)
    tappetino(kit, 0, 2.1, 0.75)
    // La panca sotto le mani o sotto i piedi, di traverso.
    const z = mani ? p0.attrezzo.zMani : piedi ? 0.82 : null
    if (z != null) {
      cuscino([0, PANCA - 0.04, z], [1.15, 0.08, 0.3])
      for (const l of [-1, 1]) {
        tubo([l * 0.42, 0.04, z], [l * 0.42, PANCA - 0.08, z], 0.06)
        box('telaio', [l * 0.42, 0.03, z], [0.07, 0.06, 0.5])
      }
    }
  }

  // ---- Svend press: un disco fra i palmi ---------------------------------------------
  if (e.tipo === 'svend') {
    const g = gruppo()
    discoPeso(kit, g, 0, 0.16, 0.035)
    ogni((p) => g.position.copy(p.attrezzo.centro))
  }

  // ---- Landmine ------------------------------------------------------------------
  if (e.tipo === 'landmine') {
    const perno = V(...LANDMINE.perno)
    box('telaio', [0, 0.02, perno.z], [0.5, 0.04, 0.5])
    tubo([0, 0.02, perno.z], perno, 0.06)
    const g = gruppo()
    g.position.copy(perno)
    disco('accento', [0, 0, 0], 0.05, 0.12, g)
    // Il bilanciere lungo +z del gruppo, girato su x.
    const lungo = (a, b, r, mat) => asta(V(0, 0, a), V(0, 0, b), r, mat, g)
    lungo(-0.05, 1.85, 0.0145, 'acciaio')
    lungo(0.6, 1.3, 0.0152, 'zigrino')
    lungo(1.87, 2.36, 0.025, 'cromo')
    lungo(1.85, 1.89, 0.036, 'cromo')
    const d = discoPeso(kit, g, 0, 0.2, 0.045)
    d.position.set(0, 0, 1.95)
    d.rotation.y = Math.PI / 2
    ogni((p) => { g.rotation.x = -p.attrezzo.angolo })
  }

  function aggiorna(fase) {
    const p = posaPetto(e, fase)
    umano.aggiorna(p)
    for (const f of aggiornamenti) f(p)
  }
  aggiorna(0)

  const inquadrature = {
    spinte: [[0, 0.85, 0], [3.0, 2.3, -2.6]],
    'floor-press': [[0, 0.4, 0], [2.8, 1.9, -2.4]],
    croci: [[0, 0.85, 0], [3.0, 2.3, -2.6]],
    pullover: [[0, 0.8, 0.2], [3.3, 1.9, 1.2]],
    'chest-press': [[0, 1.15, 0], [3.1, 2.2, -2.9]],
    'pec-deck': [[0, 1.2, 0], [2.6, 2.2, -3.4]],
    cavi: [[0, 1.25, 0], [3.0, 2.5, -3.6]],
    dips: [[0, 1.2, 0], [3.2, 2.1, -2.6]],
    'push-up': [[0, 0.35, 0], [3.0, 1.6, -1.4]],
    svend: [[0, 1.15, -0.1], [2.6, 1.9, -2.6]],
    landmine: [[0, 1.0, -0.8], [3.4, 2.0, -2.2]],
  }
  // Fra le torri dei cavi si guarda da davanti, se no la torre vicina copre tutto.
  const [bersaglio, camera] = e.tipo === 'croci' && e.attrezzo === 'cavi'
    ? [[0, 0.95, 0], [0.9, 2.5, -3.5]]
    : inquadrature[e.tipo]
  return { modello, aggiorna, bersaglio, camera, ambiente: true }
}
