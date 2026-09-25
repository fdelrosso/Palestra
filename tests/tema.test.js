import test from 'node:test'
import assert from 'node:assert/strict'
import { COLORI, SFONDI, calcolaColori, contrasto, daHex } from '../src/lib/tema.js'

test('il default resta nero e celeste, col celeste esatto', () => {
  const { tema, vars } = calcolaColori('#000000', '#5cc8f5')
  assert.equal(tema, 'scuro')
  assert.equal(vars['--bg'], '#000000')
  assert.equal(vars['--accent'], '#5cc8f5')
})

test('sul bianco il celeste si scurisce finche non si legge', () => {
  const { tema, vars } = calcolaColori('#ffffff', '#5cc8f5')
  assert.equal(tema, 'chiaro')
  assert.ok(contrasto(daHex(vars['--accent']), daHex('#ffffff')) >= 3)
  assert.ok(contrasto(daHex(vars['--accent-strong']), daHex('#ffffff')) >= 4.5)
})

test('ogni coppia pronta si legge: colore sullo sfondo e inchiostro sul colore', () => {
  for (const s of SFONDI) {
    for (const c of COLORI) {
      const { vars } = calcolaColori(s.hex, c.hex)
      const bg = daHex(vars['--bg'])
      assert.ok(contrasto(daHex(vars['--accent']), bg) >= 3, `${c.nome} su ${s.nome}`)
      assert.ok(contrasto(daHex(vars['--accent-ink']), daHex(vars['--accent'])) >= 4.5, `inchiostro su ${c.nome}/${s.nome}`)
    }
  }
})

test('un colore rotto non rompe niente: si torna al default', () => {
  const { vars } = calcolaColori('nero', '')
  assert.equal(vars['--bg'], '#000000')
  assert.equal(vars['--accent'], '#5cc8f5')
})
