import * as THREE from 'three'
import { creaManichino, orientaManubrio } from './manichino3d.js'
import { MISURE_GAMBE, posaGambe } from './poseGambe3d.js'
import { gradi, v } from './corpo3d.js'

const { LEG_PRESS, PRESSA_SU, PRESSA_NORMALE, PRESSA_CAVIGLIA, BULGARI, SDRAIATO, CALF, STEP } = MISURE_GAMBE

// Le scene degli esercizi per le gambe: il manichino di manichino3d, le pose di
// poseGambe3d, e intorno l'attrezzo vero. Le parti che si muovono (slitte,
// pedane, leve, piastre del pacco pesi) sono agganciate alla posa, non animate
// per conto loro: se la posa cambia, l'attrezzo la segue.
export function creaScenaGambe(e) {
  const m = creaManichino(e)
  const { modello, asta, box, disco, gruppo } = m
  const iniziale = posaGambe(e, 0)
  const aggiornamenti = []
  const ogniFotogramma = (f) => aggiornamenti.push(f)

  // Pedana di gomma sotto chi si allena a corpo libero.
  const pedana = () => box('cuscino', [0, 0.01, -0.05], [1.5, 0.02, 1.7])

  // Mezzo rack: montanti dietro (così non coprono chi si allena) e bracci di
  // sicurezza in avanti, all'altezza giusta per il fondo dello squat.
  function rack(sicurezze) {
    for (const x of [-0.72, 0.72]) {
      box('metallo', [x, 1.2, 0.45], [0.07, 2.4, 0.07])
      box('pesi', [x, 0.03, 0.2], [0.12, 0.06, 0.9])
      asta([x, sicurezze, 0.45], [x, sicurezze, -0.45], 0.022, 'anello')
    }
    box('metallo', [0, 2.38, 0.45], [1.51, 0.07, 0.07])
  }
  // Leva che ruota attorno all'asse del ginocchio (leg extension e leg curl):
  // un braccio sul fianco esterno e il rullo imbottito sulla tibia.
  function levaGinocchio(ginocchio, rullo, lato = 1) {
    const g = gruppo()
    g.position.set(0, ginocchio.y, ginocchio.z)
    disco('anello', [lato * 0.34, 0, 0], [0.07, 0.06, 0.07], g).rotation.z = Math.PI / 2
    asta([lato * 0.34, 0, 0], [lato * 0.34, rullo[1], rullo[2]], 0.025, 'metallo', g)
    asta([lato * 0.34, rullo[1], rullo[2]], [-0.26, rullo[1], rullo[2]], 0.018, 'metallo', g)
    disco('imbottitura', [0, rullo[1], rullo[2]], [0.06, 0.5, 0.06], g).rotation.z = Math.PI / 2
    return g
  }
  function manubri() {
    const coppia = [m.manubrio(), m.manubrio()]
    ogniFotogramma((p) => coppia.forEach((d, i) => orientaManubrio(d, p.braccia[i].mano, v(0, 0, 1))))
  }

  switch (e.tipo) {
    case 'squat': {
      pedana()
      if (e.carico === 'goblet') {
        const d = m.manubrio()
        d.scale.set(1, 1.1, 1.1)
        ogniFotogramma((p) => orientaManubrio(d, p.carico, p.asseCarico))
      } else {
        rack(e.carico === 'dietro' ? 1.2 : 1.16)
        const b = m.bilanciere()
        ogniFotogramma((p) => b.position.copy(p.carico))
      }
      break
    }
    case 'hack': {
      // Binari paralleli allo schienale, slitta con spalliere, pedana inclinata.
      const basso = posaGambe(e, 0.5)
      const dir = iniziale.binario
      const dietro = new THREE.Vector3(0, -0.3, 0).applyQuaternion(iniziale.rotazione)
      for (const x of [-0.3, 0.3]) {
        const a = basso.bacino.clone().add(dietro).addScaledVector(dir, -0.35).setX(x)
        const b = iniziale.bacino.clone().add(dietro).addScaledVector(dir, 1.25).setX(x)
        asta(a, b, 0.035)
        asta(a, a.clone().setY(0.02), 0.03)
        asta(b, b.clone().setY(0.02), 0.03)
      }
      box('pesi', [0, 0.04, 0.35], [0.9, 0.08, 1.6])
      // Pedana sotto le suole: il suo piano alto passa per tallone e pianta.
      const cav = iniziale.gambe[1]
      const su = cav.caviglia.clone().sub(cav.tallone).projectOnPlane(cav.pianta.clone().sub(cav.tallone).normalize()).normalize()
      const piano = gruppo()
      piano.position.copy(cav.tallone).add(cav.pianta).multiplyScalar(0.5).addScaledVector(su, -0.03).setX(0)
      piano.rotation.x = gradi(20)
      box('pesi', [0, 0, 0], [0.8, 0.06, 0.55], piano)
      asta([0, 0.02, piano.position.z], [0, piano.position.y, piano.position.z], 0.03)
      const slitta = gruppo()
      box('cuscino', [0, -0.2, 0.42], [0.46, 0.08, 1.05], slitta)
      for (const lato of [-1, 1]) {
        box('imbottitura', [lato * 0.19, 0.03, 0.93], [0.13, 0.26, 0.08], slitta)
        asta([lato * 0.36, 0.06, 0.84], [lato * 0.36, 0.18, 0.84], 0.022, 'anello', slitta)
        asta([lato * 0.36, 0.06, 0.84], [lato * 0.3, -0.25, 0.84], 0.02, 'metallo', slitta)
        disco('pesi', [lato * 0.42, -0.25, 0.2], [0.2, 0.06, 0.2], slitta).rotation.z = Math.PI / 2
      }
      ogniFotogramma((p) => { slitta.position.copy(p.bacino); slitta.quaternion.copy(p.rotazione) })
      break
    }
    case 'leg-press': {
      m.seduta(LEG_PRESS.anche.y - 0.17, 0.25, 0.46)
      m.schienale(iniziale, -0.05, 1)
      box('pesi', [0, 0.04, -0.45], [0.9, 0.08, 2])
      for (const x of [-0.42, 0.42]) {
        asta([x, 0.5, -1.2], [x, 0.5, 0.05], 0.025)
        asta([x, 0.08, 0.05], [x, 0.5, 0.05], 0.03)
      }
      const stack = m.pacco(0, -1.3, 1.6, 10, 4)
      const piastra = gruppo()
      box('pesi', [0, 0.8, -0.03], [0.72, 0.66, 0.05], piastra)
      for (const x of [-0.42, 0.42]) box('metallo', [x, 0.5, -0.06], [0.07, 0.12, 0.12], piastra)
      const cavo = asta([0, 0.5, -1.5], [0, 0.5, -0.8], 0.006, 'cavo')
      ogniFotogramma((p) => {
        piastra.position.z = p.pedana
        const corsa = p.pedana - LEG_PRESS.pedana[0]
        stack.position.y = corsa
        m.segmento(cavo, v(0, 1.35 + corsa, -1.3), v(0, 0.55, p.pedana - 0.06), 0.006)
      })
      break
    }
    case 'pressa-45': {
      // Seduta quasi sdraiata; la slitta scorre su due binari a 45°.
      m.schienale(iniziale, -0.25, 1.05)
      box('pesi', [0, 0.04, 0.2], [1.1, 0.08, 2.3])
      for (const z of [-0.1, 0.95]) {
        const sotto = new THREE.Vector3(0, -0.24, z).applyQuaternion(iniziale.rotazione).add(iniziale.bacino)
        asta(sotto, sotto.clone().setY(0.06), 0.04)
      }
      // La suola sta 0.1 sotto la caviglia, dalla parte opposta a chi spinge.
      const piede = PRESSA_CAVIGLIA.clone().addScaledVector(PRESSA_NORMALE, -0.1)
      for (const x of [-0.45, 0.45]) {
        const a = piede.clone().addScaledVector(PRESSA_SU, -0.75).add(v(0, -0.35, -0.35)).setX(x)
        const b = a.clone().addScaledVector(PRESSA_SU, 1.8)
        asta(a, b, 0.035)
        asta(a, a.clone().setY(0.05), 0.035)
        asta(b, b.clone().setY(0.05), 0.035)
      }
      const slitta = gruppo()
      const piano = gruppo(slitta)
      piano.position.copy(piede)
      piano.quaternion.setFromUnitVectors(v(0, 0, 1), PRESSA_NORMALE)
      box('pesi', [0, 0, -0.03], [0.85, 0.7, 0.06], piano)
      for (const lato of [-1, 1]) {
        asta([lato * 0.45, 0, -0.35], [lato * 0.72, 0, -0.35], 0.03, 'metallo', piano)
        disco('pesi', [lato * 0.62, 0, -0.35], [0.26, 0.07, 0.26], piano).rotation.z = Math.PI / 2
        box('metallo', [lato * 0.45, 0, -0.2], [0.08, 0.1, 0.3], piano)
      }
      for (const lato of [-1, 1]) asta([lato * 0.4, 0.62, 0.42], [lato * 0.4, 0.66, 0.2], 0.02, 'anello')
      ogniFotogramma((p) => slitta.position.copy(PRESSA_SU).multiplyScalar(p.slitta))
      break
    }
    case 'affondi':
      pedana()
      manubri()
      break
    case 'bulgari':
      pedana()
      m.panca(-0.1, BULGARI.panca + 0.02, 0.95, 0.95)
      manubri()
      break
    case 'leg-extension': {
      const anca = iniziale.gambe[1].anca
      m.seduta(anca.y - 0.17, anca.z - 0.14, 0.52)
      m.schienale(iniziale, 0.05, 0.9)
      for (const lato of [-1, 1]) asta([lato * 0.34, anca.y - 0.12, 0.02], [lato * 0.34, anca.y - 0.12, -0.2], 0.022, 'anello')
      box('pesi', [-0.4, 0.04, -0.1], [1.4, 0.08, 1.2])
      const stack = m.pacco(-0.95, 0.1, 1.7, 9, 4)
      const leva = levaGinocchio(iniziale.gambe[1].ginocchio, [0, -0.39, -0.12])
      ogniFotogramma((p) => {
        leva.rotation.x = gradi(90 - p.leva)
        stack.position.y = Math.abs(p.leva - iniziale.leva) * 0.004
      })
      break
    }
    case 'leg-curl-seduto': {
      const anca = iniziale.gambe[1].anca
      const ginocchio = iniziale.gambe[1].ginocchio
      m.seduta(anca.y - 0.17, anca.z - 0.14, 0.52)
      m.schienale(iniziale, 0.05, 0.9)
      // Cuscinetto fermo sopra le cosce, vicino alle ginocchia.
      disco('imbottitura', [0, ginocchio.y + 0.15, ginocchio.z + 0.12], [0.06, 0.52, 0.06]).rotation.z = Math.PI / 2
      asta([0.34, ginocchio.y + 0.15, ginocchio.z + 0.12], [0.34, ginocchio.y - 0.02, ginocchio.z + 0.12], 0.022)
      box('pesi', [-0.4, 0.04, -0.1], [1.4, 0.08, 1.2])
      const stack = m.pacco(-0.95, 0.1, 1.7, 9, 4)
      const leva = levaGinocchio(ginocchio, [0, -0.4, 0.12])
      ogniFotogramma((p) => {
        leva.rotation.x = gradi(90 - p.leva)
        stack.position.y = Math.abs(p.leva - iniziale.leva) * 0.004
      })
      break
    }
    case 'leg-curl-sdraiato': {
      const ginocchio = iniziale.gambe[1].ginocchio
      box('cuscino', [0, SDRAIATO.panca - 0.05, -0.08], [0.46, 0.1, 1.4])
      for (const z of [-0.6, 0.45]) {
        box('metallo', [0, (SDRAIATO.panca - 0.1) / 2, z], [0.08, SDRAIATO.panca - 0.1, 0.08])
        box('pesi', [0, 0.035, z], [0.7, 0.07, 0.18])
      }
      for (const lato of [-1, 1]) {
        asta([lato * 0.3, 0.52, -0.84], [lato * 0.3, 0.72, -0.84], 0.024, 'anello')
        asta([lato * 0.3, 0.52, -0.84], [lato * 0.12, 0.45, -0.66], 0.02)
      }
      const g = gruppo()
      g.position.set(0, ginocchio.y, ginocchio.z)
      disco('anello', [0.34, 0, 0], [0.07, 0.06, 0.07], g).rotation.z = Math.PI / 2
      asta([0.34, 0, 0], [0.34, 0.1, 0.4], 0.025, 'metallo', g)
      asta([0.34, 0.1, 0.4], [-0.26, 0.1, 0.4], 0.018, 'metallo', g)
      disco('imbottitura', [0, 0.1, 0.4], [0.06, 0.5, 0.06], g).rotation.z = Math.PI / 2
      box('pesi', [0, 0.04, 0.2], [0.9, 0.08, 1.9])
      ogniFotogramma((p) => { g.rotation.x = -gradi(p.leva) })
      break
    }
    case 'gambe-tese': case 'sumo': {
      pedana()
      const b = m.bilanciere()
      ogniFotogramma((p) => b.position.copy(p.carico))
      break
    }
    case 'calf-piedi': {
      // Rialzo sotto le punte, spalliere agganciate a un carrello sui binari.
      box('pesi', [0, CALF.rialzo / 2, -0.19], [0.8, CALF.rialzo, 0.38])
      box('pesi', [0, 0.04, 0.3], [1, 0.08, 1.4])
      for (const x of [-0.42, 0.42]) asta([x, 0.06, 0.55], [x, 2.5, 0.55], 0.035)
      box('metallo', [0, 2.5, 0.55], [0.95, 0.07, 0.08])
      const carrello = gruppo()
      box('metallo', [0, 0, 0.5], [0.95, 0.12, 0.12], carrello)
      for (const lato of [-1, 1]) {
        asta([lato * 0.2, 0, 0.45], [lato * 0.2, 0, 0.04], 0.03, 'metallo', carrello)
        box('imbottitura', [lato * 0.2, -0.03, 0.02], [0.14, 0.09, 0.22], carrello)
        asta([lato * 0.33, -0.01, 0.1], [lato * 0.33, 0.12, 0.1], 0.022, 'anello', carrello)
      }
      const stack = m.pacco(0, 0.95, 2.1, 9, 4)
      const base = iniziale.sollevamento
      ogniFotogramma((p) => {
        const spalla = p.braccia[1].spalla
        carrello.position.set(0, spalla.y + 0.12, spalla.z)
        stack.position.y = p.sollevamento - base
      })
      break
    }
    case 'calf-seduto': {
      m.seduta(0.43, 0.22, 0.5)
      box('pesi', [0, 0.04, -0.3], [0.8, 0.08, 1.3])
      box('pesi', [0, 0.04, -0.57], [0.6, 0.08, 0.28])
      const perno = v(0, iniziale.gambe[1].ginocchio.y + 0.1, iniziale.gambe[1].ginocchio.z - 0.85)
      for (const x of [-0.4, 0.4]) asta([x, 0.06, perno.z], [x, perno.y, perno.z], 0.035)
      const leva = gruppo()
      leva.position.copy(perno)
      for (const lato of [-1, 1]) asta([lato * 0.4, 0, 0], [lato * 0.4, 0, 0.84], 0.028, 'metallo', leva)
      disco('imbottitura', [0, 0, 0.84], [0.065, 0.62, 0.065], leva).rotation.z = Math.PI / 2
      disco('pesi', [0.52, 0, 0.3], [0.22, 0.06, 0.22], leva).rotation.z = Math.PI / 2
      disco('pesi', [-0.52, 0, 0.3], [0.22, 0.06, 0.22], leva).rotation.z = Math.PI / 2
      ogniFotogramma((p) => {
        const g = p.gambe[1].ginocchio
        leva.rotation.x = -Math.atan2(g.y + 0.1 - perno.y, g.z - perno.z)
      })
      break
    }
    case 'adduttori': case 'abduttori': {
      const anca = iniziale.gambe[1].anca
      m.seduta(anca.y - 0.17, anca.z - 0.14, 0.52)
      m.schienale(iniziale, 0.05, 0.95)
      box('pesi', [0, 0.04, -0.1], [1.4, 0.08, 1.2])
      const fuori = e.tipo === 'abduttori' ? 1 : -1
      const bracci = [-1, 1].map((lato, i) => {
        const g = gruppo()
        const a = iniziale.gambe[i].anca
        g.position.set(a.x, a.y - 0.16, a.z)
        disco('metallo', [0, -0.12, 0], [0.04, 0.24, 0.04], g)
        asta([0, 0, 0], [0, 0, -0.5], 0.028, 'metallo', g)
        const suola = iniziale.gambe[i].tallone.y - 0.02 - g.position.y
        asta([0, 0, -0.5], [0, suola, -0.5], 0.024, 'metallo', g)
        box('imbottitura', [lato * fuori * 0.11, 0.15, -0.46], [0.05, 0.24, 0.18], g)
        asta([0, 0.02, -0.46], [lato * fuori * 0.11, 0.1, -0.46], 0.018, 'metallo', g)
        box('pesi', [0, suola, -0.56], [0.14, 0.04, 0.3], g)
        return g
      })
      ogniFotogramma((p) => bracci.forEach((g, i) => { g.rotation.y = -[-1, 1][i] * p.apertura }))
      break
    }
    case 'step-up':
      pedana()
      box('cuscino', [0, STEP.rialzo / 2, STEP.z - 0.05], [0.9, STEP.rialzo, 0.55])
      manubri()
      break
    default:
      throw new Error(`Scena gambe sconosciuta: ${e.tipo}`)
  }

  function aggiorna(fase) {
    const p = posaGambe(e, fase)
    m.aggiornaCorpo(p)
    for (const f of aggiornamenti) f(p)
  }
  aggiorna(0)
  const { bersaglio, camera } = INQUADRATURE[e.tipo] || INQUADRATURE.base
  return { modello, aggiorna, bersaglio, camera }
}

