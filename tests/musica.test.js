import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canzoniDiArtista,
  cercaArtisti,
  cercaCanzoni,
  daRisultatoItunes,
  dove,
  normalizzaMusica,
  coloriCornice,
  semplifica,
} from '../src/lib/musica.js'

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

test('gli artisti: id e nome, gli altri risultati scartati', async (t) => {
  let chiesto = ''
  t.mock.method(globalThis, 'fetch', async (url) => {
    chiesto = String(url)
    return {
      ok: true,
      json: async () => ({
        results: [{ artistId: 1419730426, artistName: 'Praci' }, { artistId: 'x', artistName: 'Rotto' }, { artistName: 'Senza id' }],
      }),
    }
  })
  assert.deepEqual(await cercaArtisti('praci'), [{ id: '1419730426', nome: 'Praci' }])
  assert.equal(new URL(chiesto).searchParams.get('entity'), 'musicArtist')
})

// Il caso vero: la ricerca di Apple non trova questa canzone (uscita a luglio
// 2026) nemmeno fra 200 risultati; l'elenco dell'artista si', e la mette prima.
test('le canzoni di un artista: la piu nuova per prima, senza la riga dell artista', async (t) => {
  let chiesto = ''
  const brano = (trackId, trackName, releaseDate) => ({ ...OCCHIO_DI_TIGRE, trackId, trackName, artistName: 'Praci', releaseDate })
  t.mock.method(globalThis, 'fetch', async (url) => {
    chiesto = String(url)
    return {
      ok: true,
      json: async () => ({
        results: [
          { wrapperType: 'artist', artistId: 1419730426, artistName: 'Praci' },
          brano(1, 'No Gang', '2020-09-04T07:00:00Z'),
          brano(2, 'UN UOMO SOLO PUÒ CAMBIARE IL MONDO', '2026-07-16T07:00:00Z'),
          brano(3, 'Nuova Sardegna', '2023-06-15T07:00:00Z'),
        ],
      }),
    }
  })
  const r = await canzoniDiArtista('1419730426')
  assert.deepEqual(
    r.map((m) => m.titolo),
    ['UN UOMO SOLO PUÒ CAMBIARE IL MONDO', 'Nuova Sardegna', 'No Gang'],
  )
  const u = new URL(chiesto)
  assert.equal(u.pathname, '/lookup')
  assert.equal(u.searchParams.get('id'), '1419730426')
  assert.equal(u.searchParams.get('country'), 'IT')
})

test('un id d artista non numerico non chiama nessuno', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('non doveva chiamare')
  })
  assert.deepEqual(await canzoniDiArtista('../altro'), [])
  assert.equal(f.mock.callCount(), 0)
})

test('il filtro non guarda maiuscole e accenti', () => {
  assert.ok(semplifica('UN UOMO SOLO PUÒ CAMBIARE IL MONDO').includes(semplifica('puo cambiare')))
  assert.equal(semplifica('  Città '), 'citta')
})

test('il colore della polaroid: solo uno della tavolozza, crema se manca', () => {
  const m = { id: '1', titolo: 'Eye of the Tiger' }
  assert.equal(normalizzaMusica({ ...m, cornice: 'rosa' }).cornice, 'rosa')
  // Crema è quello di base: non si scrive.
  assert.equal('cornice' in normalizzaMusica({ ...m, cornice: 'crema' }), false)
  // Dal feed di un altro può arrivare di tutto: un colore qualsiasi no.
  assert.equal('cornice' in normalizzaMusica({ ...m, cornice: 'red;background:url(x)' }), false)
  assert.equal('cornice' in normalizzaMusica({ ...m, cornice: 'toString' }), false)
  assert.equal(coloriCornice({ cornice: 'toString' }).fondo, '#f4f1ea')
  assert.equal(coloriCornice(normalizzaMusica({ ...m, cornice: 'nero' })).fondo, '#1d1d22')
  assert.equal(coloriCornice(m).fondo, '#f4f1ea')
  // Il vetro: semitrasparente, col bordo.
  assert.equal(coloriCornice(normalizzaMusica({ ...m, cornice: 'vetro' })).bordo, 'rgba(255,255,255,0.45)')
})
