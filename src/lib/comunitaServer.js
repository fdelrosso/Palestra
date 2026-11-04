import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// I conti della comunità per Consigliato (migrazione 20261104220000): una riga
// per esercizio e per segnale invece di tutte le schede e gli allenamenti di
// tutti. Li usa lib/comunita.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Conteggi
 * @property {{fonte:string, nome:string, gruppo:string, gruppi:string[]|null,
 *   pianificati:number, svolti:number, utenti:number}[]} righe
 * @property {{schema:object, n:number}[]} stile   gli schemi del mio PT
 * @property {number|null} famaMioPt                quanti atleti segue
 */

/** @returns {Promise<Conteggi>} vuoti se il database non risponde. */
export async function leggiConteggi(mioPtId = null) {
  const [rc, rs, rf] = await Promise.all([
    supabase.rpc('conteggi_esercizi'),
    mioPtId ? supabase.rpc('stile_mio_pt') : { data: [] },
    mioPtId ? supabase.rpc('fama_pt', { ids: [mioPtId] }) : { data: [] },
  ])
  const errore = rc.error || rs.error || rf.error
  if (errore) console.warn('Lettura dei conti della comunità non riuscita', errore.message)
  return {
    righe: rc.data || [],
    stile: rs.data || [],
    famaMioPt: rf.data?.[0]?.atleti || null,
  }
}
