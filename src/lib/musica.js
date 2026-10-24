// ---------------------------------------------------------------------------
// La canzone dell'allenamento: si cerca nel catalogo di iTunes e sul recap
// resta solo il CARTELLINO (id, titolo, artista, copertina). Nessun audio
// nostro: nel foglio della canzone (toccando la polaroid) c'e' il ▶ con
// l'anteprima di 30 secondi DI APPLE, dal loro indirizzo (lib/anteprima).
//
// - La ricerca e' l'API pubblica di Apple (itunes.apple.com/search): niente
//   chiave, niente account, risponde a qualsiasi sito (CORS *). Si chiama dal
//   telefono di chi cerca, cosi' il limite (~20 ricerche al minuto) e' per
//   persona e non condiviso. ⚠️ Non trova tutto (le uscite recenti mancano):
//   per questo si cercano anche gli ARTISTI, e dall'artista si sfogliano
//   tutte le sue canzoni (`canzoniDiArtista`, itunes.apple.com/lookup).
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
 * @typedef {{ id: string, titolo: string, artista: string, copertina: string, cornice?: string, scritta?: string }} Musica
 */

// Il colore della polaroid sul recap (`cornice`, components/ChipMusica e
// lib/recapImmagine): uno di questi, ognuno col testo che ci si legge sopra.
// Un nome, non un colore: dal feed di un altro arriva solo una chiave nota.
export const CORNICI = {
  crema: { nome: 'Crema', fondo: '#f4f1ea', testo: '#1d1d22', sotto: '#5b5b66' },
  nero: { nome: 'Nero', fondo: '#1d1d22', testo: '#f4f1ea', sotto: '#a3a3ad' },
  rosa: { nome: 'Rosa', fondo: '#f6c9d4', testo: '#3b1020', sotto: '#7a4256' },
  azzurro: { nome: 'Azzurro', fondo: '#bfe3f5', testo: '#0e2a3a', sotto: '#3d6275' },
  giallo: { nome: 'Giallo', fondo: '#f5de85', testo: '#2e2508', sotto: '#6b5a1e' },
  // Semitrasparente, come gli sticker di Instagram: lo sfondo del post si
  // vede attraverso. Senza sfocatura: la card su canvas non saprebbe farla.
  vetro: {
    nome: 'Vetro',
    fondo: 'rgba(255,255,255,0.18)',
    bordo: 'rgba(255,255,255,0.45)',
    testo: '#ffffff',
    sotto: 'rgba(255,255,255,0.75)',
  },
}

// La scritta a mano sopra la copertina (`scritta`): fuori dall'app (la card
// condivisa) dice cos'e' la polaroid. Come `cornice`, una chiave nota; senza,
// la prima. Font Caveat ridotto alle minuscole (public/caveat.woff): una
// scritta nuova con lettere diverse va rifatto il file.
export const SCRITTE = {
  allenamento: { nome: 'La canzone dell’allenamento', testo: "la canzone\ndell'allenamento" }, // su una riga non ci sta (74px)
  playlist: { nome: 'La playlist dell’allenamento', testo: "la playlist\ndell'allenamento" },
  colonna: { nome: 'Colonna sonora', testo: 'colonna sonora' },
  cuffia: { nome: 'In cuffia oggi', testo: 'in cuffia oggi' },
  nessuna: { nome: 'Nessuna', testo: '' },
}

/** Le righe della scritta a mano di questa canzone (vuoto se "nessuna"). */
// La scritta quando non se n'è scelta una: per una playlist di Spotify
// collegata "la playlist dell'allenamento", se no "la canzone".
export const scrittaDiBase = (m) => (soloPlaylist(m) ? 'playlist' : 'allenamento')

export function righeScritta(m) {
  const s = Object.hasOwn(SCRITTE, m?.scritta || '') ? SCRITTE[m.scritta] : SCRITTE[scrittaDiBase(m)]
  return s.testo ? s.testo.split('\n') : []
}

/** I colori della polaroid di questa canzone (crema se non scelti). */
export function coloriCornice(m) {
  return Object.hasOwn(CORNICI, m?.cornice || '') ? CORNICI[m.cornice] : CORNICI.crema
}

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
  const extra = {
    ...(m.cornice !== 'crema' && Object.hasOwn(CORNICI, String(m.cornice || '')) ? { cornice: m.cornice } : {}),
    ...(m.scritta !== scrittaDiBase(m) && Object.hasOwn(SCRITTE, String(m.scritta || ''))
      ? { scritta: m.scritta }
      : {}),
  }
  // Con la canzone si può collegare una playlist (o un album) di Spotify dal
  // link (api/spotify): una pillola in fondo al recap (pezziRecap, `spotify`).
  // Senza canzone la polaroid è la playlist stessa, col nome come titolo.
  const s = normalizzaSpotify(m.spotify)
  const id = testo(m.id, 20)
  const titolo = testo(m.titolo, 120)
  if (!titolo || !ID_OK.test(id)) {
    if (!s) return null
    const tipo = s.tipo === 'album' ? 'Album' : 'Playlist'
    return {
      id: '',
      titolo: s.nome || tipo,
      artista: `${tipo} su Spotify`,
      copertina: s.copertina,
      spotify: s,
      ...extra,
    }
  }
  const copertina = testo(m.copertina, 300)
  return {
    id,
    titolo,
    artista: testo(m.artista, 120),
    copertina: COPERTINA_OK.test(copertina) ? copertina : '',
    ...(s ? { spotify: s } : {}),
    ...extra,
  }
}

