// ---------------------------------------------------------------------------
// Il conto delle letture con l'AI (api/riscrivi, api/riscrivi-dieta): al
// massimo LIMITE_AI_GIORNO letture RIUSCITE al giorno per persona e per tipo.
// Il conto sta nel database (migrazione 20261117140000_uso_ai): prima si
// prenota un posto, poi lo si chiude — 'fatta' solo se Mistral ha risposto.
// Si chiama col token di chi chiede: le funzioni guardano `auth.uid()`.
//
// ⚠️ Il trattino basso nel nome: Vercel non ne fa una funzione a sé.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmnsdyutsjrxcvjvwvog.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_Ln5mBTGNJFSAuUt-8VI8_A_-scDBjfU'

export const LIMITE_AI_GIORNO = 5
export const TROPPE_LETTURE = `Hai già usato la lettura automatica ${LIMITE_AI_GIORNO} volte oggi: riprova domani`

async function rpc(token, nome, argomenti) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(argomenti),
  })
  if (!r.ok) throw new Error(`${nome} ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const testo = await r.text()
  return testo ? JSON.parse(testo) : null
}

/** L'id del posto prenotato, o null se oggi le ha finite. Lancia se il database non risponde. */
export function prenotaAi(token, tipo) {
  return rpc(token, 'prenota_ai', { p_tipo: tipo, p_massimo: LIMITE_AI_GIORNO })
}

/** Chiude il posto: `fatta` = Mistral ha dato la lettura intera. Un errore qui non ferma la risposta. */
export async function chiudiAi(token, id, fatta) {
  try {
    await rpc(token, 'chiudi_ai', { p_id: id, p_fatta: fatta })
  } catch (e) {
    console.error('chiudi_ai non riuscita', e)
  }
}

/**
 * Fa girare `leggi` (che torna [status, corpo]) dentro un posto prenotato e
 * risponde. Il posto si chiude PRIMA di rispondere: dopo, Vercel può fermare
 * la funzione.
 */
export async function conLaQuota(res, token, tipo, leggi) {
  let id
  try {
    id = await prenotaAi(token, tipo)
  } catch (e) {
    // Senza conto non si legge: meglio un "riprova" che Mistral aperto a tutti.
    console.error('prenota_ai non riuscita', e)
    return res.status(503).json({ errore: 'Lettura non disponibile, riprova più tardi' })
  }
  if (!id) return res.status(429).json({ errore: TROPPE_LETTURE })
  const [status, corpo] = await leggi()
  await chiudiAi(token, id, status === 200)
  return res.status(status).json(corpo)
}
