import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileDaSw, fileNuovi } from '../src/lib/aggiornamento.js'

const sw = 'e.precacheAndRoute([{url:"index.html",revision:"abc"},{url:"assets/index-X1.js",revision:null}],{})'

test('i file da sw.js, con la revisione nella chiave dove c’è', () => {
  assert.deepEqual(fileDaSw(sw, 'https://p.it/sw.js'), [
    { url: 'https://p.it/index.html', chiave: 'https://p.it/index.html?__WB_REVISION__=abc', revisionato: true },
    { url: 'https://p.it/assets/index-X1.js', chiave: 'https://p.it/assets/index-X1.js', revisionato: false },
  ])
  assert.deepEqual(fileDaSw('niente', 'https://p.it/sw.js'), [])
})

test('nuovi sono quelli che in cache non ci sono', () => {
  const tutti = new Set(fileDaSw(sw, 'https://p.it/sw.js').map((f) => f.chiave))
  assert.deepEqual(fileNuovi(sw, 'https://p.it/sw.js', tutti), [])
  const nuovi = fileNuovi(sw, 'https://p.it/sw.js', new Set(['https://p.it/index.html?__WB_REVISION__=abc']))
  assert.deepEqual(nuovi.map((f) => f.url), ['https://p.it/assets/index-X1.js'])
})
