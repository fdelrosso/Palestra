import test from 'node:test'
import assert from 'node:assert/strict'
import { ESERCIZI_PETTO_3D } from '../src/lib/pettoCatalogo3d.js'
import { posaPetto } from '../src/lib/posePetto3d.js'

for (const esercizio of ESERCIZI_PETTO_3D) {
  test(`${esercizio.nome}: arti rigidi, coordinate finite e ciclo continuo`, () => {
    for (let i = 0; i <= 100; i++) {
      const p = posaPetto(esercizio, i / 100)
      for (const b of p.braccia) {
        for (const punto of [b.spalla, b.gomito, b.mano]) {
          assert.ok(punto.toArray().every(Number.isFinite))
        }
        assert.ok(Math.abs(b.spalla.distanceTo(b.gomito) - 0.38) < 1e-8)
        assert.ok(Math.abs(b.gomito.distanceTo(b.mano) - 0.38) < 1e-8)
      }
    }
    const a = posaPetto(esercizio, 0)
    const b = posaPetto(esercizio, 1)
    assert.ok(a.braccia[0].mano.distanceTo(b.braccia[0].mano) < 1e-8)
    assert.ok(a.bacino.distanceTo(b.bacino) < 1e-8)
  })
}

test('push-up e dips mantengono le mani ferme mentre il corpo si muove', () => {
  for (const tipo of ['push-up', 'dips']) {
    const e = ESERCIZI_PETTO_3D.find((e) => e.tipo === tipo)
    const a = posaPetto(e, 0)
    const b = posaPetto(e, 0.5)
    assert.ok(a.bacino.distanceTo(b.bacino) > 0.2)
    assert.ok(a.braccia[0].mano.distanceTo(b.braccia[0].mano) < 1e-8)
  }
})

test('varianti di croci ai cavi distinguono la direzione di chiusura', () => {
  const cavi = ESERCIZI_PETTO_3D.filter((e) => e.tipo === 'cavi')
  const alti = posaPetto(cavi[1], 0.5).braccia[0].mano.y
  const bassi = posaPetto(cavi[2], 0.5).braccia[0].mano.y
  assert.ok(bassi - alti > 0.4)
})

test('Smith: la barra segue una guida verticale; bilancieri: presa orizzontale', () => {
  for (const e of ESERCIZI_PETTO_3D.filter((e) => ['smith', 'bilanciere'].includes(e.attrezzo))) {
    const iniziale = posaPetto(e, 0)
    for (let i = 0; i <= 20; i++) {
      const p = posaPetto(e, i / 20)
      assert.equal(p.braccia[0].mano.y, p.braccia[1].mano.y)
      assert.equal(p.braccia[0].mano.z, p.braccia[1].mano.z)
      if (e.attrezzo === 'smith') assert.equal(p.braccia[0].mano.z, iniziale.braccia[0].mano.z)
    }
  }
})
