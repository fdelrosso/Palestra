// ---------------------------------------------------------------------------
// I link delle mail di Supabase: riconoscerli e toglierli dalla barra.
//
// Due mail portano un link che riapre l'app con dentro una prova:
// - la CONFERMA dell'email, dopo la registrazione (`type=signup` o `email`);
// - il RECUPERO della password dimenticata (`type=recovery`).
// In tutti e due i casi il link, usato, crea una sessione; cambia che cosa si
// fa vedere dopo (lo decide AccountContext, le schermate sono ConfermaEmail e
// NuovaPassword).
//
// Supabase la prova la puo' mettere in due modi, e qui si capiscono tutti e due:
//
// - `?token_hash=...&type=...` — se il template della mail costruisce il link
//   da se' (`{{ .TokenHash }}`). E' il modo consigliato: finche' non lo apre
//   l'app, il token non si consuma. I programmi di posta che "aprono in
//   anteprima" i link per controllarli (Outlook, certi antivirus) con l'altro
//   modo bruciano il link prima che la persona ci clicchi.
// - `#access_token=...&type=...` — il link standard (`{{ .ConfirmationURL }}`):
//   Supabase verifica e rimanda qui con la sessione gia' pronta nell'hash.
//
// Se il link e' scaduto o gia' usato, Supabase rimanda qui con `error=...`,
// nell'hash o nella query — e di solito SENZA dire di che link si trattava.
//
// ⚠️ Perche' a mano: il client Supabase questo lavoro lo saprebbe fare da solo
// (`detectSessionInUrl`), ma l'app usa l'hash per le pagine (#/schede) e i due
// si pesterebbero i piedi (vedi lib/supabase). Qui si guarda solo cio' che ha
// la forma di un link di Supabase; tutto il resto resta al router.
//
// Niente import: si carica nei test senza loader.
// ---------------------------------------------------------------------------

// Il `type` del link → a che cosa serve. `signup` e' il nome vecchio di
// `email`: Supabase li accetta tutti e due.
const SCOPI = {
  signup: 'conferma',
  email: 'conferma',
  recovery: 'recupero',
}

// Il `type` da dare a `verifyOtp` per ciascuno scopo.
export const TIPO_VERIFICA = {
  conferma: 'email',
  recupero: 'recovery',
}

// I parametri che il link si porta dietro e che, letti, vanno via dalla barra.
const PARAMETRI_LINK = [
  'token_hash',
  'type',
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'error',
  'error_code',
  'error_description',
]

// L'hash di un link di Supabase e' una query ("#a=1&b=2"), quello del router
// un percorso ("#/schede"): si distinguono dal primo carattere.
function parametriHash(hash) {
  const h = String(hash || '').replace(/^#/, '')
  if (!h || h.startsWith('/')) return new URLSearchParams()
  return new URLSearchParams(h)
}

/**
 * Che cosa porta l'indirizzo con cui si e' aperta l'app.
 *
 * Torna `null` se non e' un link di Supabase che ci riguarda, altrimenti
 * `{ scopo, tipo, ... }` dove `scopo` e' 'conferma' o 'recupero' (null per un
 * errore che non dice da che link viene) e `tipo` uno di:
 *   { tipo: 'token', tokenHash }
 *   { tipo: 'sessione', accessToken, refreshToken }
 *   { tipo: 'errore', codice, descrizione }
 */
export function leggiLinkEmail({ search = '', hash = '' } = {}) {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const h = parametriHash(hash)
  const leggi = (k) => q.get(k) || h.get(k) || ''

  const type = leggi('type')
  const scopo = SCOPI[type] || null
  const errore = leggi('error') || leggi('error_code')
  if (errore) {
    // Un errore di un link che non e' nostro (un invito, un cambio email).
    if (type && !scopo) return null
    return {
      scopo,
      tipo: 'errore',
      codice: leggi('error_code') || errore,
      descrizione: leggi('error_description'),
    }
  }

  if (!scopo) return null

  const tokenHash = leggi('token_hash')
  if (tokenHash) return { scopo, tipo: 'token', tokenHash }

  const accessToken = leggi('access_token')
  const refreshToken = leggi('refresh_token')
  if (accessToken && refreshToken) return { scopo, tipo: 'sessione', accessToken, refreshToken }

  return null
}

/**
 * L'indirizzo pulito: lo stesso di prima senza token ne' errori. Il token non
 * deve restare nella barra (finirebbe nella cronologia, in un segnalibro, in
 * uno screenshot), e un hash-query lasciato li' il router lo leggerebbe come
 * pagina.
 */
export function indirizzoSenzaLink({ pathname = '/', search = '', hash = '' } = {}) {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  for (const k of PARAMETRI_LINK) q.delete(k)
  const resto = q.toString()
  const h = String(hash || '')
  const hashPulito = h.startsWith('#/') ? h : ''
  return `${pathname || '/'}${resto ? `?${resto}` : ''}${hashPulito}`
}

/** Il messaggio da far leggere quando il link non ha funzionato. */
export function messaggioLinkNonValido(codice = '') {
  if (/expired|invalid|otp/i.test(String(codice))) {
    return 'Il link è scaduto o è già stato usato.'
  }
  return 'Non sono riuscito ad aprire questo link.'
}
