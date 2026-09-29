// ---------------------------------------------------------------------------
// Sincronizzazione tra il dispositivo e Supabase.
//
// ⚠️ IL PROBLEMA VERO NON E' "DOVE" MA "QUANDO". Prima i dati si leggevano da
// localStorage in modo sincrono: l'app partiva gia' piena. Adesso arrivano
// dalla rete, e la rete in palestra non c'e' — sottoterra, in una sala pesi con
// i muri spessi, o semplicemente col telefono in modalita' risparmio. Un'app
// che si blocca su "caricamento..." mentre uno ha il bilanciere in mano e'
// peggio di un'app che non sincronizza.
//
// QUINDI: **il dispositivo resta la copia che si legge, il server e' la copia
// che dura.** All'avvio si mostra subito quello che c'e' in locale, poi si
// chiede al server e si sostituisce. Ogni modifica si scrive PRIMA in locale
// (quindi non si perde mai) e poi si manda su; se non si riesce a mandarla,
// resta in coda e riparte da sola quando la rete torna.
//
// ⚠️ LA CODA SI SCRIVE PRIMA DI MANDARE, NON DOPO UN FALLIMENTO. Ogni modifica
// entra in coda e ne esce solo quando il server ha risposto "fatto". Prima ci
// finiva solo se la richiesta falliva — e una richiesta che non torna mai (app
// chiusa a meta', rete che non risponde ne' si' ne' no) non era ne' sul server
// ne' in coda: al giro dopo il server, che aveva la versione vecchia, vinceva.
// E' cosi' che un allenamento terminato ricompariva "in corso" riaprendo l'app.
//
// ⚠️ UNA VOCE PER RIGA, VINCE L'ULTIMA. Nella coda due versioni della stessa
// riga non convivono: quella nuova toglie quella vecchia. Prima si
// accumulavano, e una versione vecchia rimasta in coda veniva rimandata al
// riavvio DOPO quella nuova gia' arrivata: il server tornava indietro. Con la
// sessione di allenamento succedeva ogni volta che in palestra si perdeva la
// rete per un attimo — una serie segnata non partiva, il "Termina" si', e al
// riavvio la serie rimasta in coda riscriveva la sessione sopra il "finito".
//
// ⚠️ CONFLITTI: qui non si fa merge. Se modifichi la stessa scheda su due
// dispositivi mentre uno dei due e' offline, **vince l'ultimo che riesce a
// scrivere sul server**. Per un'app che usa una persona sola su due suoi
// dispositivi e' la scelta giusta: un merge vero costerebbe molto e servirebbe
// quasi mai. Ma va saputo, ed e' scritto anche in context.md.
// ---------------------------------------------------------------------------

import { erroreDiRete, supabase } from './supabase'

// Le modifiche non ancora confermate dal server. Vivono in localStorage: se
// l'app viene chiusa prima che arrivino, si riprende da dove si era.
const CHIAVE_CODA = 'palestra:coda-sync:v1'

/** @returns {{tabella:string, op:'upsert'|'delete'|'update', riga:object}[]} */
export function codaSospesa() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_CODA) || '[]')
  } catch {
    return []
  }
}

// Torna false se non ci sta (localStorage pieno): chi chiama deve saperlo,
// perche' una modifica che non e' entrata in coda va mandata comunque.
function scriviCoda(coda) {
  try {
    localStorage.setItem(CHIAVE_CODA, JSON.stringify(coda.slice(-500)))
    return true
  } catch {
    return false
  }
}

// La riga che una voce tocca. Due voci con la stessa chiave sono due versioni
// della stessa riga, e conta solo l'ultima. Per i documenti singoli
// (preferenze, sessione) la riga e' l'utente.
// ⚠️ Il profilo (`update` di poche colonne) resta fuori: ha la sua regola in
// accodaProfilo, perche' due update di colonne diverse non si sostituiscono.
function chiaveDi({ tabella, op, riga }) {
  if (op === 'update') return null
  return `${tabella}:${riga?.id ?? riga?.user_id}`
}

// Mette in coda, al posto delle versioni vecchie delle stesse righe.
function accoda(voci) {
  if (!voci.length) return true
  const chiavi = new Set(voci.map(chiaveDi))
  return scriviCoda([...codaSospesa().filter((v) => !chiavi.has(chiaveDi(v))), ...voci])
}

/**
 * Mette in coda una modifica al PROFILO che non si è riusciti a mandare.
 *
 * A differenza di schede e diete, qui si accoda un `update` di poche colonne e
 * non il documento intero: il profilo è una riga sola, e mandarne una copia
 * completa scritta mentre si era offline potrebbe riportare indietro campi
 * cambiati nel frattempo dall'altro dispositivo.
 */
