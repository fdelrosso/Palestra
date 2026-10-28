import { erroreDiRete, messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// "Contatta il PT": un atleta scrive a un personal trainer dalla sua pagina,
// il PT prende l'incarico o no, l'atleta conferma. Le regole stanno nel
// database (`contatta_pt`, `rispondi_contatto`, `conferma_pt` e la tabella
// `contatti_pt` in schema.sql): qui ci sono solo le porte, con gli errori già
// in italiano.
//
// Stati: 'attesa' (aspetta il PT) · 'proposta' (il PT ha detto sì, aspetta
// l'atleta) · 'rifiutato' (il PT ha detto no) · 'accettato' · 'declinato'
// (l'atleta ha detto no). La chat resta aperta in tutti.
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/ti segue già/i.test(m)) return 'Ti segue già.'
  if (/solo un atleta/i.test(m)) return 'Un PT non contatta altri PT da qui.'
  if (/non è un personal trainer/i.test(m)) return 'Questa persona non è un personal trainer.'
  if (/nessun contatto|nessuna proposta/i.test(m)) return 'È già stato deciso: ricarica la chat.'
  if (/non contattabile/i.test(m)) return 'Questa persona non si può contattare: ha già un PT, o non vuole essere contattata.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

/** L'atleta contatta un PT. → { ok, stato?, errore } */
export async function contattaPt(ptId) {
  const { data, error } = await supabase.rpc('contatta_pt', { p_pt: ptId })
  return error ? { ok: false, errore: errore(error) } : { ok: true, stato: data, errore: '' }
}

/** Il PT risponde: `prendo` true = "Prendo l'incarico". */
export async function rispondiContatto(atletaId, prendo) {
  const { error } = await supabase.rpc('rispondi_contatto', { p_atleta: atletaId, p_prendo: prendo })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** L'atleta conferma (o no) il PT che ha preso l'incarico. */
export async function confermaContatto(ptId, si) {
  const { error } = await supabase.rpc('conferma_pt', { p_pt: ptId, p_si: si })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/**
 * Il contatto fra me e questa persona, in uno dei due versi, o null.
 * @returns {Promise<{atletaId:string, ptId:string, stato:string}|null>}
 */
export async function contattoCon(ioId, altroId) {
  if (!ioId || !altroId) return null
  const { data, error } = await supabase
    .from('contatti_pt')
    .select('atleta_id, pt_id, stato, da_pt')
    .or(`and(atleta_id.eq.${ioId},pt_id.eq.${altroId}),and(atleta_id.eq.${altroId},pt_id.eq.${ioId})`)
    .maybeSingle()
  if (error || !data) return null
  return { atletaId: data.atleta_id, ptId: data.pt_id, stato: data.stato, daPt: !!data.da_pt }
}

// ---------------------------------------------------------------------------
// Al contrario (2026-10-28): un PT contatta chi ha visto nel feed, se non ha
// un PT e ha scelto di farsi contattare (`profili.contattabile_da_pt`). Il
// contatto nasce già come 'proposta': l'atleta conferma dalla chat, con
// `confermaContatto`, come sempre. Migrazione 20261028160000.
// ---------------------------------------------------------------------------

/** Posso, da PT, contattare questa persona? */
export async function possoContattareAtleta(atletaId) {
  if (!atletaId) return false
  const { data, error } = await supabase.rpc('posso_contattare_atleta', { p_atleta: atletaId })
  return !error && data === true
}

/** Il PT si propone all'atleta. → { ok, stato?, errore } */
export async function contattaAtleta(atletaId) {
  const { data, error } = await supabase.rpc('contatta_atleta', { p_atleta: atletaId })
  return error ? { ok: false, errore: errore(error) } : { ok: true, stato: data, errore: '' }
}
/**
 * Nel feed, per un PT: fra queste persone, chi si è messo in mostra (un Set di
 * id). Per chi non è un PT il database risponde vuoto.
 */
export async function contattabiliFra(ids) {
  const unici = [...new Set((ids || []).filter(Boolean))]
  if (!unici.length) return new Set()
  const { data, error } = await supabase.rpc('contattabili_fra', { p_ids: unici })
  if (error) return new Set()
  return new Set((data || []).map((r) => (typeof r === 'string' ? r : r.contattabili_fra)))
}