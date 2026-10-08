import { supabase } from './supabase'

// Le foto profilo degli altri, per id. Gli avatar di una schermata chiedono
// tutti insieme: le domande si raccolgono per un attimo e partono in UNA
// chiamata (`foto_profili`). La risposta resta in memoria finché l'app è aperta.
// ponytail: la foto cambiata da un amico si vede al prossimo avvio dell'app.

const cache = new Map() // id -> Promise<string>  ('' = niente foto)
let coda = new Map() // id -> resolve
let timer = null

async function scarica() {
  const lotto = coda
  coda = new Map()
  timer = null
  const { data, error } = await supabase.rpc('foto_profili', { p_ids: [...lotto.keys()] })
  if (error) console.warn('Lettura delle foto profilo fallita', error.message)
  const per = new Map((data || []).map((r) => [r.id, r.foto || '']))
  for (const [id, ok] of lotto) {
    // Rete giù: si dimentica, e la prossima volta si richiede.
    if (error) cache.delete(id)
    ok(per.get(id) || '')
  }
}

/** @returns {Promise<string>} l'indirizzo della foto, '' se non c'è */
export function fotoDi(id) {
  if (!id) return Promise.resolve('')
  if (!cache.has(id)) {
    cache.set(id, new Promise((ok) => coda.set(id, ok)))
    timer ??= setTimeout(scarica, 20)
  }
  return cache.get(id)
}

/** Dopo aver cambiato la propria: gli avatar montati dopo la vedono subito. */
export function ricordaFoto(id, foto) {
  cache.set(id, Promise.resolve(foto || ''))
}
