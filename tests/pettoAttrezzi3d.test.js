import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { creaScenaPetto } from '../src/lib/petto3d.js'
import { ESERCIZI_PETTO_3D } from '../src/lib/pettoCatalogo3d.js'

function scena(tipo) {
  return creaScenaPetto(ESERCIZI_PETTO_3D.find((e) => e.tipo === tipo))
}

function libera(modello) {
  const geometrie = new Set(), materiali = new Set()
  modello.traverse((m) => {
    if (m.geometry) geometrie.add(m.geometry)
    if (m.material) materiali.add(m.material)
  })
  geometrie.forEach((g) => g.dispose())
  materiali.forEach((m) => m.dispose())
}

test('pullover: i dischi non attraversano la testa lungo la ripetizione', () => {
  const s = scena('pullover')
  try {
    const testa = s.modello.getObjectByName('testa')
    const manubrio = s.modello.getObjectByName('pullover-manubrio')
    const punto = new Vector3()
    for (let i = 0; i <= 100; i++) {
      s.aggiorna(i / 200)
      s.modello.updateMatrixWorld(true)
      const inversa = testa.matrixWorld.clone().invert()
      manubrio.traverse((m) => {
        if (!m.geometry) return
        const p = m.geometry.attributes.position
        for (let j = 0; j < p.count; j++) {
          punto.fromBufferAttribute(p, j).applyMatrix4(m.matrixWorld).applyMatrix4(inversa)
          assert.ok(punto.lengthSq() > 1.02, `Intersezione con la testa alla fase ${i / 200}`)
        }
      })
    }
  } finally { libera(s.modello) }
})

test('pec deck: i supporti si muovono senza allungarsi', () => {
  const s = scena('pec-deck')
  try {
    const braccio = s.modello.getObjectByName('pec-deck-braccio-0')
    assert.ok(braccio)
    const dimensioni = new Map()
    braccio.traverse((m) => { dimensioni.set(m, m.scale.clone()) })
    for (let i = 0; i <= 20; i++) {
      s.aggiorna(i / 40)
      braccio.traverse((m) => assert.ok(m.scale.distanceTo(dimensioni.get(m)) < 1e-8))
    }
  } finally { libera(s.modello) }
})
