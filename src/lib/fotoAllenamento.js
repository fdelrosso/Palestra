// ---------------------------------------------------------------------------
// Le foto di un ALLENAMENTO: quelle che si sfogliano scorrendo la scheda di
// recap nel Feed.
//
// La quarta cosa fatta di file, dopo gli allegati degli esercizi (lib/media),
// gli effimeri (lib/effimeri) e il check del fisico (lib/progressi). Bucket a
// parte come le altre, perché la regola d'accesso è un'altra ancora: qui
// "pubblica" vuol dire pubblica davvero, la vede chiunque scorra il feed.
//
// ⚠️ COME SI LEGA ALL'ALLENAMENTO. I completamenti non sono righe: stanno nel
// json di `schede.dati`. Quindi niente chiave esterna, si usa una chiave di
// testo — `<schedaId>|<data ISO>` — che è la stessa coppia con cui l'app già
// riconosce un allenamento (voceStorico in lib/storico). La data è la STRINGA
// esatta del json: non si converte, perché un giro di conversione e mezzo fuso
// orario basterebbero a non ritrovare più le foto.
//
// ⚠️ La visibilità è della FOTO, non ereditata dall'allenamento: una regola di
// sicurezza non può guardare dentro un json in modo affidabile. L'app tiene
// allineate le due cose quando si pubblica, ma nel dubbio comanda la riga.
// ---------------------------------------------------------------------------

import { erroreDiRete, supabase } from './supabase'
import {
  blobLocale,
  caricaFile,
  comprimiVideo,
  eliminaBlobLocale,
  fotogrammaVideo,
  rimpicciolisciImmagine,
  salvaBlobLocale,
} from './media'

const BUCKET = 'allenamenti'
const TABELLA = 'allenamento_foto'
const KEY_SOSPESI = 'palestra-foto-allenamento-sospese'

export const VISIBILITA_FOTO_ALL = { PRIVATA: 'privata', PUBBLICA: 'pubblica' }

/**
 * La chiave di un allenamento: la sua riga in `allenamenti`, e ciò a cui si
 * legano foto, mi piace e commenti. Dalla 106ª è il suo `id`, che nasce con
 * lui e non cambia più — nemmeno correggendo la data.
 * Il ripiego '<schedaId>|<data ISO>' (la chiave di prima) vale solo per un
 * allenamento che l'id non ce l'ha ancora: una copia locale di prima della
 * 106ª, finché il server non risponde. Il database lo riconosce (`chiave_vecchia`).
 * @param {{id?:string, schedaId?:string, data:string}} voce
 */
export function chiaveAllenamento(voce) {
  if (voce?.id) return voce.id
  if (!voce?.data) return ''
  return `${voce.schedaId || ''}|${voce.data}`
}

function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'fa-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

// ------------------------------------------------------ la coda dei sospesi
// Come per il check del fisico: in localStorage solo i DATI della riga, il file
// sta in IndexedDB sotto lo stesso id.
function sospese() {
  try {
    const raw = localStorage.getItem(KEY_SOSPESI)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.warn('Lettura delle foto in sospeso fallita', e)
  }
  return []
}

function salvaSospese(righe) {
  try {
    localStorage.setItem(KEY_SOSPESI, JSON.stringify(righe))
  } catch (e) {
    console.warn('Salvataggio delle foto in sospeso fallito', e)
  }
}

const aggiungiSospesa = (riga) => salvaSospese([...sospese().filter((r) => r.id !== riga.id), riga])
const togliSospesa = (id) => salvaSospese(sospese().filter((r) => r.id !== id))

/** Le foto di questo allenamento rimaste solo su questo telefono. */
export function fotoSoloLocali(chiave) {
  return sospese()
    .filter((r) => r.allenamento_key === chiave)
    .map((r) => ({ ...r, soloLocale: true }))
}

