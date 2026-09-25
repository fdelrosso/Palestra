// ---------------------------------------------------------------------------
// hooks/useCollettivo FINTO, per i banchi di prova: gli allenamenti "di tutti"
// li mette il banco con impostaCollettivo(), invece di chiederli al database.
// ---------------------------------------------------------------------------
let dati = { schede: [], allenamenti: [], fama: new Map() }

export function impostaCollettivo(allenamenti) {
  dati = { schede: [], allenamenti, fama: new Map() }
}

export default function useCollettivo() {
  return { dati, caricando: false, errore: '' }
}
