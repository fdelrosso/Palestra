import test from 'node:test'
import assert from 'node:assert/strict'
import { ESERCIZI_SCHIENA_3D } from '../src/lib/schienaCatalogo3d.js'
import { posaSchiena } from '../src/lib/poseSchiena3d.js'
import { creaScenaSchiena } from '../src/lib/schiena3d.js'

test('tutte le scene generano geometrie e trasformazioni finite durante il movimento', () => {
  for (const e of ESERCIZI_SCHIENA_3D) {
    const { modello, aggiorna } = creaScenaSchiena(e)
    const geometrie = new Set(), materiali = new Set()
    modello.traverse((o) => {
      if (o.geometry) geometrie.add(o.geometry)
      if (o.material) materiali.add(o.material)
    })
    for (const g of geometrie) {
      assert.ok(g.attributes.position.array.every(Number.isFinite), e.nome)
      assert.ok(g.attributes.normal.array.every(Number.isFinite), e.nome)
    }
    for (let i = 0; i <= 20; i++) {
      aggiorna(i / 20); modello.updateMatrixWorld(true)
      modello.traverse((o) => assert.ok(o.matrixWorld.elements.every(Number.isFinite), e.nome))
    }
    geometrie.forEach((g) => g.dispose())
    materiali.forEach((m) => m.dispose())
  }
})

for (const e of ESERCIZI_SCHIENA_3D) {
  test(`${e.nome}: braccia rigide e ciclo continuo`, () => {
    for (let i = 0; i <= 100; i++) {
      const p = posaSchiena(e, i / 100)
      for (const b of p.braccia) {
        assert.ok(b.mano.toArray().every(Number.isFinite))
        assert.ok(Math.abs(b.spalla.distanceTo(b.gomito) - 0.38) < 1e-8)
        assert.ok(Math.abs(b.gomito.distanceTo(b.mano) - 0.38) < 1e-8)
      }
      for (const g of p.gambe) assert.ok(g.ginocchio.toArray().every(Number.isFinite))
    }
    const a = posaSchiena(e, 0), b = posaSchiena(e, 1)
    assert.ok(a.bacino.distanceTo(b.bacino) < 1e-8)
    assert.ok(a.braccia[1].mano.distanceTo(b.braccia[1].mano) < 1e-8)
  })
}

test('le trazioni mantengono la presa ferma mentre il corpo sale', () => {
  for (const e of ESERCIZI_SCHIENA_3D.filter((e) => e.tipo === 'trazioni')) {
    const a = posaSchiena(e, 0), b = posaSchiena(e, 0.5)
    assert.ok(b.bacino.y - a.bacino.y > 0.4)
    for (let i = 0; i < 2; i++) assert.ok(a.braccia[i].mano.distanceTo(b.braccia[i].mano) < 1e-8)
  }
})

test('il rematore singolo conserva mano e ginocchio in appoggio sulla panca', () => {
  const e = ESERCIZI_SCHIENA_3D.find((e) => e.tipo === 'rematore-singolo')
  const a = posaSchiena(e, 0), b = posaSchiena(e, 0.5)
  assert.ok(a.braccia[0].mano.distanceTo(b.braccia[0].mano) < 1e-8)
  assert.ok(a.gambe[0].ginocchio.distanceTo(b.gambe[0].ginocchio) < 1e-8)
  assert.ok(a.braccia[1].mano.distanceTo(b.braccia[1].mano) > 0.4)
})

test('stacco e Pendlay partono da terra, il rumeno resta sospeso', () => {
  for (const tipo of ['stacco', 'pendlay', 'rumeno']) {
    const e = ESERCIZI_SCHIENA_3D.find((e) => e.tipo === tipo)
    const basso = posaSchiena(e, 0).braccia[0].mano.y
    assert.ok(tipo === 'rumeno' ? basso > 0.38 : basso >= 0.26 && basso < 0.3, `${tipo}: ${basso}`)
  }
})