// ------------------------------------------------------------ il caricamento
// ⚠️ Prima il FILE, poi la riga: una riga senza file è una miniatura rotta per
// chi scorre il feed; un file senza riga è solo invisibile.
// La visibilità vera è quella che rende il database: una foto di un
// allenamento già pubblico nasce pubblica (trigger foto_nasce_come_allenamento)
// anche se qui era privata, come gli allegati della sessione e lo sfondo, che
// si caricano dopo il "Salva". Fidandosi della riga di qui la copia da feed
// non si faceva, e arrivava ore dopo con completaCopieFeed: intanto chi
// guardava il video lo prendeva col link firmato.
async function carica(riga, blob) {
  const esitoFile = await caricaFile(BUCKET, riga.percorso, blob)
  if (!esitoFile.ok) return { ok: false, errore: esitoFile.errore, diRete: esitoFile.diRete }
  const { data, error } = await supabase.from(TABELLA).upsert(riga).select('visibilita').maybeSingle()
  if (error) return { ok: false, errore: error, diRete: erroreDiRete(error) }
  if (data?.visibilita) riga.visibilita = data.visibilita
  if (riga.visibilita === VISIBILITA_FOTO_ALL.PUBBLICA) assicuraCopiaFeed(riga)
  return { ok: true }
}

/**
 * Attacca una foto o un video a un allenamento.
 *
 * @param {object} p
 * @param {Blob}   p.blob
 * @param {string} p.userId    chi ha fatto l'allenamento (= la cartella)
 * @param {string} p.chiave    da `chiaveAllenamento(voce)`
 * @param {'foto'|'video'} [p.tipo]
 * @param {string} [p.nome]
 * @param {number} [p.posizione] l'ordine in cui si sfoglia
 * @param {string} [p.visibilita] 'pubblica' la pubblica col feed
 * @param {(frazione:number) => void} [p.onCompressione] quanto manca a
 *   comprimere il video (lib/media, comprimiVideo)
 * @param {boolean} [p.comprimi] falso per un video già compresso (lib/mediaSessione)
 * @returns {Promise<{ok:boolean, riga:object, soloLocale:boolean, errore:string}>}
 */
export async function aggiungiFotoAllenamento({
  blob: originale,
  userId,
  chiave,
  tipo = 'foto',
  nome = '',
  posizione = 0,
  visibilita = VISIBILITA_FOTO_ALL.PRIVATA,
  onCompressione,
  comprimi = true,
}) {
  // Una foto del telefono (12-48 megapixel) non serve intera: nel feed è
  // grande quanto lo schermo. A 2048px sul lato lungo pesa un decimo, e
  // soprattutto chi la guarda non deve decodificarne una enorme (vedi
  // fonteFotoLeggera). I video si rifanno a 720p (comprimiVideo): nel feed un
  // video da 36MB sotto rete mobile non partiva.
  const blob =
    tipo === 'foto'
      ? await rimpicciolisciImmagine(originale, { lato: 2048, qualita: 0.85 }).catch(() => originale)
      : comprimi
        ? await comprimiVideo(originale, { onProgresso: onCompressione })
        : originale
  const id = nuovoId()
  const riga = {
    id,
    user_id: userId,
    allenamento_key: chiave,
    percorso: `${userId}/${id}`,
    tipo,
    nome,
    peso: blob.size,
    posizione,
    visibilita:
      visibilita === VISIBILITA_FOTO_ALL.PUBBLICA
        ? VISIBILITA_FOTO_ALL.PUBBLICA
        : VISIBILITA_FOTO_ALL.PRIVATA,
  }

  // La copia locale SUBITO: la miniatura deve comparire adesso.
  await salvaBlobLocale(id, blob, { kind: 'allenamento' }).catch(() => {})

  const esito = await carica(riga, blob)
  if (esito.ok) {
    togliSospesa(id)
    return { ok: true, riga, soloLocale: false, errore: '' }
  }
  aggiungiSospesa(riga)
  console.warn('Caricamento della foto non riuscito', esito.errore?.message)
  return {
    ok: true,
    riga: { ...riga, soloLocale: true },
    soloLocale: true,
    errore: esito.diRete ? '' : esito.errore?.message || '',
  }
}

/**
 * Le foto di TANTI allenamenti in un colpo solo: il Feed ne mostra venti per
 * schermata, e una richiesta per allenamento sarebbe venti richieste.
 *
 * ⚠️ Cosa torna lo decide il database: le proprie sempre, quelle degli altri
 * solo se pubblicate. Qui non si filtra niente.
 *
 * @param {string[]} chiavi
 * @returns {Promise<Record<string, object[]>>} chiave -> foto ordinate
 */
