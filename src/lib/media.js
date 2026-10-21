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
/**
 * Manda un file su un bucket. Vale per tutti i bucket del progetto, ed esiste
 * perché la regola qui sotto va scritta una volta sola.
 *
 * ⚠️ NIENTE `upsert: true`, e non è un dettaglio. Con quel flag lo Storage non
 * fa un insert ma un *insert-or-update* su `storage.objects`, che per passare
 * pretende anche una policy di UPDATE sul bucket. Nessuno dei bucket ce l'ha, e
 * il rifiuto torna come "new row violates row-level security policy": un
 * messaggio che parla di righe mentre il problema è il file. È il motivo per cui
 * gli allegati degli esercizi non hanno MAI funzionato da quando c'è il cloud,
 * senza che nessuno se ne accorgesse — il caricamento falliva, restava la copia
 * locale, e sul telefono di chi caricava sembrava tutto a posto (22/09/2026).
 *
 * ⚠️ Le policy di UPDATE si potrebbero aggiungere, ma sarebbero la correzione
 * sbagliata: permetterebbero di RISCRIVERE il contenuto di un file lasciando
 * intatta la riga, cioè la visibilità che qualcuno aveva scelto.
 *
 * Gli id sono UUID nuovi a ogni file (`nuovoId`), quindi un conflitto vero non
 * esiste: se il percorso risulta occupato è perché il file era già partito e la
 * riga no. Quello è un riprova, cioè lo stato che volevamo — non un errore.
 *
 * @returns {Promise<{ok:boolean, errore:object|null, diRete:boolean}>}
 */
export async function caricaFile(bucket, percorso, blob, opzioni = {}) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(percorso, blob, { contentType: blob?.type || undefined, ...opzioni })
  if (!error) return { ok: true, errore: null, diRete: false }
  const giaCaricato = error.statusCode === '409' || /exists/i.test(error.message || '')
  if (giaCaricato) return { ok: true, errore: null, diRete: false }
  return { ok: false, errore: error, diRete: erroreDiRete(error) }
}

