import test from 'node:test'
import assert from 'node:assert/strict'
import { daLink, daPagina, quantiBrani } from '../api/spotify.js'

// I brani di una playlist di Spotify dalla pagina pubblica (api/spotify).
test('il link: playlist e album, anche /intl-it/ e spotify:, nient’altro', () => {
  assert.deepEqual(daLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc'), {
    tipo: 'playlist',
    id: '37i9dQZF1DXcBWIGoYBM5M',
  })
  assert.deepEqual(daLink('https://open.spotify.com/intl-it/album/4aawyAB9vmqN3uQ7FjRGTy'), {
    tipo: 'album',
    id: '4aawyAB9vmqN3uQ7FjRGTy',
  })
  assert.equal(daLink('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M').id, '37i9dQZF1DXcBWIGoYBM5M')
  assert.equal(daLink('https://open.spotify.com/track/3XmwAZpIMNpTJy8faw3ajD'), null)
  assert.equal(daLink('https://example.com/playlist/37i9dQZF1DXcBWIGoYBM5M'), null)
  assert.equal(daLink(''), null)
})

test('la pagina: nome, copertina da ~300px, colore e quanti brani; null se è cambiata', () => {
  const entita = {
    name: 'Leg day',
    trackList: [{ title: 'A' }, { title: 'B' }],
    visualIdentity: {
      image: [
        { url: 'https://image-cdn-fa.spotifycdn.com/image/grande', maxWidth: 640 },
        { url: 'https://image-cdn-fa.spotifycdn.com/image/media', maxWidth: 300 },
        { url: 'https://image-cdn-fa.spotifycdn.com/image/piccola', maxWidth: 64 },
      ],
      backgroundTintedBase: { red: 90, green: 28, blue: 0 },
    },
  }
  const pagina = (e) =>
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { state: { data: { entity: e } } } } })}</script>`
  assert.deepEqual(daPagina(pagina(entita)), {
    nome: 'Leg day',
    copertina: 'https://image-cdn-fa.spotifycdn.com/image/media',
    colore: '#5a1c00',
    brani: 2,
  })
  // Senza visualIdentity: la copertina di coverArt, niente colore.
  assert.deepEqual(daPagina(pagina({ name: 'X', coverArt: { sources: [{ url: 'https://i.scdn.co/image/x' }] } })), {
    nome: 'X',
    copertina: 'https://i.scdn.co/image/x',
    colore: '',
    brani: 0,
  })
  assert.equal(daPagina('<html></html>'), null)
})

test('oltre i 100 brani del lettore: il numero vero dalla pagina normale', () => {
  assert.equal(quantiBrani('<meta name="music:song_count" content="150"/>'), 150)
  assert.equal(quantiBrani('<html></html>'), 0)
})