export function accodaProfilo(userId, colonne) {
  // Se c'era già una modifica in attesa per lo stesso campo, vince l'ultima:
  // due cambi di peso di fila devono arrivare come un peso solo, quello giusto.
  const coda = codaSospesa().filter(
    (v) => !(v.tabella === 'profili' && v.riga?.id === userId && stesseColonne(v.riga, colonne)),
  )
  scriviCoda([...coda, { tabella: 'profili', op: 'update', riga: { id: userId, ...colonne } }])
}

function stesseColonne(riga, colonne) {
  const a = Object.keys(riga).filter((k) => k !== 'id').sort()
  const b = Object.keys(colonne).sort()
  return a.length === b.length && a.every((k, i) => k === b[i])
}

export function svuotaCoda() {
  try {
    localStorage.removeItem(CHIAVE_CODA)
  } catch {
    /* ignora */
  }
}

// Una operazione sola verso il server.
// 'fatto' = e' andata (o il database l'ha rifiutata per principio, e allora
// riprovarla non serve) · 'rete' = il server non si e' sentito · 'errore' = ha
// risposto di no, ma per un motivo che puo' passare.
async function esegui({ tabella, op, riga }) {
  let q
  if (op === 'delete') {
    q = supabase.from(tabella).delete().eq('id', riga.id).eq('user_id', riga.user_id)
  } else if (op === 'update') {
    // Solo il profilo: si aggiornano le colonne toccate, non tutta la riga.
    const { id, ...colonne } = riga
    q = supabase.from(tabella).update(colonne).eq('id', id)
  } else if (riga.id === undefined) {
    // Documento singolo: una riga per persona, la chiave e' l'utente.
    q = supabase.from(tabella).upsert(riga, { onConflict: 'user_id' })
  } else {
    q = supabase.from(tabella).upsert(riga)
  }
  const { error, status } = await q
  if (!error) return 'fatto'
  // ⚠️ Un errore delle REGOLE di accesso non si risolve riprovando: rimettere
  // in coda una riga che il database rifiuta per principio vuol dire
  // riprovarla per sempre. Si butta e si lascia traccia nella console.
  const definitivo = error.code === '42501' || error.code === '23503' || error.code === '23514'
  if (definitivo) {
    console.warn(`Sync ${tabella}: riga rifiutata dal database, non la riprovo`, error.message)
    return 'fatto'
  }
  return status === 0 || erroreDiRete(error) ? 'rete' : 'errore'
}

// ⚠️ Col server si parla UNO ALLA VOLTA. Due richieste partite insieme non
// arrivano per forza nell'ordine in cui sono partite: l'ultima serie segnata e
// il "Termina" subito dopo potevano scambiarsi di posto, e sul server restava
// la serie — cioe' l'allenamento ancora aperto. In fila, l'ultima scritta e'
// l'ultima che arriva. Anche le letture dell'avvio passano di qui (dopoLaCoda):
// una modifica mandata mentre si legge potrebbe non esserci, nella risposta, e
// non esserci piu' nemmeno in coda.
let fila = Promise.resolve()

function inFila(lavoro) {
  const giro = fila.then(lavoro)
  fila = giro.catch(() => {})
  return giro
}

// Manda quello che c'e' in coda (solo le righe di `chiavi`, se date) e toglie
// ogni voce appena il server la conferma. Si rilegge la coda a ogni passo: una
// voce sostituita nel frattempo da una versione piu' nuova non va mandata.
// ⚠️ Un "no" del server non ferma le altre: ogni voce e' l'unica della sua
// riga, quindi l'ordine fra righe diverse non conta, e una riga rifiutata (una
// tabella che sul server non c'e' ancora) non deve tenere ferme tutte le altre.
// Una rete assente invece si': insistere sulle successive fa solo perdere tempo.
async function smaltisci(chiavi = null) {
  const provate = new Set()
  for (;;) {
    const voce = codaSospesa().find(
      (v) => (!chiavi || chiavi.has(chiaveDi(v))) && !provate.has(JSON.stringify(v)),
    )
    if (!voce) break
    const json = JSON.stringify(voce)
    provate.add(json)
    const esito = await esegui(voce)
    if (esito === 'rete') break
    if (esito === 'fatto') scriviCoda(codaSospesa().filter((v) => JSON.stringify(v) !== json))
  }
  return codaSospesa().length
}

// La strada di ogni modifica: prima in coda, poi al server.
function manda(voci) {
  if (!voci.length) return Promise.resolve()
  const giro = accoda(voci)
    ? inFila(() => smaltisci(new Set(voci.map(chiaveDi))))
    : // Coda piena (localStorage esaurito): niente rete di sicurezza, ma la
      // modifica parte lo stesso. Tenerla ferma sarebbe perderla per certo.
      inFila(async () => {
        for (const v of voci) if ((await esegui(v)) === 'rete') break
      })
  // Nessuno la aspetta: un errore qui non deve diventare un errore non gestito.
  return giro.catch((e) => console.warn('Sync: invio non riuscito', e))
}

