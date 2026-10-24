import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  CORPI,
  ZONE_VISTA,
  corpoDaSesso,
  corpoDiAllenamento,
  urlFigura,
  urlMaschera,
} from '../src/lib/corpoImmagini.js'

test('il corpo dal sesso: la donna solo con "f"', () => {
  assert.equal(corpoDaSesso('f'), 'donna')
  assert.equal(corpoDaSesso('m'), 'uomo')
  assert.equal(corpoDaSesso(''), 'uomo')
  assert.equal(corpoDaSesso(undefined), 'uomo')
})

test('il corpo di un allenamento: il suo, se no il mio per i miei e l\'uomo per gli altri', () => {
  assert.equal(corpoDiAllenamento({ corpo: 'donna', utenteId: 'altro' }, 'io'), 'donna')
  assert.equal(corpoDiAllenamento({ corpo: 'boh', utenteId: 'altro' }, 'io'), 'uomo')
  assert.equal(corpoDiAllenamento({ utenteId: 'altro' }, 'io'), 'uomo')
  assert.equal(corpoDiAllenamento({ utenteId: 'io' }, 'io'), undefined)
  assert.equal(corpoDiAllenamento({}, 'io'), undefined)
})

test('gli indirizzi: l\'uomo dove e\' sempre stato, la donna nella sua cartella', () => {
  assert.equal(urlFigura('fronte'), '/corpo/fronte.png')
  assert.equal(urlFigura('dietro', 'donna'), '/corpo/donna/retro.png')
  assert.equal(urlMaschera('dietro', 'romboidi', 'donna'), '/corpo/donna/retro-romboidi.png')
  assert.equal(urlMaschera('fronte', 'petto', 'qualcosa'), '/corpo/fronte-petto.png')
})

test('ogni corpo ha la figura e tutte le maschere', () => {
  for (const corpo of CORPI) {
    for (const [vista, ids] of Object.entries(ZONE_VISTA)) {
      for (const url of [urlFigura(vista, corpo), ...ids.map((id) => urlMaschera(vista, id, corpo))]) {
        assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), url)
      }
    }
  }
})
