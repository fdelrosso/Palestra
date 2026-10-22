// ---------------------------------------------------------------------------
// Una playlist (o un album) di Spotify dal suo link, da collegare
// all'allenamento al posto della lista dei brani (components/
// PlaylistAllenamento, "Collega una playlist di Spotify"): chi non ha l'app
// Android (iPhone) non ha gli ascolti registrati, ma la sua playlist ce l'ha.
// Si prende solo come mostrarla: nome, copertina, colore, quanti brani.
//
// ⚠️ Non e' l'API di Spotify (fuori dalla modalita' sviluppo e' solo per
// aziende, docs/decisioni): si legge la pagina PUBBLICA del lettore da
// incorporare (open.spotify.com/embed/...), che porta tutto in un JSON
// (__NEXT_DATA__). Se Spotify la cambia smette di funzionare: risponde 502 e
// l'app lo dice. Dal browser non si puo' leggerla (niente CORS): per questo
// passa da qui.
//
// Solo chi ha un account (come api/segnala): senza, sarebbe un proxy aperto.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'

async function utenteDelToken(token) {
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  return r.ok ? r.json() : null
}

/** { tipo: 'playlist'|'album', id } dal link (anche /intl-it/ e spotify:playlist:…), o null. */
export function daLink(link) {
  const m = String(link || '').match(
    /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(playlist|album)[/:]([A-Za-z0-9]{22})/,
  )
  return m ? { tipo: m[1], id: m[2] } : null
}

/**
 * Quello che serve a mostrarla dal JSON della pagina: nome, copertina (~300px),
 * il colore di fondo che le dà Spotify e quanti brani. Null se la pagina non
 * è più com'era.
 * @returns {{nome: string, copertina: string, colore: string, brani: number}|null}
 */
export function daPagina(html) {
  const m = String(html).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let e
  try {
    e = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity
  } catch {
    return null
  }
  if (!e?.name && !e?.title) return null
  const immagini = [...(e.visualIdentity?.image || [])].sort((a, b) => (a.maxWidth || 0) - (b.maxWidth || 0))
  const copertina =
    (immagini.find((i) => (i.maxWidth || 0) >= 300) || immagini[immagini.length - 1])?.url ||
    e.coverArt?.sources?.[0]?.url ||
    ''
  const c = e.visualIdentity?.backgroundTintedBase
  const esa = (n) =>
    Math.max(0, Math.min(255, Number(n) || 0))
      .toString(16)
      .padStart(2, '0')
  return {
    nome: String(e.name || e.title).slice(0, 60),
    copertina: String(copertina).slice(0, 300),
    colore: c ? `#${esa(c.red)}${esa(c.green)}${esa(c.blue)}` : '',
    brani: Array.isArray(e.trackList) ? e.trackList.length : 0,
  }
}

/** Il numero di brani dalla pagina normale (`music:song_count`), 0 se non c'è. */
export function quantiBrani(html) {
  return Number(String(html).match(/<meta name="music:song_count" content="(\d+)"/)?.[1]) || 0
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ errore: 'Solo GET' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const utente = await utenteDelToken(token).catch(() => null)
  if (!utente?.id) return res.status(401).json({ errore: 'Accedi per importare una playlist' })

  const dove = daLink(req.query?.link)
  if (!dove) return res.status(400).json({ errore: 'Non è il link di una playlist o di un album di Spotify' })

  let html
  try {
    const r = await fetch(`https://open.spotify.com/embed/${dove.tipo}/${dove.id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'it' },
    })
    if (r.status === 404) return res.status(404).json({ errore: 'Playlist non trovata: è pubblica?' })
    if (!r.ok) throw new Error(String(r.status))
    html = await r.text()
  } catch {
    return res.status(502).json({ errore: 'Spotify non risponde, riprova più tardi' })
  }
  const dati = daPagina(html)
  if (!dati) return res.status(502).json({ errore: 'Non riesco a leggere questa playlist' })
  // Il lettore incorporato porta al massimo 100 brani: oltre, il numero vero
  // sta nella pagina normale. Se non risponde, resta 100.
  if (dati.brani >= 100) {
    const pagina = await fetch(`https://open.spotify.com/${dove.tipo}/${dove.id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    dati.brani = Math.max(dati.brani, quantiBrani(pagina))
  }
  // La stessa playlist richiesta entro un'ora la ridà il telefono, senza chiamare qui.
  res.setHeader('Cache-Control', 'private, max-age=3600')
  return res.status(200).json({ tipo: dove.tipo, id: dove.id, ...dati })
}