/**
 * Riprova quello che era rimasto in coda. Si chiama quando torna la rete.
 * @returns {Promise<number>} quante ne restano ancora sospese
 */
export function riprovaCoda() {
  return inFila(() => smaltisci()).catch(() => codaSospesa().length)
}

/**
 * Smaltisce la coda e POI esegue `lettura`, senza che nessun invio le passi in
 * mezzo. E' l'avvio: prima si manda quello che era rimasto indietro (se si
 * leggesse prima, il server risponderebbe con dati più vecchi delle modifiche
 * che stanno ancora su questo telefono), poi si legge.
 */
export function dopoLaCoda(lettura) {
  return inFila(async () => {
    await smaltisci()
    return lettura()
  })
}

/**
 * Manda al server le differenze di una COLLEZIONE (schede, diete).
 *
 * Non manda tutto ogni volta: confronta con l'ultima istantanea sincronizzata e
 * tocca solo cio' che e' cambiato davvero. Durante un allenamento la scheda si
 * riscrive a ogni serie — mandarla intera ogni volta vorrebbe dire decine di
 * chiamate inutili con il telefono in tasca.
 *
 * @param {string} tabella 'schede' | 'diete'
 * @param {string} userId
 * @param {object[]} documenti stato attuale
 * @param {Map<string,string>} istantanea id -> JSON com'era all'ultimo invio
 * @param {(doc:object)=>object} [colonne] colonne vere da affiancare al json
 * @returns {Promise<Map<string,string>>} la nuova istantanea
 */
export async function sincronizzaCollezione(tabella, userId, documenti, istantanea, colonne) {
  const nuova = new Map()
  const operazioni = []

  for (const doc of documenti) {
    const json = JSON.stringify(doc)
    nuova.set(doc.id, json)
    if (istantanea.get(doc.id) === json) continue
    operazioni.push({
      tabella,
      op: 'upsert',
      riga: { id: doc.id, user_id: userId, dati: doc, ...(colonne ? colonne(doc) : {}) },
    })
  }
  for (const id of istantanea.keys()) {
    if (!nuova.has(id)) operazioni.push({ tabella, op: 'delete', riga: { id, user_id: userId } })
  }

  // ⚠️ L'istantanea nuova si ritorna subito, senza aspettare il server: da qui
  // le modifiche stanno in coda, e la coda le porta su da sola. Tenerle "da
  // mandare" anche qui vorrebbe dire rimetterle in coda alla prossima modifica.
  manda(operazioni)
  return nuova
}

/**
 * Manda al server un documento SINGOLO (preferenze, sessione): una riga per
 * persona, la chiave e' l'utente. `dati` a null = niente allenamento in corso.
 */
export function sincronizzaSingolo(tabella, userId, dati) {
  return manda([{ tabella, op: 'upsert', riga: { user_id: userId, dati: dati ?? null } }])
}

// Le modifiche di questa persona che il server non ha ancora confermato.
function inAttesa(tabella, userId) {
  return codaSospesa().filter(
    (v) => v.tabella === tabella && v.op !== 'update' && v.riga?.user_id === userId,
  )
}

/**
 * Legge dal server una collezione. Torna null se non si e' potuto leggere.
 * ⚠️ Le righe ancora in coda vincono su quelle del server: sono modifiche
 * fatte qui e non ancora arrivate, e il server ha la versione di prima.
 */
export async function leggiCollezione(tabella, userId) {
  const { data, error } = await supabase.from(tabella).select('id, dati').eq('user_id', userId)
  if (error) {
    console.warn(`Lettura ${tabella} dal cloud fallita`, error.message)
    return null
  }
  const righe = new Map(data.map((r) => [r.id, r.dati]))
  for (const v of inAttesa(tabella, userId)) {
    if (v.op === 'delete') righe.delete(v.riga.id)
    else righe.set(v.riga.id, v.riga.dati)
  }
  return [...righe.values()]
}

/**
 * Legge dal server un documento singolo. `undefined` = non letto, `null` = non c'e'.
 * ⚠️ Come per le collezioni, una versione ancora in coda vince: un "Termina"
 * non ancora arrivato NON deve riaprire l'allenamento che il server ha ancora.
 */
export async function leggiSingolo(tabella, userId) {
  const { data, error } = await supabase
    .from(tabella)
    .select('dati')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn(`Lettura ${tabella} dal cloud fallita`, error.message)
    return undefined
  }
  const attesa = inAttesa(tabella, userId).at(-1)
  if (attesa) return attesa.riga.dati ?? null
  return data ? data.dati : null
}

/**
 * Chiama `azione` quando la rete torna. Serve a far ripartire la coda senza
 * che l'utente debba fare niente.
 * @returns {() => void} per smettere di ascoltare
 */
export function alRitornoDellaRete(azione) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', azione)
  return () => window.removeEventListener('online', azione)
}
