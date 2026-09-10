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
// ⚠️ CONFLITTI: qui non si fa merge. Se modifichi la stessa scheda su due
// dispositivi mentre uno dei due e' offline, **vince l'ultimo che riesce a
// scrivere sul server**. Per un'app che usa una persona sola su due suoi
// dispositivi e' la scelta giusta: un merge vero costerebbe molto e servirebbe
// quasi mai. Ma va saputo, ed e' scritto anche in context.md.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

// Le modifiche che non si e' riusciti a mandare. Vivono in localStorage: se
// l'app viene chiusa prima che la rete torni, si riprende da dove si era.
const CHIAVE_CODA = 'palestra:coda-sync:v1'

/** @returns {{tabella:string, op:'upsert'|'delete', riga:object}[]} */
export function codaSospesa() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_CODA) || '[]')
  } catch {
    return []
  }
}

function scriviCoda(coda) {
  try {
    localStorage.setItem(CHIAVE_CODA, JSON.stringify(coda.slice(-500)))
  } catch {
    /* localStorage pieno: la coda e' un di piu', non deve far cadere l'app */
  }
}

function accoda(voci) {
  if (!voci.length) return
  scriviCoda([...codaSospesa(), ...voci])
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

// Una operazione sola verso il server. Torna true se e' andata.
async function esegui({ tabella, op, riga }) {
  let q
  if (op === 'delete') {
    q = supabase.from(tabella).delete().eq('id', riga.id).eq('user_id', riga.user_id)
  } else if (op === 'update') {
    // Solo il profilo: si aggiornano le colonne toccate, non tutta la riga.
    const { id, ...colonne } = riga
    q = supabase.from(tabella).update(colonne).eq('id', id)
  } else {
    q = supabase.from(tabella).upsert(riga)
  }
  const { error } = await q
  if (error) {
    // ⚠️ Un errore delle REGOLE di accesso non si risolve riprovando: rimettere
    // in coda una riga che il database rifiuta per principio vuol dire
    // riprovarla per sempre. Si butta e si lascia traccia nella console.
    const definitivo = error.code === '42501' || error.code === '23503' || error.code === '23514'
    if (definitivo) {
      console.warn(`Sync ${tabella}: riga rifiutata dal database, non la riprovo`, error.message)
      return true
    }
    return false
  }
  return true
}

/**
 * Riprova quello che era rimasto in coda. Si chiama all'avvio e quando torna
 * la rete. Le operazioni si eseguono in ordine: su una stessa riga, l'ultima
 * scritta deve restare l'ultima.
 * @returns {Promise<number>} quante ne restano ancora sospese
 */
export async function riprovaCoda() {
  const coda = codaSospesa()
  if (!coda.length) return 0
  const rimaste = []
  for (let i = 0; i < coda.length; i += 1) {
    // Appena una fallisce ci si ferma: se la rete e' caduta di nuovo, insistere
    // sulle successive fa solo perdere tempo e rompe l'ordine.
    if (rimaste.length || !(await esegui(coda[i]))) rimaste.push(coda[i])
  }
  scriviCoda(rimaste)
  return rimaste.length
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

  if (!operazioni.length) return nuova

  const falliti = []
  for (const o of operazioni) {
    if (falliti.length || !(await esegui(o))) falliti.push(o)
  }
  accoda(falliti)
  // ⚠️ L'istantanea si aggiorna comunque, anche per cio' che e' fallito: quelle
  // righe sono gia' in coda, e tenerle "da mandare" anche qui vorrebbe dire
  // mandarle due volte alla prossima modifica.
  return nuova
}

/**
 * Manda al server un documento SINGOLO (preferenze, sessione): una riga per
 * persona, la chiave e' l'utente. `dati` a null = niente allenamento in corso.
 */
export async function sincronizzaSingolo(tabella, userId, dati) {
  const riga = { user_id: userId, dati: dati ?? null }
  const { error } = await supabase.from(tabella).upsert(riga, { onConflict: 'user_id' })
  if (error) {
    if (error.code === '42501') {
      console.warn(`Sync ${tabella}: rifiutata dal database`, error.message)
      return
    }
    // Qui l'id della coda e' l'utente: cosi' due salvataggi di fila della
    // stessa cosa non si accumulano come due voci diverse.
    accoda([{ tabella, op: 'upsert', riga }])
  }
}

/** Legge dal server una collezione. Torna null se non si e' potuto leggere. */
export async function leggiCollezione(tabella, userId) {
  const { data, error } = await supabase.from(tabella).select('dati').eq('user_id', userId)
  if (error) {
    console.warn(`Lettura ${tabella} dal cloud fallita`, error.message)
    return null
  }
  return data.map((r) => r.dati)
}

/** Legge dal server un documento singolo. `undefined` = non letto, `null` = non c'e'. */
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