export async function fotoDiAllenamenti(chiavi) {
  const elenco = [...new Set((chiavi || []).filter(Boolean))]
  if (elenco.length === 0) return {}
  const { data, error } = await supabase
    .from(TABELLA)
    .select('*')
    .in('allenamento_key', elenco)
    .order('posizione', { ascending: true })
  if (error) {
    console.warn('Lettura delle foto degli allenamenti non riuscita', error.message)
    return {}
  }
  // I link per vederle, tutti in una richiesta e senza aspettarla: chi li
  // chiede prima che arrivi aspetta questa invece di farne un'altra.
  firmaFoto(data)
  const per = {}
  for (const r of data || []) {
    if (!per[r.allenamento_key]) per[r.allenamento_key] = []
    per[r.allenamento_key].push(r)
  }
  // Le sospese si aggiungono in coda: esistono, si vedono, e la miniatura dirà
  // che stanno solo qui.
  for (const chiave of elenco) {
    const locali = fotoSoloLocali(chiave)
    if (locali.length === 0) continue
    const gia = new Set((per[chiave] || []).map((r) => r.id))
    per[chiave] = [...(per[chiave] || []), ...locali.filter((r) => !gia.has(r.id))]
  }
  return per
}

// ------------------------------------------------------- i link firmati
// Il bucket non e' pubblico: ogni foto si vede con un link firmato. Uno per
// foto, tenuto per la sessione: sempre lo STESSO indirizzo, cosi' la cache del
// browser lo ritrova. ⚠️ Prima se ne chiedeva uno nuovo (token nuovo) a ogni
// foto mostrata: una richiesta in piu' per foto, e tornando su un post la foto
// si riscaricava da capo. `fotoDiAllenamenti` li chiede tutti insieme.
const DURATA_LINK = 3600
const firmati = new Map() // percorso -> { scade, url: Promise<string|null> }

function firmaFoto(righe) {
  const adesso = Date.now()
  const percorsi = [
    ...new Set((righe || []).map((r) => r?.percorso).filter((p) => p && !(firmati.get(p)?.scade > adesso))),
  ]
  if (percorsi.length === 0) return
  // Un minuto di margine: un link che scade mentre la foto scarica non serve.
  const scade = adesso + (DURATA_LINK - 60) * 1000
  const richiesta = supabase.storage
    .from(BUCKET)
    .createSignedUrls(percorsi, DURATA_LINK)
    .then(({ data }) => new Map((data || []).filter((r) => r.signedUrl && !r.error).map((r) => [r.path, r.signedUrl])))
    .catch(() => new Map())
  for (const p of percorsi) firmati.set(p, { scade, url: richiesta.then((m) => m.get(p) || null) })
}

async function linkFirmato(percorso) {
  if (!percorso) return null
  firmaFoto([{ percorso }])
  const url = await firmati.get(percorso).url
  // Non riuscito (senza rete): alla prossima si richiede.
  if (!url) firmati.delete(percorso)
  return url
}

/** Da dove far vedere questa foto: prima la copia locale, poi il link firmato. */
export async function fonteFotoAllenamento(riga) {
  const nulla = { url: null, revoca: () => {} }
  if (!riga?.id) return nulla
  const blob = await blobLocale(riga.id).catch(() => null)
  if (blob) {
    const url = URL.createObjectURL(blob)
    return { url, revoca: () => URL.revokeObjectURL(url) }
  }
  const url = await linkFirmato(riga.percorso)
  return url ? { url, revoca: () => {} } : nulla
}

