import test from 'node:test'
import assert from 'node:assert/strict'
import { _svuotaCache, urlAnteprima } from '../src/lib/anteprima.js'

const LINK = 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c0/11/mzaf_1.plus.aac.p.m4a'

function risponde(t, results) {
  return t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ results }) }))
}

test('il link dell anteprima arriva dal lookup del catalogo italiano', async (t) => {
  _svuotaCache()
  let chiesto = ''
  t.mock.method(globalThis, 'fetch', async (url) => {
    chiesto = String(url)
    return { ok: true, json: async () => ({ results: [{ kind: 'song', trackId: 201278269, previewUrl: LINK }] }) }
  })
  assert.equal(await urlAnteprima('201278269'), LINK)
  const u = new URL(chiesto)
  assert.equal(u.pathname, '/lookup')
  assert.equal(u.searchParams.get('id'), '201278269')
  assert.equal(u.searchParams.get('country'), 'IT')
})

test('una canzone senza anteprima da null, e non si richiede', async (t) => {
  _svuotaCache()
  const f = risponde(t, [{ kind: 'song', trackId: 5 }])
  assert.equal(await urlAnteprima('5'), null)
  assert.equal(await urlAnteprima('5'), null)
  assert.equal(f.mock.callCount(), 1)
})

test('un link che non e del CDN audio di Apple si scarta', async (t) => {
  _svuotaCache()
  risponde(t, [{ kind: 'song', trackId: 6, previewUrl: 'https://esempio.it/x.m4a' }])
  assert.equal(await urlAnteprima('6'), null)
})

test('un id che non e di Apple non chiama nessuno', async (t) => {
  _svuotaCache()
  const f = risponde(t, [])
  assert.equal(await urlAnteprima('abc'), null)
  assert.equal(await urlAnteprima(''), null)
  assert.equal(f.mock.callCount(), 0)
})

test('se Apple non risponde, al tocco dopo si riprova', async (t) => {
  _svuotaCache()
  let volte = 0
  t.mock.method(globalThis, 'fetch', async () => {
    volte++
    if (volte === 1) return { ok: false, status: 503 }
    return { ok: true, json: async () => ({ results: [{ kind: 'song', trackId: 7, previewUrl: LINK }] }) }
  })
  await assert.rejects(urlAnteprima('7'))
  assert.equal(await urlAnteprima('7'), LINK)
  assert.equal(volte, 2)
})
