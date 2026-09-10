// ---------------------------------------------------------------------------
// Archivio dei media (foto/video) degli esercizi.
//
// DUE POSTI, e servono tutti e due:
//   · **Supabase Storage** (bucket privato `media`) e' dove il file VIVE. E'
//     l'unico posto da cui puo' vederlo anche un altro telefono — che era tutto
//     il punto del cloud.
//   · **IndexedDB**, come copia locale. Non e' un'ottimizzazione: e' cio' che fa
//     comparire la miniatura NELL'ISTANTE in cui scegli la foto, invece che dopo
//     venti secondi di caricamento, ed e' cio' che la fa vedere lo stesso in
//     palestra dove la rete non c'e'. In localStorage non ci starebbe: una sola
//     foto satura la quota da ~5MB.
//
// Nel json della scheda resta il `MediaRef`: { id, tipo, nome, autore, autoreId,
// visibilita }. Il PERCORSO del file si ricava da li' — `<autoreId>/<id>` — e
// per questo `autoreId` c'e': senza, la foto di un altro non si saprebbe dove
// andarla a prendere.
//
// ⚠️ CHI PUO' SCARICARE COSA NON SI DECIDE QUI. Lo decide la regola sul bucket
// (`posso_scaricare_media` in supabase/schema.sql): una foto 'pubblica' la vede
// chi puo' vedere la scheda in cui sta. Quello che si fa qui e' non chiedere
// file che non si hanno il diritto di avere — ma se lo si chiedesse, la
// risposta sarebbe no.
//
// ⚠️ SE IL CARICAMENTO NON PARTE, il media non si perde e non si finge che sia
// andato: resta la copia locale, marcata `daCaricare`, e la miniatura lo dice
// ("solo su questo dispositivo"). `riprovaMediaInSospeso()` riparte quando
// torna la rete. E' la stessa regola del resto dell'app: rete caduta e rifiuto
// del server sono cose opposte.
//
// ⚠️ Quel flag sta SOLO nella copia locale, non nel MediaRef dentro la scheda.
// Perche' e' un fatto di QUESTO telefono — lo stesso media puo' essere gia'
// caricato e da un altro dispositivo vedersi benissimo — e perche' scriverlo
// nel json vorrebbe dire doverlo poi cancellare a caricamento riuscito, cioe'
// un secondo posto da tenere allineato (e quelli, qui dentro, sono gia'
// divergiti una volta).
// ---------------------------------------------------------------------------

import { erroreDiRete, supabase } from './supabase'

const BUCKET = 'media'

/** Il percorso del file dentro il bucket. La cartella e' chi l'ha caricato. */
export function percorsoMedia(autoreId, id) {
  return `${autoreId}/${id}`
}

const DB_NAME = 'palestra-media'
const STORE = 'media'
const VERSION = 1

let dbPromise = null

export function mediaDisponibile() {
  return typeof indexedDB !== 'undefined'
}

function apri() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

// --------------------------------------------------------- la copia locale
function conStore(modo, azione) {
  return apri().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, modo)
        const req = azione(tx.objectStore(STORE))
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error || new Error('Operazione sui media annullata'))
        if (req) req.onsuccess = () => resolve(req.result)
        else tx.oncomplete = () => resolve()
      }),
  )
}

const salvaLocale = (voce) => conStore('readwrite', (st) => st.put(voce)).then(() => voce.id)
const voceLocale = (id) => conStore('readonly', (st) => st.get(id)).then((r) => r || null)
const vociLocali = () => conStore('readonly', (st) => st.getAll()).then((r) => r || [])
const eliminaLocale = (id) => conStore('readwrite', (st) => st.delete(id))

