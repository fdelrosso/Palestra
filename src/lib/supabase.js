// ---------------------------------------------------------------------------
// Il collegamento al progetto Supabase: un client solo, per tutta l'app.
//
// ⚠️ LA CHIAVE STA QUI IN CHIARO ED E' GIUSTO COSI'. E' la "publishable key"
// (`sb_publishable_...`), che Supabase documenta come sicura da mettere nel
// codice sorgente di un'app che gira nel browser. Non e' lei a proteggere i
// dati: dice soltanto "sono l'app Palestra". A dire "sono Filippo" e' il login,
// e a decidere che cosa Filippo puo' leggere sono le regole scritte nel
// database (Row Level Security, vedi supabase/schema.sql). Senza quelle regole
// questa chiave aprirebbe tutto — con quelle, non apre niente che non sia tuo.
//
// ⛔ La chiave che NON deve mai finire qui dentro e' la "secret key"
// (`sb_secret_...`): quella scavalca le regole e vale solo lato server.
//
// Si puo' sovrascrivere da variabili d'ambiente (VITE_SUPABASE_URL /
// VITE_SUPABASE_KEY) per puntare a un altro progetto senza toccare il codice —
// serve se un giorno si vuole un progetto di prova separato da quello vero.
// Il valore scritto qui resta il default, cosi' l'app funziona appena clonata
// e non si rompe in silenzio su Vercel se qualcuno dimentica di impostarle.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // La sessione resta in localStorage e si rinnova da sola: su un telefono
    // che apre l'app una volta al giorno, il contrario vorrebbe dire rifare il
    // login ogni volta.
    persistSession: true,
    autoRefreshToken: true,
    // L'app usa hash routing (#/schede): senza questo, Supabase proverebbe a
    // leggere i token di conferma mail dall'hash e si azzufferebbe col router.
    detectSessionInUrl: false,
  },
})

/**
 * Un errore di Supabase riscritto in italiano, per la persona che lo legge.
 * I messaggi originali sono in inglese e parlano di cose che non riguardano
 * chi si sta iscrivendo ("AuthApiError: User already registered").
 * Quello che non riconosciamo torna com'e': meglio un messaggio brutto che un
 * messaggio inventato che manda fuori strada.
 */
export function messaggioErrore(errore) {
  if (!errore) return ''
  const m = String(errore.message || errore)
  const noti = [
    [/already registered|already exists/i, 'Esiste già un account con questa email.'],
    [/invalid login credentials/i, 'Email o password non corretti.'],
    [/email not confirmed/i, "Devi prima confermare l'email: controlla la posta."],
    [/password should be at least (\d+)/i, 'La password deve avere almeno $1 caratteri.'],
    [/invalid email|unable to validate email/i, "L'indirizzo email non sembra valido."],
    [/rate limit|too many requests/i, 'Troppi tentativi: aspetta qualche minuto e riprova.'],
    [/failed to fetch|network/i, 'Nessuna connessione: controlla la rete e riprova.'],
    [/for security purposes/i, 'Aspetta qualche secondo prima di riprovare.'],
  ]
  for (const [regola, testo] of noti) {
    if (regola.test(m)) return m.replace(regola, testo)
  }
  return m
}

/** C'è rete? Serve a distinguere "non ho trovato niente" da "non ho potuto guardare". */
export function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
