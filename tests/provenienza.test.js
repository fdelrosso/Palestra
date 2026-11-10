import test from 'node:test'
import assert from 'node:assert/strict'
import { fonteDa } from '../src/lib/provenienza.js'

const IG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Instagram 300.0.0'

test('il ?da del link vince su tutto', () => {
  assert.equal(fonteDa({ search: '?da=volantino', userAgent: IG }), 'volantino')
  assert.equal(fonteDa({ search: '?utm_source=Instagram' }), 'instagram')
  assert.equal(fonteDa({ search: '?da=Volantino Bar Centrale!' }), 'volantino-bar-centrale')
})

test('il browser dentro Instagram si riconosce anche senza ?da', () => {
  assert.equal(fonteDa({ userAgent: IG }), 'instagram')
  assert.equal(fonteDa({ userAgent: 'Mozilla/5.0 [FBAN/FBIOS;FBAV/400.0]' }), 'facebook')
})

test('un link a profilo o post è passaparola', () => {
  assert.equal(fonteDa({ pathname: '/utente/abc' }), 'link-profilo')
  assert.equal(fonteDa({ pathname: '/post/abc|2026-11-01' }), 'link-post')
})

test('referrer: siti noti per nome, gli altri col dominio, il proprio non conta', () => {
  assert.equal(fonteDa({ referrer: 'https://www.google.com/', host: 'progettopalestra.it' }), 'google')
  assert.equal(fonteDa({ referrer: 'https://l.instagram.com/?u=x' }), 'instagram')
  assert.equal(fonteDa({ referrer: 'https://blog.esempio.it/post' }), 'sito-blog-esempio-it')
  assert.equal(fonteDa({ referrer: 'https://progettopalestra.it/x', host: 'progettopalestra.it' }), 'diretto')
})

test('senza niente è diretto', () => {
  assert.equal(fonteDa(), 'diretto')
  assert.equal(fonteDa({ search: '?da=' }), 'diretto')
})