/** La playlist di Spotify collegata alla canzone dell'allenamento, o null. */
export const spotifyDi = (musica) => normalizzaSpotify(musica?.spotify)

/** Solo la playlist, senza canzone: la polaroid è lei. */
export const soloPlaylist = (m) => !!m?.spotify && !m?.id

/**
 * Dove ascoltarla: le app tra cui sceglie chi guarda, ognuna col suo link.
 * Vuoto se il cartellino non e' valido.
 * @returns {{ id: 'spotify'|'apple'|'youtube', nome: string, link: string, esatto: boolean }[]}
 */
export function dove(musica) {
  const m = normalizzaMusica(musica)
  // Una playlist di Spotify si apre lì, esatta: le ricerche non servono.
  if (soloPlaylist(m)) return [{ id: 'spotify', nome: 'Spotify', link: linkSpotify(m.spotify), esatto: true }]
  return app(m)
}

/** Come `dove`, per un brano della playlist: senza id di Apple niente Apple Music, le ricerche sì. */
export function doveBrano(brano) {
  return app(normalizzaBrano(brano))
}

function app(m) {
  if (!m) return []
  const q = encodeURIComponent([m.titolo, m.artista].filter(Boolean).join(' '))
  return [
    { id: 'spotify', nome: 'Spotify', link: `https://open.spotify.com/search/${q}`, esatto: false },
    ...(m.id
      ? [{ id: 'apple', nome: 'Apple Music', link: `https://music.apple.com/it/song/${m.id}`, esatto: true }]
      : []),
    { id: 'youtube', nome: 'YouTube Music', link: `https://music.youtube.com/search?q=${q}`, esatto: false },
  ]
}

const SPOTIFY_ID_OK = /^[A-Za-z0-9]{22}$/
const SPOTIFY_COPERTINA_OK = /^https:\/\/([a-z0-9-]+\.)?(scdn\.co|spotifycdn\.com)\//
const COLORE_OK = /^#[0-9a-f]{6}$/

/**
 * Una playlist o un album di Spotify collegati come canzone dell'allenamento
 * (api/spotify): come mostrarli, il link si costruisce da tipo e id.
 * @returns {{tipo: 'playlist'|'album', id: string, nome: string, copertina: string, colore: string, brani: number}|null}
 */
export function normalizzaSpotify(s) {
  if (!s || typeof s !== 'object' || !SPOTIFY_ID_OK.test(s.id)) return null
  const copertina = testo(s.copertina, 300)
  const colore = testo(s.colore, 7).toLowerCase()
  const brani = Math.floor(Number(s.brani))
  return {
    tipo: s.tipo === 'album' ? 'album' : 'playlist',
    id: s.id,
    nome: testo(s.nome, 60),
    copertina: SPOTIFY_COPERTINA_OK.test(copertina) ? copertina : '',
    colore: COLORE_OK.test(colore) ? colore : '',
    brani: brani > 0 ? Math.min(brani, 9999) : 0,
  }
}

/** Il link per aprirla su Spotify. */
export const linkSpotify = (s) => `https://open.spotify.com/${s.tipo}/${s.id}`

// Quante canzoni tiene al massimo la playlist di un allenamento.
export const MAX_PLAYLIST = 60

/**
 * Un brano della playlist dell'allenamento (lib/ascolti): come la canzone,
 * ma l'id di Apple può mancare; in più quante volte è partito.
 * @returns {{id: string, titolo: string, artista: string, copertina: string, volte: number}|null}
 */
export function normalizzaBrano(m) {
  if (!m || typeof m !== 'object') return null
  const titolo = testo(m.titolo, 120)
  if (!titolo) return null
  const id = testo(m.id, 20)
  const copertina = testo(m.copertina, 300)
  const volte = Math.floor(Number(m.volte))
  return {
    id: ID_OK.test(id) ? id : '',
    titolo,
    artista: testo(m.artista, 120),
    copertina: COPERTINA_OK.test(copertina) ? copertina : '',
    volte: volte > 1 ? Math.min(volte, 99) : 1,
  }
}