// --------------------------------------------------- solo per gli effimeri
// ⚠️ Le foto e i video MOMENTANEI tra amici (lib/effimeri) stanno ancora qui e
// basta, cioe' funzionano solo tra due profili sullo stesso browser. Non e'
// una dimenticanza: per metterli sul cloud serve che a cancellarli sia il
// SERVER a scadenza, se no "sparisce dopo 24 ore" e' una promessa che mantiene
// il telefono di chi guarda — cioe' nessuno. Vedi docs/roadmap.md.
// Finche' e' cosi', usano il magazzino locale e nient'altro: queste tre non
// toccano ne' lo Storage ne' la tabella `media`.
export const salvaBlobLocale = (id, blob, meta = {}) => salvaLocale({ id, blob, ...meta })
export const blobLocale = (id) => voceLocale(id).then((v) => (v ? v.blob : null))
export const eliminaBlobLocale = (id) => eliminaLocale(id)

// ------------------------------------------------------------- il caricamento
// Manda su il file e scrive la riga che permettera' agli altri di scaricarlo.
// ⚠️ Prima il FILE, poi la riga. L'ordine conta: una riga senza file e' un link
// rotto per chi guarda; un file senza riga non lo scarica nessuno (la regola
// dice di no) ed e' semplicemente invisibile finche' non si ripassa di qui.
async function carica({ id, blob, autoreId, schedaId, tipo, nome, visibilita }) {
  const percorso = percorsoMedia(autoreId, id)
  const { error: e1 } = await supabase.storage
    .from(BUCKET)
    .upload(percorso, blob, { contentType: blob.type || undefined, upsert: true })
  if (e1) return { ok: false, errore: e1, diRete: erroreDiRete(e1) }

  const { error: e2 } = await supabase.from('media').upsert({
    id,
    user_id: autoreId,
    scheda_id: schedaId || null,
    percorso,
    tipo,
    nome,
    peso: blob.size,
    visibilita,
  })
  if (e2) return { ok: false, errore: e2, diRete: erroreDiRete(e2) }
  return { ok: true }
}

/**
 * Allega un media: copia locale SUBITO (la miniatura deve comparire adesso),
 * poi il caricamento.
 * @returns {Promise<{ok:boolean, soloLocale:boolean, errore:string}>}
 *   `soloLocale` = il file c'e' ma sta solo qui, e si riprovera' a mandarlo.
 */
export async function salvaMedia({ id, blob, autoreId, schedaId, tipo, nome, visibilita }) {
  const voce = { id, blob, autoreId, schedaId, tipo, nome, visibilita, daCaricare: true }
  await salvaLocale(voce)
  const esito = await carica(voce)
  if (esito.ok) {
    await salvaLocale({ ...voce, daCaricare: false })
    return { ok: true, soloLocale: false, errore: '' }
  }
  // ⚠️ Il media NON si annulla: il file ce l'hai, e si vede. Quello che cambia
  // e' cosa gli si dice — e "non e' partito" non e' "non e' stato salvato".
  console.warn('Caricamento media non riuscito', esito.errore?.message)
  return { ok: true, soloLocale: true, errore: esito.diRete ? '' : esito.errore?.message || '' }
}

/**
 * Da dove far vedere questo media.
 *
 * Prima la copia locale (istantanea, e funziona senza rete), poi il server.
 * Torna anche `soloLocale`, cioe' "ce l'hai tu e nessun altro": la miniatura lo
 * dice, invece di lasciar credere che gli amici la stiano gia' vedendo.
 *
 * @param {{id:string, autoreId?:string}} m il MediaRef dentro la scheda
 * @returns {Promise<{url:string|null, revoca:()=>void, soloLocale:boolean}>}
 */
export async function fonteMedia(m) {
  const nulla = { url: null, revoca: () => {}, soloLocale: false }
  if (!m?.id) return nulla

  const locale = await voceLocale(m.id).catch(() => null)
  if (locale?.blob) {
    const url = URL.createObjectURL(locale.blob)
    return { url, revoca: () => URL.revokeObjectURL(url), soloLocale: !!locale.daCaricare }
  }

  const autoreId = m.autoreId || locale?.autoreId
  // ⚠️ Senza `autoreId` non si sa in quale cartella cercare: si dice "non
  // disponibile" invece di tirare a indovinare.
  if (!autoreId) return nulla

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(percorsoMedia(autoreId, m.id), 3600)
  if (error || !data?.signedUrl) return nulla
  return { url: data.signedUrl, revoca: () => {}, soloLocale: false }
}

