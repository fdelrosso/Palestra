import test from 'node:test'
import assert from 'node:assert/strict'
import { abbina, finestraAllenamento, riassumiAscolti, titoloPulito } from '../src/lib/ascolti.js'
import { doveBrano, linkSpotify, normalizzaPlaylist } from '../src/lib/musica.js'

test('ogni brano una volta, in ordine di partenza, col numero di volte', () => {
  const righe = [
    { titolo: 'B', artista: 'Y', inizio: 200, ms: 60000 },
    { titolo: 'A', artista: 'X', inizio: 100, ms: 50000, copertina: 'data:a' },
    { titolo: 'A', artista: 'X', inizio: 300, ms: 45000 },
  ]
  const r = riassumiAscolti(righe, 40000)
  assert.deepEqual(
    r.map((c) => [c.titolo, c.volte, c.ms, c.copertina]),
    [
      ['A', 2, 95000, 'data:a'],
      ['B', 1, 60000, null],
    ],
  )
})

test('sotto la soglia non conta, nemmeno come volta in più', () => {
  const righe = [
    { titolo: 'A', artista: 'X', inizio: 100, ms: 50000 },
    { titolo: 'A', artista: 'X', inizio: 200, ms: 3000 },
    { titolo: 'C', artista: 'Z', inizio: 300, ms: 1000 },
  ]
  assert.deepEqual(
    riassumiAscolti(righe, 40000).map((c) => [c.titolo, c.volte]),
    [['A', 1]],
  )
  assert.equal(riassumiAscolti(righe, 0).length, 2)
})

test('stesso titolo, artista diverso: due brani', () => {
  const righe = [
    { titolo: 'Intro', artista: 'X', inizio: 1, ms: 1 },
    { titolo: 'Intro', artista: 'Y', inizio: 2, ms: 1 },
  ]
  assert.equal(riassumiAscolti(righe, 0).length, 2)
})

test('la finestra va dall’inizio alla fine, con 5 minuti di margine', () => {
  const f = finestraAllenamento({ data: '2026-10-22T10:00:00.000Z', durataSec: 3600 })
  assert.equal(f.da, Date.parse('2026-10-22T08:55:00.000Z'))
  assert.equal(f.a, Date.parse('2026-10-22T10:05:00.000Z'))
  assert.equal(finestraAllenamento({}), null)
})

test('il titolo senza remaster, feat. e versioni', () => {
  assert.equal(titoloPulito('Let It Be - Remastered 2009'), 'Let It Be')
  assert.equal(titoloPulito('Stay (feat. Justin Bieber)'), 'Stay')
  assert.equal(titoloPulito('Song [Live]'), 'Song')
})

test('abbina solo stesso titolo e artista simile, se no niente', () => {
  const risultati = [
    { id: '1', titolo: 'Let It Be (Cover)', artista: 'Qualcuno' },
    { id: '2', titolo: 'Let It Be', artista: 'The Beatles' },
  ]
  assert.equal(abbina({ titolo: 'Let It Be - Remastered 2009', artista: 'The Beatles' }, risultati)?.id, '2')
  assert.equal(abbina({ titolo: 'Yesterday', artista: 'The Beatles' }, risultati), null)
  assert.equal(abbina({ titolo: 'Let It Be', artista: 'Aretha Franklin' }, risultati), null)
  assert.equal(
    abbina({ titolo: 'Can’t Hold Us', artista: 'Macklemore & Ryan Lewis' }, [
      { id: '3', titolo: 'Can’t Hold Us (feat. Ray Dalton)', artista: 'Macklemore' },
    ])?.id,
    '3',
  )
})

test('la playlist ripulita: senza id va bene, copertine solo di Apple, volte da 1 a 99', () => {
  const p = normalizzaPlaylist({
    titolo: '  Leg day  ',
    brani: [
      { titolo: 'A', artista: 'X', id: 'abc', copertina: 'https://evil.example/x.jpg', volte: 0 },
      { titolo: 'B', id: '123', copertina: 'https://is1-ssl.mzstatic.com/a.jpg', volte: 500 },
      { titolo: '' },
    ],
  })
  assert.deepEqual(p, {
    titolo: 'Leg day',
    brani: [
      { id: '', titolo: 'A', artista: 'X', copertina: '', volte: 1 },
      { id: '123', titolo: 'B', artista: '', copertina: 'https://is1-ssl.mzstatic.com/a.jpg', volte: 99 },
    ],
  })
  // La prima forma: solo i brani, senza titolo.
  assert.deepEqual(normalizzaPlaylist([{ titolo: 'A' }]), {
    titolo: '',
    brani: [{ id: '', titolo: 'A', artista: '', copertina: '', volte: 1 }],
  })
  assert.equal(normalizzaPlaylist({ titolo: 'x', brani: [] }), null)
  assert.equal(normalizzaPlaylist('x'), null)
})

test('ascolta su: senza id niente Apple Music', () => {
  assert.deepEqual(
    doveBrano({ titolo: 'A', artista: 'X' }).map((d) => d.id),
    ['spotify', 'youtube'],
  )
  assert.deepEqual(
    doveBrano({ id: '5', titolo: 'A' }).map((d) => d.id),
    ['spotify', 'apple', 'youtube'],
  )
})

test('la playlist di Spotify collegata: basta lei, e si ripulisce', () => {
  const p = normalizzaPlaylist({
    titolo: '',
    brani: [],
    spotify: {
      tipo: 'album',
      id: '4aawyAB9vmqN3uQ7FjRGTy',
      nome: 'Global Warming',
      copertina: 'https://image-cdn-fa.spotifycdn.com/image/x',
      colore: '#610000',
      brani: 14,
    },
  })
  assert.equal(p.spotify.nome, 'Global Warming')
  assert.equal(linkSpotify(p.spotify), 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy')
  const sporca = normalizzaPlaylist({
    spotify: { tipo: 'x', id: '4aawyAB9vmqN3uQ7FjRGTy', copertina: 'https://evil.example/x.jpg', colore: 'red' },
  })
  assert.equal(sporca.spotify.tipo, 'playlist')
  assert.equal(sporca.spotify.copertina, '')
  assert.equal(sporca.spotify.colore, '')
  assert.equal(normalizzaPlaylist({ spotify: { id: 'corto' } }), null)
})