// Da dove si guarda: di tre quarti davanti, dal lato che mostra meglio il gesto;
// di fianco per i polpacci, che stanno dietro e si vedono solo col tallone.
const INQUADRATURE = {
  base: { bersaglio: [0, 1.1, -0.05], camera: [3.5, 2.2, -3.2] },
  affondi: { bersaglio: [0, 1, 0], camera: [3.4, 2, -2.6] },
  bulgari: { bersaglio: [0, 0.95, 0.15], camera: [3.4, 2, -2.4] },
  'step-up': { bersaglio: [0, 1.15, -0.25], camera: [3.4, 2.2, -2.8] },
  hack: { bersaglio: [0, 1, 0.1], camera: [3.6, 2, -2.3] },
  'leg-press': { bersaglio: [0, 0.85, -0.35], camera: [3.5, 2, -1.5] },
  'pressa-45': { bersaglio: [0, 0.8, 0.1], camera: [3.7, 1.9, -1.2] },
  'leg-extension': { bersaglio: [0, 0.95, -0.2], camera: [3.3, 1.8, -2.4] },
  'leg-curl-seduto': { bersaglio: [0, 0.95, -0.3], camera: [3.3, 1.8, -2.4] },
  'leg-curl-sdraiato': { bersaglio: [0, 0.85, 0.1], camera: [3.2, 2.2, 1.9] },
  'calf-piedi': { bersaglio: [0, 1.2, 0.15], camera: [4.3, 1.8, 1.5] },
  'calf-seduto': { bersaglio: [0, 0.6, -0.25], camera: [3.4, 1.5, 0.6] },
  adduttori: { bersaglio: [0, 0.9, -0.1], camera: [1.6, 2.4, -3.6] },
  abduttori: { bersaglio: [0, 0.9, -0.1], camera: [1.6, 2.4, -3.6] },
}
