import { normalizzaScheda } from '../data/model'
import { voceSchedaGenerale } from './schedeGenerali'
import { supabase, messaggioErrore } from './supabase'

// ---------------------------------------------------------------------------
// Le Schede generali A PAGINE (spec 2026-11-04-atleti-schede-generali-design.md).
// Il server (`schede_pubbliche`, migrazione 20261104200000) filtra per
// amici/tutti, allenamenti a settimana, durata ed esercizio, e dà 20 schede
// alla volta nell'ordine di sempre (prima quelle del mio PT, poi le più
// recenti). Le voci sono quelle di `schedeGenerali`, ma la scheda dentro è in
// breve (`scheda_leggera`: nomi e giorni, ~1 KB invece di ~9): quella intera la
// dà `leggiSchedaIntera` quando si apre.
// ---------------------------------------------------------------------------

export const PAGINA = 20

/** Righe del server + nomi → le voci, nell'ordine del server. */
export function vociDaRigheSchede(righe, nomi) {
  return (righe || []).map((r) =>
    voceSchedaGenerale({
      utenteId: r.user_id,
      utenteNome: nomi.get(r.user_id) || '',
      autoreEPt: !!r.autore_pt,
      relazionePt: r.relazione_pt || 0,
      scheda: normalizzaScheda(r.dati),
    }),
  )
}

/** Una pagina. `dopo` = { rel, il, id } dell'ultima scheda già letta. */
export async function leggiPaginaSchede({ chi, giorni, settimane, q, dopo = null }) {
  const { data, error } = await supabase.rpc('schede_pubbliche', {
    p_chi: chi,
    p_giorni: giorni ? Number(giorni) : null,
    p_settimane: settimane ? Number(settimane) : null,
    p_q: q?.trim() || null,
    p_dopo_rel: dopo?.rel ?? null,
    p_dopo_il: dopo?.il ?? null,
    p_dopo_id: dopo?.id ?? null,
    p_quanti: PAGINA,
  })
  if (error) {
    console.warn('Lettura delle schede fallita', error.message)
    return { ok: false, errore: messaggioErrore(error), voci: [], ancora: false, dopo: null }
  }
  const righe = data || []
  const ids = [...new Set(righe.map((r) => r.user_id))]
  const nomi = new Map()
  if (ids.length) {
    const rn = await supabase.rpc('nomi_di', { ids })
    for (const r of rn.data || []) nomi.set(r.id, r.nome)
  }
  const ultima = righe.at(-1)
  return {
    ok: true,
    errore: '',
    voci: vociDaRigheSchede(righe, nomi),
    ancora: righe.length === PAGINA,
    dopo: ultima ? { rel: ultima.relazione_pt, il: ultima.creata_il, id: ultima.id } : null,
  }
}

/** I valori scelti nei due filtri (allenamenti a settimana, durata) per la sezione. */
export async function leggiFiltriSchede(chi) {
  const { data, error } = await supabase.rpc('filtri_schede_pubbliche', { p_chi: chi })
  if (error) {
    console.warn('Lettura dei filtri non riuscita', error.message)
    return { giorni: [], settimane: [] }
  }
  const r = (Array.isArray(data) ? data[0] : data) || {}
  return { giorni: r.giorni || [], settimane: r.settimane || [] }
}

/** La scheda intera di una card, per il dettaglio; null se non si è potuta leggere. */
export async function leggiSchedaIntera(id) {
  const { data, error } = await supabase.rpc('scheda_comunita_intera', { p_id: id })
  if (error || !data) {
    if (error) console.warn('Lettura della scheda non riuscita', error.message)
    return null
  }
  return normalizzaScheda(data)
}