// ------------------------------------------------------- foto da guardare
// La foto per lo SCHERMO: una copia rimpicciolita (lato lungo `lato`), fatta
// sul telefono una volta e tenuta finché qualcuno la mostra.
//
// ⚠️ Perché: sull'iPhone le foto caricate prima del 2026-10-20 arrivano
// intere (12-48 megapixel: 50-200MB una volta decodificate). Nel feed ce ne
// sono più d'una vicino allo schermo, sopra uno sfondo animato: Safari finisce
// la memoria grafica e smette di disegnare gli strati — il post resta col solo
// colore, senza recap e senza foto. Sul computer la memoria basta e non
// succede. Rimpicciolita a 1280px una foto ne occupa ~9MB.
// Si rimpicciolisce una alla volta (`coda`): decodificarne tre enormi insieme è
// proprio il picco da evitare. ⚠️ Lo SCARICAMENTO invece no: fino al
// 2026-10-21 anche quello stava in coda, una foto dopo l'altra per tutto il
// feed, e la foto del post sullo schermo aspettava quelle dei post prima — che
// intanto sembrava senza sfondo. Se non si riesce a rimpicciolire, si usa
// quella intera.
const leggere = new Map()
let coda = Promise.resolve()

function inCoda(lavoro) {
  const turno = coda.then(lavoro)
  coda = turno.catch(() => {})
  return turno
}

async function preparaLeggera(riga, lato) {
  const blob = await scaricaOriginale(riga)
  if (!blob) return null
  const piccola = await inCoda(() => rimpicciolisciImmagine(blob, { lato, qualita: 0.85 })).catch(() => blob)
  const url = URL.createObjectURL(piccola)
  return { url, revoca: () => URL.revokeObjectURL(url) }
}

/**
 * Come fonteFotoAllenamento, ma per mostrare una FOTO a schermo (non un
 * video, non un file da salvare): la copia leggera. `revoca` va chiamato
 * quando non la si mostra più; l'ultimo che la lascia la butta.
 * @returns {Promise<{url:string|null, revoca:() => void}>}
 */
export async function fonteFotoLeggera(riga, { lato = 1280 } = {}) {
  if (!riga?.id) return { url: null, revoca: () => {} }
  const chiave = `${riga.id}@${lato}`
  let voce = leggere.get(chiave)
  if (!voce) {
    voce = { refs: 0, promessa: preparaLeggera(riga, lato).catch(() => null) }
    leggere.set(chiave, voce)
  }
  voce.refs += 1
  const pronta = await voce.promessa
  let lasciata = false
  const lascia = () => {
    if (lasciata) return
    lasciata = true
    voce.refs -= 1
    if (voce.refs <= 0) {
      if (leggere.get(chiave) === voce) leggere.delete(chiave)
      pronta?.revoca()
    }
  }
  // Non si è riusciti (senza rete, file sparito): la strada di sempre.
  if (!pronta) {
    lascia()
    return fonteFotoAllenamento(riga)
  }
  return { url: pronta.url, revoca: lascia }
}

/** Pubblica o nasconde una foto già caricata. */
export async function aggiornaVisibilitaFotoAllenamento(id, visibilita) {
  const v =
    visibilita === VISIBILITA_FOTO_ALL.PUBBLICA
      ? VISIBILITA_FOTO_ALL.PUBBLICA
      : VISIBILITA_FOTO_ALL.PRIVATA
  const inCoda = sospese().find((r) => r.id === id)
  if (inCoda) aggiungiSospesa({ ...inCoda, visibilita: v })
  const { data, error } = await supabase.from(TABELLA).update({ visibilita: v }).eq('id', id).select('id, percorso, tipo, nome')
  if (error) {
    console.warn('Visibilita della foto non aggiornata', error.message)
    return { ok: false, errore: error.message }
  }
  // La copia da feed segue: c'e' solo finche' la foto e' pubblica.
  for (const r of data || []) {
    if (v === VISIBILITA_FOTO_ALL.PUBBLICA) assicuraCopiaFeed(r)
    else togliCopiaFeed(r.percorso)
  }
  return { ok: true, errore: '' }
}

/**
 * Porta tutte le foto di un allenamento alla visibilità data. Serve a chi
 * sceglie la visibilità e se ne va subito (l'ultimo passo del riepilogo):
 * lì il pannello delle foto, che di solito le allinea, non c'è più.
 * Se una non va (senza rete) la riallinea il pannello alla prossima apertura.
 */
