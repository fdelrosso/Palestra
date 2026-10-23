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
import { aggiungiCiboMio } from '../src/lib/cibiMiei.js'

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
    aggiornaPreferenze: (p) =>
      cambia({ preferenze: { ...stato.preferenze, ...(typeof p === 'function' ? p(stato.preferenze) : p) } }),
    giornoDiario: (data) => s.diario[data] || { id: data, data, voci: [] },
    aggiungiVociDiario: (data, voci) => {
      const g = stato.diario[data] || { id: data, data, voci: [] }
      // Come lo store vero (normalizzaVoce): ogni voce ha il suo id.
      const conId = voci.map((v, i) => ({ ...v, id: v.id || `v${Date.now()}-${i}` }))
      cambia({ diario: { ...stato.diario, [data]: { ...g, voci: [...g.voci, ...conId] } } })
    },
    eliminaVoceDiario: (data, id) => {
      const g = stato.diario[data]
      if (g) cambia({ diario: { ...stato.diario, [data]: { ...g, voci: g.voci.filter((v) => v.id !== id) } } })
    },
    aggiornaVoceDiario: (data, voce) => {
      const g = stato.diario[data]
      if (g) cambia({ diario: { ...stato.diario, [data]: { ...g, voci: g.voci.map((v) => (v.id === voce.id ? voce : v)) } } })
    },
    aggiornaGiornoDiario: (data, campi) => {
      const g = stato.diario[data] || { id: data, data, voci: [] }
      cambia({ diario: { ...stato.diario, [data]: { ...g, ...campi } } })
    },
    togliPastoDiario: (data, pastoId) => {
      const g = stato.diario[data]
      if (g) cambia({ diario: { ...stato.diario, [data]: { ...g, voci: g.voci.filter((v) => v.pastoId !== pastoId) } } })
    },
    // Come lo store vero: un cibo nuovo entra fra i miei (lib/cibiMiei).
    ricordaCibo: (cibo) => cambia({ preferenze: { ...stato.preferenze, cibi: aggiungiCiboMio(stato.preferenze.cibi, cibo) } }),
    // Lo store vero ha il diario come elenco di giorni.
    diario: Object.values(s.diario),
    salvaAllenamento: (schedaId, giornoId, salvato) =>
      cambia({
        schede: stato.schede.map((x) =>
          x.id !== schedaId ? x : { ...x, giorni: x.giorni.map((g) => (g.id === giornoId ? { ...g, salvato } : g)) },
        ),
      }),
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

const NESSUNA_RELAZIONE = []

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
    // Il lato PT (scratchpad/prova-pt): li mette il banco con impostaFinto.
    mioPt: s.mioPt || null,
    mieiAtleti: s.mieiAtleti || [],
    rimuoviAtleta: niente,
    // Cerca (scratchpad/prova-cerca): i consigli d'amicizia li mette il banco
    // con impostaFinto({ suggeriti }); una richiesta toglie la persona.
    relazioni: s.relazioni || NESSUNA_RELAZIONE,
    cercaUtenti: async () => ({ ok: true, trovati: [], errore: '' }),
    amiciSuggeriti: async (limite) => {
      await pausa(150)
      return (stato.suggeriti || []).slice(0, limite)
    },
    inviaRichiestaAmicizia: async (id) => {
      await pausa(100)
      cambia({ suggeriti: (stato.suggeriti || []).filter((u) => u.id !== id), relazioni: [...(stato.relazioni || []), id] })
      return { ok: true }
    },
    // Come AccountContext: il profilo diventa PT col codice dato (qui niente
    // unicità da controllare).
    diventaPt: async (codice) => {
      await pausa(200)
      cambia({ io: { ...stato.io, ruolo: 'pt', codicePt: codice, ptId: null } })
      return { ok: true }
    },
    smettiPt: async () => {
      await pausa(200)
      cambia({ io: { ...stato.io, ruolo: 'atleta', codicePt: '' } })
      return { ok: true }
    },
    condividiConAmici: async () => ({ ok: true, quanti: 0 }),
    // Foto e video mandati (scratchpad/prova-chat-scambi): il file è quello
    // messo nel banco con impostaFinto({ blobFinto }).
    apriEffimero: async () => stato.blobFinto || null,
    apertoEffimero: async () => {},
    consumaEffimero: async () => {},
    eliminaEffimero: async () => ({ ok: true }),
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
