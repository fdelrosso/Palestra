import { supabase } from './supabase'
import { postOspiteDaRiga } from './feedOspiteRighe'

// Il feed di chi non ha un account (pages/FeedOspite): `feed_ospite` in
// supabase/migrations/20261125120000_feed_ospite.sql.

export const PAGINA_OSPITE = 20

export async function leggiFeedOspite(dopo = null) {
  const { data, error } = await supabase.rpc('feed_ospite', {
    p_prima_di: dopo?.data ?? null,
    p_prima_di_id: dopo?.id ?? null,
    p_quanti: PAGINA_OSPITE,
  })
  if (error) {
    console.warn('Lettura del feed ospite fallita', error.message)
    return { ok: false, post: [], ancora: false, dopo }
  }
  const righe = data || []
  const ultima = righe.at(-1)
  return {
    ok: true,
    post: righe.map(postOspiteDaRiga),
    ancora: righe.length === PAGINA_OSPITE,
    dopo: ultima ? { data: ultima.data, id: ultima.id } : dopo,
  }
}
