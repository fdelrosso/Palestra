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
import { blobLocale, caricaFile, eliminaBlobLocale, rimpicciolisciImmagine, salvaBlobLocale } from './media'

const BUCKET = 'allenamenti'
const TABELLA = 'allenamento_foto'
const KEY_SOSPESI = 'palestra-foto-allenamento-sospese'

export const VISIBILITA_FOTO_ALL = { PRIVATA: 'privata', PUBBLICA: 'pubblica' }

/**
 * La chiave con cui una foto si lega a un allenamento.
 * @param {{schedaId?:string, data:string}} voce una voce di storicoGlobale
 */
export function chiaveAllenamento(voce) {
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
async function carica(riga, blob) {
  const esitoFile = await caricaFile(BUCKET, riga.percorso, blob)
  if (!esitoFile.ok) return { ok: false, errore: esitoFile.errore, diRete: esitoFile.diRete }
  const { error } = await supabase.from(TABELLA).upsert(riga)
  if (error) return { ok: false, errore: error, diRete: erroreDiRete(error) }
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
}) {
  // Una foto del telefono (12-48 megapixel) non serve intera: nel feed è
  // grande quanto lo schermo. A 2048px sul lato lungo pesa un decimo, e
  // soprattutto chi la guarda non deve decodificarne una enorme (vedi
  // fonteFotoLeggera). I video restano come sono.
  const blob = tipo === 'foto' ? await rimpicciolisciImmagine(originale, { lato: 2048, qualita: 0.85 }).catch(() => originale) : originale
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

/** Da dove far vedere questa foto: prima la copia locale, poi il link firmato. */
export async function fonteFotoAllenamento(riga) {
  const nulla = { url: null, revoca: () => {} }
  if (!riga?.id) return nulla
  const blob = await blobLocale(riga.id).catch(() => null)
  if (blob) {
    const url = URL.createObjectURL(blob)
    return { url, revoca: () => URL.revokeObjectURL(url) }
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(riga.percorso, 3600)
  if (error || !data?.signedUrl) return nulla
  return { url: data.signedUrl, revoca: () => {} }
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
// Una alla volta (`coda`): decodificarne tre enormi insieme è proprio il
// picco da evitare. Se non si riesce a rimpicciolire, si usa quella intera.
const leggere = new Map()
let coda = Promise.resolve()

async function preparaLeggera(riga, lato) {
  let blob = await blobLocale(riga.id).catch(() => null)
  if (!blob) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(riga.percorso, 3600)
    if (!data?.signedUrl) return null
    const risposta = await fetch(data.signedUrl)
    if (!risposta.ok) return null
    blob = await risposta.blob()
  }
  const piccola = await rimpicciolisciImmagine(blob, { lato, qualita: 0.85 }).catch(() => blob)
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
    const promessa = coda.then(() => preparaLeggera(riga, lato)).catch(() => null)
    coda = promessa.then(() => {})
    voce = { refs: 0, promessa }
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
  const { error } = await supabase.from(TABELLA).update({ visibilita: v }).eq('id', id)
  if (error) {
    console.warn('Visibilita della foto non aggiornata', error.message)
    return { ok: false, errore: error.message }
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
    const { error } = await supabase.storage.from(BUCKET).remove([percorso])
    if (error) console.warn('File non rimosso dallo Storage', error.message)
  }
  const { error } = await supabase.from(TABELLA).delete().eq('id', id)
  if (error) return { ok: false, errore: error.message }
  return { ok: true, errore: '' }
}

/**
 * L'allenamento ha cambiato data: le sue foto lo seguono.
 *
 * ⚠️ Serve perché la chiave È la data (vedi `chiaveAllenamento`). Correggere
 * il giorno di un allenamento senza passare di qui lascerebbe le foto appese
 * alla chiave vecchia, cioè a un allenamento che non esiste più: nel feed la
 * scheda comparirebbe senza foto, e le foto non si vedrebbero da nessuna parte.
 * Si spostano anche quelle ancora in coda su questo telefono.
 */
export async function spostaFotoAllenamento(userId, vecchia, nuova) {
  if (!userId || !vecchia || !nuova || vecchia === nuova) return { ok: true, errore: '' }
  const coda = sospese()
  if (coda.some((r) => r.allenamento_key === vecchia)) {
    salvaSospese(coda.map((r) => (r.allenamento_key === vecchia ? { ...r, allenamento_key: nuova } : r)))
  }
  const { error } = await supabase
    .from(TABELLA)
    .update({ allenamento_key: nuova })
    .eq('user_id', userId)
    .eq('allenamento_key', vecchia)
  if (error) {
    console.warn('Foto non spostate sul nuovo giorno', error.message)
    return { ok: false, errore: error.message }
  }
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
 * completamento solo per riscriverlo al prossimo "Termina": lì le foto si
 * spostano (spostaFotoAllenamento), non si buttano.
 */
export async function eliminaFotoDiAllenamento(chiave) {
  if (!chiave) return { ok: true }
  const per = await fotoDiAllenamenti([chiave])
  const righe = per[chiave] || []
  const esiti = await Promise.all(righe.map((r) => eliminaFotoAllenamento(r)))
  const ko = esiti.filter((e) => !e.ok)
  return { ok: ko.length === 0, errore: ko[0]?.errore || '' }
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
  const sfondo = id ? foto.find((f) => f.id === id && f.tipo !== 'video') || null : null
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
  const esito = await aggiungiFotoAllenamento({ blob, userId, chiave, tipo: 'foto', nome: 'sfondo.jpg' })
  return { id: esito.riga.id, soloLocale: esito.soloLocale }
}
