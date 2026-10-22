import { PROMPT_AI } from '../src/lib/formatoScheda.js'

// ---------------------------------------------------------------------------
// "Importa da testo" (pages/ImportPage): la scheda del PT, scritta come capita,
// incollata o fotografata o in PDF, la riscrive un'AI di Mistral nel formato
// che legge lib/parser. Risponde col TESTO riscritto, non con la scheda: così
// la strada resta una sola (parser → editor coi "da controllare") e chi
// importa vede e può correggere quello che l'AI ha capito.
//
//   testo         → ministral, col PROMPT_AI di lib/formatoScheda
//   foto          → ministral, che legge le immagini
//   PDF           → prima l'OCR di Mistral (testo), poi ministral
//
// La chiave NON è nel repo: MISTRAL_API_KEY nelle variabili d'ambiente di
// Vercel (online) o nel proprio .env (npm run dev, vedi vite.config).
// Solo chi ha un account, come api/segnala: la chiave si paga a consumo.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'
const MISTRAL = 'https://api.mistral.ai/v1'
const MODELLO = 'ministral-14b-latest'
const MAX_CARATTERI = 20000
// Vercel rifiuta le richieste sopra i 4,5MB: il file arriva in base64 (+33%).
const MAX_FILE = 4_400_000

export const config = { maxDuration: 60 }

async function utenteDelToken(token) {
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  return r.ok ? r.json() : null
}

async function mistral(percorso, corpo) {
  const r = await fetch(`${MISTRAL}${percorso}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    body: JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`mistral ${percorso} ${r.status}: ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

// Le risposte arrivano a volte dentro un blocco ```: il parser vuole il testo nudo.
export function testoDellaRisposta(r) {
  const t = String(r?.choices?.[0]?.message?.content || '').trim()
  return t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
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
  let testo = String(corpo.testo || '').trim().slice(0, MAX_CARATTERI)
  const file = String(corpo.file || '')
  if (file.length > MAX_FILE) return res.status(413).json({ errore: 'Il file è troppo pesante' })
  const pdf = file.startsWith('data:application/pdf;base64,')
  const foto = /^data:image\/(jpeg|png|webp);base64,/.test(file)
  if (file && !pdf && !foto) return res.status(400).json({ errore: 'Si leggono solo foto (JPEG, PNG) e PDF' })
  if (!testo && !file) return res.status(400).json({ errore: 'Niente da leggere' })

  if (!process.env.MISTRAL_API_KEY) return res.status(500).json({ errore: 'Lettura automatica non configurata' })

  try {
    if (pdf) {
      const ocr = await mistral('/ocr', {
        model: 'mistral-ocr-latest',
        document: { type: 'document_url', document_url: file },
      })
      const pagine = (ocr.pages || []).map((p) => p.markdown).join('\n\n')
      testo = [testo, pagine].filter(Boolean).join('\n\n').slice(0, MAX_CARATTERI * 2)
    }
    const contenuto = [{ type: 'text', text: PROMPT_AI + (testo || '(è nella foto)') }]
    if (foto) contenuto.push({ type: 'image_url', image_url: file })
    const risposta = await mistral('/chat/completions', {
      model: MODELLO,
      temperature: 0,
      max_tokens: 4000,
      messages: [{ role: 'user', content: contenuto }],
    })
    const riscritto = testoDellaRisposta(risposta)
    if (!riscritto) return res.status(502).json({ errore: 'L’AI non ha risposto, riprova' })
    return res.status(200).json({ ok: true, testo: riscritto })
  } catch (e) {
    console.error('riscrivi: fallito', e)
    return res.status(502).json({ errore: 'Lettura non riuscita, riprova più tardi' })
  }
}
