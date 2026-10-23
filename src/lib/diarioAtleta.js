import { supabase } from './supabase'
import { giorniDaRighe } from './diario'

// ---------------------------------------------------------------------------
// Il diario di un atleta, visto dal suo PT (components/DiarioAtleta).
//
// Si leggono solo le giornate che l'atleta non ha reso private: il filtro lo
// fa il DATABASE (supabase/schema.sql, "IL DIARIO VISTO DAL PT"), non l'app.
// Una giornata privata qui semplicemente non arriva, come una vuota.
// ---------------------------------------------------------------------------

/**
 * I giorni fra `da` e `a` ('YYYY-MM-DD', compresi).
 * @returns {Promise<object[]|null>} null = non si è potuto leggere.
 */
export async function diarioDellAtleta(atletaId, da, a) {
  if (!atletaId) return null
  const { data, error } = await supabase
    .from('diario')
    .select('id, dati')
    .eq('user_id', atletaId)
    .gte('dati->>data', da)
    .lte('dati->>data', a)
  if (error) {
    console.warn('Lettura del diario dell’atleta fallita', error.message)
    return null
  }
  return giorniDaRighe(data)
}
