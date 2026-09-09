// ---------------------------------------------------------------------------
// Archivio dei media (foto/video) degli esercizi.
//
// I blob NON stanno in localStorage: una sola foto del telefono lo saturerebbe
// (quota ~5MB). Usiamo IndexedDB, che regge blob grandi. Nella scheda
// (localStorage) resta solo un riferimento leggero: { id, tipo, nome, autore… }
// dove `id` è la chiave del blob qui dentro.
//
// L'archivio è unico per dispositivo (condiviso tra tutti i profili): così le
// "Schede Generali" di altri utenti mostrano i loro media sullo stesso device.
// Con Supabase (Fase 2) i blob andranno su Storage e i riferimenti in tabella.
// ---------------------------------------------------------------------------

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

// Salva un blob con la chiave `id` (di solito lo stesso id del MediaRef nella
// scheda). `meta` è informativo (tipo/nome), il blob è ciò che conta.
export async function salvaMedia(id, blob, meta = {}) {
  const db = await apri()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id, blob, ...meta })
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Salvataggio media annullato'))
  })
}

// Restituisce il blob salvato, o null se assente.
export async function getMediaBlob(id) {
  const db = await apri()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result ? req.result.blob : null)
    req.onerror = () => reject(req.error)
  })
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

// Elimina un blob (quando si rimuove il media dall'esercizio).
export async function eliminaMedia(id) {
  const db = await apri()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
