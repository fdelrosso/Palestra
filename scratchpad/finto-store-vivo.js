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

let stato = { schede: [], sessione: null, io: { id: 'io', nome: 'Prova', username: 'prova', dati: {} } }
const ascoltatori = new Set()

function cambia(patch) {
  stato = { ...stato, ...patch }
  ascoltatori.forEach((f) => f())
}

export function impostaFinto(patch) {
  cambia(patch)
}

// Per guardarci dentro dalla console del banco:
//   (await import('/scratchpad/finto-store-vivo.js')).leggiFinto()
export function leggiFinto() {
  return stato
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
    // Vivi anche questi: il recap del calendario salva il suo layout qui, e
    // la card si deve ridisegnare (scratchpad/prova-recap).
    aggiornaCompletamento: (schedaId, data, patch) =>
      cambia({
        schede: stato.schede.map((x) =>
          x.id !== schedaId
            ? x
            : { ...x, completamenti: x.completamenti.map((c) => (c.data === data ? { ...c, ...patch } : c)) },
        ),
      }),
    eliminaCompletamento: (data, schedaId) =>
      cambia({
        schede: stato.schede.map((x) =>
          schedaId && x.id !== schedaId ? x : { ...x, completamenti: x.completamenti.filter((c) => c.data !== data) },
        ),
      }),
    preferenze: null,
    giornoDiario: (data) => ({ id: data, data, voci: [] }),
    salvaAllenamento: niente,
    // Vivi anche questi due: rinominare o togliere un esercizio "anche dalla
    // scheda" durante l'allenamento si deve vedere tornando alla scheda.
    aggiornaGiorno: (schedaId, giornoId, patch) =>
      cambia({
        schede: stato.schede.map((x) =>
          x.id !== schedaId
            ? x
            : {
                ...x,
                giorni: x.giorni.map((g) =>
                  g.id !== giornoId ? g : { ...g, ...(typeof patch === 'function' ? patch(g) : patch) },
                ),
              },
        ),
      }),
    aggiornaSchemaEsercizio: niente,
    aggiornaEsercizio: (schedaId, giornoId, esercizioId, patch) =>
      cambia({
        schede: stato.schede.map((x) =>
          x.id !== schedaId
            ? x
            : {
                ...x,
                giorni: x.giorni.map((g) =>
                  g.id !== giornoId
                    ? g
                    : { ...g, esercizi: g.esercizi.map((e) => (e.id !== esercizioId ? e : { ...e, ...patch })) },
                ),
              },
        ),
      }),
  }
}

// Nomi già di qualcun altro, per provare il "è già preso" (scratchpad/prova-nome).
const NOMI_PRESI = ['filippo', 'nico']
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

export function useAccount() {
  const s = useStato()
  return {
    // Vivo come lo store: cambiare il nome si deve vedere dappertutto.
    utenteCorrente: s.io,
    amici: [],
    utenti: [],
    condividiConAmici: async () => ({ ok: true, quanti: 0 }),
    // Come lib/social, senza database: un attimo di rete finta e la risposta.
    nomeDisponibile: async (v) => {
      await pausa(150)
      return { ok: true, libero: !NOMI_PRESI.includes(String(v).trim().toLowerCase()) }
    },
    impostaNome: async (v) => {
      await pausa(200)
      const nome = String(v).trim().replace(/\s+/g, ' ')
      if (NOMI_PRESI.includes(nome.toLowerCase())) {
        return { ok: false, errore: `Il nome “${nome}” è già di qualcun altro.` }
      }
      cambia({ io: { ...stato.io, nome } })
      return { ok: true, nome, errore: '' }
    },
    usernameDisponibile: async () => ({ ok: true, libero: true }),
    impostaUsername: async (v) => {
      cambia({ io: { ...stato.io, username: v } })
      return { ok: true, username: v, errore: '' }
    },
  }
}
