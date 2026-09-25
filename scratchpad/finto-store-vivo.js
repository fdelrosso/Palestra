// ---------------------------------------------------------------------------
// Store e account FINTI ma vivi, per i banchi di prova che si toccano con le
// dita in un browser (scratchpad/prova-superserie). Stessi nomi esportati di
// store/StoreContext e store/AccountContext: la sostituzione la fa l'alias in
// scratchpad/vite.prova.config.js, il codice delle pagine non lo sa.
//
// "Vivo" vuol dire che aggiornaSessione e aggiornaScheda cambiano davvero lo
// stato e le pagine si ridisegnano (useSyncExternalStore): è quello che serve
// per provare un giro di superserie, non solo per guardarlo. Niente rete,
// niente localStorage: si ricarica la pagina e si riparte da capo.
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from 'react'
import { normalizzaScheda } from '../src/data/model.js'
import { creaSessione, riepilogoSessione } from '../src/lib/session.js'

let stato = { schede: [], sessione: null }
const ascoltatori = new Set()

function cambia(patch) {
  stato = { ...stato, ...patch }
  ascoltatori.forEach((f) => f())
}

export function impostaFinto(patch) {
  cambia(patch)
}

function useStato() {
  return useSyncExternalStore(
    (f) => {
      ascoltatori.add(f)
      return () => ascoltatori.delete(f)
    },
    () => stato,
  )
}

const niente = () => {}

export function useStore() {
  const s = useStato()
  return {
    schede: s.schede,
    diete: [],
    sessione: s.sessione,
    getScheda: (id) => stato.schede.find((x) => x.id === id) || null,
    aggiornaScheda: (scheda) => {
      const n = normalizzaScheda(scheda)
      cambia({ schede: stato.schede.map((x) => (x.id === n.id ? n : x)) })
      return n
    },
    iniziaSessione: (scheda, giorno, settimana) => {
      const nuova = creaSessione(scheda, giorno, settimana)
      cambia({ sessione: nuova })
      return nuova
    },
    aggiornaSessione: (x) =>
      cambia({ sessione: typeof x === 'function' ? x(stato.sessione) : x }),
    terminaSessione: () => {
      const r = riepilogoSessione(stato.sessione)
      cambia({ sessione: null })
      return r
    },
    annullaSessione: () => cambia({ sessione: null }),
    aggiornaCompletamento: niente,
    eliminaCompletamento: niente,
    salvaAllenamento: niente,
    aggiornaGiorno: niente,
    aggiornaSchemaEsercizio: niente,
    aggiornaEsercizio: niente,
  }
}

export function useAccount() {
  return {
    utenteCorrente: { id: 'io', nome: 'Prova', dati: {} },
    amici: [],
    utenti: [],
    condividiConAmici: async () => ({ ok: true, quanti: 0 }),
  }
}