/**
 * I media rimasti su questo telefono e basta: riprova a mandarli su.
 * @returns {Promise<number>} quanti non sono partiti nemmeno stavolta
 */
export async function riprovaMediaInSospeso() {
  const voci = await vociLocali().catch(() => [])
  let rimasti = 0
  for (const v of voci) {
    if (!v.daCaricare || !v.blob || !v.autoreId) continue
    const esito = await carica(v)
    if (esito.ok) await salvaLocale({ ...v, daCaricare: false })
    else rimasti += 1
  }
  return rimasti
}

/**
 * La visibilita' di un media gia' caricato.
 * ⚠️ Va cambiata QUI e nel MediaRef dentro la scheda: la riga e' quella su cui
 * decide la regola d'accesso, il json e' quello che disegna il lucchetto. Se le
 * due divergono comanda la riga, e il file semplicemente non si scarica.
 */
export async function aggiornaVisibilitaMedia(id, visibilita) {
  const locale = await voceLocale(id).catch(() => null)
  if (locale) await salvaLocale({ ...locale, visibilita })
  const { error } = await supabase.from('media').update({ visibilita }).eq('id', id)
  if (error) {
    console.warn('Visibilita del media non aggiornata sul server', error.message)
    return { ok: false, errore: error.message }
  }
  return { ok: true, errore: '' }
}

// --------------------------------------------------------------- durata video
// I video allegati sono limitati a pochi secondi: uno di 10" pesa ~15MB in 720p
// e ~25MB in 1080p, uno di un minuto sei volte tanto. È il vincolo che decide se
// lo spazio (qui IndexedDB, domani lo Storage del cloud) basta o no.
export const DURATA_VIDEO_MAX = 10

// Un video "da 10 secondi" quasi mai dura 10,000: si accetta un po' di sbavatura
// invece di rifiutare una clip che l'utente ha ritagliato correttamente.
const TOLLERANZA_SEC = 0.5

/**
 * Durata in secondi di un file video, o **null** se non si riesce a leggerla
 * (formato che il browser non decodifica, metadati assenti, attesa troppo
 * lunga). Chi chiama tratta null come "non accettabile": se non riusciamo a
 * leggere i metadati, il video non si vedrebbe nemmeno nella miniatura.
 */
export function durataVideo(file) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    let chiuso = false
    const fine = (valore) => {
      if (chiuso) return
      chiuso = true
      clearTimeout(scadenza)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      resolve(valore)
    }
    const scadenza = setTimeout(() => fine(null), 8000)
    const leggi = () =>
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      // Certi file (tipici delle registrazioni fatte dal browser) non scrivono
      // la durata nell'intestazione: qui `duration` è Infinity finché non si
      // salta oltre la fine, che costringe il browser a calcolarla davvero.
      if (video.duration === Infinity) {
        video.ontimeupdate = () => {
          video.ontimeupdate = null
          fine(leggi())
        }
        video.currentTime = 1e9
        return
      }
      fine(leggi())
    }
    video.onerror = () => fine(null)
    video.src = url
  })
}

export function videoTroppoLungo(secondi) {
  return secondi > DURATA_VIDEO_MAX + TOLLERANZA_SEC
}

// Toglie il media da tutti i posti in cui sta: qui, sullo Storage, e la riga che
// lo rendeva scaricabile. Se il server non risponde, file e riga restano: e' un
// orfano, non un dato perso — e ripulire gli orfani e' un lavoro a parte
// (docs/roadmap.md).
export async function eliminaMedia(m) {
  const id = typeof m === 'string' ? m : m?.id
  if (!id) return
  const locale = await voceLocale(id).catch(() => null)
  const autoreId = (typeof m === 'object' && m?.autoreId) || locale?.autoreId
  await eliminaLocale(id).catch(() => {})
  if (!autoreId) return
  const { error } = await supabase.storage.from(BUCKET).remove([percorsoMedia(autoreId, id)])
  if (error) console.warn('File non rimosso dallo Storage', error.message)
  const { error: e2 } = await supabase.from('media').delete().eq('id', id)
  if (e2) console.warn('Riga del media non rimossa', e2.message)
}
