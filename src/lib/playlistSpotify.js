// Una playlist (o un album) di Spotify da collegare all'allenamento
// (api/spotify): a parte da lib/ascolti perché serve la sessione di Supabase,
// che i test di Node non hanno.

import { normalizzaSpotify } from './musica'
import { supabase } from './supabase'

/**
 * Come mostrarla: { tipo, id, nome, copertina, colore, brani }. Lancia un
 * Error col messaggio da mostrare.
 */
export async function daSpotify(link) {
  const { data } = await supabase.auth.getSession()
  let r
  try {
    r = await fetch(`/api/spotify?link=${encodeURIComponent(link)}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
    })
  } catch {
    throw new Error('Senza rete non riesco a leggerla.')
  }
  const corpo = await r.json().catch(() => ({}))
  const spotify = r.ok ? normalizzaSpotify(corpo) : null
  if (!spotify) throw new Error(corpo.errore || 'Non riesco a leggere questa playlist.')
  return spotify
}