async function carica({ id, blob, autoreId, schedaId, tipo, nome, visibilita }) {
  const percorso = percorsoMedia(autoreId, id)
  const esitoFile = await caricaFile(BUCKET, percorso, blob)
  if (!esitoFile.ok) return { ok: false, errore: esitoFile.errore, diRete: esitoFile.diRete }

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

// ------------------------------------------------------------ foto più leggere
/**
 * Una foto rimpicciolita e ricompressa in JPEG, per le cose che non servono a
 * piena risoluzione (le foto dei commenti). Una foto del telefono pesa 3-6MB;
 * così, al lato lungo di 1600px, 200-400KB — e lo spazio è quello del progetto
 * Supabase di tutti. Se è già piccola resta com'è.
 * @param {Blob} file
 * @param {{lato?:number, qualita?:number}} [opts]
 * @returns {Promise<Blob>}
 */
export async function rimpicciolisciImmagine(file, { lato = 1600, qualita = 0.82 } = {}) {
  // `imageOrientation` raddrizza le foto scattate col telefono di traverso:
  // senza, una foto verticale arriva coricata.
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scala = Math.min(1, lato / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scala)
  const h = Math.round(bmp.height * scala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const blob = await new Promise((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Immagine vuota'))), 'image/jpeg', qualita),
  )
  // Già leggera in partenza (una PNG piccola, uno screenshot): non si peggiora.
  return blob.size < file.size ? blob : file
}

// --------------------------------------------------------------- durata video
// I video allegati sono limitati a pochi secondi: uno di 10" pesa ~15MB in 720p
// e ~25MB in 1080p, uno di un minuto sei volte tanto. È il vincolo che decide se
// lo spazio (IndexedDB e lo Storage del cloud) basta o no. Vale OVUNQUE ci sia
// un video: allegati degli esercizi, foto degli allenamenti e dei progressi,
// invii momentanei. Dal 2026-10-13 sono 30" (prima 10"): ~45MB in 720p, ~75MB
// in 1080p, sotto i 200MB dei bucket (supabase/schema.sql).
export const DURATA_VIDEO_MAX = 30

// Un video "da 30 secondi" quasi mai dura 30,000: si accetta un po' di sbavatura
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

// ------------------------------------------------------- video più leggeri
// Un video del telefono è 1080p o 4K a 10-20 Mbit/s: 30 secondi fanno 40-75MB,
// che nel feed, sotto rete mobile, arrivano a scatti (o non partono). Prima di
// caricarlo lo si rifà a 720p e ~2,5 Mbit/s (H.264, l'audio copiato o in AAC):
// ~10MB per 30 secondi, e si vede bene su uno schermo di telefono.
// Lo fa il telefono di chi lo carica, con l'encoder del browser (WebCodecs, via
// Mediabunny, che si scarica solo qui). ⚠️ Se il browser non ce la fa (manca
// l'encoder, file strano, errore a metà) si carica l'ORIGINALE: comprimere è un
// di più, non deve mai impedire di allegare un video.
const LATO_VIDEO = 1280
const BITRATE_VIDEO = 2_500_000
// Sotto questo peso non vale la pena: è già leggero.
const VIDEO_GIA_LEGGERO = 5 * 1024 * 1024

/**
 * Le misure di uscita: il lato lungo al massimo `lato`, mai ingrandito, e
 * numeri pari (H.264 non ne vuole di dispari). Null = va bene com'è.
 */
export function misureVideo(larghezza, altezza, lato = LATO_VIDEO) {
  const lungo = Math.max(larghezza, altezza)
  if (!lungo || lungo <= lato) return null
  const pari = (n) => Math.max(2, Math.round(n / 2) * 2)
  const scala = lato / lungo
  return { width: pari(larghezza * scala), height: pari(altezza * scala) }
}

/**
 * Il video rifatto più leggero, o l'originale se non serve o non si riesce.
 * @param {Blob} file
 * @param {{ onProgresso?: (frazione: number) => void }} [opts]
 * @returns {Promise<Blob>}
 */
export async function comprimiVideo(file, { onProgresso } = {}) {
  if (!file || file.size < VIDEO_GIA_LEGGERO || typeof VideoEncoder === 'undefined') return file
  try {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality } =
      await import('mediabunny')
    const output = new Output({
      // L'indice in testa al file: il video parte mentre si scarica ancora.
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    })
    const conversione = await Conversion.init({
      input: new Input({ source: new BlobSource(file), formats: ALL_FORMATS }),
      output,
      showWarnings: false,
      video: async (traccia) => ({
        codec: 'avc',
        quality: new Quality({ bitrate: BITRATE_VIDEO }),
        ...(misureVideo(await traccia.getDisplayWidth(), await traccia.getDisplayHeight()) || {}),
        fit: 'fill',
      }),
      audio: { codec: 'aac' },
    })
    // Senza la traccia video (encoder che manca) uscirebbe solo l'audio.
    if (!conversione.isValid || !conversione.utilizedTracks.some((t) => t.isVideoTrack())) return file
    conversione.onProgress = (p) => onProgresso?.(p)
    await conversione.execute()
    const leggero = new Blob([output.target.buffer], { type: 'video/mp4' })
    // Già compresso bene in partenza: si tiene quello.
    return leggero.size < file.size * 0.8 ? leggero : file
  } catch (e) {
    console.warn('Video non compresso, carico l’originale', e?.message)
    return file
  }
}

// ------------------------------------------------------- lo sfondo che si muove
// Un video come SFONDO del recap (components/SceltaSpezzone): non il video
// intero ma 6 secondi scelti da chi lo carica, muti, a 480p. Sotto il velo del
// recap la qualità basta, e pesa ~1MB: nel feed parte subito e gira in loop.
// Il video intero, se lo si vuole, si allega a parte (Foto e video).
export const DURATA_SPEZZONE = 6
const LATO_SPEZZONE = 854
const BITRATE_SPEZZONE = 1_200_000

/**
 * Lo sfondo video può muoversi? No con "riduci movimento" o col risparmio
 * dati del telefono: lì resta il fotogramma (PostSchermo, RecapCartolina).
 */
export function sfondoPuoMuoversi() {
  if (typeof window === 'undefined') return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData
}

/** Si può ritagliare un video su questo browser? (WebCodecs) */
export const puoRitagliareVideo = () => typeof VideoEncoder !== 'undefined'

/**
 * I `durata` secondi da `inizio`, muti, a 480p e ~1,2 Mbit/s.
 * ⚠️ Qui niente ripiego sull'originale (come comprimiVideo): uno sfondo da
 * 30 secondi in alta qualità sarebbe proprio quello che si vuole evitare.
 * Se non si riesce, l'errore arriva a chi chiama, che lo dice.
 * @returns {Promise<Blob>} un MP4
 */
export async function spezzoneVideo(file, inizio, { durata = DURATA_SPEZZONE, onProgresso } = {}) {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality } =
    await import('mediabunny')
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const conversione = await Conversion.init({
    input: new Input({ source: new BlobSource(file), formats: ALL_FORMATS }),
    output,
    showWarnings: false,
    trim: { start: Math.max(0, inizio), end: Math.max(0, inizio) + durata },
    video: async (traccia) => ({
      codec: 'avc',
      quality: new Quality({ bitrate: BITRATE_SPEZZONE }),
      ...(misureVideo(await traccia.getDisplayWidth(), await traccia.getDisplayHeight(), LATO_SPEZZONE) || {}),
      fit: 'fill',
    }),
    audio: { discard: true },
  })
  if (!conversione.isValid || !conversione.utilizedTracks.some((t) => t.isVideoTrack())) {
    throw new Error('Questo video non si riesce a ritagliare')
  }
  conversione.onProgress = (p) => onProgresso?.(p)
  await conversione.execute()
  return new Blob([output.target.buffer], { type: 'video/mp4' })
}

/**
 * Un fotogramma del video (a mezzo secondo, o a metà se è più corto), come
 * JPEG col lato lungo al massimo `lato`: l'anteprima che si vede mentre il
 * video arriva. `src` è il file o un indirizzo: da un indirizzo il browser
 * scarica solo il pezzo che serve, non tutto il video. ⚠️ Un indirizzo di un
 * altro dominio deve rispondere con CORS (lo Storage lo fa), se no la canvas
 * resta "sporca" e non si legge.
 * @returns {Promise<Blob>}
 */
export async function fotogrammaVideo(src, opzioni = {}) {
  // ⚠️ Prima la decodifica diretta (WebCodecs, via Mediabunny). Col <video>
  // nascosto, su Chrome per Android il fotogramma letto subito dopo il salto
  // poteva non essere ancora pronto: usciva NERO (lo sfondo video nel
  // riepilogo, 78ª). Il <video> resta per i browser senza WebCodecs.
  if (typeof VideoDecoder !== 'undefined') {
    try {
      return await fotogrammaDecodificato(src, opzioni)
    } catch (e) {
      console.warn('Fotogramma: provo col <video>', e?.message)
    }
  }
  return fotogrammaDaVideo(src, opzioni)
}

async function fotogrammaDecodificato(src, { lato = 1080, qualita = 0.8 } = {}) {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input, UrlSource } = await import('mediabunny')
  const input = new Input({
    source: typeof src === 'string' ? new UrlSource(src) : new BlobSource(src),
    formats: ALL_FORMATS,
  })
  try {
    const traccia = await input.getPrimaryVideoTrack()
    if (!traccia || !(await traccia.canDecode())) throw new Error('Video non decodificabile')
    const larghezza = await traccia.getDisplayWidth()
    const altezza = await traccia.getDisplayHeight()
    const misure = misureVideo(larghezza, altezza, lato) || { width: larghezza, height: altezza }
    const sink = new CanvasSink(traccia, { ...misure, fit: 'fill' })
    const inizio = await traccia.getFirstTimestamp()
    const fine = await traccia.computeDuration()
    const quadro = await sink.getCanvas(inizio + Math.min(0.5, Math.max(0, fine - inizio) / 2))
    if (!quadro) throw new Error('Nessun fotogramma')
    const c = quadro.canvas
    if (c.convertToBlob) return await c.convertToBlob({ type: 'image/jpeg', quality: qualita })
    return await new Promise((ok, ko) =>
      c.toBlob((b) => (b ? ok(b) : ko(new Error('Fotogramma vuoto'))), 'image/jpeg', qualita),
    )
  } finally {
    input.dispose?.()
  }
}

