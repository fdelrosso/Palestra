import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { dietaPerIlViaggio } from './dietaDalPt'

// ---------------------------------------------------------------------------
// La dieta dal PT: come la scheda dal PT (lib/proposteScheda), ma per la
// dieta. Il PT la manda a un suo atleta come PROPOSTA (un piano coi pasti, o
// solo i macro: lib/dietaDalPt), l'atleta la salva fra le sue diete o la
// rifiuta. Le regole stanno nel database (`diete_proposte`, `proponi_dieta`,
// `rispondi_proposta_dieta`, `ritira_proposta_dieta` in schema.sql): qui le
// porte, con gli errori in italiano.
//
// Stati: 'attesa' · 'accettata' · 'rifiutata' · 'ritirata' (dal PT).
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/non è un tuo atleta/i.test(m)) return 'Non lo segui più: la dieta non parte.'
  if (/troppo grande/i.test(m)) return 'La dieta è troppo grande per essere mandata.'
  if (/nessuna proposta/i.test(m)) return 'È già stata decisa: ricarica.'
  if (/diete_proposte|proponi_dieta|rispondi_proposta_dieta|ritira_proposta_dieta/i.test(m))
    return 'Il database non è ancora aggiornato per le diete dal PT.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

/** Il PT manda la dieta all'atleta. → { ok, id?, errore } */
export async function proponiDieta(atletaId, dieta, modo, nota = '') {
  const { data, error } = await supabase.rpc('proponi_dieta', {
    p_atleta: atletaId,
    p_dati: dietaPerIlViaggio(dieta, modo),
    p_modo: modo,
    p_nota: nota.trim(),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/** Il PT ritira una proposta ancora in attesa. */
export async function ritiraPropostaDieta(id) {
  const { error } = await supabase.rpc('ritira_proposta_dieta', { p_id: id })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** L'atleta risponde. Con `accetto` la copia fra le diete la fa chi chiama (dietaDaProposta). */
export async function rispondiPropostaDieta(id, accetto) {
  const { error } = await supabase.rpc('rispondi_proposta_dieta', { p_id: id, p_accetto: accetto })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

const daRiga = (r) => ({
  id: r.id,
  ptId: r.pt_id,
  atletaId: r.atleta_id,
  nome: r.nome,
  modo: r.modo,
  nota: r.nota || '',
  dati: r.dati || null,
  stato: r.stato,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
})

/** Le diete in attesa per me, atleta (con la dieta dentro). */
export async function proposteDietaInArrivo(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('diete_proposte')
    .select('*')
    .eq('atleta_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: false })
  // ⚠️ Senza la tabella (schema.sql non ancora lanciato) non si dice niente:
  // semplicemente non arriva nessuna dieta.
  if (error) return []
  return (data || []).map(daRiga)
}

/** Le diete che ho mandato, io PT (senza la dieta dentro). */
export async function proposteDietaMandate(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('diete_proposte')
    .select('id, pt_id, atleta_id, nome, modo, nota, stato, creata_il, risposta_il')
    .eq('pt_id', ioId)
    .order('creata_il', { ascending: false })
    .limit(200)
  if (error) return []
  return (data || []).map(daRiga)
}
