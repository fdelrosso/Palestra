// ---------------------------------------------------------------------------
// Le foto del CHECK FISICO: la sezione "Foto".
//
// Cosa NON sono, perché l'app ha già altre tre cose che somigliano a questa:
//   · non sono i media di un esercizio (`lib/media`), che stanno attaccati a
//     una scheda e li vede chi può vedere la scheda;
//   · non sono gli effimeri (`lib/effimeri`), che scadono;
//   · non sono roba da amici. Queste restano, sono di una persona sola, e le
//     vede il suo personal trainer **solo se lei lo decide, scatto per scatto**.
//
// LA CARTELLA È L'ATLETA — `<atletaId>/<id>` — e non chi carica. Due motivi:
// la sezione "Foto Atleti" del PT è una cartella per atleta, e il PT può
// aggiungere uno scatto nella cartella di un suo atleta (il check in palestra
// spesso lo fa lui col suo telefono). Chi ha premuto il pulsante resta scritto
// in `caricato_da`, ma il padrone della foto è l'atleta: è lui che la nasconde
// e che la cancella.
//
// ⚠️ CHI PUÒ VEDERE COSA NON SI DECIDE QUI. Lo decide la regola sul bucket
// (`posso_vedere_progresso` in supabase/schema.sql). Qui si evita solo di
// chiedere file che non si ha diritto di avere — ma se li si chiedesse, la
// risposta sarebbe no.
//
// ⚠️ La copia locale usa lo stesso magazzino IndexedDB dei media
// (`lib/media`: salvaBlobLocale/blobLocale/eliminaBlobLocale) ma **non** mette
// il flag `daCaricare`. È voluto: quel flag è ciò su cui gira
// `riprovaMediaInSospeso()`, che rimanderebbe questi file nel bucket `media` e
// scriverebbe righe nella tabella sbagliata. La coda di questi sta qui sotto,
// in localStorage, ed è separata apposta.
// ---------------------------------------------------------------------------

import { erroreDiRete, supabase } from './supabase'
import { caricaFile, salvaBlobLocale, blobLocale, eliminaBlobLocale } from './media'

const BUCKET = 'progressi'
const TABELLA = 'progressi'
const KEY_SOSPESI = 'palestra-progressi-sospesi'

/**
 * Chi vede lo scatto. Due valori e basta: agli amici queste foto non ci vanno,
 * e non c'è modo di renderle pubbliche.
 * ⚠️ Gli stessi due stanno nel `check` della tabella: se qui se ne aggiunge un
 * terzo senza toccare supabase/schema.sql, l'inserimento viene rifiutato.
 */
export const VISIBILITA_FOTO = { PRIVATA: 'privata', PT: 'pt' }

/** Quello che si ottiene non scegliendo: chi non sceglie non pubblica. */
export const VISIBILITA_FOTO_DEFAULT = VISIBILITA_FOTO.PRIVATA

/** Il percorso del file dentro il bucket. La cartella è l'atleta. */
export function percorsoProgresso(atletaId, id) {
  return `${atletaId}/${id}`
}