function fotogrammaDaVideo(src, { lato = 1080, qualita = 0.8 } = {}) {
  return new Promise((ok, ko) => {
    const daFile = typeof src !== 'string'
    const url = daFile ? URL.createObjectURL(src) : src
    const video = document.createElement('video')
    let chiuso = false
    const fine = (errore, blob) => {
      if (chiuso) return
      chiuso = true
      clearTimeout(scadenza)
      video.removeAttribute('src')
      video.load()
      if (daFile) URL.revokeObjectURL(url)
      if (errore) ko(errore)
      else ok(blob)
    }
    const scadenza = setTimeout(() => fine(new Error('Video troppo lento')), 15000)
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
      video.currentTime = Math.min(0.5, d / 2)
    }
    // Un attimo dopo il salto: subito, il fotogramma può non esserci ancora.
    video.onseeked = () => setTimeout(disegna, 150)
    const disegna = () => {
      if (chiuso) return
      const scala = Math.min(1, lato / Math.max(video.videoWidth, video.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(video.videoWidth * scala)
      canvas.height = Math.round(video.videoHeight * scala)
      if (!canvas.width || !canvas.height) return fine(new Error('Video senza immagine'))
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => (b ? fine(null, b) : fine(new Error('Fotogramma vuoto'))), 'image/jpeg', qualita)
    }
    video.onerror = () => fine(new Error('Video illeggibile'))
    video.src = url
  })
}

