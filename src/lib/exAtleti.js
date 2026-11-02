import { normalizzaScheda } from '../data/model'
import { messaggioErrore, supabase } from './supabase'
import { allenamentiDiUtente } from './storico'
import { giorniDaRighe } from './diario'

// ---------------------------------------------------------------------------
// Gli ex atleti del PT (2026-11-02, pages/AtletiPage, linguetta Ex atleti).
// Quello che ha fatto un atleta nel periodo in cui lo si seguiva: il filtro sul
// periodo lo fa il database (migrazione 20261102160000_ex_atleti).
// ---------------------------------------------------------------------------

/** → [{ id, nome, username, dal, al }], dal legame finito più di recente. */
export async function leggiExAtleti() {
  const { data, error } = await supabase.rpc('ex_atleti_miei')
  if (error) {
    console.warn('Lettura degli ex atleti non riuscita', error.message)
    return []
  }
  return (data || []).map((r) => ({
    id: r.atleta_id,
    nome: r.nome || '',
    username: r.username || '',
    dal: r.dal,
    al: r.al,
  }))
}

/**
 * Schede, allenamenti e diario di un ex atleta.
 * → { schede, allenamenti, diario: giorni } o null se non si è potuto leggere.
 */
export async function leggiExAtleta(atleta) {
  const { data, error } = await supabase.rpc('ex_atleta_dati', { p_atleta: atleta.id })
  if (error) {
    console.warn('Lettura dell’ex atleta non riuscita', error.message)
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
    schede: (data?.schede || [])
      .map(normalizzaScheda)
      .sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0)),
    allenamenti: allenamentiDiUtente(atleta, { collettivo, comePt: true }),
    diario: giorniDaRighe(data?.diario),
  }
}

/** Via dalla lista del PT: i dati dell'atleta non si toccano. */
export async function togliExAtleta(atletaId) {
  const { error } = await supabase.rpc('togli_ex_atleta', { p_atleta: atletaId })
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
}
