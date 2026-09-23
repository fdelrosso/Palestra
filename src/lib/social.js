// ---------------------------------------------------------------------------
// Il sociale su Supabase: amicizie, richieste di lavoro e condivisioni.
//
// Prima queste cose vivevano in localStorage, e quindi funzionavano solo se le
// due persone usavano LO STESSO BROWSER — cioe' quasi mai. Erano complete e
// dimostrabili, e inutili. Adesso passano dal database, e due persone su due
// telefoni diversi possono essere amiche davvero.
//
// ⚠️ QUI NON C'E' LA CODA DI SINCRONIZZAZIONE, e non e' una dimenticanza. Per
// le schede ha senso: le scrivi in palestra, dove la rete non c'e', e devono
// restare tue comunque. Mandare una scheda a un amico, invece, e' un'azione che
// riguarda un'altra persona: se non parte, la cosa onesta e' dirlo subito, non
// farla partire domani quando chi l'ha mandata non se lo ricorda piu'.
//
// ⚠️ COSA SI PUO' LEGGERE DI UNO SCONOSCIUTO: niente. `leggiProfiliCollegati`
// sembra chiedere tutti i profili, ma il database ne restituisce solo quelli a
// cui si e' legati — e' la regola scritta in supabase/schema.sql a decidere, non
// questa query. Per trovare qualcuno che non si conosce ci sono `cercaPersona`
// (codice o nome esatto) e `amiciSuggeriti` (solo chi ha un legame reale).
// ---------------------------------------------------------------------------

import { messaggioErrore, supabase } from './supabase'
import { normalizzaDatiFisici } from './datiFisici'

// -- traduzione: il database parla snake_case, l'app camelCase ---------------

function relazioneDaRiga(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    daId: r.da_id,
    aId: r.a_id,
    stato: r.stato,
    creataIl: r.creata_il,
    rispostaIl: r.risposta_il,
  }
}

function condivisioneDaRiga(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    daId: r.da_id,
    daNome: r.da_nome || '',
    aId: r.a_id,
    titolo: r.titolo || '',
    sottotitolo: r.sottotitolo || '',
    payload: r.payload,
    creataIl: r.creata_il,
    vistaIl: r.vista_il,
    salvataIl: r.salvata_il,
  }
}

export function profiloDaRiga(r) {
  return {
    id: r.id,
    nome: r.nome || '',
    // La maniglia pubblica, quella con cui ci si trova. Diversa dal nome: il
    // nome e' come ti chiami, l'username e' come ti fai trovare.
    username: r.username || '',
    ruolo: r.ruolo === 'pt' ? 'pt' : 'atleta',
    codicePt: r.codice_pt || '',
    codiceAmico: r.codice_amico || '',
    ptId: r.pt_id || null,
    associatoIl: r.associato_il || null,
    dati: normalizzaDatiFisici(r.dati),
    creatoIl: r.creato_il || '',
  }
}

// -- lettura -----------------------------------------------------------------

/**
 * I profili che posso vedere: il mio, e quelli delle persone a cui sono legato
 * (amici, richieste in ballo, il mio PT, i miei atleti). Il filtro non e' qui:
 * lo applica il database. Quello che torna e' esattamente cio' che l'app
 * chiamava `utenti` prima del cloud, e per cui il resto del codice e' gia'
 * scritto.
 */
export async function leggiProfiliCollegati() {
  const { data, error } = await supabase
    .from('profili')
    .select('id, nome, ruolo, codice_pt, codice_amico, pt_id, associato_il, dati, creato_il')
  if (error) {
    console.warn('Lettura profili collegati fallita', error.message)
    return null
  }
  return data.map(profiloDaRiga)
}

export async function leggiRelazioni() {
  const { data, error } = await supabase.from('relazioni').select('*')
  if (error) {
    console.warn('Lettura relazioni fallita', error.message)
    return null
  }
  return data.map(relazioneDaRiga)
}

export async function leggiCondivisioni() {
  const { data, error } = await supabase
    .from('condivisioni')
    .select('*')
    .order('creata_il', { ascending: false })
  if (error) {
    console.warn('Lettura condivisioni fallita', error.message)
    return null
  }
  return data.map(condivisioneDaRiga)
}

// -- trovare qualcuno --------------------------------------------------------

