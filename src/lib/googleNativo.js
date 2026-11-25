// ---------------------------------------------------------------------------
// "Continua con Google" nell'app Android.
//
// Google NON fa entrare dal suo sito dentro un WebView (403
// disallowed_useragent), e l'app e' un WebView. Quindi qui niente giro sul
// sito: il plugin (@capgo/capacitor-social-login) apre la scelta dell'account
// di Android e torna con l'ID token di Google, che Supabase scambia con una
// sessione (`signInWithIdToken`). Dopo, tutto come sul web: AccountContext
// vede la sessione nuova, e chi e' nuovo passa dalle domande della
// registrazione.
//
// ⚠️ Il plugin arriva con l'APK (dal 6): un APK piu' vecchio non lo ha, e il
// tasto non si vede (UserGate).
//
// NONCE. Supabase vuole sapere che il token e' nato per QUESTO accesso: a
// Google va l'hash SHA-256 del nonce (finisce dentro il token), a Supabase il
// nonce in chiaro, e Supabase confronta.
//
// Il client ID e' quello WEB (lo stesso del provider Google di Supabase), non
// quello Android: e' pubblico, compare nell'indirizzo di ogni login Google.
// Quello Android non sta nel codice, serve solo a Google per riconoscere la
// firma dell'APK.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core'
import { messaggioErrore, supabase } from './supabase'

export const GOOGLE_WEB_CLIENT_ID =
  '897291333410-b5gu0gd8g5glf9u0eakf1lnn2kn1idju.apps.googleusercontent.com'

export const googleNativo = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SocialLogin')

async function sha256Hex(testo) {
  const byte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo))
  return [...new Uint8Array(byte)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

let pronto = null

/** { ok, nativo: true } oppure { ok: false, errore, annullato? }. */
export async function accessoGoogleNativo() {
  try {
    const { SocialLogin } = await import('@capgo/capacitor-social-login')
    // Una volta sola per avvio. `skipAuthOnly…`: serve solo l'ID token, e senza
    // il secondo passo (permessi alle API Google) su un BridgeActivity normale
    // il login puo' restare appeso.
    pronto ??= SocialLogin.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID, skipAuthOnlyAuthorizationAfterSignIn: true },
    }).catch((e) => {
      pronto = null
      throw e
    })
    await pronto
    const nonce = crypto.randomUUID()
    const risposta = await SocialLogin.login({
      provider: 'google',
      options: { nonce: await sha256Hex(nonce) },
    })
    const token = risposta?.result?.idToken
    if (!token) return { ok: false, errore: 'Google non ha risposto. Riprova.' }
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
    return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true, nativo: true }
  } catch (e) {
    // Chiusa la scelta dell'account: non e' un errore da dire.
    if (e?.code === 'USER_CANCELLED' || /cancel/i.test(e?.message || '')) {
      return { ok: false, annullato: true }
    }
    console.warn('Accesso con Google (app) non riuscito', e?.code, e?.message)
    return { ok: false, errore: 'Accesso con Google non riuscito. Riprova.' }
  }
}
