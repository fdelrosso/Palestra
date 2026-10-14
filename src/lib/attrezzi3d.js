import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

// ---------------------------------------------------------------------------
// Gli attrezzi "veri" delle scene 3D col corpo realistico (lib/umano3d):
// bilanciere olimpico coi dischi a bordo rialzato, manubri, imbottiture
// arrotondate, telai verniciati, pulegge e cavi. Misure in unità della scena
// (1 ≈ 0,9 m), assi del mondo: y in alto, chi si allena guarda verso -z.
//
// `creaKit(modello)` dà i mattoni (box, aste, dischi) agganciati al modello;
// le funzioni sotto montano gli attrezzi interi e restituiscono i gruppi che
// la scena muove.
// ---------------------------------------------------------------------------

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const SU = V(0, 1, 0)

export function creaKit(modello) {
  const materiali = {
    telaio: new THREE.MeshStandardMaterial({ color: '#2c3036', metalness: 0.55, roughness: 0.42 }),
    cromo: new THREE.MeshStandardMaterial({ color: '#d5dbe0', metalness: 0.95, roughness: 0.22 }),
    acciaio: new THREE.MeshStandardMaterial({ color: '#9aa3ab', metalness: 0.85, roughness: 0.38 }),
    zigrino: new THREE.MeshStandardMaterial({ color: '#7d858c', metalness: 0.8, roughness: 0.62 }),
    disco: new THREE.MeshStandardMaterial({ color: '#1d2025', metalness: 0.25, roughness: 0.62 }),
    discoBordo: new THREE.MeshStandardMaterial({ color: '#2a2e35', metalness: 0.3, roughness: 0.55 }),
    imbottitura: new THREE.MeshStandardMaterial({ color: '#202429', roughness: 0.48, metalness: 0.05 }),
    gomma: new THREE.MeshStandardMaterial({ color: '#141619', roughness: 0.9 }),
    accento: new THREE.MeshStandardMaterial({ color: '#e0663a', metalness: 0.35, roughness: 0.4 }),
    cavo: new THREE.MeshStandardMaterial({ color: '#b9c0c6', metalness: 0.6, roughness: 0.45 }),
    tappetino: new THREE.MeshStandardMaterial({ color: '#39414b', roughness: 0.95 }),
    pedana: new THREE.MeshStandardMaterial({ color: '#2a2f36', roughness: 0.92 }),
    legno: new THREE.MeshStandardMaterial({ color: '#a77b4f', roughness: 0.7 }),
  }
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 28)
  const cubo = new THREE.BoxGeometry(1, 1, 1)
  const sfera = new THREE.SphereGeometry(1, 20, 14)
  const arrotondati = new Map()

  function mesh(geometria, materiale, p = [0, 0, 0], s = [1, 1, 1], parent = modello) {
    const m = new THREE.Mesh(geometria, materiali[materiale] || materiale)
    m.position.set(...p)
    m.scale.set(...s)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function gruppo(parent = modello) {
    const g = new THREE.Group()
    parent.add(g)
    return g
  }
  const box = (mat, p, s, parent) => mesh(cubo, mat, p, s, parent)
  const ovale = (mat, p, s, parent) => mesh(sfera, mat, p, s, parent)
  // Un'imbottitura: box dagli spigoli morbidi (geometria vera, non scalata,
  // se no il raggio degli spigoli si deforma).
  function cuscino(p, s, parent, mat = 'imbottitura') {
    const k = s.map((x) => x.toFixed(3)).join()
    if (!arrotondati.has(k)) arrotondati.set(k, new RoundedBoxGeometry(s[0], s[1], s[2], 4, Math.min(...s) * 0.4))
    return mesh(arrotondati.get(k), mat, p, [1, 1, 1], parent)
  }
  function segmento(m, a, b, r) {
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.scale.set(r, Math.max(a.distanceTo(b), 1e-6), r)
    m.quaternion.setFromUnitVectors(SU, b.clone().sub(a).normalize())
  }
  function asta(a, b, r = 0.025, mat = 'telaio', parent = modello) {
    const m = mesh(cilindro, mat, [0, 0, 0], [1, 1, 1], parent)
    segmento(m, a.isVector3 ? a : V(...a), b.isVector3 ? b : V(...b), r)
    return m
  }
  // Tubo quadro verniciato tra due punti (i telai delle macchine).
  function tubo(a, b, l = 0.05, mat = 'telaio', parent = modello) {
    const A = a.isVector3 ? a : V(...a), B = b.isVector3 ? b : V(...b)
    const m = mesh(cubo, mat, [0, 0, 0], [l, A.distanceTo(B) + l, l], parent)
    m.position.copy(A).add(B).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(SU, B.clone().sub(A).normalize())
    return m
  }
  // Disco attorno all'asse x (dischi, rulli, pulegge).
  const disco = (mat, p, r, spessore, parent) => {
    const m = mesh(cilindro, mat, p, [r, spessore, r], parent)
    m.rotation.z = Math.PI / 2
    return m
  }
  return { modello, materiali, mesh, gruppo, box, ovale, cuscino, segmento, asta, tubo, disco, cilindro, sfera }
}