export async function allineaVisibilitaFotoAllenamento(chiave, visibilita) {
  const righe = (await fotoDiAllenamenti([chiave]))[chiave] || []
  await Promise.all(
    righe
      .filter((r) => r.visibilita !== visibilita)
      .map((r) => aggiornaVisibilitaFotoAllenamento(r.id, visibilita)),
  )
}

/** Toglie la foto da tutti i posti in cui sta. */
export async function eliminaFotoAllenamento(riga) {
  const id = typeof riga === 'string' ? riga : riga?.id
  if (!id) return { ok: false, errore: 'Foto senza id' }
  await eliminaBlobLocale(id).catch(() => {})
  togliSospesa(id)
  const percorso = typeof riga === 'object' ? riga?.percorso : null
  if (percorso) {
    togliCopiaFeed(percorso)
    const { error } = await supabase.storage.from(BUCKET).remove([percorso])
    if (error) console.warn('File non rimosso dallo Storage', error.message)
  }
  const { error } = await supabase.from(TABELLA).delete().eq('id', id)
  if (error) return { ok: false, errore: error.message }
  return { ok: true, errore: '' }
}

/** Le foto rimaste su questo telefono: riprova a mandarle. */
export async function riprovaFotoInSospeso() {
  let rimaste = 0
  for (const riga of sospese()) {
    const blob = await blobLocale(riga.id).catch(() => null)
    if (!blob) {
      togliSospesa(riga.id)
      continue
    }
    const esito = await carica(riga, blob)
    if (esito.ok) togliSospesa(riga.id)
    else rimaste += 1
  }
  return rimaste
}

/**
 * Toglie TUTTE le foto di un allenamento: quando lo si cancella. Senza, i
 * file resterebbero nello Storage appesi a un allenamento che non c'è più —
 * invisibili, e a occupare spazio per sempre.
 * ⚠️ Non va chiamata da "Riprendi l'allenamento", che cancella il
 * completamento solo per riscriverlo al prossimo "Termina", con lo stesso id:
 * le foto lo ritrovano lì.
 */
export async function eliminaFotoDiAllenamento(chiave) {
  if (!chiave) return { ok: true }
  const per = await fotoDiAllenamenti([chiave])
  const righe = per[chiave] || []
  const esiti = await Promise.all(righe.map((r) => eliminaFotoAllenamento(r)))
  const ko = esiti.filter((e) => !e.ok)
  return { ok: ko.length === 0, errore: ko[0]?.errore || '' }
}

// ------------------------------------------------------- la copia da feed
// Per ogni foto PUBBLICA una copia piccola nel bucket pubblico `feed` (per un
// video, un suo fotogramma), allo stesso percorso (supabase/schema.sql). Il
// feed la mostra con `urlFeed`, un indirizzo che si calcola qui senza chiedere
// niente: niente link firmato, niente foto intera da rimpicciolire sul
// telefono, e la cache del browser la tiene per un giorno (il file non cambia
// mai: id nuovo, file nuovo). Se la copia non c'e' (foto vecchia,
// privata, appena caricata) l'<img> fallisce e si torna a fonteFotoLeggera.
// ⚠️ Pubblico vuol dire visibile a chi ha l'indirizzo: la copia c'e' solo
// finche' la foto e' pubblica, e la scrive (e la toglie) solo il proprietario.
const BUCKET_FEED = 'feed'
const LATO_FEED = 1080

/** L'indirizzo della copia da feed. Nessuna richiesta: si calcola. */
export function urlFeed(percorso) {
  return percorso ? supabase.storage.from(BUCKET_FEED).getPublicUrl(percorso).data.publicUrl : null
}

