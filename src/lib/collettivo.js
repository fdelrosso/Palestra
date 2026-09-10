import { normalizzaScheda } from '../data/model'
import { messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// IL COLLETTIVO: quello che si vede degli altri.
//
// Tre viste dell'app guardano i dati di piu' persone insieme — lo Storico
// Allenamenti, le Schede Generali e il segnale "comunita'" del motore dei
// consigli — e tutte e tre partono dalla stessa domanda: quali schede posso
// vedere, di chi, e come si chiama. Prima quella domanda la si faceva al
// localStorage del telefono, che conteneva tutti i profili di quel
// dispositivo; adesso la si fa al database, che e' l'unico a sapere la
// risposta giusta.
//
// ⚠️ IL FILTRO NON E' QUI: quello che non si deve vedere non esce dal server,
// non "esce e poi lo nascondiamo". Il filtro di lib/visibilita resta dov'e', ma
// copre solo cio' che il server manda apposta (le proprie cose, che si vedono
// sempre).
//
// ⚠️ DUE LISTE, NON UNA, e non e' un dettaglio di trasporto. Una SCHEDA e un
// ALLENAMENTO SVOLTO hanno visibilita' indipendenti: nascondere il programma e
// pubblicare gli allenamenti fatti dentro e' una combinazione legittima, e
// frequente. Quindi:
//   · `schede` sono i PROGRAMMI, e arrivano senza completamenti;
//   · `allenamenti` sono i completamenti, presi anche dalle schede nascoste.
// Ogni allenamento si porta dietro il nome della scheda e del giorno, congelati
// a fine allenamento: della scheda nascosta non arriva nient'altro.
//
// ⚠️ UNA LETTURA SOLA, TENUTA DA PARTE. Le pagine che ne hanno bisogno sono
// sette e si aprono e chiudono di continuo: rileggere tutto a ogni apertura
// vorrebbe dire scaricare le schede di tutti ogni volta che si tocca una voce
// di menu. Quindi la si legge una volta e la si tiene finche' l'app resta
// aperta; `scadeCollettivo()` la butta via quando le PROPRIE schede cambiano
// (e' l'unico cambiamento che si vede subito). Le modifiche degli altri
// arrivano alla riapertura dell'app: e' roba da "prendere spunto", non un
// messaggio che sta aspettando risposta.
// ---------------------------------------------------------------------------

/** Un collettivo vuoto: nuovo ogni volta, cosi' nessuno se lo ritrova condiviso. */
export const collettivoVuoto = () => ({ schede: [], allenamenti: [], fama: new Map() })

/**
 * @typedef {Object} VoceCollettivo
 * @property {string} utenteId
 * @property {string} utenteNome   '' se il database non lascia sapere il nome
 * @property {boolean} autoreEPt
 * @property {number} relazionePt  2 = l'ha scritta il mio PT · 1 = un altro suo
 *                                 atleta · 0 = nessun legame (o e' mia)
 * @property {import('../data/model').Scheda} scheda
 */

/**
 * @typedef {Object} Collettivo
 * @property {VoceCollettivo[]} schede        i PROGRAMMI (senza completamenti)
 * @property {VoceAllenamento[]} allenamenti   gli allenamenti SVOLTI, uno per voce
 * @property {Map<string, number>} fama        ptId → quanti atleti segue
 */

/**
 * @typedef {Object} VoceAllenamento
 * @property {string} utenteId
 * @property {string} utenteNome
 * @property {string} schedaId     serve solo a distinguere due allenamenti
 * @property {number} relazionePt  come sopra
 * @property {import('../data/model').Completamento} completamento
 */

async function leggi(mioPtId) {
  const [rs, ra] = await Promise.all([
    supabase.rpc('schede_visibili'),
    supabase.rpc('allenamenti_visibili'),
  ])
  const errore = rs.error || ra.error
  if (errore) {
    console.warn('Lettura del collettivo fallita', errore.message)
    return { ok: false, errore: messaggioErrore(errore), dati: collettivoVuoto() }
  }
  const righe = rs.data || []
  const righeAll = ra.data || []

  // I NOMI. Le schede e i profili hanno regole diverse apposta (si puo' vedere
  // una scheda pubblica di uno con cui non si ha niente a che fare, ma non il
  // suo profilo), quindi i nomi si chiedono a parte a `nomi_di`.
  const nomi = new Map()
  const ids = [
    ...new Set([...righe, ...righeAll].map((r) => r.user_id).filter(Boolean)),
  ]
  if (ids.length > 0) {
    const { data: rn, error: en } = await supabase.rpc('nomi_di', { ids })
    if (en) console.warn('Lettura dei nomi fallita', en.message)
    for (const r of rn || []) nomi.set(r.id, r.nome)
  }

  // LA FAMA DEI PT: solo quelli di cui si stanno gia' vedendo le schede, piu'
  // il proprio (che si ha il diritto di conoscere per intero: e' il proprio).
  const fama = new Map()
  const idsPt = [...new Set(righe.filter((r) => r.autore_pt).map((r) => r.user_id))]
  if (mioPtId && !idsPt.includes(mioPtId)) idsPt.push(mioPtId)
  if (idsPt.length > 0) {
    const { data: rf, error: ef } = await supabase.rpc('fama_pt', { ids: idsPt })
    if (ef) console.warn('Lettura della fama dei PT fallita', ef.message)
    for (const r of rf || []) if (r.atleti > 0) fama.set(r.id, r.atleti)
  }

  const schede = righe.map((r) => ({
    utenteId: r.user_id,
    utenteNome: nomi.get(r.user_id) || '',
    autoreEPt: !!r.autore_pt,
    relazionePt: r.relazione_pt || 0,
    scheda: normalizzaScheda(r.dati),
  }))
  const allenamenti = righeAll.map((r) => ({
    utenteId: r.user_id,
    utenteNome: nomi.get(r.user_id) || '',
    schedaId: r.scheda_id,
    relazionePt: r.relazione_pt || 0,
    completamento: r.dati || {},
  }))
  return { ok: true, errore: '', dati: { schede, allenamenti, fama } }
}

// La copia tenuta da parte: { chiave, promessa }. Si tiene la PROMESSA e non il
// risultato apposta — due pagine che si aprono insieme fanno una lettura sola.
let cache = null

/**
 * Il collettivo di chi sta usando l'app adesso.
 * @param {string|null} utenteId  chi guarda (cambia la risposta: i propri
 *   allenamenti escono tutti, e i legami col PT sono i suoi)
 * @param {string|null} mioPtId
 * @returns {Promise<{ok:boolean, errore:string, dati:Collettivo}>}
 */
export function leggiCollettivo(utenteId, mioPtId = null) {
  if (!utenteId) return Promise.resolve({ ok: true, errore: '', dati: collettivoVuoto() })
  const chiave = `${utenteId}|${mioPtId || ''}`
  if (!cache || cache.chiave !== chiave) {
    // ⚠️ Una lettura ANDATA MALE non si tiene: sarebbe una schermata vuota che
    // non si ripara piu' finche' non si chiude l'app. Il caso vero e' la
    // palestra sottoterra — la rete torna dopo due minuti, e la pagina che si
    // apre dopo deve riprovare.
    const mia = { chiave }
    mia.promessa = leggi(mioPtId).then((esito) => {
      if (!esito.ok && cache === mia) cache = null
      return esito
    })
    cache = mia
  }
  return cache.promessa
}

/** Butta via la copia tenuta da parte: la prossima pagina rilegge dal server. */
export function scadeCollettivo() {
  cache = null
}
