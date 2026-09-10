import * as THREE from 'three'
import { creaBaseSchiena } from './manichinoSchiena3d.js'
import { posaSchiena } from './poseSchiena3d.js'

export function creaScenaSchiena(e) {
  const { modello, asta, box, ovale, disco, segmento, aggiornaCorpo } = creaBaseSchiena(e)
  const v = (p) => new THREE.Vector3(...p)
  const group = () => { const g = new THREE.Group(); modello.add(g); return g }
  const cavi = []
  const cavo = (a, b, r = 0.004, mat = 'cavo') => {
    const m = asta(a, b, r, mat); cavi.push(m); return m
  }
  function torre(z, h = 2.5) {
    for (const x of [-0.28, 0.28]) box('metallo', [x, h / 2, z], [0.055, h, 0.06])
    box('pesi', [0, 0.04, z], [0.85, 0.08, 0.7])
    box('metallo', [0, h, z], [0.62, 0.065, 0.1])
    for (let i = 0; i < 8; i++) box('pesi', [0, 0.13 + i * 0.075, z], [0.4, 0.055, 0.23])
  }
  function panca(x, y, z, lunghezza = 0.9) {
    box('cuscino', [x, y - 0.045, z], [0.46, 0.09, lunghezza])
    for (const dz of [-lunghezza * 0.32, lunghezza * 0.32]) {
      box('metallo', [x, y / 2 - 0.045, z + dz], [0.08, y - 0.09, 0.08])
      box('pesi', [x, 0.035, z + dz], [0.7, 0.07, 0.18])
    }
  }

  if (e.tipo === 'trazioni') {
    for (const x of [-0.86, 0.86]) {
      box('metallo', [x, 1.37, -0.18], [0.075, 2.74, 0.075])
      box('pesi', [x, 0.04, 0], [0.4, 0.08, 1.6])
    }
    asta([-0.9, 2.65, -0.18], [0.9, 2.65, -0.18], 0.026)
    if (e.presa === 'neutra') {
      for (const x of [-e.larghezza, e.larghezza]) asta([x, 2.65, -0.42], [x, 2.65, 0.06], 0.024, 'anello')
    } else {
      for (const lato of [-1, 1]) asta([lato * e.larghezza - 0.065, 2.65, -0.18], [lato * e.larghezza + 0.065, 2.65, -0.18], 0.027, 'anello')
    }
  }
  if (e.tipo === 'lat') {
    torre(0.67, 2.65)
    panca(0, 0.56, 0.02, 0.65)
    asta([0, 2.65, 0.67], [0, 2.65, -0.32], 0.035)
    asta([-0.43, 0.78, -0.22], [0.43, 0.78, -0.22], 0.08, 'cuscino')
    asta([0, 0.08, -0.22], [0, 0.7, -0.22], 0.035)
    disco('anello', [0, 2.65, -0.32], [0.07, 0.045, 0.07]).rotation.z = Math.PI / 2
    cavo([0, 2.65, -0.32], [0, 2.04, -0.32])
  }
  if (e.tipo === 'pulley') {
    torre(-1.2, 1.9)
    panca(0, 0.47, 0.55, 0.95)
    for (const x of [-0.22, 0.22]) {
      box('pesi', [x, 0.17, -0.73], [0.2, 0.32, 0.07]).rotation.x = -0.3
    }
    cavo([0, 0.34, -1.15], [0, 1.15, -0.65])
  }
  if (e.tipo === 'rematore-singolo') panca(-0.2, 0.5, 0.2, 2)
  if (e.tipo === 'rematore-macchina') {
    torre(-1.12, 1.8)
    panca(0, 0.56, 0.14, 0.65)
    box('cuscino', [0, 1.15, -0.26], [0.34, 0.43, 0.11]).rotation.x = -0.15
    asta([0, 0.04, -0.26], [0, 1.1, -0.26], 0.04)
    for (const lato of [-1, 1]) {
      asta([lato * 0.28, 1.15, -1.12], [lato * 0.5, 1.15, -0.96], 0.028)
      cavo([lato * 0.5, 1.15, -0.96], [lato * 0.31, 1.21, -0.77])
    }
  }
  if (['pullover-cavi', 'face-pull'].includes(e.tipo)) {
    const z = e.tipo === 'face-pull' ? -1.4 : -1.1
    torre(z, 2.55)
    disco('anello', [0, e.tipo === 'face-pull' ? 2.03 : 2.5, z], [0.07, 0.045, 0.07]).rotation.z = Math.PI / 2
    cavo([0, 2.5, z], [0, 1.8, -0.8])
    if (e.tipo === 'face-pull') {
      cavo([0, 1.8, -0.8], [-0.16, 1.7, -0.66], 0.012, 'pesi')
      cavo([0, 1.8, -0.8], [0.16, 1.7, -0.66], 0.012, 'pesi')
    }
  }
  if (e.tipo === 'hyperextension') {
    box('pesi', [0, 0.04, 0.34], [0.95, 0.08, 1.25])
    asta([0, 0.08, 0.6], [0, 0.77, 0.02], 0.045)
    for (const x of [-0.14, 0.14]) box('cuscino', [x, 0.77, 0.03], [0.24, 0.18, 0.33]).rotation.x = -Math.PI / 4
    asta([-0.37, 0.21, 0.67], [0.37, 0.21, 0.67], 0.075, 'cuscino')
    box('pesi', [0, 0.06, 0.5], [0.7, 0.08, 0.4])
  }

  function bilanciere(manubrio = false) {
    const g = group()
    asta([manubrio ? -0.19 : -1.15, 0, 0], [manubrio ? 0.19 : 1.15, 0, 0], 0.022, 'metallo', g)
    for (const lato of [-1, 1]) {
      const x = manubrio ? 0.135 : 0.87, r = manubrio ? 0.115 : 0.265
      disco('pesi', [lato * x, 0, 0], [r, 0.085, r], g).rotation.z = Math.PI / 2
      disco('anello', [lato * (x + 0.057), 0, 0], [0.052, 0.025, 0.052], g).rotation.z = Math.PI / 2
    }
    return g
  }
  const peso = ['bilanciere', 'manubrio'].includes(e.attrezzo) ? bilanciere(e.attrezzo === 'manubrio') : null
  if (peso) peso.name = 'carico'
  const maniglia = ['lat', 'pulley', 'pullover-cavi'].includes(e.tipo) ? group() : null
  if (maniglia) {
    if (e.tipo === 'pulley' || e.presa === 'neutra') {
      const larghezza = e.larghezza || 0.13
      const vertice = e.tipo === 'lat' ? [0, 0.15, 0] : [0, 0, -0.15]
      for (const lato of [-1, 1]) {
        asta(vertice, [lato * larghezza, 0, 0], 0.018, 'metallo', maniglia)
        asta([lato * larghezza, 0, -0.09], [lato * larghezza, 0, 0.09], 0.022, 'anello', maniglia)
      }
    } else {
      const w = e.tipo === 'pullover-cavi' ? 0.33 : (e.larghezza || 0.5) + 0.15
      asta([-w, 0, 0], [w, 0, 0], 0.021, 'metallo', maniglia)
      for (const lato of [-1, 1]) asta([lato * w, 0, 0], [lato * (w + 0.12), -0.065, 0], 0.022, 'anello', maniglia)
    }
  }
  const impugnature = ['rematore-macchina', 'face-pull'].includes(e.tipo)
    ? [-1, 1].map(() => asta([0, 0, 0], [0, 0.12, 0], 0.024, 'anello')) : []
  const tbar = e.tipo === 't-bar' ? group() : null
  if (tbar) {
    tbar.position.set(0, 0.12, 1.25)
    box('pesi', [0, 0.045, 1.25], [0.42, 0.09, 0.42])
    ovale('metallo', [0, 0.12, 1.25], [0.085, 0.085, 0.085])
    asta([0, 0, 0], [0, 2.03, 0], 0.025, 'metallo', tbar)
    disco('pesi', [0, 1.94, 0], [0.22, 0.09, 0.22], tbar)
    asta([-0.23, 1.8, 0], [0.23, 1.8, 0], 0.022, 'anello', tbar)
  }

  function aggiorna(fase) {
    const p = posaSchiena(e, fase)
    aggiornaCorpo(p)
    const centro = p.braccia[0].mano.clone().add(p.braccia[1].mano).multiplyScalar(0.5)
    if (peso) {
      peso.position.copy(e.tipo === 'rematore-singolo' ? p.braccia[1].mano : centro)
      if (e.tipo === 'rematore-singolo') peso.rotation.y = Math.PI / 2
    }
    if (maniglia) maniglia.position.copy(centro)
    if (tbar) tbar.quaternion.setFromUnitVectors(v([0, 1, 0]), centro.clone().sub(tbar.position).normalize())
    if (e.tipo === 'lat') segmento(cavi[0], v([0, 2.65, -0.32]), centro.clone().add(v([0, e.presa === 'neutra' ? 0.15 : 0, 0])), 0.004)
    if (e.tipo === 'pulley') segmento(cavi[0], v([0, 0.34, -1.15]), centro.clone().add(v([0, 0, -0.15])), 0.004)
    if (e.tipo === 'pullover-cavi') segmento(cavi[0], v([0, 2.5, -1.1]), centro, 0.004)
    if (e.tipo === 'rematore-macchina') {
      p.braccia.forEach((b, i) => segmento(cavi[i], v([i === 0 ? -0.5 : 0.5, 1.15, -0.96]), b.mano, 0.004))
    }
    if (e.tipo === 'face-pull') {
      const nodo = centro.clone().add(v([0, 0, -0.27]))
      segmento(cavi[0], v([0, 2.03, -1.4]), nodo, 0.004)
      p.braccia.forEach((b, i) => segmento(cavi[i + 1], nodo, b.mano, 0.012))
    }
    impugnature.forEach((m, i) => {
      const mano = p.braccia[i].mano
      segmento(m, mano.clone().add(v([0, -0.06, 0])), mano.clone().add(v([0, 0.06, 0])), 0.024)
    })
  }
  aggiorna(0)
  const alta = ['trazioni', 'lat', 'pullover-cavi', 'face-pull'].includes(e.tipo)
  const bersaglio = e.tipo === 'trazioni' ? [0, 1.48, 0] : alta ? [0, 1.25, -0.1] : [0, 0.95, 0]
  const camera = e.tipo === 'trazioni' ? [3.5, 2.8, 4.5]
    : e.tipo === 'rematore-singolo' ? [3.3, 2.7, 3.2]
      : e.tipo === 'hyperextension' ? [3.1, 2.3, 2.7]
        : e.tipo === 'lat' ? [4.2, 2.7, 2.8]
          : alta ? [3.4, 2.6, 4] : [2.9, 2.35, 3.3]
  return { modello, aggiorna, bersaglio, camera }
}
