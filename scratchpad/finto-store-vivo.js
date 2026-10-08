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
import { normalizzaDieta } from '../src/lib/dieta.js'
import { preferenzeVuote } from '../src/lib/preferenzeCibo.js'

let stato = {
  schede: [],
  sessione: null,
  io: { id: 'io', nome: 'Prova', username: 'prova', dati: {} },
  // Vivi anche diete e diario (scratchpad/prova-dieta-schema): lo schema si
  // salva, "l'ho mangiato" finisce nel giorno, e le pagine si ridisegnano.
  diete: [],
  diario: {},
  preferenze: preferenzeVuote(),
}
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
    diete: s.diete,
    getDieta: (id) => stato.diete.find((d) => d.id === id) || null,
    aggiungiDieta: (d) => {
      const n = normalizzaDieta(d)
      // Come lo store vero: la dieta appena creata è quella attiva.
      if (!n.attivataIl) n.attivataIl = new Date().toISOString()
      cambia({ diete: [...stato.diete, n] })
      return n
    },
    aggiornaDieta: (d) => {
      const n = normalizzaDieta(d)
      cambia({ diete: stato.diete.map((x) => (x.id === n.id ? n : x)) })
      return n
    },
    eliminaDieta: (id) => cambia({ diete: stato.diete.filter((d) => d.id !== id) }),
    sessione: s.sessione,
    getScheda: (id) => stato.schede.find((x) => x.id === id) || null,
    // L'editor di una scheda nuova (scratchpad/prova-preparazione).
    aggiungiScheda: (scheda) => {
      const n = normalizzaScheda(scheda)
      cambia({ schede: [...stato.schede, n] })
      return n
    },
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
    preferenze: s.preferenze,
    aggiornaPreferenze: (p) => cambia({ preferenze: { ...stato.preferenze, ...p } }),
    giornoDiario: (data) => s.diario[data] || { id: data, data, voci: [] },
    aggiungiVociDiario: (data, voci) => {
      const g = stato.diario[data] || { id: data, data, voci: [] }
      cambia({ diario: { ...stato.diario, [data]: { ...g, voci: [...g.voci, ...voci] } } })
    },
    eliminaVoceDiario: (data, id) => {
      const g = stato.diario[data]
      if (g) cambia({ diario: { ...stato.diario, [data]: { ...g, voci: g.voci.filter((v) => v.id !== id) } } })
    },
    togliPastoDiario: (data, pastoId) => {
      const g = stato.diario[data]
      if (g) cambia({ diario: { ...stato.diario, [data]: { ...g, voci: g.voci.filter((v) => v.pastoId !== pastoId) } } })
    },
    ricordaCibo: niente,
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
    // Le cose da guardare della barra e della home (scratchpad/prova-ui).
    richiesteAmicizia: s.richiesteAmicizia || { ricevute: [], inviate: [] },
    condivisioni: s.condivisioni || { daVedere: 0 },
    effimeri: s.effimeri || { ricevuti: [] },
    richiesteLavoro: { ricevute: [], inviate: [] },
    mioPt: null,
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
