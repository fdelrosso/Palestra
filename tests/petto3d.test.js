import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { ESERCIZI_PETTO_3D } from '../src/lib/pettoCatalogo3d.js'
import { posaPetto } from '../src/lib/posePetto3d.js'
import { CORPO, superficieDavanti } from '../src/lib/misureCorpo3d.js'
import { LIBRERIA } from '../src/lib/eserciziLibreria.js'

test('ogni esercizio del petto della libreria ha la sua vista 3D', () => {
  const nomi = new Set(ESERCIZI_PETTO_3D.map((e) => e.nome))
  for (const nome of LIBRERIA.petto) assert.ok(nomi.has(nome), nome)
})

for (const esercizio of ESERCIZI_PETTO_3D) {
  test(`${esercizio.nome}: arti rigidi, coordinate finite e ciclo continuo`, () => {
    for (let i = 0; i <= 100; i++) {
      const p = posaPetto(esercizio, i / 100)
      for (const b of p.braccia) {
        for (const punto of [b.spalla, b.gomito, b.mano]) {
          assert.ok(punto.toArray().every(Number.isFinite))
        }
        assert.ok(Math.abs(b.spalla.distanceTo(b.gomito) - CORPO.OMERO) < 1e-8)
        assert.ok(Math.abs(b.gomito.distanceTo(b.mano) - CORPO.AVAMBRACCIO) < 1e-8)
        // Gomiti e mani mai sotto il pavimento.
        assert.ok(b.gomito.y > 0.03, `gomito a terra alla fase ${i / 100}`)
      }
      for (const g of p.gambe) {
        assert.ok(Math.abs(g.anca.distanceTo(g.ginocchio) - CORPO.COSCIA) < 1e-6)
        assert.ok(Math.abs(g.ginocchio.distanceTo(g.caviglia) - CORPO.TIBIA) < 1e-6)
        assert.ok(g.tallone.y > -1e-6 && g.punta.y > -1e-6, 'piede sotto il pavimento')
      }
    }
    const a = posaPetto(esercizio, 0)
    const b = posaPetto(esercizio, 1)
    assert.ok(a.braccia[0].mano.distanceTo(b.braccia[0].mano) < 1e-8)
    assert.ok(a.bacino.distanceTo(b.bacino) < 1e-8)
    // Si parte in alto e a metà ripetizione si è in fondo: il movimento c'è.
    const meta = posaPetto(esercizio, 0.5)
    const spostamento = a.braccia[0].mano.distanceTo(meta.braccia[0].mano) + a.bacino.distanceTo(meta.bacino)
    assert.ok(spostamento > 0.2, `movimento troppo piccolo: ${spostamento.toFixed(3)}`)
  })
}

test('push-up e dips: le mani restano ferme mentre il corpo si muove', () => {
  for (const e of ESERCIZI_PETTO_3D.filter((e) => ['push-up', 'dips'].includes(e.tipo))) {
    const a = posaPetto(e, 0)
    const b = posaPetto(e, 0.5)
    const appoggio = (p) => p.braccia[0].polso || p.braccia[0].mano
    assert.ok(a.bacino.distanceTo(b.bacino) > 0.15, e.nome)
    assert.ok(appoggio(a).distanceTo(appoggio(b)) < 1e-8, e.nome)
  }
})

test('piegamenti: in fondo il petto arriva vicino a terra (o alla panca), senza toccarla', () => {
  for (const e of ESERCIZI_PETTO_3D.filter((e) => e.tipo === 'push-up')) {
    const p = posaPetto(e, 0.5)
    const appoggio = p.braccia[0].polso.y
    // Il punto più sporgente del petto, portato nel mondo.
    const petto = new Vector3(0, superficieDavanti(0.1, 0.55), 0.55).applyQuaternion(p.rotazione).add(p.bacino)
    const d = petto.y - appoggio
    assert.ok(d > 0 && d < 0.12, `${e.nome}: ${d.toFixed(3)}`)
  }
})

test('croci ai cavi: i cavi alti chiudono in basso, i bassi in alto', () => {
  const cavi = ESERCIZI_PETTO_3D.filter((e) => e.tipo === 'cavi')
  const alti = posaPetto(cavi.find((e) => e.cavi === 'alti'), 0).braccia[0].mano.y
  const bassi = posaPetto(cavi.find((e) => e.cavi === 'bassi'), 0).braccia[0].mano.y
  assert.ok(bassi - alti > 0.4)
})

test('Smith: la barra segue una guida verticale; bilancieri: presa orizzontale', () => {
  for (const e of ESERCIZI_PETTO_3D.filter((e) => ['smith', 'bilanciere'].includes(e.attrezzo))) {
    const iniziale = posaPetto(e, 0)
    for (let i = 0; i <= 20; i++) {
      const p = posaPetto(e, i / 20)
      assert.ok(Math.abs(p.braccia[0].mano.y - p.braccia[1].mano.y) < 1e-9)
      assert.ok(Math.abs(p.braccia[0].mano.z - p.braccia[1].mano.z) < 1e-9)
      if (e.attrezzo === 'smith') assert.ok(Math.abs(p.braccia[0].mano.z - iniziale.braccia[0].mano.z) < 1e-9)
    }
  }
})

test('panche: il bilanciere scende fino al petto e non ci entra', () => {
  for (const e of ESERCIZI_PETTO_3D.filter((e) => e.tipo === 'spinte' && e.attrezzo !== 'manubri')) {
    const fondo = posaPetto(e, 0.5)
    const inversa = fondo.rotazione.clone().invert()
    const locale = fondo.attrezzo.centro.clone().sub(fondo.bacino).applyQuaternion(inversa)
    const pelle = superficieDavanti(0, locale.z)
    assert.ok(locale.y > pelle && locale.y - pelle < 0.03, `${e.nome}: ${(locale.y - pelle).toFixed(3)}`)
  }
})

test('floor press: in fondo i gomiti appoggiano a terra', () => {
  const e = ESERCIZI_PETTO_3D.find((e) => e.tipo === 'floor-press')
  const p = posaPetto(e, 0.5)
  for (const b of p.braccia) assert.ok(b.gomito.y < 0.07, b.gomito.y)
})

test('la panca col fermo resta più a lungo in fondo', () => {
  const normale = ESERCIZI_PETTO_3D.find((e) => e.nome === 'Panca piana bilanciere')
  const fermo = ESERCIZI_PETTO_3D.find((e) => e.fermo)
  const inFondo = (e) => {
    let n = 0
    for (let i = 0; i < 200; i++) if (posaPetto(e, i / 200).attrezzo.t < 0.01) n++
    return n
  }
  assert.ok(inFondo(fermo) > inFondo(normale) * 2)
})
