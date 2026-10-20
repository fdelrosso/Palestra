import test from 'node:test'
import assert from 'node:assert/strict'
import { cercaCanzoni, daRisultatoItunes, dove, normalizzaMusica } from '../src/lib/musica.js'

// Un risultato vero di itunes.apple.com/search, accorciato.
const OCCHIO_DI_TIGRE = {
  wrapperType: 'track',
  kind: 'song',
  trackId: 207445080,
  trackName: 'Eye of the Tiger',
  artistName: 'Survivor',
  artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/aa/bb/cc/source/100x100bb.jpg',
}

test('un risultato di iTunes diventa il cartellino, con la copertina piu grande', () => {
  assert.deepEqual(daRisultatoItunes(OCCHIO_DI_TIGRE), {
    id: '207445080',
    titolo: 'Eye of the Tiger',
    artista: 'Survivor',
    copertina: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/aa/bb/cc/source/200x200bb.jpg',
  })
})

test('solo canzoni: video, podcast e risultati senza id no', () => {
  assert.equal(daRisultatoItunes({ ...OCCHIO_DI_TIGRE, kind: 'music-video' }), null)
  assert.equal(daRisultatoItunes({ ...OCCHIO_DI_TIGRE, trackId: undefined }), null)
  assert.equal(daRisultatoItunes(null), null)
})

test('il cartellino di un altro passa solo con un id di Apple', () => {
  const buono = daRisultatoItunes(OCCHIO_DI_TIGRE)
  assert.deepEqual(normalizzaMusica(buono), buono)
  assert.equal(normalizzaMusica({ ...buono, id: '../truffa' }), null)
  assert.equal(normalizzaMusica({ ...buono, id: '' }), null)
  assert.equal(normalizzaMusica({ ...buono, titolo: '  ' }), null)
  assert.equal(normalizzaMusica('Eye of the Tiger'), null)
  assert.equal(normalizzaMusica(null), null)
  // Un link scritto nel json non passa: i link si costruiscono, non si leggono.
  assert.equal('link' in normalizzaMusica({ ...buono, link: 'https://esempio.it/truffa' }), false)
})

test('dove ascoltarla: Apple Music il brano esatto, Spotify e YouTube Music la ricerca', () => {
  const [spotify, apple, youtube] = dove(daRisultatoItunes(OCCHIO_DI_TIGRE))
  assert.equal(spotify.link, 'https://open.spotify.com/search/Eye%20of%20the%20Tiger%20Survivor')
  assert.equal(apple.link, 'https://music.apple.com/it/song/207445080')
  assert.equal(apple.esatto, true)
  assert.equal(youtube.link, 'https://music.youtube.com/search?q=Eye%20of%20the%20Tiger%20Survivor')
  assert.deepEqual(dove({ titolo: 'x', id: 'non-numero' }), [])
})

test('nella ricerca i caratteri strani restano dentro la query', () => {
  const [spotify] = dove({ id: '1', titolo: 'AC/DC #1 & co?', artista: '' })
  assert.equal(spotify.link, 'https://open.spotify.com/search/AC%2FDC%20%231%20%26%20co%3F')
})

test('una copertina che non e di Apple si toglie, il resto resta', () => {
  const m = normalizzaMusica({ ...daRisultatoItunes(OCCHIO_DI_TIGRE), copertina: 'https://esempio.it/x.jpg' })
  assert.equal(m.copertina, '')
  assert.equal(m.titolo, 'Eye of the Tiger')
})

test('la ricerca chiede il catalogo italiano, solo canzoni, e toglie i doppioni', async (t) => {
  let chiesto = ''
  t.mock.method(globalThis, 'fetch', async (url) => {
    chiesto = String(url)
    return { ok: true, json: async () => ({ results: [OCCHIO_DI_TIGRE, OCCHIO_DI_TIGRE, { kind: 'podcast' }] }) }
  })
  const r = await cercaCanzoni(' eye of the tiger ')
  const p = new URL(chiesto).searchParams
  assert.equal(p.get('term'), 'eye of the tiger')
  assert.equal(p.get('entity'), 'song')
  assert.equal(p.get('country'), 'IT')
  assert.equal(r.length, 1)
})

test('una ricerca di meno di due lettere non chiama nessuno', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('non doveva chiamare')
  })
  assert.deepEqual(await cercaCanzoni('a'), [])
  assert.equal(f.mock.callCount(), 0)
})
