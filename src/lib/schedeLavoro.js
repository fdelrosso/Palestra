import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { normalizzaScheda } from '../data/model'

// ---------------------------------------------------------------------------
// Le schede di lavoro di un PT: quelle che scrive per i suoi atleti e non ha
// ancora mandato (tabella `schede_lavoro`, schema.sql). Separate dalle sue
// schede personali (store/StoreContext), con cui si allena. Mandata a un
// atleta, la scheda di lavoro si toglie: da lì è fra le inviate
// (lib/proposteScheda).
//
// Solo in rete, senza copia sul telefono: è roba da scrivania, e una copia
// locale vorrebbe dire rifare la sincronizzazione dello store per un elenco
// che si apre di rado.
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/schede_lavoro/i.test(m)) return 'Il database non è ancora aggiornato per le schede di lavoro.'
  if (/row-level security/i.test(m)) return 'Le schede di lavoro sono per gli account PT.'
  return erroreDiRete(error) ? 'Senza rete non si salva: riprova.' : messaggioErrore(error)
}

/** Le mie schede di lavoro, dalla più recente. → { ok, schede, errore } */
export async function leggiSchedeLavoro(ioId) {
  if (!ioId) return { ok: true, schede: [], errore: '' }
  const { data, error } = await supabase
    .from('schede_lavoro')
    .select('id, dati, aggiornata_il')
    .eq('user_id', ioId)
    .order('aggiornata_il', { ascending: false })
  if (error) return { ok: false, schede: [], errore: errore(error) }
  return { ok: true, schede: (data || []).map((r) => normalizzaScheda({ ...r.dati, id: r.id })), errore: '' }
}

/** Una scheda di lavoro, o null. */
export async function leggiSchedaLavoro(id) {
  const { data, error } = await supabase.from('schede_lavoro').select('id, dati').eq('id', id).maybeSingle()
  if (error || !data) return null
  return normalizzaScheda({ ...data.dati, id: data.id })
}

/** Salva (nuova o modificata). → { ok, errore } */
export async function salvaSchedaLavoro(ioId, scheda) {
  const { completamenti: _c, attiva: _a, archiviata: _ar, ...dati } = scheda
  const nome = (scheda.nome || '').trim() || 'Scheda senza nome'
  const { error } = await supabase.from('schede_lavoro').upsert(
    {
      id: scheda.id,
      user_id: ioId,
      nome,
      dati: { ...dati, nome, settimanaCorrente: 1, libera: false },
      aggiornata_il: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** Toglie una scheda di lavoro (anche dopo averla mandata). */
export async function eliminaSchedaLavoro(id) {
  const { error } = await supabase.from('schede_lavoro').delete().eq('id', id)
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}
