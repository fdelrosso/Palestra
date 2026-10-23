import { LIBRERIA, inLibreria, normalizzaNome, slugEsercizio } from '../src/lib/eserciziLibreria.js'
import { PROMPT_AI } from '../src/lib/formatoScheda.js'
import { leggiScheda } from '../src/lib/parser.js'

// ---------------------------------------------------------------------------
// "Importa da testo" (pages/ImportPage): la scheda del PT, scritta come capita,
// incollata o fotografata o in PDF, la riscrive un'AI di Mistral nel formato
// che legge lib/parser. Risponde col TESTO riscritto, non con la scheda: così
// la strada resta una sola (parser → editor coi "da controllare") e chi
// importa vede e può correggere quello che l'AI ha capito.
//
//   testo         → ministral, col PROMPT_AI di lib/formatoScheda
//   foto, PDF     → prima ministral li TRASCRIVE (image_url, document_url),
//                   poi la trascrizione va riscritta come un testo
// ⚠️ In due passi apposta: leggere una foto E seguire le regole nella stessa
// chiamata era troppo per ministral. Su una scheda vera (tabelle a mano, gli
// addominali in un riquadro segnati A e B) leggeva tutti i recuperi come 1' e
// metteva gli addominali di A e di B in fondo al B; trascrivendo prima, li
// legge giusti, e le regole lavorano su un testo.
// ⚠️ Non l'OCR di Mistral (/v1/ocr): col piano gratuito risponde sempre 429.
//
// Poi una seconda chiamata, solo testo, per i NOMI: "lat pull" è la "Lat
// machine avanti" della libreria (lib/eserciziLibreria), che ha già i suoi
// muscoli, così chi importa non li deve scegliere. Torna in `nomi` {scritto →
// nome della libreria}; ImportPage rinomina. ⚠️ Separata apposta: con la foto
// e l'elenco nella stessa chiamata ministral l'elenco lo ignorava. E si tiene
// solo un nome che è DAVVERO nella libreria: inventarne uno non passa.
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

const CANONICI = Object.fromEntries(Object.values(LIBRERIA).flat().map((n) => [slugEsercizio(n), n]))
const ELENCO = Object.entries(LIBRERIA).map(([g, nomi]) => `${g}: ${nomi.join('; ')}`).join('\n')

const PROMPT_TRASCRIVI = `Trascrivi ESATTAMENTE il testo di questa scheda di allenamento, senza riscriverlo né interpretarlo. Una tabella o sezione alla volta, col suo titolo; per ogni riga di tabella una riga, con le celle separate da " | ". Se accanto a una riga o a un gruppo di righe c'è una lettera o un numero (anche cerchiato, anche fuori dalla tabella), scrivilo all'inizio di quelle righe così: "[segnato B] Plank | 3x40\"". Le parole barrate scrivile tra ~~ ~~. Niente commenti.`

const PROMPT_NOMI = `Ti do i nomi di alcuni esercizi scritti da un personal trainer, e l'elenco degli esercizi di un'app. Per ogni nome scritto, trova nell'elenco lo STESSO esercizio, anche se è scritto abbreviato, in inglese o con altre parole ("lat pull" → "Lat machine avanti", "RDL" → "Stacco rumeno"). Deve essere lo stesso movimento con lo stesso attrezzo; se l'attrezzo non è scritto, va bene la versione più comune. Attento alle parole simili che vogliono dire il contrario: pull/push, curl/extension, presa larga/stretta, piana/inclinata, laterali/90° (posteriori). Se non c'è, o non sei sicuro, null.
Rispondi solo con un oggetto JSON: { "<nome scritto>": "<nome dell'elenco, copiato identico>" | null }.

Elenco, per gruppo:
${ELENCO}

Nomi scritti:
`

// I nomi della scheda riscritta che non sono già della libreria → quelli della
// libreria, per quelli che l'AI riconosce. {} se non ce n'è o se va male.
async function nomiDellaLibreria(testo) {
  const scheda = leggiScheda(testo).scheda
  const scritti = [...new Set(scheda.giorni.flatMap((g) => g.esercizi.map((e) => e.nome)))].filter((n) => !inLibreria(n))
  if (!scritti.length) return {}
  try {
    const r = await mistral('/chat/completions', {
      model: MODELLO,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: PROMPT_NOMI + scritti.map((n) => `- ${n}`).join('\n') }],
    })
    return nomiValidi(JSON.parse(r.choices[0].message.content), scritti)
  } catch (e) {
    console.error('riscrivi: nomi non trovati', e)
    return {}
  }
}

// Parole che vogliono dire il contrario: "Pull down" non è il "Push down",
// anche se ministral, col prompt che lo dice, continuava a proporlo.
// ponytail: elenco a mano, si allunga quando se ne vede un'altra coppia.
const OPPOSTI = [
  ['pull', 'push'],
  ['curl', 'extension|estension'],
  ['larga', 'stretta'],
  ['piana', 'inclinata|declinata'],
]
const opposti = (a, b) =>
  OPPOSTI.some(([x, y]) => {
    const [rx, ry] = [new RegExp(`\\b(?:${x})`), new RegExp(`\\b(?:${y})`)]
    return (rx.test(a) && ry.test(b) && !rx.test(b)) || (ry.test(a) && rx.test(b) && !ry.test(b))
  })

// Solo nomi scritti davvero, verso nomi davvero della libreria (col loro
// maiuscolo): quello che l'AI inventa, o che dice il contrario, si butta.
export function nomiValidi(risposta, scritti) {
  const out = {}
  for (const nome of scritti) {
    const canonico = CANONICI[slugEsercizio(risposta?.[nome] || '')]
    if (canonico && !opposti(normalizzaNome(nome), normalizzaNome(canonico))) out[nome] = canonico
  }
  return out
}

// Il parser vuole il testo nudo, e il prompt da solo non basta a toglierle il
// vizio: blocchi ```, **grassetti**, # titoli, righe --- tra un giorno e l'altro.
export function testoDellaRisposta(r) {
  return String(r?.choices?.[0]?.message?.content || '')
    .replace(/^```[a-z]*$/gim, '')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    // "Riscaldamento: non specificato" anche se il prompt dice di no.
    // ⚠️ Non "Riscaldamento:" da solo: è l'inizio di un elenco nelle righe sotto.
    .replace(/^(?:riscaldamento|mobilit[aà]|stretching)[ \t]*:[ \t]*(?:non specificat\w*|nessun\w*|n\/?a|-+)[ \t]*(?:\n|$)/gim, '')
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
      const trascritto = await mistral('/chat/completions', {
        model: MODELLO,
        temperature: 0,
        max_tokens: 4000,
        messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT_TRASCRIVI }, allegato] }],
      })
      daRiscrivere = [testo, trascritto.choices?.[0]?.message?.content || ''].filter(Boolean).join('\n\n')
    }
    const contenuto = PROMPT_AI + daRiscrivere
    const risposta = await mistral('/chat/completions', {
      model: MODELLO,
      temperature: 0,
      max_tokens: 4000,
      messages: [{ role: 'user', content: contenuto }],
    })
    const riscritto = testoDellaRisposta(risposta)
    if (!riscritto) return res.status(502).json({ errore: 'L’AI non ha risposto, riprova' })
    return res.status(200).json({ ok: true, testo: riscritto, nomi: await nomiDellaLibreria(riscritto) })
  } catch (e) {
    console.error('riscrivi: fallito', e)
    return res.status(502).json({ errore: 'Lettura non riuscita, riprova più tardi' })
  }
}