export function videoTroppoLungo(secondi) {
  return secondi > DURATA_VIDEO_MAX + TOLLERANZA_SEC
}

// --------------------------------------------------------------- peso del file
// Il tetto vero non è dei bucket (200MB, supabase/schema.sql) ma del PROGETTO:
// Supabase → Storage → Settings → "Upload file size limit", 50MB sul piano
// gratuito, e vale sopra a tutto. Un file più pesante il server lo rifiuta
// dopo averlo caricato tutto; qui lo si dice subito, con il motivo.
// Un video da 30" in 720p (~45MB) ci sta; in 1080p (~75MB) no: si gira in
// 720p o lo si accorcia. Se un giorno il piano cambia, si alza qui.
export const PESO_FILE_MAX_MB = 50
const PESO_FILE_MAX_BYTE = PESO_FILE_MAX_MB * 1024 * 1024

export function fileTroppoPesante(file) {
  return (file?.size || 0) > PESO_FILE_MAX_BYTE
}

/** "\"clip.mov\" pesa 74MB: il massimo è 50MB. …" — uguale in tutta l'app. */
export function messaggioTroppoPesante(file) {
  const mb = Math.ceil((file?.size || 0) / (1024 * 1024))
  const video = String(file?.type || '').startsWith('video')
  return (
    `"${file?.name || 'Il file'}" pesa ${mb}MB: il massimo è ${PESO_FILE_MAX_MB}MB.` +
    (video ? ' Accorcialo, oppure giralo in 720p invece che in 1080p o 4K (su iPhone: Impostazioni → Fotocamera → Registra video).' : '')
  )
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
