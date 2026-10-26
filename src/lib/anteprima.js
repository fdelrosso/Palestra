// ---------------------------------------------------------------------------
// L'anteprima di 30 secondi della canzone dell'allenamento. Sta SOLO nel
// foglio della canzone (components/ChipMusica, `AscoltaSu`), che si apre
// toccando la polaroid o la pillola: sul recap e nel feed non suona niente.
//
// ⚠️ Le condizioni di Apple per le anteprime (iTunes Search API, "Promo
// Content"; App Review 5.2.5), e come le rispettiamo:
// - solo per promuovere la canzone, mai "for entertainment" (l'esempio di
//   Apple: la musica di sottofondo a un collage di foto) → solo nel foglio
//   di quella canzone, solo premendo ▶, mai in automatico;
// - accanto al link Apple Music del brano, con "offerta da iTunes";
// - "streamed only, and not downloaded, saved, cached, or synchronized with
//   video" → si suona dal loro indirizzo, il file non si salva, e nella
//   card/video condivisi (lib/recapImmagine) l'audio non entra.
//
// - Niente database: il link si chiede al tocco (itunes.apple.com/lookup,
//   ~1,5 KB) e resta in memoria finche' l'app e' aperta; il file (~1 MB)
//   arriva da audio-ssl.itunes.apple.com.
// - Un solo audio per tutta l'app: un ▶ nuovo ferma quello di prima.
// ---------------------------------------------------------------------------

const LOOKUP = 'https://itunes.apple.com/lookup'
const ID_OK = /^\d{1,15}$/
const AUDIO_OK = /^https:\/\/audio-ssl\.itunes\.apple\.com\//

// id → Promise<string|null>. Anche i "null" restano: quella canzone
// l'anteprima non ce l'ha, inutile richiederla.
const cache = new Map()

/**
 * Il link dell'anteprima di una canzone di Apple, o null se non ce l'ha.
 * @param {string} id
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<string|null>}
 */
export function urlAnteprima(id, { signal } = {}) {
  const chiave = String(id || '')
  if (!ID_OK.test(chiave)) return Promise.resolve(null)
  if (!cache.has(chiave)) {
    const p = chiedi(chiave, signal).catch((e) => {
      // Un errore di rete non e' "senza anteprima": al prossimo tocco si riprova.
      cache.delete(chiave)
      throw e
    })
    cache.set(chiave, p)
  }
  return cache.get(chiave)
}

async function chiedi(id, signal) {
  const res = await fetch(`${LOOKUP}?${new URLSearchParams({ id, country: 'IT' })}`, { signal })
  if (!res.ok) throw new Error(`iTunes ha risposto ${res.status}`)
  const dati = await res.json()
  const brano = (dati?.results || []).find((r) => r?.kind === 'song' && String(r.trackId) === id)
  const url = typeof brano?.previewUrl === 'string' ? brano.previewUrl : ''
  return AUDIO_OK.test(url) ? url : null
}

/** Solo per i test. */
export function _svuotaCache() {
  cache.clear()
}

// --- Il lettore: uno solo, condiviso ---------------------------------------

/** @typedef {{ chi: symbol|null, stato: 'fermo'|'carica'|'suona', progresso: number }} StatoLettore */

let audio = null
/** @type {StatoLettore} */
let stato = { chi: null, stato: 'fermo', progresso: 0 }
const ascoltatori = new Set()

function cambia(nuovo) {
  stato = { ...stato, ...nuovo }
  for (const f of ascoltatori) f(stato)
}

function lettore() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'auto'
  audio.addEventListener('timeupdate', () => {
    const d = audio.duration
    if (d > 0) cambia({ progresso: Math.min(1, audio.currentTime / d) })
  })
  audio.addEventListener('playing', () => stato.chi && cambia({ stato: 'suona' }))
  audio.addEventListener('ended', () => cambia({ chi: null, stato: 'fermo', progresso: 0 }))
  audio.addEventListener('error', () => cambia({ chi: null, stato: 'fermo', progresso: 0 }))
  // Uscendo dall'app (o cambiando scheda) la musica non resta accesa.
  document.addEventListener('visibilitychange', () => document.hidden && ferma())
  return audio
}

// iPhone: play() vale solo DENTRO il tocco, e al primo tocco prima c'e' da
// chiedere il link ad Apple (await). Un decimo di secondo di silenzio fatto
// partire subito "sblocca" l'elemento: dopo, play() funziona anche fuori.
const SILENZIO =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='
let sbloccato = false

/** Da chiamare subito nel tocco, prima di qualsiasi await. */
export function sblocca() {
  if (sbloccato) return
  sbloccato = true
  const a = lettore()
  a.src = SILENZIO
  a.play().catch(() => {
    sbloccato = false
  })
}

/** @param {(s: StatoLettore) => void} f */
export function ascolta(f) {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}

export function statoLettore() {
  return stato
}

/**
 * Suona l'anteprima per conto di `chi` (un simbolo per ogni ▶ a schermo:
 * la stessa canzone puo' stare in due polaroid). Va chiamata dentro il tocco.
 */
let giro = 0

export function suona(chi, url) {
  const a = lettore()
  const questo = ++giro
  a.pause()
  a.src = url
  a.currentTime = 0
  cambia({ chi, stato: 'carica', progresso: 0 })
  // Un play() interrotto da un suona() piu' nuovo (in sviluppo React monta il
  // foglio due volte) fallisce: lo stato e' gia' di quello nuovo, non si tocca.
  return a.play().catch(() => questo === giro && cambia({ chi: null, stato: 'fermo', progresso: 0 }))
}

/** Ferma tutto; con `chi`, solo se sta suonando lui. */
export function ferma(chi) {
  if (chi && stato.chi !== chi) return
  giro++
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  if (stato.chi) cambia({ chi: null, stato: 'fermo', progresso: 0 })
}
