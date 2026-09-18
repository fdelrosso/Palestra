import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { ESERCIZI_SPALLE_3D } from '../src/lib/spalleCatalogo3d.js'
import { LEVA_SPALLE, posaSpalle } from '../src/lib/poseSpalle3d.js'
import { creaScenaSpalle } from '../src/lib/spalle3d.js'
import { AVAMBRACCIO, COSCIA, OMERO, TIBIA } from '../src/lib/corpo3d.js'

const vicino = (a, b, eps = 1e-8) => Math.abs(a - b) < eps
const fasi = (n) => Array.from({ length: n + 1 }, (_, i) => i / n)
const trova = (tipo, extra = {}) => ESERCIZI_SPALLE_3D.find((e) => e.tipo === tipo && Object.entries(extra).every(([k, v]) => e[k] === v))

function libera(modello) {
  const geometrie = new Set(), materiali = new Set()
  modello.traverse((o) => {
    if (o.geometry) geometrie.add(o.geometry)
    if (o.material) materiali.add(o.material)
  })
  geometrie.forEach((g) => g.dispose())
  materiali.forEach((m) => m.dispose())
}

for (const e of ESERCIZI_SPALLE_3D) {
  test(`${e.nome}: ossa rigide, piedi fermi e ripetizione che si chiude`, () => {
    const inizio = posaSpalle(e, 0)
    for (const f of fasi(100)) {
      const p = posaSpalle(e, f)
      for (const b of p.braccia) {
        assert.ok(vicino(b.spalla.distanceTo(b.gomito), OMERO), `${e.nome} omero a ${f}`)
        assert.ok(vicino(b.gomito.distanceTo(b.mano), AVAMBRACCIO), `${e.nome} avambraccio a ${f}`)
      }
      p.gambe.forEach((g, i) => {
        assert.ok(vicino(g.anca.distanceTo(g.ginocchio), COSCIA))
        assert.ok(vicino(g.ginocchio.distanceTo(g.caviglia), TIBIA))
        assert.ok(g.tallone.distanceTo(inizio.gambe[i].tallone) < 1e-8, `${e.nome}: il piede scivola a ${f}`)
      })
    }
    const a = posaSpalle(e, 0), b = posaSpalle(e, 1)
    assert.ok(a.braccia[1].mano.distanceTo(b.braccia[1].mano) < 1e-8)
  })
}

test('le scene si costruiscono, si muovono con numeri finiti e restano sopra il pavimento', () => {
  const punto = new Vector3()
  for (const e of ESERCIZI_SPALLE_3D) {
    const { modello, aggiorna } = creaScenaSpalle(e)
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
            assert.ok(punto.y > -0.01, `${e.nome}: qualcosa sotto il pavimento a ${f}`)
          }
        })
      }
    } finally { libera(modello) }
  }
})

test('lento avanti: il bilanciere passa davanti al viso senza attraversare la testa', () => {
  const e = trova('lento')
  const s = creaScenaSpalle(e)
  try {
    const testa = s.modello.getObjectByName('testa')
    for (const f of fasi(100).map((x) => x / 2)) {
      s.aggiorna(f)
      s.modello.updateMatrixWorld(true)
      // Il centro del bilanciere, portato nello spazio dell'ellissoide della testa.
      const centro = posaSpalle(e, f).carico.clone().applyMatrix4(testa.matrixWorld.clone().invert())
      assert.ok(centro.length() > 1.1, `bilanciere nella testa a ${f}`)
    }
    // Alla fine le braccia sono sopra la testa, quasi tese.
    const p = posaSpalle(e, 0.5)
    const b = p.braccia[1]
    assert.ok(b.spalla.distanceTo(b.mano) > 0.74)
    assert.ok(p.carico.y > testa.getWorldPosition(new Vector3()).y + 0.3)
  } finally { libera(s.modello) }
})

test('spinte coi manubri: avambraccio verticale finché i manubri non si avvicinano', () => {
  for (const tipo of ['lento-manubri', 'arnold']) {
    const e = trova(tipo)
    for (const f of fasi(20).map((x) => x * 0.2)) {
      const b = posaSpalle(e, f).braccia[1]
      const avambraccio = b.mano.clone().sub(b.gomito).normalize()
      assert.ok(avambraccio.y > 0.99, `${tipo}: avambraccio inclinato a ${f}`)
    }
  }
})

test('alzate laterali: il braccio arriva alla linea delle spalle e non la supera', () => {
  for (const tipo of ['laterali', 'laterali-cavo']) {
    const b = posaSpalle(trova(tipo), 0.5).braccia[1]
    assert.ok(b.mano.y < b.spalla.y + 0.02 && b.mano.y > b.spalla.y - 0.12, tipo)
    // Il gomito guida: sta più in alto della mano.
    assert.ok(b.gomito.y > b.mano.y, tipo)
  }
})

test('scrollate: salgono solo le spalle, le braccia restano tese sotto di loro', () => {
  for (const attrezzo of ['bilanciere', 'manubri']) {
    const e = trova('scrollate', { attrezzo })
    const giu = posaSpalle(e, 0), su = posaSpalle(e, 0.5)
    assert.ok(su.braccia[1].spalla.y - giu.braccia[1].spalla.y > 0.08)
    assert.ok(vicino(su.braccia[1].mano.y - giu.braccia[1].mano.y, su.braccia[1].spalla.y - giu.braccia[1].spalla.y, 1e-6))
    assert.ok(giu.bacino.distanceTo(su.bacino) < 1e-8)
  }
})

test('shoulder press alla macchina: la maniglia resta sulla leva, che gira attorno al perno', () => {
  const e = trova('macchina')
  for (const f of fasi(40).map((x) => x / 2)) {
    const mano = posaSpalle(e, f).braccia[1].mano
    const dalPerno = new Vector3(0, mano.y - LEVA_SPALLE.perno.y, mano.z - LEVA_SPALLE.perno.z).length()
    assert.ok(vicino(dalPerno, LEVA_SPALLE.raggio, 1e-8), `leva allungata a ${f}`)
  }
  // E la maniglia sale sopra la testa passando davanti, non dietro al perno.
  const giu = posaSpalle(e, 0).braccia[1].mano, su = posaSpalle(e, 0.5).braccia[1].mano
  assert.ok(su.y - giu.y > 0.5)
  assert.ok(posaSpalle(e, 0.25).braccia[1].mano.z < LEVA_SPALLE.perno.z - 0.5)
})

test('i muscoli giusti si accendono', () => {
  for (const e of ESERCIZI_SPALLE_3D) {
    const s = creaScenaSpalle(e)
    try {
      let accesi = 0
      s.modello.traverse((o) => { if (o.material?.color?.getHexString() === 'da7868') accesi++ })
      // Ogni muscolo principale compare almeno una volta per lato.
      assert.ok(accesi >= e.principali.length * 2, `${e.nome}: ${accesi}`)
    } finally { libera(s.modello) }
  }
})