// I VIDEO PUBBLICI: la loro copia da feed sono DUE file, il fotogramma allo
// stesso percorso e il video stesso accanto, con `.mp4`. Così chi guarda lo
// prende dalla CDN (in cache, e nella quota "cached" a parte) invece che col
// link firmato, che ogni volta si conta intero. 78ª: lo SFONDO CHE SI MUOVE,
// una riga video col nome NOME_SFONDO_VIDEO (lo spezzone di 6 secondi, lib/
// media spezzoneVideo; dividiFoto lo riconosce così). 83ª: anche i video
// ALLEGATI, se già leggeri (compressi, sotto MAX_VIDEO_FEED).
// ⚠️ La copia del video si fa SOLO dal file sul telefono di chi l'ha caricato:
// scaricarlo apposta per copiarlo costerebbe proprio il traffico da evitare.
// Un video senza copia (vecchio, caricato da un altro telefono) resta col
// link firmato. Unica eccezione lo spezzone di uno sfondo, che pesa ~1MB.
export const NOME_SFONDO_VIDEO = 'sfondo-video.mp4'
export const eSfondoVideo = (riga) => riga?.tipo === 'video' && riga?.nome === NOME_SFONDO_VIDEO
// Come `file_size_limit` del bucket `feed` (supabase/schema.sql).
const MAX_VIDEO_FEED = 15 * 1024 * 1024
const percorsoVideoFeed = (percorso) => `${percorso}.mp4`

/** Il video pubblico (allegato o sfondo). Nessuna richiesta: si calcola. */
export const urlVideoFeed = (percorso) => (percorso ? urlFeed(percorsoVideoFeed(percorso)) : null)

async function copiaVideoFeed(riga) {
  let file = await blobLocale(riga.id).catch(() => null)
  if (!file && eSfondoVideo(riga)) file = await scaricaOriginale(riga)
  // Un .mov o un video non compresso il bucket non lo prende: resta privato.
  if (!file || file.size > MAX_VIDEO_FEED || file.type !== 'video/mp4') return
  const esito = await caricaFile(BUCKET_FEED, percorsoVideoFeed(riga.percorso), file, { cacheControl: '86400' })
  if (!esito.ok) console.warn('Video da feed non caricato', esito.errore?.message)
}

