import { creaManichino, orientaManubrio } from './manichino3d.js'
import { CAVO_LATERALE, FACE_PULL, LEVA_SPALLE, posaSpalle } from './poseSpalle3d.js'
import { v } from './corpo3d.js'

// Le scene degli esercizi per le spalle. Come per le gambe: manichino, posa, e
// l'attrezzo intorno, con le parti mobili agganciate alla posa.
export function creaScenaSpalle(e) {
  const m = creaManichino(e)
  const { modello, asta, box, disco, gruppo, segmento } = m
  const iniziale = posaSpalle(e, 0)
  const aggiornamenti = []
  const ogniFotogramma = (f) => aggiornamenti.push(f)
  const pedana = () => box('cuscino', [0, 0.01, -0.05], [1.5, 0.02, 1.5])
  const distanza = (a, b) => a.distanceTo(b)

  function manubri() {
    const coppia = [m.manubrio(), m.manubrio()]
    ogniFotogramma((p) => coppia.forEach((d, i) => orientaManubrio(d, p.braccia[i].mano, p.manubri[i])))
  }
  function bilanciere() {
    const b = m.bilanciere(0.225)
    ogniFotogramma((p) => b.position.copy(p.carico))
  }
  // Panca con lo schienale dritto per le spinte da seduti. Il reverse pec deck
  // non ce l'ha: lì ci si siede al contrario, col petto sul cuscino.
  function pancaSeduti(conSchienale = true) {
    m.seduta(iniziale.gambe[1].anca.y - 0.11, 0.1, 0.5)
    if (!conSchienale) return
    m.schienale(iniziale, -0.1, 0.95)
    box('metallo', [0, 0.45, 0.4], [0.08, 0.9, 0.08])
    box('pesi', [0, 0.035, 0.3], [0.7, 0.07, 0.3])
  }

  switch (e.tipo) {
    case 'lento': case 'tirate':
      pedana()
      bilanciere()
      break
    case 'scrollate':
      pedana()
      if (e.attrezzo === 'bilanciere') bilanciere()
      else manubri()
      break
    case 'lento-manubri': case 'arnold':
      pancaSeduti()
      manubri()
      break
    case 'laterali': case 'frontali': case 'posteriori':
      pedana()
      manubri()
      break
    case 'macchina': {
      pancaSeduti()
      const { perno, raggio, x } = LEVA_SPALLE
      // Telaio: due montanti fino ai perni, dietro lo schienale.
      for (const lato of [-1, 1]) {
        asta([lato * x, 0.04, perno.z], [lato * x, perno.y, perno.z], 0.04)
        disco('anello', [lato * (x + 0.02), perno.y, perno.z], [0.06, 0.1, 0.06]).rotation.z = Math.PI / 2
      }
      box('pesi', [0, 0.04, 0.5], [1, 0.08, 1])
      const stack = m.pacco(0, 1.25, 1.9, 9, 4)
      const leve = [-1, 1].map(() => asta([0, 0, 0], [0, 1, 0], 0.03))
      const maniglie = [-1, 1].map(() => asta([0, 0, 0], [0, 1, 0], 0.024, 'anello'))
      ogniFotogramma((p) => {
        p.braccia.forEach((b, i) => {
          const lato = i === 0 ? -1 : 1
          const asse = v(lato * x, perno.y, perno.z)
          segmento(leve[i], asse, v(lato * x, b.mano.y, b.mano.z), 0.03)
          segmento(maniglie[i], b.mano.clone().setX(lato * (x - 0.07)), b.mano.clone().setX(lato * (x + 0.07)), 0.024)
        })
        stack.position.y = (p.leva - iniziale.leva) * raggio * 0.5
      })
      break
    }
    case 'laterali-cavo': {
      pedana()
      const { colonna, carrucola } = CAVO_LATERALE
      const stack = m.pacco(colonna - 0.28, 0, 2.3, 9, 3)
      disco('anello', [carrucola.x, carrucola.y, carrucola.z], [0.06, 0.04, 0.06]).rotation.z = Math.PI / 2
      const cavo = asta([0, 0, 0], [0, 1, 0], 0.005, 'cavo')
      const maniglia = asta([0, 0, 0], [0, 1, 0], 0.024, 'anello')
      const riposo = distanza(carrucola, iniziale.braccia[1].mano)
      ogniFotogramma((p) => {
        const mano = p.braccia[1].mano
        segmento(cavo, carrucola, mano, 0.005)
        segmento(maniglia, mano.clone().add(v(0, 0, -0.06)), mano.clone().add(v(0, 0, 0.06)), 0.024)
        stack.position.y = distanza(carrucola, mano) - riposo
      })
      break
    }
    case 'reverse-pec-deck': {
      pancaSeduti(false)
      // Cuscino per il petto, davanti allo sterno.
      const cuscino = gruppo()
      cuscino.position.copy(iniziale.bacino)
      cuscino.quaternion.copy(iniziale.rotazione)
      box('cuscino', [0, 0.25, 0.5], [0.36, 0.07, 0.55], cuscino)
      asta([0, iniziale.bacino.y + 0.3, iniziale.bacino.z - 0.29], [0, iniziale.bacino.y + 0.3, -0.75], 0.03)
      const alto = iniziale.perni[1].y + 0.36
      asta([0, 0.04, -0.75], [0, alto, -0.75], 0.045)
      box('pesi', [0, 0.04, -0.3], [0.9, 0.08, 1.3])
      const bracci = iniziale.perni.map((perno, i) => {
        asta([0, alto, -0.75], [perno.x, alto, perno.z], 0.035)
        disco('anello', [perno.x, alto - 0.03, perno.z], [0.06, 0.08, 0.06])
        const g = gruppo()
        g.position.set(perno.x, alto - 0.07, perno.z)
        const giu = iniziale.braccia[i].mano.y - g.position.y
        asta([0, 0, 0], [0, 0, -0.73], 0.028, 'metallo', g)
        asta([0, 0, -0.73], [0, giu + 0.08, -0.73], 0.024, 'metallo', g)
        asta([0, giu - 0.08, -0.73], [0, giu + 0.08, -0.73], 0.026, 'anello', g)
        return g
      })
      ogniFotogramma((p) => bracci.forEach((g, i) => { g.rotation.y = -(i === 0 ? -1 : 1) * p.apertura }))
      break
    }
    case 'face-pull': {
      pedana()
      const { carrucola } = FACE_PULL
      const stack = m.pacco(0, carrucola.z - 0.25, 2.3, 9, 3)
      box('metallo', [0, carrucola.y, carrucola.z - 0.12], [0.08, 0.08, 0.24])
      disco('anello', [0, carrucola.y, carrucola.z], [0.06, 0.04, 0.06]).rotation.z = Math.PI / 2
      const cavo = asta([0, 0, 0], [0, 1, 0], 0.005, 'cavo')
      const corde = [-1, 1].map(() => asta([0, 0, 0], [0, 1, 0], 0.013, 'pesi'))
      const nodo = (p) => {
        const centro = p.braccia[0].mano.clone().add(p.braccia[1].mano).multiplyScalar(0.5)
        return centro.clone().add(carrucola.clone().sub(centro).setLength(0.28))
      }
      const riposo = distanza(carrucola, nodo(iniziale))
      ogniFotogramma((p) => {
        const n = nodo(p)
        segmento(cavo, carrucola, n, 0.005)
        p.braccia.forEach((b, i) => segmento(corde[i], n, b.mano, 0.013))
        stack.position.y = Math.max(0, distanza(carrucola, n) - riposo)
      })
      break
    }
    default:
      throw new Error(`Scena spalle sconosciuta: ${e.tipo}`)
  }

  function aggiorna(fase) {
    const p = posaSpalle(e, fase)
    m.aggiornaCorpo(p)
    for (const f of aggiornamenti) f(p)
  }
  aggiorna(0)
  const { bersaglio, camera } = INQUADRATURE[e.tipo] || INQUADRATURE.base
  return { modello, aggiorna, bersaglio, camera }
}

// Di tre quarti davanti per le spinte e le alzate; da dietro quando il muscolo
// che lavora sta sul retro (deltoide posteriore, trapezio medio).
const INQUADRATURE = {
  base: { bersaglio: [0, 1.45, 0], camera: [2.8, 2.5, -3.9] },
  lento: { bersaglio: [0, 1.5, 0], camera: [2.8, 2.5, -4.1] },
  'lento-manubri': { bersaglio: [0, 1.35, 0.1], camera: [2.6, 2.2, -3.4] },
  arnold: { bersaglio: [0, 1.35, 0.1], camera: [2.4, 2.1, -3.5] },
  macchina: { bersaglio: [0, 1.35, 0.2], camera: [3.2, 2.3, -3] },
  posteriori: { bersaglio: [0, 1.0, 0], camera: [3.3, 3.3, 2.8] },
  'reverse-pec-deck': { bersaglio: [0, 1.35, 0], camera: [2.6, 2.6, 3.2] },
  'face-pull': { bersaglio: [0, 1.55, -0.3], camera: [2.7, 2.5, 3] },
  'laterali-cavo': { bersaglio: [0, 1.4, 0], camera: [1.9, 2.4, -4] },
}
