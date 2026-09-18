import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { ESERCIZI_GAMBE_3D } from '../src/lib/gambeCatalogo3d.js'
import { posaGambe } from '../src/lib/poseGambe3d.js'
import { creaScenaGambe } from '../src/lib/gambe3d.js'
import { AVAMBRACCIO, COSCIA, OMERO, PIANTA, TALLONE, TIBIA } from '../src/lib/corpo3d.js'

const vicino = (a, b, eps = 1e-8) => Math.abs(a - b) < eps
const fasi = (n) => Array.from({ length: n + 1 }, (_, i) => i / n)
const trova = (tipo, extra = {}) => ESERCIZI_GAMBE_3D.find((e) => e.tipo === tipo && Object.entries(extra).every(([k, v]) => e[k] === v))

function libera(modello) {
  const geometrie = new Set(), materiali = new Set()
  modello.traverse((o) => {
    if (o.geometry) geometrie.add(o.geometry)
    if (o.material) materiali.add(o.material)
  })
  geometrie.forEach((g) => g.dispose())
  materiali.forEach((m) => m.dispose())
}

test('ogni esercizio per le gambe del catalogo ha un tipo che la posa conosce', () => {
  for (const e of ESERCIZI_GAMBE_3D) assert.doesNotThrow(() => posaGambe(e, 0), e.nome)
})

for (const e of ESERCIZI_GAMBE_3D) {
  test(`${e.nome}: ossa rigide, piede intero e ripetizione che si chiude`, () => {
    for (const f of fasi(100)) {
      const p = posaGambe(e, f)
      for (const b of p.braccia) {
        assert.ok(vicino(b.spalla.distanceTo(b.gomito), OMERO), `${e.nome} omero a ${f}`)
        assert.ok(vicino(b.gomito.distanceTo(b.mano), AVAMBRACCIO), `${e.nome} avambraccio a ${f}`)
      }
      for (const g of p.gambe) {
        assert.ok(vicino(g.anca.distanceTo(g.ginocchio), COSCIA), `${e.nome} coscia a ${f}`)
        assert.ok(vicino(g.ginocchio.distanceTo(g.caviglia), TIBIA), `${e.nome} tibia a ${f}`)
        assert.ok(vicino(g.tallone.distanceTo(g.pianta), TALLONE + PIANTA, 1e-6), `${e.nome} piede a ${f}`)
      }
    }
    const a = posaGambe(e, 0), b = posaGambe(e, 1)
    assert.ok(a.bacino.distanceTo(b.bacino) < 1e-8)
    assert.ok(a.gambe[1].ginocchio.distanceTo(b.gambe[1].ginocchio) < 1e-8)
  })
}

test('le scene si costruiscono, si muovono con numeri finiti e restano sopra il pavimento', () => {
  const punto = new Vector3()
  for (const e of ESERCIZI_GAMBE_3D) {
    const { modello, aggiorna } = creaScenaGambe(e)
    try {
      for (const f of fasi(8)) {
        aggiorna(f)
        modello.updateMatrixWorld(true)
        modello.traverse((o) => {
          assert.ok(o.matrixWorld.elements.every(Number.isFinite), e.nome)
          if (!o.geometry) return
          const pos = o.geometry.attributes.position
          for (let i = 0; i < pos.count; i += 3) {
            punto.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
            assert.ok(punto.y > -0.01, `${e.nome}: qualcosa sotto il pavimento (y ${punto.y.toFixed(3)}) a ${f}`)
          }
        })
      }
    } finally { libera(modello) }
  }
})

// Piedi che non devono muoversi: [tipo, indici delle gambe]. 0 = sinistra, 1 = destra.
const PIEDI_FERMI = [
  ['squat', [0, 1]], ['hack', [0, 1]], ['gambe-tese', [0, 1]], ['sumo', [0, 1]],
  ['affondi', [1]], ['bulgari', [0, 1]], ['step-up', [1]],
]
test('i piedi appoggiati non scivolano durante la ripetizione', () => {
  for (const [tipo, gambe] of PIEDI_FERMI) {
    for (const e of ESERCIZI_GAMBE_3D.filter((x) => x.tipo === tipo)) {
      const inizio = posaGambe(e, 0)
      for (const f of fasi(40)) {
        const p = posaGambe(e, f)
        for (const i of gambe) {
          assert.ok(p.gambe[i].tallone.distanceTo(inizio.gambe[i].tallone) < 1e-8, `${e.nome}: tallone a ${f}`)
          assert.ok(p.gambe[i].pianta.distanceTo(inizio.gambe[i].pianta) < 1e-8, `${e.nome}: pianta a ${f}`)
        }
      }
    }
  }
})

