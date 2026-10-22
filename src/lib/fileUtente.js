// ---------------------------------------------------------------------------
// Tutti i file di un utente nello Storage, da togliere PRIMA di eliminare
// l'account (AccountContext → eliminaUtente).
//
// ⚠️ Cancellare l'utente da `auth.users` porta via le righe a cascata, ma i
// FILE NO: Supabase non li lega all'account, e dal SQL non si cancellano (vedi
// la nota su `pulisci_effimeri_scaduti` in schema.sql). Resterebbero foto dei
// progressi, video e foto profilo di un account che non c'e' piu' — e
// l'Informativa (punto 7) promette che se ne vanno subito.
//
// ⚠️ E L'ORDINE E' OBBLIGATO: prima i file, poi l'account. Le regole che
// permettono di cancellarli guardano `auth.uid()` (e per `effimeri` la riga
// nella tabella): a account eliminato, quei file non li toglie piu' nessuno.
//
// Ogni bucket tiene i file di un utente in `<user_id>/<file>`, senza
// sottocartelle. `remove` vuole anche la lettura: per `feed`, `avatar`,
// `media` ed `effimeri` la da' una regola "leggo la mia cartella" in schema.sql.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

export const BUCKET_UTENTE = [
  'media',
  'progressi',
  'allenamenti',
  'feed',
  'commenti',
  'effimeri',
  'avatar',
]

const PAGINA = 1000

/** Toglie i file dell'utente da tutti i bucket. { ok } oppure { ok:false, errore }. */
export async function eliminaFileUtente(userId) {
  for (const bucket of BUCKET_UTENTE) {
    const archivio = supabase.storage.from(bucket)
    // Si rilegge sempre la prima pagina: quello che si cancella non c'e' piu'.
    for (;;) {
      const { data: elenco, error } = await archivio.list(userId, { limit: PAGINA })
      if (error) return { ok: false, errore: error.message }
      if (!elenco?.length) break
      const percorsi = elenco.map((f) => `${userId}/${f.name}`)
      const { data: tolti, error: errTogli } = await archivio.remove(percorsi)
      if (errTogli) return { ok: false, errore: errTogli.message }
      // Elencati ma non tolti: una regola dice di no. Meglio fermarsi che girare
      // all'infinito, o eliminare l'account lasciandoli li'.
      if (!tolti?.length) return { ok: false, errore: `Non riesco a cancellare i file in ${bucket}.` }
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// I file RIMASTI SENZA RIGA in `media` ed `effimeri`, da togliere a ogni
// accesso (AccountContext, accanto a `pulisciScaduti`).
//
// Su quei due bucket chi puo' scaricare un file lo dice la sua riga in tabella.
// Se la riga se ne va e il file no (una `remove` fallita in `eliminaMedia`, o
// gli invii scaduti mai aperti, che fino alla 93ª restavano), il file non lo vede piu'
// nessuno ma resta, e occupa spazio. Da quando chi carica legge e cancella la
// propria cartella (schema.sql), li puo' trovare e togliere lui.
//
// ⚠️ SOLO QUELLI VECCHI DI UN GIORNO. Il file si carica PRIMA della riga, e
// in palestra senza rete la riga di un media puo' arrivare molto dopo: un file
// appena caricato senza riga e' normale, non un avanzo.
// ---------------------------------------------------------------------------

const ORFANI = [
  { bucket: 'media', tabella: 'media', colonna: 'user_id' },
  { bucket: 'effimeri', tabella: 'effimeri', colonna: 'da_id' },
]

const UN_GIORNO = 24 * 60 * 60 * 1000
// Percorsi per richiesta: stanno nell'indirizzo, che non puo' essere lungo.
const GRUPPO = 100

/** Quanti file senza riga ha tolto. Se qualcosa non va, 0 e si riprova al prossimo accesso. */
export async function eliminaOrfani(userId, ora = Date.now()) {
  let quanti = 0
  for (const { bucket, tabella, colonna } of ORFANI) {
    const archivio = supabase.storage.from(bucket)
    const file = []
    for (let offset = 0; ; offset += PAGINA) {
      const { data, error } = await archivio.list(userId, { limit: PAGINA, offset })
      if (error) return quanti
      file.push(...(data || []))
      if (!data || data.length < PAGINA) break
    }
    const vecchi = file
      .filter((f) => ora - new Date(f.created_at).getTime() > UN_GIORNO)
      .map((f) => `${userId}/${f.name}`)
    // ⚠️ Le righe si chiedono per QUESTI percorsi, a gruppi, e non tutte
    // insieme: il server ne da' al massimo 1000 per volta, e una riga che non
    // arriva farebbe sembrare avanzo un file vivo.
    for (let i = 0; i < vecchi.length; i += GRUPPO) {
      const gruppo = vecchi.slice(i, i + GRUPPO)
      const { data: righe, error } = await supabase
        .from(tabella)
        .select('percorso')
        .eq(colonna, userId)
        .in('percorso', gruppo)
      if (error) return quanti
      const vivi = new Set((righe || []).map((r) => r.percorso))
      const orfani = gruppo.filter((p) => !vivi.has(p))
      if (!orfani.length) continue
      const { data: tolti, error: e } = await archivio.remove(orfani)
      if (e) return quanti
      quanti += tolti?.length || 0
    }
  }
  return quanti
}