// Il titolo della playlist quando chi l'ha fatta non l'ha cambiato.
export const TITOLO_PLAYLIST = 'La musica dell’allenamento'

/**
 * La playlist ripulita (nel feed viene dal completamento di un altro), o null
 * se non ha brani. `titolo` vuoto = TITOLO_PLAYLIST. Accetta anche la prima
 * forma, solo la lista dei brani. (Una playlist di Spotify collegata NON sta
 * qui: è la canzone dell'allenamento, normalizzaMusica.)
 * @returns {{titolo: string, brani: object[]}|null}
 */
export function normalizzaPlaylist(p) {
  const lista = Array.isArray(p) ? p : p?.brani
  if (!Array.isArray(lista)) return null
  const brani = lista.map(normalizzaBrano).filter(Boolean).slice(0, MAX_PLAYLIST)
  return brani.length ? { titolo: Array.isArray(p) ? '' : testo(p.titolo, 60), brani } : null
}

// Le risposte di iTunes → cartellini, senza doppioni (lo stesso brano esce
// spesso due volte, dall'album e dal singolo con lo stesso id).
function cartellini(risultati) {
  const visti = new Set()
  const out = []
  for (const r of risultati || []) {
    const m = daRisultatoItunes(r)
    if (!m || visti.has(m.id)) continue
    visti.add(m.id)
    out.push(m)
  }
  return out
}

async function chiedi(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`iTunes ha risposto ${res.status}`)
  return res.json()
}

function indirizzo(base, parametri) {
  return `${base}?${new URLSearchParams({ country: 'IT', ...parametri })}`
}

/**
 * Cerca le canzoni nel catalogo italiano di iTunes.
 * @param {string} q
 * @param {{ signal?: AbortSignal, limite?: number }} [opts]
 * @returns {Promise<Musica[]>} vuoto se la ricerca e' troppo corta
 */
export async function cercaCanzoni(q, { signal, limite = 25 } = {}) {
  const termine = String(q || '').trim()
  if (termine.length < 2) return []
  const dati = await chiedi(indirizzo(RICERCA, { term: termine, entity: 'song', limit: String(limite) }), signal)
  return cartellini(dati?.results)
}

/**
 * Gli artisti che corrispondono alla ricerca. Servono perche' la ricerca
 * delle canzoni di Apple non trova tutto: i brani usciti da poco spesso non
 * ci sono ("UN UOMO SOLO PUO' CAMBIARE IL MONDO" di Praci, luglio 2026,
 * assente anche fra 200 risultati), mentre l'elenco dell'artista si'.
 * @returns {Promise<{ id: string, nome: string }[]>}
 */
export async function cercaArtisti(q, { signal, limite = 3 } = {}) {
  const termine = String(q || '').trim()
  if (termine.length < 2) return []
  const dati = await chiedi(indirizzo(RICERCA, { term: termine, entity: 'musicArtist', limit: String(limite) }), signal)
  const out = []
  for (const r of dati?.results || []) {
    const id = String(r?.artistId || '')
    const nome = testo(r?.artistName, 120)
    if (ID_OK.test(id) && nome) out.push({ id, nome })
  }
  return out
}

/**
 * Tutte le canzoni di un artista (fino a 200), le piu' recenti per prime:
 * Apple le da' in un ordine qualsiasi, e chi cerca un brano che la ricerca
 * non trova di solito cerca proprio un'uscita nuova.
 * @param {string} artistaId
 * @returns {Promise<Musica[]>}
 */
export async function canzoniDiArtista(artistaId, { signal } = {}) {
  if (!ID_OK.test(String(artistaId || ''))) return []
  const dati = await chiedi(
    indirizzo(RICERCA.replace('/search', '/lookup'), { id: String(artistaId), entity: 'song', limit: '200' }),
    signal,
  )
  const brani = (dati?.results || []).filter((r) => r?.kind === 'song')
  brani.sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))
  return cartellini(brani)
}

/**
 * Le canzoni dello stesso album di questa (id di Apple). L'elenco
 * dell'artista si ferma a 200 brani: chi ne ha di più ha album interi che lì
 * non ci sono, e una playlist d'allenamento spesso è un album intero.
 * @returns {Promise<Musica[]>}
 */
export async function canzoniDelloStessoAlbum(id, { signal } = {}) {
  if (!ID_OK.test(String(id || ''))) return []
  const lookup = RICERCA.replace('/search', '/lookup')
  const brano = await chiedi(indirizzo(lookup, { id: String(id) }), signal)
  const album = brano?.results?.[0]?.collectionId
  if (!album) return []
  const dati = await chiedi(indirizzo(lookup, { id: String(album), entity: 'song' }), signal)
  return cartellini(dati?.results)
}

/**
 * Per filtrare una lista di canzoni mentre si scrive: senza maiuscole ne'
 * accenti ("puo" trova "PUÒ").
 */
export function semplifica(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