/**
 * Cerca per CODICE AMICO o per NOME ESATTO. Niente ricerca parziale: e' la
 * scelta presa con l'utente, e vive nel database (funzione `cerca_persona`).
 * @returns {Promise<{id:string,nome:string,come:'codice'|'nome'}[]>}
 */
export async function cercaPersona(chiave) {
  const { trovati } = await cercaPersonaEsito(chiave)
  return trovati
}

/**
 * Come cercaPersona, ma dice anche PERCHE' non ha trovato.
 *
 * ⚠️ "Non c'e' nessuno con quel codice" e "non sono riuscito a chiedere" sono
 * cose opposte. Nella ricerca a mano la differenza si puo' ingoiare — chi
 * cerca riprova; in registrazione no: dire "codice non riconosciuto" a chi ha
 * scritto il codice giusto sotto la metropolitana lo manda a correggere una
 * cosa che era gia' corretta.
 *
 * Torna { ok, trovati, errore }: `ok:false` vuol dire che la domanda non e'
 * partita, non che la risposta era vuota.
 */
export async function cercaPersonaEsito(chiave) {
  const q = String(chiave || '').trim()
  // Il database si ferma comunque sotto i 3 caratteri; fermarsi anche qui
  // evita una chiamata a ogni lettera digitata.
  if (q.length < 3) return { ok: true, trovati: [] }
  const { data, error } = await supabase.rpc('cerca_persona', { chiave: q })
  if (error) {
    console.warn('Ricerca fallita', error.message)
    return { ok: false, trovati: [], errore: messaggioErrore(error) }
  }
  return { ok: true, trovati: data || [] }
}

// -- l'username --------------------------------------------------------------

