// ---------------------------------------------------------------------------
// La canzone dell'allenamento: si cerca nel catalogo di iTunes e sul recap
// resta solo il CARTELLINO (id, titolo, artista, copertina). Niente audio,
// niente anteprime: farle suonare nell'app vorrebbe dire pubblicarle, e i
// diritti non li abbiamo.
//
// - La ricerca e' l'API pubblica di Apple (itunes.apple.com/search): niente
//   chiave, niente account, risponde a qualsiasi sito (CORS *). Si chiama dal
//   telefono di chi cerca, cosi' il limite (~20 ricerche al minuto) e' per
//   persona e non condiviso.
// - Per ascoltarla, chi guarda sceglie l'app (`dove`): Apple Music apre il
//   brano esatto (l'id e' di Apple); Spotify e YouTube Music aprono la
//   RICERCA di "titolo artista", perche' il loro id non lo abbiamo — l'API di
//   Spotify fuori dalla modalita' sviluppo (5 utenti) e' solo per aziende.
//   ⚠️ song.link no: dal 2026 le sue API non sono piu' pubbliche e le pagine
//   costruite dall'id di Apple non hanno piu' Spotify ne' YouTube.
//
// Sta nel completamento (`musica`), come `sfondo` e `recap`: niente colonne
// nuove, e arriva nel feed con `allenamenti_visibili`, che passa il json
// intero.
// ---------------------------------------------------------------------------

const RICERCA = 'https://itunes.apple.com/search'

/**
 * @typedef {{ id: string, titolo: string, artista: string, copertina: string }} Musica
 */

// Il cartellino arriva anche dai completamenti DEGLI ALTRI (il feed): prima
// di usarlo si controlla che sia fatto come lo scriviamo noi. I link non si
// salvano, si costruiscono qui: in un post non puo' finire un indirizzo
// qualsiasi.
const ID_OK = /^\d{1,15}$/
const COPERTINA_OK = /^https:\/\/is\d+-ssl\.mzstatic\.com\//

function testo(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

/**
 * Un risultato di iTunes → il cartellino. Null se non e' una canzone.
 * @returns {Musica|null}
 */
export function daRisultatoItunes(r) {
  if (!r || r.kind !== 'song' || !r.trackId) return null
  return normalizzaMusica({
    id: String(r.trackId),
    titolo: r.trackName,
    artista: r.artistName,
    // 100x100 e' troppo piccola per uno schermo retina: Apple la da' della
    // misura che si chiede cambiando il nome del file.
    copertina: testo(r.artworkUrl100, 300).replace(/\/\d+x\d+bb\.(jpg|png)$/, '/200x200bb.$1'),
  })
}

/**
 * Il cartellino ripulito, o null se non e' valido (niente titolo, id che non
 * e' di Apple). La copertina sbagliata si toglie e basta.
 * @returns {Musica|null}
 */
export function normalizzaMusica(m) {
  if (!m || typeof m !== 'object') return null
  const id = testo(m.id, 20)
  const titolo = testo(m.titolo, 120)
  if (!titolo || !ID_OK.test(id)) return null
  const copertina = testo(m.copertina, 300)
  return {
    id,
    titolo,
    artista: testo(m.artista, 120),
    copertina: COPERTINA_OK.test(copertina) ? copertina : '',
  }
}

/**
 * Dove ascoltarla: le app tra cui sceglie chi guarda, ognuna col suo link.
 * Vuoto se il cartellino non e' valido.
 * @returns {{ id: 'spotify'|'apple'|'youtube', nome: string, link: string, esatto: boolean }[]}
 */
export function dove(musica) {
  const m = normalizzaMusica(musica)
  if (!m) return []
  const q = encodeURIComponent([m.titolo, m.artista].filter(Boolean).join(' '))
  return [
    { id: 'spotify', nome: 'Spotify', link: `https://open.spotify.com/search/${q}`, esatto: false },
    { id: 'apple', nome: 'Apple Music', link: `https://music.apple.com/it/song/${m.id}`, esatto: true },
    { id: 'youtube', nome: 'YouTube Music', link: `https://music.youtube.com/search?q=${q}`, esatto: false },
  ]
}

/**
 * Cerca le canzoni nel catalogo italiano di iTunes.
 * @param {string} q
 * @param {{ signal?: AbortSignal, limite?: number }} [opts]
 * @returns {Promise<Musica[]>} vuoto se la ricerca e' troppo corta
 */
export async function cercaCanzoni(q, { signal, limite = 8 } = {}) {
  const termine = String(q || '').trim()
  if (termine.length < 2) return []
  const url = `${RICERCA}?${new URLSearchParams({
    term: termine,
    entity: 'song',
    country: 'IT',
    limit: String(limite),
  })}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`iTunes ha risposto ${res.status}`)
  const dati = await res.json()
  const visti = new Set()
  const out = []
  for (const r of dati?.results || []) {
    const m = daRisultatoItunes(r)
    if (!m || visti.has(m.id)) continue
    visti.add(m.id)
    out.push(m)
  }
  return out
}
