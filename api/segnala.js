import nodemailer from 'nodemailer'

// ---------------------------------------------------------------------------
// "Segnala un problema" (components/SegnalaProblema): una funzione di Vercel
// che manda a info@progettopalestra.it il messaggio scritto nell'app.
//
// Le mail partono dallo stesso SMTP di Register.it che usa Supabase per le
// conferme (docs/storico.md, 30ª). Le credenziali NON sono nel repo: stanno
// nelle variabili d'ambiente del progetto Vercel:
//   SMTP_USER  (es. noreply@progettopalestra.it)
//   SMTP_PASS
//   SMTP_HOST  (facoltativa, di base authsmtp.securemail.pro)
//   SMTP_PORT  (facoltativa, di base 465)
//
// Scrive solo chi ha un account: il token della sessione si fa controllare
// da Supabase, così la casella non diventa un modo per riempire info@ di spam.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'
const DESTINATARIO = 'info@progettopalestra.it'
const MAX_CARATTERI = 3000
// `feedback`: la domanda che compare da sola dopo aver salvato un allenamento
// (components/FeedbackAllenamento), non scelta da chi scrive.
const TIPI = { bug: 'Errore / bug', miglioria: 'Miglioria', altro: 'Altro', feedback: 'Feedback dopo l’allenamento' }

// Chi ha la sessione valida, secondo Supabase; null se il token non va.
async function utenteDelToken(token) {
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  return r.ok ? r.json() : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ errore: 'Solo POST' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const utente = await utenteDelToken(token).catch(() => null)
  if (!utente?.id) return res.status(401).json({ errore: 'Accedi per inviare una segnalazione' })

  let corpo = req.body || {}
  if (typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo || '{}')
    } catch {
      return res.status(400).json({ errore: 'Richiesta non valida' })
    }
  }
  const testo = String(corpo.testo || '').trim().slice(0, MAX_CARATTERI)
  if (testo.length < 5) return res.status(400).json({ errore: 'Il messaggio è troppo corto' })
  const tipo = TIPI[corpo.tipo] || TIPI.altro
  const pagina = String(corpo.pagina || '').slice(0, 200)
  const nome = String(corpo.nome || '').slice(0, 100)
  const agent = String(req.headers['user-agent'] || '').slice(0, 300)

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ errore: 'Invio non ancora configurato' })
  }
  const posta = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'authsmtp.securemail.pro',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  try {
    await posta.sendMail({
      from: `"Progetto Palestra" <${process.env.SMTP_USER}>`,
      to: DESTINATARIO,
      // "Rispondi" nel programma di posta scrive direttamente a chi ha segnalato.
      replyTo: utente.email || undefined,
      subject: `[${tipo}] segnalazione da ${nome || utente.email || 'un utente'}`,
      text: [
        testo,
        '',
        '—',
        `Tipo: ${tipo}`,
        `Da: ${nome || '(senza nome)'} <${utente.email || 'email sconosciuta'}>`,
        `Id utente: ${utente.id}`,
        `Pagina: ${pagina || '?'}`,
        `Dispositivo: ${agent || '?'}`,
      ].join('\n'),
    })
  } catch (e) {
    console.error('segnala: invio fallito', e)
    return res.status(502).json({ errore: 'Invio non riuscito, riprova più tardi' })
  }
  return res.status(200).json({ ok: true })
}