/** Minuscole, lettere numeri e underscore: la stessa forma che vuole il database. */
export function normalizzaUsername(v) {
  return String(v || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

/** La forma va bene? Il "e' gia' preso" lo sa solo il server. */
export function usernameBenFormato(v) {
  return /^[a-z0-9_]{3,20}$/.test(normalizzaUsername(v))
}

/**
 * E' libero? Si chiede mentre uno scrive, invece di far scoprire il doppione
 * dopo aver salvato.
 * ⚠️ `ok:false` vuol dire che la domanda non e' partita, non che la risposta
 * era "occupato": chi scrive sotto la metropolitana non deve vedersi rifiutare
 * un username che era libero.
 */
export async function usernameDisponibile(v) {
  const u = normalizzaUsername(v)
  if (!usernameBenFormato(u)) return { ok: true, libero: false, errore: '' }
  const { data, error } = await supabase.rpc('username_disponibile', { p_username: u })
  if (error) {
    console.warn('Controllo username fallito', error.message)
    return { ok: false, libero: false, errore: messaggioErrore(error) }
  }
  return { ok: true, libero: !!data, errore: '' }
}

/**
 * Cambia il proprio username.
 * ⚠️ Il doppione lo rifiuta il DATABASE (indice unico), non questo controllo:
 * fra il "e' libero" di un attimo fa e il salvataggio qualcun altro puo'
 * averlo preso. Qui si traduce solo l'errore in una frase leggibile.
 */
export async function impostaUsername(v) {
  const u = normalizzaUsername(v)
  if (!usernameBenFormato(u)) {
    return { ok: false, errore: 'Da 3 a 20 caratteri: lettere, numeri e underscore.' }
  }
  const { error } = await supabase.from('profili').update({ username: u }).eq('id', (await supabase.auth.getUser()).data?.user?.id)
  if (error) {
    const doppione = error.code === '23505' || /duplicate|unique/i.test(error.message || '')
    return {
      ok: false,
      errore: doppione ? 'Questo username è già di qualcun altro.' : messaggioErrore(error),
    }
  }
  return { ok: true, username: u, errore: '' }
}

// -- trovare qualcuno, per pezzi ---------------------------------------------

/**
 * La ricerca della linguetta Cerca: username A PEZZI, nome e codici solo
 * esatti.
 *
 * ⚠️ La differenza non e' un capriccio. Un username e' una maniglia pubblica:
 * uno se lo sceglie per farsi trovare, e puo' cambiarlo. Il nome no — e'
 * come ti chiami. Cercare per pezzi di nome vorrebbe dire lasciare a chiunque
 * l'elenco completo degli iscritti, ed e' il motivo per cui `cerca_persona`
 * lo vietava. Il taglio vero lo fa `cerca_utenti` in supabase/schema.sql.
 *
 * @returns {Promise<{ok:boolean, trovati:object[], errore:string}>}
 */
export async function cercaUtenti(chiave) {
  const q = String(chiave || '').trim()
  // Il database si ferma comunque sotto i 2; fermarsi anche qui evita una
  // chiamata a ogni lettera digitata.
  if (q.length < 2) return { ok: true, trovati: [], errore: '' }
  const { data, error } = await supabase.rpc('cerca_utenti', { chiave: q })
  if (error) {
    console.warn('Ricerca utenti fallita', error.message)
    return { ok: false, trovati: [], errore: messaggioErrore(error) }
  }
  return { ok: true, trovati: data || [], errore: '' }
}

/**
 * Le persone da proporre: amici di amici e atleti dello stesso PT, mai
 * sconosciuti senza legami (vedi il commento in supabase/schema.sql).
 * @returns {Promise<{id:string,nome:string,motivo:string,amici_in_comune:number}[]>}
 */
export async function amiciSuggeriti(limite = 10) {
  const { data, error } = await supabase.rpc('amici_suggeriti', { limite })
  if (error) {
    console.warn('Suggerimenti non disponibili', error.message)
    return []
  }
  return data || []
}

/** I nomi di chi compare nello Storico (solo di chi ha qualcosa di pubblico). */
export async function nomiDi(ids) {
  const lista = [...new Set((ids || []).filter(Boolean))]
  if (!lista.length) return new Map()
  const { data, error } = await supabase.rpc('nomi_di', { ids: lista })
  if (error) {
    console.warn('Lettura nomi fallita', error.message)
    return new Map()
  }
  return new Map((data || []).map((r) => [r.id, r.nome]))
}

// -- scrittura ---------------------------------------------------------------
// Tutte tornano { ok, errore? }: chi chiama mostra l'errore, non lo interpreta.

export async function creaRelazione(rel) {
  const { error } = await supabase.from('relazioni').insert({
    id: rel.id,
    tipo: rel.tipo,
    da_id: rel.daId,
    a_id: rel.aId,
    stato: 'attesa',
  })
  if (!error) return { ok: true }
  // Il vincolo di coppia scatta se la richiesta esiste già — capita se due
  // persone si scrivono nello stesso momento, ed è un "c'è già", non un errore.
  if (error.code === '23505') return { ok: false, errore: 'La richiesta esiste già.' }
  return { ok: false, errore: messaggioErrore(error) }
}

/**
 * Accetta una richiesta. Passa da una funzione del database e non da un
 * `update` perche' accettare un ATLETA vuol dire scrivere sul profilo di
 * un'altra persona: il database lo fa per conto del PT dopo aver verificato che
 * la richiesta sia davvero per lui.
 */
export async function accettaRelazione(id) {
  const { error } = await supabase.rpc('accetta_relazione', { rel_id: id })
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
}

export async function eliminaRelazione(id) {
  const { error } = await supabase.from('relazioni').delete().eq('id', id)
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
}

export async function creaCondivisione(c) {
  const { error } = await supabase.from('condivisioni').insert({
    id: c.id,
    tipo: c.tipo,
    da_id: c.daId,
    da_nome: c.daNome || '',
    a_id: c.aId,
    titolo: c.titolo || '',
    sottotitolo: c.sottotitolo || '',
    payload: c.payload,
  })
  if (!error) return { ok: true }
  // La regola del database lascia mandare solo agli amici: se scatta, non è un
  // guasto, è la risposta giusta a una richiesta che non doveva partire.
  if (error.code === '42501') {
    return { ok: false, errore: 'Puoi mandare cose solo alle persone con cui sei amico.' }
  }
  return { ok: false, errore: messaggioErrore(error) }
}

/** Segna una condivisione come vista o come salvata. */
export async function segnaCondivisione(id, campo) {
  const colonna = campo === 'salvata' ? 'salvata_il' : 'vista_il'
  const { error } = await supabase
    .from('condivisioni')
    .update({ [colonna]: new Date().toISOString() })
    .eq('id', id)
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
}

export async function eliminaCondivisione(id) {
  const { error } = await supabase.from('condivisioni').delete().eq('id', id)
  return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
}
