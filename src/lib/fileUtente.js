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
// sottocartelle. `remove` vuole anche la lettura: per `feed` e `avatar` la da'
// la regola "feed e avatar: leggo la mia cartella" in schema.sql.
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