async function copiaEsiste(percorso) {
  try {
    const r = await fetch(urlFeed(percorso), { method: 'HEAD', cache: 'no-store' })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Crea la copia da feed se manca. Da chiamare solo per le PROPRIE foto
 * pubbliche: il bucket accetta file solo nella propria cartella.
 * @returns {Promise<boolean>} se adesso la copia c'e'
 */
export async function assicuraCopiaFeed(riga) {
  if (!riga?.percorso || riga.soloLocale) return false
  const fotogrammaC = await copiaEsiste(riga.percorso)
  const videoC = riga.tipo !== 'video' || (await copiaEsiste(percorsoVideoFeed(riga.percorso)))
  if (fotogrammaC && videoC) return true
  try {
    // Il video è un di più (vedi sopra): se non va, resta il fotogramma.
    if (!videoC) await copiaVideoFeed(riga)
    if (fotogrammaC) return true
    let copia
    if (riga.tipo === 'video') {
      // Dal file se c'e', se no dall'indirizzo: il browser scarica solo il
      // pezzo che serve, non tutto il video.
      const fonte = (await blobLocale(riga.id).catch(() => null)) || (await linkFirmato(riga.percorso))
      if (!fonte) return false
      copia = await inCoda(() => fotogrammaVideo(fonte, { lato: LATO_FEED }))
    } else {
      const blob = await scaricaOriginale(riga)
      if (!blob) return false
      copia = await inCoda(() => rimpicciolisciImmagine(blob, { lato: LATO_FEED, qualita: 0.8 }))
    }
    // Un giorno: chi riapre il feed in giornata la ritrova in cache, e una
    // copia tolta (foto tornata privata) non resta in giro per mesi.
    const esito = await caricaFile(BUCKET_FEED, riga.percorso, copia, { cacheControl: '86400' })
    if (!esito.ok) console.warn('Copia da feed non caricata', esito.errore?.message)
    return esito.ok
  } catch (e) {
    console.warn('Copia da feed non fatta', e?.message)
    return false
  }
}

function togliCopiaFeed(percorso) {
  if (!percorso) return
  // Il .mp4 c'è solo per i video: toglierlo dove non c'è non fa niente.
  supabase.storage
    .from(BUCKET_FEED)
    .remove([percorso, percorsoVideoFeed(percorso)])
    .then(({ error }) => error && console.warn('Copia da feed non tolta', error.message))
    .catch(() => {})
}

/**
 * Le copie che mancano alle PROPRIE foto pubbliche: quelle caricate prima che
 * le copie esistessero, o quando caricarla non e' riuscito. Una volta per
 * sessione, una foto alla volta, senza farsi aspettare.
 */
let copieControllate = false
export async function completaCopieFeed(userId) {
  if (!userId || copieControllate) return
  copieControllate = true
  const { data, error } = await supabase
    .from(TABELLA)
    .select('id, percorso, tipo, nome')
    .eq('user_id', userId)
    .eq('visibilita', VISIBILITA_FOTO_ALL.PUBBLICA)
  if (error) {
    copieControllate = false
    return
  }
  // Alla prima che non va ci si ferma: senza rete, o senza il bucket (lo
  // schema non ancora lanciato), si riscaricherebbero gli originali per niente.
  for (const r of data || []) {
    if (!(await assicuraCopiaFeed(r))) break
  }
}

async function scaricaOriginale(riga) {
  const locale = await blobLocale(riga.id).catch(() => null)
  if (locale) return locale
  const link = await linkFirmato(riga.percorso)
  if (!link) return null
  const risposta = await fetch(link)
  return risposta.ok ? risposta.blob() : null
}

// ------------------------------------------------------- lo sfondo del recap
// La foto di SFONDO del recap e gli ALLEGATI sono due cose diverse, e fino
// alla 53ª si confondevano: lo sfondo scelto nel recap da condividere non si
// salvava da nessuna parte (nel feed non c'era), mentre nel feed la prima foto
// allegata diventava da sola lo sfondo, velata, e chi l'aveva allegata non la
// ritrovava fra quelle da sfogliare.
//
// Adesso: lo sfondo è una riga di `allenamento_foto` come le altre (stesso
// bucket, stessa visibilità dell'allenamento), e il completamento ne tiene
// l'id in `sfondo`. Gli allegati sono tutte le ALTRE righe, e si sfogliano di
// lato. Niente colonna nuova nel database: la differenza la fa il completamento.

/** Dove sta il file di una foto: la cartella è di chi l'ha caricata. */
export const percorsoFotoAllenamento = (userId, id) => `${userId}/${id}`

/**
 * Le foto di un allenamento divise fra sfondo del recap e allegati.
 * @param {{sfondo?: string}} voce  il completamento (o la voce del feed)
 * @param {object[]} foto           le righe di `fotoDiAllenamenti`
 */
export function dividiFoto(voce, foto = []) {
  const id = voce?.sfondo || null
  // Un video fa da sfondo solo se è uno spezzone fatto apposta (78ª): un video
  // allegato, lungo e col sonoro, no.
  const sfondo = id ? foto.find((f) => f.id === id && (f.tipo !== 'video' || eSfondoVideo(f))) || null : null
  return { sfondo, allegati: id ? foto.filter((f) => f.id !== id) : foto }
}

/**
 * Cambia (o toglie, con `blob` null) la foto di sfondo del recap.
 *
 * ⚠️ Nasce PRIVATA: la rende pubblica, se l'allenamento lo è, il pannello
 * delle foto (components/FotoAllenamento), che tiene allineate tutte le righe
 * dell'allenamento e sa anche se la pubblicazione è bloccata.
 *
 * @returns {Promise<{id: string|null, soloLocale?: boolean}>} l'id da scrivere
 *   in `sfondo` sul completamento.
 */
export async function cambiaSfondoAllenamento({ blob, vecchioId, userId, chiave }) {
  if (vecchioId) {
    eliminaFotoAllenamento({ id: vecchioId, percorso: percorsoFotoAllenamento(userId, vecchioId) }).catch(() => {})
  }
  if (!blob || !userId || !chiave) return { id: null }
  // Un video qui è sempre lo spezzone già pronto (components/SceltaSpezzone).
  const video = String(blob.type || '').startsWith('video')
  const esito = await aggiungiFotoAllenamento({
    blob,
    userId,
    chiave,
    tipo: video ? 'video' : 'foto',
    nome: video ? NOME_SFONDO_VIDEO : 'sfondo.jpg',
  })
  return { id: esito.riga.id, soloLocale: esito.soloLocale }
}
