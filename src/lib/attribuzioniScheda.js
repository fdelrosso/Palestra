import { erroreDiRete, messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// "Questa scheda è del mio PT": l'atleta collega una sua scheda (scritta da sé,
// incollata, di prima) al PT di adesso; il PT conferma o no da Lavoro. Se
// conferma, la scheda prende `daPt = { id, nome }` come quelle nate da una
// proposta (lib/proposteScheda). Le regole stanno nel database
// (`schede_attribuite`, `attribuisci_scheda`, `rispondi_attribuzione`,
// `annulla_attribuzione` in schema.sql).
//
// Stati: 'attesa' · 'accettata' · 'rifiutata' · 'annullata' (dall'atleta).
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/non hai un pt/i.test(m)) return 'Non hai un PT a cui collegarla.'
  if (/scheda non trovata/i.test(m)) return 'La scheda non è ancora arrivata sul server: riprova fra poco.'
  if (/già collegata/i.test(m)) return 'È già collegata al tuo PT.'
  if (/non è un tuo atleta/i.test(m)) return 'Non lo segui più.'
  if (/nessuna richiesta/i.test(m)) return 'È già stata decisa: ricarica.'
  if (/schede_attribuite|attribuisci_scheda|rispondi_attribuzione|annulla_attribuzione/i.test(m))
    return 'Il database non è ancora aggiornato per collegare le schede al PT.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

const daRiga = (r) => ({
  id: r.id,
  atletaId: r.atleta_id,
  ptId: r.pt_id,
  schedaId: r.scheda_id,
  nome: r.nome,
  dati: r.dati || null,
  stato: r.stato,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
})

/** L'atleta chiede di collegare la scheda al suo PT. → { ok, id?, errore } */
export async function attribuisciScheda(schedaId) {
  const { data, error } = await supabase.rpc('attribuisci_scheda', { p_scheda: schedaId })
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/** L'atleta ritira la richiesta ancora aperta. */
export async function annullaAttribuzione(id) {
  const { error } = await supabase.rpc('annulla_attribuzione', { p_id: id })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** Il PT conferma (o no) che la scheda è sua. */
export async function rispondiAttribuzione(id, accetto) {
  const { error } = await supabase.rpc('rispondi_attribuzione', { p_id: id, p_accetto: accetto })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** Le mie richieste da atleta (senza la copia della scheda), dalla più recente. */
export async function mieAttribuzioni(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('schede_attribuite')
    .select('id, atleta_id, pt_id, scheda_id, nome, stato, creata_il, risposta_il')
    .eq('atleta_id', ioId)
    .order('creata_il', { ascending: false })
    .limit(100)
  if (error) {
    console.warn('Lettura delle schede collegate al PT non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/** Le richieste in attesa per me, PT (con la copia della scheda). */
export async function attribuzioniDaDecidere(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('schede_attribuite')
    .select('*')
    .eq('pt_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: false })
  if (error) {
    console.warn('Lettura delle schede da confermare non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}
