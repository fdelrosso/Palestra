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
import { blobLocale, caricaFile, eliminaBlobLocale, salvaBlobLocale } from './media'

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
  blob,
  userId,
  chiave,
  tipo = 'foto',
  nome = '',
  posizione = 0,
  visibilita = VISIBILITA_FOTO_ALL.PRIVATA,
}) {
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
