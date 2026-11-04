import { normalizzaScheda } from '../data/model'
import { supabase } from './supabase'
import { allenamentiDiUtente } from './storico'
import { visibileA } from './visibilita'

// ---------------------------------------------------------------------------
// Gli atleti del PT dal server (spec 2026-11-04-atleti-schede-generali-design.md).
// Prima AtletiPage partiva da lib/collettivo (tutto di tutti); ora il database
// dà le schede dei miei atleti, il ritmo di ognuno (`ritmo_atleti`) e, per
// uno solo, schede e allenamenti (`atleta_dati`, migrazione 20261104200000).
// ---------------------------------------------------------------------------

const piuRecentePrima = (a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0)

const visibiliAlPt = (dati) =>
  (dati || [])
    .map(normalizzaScheda)
    .filter((s) => visibileA(s, { comePt: true }))
    .sort(piuRecentePrima)

/** Righe di `schede_atleti` → Map<atletaId, Scheda[]>, dalla più recente. */
export function schedeDaRighe(righe) {
  const grezze = new Map()
  for (const r of righe || []) {
    if (!grezze.has(r.user_id)) grezze.set(r.user_id, [])
    grezze.get(r.user_id).push(r.dati)
  }
  return new Map([...grezze].map(([id, dati]) => [id, visibiliAlPt(dati)]))
}

/** → { schede: Map<atletaId, Scheda[]>, ritmo: Map<atletaId, { ultimo, ultimi7 }> } */
export async function leggiAndamentiAtleti() {
  const [rs, rr] = await Promise.all([supabase.rpc('schede_atleti'), supabase.rpc('ritmo_atleti')])
  if (rs.error || rr.error) {
    console.warn('Lettura degli atleti non riuscita', (rs.error || rr.error).message)
    return { schede: new Map(), ritmo: new Map() }
  }
  return {
    schede: schedeDaRighe(rs.data),
    ritmo: new Map((rr.data || []).map((r) => [r.user_id, { ultimo: r.ultimo, ultimi7: r.ultimi7 || 0 }])),
  }
}

/** Schede e allenamenti di un atleta (da quando lo seguo), o null se non si è potuto leggere. */
export async function leggiAtleta(atleta) {
  const { data, error } = await supabase.rpc('atleta_dati', { p_atleta: atleta.id })
  if (error) {
    console.warn('Lettura dell’atleta non riuscita', error.message)
    return null
  }
  const collettivo = {
    allenamenti: (data?.allenamenti || []).map((r) => ({
      utenteId: atleta.id,
      utenteNome: atleta.nome,
      utenteUsername: atleta.username,
      schedaId: r.scheda_id,
      relazionePt: 0,
      completamento: r.dati || {},
    })),
  }
  return {
    schede: visibiliAlPt(data?.schede),
    allenamenti: allenamentiDiUtente(atleta, { collettivo, comePt: true }),
  }
}
