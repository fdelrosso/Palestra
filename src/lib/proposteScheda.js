import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { normalizzaScheda } from '../data/model'

// ---------------------------------------------------------------------------
// La scheda dal PT: il PT la scrive nell'app e la manda a un suo atleta come
// PROPOSTA; l'atleta la salva fra le sue schede (non attiva) o la rifiuta.
// Le regole stanno nel database (`schede_proposte`, `proponi_scheda`,
// `rispondi_proposta`, `ritira_proposta` in schema.sql): qui le porte, con gli
// errori in italiano, e la copia della scheda per l'atleta.
//
// Stati: 'attesa' · 'accettata' · 'rifiutata' · 'ritirata' (dal PT).
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/non è un tuo atleta/i.test(m)) return 'Non lo segui più: la scheda non parte.'
  if (/troppo grande/i.test(m)) return 'La scheda è troppo grande per essere mandata.'
  if (/nessuna proposta/i.test(m)) return 'È già stata decisa: ricarica.'
  if (/schede_proposte|proponi_scheda|rispondi_proposta|ritira_proposta/i.test(m))
    return 'Il database non è ancora aggiornato per le schede dal PT.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

// Quello che viaggia: la scheda come la scriverebbe l'atleta, ma pulita da
// tutto ciò che è del PT (completamenti, settimana, attiva, archivio).
function perIlViaggio(scheda) {
  const {
    completamenti: _c,
    attiva: _a,
    archiviata: _ar,
    archiviataIl: _ai,
    visibilita: _v,
    ...resto
  } = scheda
  return { ...resto, nome: (scheda.nome || '').trim() || 'Scheda senza nome', settimanaCorrente: 1, libera: false }
}

/** Il PT manda la scheda all'atleta. → { ok, id?, errore } */
export async function proponiScheda(atletaId, scheda, nota = '') {
  const { data, error } = await supabase.rpc('proponi_scheda', {
    p_atleta: atletaId,
    p_dati: perIlViaggio(scheda),
    p_nota: nota.trim(),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/** Il PT ritira una proposta ancora in attesa. */
export async function ritiraProposta(id) {
  const { error } = await supabase.rpc('ritira_proposta', { p_id: id })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** L'atleta risponde. Con `accetto` la copia fra le schede la fa chi chiama (schedaDaProposta). */
export async function rispondiProposta(id, accetto) {
  const { error } = await supabase.rpc('rispondi_proposta', { p_id: id, p_accetto: accetto })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

const daRiga = (r) => ({
  id: r.id,
  ptId: r.pt_id,
  atletaId: r.atleta_id,
  nome: r.nome,
  nota: r.nota || '',
  dati: r.dati || null,
  stato: r.stato,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
})

/** Le proposte in attesa per me, atleta (con la scheda dentro). */
export async function proposteInArrivo(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('*')
    .eq('atleta_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: false })
  if (error) {
    console.warn('Lettura delle schede dal PT non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/** Le proposte che ho mandato io, PT (senza la scheda: per gli elenchi). */
export async function proposteMandate(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('id, pt_id, atleta_id, nome, nota, stato, creata_il, risposta_il')
    .eq('pt_id', ioId)
    .order('creata_il', { ascending: false })
    .limit(200)
  if (error) {
    console.warn('Lettura delle schede mandate non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/**
 * La scheda da salvare fra quelle dell'atleta. L'id è quello della proposta
 * (prefisso `pt-`): accettarla due volte, da due telefoni, non la duplica.
 * Nasce "solo al PT": chi l'ha scritta deve poter vedere come va.
 */
export function schedaDaProposta(proposta, nomePt = '') {
  return normalizzaScheda({
    ...proposta.dati,
    id: 'pt-' + proposta.id,
    completamenti: [],
    settimanaCorrente: 1,
    libera: false,
    attiva: false,
    visibilita: 'solo-pt',
    creataIl: new Date().toISOString(),
    daPt: { id: proposta.ptId, nome: nomePt, propostaId: proposta.id },
  })
}

// La bozza di una scheda per un atleta fra una pagina e l'altra (Incolla
// testo, o "parti da una tua scheda" → editor). In sessionStorage: regge un
// ricaricamento, non sopravvive alla chiusura.
const CHIAVE_BOZZA = 'palestra:bozza-per-atleta'
// Al posto dell'atleta: la bozza va fra le schede di lavoro (SchedaLavoroPage).
export const BOZZA_LAVORO = '__lavoro'

// `daLavoroId`: la scheda di lavoro da cui parte (lib/schedeLavoro). Mandata
// la proposta, quella si toglie: da lì in poi è fra le inviate.
export function salvaBozzaPerAtleta(atletaId, scheda, daLavoroId = null) {
  try {
    sessionStorage.setItem(CHIAVE_BOZZA, JSON.stringify({ atletaId, scheda, daLavoroId }))
  } catch {
    /* senza sessionStorage si riparte da zero */
  }
}

export function prendiBozzaPerAtleta(atletaId) {
  try {
    // Non si cancella leggendo: in sviluppo React chiama due volte chi
    // prepara lo stato iniziale. La sovrascrive chi porta all'editor
    // (anche con null, per "da zero").
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.scheda : null
  } catch {
    return null
  }
}

/** La scheda di lavoro da cui parte la bozza di questo atleta, o null. */
export function lavoroDellaBozza(atletaId) {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.daLavoroId || null : null
  } catch {
    return null
  }
}

/** Una proposta mandata da me, con la scheda dentro (per riguardarla o rimandarla). */
export async function propostaCompleta(id) {
  const { data, error } = await supabase.from('schede_proposte').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return daRiga(data)
}
