// ---------------------------------------------------------------------------
// La sessione salvata sul telefono, letta senza passare dalla rete.
//
// ⚠️ supabase.auth.getSession() a token scaduto (dura un'ora, quindi quasi a
// ogni apertura) prima lo rinnova: con la rete che si pianta non risponde mai, e
// con la rete assente risponde dopo 26 secondi "nessuna sessione". Per sapere
// chi sei basta quello che c'e' qui: e' il server a decidere che cosa puoi
// leggere, e se la sessione non vale piu' e' Supabase a cancellarla.
// ---------------------------------------------------------------------------

export function sessioneDaTesto(testo) {
  try {
    const s = JSON.parse(testo)
    return s?.access_token && s.refresh_token && s.user?.id ? s : null
  } catch {
    return null
  }
}