function nuovoIdProgresso() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/** La data di oggi come `YYYY-MM-DD`, che è il formato della colonna `data`. */
export function oggiIso() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const gg = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${gg}`
}

// ------------------------------------------------------ la coda dei sospesi
// Solo i DATI della riga, non il file: il file sta in IndexedDB sotto lo stesso
// id. In localStorage un blob non ci starebbe (quota ~5MB, una foto la satura).
function sospesi() {
  try {
    const raw = localStorage.getItem(KEY_SOSPESI)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.warn('Lettura dei progressi in sospeso fallita', e)
  }
  return []
}

function salvaSospesi(righe) {
  try {
    localStorage.setItem(KEY_SOSPESI, JSON.stringify(righe))
  } catch (e) {
    console.warn('Salvataggio dei progressi in sospeso fallito', e)
  }
}

function aggiungiSospeso(riga) {
  salvaSospesi([...sospesi().filter((r) => r.id !== riga.id), riga])
}

function togliSospeso(id) {
  salvaSospesi(sospesi().filter((r) => r.id !== id))
}

/** Gli scatti di questo atleta che stanno ancora solo su questo telefono. */
export function progressiSoloLocali(atletaId) {
  return sospesi()
    .filter((r) => r.atleta_id === atletaId)
    .map((r) => ({ ...r, soloLocale: true }))
}

// ------------------------------------------------------------ il caricamento
// ⚠️ Prima il FILE, poi la riga, come per i media: una riga senza file è una
// miniatura rotta per chi guarda; un file senza riga non lo scarica nessuno (la
// regola dice di no) ed è semplicemente invisibile finché non si ripassa di qui.
// ⚠️ Il file passa da `caricaFile` (lib/media) e non da `supabase.storage` a
// mano: lì c'è scritto perché un `upsert: true` sul file manda tutto a gambe
// all'aria, e perché aggiungere la policy di UPDATE che lo farebbe passare
// sarebbe peggio del male. Qui in particolare darebbe al PT il potere di
// riscrivere il contenuto di una foto dell'atleta lasciando intatta la riga,
// cioè la visibilità che l'atleta aveva scelto.
async function carica(riga, blob) {
  const esitoFile = await caricaFile(BUCKET, riga.percorso, blob)
  if (!esitoFile.ok) return { ok: false, errore: esitoFile.errore, diRete: esitoFile.diRete }

  const { error: e2 } = await supabase.from(TABELLA).upsert(riga)
  if (e2) return { ok: false, errore: e2, diRete: erroreDiRete(e2) }
  return { ok: true }
}

/**
 * Aggiunge uno scatto al check di un atleta.
 *
 * @param {object} p
 * @param {Blob}   p.blob       il file scelto
 * @param {string} p.atletaId   di chi è il corpo nella foto (= la cartella)
 * @param {string} p.caricatoDa chi sta premendo il pulsante: l'atleta o il PT
 * @param {'foto'|'video'} [p.tipo]
 * @param {string} [p.nome]     il nome del file, per riconoscerlo
 * @param {string} [p.data]     il giorno del check (`YYYY-MM-DD`), oggi se manca
 * @param {string} [p.nota]     due parole a mano: "78,4 kg", "fine massa"
 * @param {string} [p.visibilita]
 * @returns {Promise<{ok:boolean, riga:object, soloLocale:boolean, errore:string}>}
 *   `soloLocale` = il file c'è ma sta solo qui, e si riproverà a mandarlo.
 */
export async function salvaProgresso({
  blob,
  atletaId,
  caricatoDa,
  tipo = 'foto',
  nome = '',
  data = '',
  nota = '',
  visibilita = '',
}) {
  const id = nuovoIdProgresso()
  const riga = {
    id,
    atleta_id: atletaId,
    caricato_da: caricatoDa,
    percorso: percorsoProgresso(atletaId, id),
    tipo,
    nome,
    peso: blob.size,
    data: data || oggiIso(),
    nota,
    // ⚠️ L'unica eccezione al default 'privata', e sta in chiaro: uno scatto
    // caricato DAL PT nasce già aperto al PT. Quella foto ce l'ha in mano lui,
    // fingere di nascondergliela sarebbe teatro. L'atleta può comunque
    // chiuderla dopo, ed è per questo che la levetta gliela mostriamo lo stesso.
    visibilita:
      visibilita ||
      (caricatoDa !== atletaId ? VISIBILITA_FOTO.PT : VISIBILITA_FOTO_DEFAULT),
  }

  // La copia locale SUBITO: la miniatura deve comparire adesso, non fra venti
  // secondi di caricamento, e deve vedersi anche in palestra senza rete.
  await salvaBlobLocale(id, blob, { atletaId, kind: 'progresso' }).catch(() => {})

  const esito = await carica(riga, blob)
  if (esito.ok) {
    togliSospeso(id)
    return { ok: true, riga, soloLocale: false, errore: '' }
  }

  // ⚠️ Lo scatto NON si annulla: il file ce l'hai, e si vede. Quello che cambia
  // è cosa gli si dice — e "non è partito" non è "non è stato salvato".
  aggiungiSospeso(riga)
  console.warn('Caricamento della foto non riuscito', esito.errore?.message)
  return {
    ok: true,
    riga: { ...riga, soloLocale: true },
    soloLocale: true,
    errore: esito.diRete ? '' : esito.errore?.message || '',
  }
}

/**
 * Gli scatti di un atleta, dal più recente.
 *
 * ⚠️ Per il PT questa torna SOLO quelli che l'atleta ha aperto: non è un filtro
 * scritto qui, è la regola sulla tabella. Se un giorno tornasse di più, il posto
 * da guardare è supabase/schema.sql, non questo file.
 *
 * @returns {Promise<{righe:object[], errore:string, diRete:boolean}>}
 */
export async function progressiDi(atletaId) {
  if (!atletaId) return { righe: [], errore: '', diRete: false }
  const { data, error } = await supabase
    .from(TABELLA)
    .select('*')
    .eq('atleta_id', atletaId)
    .order('data', { ascending: false })
    .order('creato_il', { ascending: false })
  if (error) {
    return { righe: progressiSoloLocali(atletaId), errore: error.message, diRete: erroreDiRete(error) }
  }
  // I sospesi si aggiungono in cima: esistono, si vedono, e la miniatura dirà
  // che stanno solo qui.
  const dalServer = data || []
  const idServer = new Set(dalServer.map((r) => r.id))
  const locali = progressiSoloLocali(atletaId).filter((r) => !idServer.has(r.id))
  return { righe: ordina([...locali, ...dalServer]), errore: '', diRete: false }
}

function ordina(righe) {
  return [...righe].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
}

/**
 * Quanti scatti visibili ha ciascuno di questi atleti: serve al PT per l'elenco
 * delle cartelle, dove una cartella vuota deve dirsi vuota.
 * @returns {Promise<Record<string, number>>} id atleta -> quanti
 */
export async function conteggioProgressi(atletiIds) {
  const ids = (atletiIds || []).filter(Boolean)
  if (ids.length === 0) return {}
  const { data, error } = await supabase.from(TABELLA).select('atleta_id').in('atleta_id', ids)
  if (error) {
    console.warn('Conteggio delle foto atleti non riuscito', error.message)
    return {}
  }
  const conti = {}
  for (const r of data || []) conti[r.atleta_id] = (conti[r.atleta_id] || 0) + 1
  return conti
}

/**
 * Da dove far vedere questo scatto: prima la copia locale (istantanea, e
 * funziona senza rete), poi il server con un link firmato.
 * @returns {Promise<{url:string|null, revoca:()=>void}>}
 */
export async function fonteProgresso(riga) {
  const nulla = { url: null, revoca: () => {} }
  if (!riga?.id) return nulla

  const blob = await blobLocale(riga.id).catch(() => null)
  if (blob) {
    const url = URL.createObjectURL(blob)
    return { url, revoca: () => URL.revokeObjectURL(url) }
  }

  const percorso = riga.percorso || percorsoProgresso(riga.atleta_id, riga.id)
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(percorso, 3600)
  if (error || !data?.signedUrl) return nulla
  return { url: data.signedUrl, revoca: () => {} }
}

/**
 * Apre o chiude uno scatto al personal trainer.
 * ⚠️ La regola sulla tabella lascia farlo SOLO all'atleta. Se lo chiama il PT
 * non succede niente e torna un errore: è quello che deve succedere.
 */
export async function aggiornaVisibilitaProgresso(id, visibilita) {
  const v =
    visibilita === VISIBILITA_FOTO.PT ? VISIBILITA_FOTO.PT : VISIBILITA_FOTO.PRIVATA

  const inCoda = sospesi().find((r) => r.id === id)
  if (inCoda) aggiungiSospeso({ ...inCoda, visibilita: v })

  const { error } = await supabase.from(TABELLA).update({ visibilita: v }).eq('id', id)
  if (error) {
    console.warn('Visibilita della foto non aggiornata', error.message)
    return { ok: false, errore: error.message }
  }
  return { ok: true, errore: '' }
}

/**
 * Toglie lo scatto da tutti i posti in cui sta. Se il server non risponde, file
 * e riga restano: è un orfano, non un dato perso (docs/roadmap.md).
 */
export async function eliminaProgresso(riga) {
  const id = typeof riga === 'string' ? riga : riga?.id
  if (!id) return { ok: false, errore: 'Scatto senza id' }

  await eliminaBlobLocale(id).catch(() => {})
  togliSospeso(id)

  const percorso =
    (typeof riga === 'object' && riga?.percorso) ||
    (typeof riga === 'object' && riga?.atleta_id
      ? percorsoProgresso(riga.atleta_id, id)
      : null)
  if (!percorso) return { ok: true, errore: '' }

  const { error } = await supabase.storage.from(BUCKET).remove([percorso])
  if (error) console.warn('File non rimosso dallo Storage', error.message)
  const { error: e2 } = await supabase.from(TABELLA).delete().eq('id', id)
  if (e2) {
    console.warn('Riga della foto non rimossa', e2.message)
    return { ok: false, errore: e2.message }
  }
  return { ok: true, errore: '' }
}

/**
 * Gli scatti rimasti su questo telefono e basta: riprova a mandarli su.
 * @returns {Promise<number>} quanti non sono partiti nemmeno stavolta
 */
export async function riprovaProgressiInSospeso() {
  const coda = sospesi()
  let rimasti = 0
  for (const riga of coda) {
    const blob = await blobLocale(riga.id).catch(() => null)
    if (!blob) {
      // Il file non c'è più (cache pulita, altro browser): la riga in coda non
      // serve a niente e resterebbe lì per sempre.
      togliSospeso(riga.id)
      continue
    }
    const esito = await carica(riga, blob)
    if (esito.ok) togliSospeso(riga.id)
    else rimasti += 1
  }
  return rimasti
}

/**
 * Gli scatti raggruppati per giorno, dal più recente: è così che si guarda un
 * check — "3 marzo", non ventisei miniature in fila.
 * @returns {{data:string, righe:object[]}[]}
 */
export function perGiorno(righe) {
  const gruppi = new Map()
  for (const r of ordina(righe || [])) {
    const giorno = r.data || ''
    if (!gruppi.has(giorno)) gruppi.set(giorno, [])
    gruppi.get(giorno).push(r)
  }
  return [...gruppi.entries()].map(([data, elenco]) => ({ data, righe: elenco }))
}

/** "3 marzo 2026" da un `YYYY-MM-DD`, senza passare per i fusi orari. */
export function giornoLungo(iso) {
  if (!iso) return 'Senza data'
  const [a, m, g] = String(iso).split('-').map(Number)
  if (!a || !m || !g) return String(iso)
  const mesi = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ]
  return `${g} ${mesi[m - 1]} ${a}`
}
