// ---------------------------------------------------------------------------
// I MIEI CIBI: il catalogo che si allarga da solo.
//
// Ogni volta che si registra un alimento che il catalogo di lib/alimenti non
// conosceva — trovato online col nome o col codice a barre, o scritto a mano
// coi suoi valori — quell'alimento resta. Da quel momento in poi lo si ritrova
// scrivendone il nome, **senza rete**, come se fosse sempre stato in elenco.
//
// È la risposta al problema vero di un diario alimentare: una persona mangia
// più o meno sempre le stesse quaranta cose. Dopo due settimane lo scaffale di
// casa è tutto qui dentro, e la ricerca online serve solo per le novità.
//
// ⚠️ DOVE STANNO. Dentro le preferenze alimentari del profilo
// (`preferenze.cibi`), non in una tabella loro. È una scelta pratica e non
// elegante: le preferenze sono già una riga per persona che si sincronizza da
// sola, mentre una tabella nuova vuol dire rilanciare `schema.sql` su un
// database vero — un gesto che costa, e che per un elenco di cibi non vale.
// Se un giorno diventassero migliaia, allora sì che meritano casa propria.
//
// ⚠️ Hanno la STESSA FORMA degli alimenti del catalogo (`m` coi grammi per
// 100g, `per`, `macro`), così tutto il resto del codice li tratta uguale e non
// deve sapere da dove arrivano. L'unica differenza è `peso: 0`: si riconoscono
// sempre, ma non vengono mai proposti dentro una dieta — i piani li compone il
// catalogo, che è scritto apposta per quello.
// ---------------------------------------------------------------------------

import { normalizzaCibo } from './alimenti'

const MAX_CIBI = 500

/** Quale macro "porta" un alimento: quello che pesa di più in calorie. */
function macroDominante(m) {
  const kp = (m.p || 0) * 4
  const kc = (m.c || 0) * 4
  const kg = (m.g || 0) * 9
  if (kp >= kc && kp >= kg) return 'p'
  return kc >= kg ? 'c' : 'g'
}

const numero = (v, def = 0) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : def
}

/**
 * Mette un alimento (dal servizio online o scritto a mano) nella forma di casa.
 * @returns {object|null} null se non ha né nome né un solo valore.
 */
export function normalizzaCiboMio(c) {
  const nome = String(c?.nome || '').trim()
  if (!nome) return null
  const m = {
    p: numero(c?.m?.p ?? c?.proteine),
    c: numero(c?.m?.c ?? c?.carbo),
    g: numero(c?.m?.g ?? c?.grassi),
  }
  const kcal = c?.kcal != null ? numero(c.kcal) : undefined
  if (m.p === 0 && m.c === 0 && m.g === 0 && !kcal) return null

  const macro = macroDominante(m)
  const marca = String(c?.marca || '').trim()
  // Gli alias: il nome, e il nome con la marca. Normalizzati come quelli del
  // catalogo, se no non si trovano mai (vedi lib/alimenti).
  const alias = [...new Set([normalizzaCibo(nome), normalizzaCibo(`${nome} ${marca}`)].filter((a) => a.length >= 3))]

  return {
    id: c?.id || `mio:${normalizzaCibo(nome).replace(/\s+/g, '-').slice(0, 40)}`,
    nome,
    marca,
    codice: String(c?.codice || ''),
    macro,
    m,
    // Come nel catalogo: la densità del macro dominante si RICAVA da `m`.
    per: m[macro] / 100,
    kcal,
    // ⚠️ Quanto pesa un pezzo è la cosa più preziosa che si impara di un
    // prodotto: la prima volta la deve scrivere la persona ("un biscotto: 8
    // grammi"), da lì in poi "2 biscotti" si conta da solo. Va tenuta.
    pezzo: c?.pezzo ? numero(c.pezzo) || undefined : undefined,
    densita: c?.densita ? numero(c.densita) || undefined : undefined,
    tag: Array.isArray(c?.tag) ? c.tag : [],
    alias,
    // ⚠️ Mai proposto dentro una dieta: i piani li compone il catalogo.
    peso: 0,
    mio: true,
    aggiuntoIl: c?.aggiuntoIl || new Date().toISOString(),
  }
}

export function normalizzaCibiMiei(lista) {
  return Array.isArray(lista) ? lista.map(normalizzaCiboMio).filter(Boolean) : []
}

/**
 * Aggiunge un cibo, o aggiorna quello che c'era già con lo stesso id/codice.
 * ⚠️ Ritorna SEMPRE una lista nuova (o quella di prima, identica, se non c'è
 * niente da cambiare): chi chiama la confronta per identità per sapere se
 * deve salvare.
 */
export function aggiungiCiboMio(lista, cibo) {
  const nuovo = normalizzaCiboMio(cibo)
  if (!nuovo) return lista
  const cibi = normalizzaCibiMiei(lista)
  const stesso = (c) => c.id === nuovo.id || (!!nuovo.codice && c.codice === nuovo.codice)
  const i = cibi.findIndex(stesso)
  if (i >= 0) {
    // Già c'è: si aggiorna solo se è davvero cambiato qualcosa.
    const vecchio = cibi[i]
    const uguale = JSON.stringify({ ...vecchio, aggiuntoIl: 0 }) === JSON.stringify({ ...nuovo, aggiuntoIl: 0 })
    if (uguale) return lista
    const fuori = [...cibi]
    fuori[i] = { ...nuovo, aggiuntoIl: vecchio.aggiuntoIl }
    return fuori
  }
  // I più recenti davanti, e si taglia la coda: un elenco che cresce senza
  // limite finisce dentro una riga di database, e non è il posto suo.
  return [nuovo, ...cibi].slice(0, MAX_CIBI)
}

export function togliCiboMio(lista, id) {
  return normalizzaCibiMiei(lista).filter((c) => c.id !== id)
}

/**
 * Il mio cibo nominato in un testo, col solito criterio del catalogo: l'alias
 * più lungo che compare. ⚠️ Si guarda QUI PRIMA che nel catalogo — se uno ha
 * salvato "yogurt greco Fage" vuole quello, non il generico.
 */
export function trovaFraIMiei(testo, lista) {
  const t = normalizzaCibo(testo)
  if (!t) return null
  let migliore = null
  for (const c of normalizzaCibiMiei(lista)) {
    for (const a of c.alias) {
      if (t.includes(a) && (!migliore || a.length > migliore.lunghezza)) {
        migliore = { cibo: c, lunghezza: a.length }
      }
    }
  }
  return migliore?.cibo || null
}

/** Quelli che somigliano a quello che si sta scrivendo, per i suggerimenti. */
export function cercaFraIMiei(testo, lista, limite = 8) {
  const t = normalizzaCibo(testo)
  if (t.length < 2) return []
  return normalizzaCibiMiei(lista)
    .filter((c) => c.alias.some((a) => a.includes(t)) || normalizzaCibo(c.marca).includes(t))
    .slice(0, limite)
}
