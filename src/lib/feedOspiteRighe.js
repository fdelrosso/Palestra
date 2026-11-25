import { voceStorico } from './storico'

// La riga di `feed_ospite` → un post (lib/feedOspite). Separato da Supabase
// perché i test, in Node, non caricano `lib/supabase`.
export function postOspiteDaRiga(r) {
  return {
    voce: voceStorico({ utenteId: r.user_id, utenteNome: r.nome || '', schedaId: r.scheda_id, completamento: r.dati }),
    foto: Array.isArray(r.foto) ? r.foto : [],
    interazioni: { miPiace: Number(r.mi_piace) || 0, mio: false, commenti: Number(r.commenti) || 0, ultimo: null },
  }
}
