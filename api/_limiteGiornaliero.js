// ---------------------------------------------------------------------------
// Quante volte al giorno: al massimo LIMITE_GIORNALIERO richieste per persona
// e per tipo a api/riscrivi ('scheda'), api/riscrivi-dieta ('dieta') e
// api/segnala ('segnalazione'). Il conto sta nel database (migrazione
// 20261117140000_limiti_giornalieri) e conta OGNI richiesta, come sia andata:
// si chiama appena prima di Mistral o dell'SMTP, col token di chi chiede.
//
// ⚠️ Il trattino basso nel nome: Vercel non ne fa una funzione a sé.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'

export const LIMITE_GIORNALIERO = 5
export const TROPPE = {
  scheda: `Hai già usato la lettura automatica ${LIMITE_GIORNALIERO} volte oggi: riprova domani`,
  dieta: `Hai già usato la lettura automatica ${LIMITE_GIORNALIERO} volte oggi: riprova domani`,
  segnalazione: `Hai già mandato ${LIMITE_GIORNALIERO} segnalazioni oggi: riprova domani`,
}

export const BLOCCATO = 'Il tuo account è bloccato: non è disponibile'

/**
 * Conta questa richiesta. null = si può andare avanti; altrimenti [status,
 * corpo] da rispondere: 429 se oggi le ha finite, 403 se l'account è bloccato,
 * 503 se il database non risponde (meglio un "riprova" che Mistral o l'SMTP
 * aperti a tutti).
 */
export async function oltreIlLimite(token, tipo) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/usa_limite`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_tipo: tipo, p_massimo: LIMITE_GIORNALIERO }),
    })
    // Account bloccato da un moderatore (migrazione 20261117170000_account_bloccato_ovunque).
    if (r.status === 403) return [403, { errore: BLOCCATO }]
    if (!r.ok) throw new Error(`usa_limite ${r.status}: ${(await r.text()).slice(0, 200)}`)
    if ((await r.json()) === true) return null
    return [429, { errore: TROPPE[tipo] }]
  } catch (e) {
    console.error('usa_limite non riuscita', e)
    return [503, { errore: 'Non disponibile adesso, riprova più tardi' }]
  }
}
