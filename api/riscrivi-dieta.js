import { NESSUNA_DIETA, PROMPT_AI_DIETA, PROMPT_TRASCRIVI_DIETA, sistemaGiornate } from '../src/lib/formatoDieta.js'

// ---------------------------------------------------------------------------
// "Dieta dal nutrizionista" (pages/DietaImportPage): il gemello di
// api/riscrivi per la dieta invece della scheda. La dieta, incollata o
// fotografata o in PDF, la riscrive un'AI di Mistral nel formato di
// lib/formatoDieta, che lib/parserDieta legge. Risponde col TESTO riscritto,
// non con la dieta: la strada resta una sola (parser → la pagina dove la si
// vede e la si corregge), come per le schede.
//
//   testo         → ministral, col PROMPT_AI_DIETA
//   foto, PDF     → prima ministral li TRASCRIVE, poi la trascrizione va
//                   riscritta come un testo (in due passi per lo stesso motivo
//                   di api/riscrivi: tutto in una chiamata era troppo).
//
// Separato da api/riscrivi apposta: quello è pieno di regole che servono solo
// alle schede (i nomi della libreria, i carichi inventati, le superserie), e
// toccarlo per la dieta voleva dire rischiare le schede.
//
// Stessa chiave (MISTRAL_API_KEY su Vercel o nel proprio .env) e stessa regola:
// solo chi ha un account, perché la chiave si paga a consumo.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'
const MISTRAL = 'https://api.mistral.ai/v1'
const MODELLO = 'ministral-14b-latest'
const MAX_CARATTERI = 20000
// Vercel rifiuta le richieste sopra i 4,5MB: il file arriva in base64 (+33%).
const MAX_FILE = 4_400_000
const NON_DIETA = 'Questa foto non sembra una dieta'

// 5 minuti: per una foto o una scansione le chiamate sono due, e una dieta di
// piu' pagine in 60 secondi poteva non starci.
export const config = { maxDuration: 300 }

async function utenteDelToken(token) {
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  return r.ok ? r.json() : null
}

async function mistral(corpo) {
  const r = await fetch(`${MISTRAL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    body: JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`mistral ${r.status}: ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

// Il parser vuole il testo nudo: via blocchi ```, **grassetti**, # titoli,
// righe --- e i pallini che l'AI mette nonostante il prompt.
export function testoDellaDieta(r) {
  return String(r?.choices?.[0]?.message?.content || '')
    .replace(/^```[a-z]*$/gim, '')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/^\s*[-•*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ errore: 'Solo POST' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const utente = await utenteDelToken(token).catch(() => null)
  if (!utente?.id) return res.status(401).json({ errore: 'Accedi per usare la lettura automatica' })

  let corpo = req.body || {}
  if (typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo || '{}')
    } catch {
      return res.status(400).json({ errore: 'Richiesta non valida' })
    }
  }
  const testo = String(corpo.testo || '').trim().slice(0, MAX_CARATTERI)
  const file = String(corpo.file || '')
  if (file.length > MAX_FILE) return res.status(413).json({ errore: 'Il file è troppo pesante' })
  const pdf = file.startsWith('data:application/pdf;base64,')
  const foto = /^data:image\/(jpeg|png|webp);base64,/.test(file)
  if (file && !pdf && !foto) return res.status(400).json({ errore: 'Si leggono solo foto (JPEG, PNG) e PDF' })
  if (!testo && !file) return res.status(400).json({ errore: 'Niente da leggere' })

  if (!process.env.MISTRAL_API_KEY) return res.status(500).json({ errore: 'Lettura automatica non configurata' })

  try {
    let daRiscrivere = testo
    if (file) {
      const allegato = foto ? { type: 'image_url', image_url: file } : { type: 'document_url', document_url: file }
      const trascritto = await mistral({
        model: MODELLO,
        temperature: 0,
        max_tokens: 6000,
        messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT_TRASCRIVI_DIETA }, allegato] }],
      })
      const trascrizione = trascritto.choices?.[0]?.message?.content || ''
      if (trascrizione.includes(NESSUNA_DIETA)) {
        if (!testo) return res.status(422).json({ errore: NON_DIETA })
      } else {
        daRiscrivere = [testo, trascrizione].filter(Boolean).join('\n\n')
      }
    }
    const risposta = await mistral({
      model: MODELLO,
      temperature: 0,
      max_tokens: 6000,
      messages: [{ role: 'user', content: PROMPT_AI_DIETA + daRiscrivere }],
    })
    // Le giornate rimesse in fila se l'AI ha lasciato i titoli in mezzo ai
    // pasti, e senza i pasti di workout inventati (lib/formatoDieta, sistemaGiornate).
    const riscritto = sistemaGiornate(testoDellaDieta(risposta), daRiscrivere)
    if (riscritto.includes(NESSUNA_DIETA)) return res.status(422).json({ errore: 'Questo non sembra una dieta' })
    if (!riscritto) return res.status(502).json({ errore: 'L’AI non ha risposto, riprova' })
    return res.status(200).json({ ok: true, testo: riscritto })
  } catch (e) {
    console.error('riscrivi-dieta: fallito', e)
    return res.status(502).json({ errore: 'Lettura non riuscita, riprova più tardi' })
  }
}
