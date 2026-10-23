// ---------------------------------------------------------------------------
// La ricerca dei prodotti di Open Food Facts per nome ("Cosa hai mangiato" in
// Dieta, lib/ricercaCibo), passando da qui.
//
// ⚠️ Perché da qui. La ricerca vecchia (cgi/search.pl), l'unica che il
// browser può chiamare direttamente, risponde quasi sempre 503: è
// sovraccarica, e la pagina d'errore non ha l'intestazione CORS, quindi nel
// browser sembra un blocco. Quella nuova (search.openfoodfacts.org) risponde
// bene ma accetta il browser solo dai loro siti: da un server invece sì.
// Se la nuova non risponde si prova la vecchia, sempre da qui.
//
// Torna i prodotti nella forma della ricerca vecchia (`brands` è un testo),
// così lib/ricercaCibo li legge con lo stesso daProdotto.
//
// Solo chi ha un account (come api/spotify): senza, sarebbe un proxy aperto.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'
const CAMPI = 'code,product_name,product_name_it,brands,quantity,serving_quantity,nutriments'
// Open Food Facts chiede di presentarsi: nome dell'app e un contatto.
const AGENTE = 'ProgettoPalestra/1.0 (info@progettopalestra.it)'
const ATTESA_MAX = 7000

async function utenteDelToken(token) {
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  return r.ok ? r.json() : null
}

async function chiedi(url) {
  const taglia = new AbortController()
  const timer = setTimeout(() => taglia.abort(), ATTESA_MAX)
  try {
    const r = await fetch(url, { signal: taglia.signal, headers: { 'User-Agent': AGENTE, Accept: 'application/json' } })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Una riga della ricerca nuova nella forma di quella vecchia. */
export function comeVecchia(hit) {
  return {
    ...hit,
    brands: Array.isArray(hit?.brands) ? hit.brands.join(', ') : hit?.brands || '',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ errore: 'Solo GET' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const utente = await utenteDelToken(token).catch(() => null)
  if (!utente?.id) return res.status(401).json({ errore: 'Accedi per cercare un prodotto' })

  const q = String(req.query?.q || '').trim().slice(0, 80)
  const quanti = Math.min(40, Math.max(1, Number(req.query?.quanti) || 24))
  if (q.length < 3) return res.status(400).json({ errore: 'Scrivi almeno tre lettere' })

  let prodotti = null
  try {
    const dati = await chiedi(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${quanti}&langs=it&fields=${CAMPI}`,
    )
    prodotti = (dati?.hits || []).map(comeVecchia)
  } catch {
    try {
      const dati = await chiedi(
        `https://it.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
          `&search_simple=1&action=process&json=1&page_size=${quanti}&fields=${CAMPI}`,
      )
      prodotti = dati?.products || []
    } catch {
      return res.status(502).json({ errore: 'Il servizio dei prodotti non risponde, riprova fra poco.' })
    }
  }
  // La stessa ricerca entro un'ora la ridà il telefono, senza chiamare qui.
  res.setHeader('Cache-Control', 'private, max-age=3600')
  return res.status(200).json({ prodotti })
}