// ---- Pesi --------------------------------------------------------------------

// Profilo di un disco olimpico (raggio, spessore): bordo esterno rialzato,
// anima più sottile, mozzo cromato. Ruota attorno a y; la scena lo gira su x.
const geometrieDisco = new Map()
function geometriaDisco(r, s) {
  const k = `${r}|${s}`
  if (!geometrieDisco.has(k)) {
    const h = s / 2, w = h * 0.55
    const profilo = [
      [0.03, -w], [r * 0.78, -w], [r * 0.82, -h], [r - 0.006, -h], [r, -h + 0.006],
      [r, h - 0.006], [r - 0.006, h], [r * 0.82, h], [r * 0.78, w], [0.03, w],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    // Il profilo si chiude su se stesso: la lathe fa la corona piena.
    profilo.push(profilo[0].clone())
    const g = new THREE.LatheGeometry(profilo, 40)
    g.rotateZ(Math.PI / 2)
    geometrieDisco.set(k, g)
  }
  return geometrieDisco.get(k)
}
export function discoPeso(kit, parent, x, r, s) {
  const g = kit.gruppo(parent)
  g.position.x = x
  kit.mesh(geometriaDisco(r, s), 'disco', [0, 0, 0], [1, 1, 1], g)
  kit.disco('cromo', [0, 0, 0], 0.034, s * 0.62, g)
  return g
}

// Bilanciere olimpico lungo x, centrato nell'origine del gruppo: zigrinatura
// dove vanno le mani, collari, manicotti, due dischi per parte e la molla.
export function bilanciere(kit, parent = kit.modello, { dischi = [[0.25, 0.055], [0.2, 0.04]] } = {}) {
  const g = kit.gruppo(parent)
  kit.disco('acciaio', [0, 0, 0], 0.0145, 1.44, g)
  for (const x of [-0.45, 0.45]) kit.disco('zigrino', [x, 0, 0], 0.0152, 0.36, g)
  for (const l of [-1, 1]) {
    kit.disco('cromo', [l * 0.735, 0, 0], 0.036, 0.03, g)
    kit.disco('cromo', [l * 0.98, 0, 0], 0.025, 0.48, g)
    let x = 0.765
    for (const [r, s] of dischi) {
      discoPeso(kit, g, l * (x + s / 2), r, s)
      x += s + 0.004
    }
    kit.disco('accento', [l * (x + 0.015), 0, 0], 0.036, 0.03, g)
  }
  return g
}

// Manubrio con l'impugnatura lungo x: testate tonde gommate.
export function manubrio(kit, parent = kit.modello) {
  const g = kit.gruppo(parent)
  kit.disco('zigrino', [0, 0, 0], 0.017, 0.15, g)
  for (const l of [-1, 1]) {
    kit.disco('gomma', [l * 0.105, 0, 0], 0.078, 0.06, g)
    kit.disco('gomma', [l * 0.15, 0, 0], 0.07, 0.03, g)
    kit.disco('cromo', [l * 0.077, 0, 0], 0.03, 0.006, g)
  }
  return g
}

// Maniglia a D per i cavi: l'impugnatura sta lungo y del gruppo, l'anello sale verso +z.
export function manigliaD(kit, parent = kit.modello) {
  const g = kit.gruppo(parent)
  kit.mesh(kit.cilindro, 'gomma', [0, 0, 0], [0.018, 0.12, 0.018], g)
  const anello = new THREE.TorusGeometry(0.07, 0.008, 8, 24, Math.PI)
  const m = kit.mesh(anello, 'acciaio', [0, 0, 0], [1, 1, 1], g)
  m.rotation.y = -Math.PI / 2
  kit.ovale('acciaio', [0, 0, 0.07], [0.012, 0.012, 0.012], g)
  return g
}

// ---- Panche e telai ------------------------------------------------------------

// Panca regolabile. La parte imbottita su cui sta il busto è agganciata alla
// posa (`posa.bacino`, `posa.rotazione`): il cuscino schiena va da `da` ad `a`
// lungo il busto, sotto la schiena; la seduta è orizzontale in `seduta`.
export function panca(kit, posa, { da = 0.02, a = 0.98, seduta = null, spessore = 0.075, dietro = 0.103 } = {}) {
  const { cuscino, tubo, box, gruppo } = kit
  const schienale = gruppo()
  schienale.position.copy(posa.bacino)
  schienale.quaternion.copy(posa.rotazione)
  cuscino([0, -dietro - spessore / 2, (da + a) / 2], [0.3, spessore, a - da], schienale)
  // Il telaio sotto il cuscino schiena, fino a terra.
  const sotto = (z) => V(0, -dietro - spessore - 0.02, z).applyQuaternion(posa.rotazione).add(posa.bacino)
  const testa = sotto(a - 0.12), mezzo = sotto((da + a) / 2)
  tubo([0, 0.06, testa.z], testa, 0.06)
  tubo(sotto(da + 0.05), testa, 0.055)
  if (seduta) {
    const [zs, ys, lunga] = seduta
    cuscino([0, ys - spessore / 2, zs], [0.3, spessore, lunga])
    tubo([0, 0.06, zs], [0, ys - spessore, zs], 0.06)
  } else {
    tubo([0, 0.06, mezzo.z], mezzo, 0.06)
  }
  // La trave a terra con i piedi larghi davanti e dietro.
  const z0 = Math.min(testa.z, seduta ? seduta[0] : mezzo.z, sotto(da).z) - 0.15
  const z1 = Math.max(testa.z, seduta ? seduta[0] : mezzo.z, sotto(da).z) + 0.1
  tubo([0, 0.06, z0], [0, 0.06, z1], 0.065)
  for (const z of [z0, z1]) {
    box('telaio', [0, 0.04, z], [0.6, 0.06, 0.07])
    for (const l of [-1, 1]) box('gomma', [l * 0.27, 0.012, z], [0.07, 0.024, 0.08])
  }
  return schienale
}

// Montanti del rack per la panca: forcelle (J-hook) all'altezza `y`, in `z`.
export function forcelle(kit, z, y, larghezza = 0.56) {
  const { tubo, box } = kit
  for (const l of [-1, 1]) {
    const x = l * larghezza
    tubo([x, 0, z + 0.04], [x, y + 0.18, z + 0.04], 0.06)
    box('telaio', [x, 0.03, z], [0.08, 0.06, 0.6])
    // La J: appoggio e dente davanti.
    box('accento', [x, y - 0.035, z - 0.01], [0.05, 0.03, 0.12])
    box('accento', [x, y - 0.005, z - 0.065], [0.05, 0.06, 0.02])
  }
  tubo([-larghezza, 0.04, z + 0.04], [larghezza, 0.04, z + 0.04], 0.05)
}

// Pacco pesi con le guide e la piastra alta che si alza quando si tira:
// restituisce il gruppo mobile (la scena ne cambia la y).
export function paccoPesi(kit, x, z, { altezza = 2.1, piastre = 12, larghezza = 0.42 } = {}) {
  const { box, asta, gruppo, tubo } = kit
  for (const dx of [-0.13, 0.13]) asta([x + dx, 0.05, z], [x + dx, altezza - 0.05, z], 0.012, 'cromo')
  for (const dx of [-larghezza / 2 - 0.04, larghezza / 2 + 0.04]) tubo([x + dx, 0, z], [x + dx, altezza, z], 0.06)
  tubo([x - larghezza / 2 - 0.04, altezza, z], [x + larghezza / 2 + 0.04, altezza, z], 0.06)
  box('telaio', [x, 0.03, z], [larghezza + 0.2, 0.06, 0.5])
  for (let i = 0; i < piastre - 3; i++) box(i % 2 ? 'telaio' : 'disco', [x, 0.1 + i * 0.05, z], [larghezza, 0.045, 0.2])
  const mobile = gruppo()
  for (let i = piastre - 3; i < piastre; i++) box(i % 2 ? 'telaio' : 'disco', [x, 0.1 + i * 0.05, z], [larghezza, 0.045, 0.2], mobile)
  asta([x, 0.1 + piastre * 0.05, z], [x, 0.1 + piastre * 0.05 + 0.25, z], 0.01, 'cromo', mobile)
  box('accento', [x + 0.1, 0.1 + (piastre - 3) * 0.05, z - 0.105], [0.025, 0.012, 0.01], mobile)
  return mobile
}

// Tappetino a terra.
export function tappetino(kit, z, lungo = 1.9, largo = 0.65) {
  kit.cuscino([0, 0.008, z], [largo, 0.016, lungo], kit.modello, 'tappetino')
}