test('squat: in fondo il bilanciere resta sopra il piede, e il frontale tiene il busto più dritto', () => {
  const inFondo = (carico) => posaGambe(trova('squat', { carico }), 0.5)
  for (const carico of ['dietro', 'davanti']) {
    const p = inFondo(carico)
    const piede = p.gambe[1]
    assert.ok(p.carico.z < piede.tallone.z && p.carico.z > piede.punta.z - 0.02, `${carico}: bilanciere a z ${p.carico.z.toFixed(2)}`)
  }
  // Gradi del busto dalla verticale.
  const inclinazione = (p) => Math.acos(new Vector3(0, 0, 1).applyQuaternion(p.rotazione).y) * 180 / Math.PI
  assert.ok(inclinazione(inFondo('dietro')) - inclinazione(inFondo('davanti')) > 12)
  // Cosce almeno parallele: l'anca scende all'altezza del ginocchio.
  for (const carico of ['dietro', 'davanti', 'goblet']) {
    const p = inFondo(carico)
    assert.ok(p.gambe[1].anca.y - p.gambe[1].ginocchio.y < 0.1, carico)
  }
})

test('affondi: il ginocchio dietro arriva a sfiorare terra senza toccarla', () => {
  const p = posaGambe(trova('affondi'), 0.5)
  const g = p.gambe[0].ginocchio.y
  assert.ok(g > 0.07 && g < 0.16, `ginocchio dietro a ${g.toFixed(3)}`)
})

test('leg extension e leg curl: la coscia sta ferma, si muove solo la tibia', () => {
  for (const tipo of ['leg-extension', 'leg-curl-seduto', 'leg-curl-sdraiato']) {
    const e = trova(tipo)
    const a = posaGambe(e, 0), b = posaGambe(e, 0.5)
    assert.ok(a.gambe[1].ginocchio.distanceTo(b.gambe[1].ginocchio) < 1e-8, tipo)
    assert.ok(a.gambe[1].caviglia.distanceTo(b.gambe[1].caviglia) > 0.4, tipo)
  }
  // La leg extension arriva a stendere il ginocchio.
  const stesa = posaGambe(trova('leg-extension'), 0.5).gambe[1]
  const coscia = stesa.ginocchio.clone().sub(stesa.anca).normalize()
  const tibia = stesa.caviglia.clone().sub(stesa.ginocchio).normalize()
  assert.ok(coscia.dot(tibia) > 0.99)
})

test('polpacci: il tallone scende sotto il rialzo e poi sale in punta', () => {
  const e = trova('calf-piedi')
  const giu = posaGambe(e, 0), su = posaGambe(e, 0.5)
  assert.ok(giu.gambe[1].tallone.y < 0.15 - 0.03)
  assert.ok(su.gambe[1].tallone.y > 0.15 + 0.08)
  assert.ok(giu.gambe[1].pianta.distanceTo(su.gambe[1].pianta) < 1e-8)
})

test('le leve delle macchine si muovono senza allungarsi', () => {
  for (const tipo of ['leg-extension', 'leg-curl-seduto', 'leg-curl-sdraiato', 'adduttori']) {
    const s = creaScenaGambe(trova(tipo))
    try {
      const scale = new Map()
      s.modello.traverse((o) => { if (o.parent !== s.modello && o.isMesh) scale.set(o, o.scale.clone()) })
      for (const f of fasi(10)) {
        s.aggiorna(f / 2)
        for (const [o, sc] of scale) {
          // I pezzi del manichino sono figli dei segmenti: anche loro non cambiano scala.
          assert.ok(o.scale.distanceTo(sc) < 1e-8, `${tipo}: un pezzo cambia misura`)
        }
      }
    } finally { libera(s.modello) }
  }
})
