// ---------------------------------------------------------------------------
// Lo SCHEMA di un esercizio (per una settimana): serie, ripetizioni, carico e
// recupero — in NUMERI.
//
//   schema = {
//     fasi: [{ serie, rip, carico, perLato? }],   // almeno una
//     recuperoSec,                                 // secondi, null = non detto
//     nota,
//   }
//
// Una FASE è un tratto di serie uguali: "4×8-10" è una fase sola, "3×5 a 80kg
// poi 2×2 a 90kg" sono due. Dentro una fase:
//   serie   intero, null = non detto
//   rip     8 | {min:8,max:10} | 'max' | {sec:30} — o un array, uno per serie
//           (la piramide "12/10/8"; oltre l'ultimo vale l'ultimo)
//   carico  {tipo:'kg'|'rm'|'pct'|'rpe'|'rir', valore, coppia?} | null — o un
//           array, uno per serie ("60/70/80kg"). `coppia`: due manubri, "2×20kg".
//   perLato true per gli esercizi a un arto alla volta ("3×10 per lato")
//
// ⚠️ Prima era tutto testo libero ("15/12", "1,15min", "12rm"), con le fasi
// scritte serie per serie col "/". Quei dati esistono ancora — nelle schede
// salvate, nello storico, nelle schede mandate agli amici — e NON si migrano
// nel database: si convertono quando si leggono. Ogni funzione di questo file
// accetta tutte e due le forme (passa da `normalizzaSchema`), così chi legge
// non deve sapere da dove arriva lo schema.
//
// Quello che del testo vecchio non diventa un numero ("elastico rosso",
// "lento in discesa") finisce nella nota: non si perde niente.
// ---------------------------------------------------------------------------

import { parseRecuperoSec } from './parseRecupero.js'

export const MAX_SERIE = 30
export const TIPI_CARICO = ['kg', 'rm', 'pct', 'rpe', 'rir']

export function faseVuota(overrides = {}) {
  return { serie: null, rip: null, carico: null, ...overrides }
}

export function schemaVuoto(overrides = {}) {
  return { fasi: [faseVuota()], recuperoSec: null, nota: '', ...overrides }
}

/** È uno schema nella forma nuova? */
export function eNuovo(s) {
  return !!s && Array.isArray(s.fasi)
}

/**
 * Lo schema nella forma nuova, qualunque cosa arrivi (vecchia, nuova, null).
 * Sulla forma nuova restituisce lo stesso oggetto: si può chiamare ovunque.
 */
export function normalizzaSchema(s) {
  if (!s) return schemaVuoto()
  if (eNuovo(s)) {
    if (s.fasi.length > 0 && 'recuperoSec' in s && 'nota' in s) return s
    return {
      ...s,
      fasi: s.fasi.length ? s.fasi : [faseVuota()],
      recuperoSec: s.recuperoSec ?? null,
      nota: s.nota || '',
    }
  }
  return daStringhe(s)
}

// ---------------------------------------------------------------------------
// Leggere il testo: servono alla conversione dei dati vecchi e al parser.
// ---------------------------------------------------------------------------

const num = (t) => parseFloat(String(t).replace(',', '.'))

const RE_LATO = /\b(?:per|x|a|each)\s+(?:lato|gamba|braccio|arto|side|leg|arm)\b|\bper\s+parte\b/i
const RE_MAX = /^(?:max|massimo|massime|cedimento|failure|amrap|a\s+cedimento|to\s+failure)$/i

/**
 * Le ripetizioni di UNA serie da un pezzo di testo, o null se non si capisce.
 * "10" · "8-10" · "max"/"cedimento" · "30s"/"30\""/"1min" · "10+5" (rest-pause: 15)
 */
export function leggiRipSingola(testo) {
  const t = String(testo ?? '').trim().toLowerCase()
  if (!t) return null
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  let m = t.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (m) {
    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    return a === b ? a : { min: Math.min(a, b), max: Math.max(a, b) }
  }
  if (RE_MAX.test(t)) return 'max'
  m = t.match(/^(\d+)\s*(?:s|sec|secondi|"|'')$/)
  if (m) return { sec: parseInt(m[1], 10) }
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:min|m|')$/)
  if (m) return { sec: Math.round(num(m[1]) * 60) }
  if (/^\d+(\s*\+\s*\d+)+$/.test(t)) return t.split('+').reduce((tot, n) => tot + Number(n), 0)
  return null
}

/**
 * Le ripetizioni da un testo: una per tutte, o una per serie col "/".
 * @returns {{ rip: any, perLato: boolean, resto: string }} `resto`: quello che
 *   non è stato capito (da mettere nella nota).
 */
export function leggiRip(testo) {
  let t = String(testo ?? '').trim()
  const perLato = RE_LATO.test(t)
  if (perLato) t = t.replace(RE_LATO, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return { rip: null, perLato, resto: '' }
  if (t.includes('/')) {
    const pezzi = t.split('/').map((p) => leggiRipSingola(p))
    if (pezzi.every((p) => p != null)) {
      return { rip: pezzi.every((p) => p === pezzi[0]) ? pezzi[0] : pezzi, perLato, resto: '' }
    }
    return { rip: null, perLato, resto: t }
  }
  const r = leggiRipSingola(t)
  if (r != null) {
    const resto = /^\d+(\s*\+\s*\d+)+$/.test(t) ? t : ''
    return { rip: r, perLato, resto }
  }
  // "12 lenti", "10 esplosive": il numero c'è, il resto è una nota.
  const m = t.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+(.+)$/)
  if (m) return { rip: leggiRipSingola(m[1]), perLato, resto: m[2] }
  return { rip: null, perLato, resto: t }
}

/**
 * Il carico di UNA serie da un pezzo di testo, o null.
 * "80kg" · "80" · "42,5 kg" · "2x20kg" (due manubri) · "12rm" · "70%" · "RPE 8" · "RIR 2"
 */
export function leggiCaricoSingolo(testo) {
  const t = String(testo ?? '').trim().toLowerCase()
  if (!t) return null
  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*rm$/)
  if (m) return { tipo: 'rm', valore: num(m[1]) }
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*%(?:\s*(?:1rm|del massimale|of 1rm))?$/)
  if (m) return { tipo: 'pct', valore: num(m[1]) }
  m = t.match(/^(rpe|rir)\s*@?\s*(\d+(?:[.,]\d+)?)$/) || t.match(/^@\s*(rpe)?\s*(\d+(?:[.,]\d+)?)$/)
  if (m) return { tipo: m[1] === 'rir' ? 'rir' : 'rpe', valore: num(m[2]) }
  m = t.match(/^2\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kg\.|chili)?$/)
  if (m) return { tipo: 'kg', valore: num(m[1]), coppia: true }
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:kg|kg\.|chili)?$/)
  if (m) return num(m[1]) > 0 ? { tipo: 'kg', valore: num(m[1]) } : null
  return null
}

/**
 * Il carico da un testo: uno per tutte, o uno per serie col "/".
 * "60/70/80kg": l'unità scritta in fondo vale per tutti i pezzi.
 * @returns {{ carico: any, resto: string }}
 */
export function leggiCarico(testo) {
  const t = String(testo ?? '').trim()
  if (!t) return { carico: null, resto: '' }
  if (t.includes('/')) {
    const unita = (t.match(/(kg|rm|%)\s*$/i) || [])[1] || ''
    const pezzi = t.split('/').map((p) => {
      const q = p.trim()
      return leggiCaricoSingolo(/^\d+(?:[.,]\d+)?$/.test(q) ? q + unita : q)
    })
    if (pezzi.every((p) => p != null)) {
      return { carico: pezzi.every((p) => caricoUguale(p, pezzi[0])) ? pezzi[0] : pezzi, resto: '' }
    }
    return { carico: null, resto: t }
  }
  const c = leggiCaricoSingolo(t)
  if (c) return { carico: c, resto: '' }
  // "80kg per lato", "12rm lento": il carico c'è, il resto è una nota.
  const m = t.match(/^(2\s*[x×*]\s*)?(\d+(?:[.,]\d+)?\s*(?:kg|rm|%))\s+(.+)$/i)
  if (m) {
    const c2 = leggiCaricoSingolo((m[1] || '') + m[2])
    if (c2) return { carico: c2, resto: m[3] }
  }
  return { carico: null, resto: t }
}

// Quello che resta di un recupero scritto a mano tolto il tempo:
// "30\" tra gli arti" → "tra gli arti".
export function restoDelRecupero(testo) {
  return String(testo ?? '')
    .replace(/^\s*(?:rec\.?|recupero|rest|pausa)\s*:?/i, '')
    .replace(/\d+\s*'\s*\d+\s*(?:"|'')?|\d+(?:[.,]\d+)?\s*(?:min\b|m\b|'|"|''|sec\b|s\b)?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Il recupero in secondi da un testo ("90\"", "1,15min", "2'"), o null. */
export function leggiRecupero(testo) {
  const t = String(testo ?? '').trim()
  if (!t) return null
  const s = parseRecuperoSec(t)
  return s != null && s >= 0 ? s : null
}

// ---------------------------------------------------------------------------
// I dati vecchi: i quattro campi di testo.
// ---------------------------------------------------------------------------

/** Quante serie dice un testo ("8", "4 giri", "3 serie"), e cosa resta. */
function leggiSerie(testo) {
  const t = String(testo ?? '').trim()
  if (!t) return { serie: null, resto: '' }
  const m = t.match(/\d+/)
  if (!m) return { serie: null, resto: t }
  const serie = Math.max(1, Math.min(MAX_SERIE, parseInt(m[0], 10)))
  const pulito = /^\d+\s*(?:serie|giri|giro|set|sets|rounds?)?$/i.test(t)
  return { serie, resto: pulito ? '' : t }
}

/**
 * Lo schema vecchio ({serie, ripetizioni, carico, recupero, nota}: testo) nella
 * forma nuova. Le fasi scritte serie per serie ("5/5/5/2/2" e
 * "80kg/80kg/80kg/90kg/90kg") tornano fasi vere.
 */
export function daStringhe(vecchio) {
  const v = vecchio || {}
  const avanzi = []
  const { serie, resto: rs } = leggiSerie(v.serie)
  if (rs) avanzi.push(`serie: ${rs}`)
  const { rip, perLato, resto: rr } = leggiRip(v.ripetizioni)
  if (rr) avanzi.push(rr)
  const { carico, resto: rc } = leggiCarico(v.carico)
  if (rc) avanzi.push(rc)
  const recuperoSec = leggiRecupero(v.recupero)
  const restoRec = recuperoSec == null ? String(v.recupero ?? '').trim() : restoDelRecupero(v.recupero)
  if (restoRec) avanzi.push(recuperoSec == null ? `rec ${restoRec}` : restoRec)

  const fase = faseVuota({ serie, rip, carico, ...(perLato ? { perLato: true } : {}) })
  const nota = [String(v.nota ?? '').trim(), ...avanzi].filter(Boolean).join(' · ')
  return { fasi: comeFasi(fase), recuperoSec, nota }
}

// Una fase con ripetizioni e carico serie per serie: se dentro ci sono tratti
// uguali di più serie, sono fasi ("3×5 poi 2×2"). Una piramide ("12/10/8",
// nessun tratto lungo) resta una fase sola, com'è scritta.
function comeFasi(fase) {
  const n = fase.serie
  const ripArr = Array.isArray(fase.rip)
  const carArr = Array.isArray(fase.carico)
  if (!n || n < 2 || (!ripArr && !carArr)) return [fase]
  if ((ripArr && fase.rip.length !== n) || (carArr && fase.carico.length !== n)) return [fase]
  const gruppi = []
  for (let j = 0; j < n; j++) {
    const r = ripArr ? fase.rip[j] : fase.rip
    const c = carArr ? fase.carico[j] : fase.carico
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ripUguale(ultimo.rip, r) && caricoUguale(ultimo.carico, c)) ultimo.serie += 1
    else gruppi.push({ serie: 1, rip: r, carico: c })
  }
  if (gruppi.length < 2 || !gruppi.some((g) => g.serie > 1)) return [fase]
  return gruppi.map((g) => faseVuota({ ...g, ...(fase.perLato ? { perLato: true } : {}) }))
}

// ---------------------------------------------------------------------------
// Confronti
// ---------------------------------------------------------------------------

export function ripUguale(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function caricoUguale(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function schemiUguali(a, b) {
  const x = normalizzaSchema(a)
  const y = normalizzaSchema(b)
  return (
    JSON.stringify(x.fasi) === JSON.stringify(y.fasi) &&
    (x.recuperoSec ?? null) === (y.recuperoSec ?? null) &&
    (x.nota || '') === (y.nota || '')
  )
}

// ---------------------------------------------------------------------------
// Serie per serie
// ---------------------------------------------------------------------------

/** Quante serie ha una fase (le serie scritte, o quante ne dice l'array). */
export function serieDellaFase(fase) {
  if (fase?.serie) return Math.min(MAX_SERIE, fase.serie)
  if (Array.isArray(fase?.rip)) return Math.min(MAX_SERIE, fase.rip.length)
  if (Array.isArray(fase?.carico)) return Math.min(MAX_SERIE, fase.carico.length)
  return 0
}

/** Le serie scritte in uno schema (0 se nessuna), per i conteggi. */
export function serieScritte(schema) {
  return normalizzaSchema(schema).fasi.reduce((n, f) => n + serieDellaFase(f), 0)
}

/** Le serie totali di uno schema, almeno 1 (un esercizio si fa almeno una volta). */
export function numeroSerie(schema) {
  const s = normalizzaSchema(schema)
  const tot = s.fasi.reduce((n, f) => n + serieDellaFase(f), 0)
  return Math.max(1, Math.min(MAX_SERIE, tot))
}

const pezzo = (v, j) => (Array.isArray(v) ? (v.length ? v[Math.min(j, v.length - 1)] : null) : v)

/**
 * Ogni serie con le SUE ripetizioni e il SUO carico.
 * @returns {{ fase:number, rip:any, carico:any, perLato:boolean }[]}
 */
export function serieEspanse(schema) {
  const s = normalizzaSchema(schema)
  const out = []
  s.fasi.forEach((f, k) => {
    const n = serieDellaFase(f)
    for (let j = 0; j < n; j++) {
      out.push({ fase: k, rip: pezzo(f.rip, j) ?? null, carico: pezzo(f.carico, j) ?? null, perLato: !!f.perLato })
    }
  })
  // Uno schema senza serie scritte si fa comunque una volta.
  if (!out.length) {
    const f = s.fasi[0] || faseVuota()
    out.push({ fase: 0, rip: pezzo(f.rip, 0) ?? null, carico: pezzo(f.carico, 0) ?? null, perLato: !!f.perLato })
  }
  return out.slice(0, MAX_SERIE)
}

/** Le fasi di uno schema (sempre almeno una). */
export function fasiDi(schema) {
  return normalizzaSchema(schema).fasi
}

/** Lo schema ha più fasi (3×5 poi 2×2)? */
export function haFasi(schema) {
  return fasiDi(schema).length > 1
}

/** In quale fase cade la serie `j` (0-based). */
export function faseDiSerie(schema, j) {
  const fasi = fasiDi(schema)
  let fine = 0
  for (let k = 0; k < fasi.length; k++) {
    fine += serieDellaFase(fasi[k]) || (k === 0 ? 1 : 0)
    if (j < fine) return k
  }
  return fasi.length - 1
}

/** Ripetizioni e carico della serie `j`. */
export function obiettivoSerie(schema, j) {
  const tutte = serieEspanse(schema)
  const x = tutte[Math.min(j, tutte.length - 1)]
  return { rip: x?.rip ?? null, carico: x?.carico ?? null }
}

/** Il carico di una fase (null se non c'è). */
export function caricoDellaFase(schema, k) {
  const f = fasiDi(schema)[k]
  return f ? f.carico : null
}

/** Lo schema con un carico diverso per la fase `k` (tutte le sue serie). */
export function conCaricoFase(schema, k, carico) {
  const s = normalizzaSchema(schema)
  return { ...s, fasi: s.fasi.map((f, i) => (i === k ? { ...f, carico } : f)) }
}

/** Lo schema con lo stesso carico per tutte le fasi. */
export function conCarico(schema, carico) {
  const s = normalizzaSchema(schema)
  return { ...s, fasi: s.fasi.map((f) => ({ ...f, carico })) }
}

// ---------------------------------------------------------------------------
// Numeri
// ---------------------------------------------------------------------------

/**
 * Le ripetizioni come numero, per i conti (volume, obiettivo della serie):
 * di un intervallo il minimo, che è sicuro. null per "max" e per il tempo.
 */
export function ripNumero(rip) {
  if (typeof rip === 'number') return rip > 0 ? rip : null
  if (rip && typeof rip === 'object' && !Array.isArray(rip) && rip.min != null) return rip.min
  return null
}

/** I kg alzati a ogni ripetizione (due manubri da 20 sono 40), o null. */
export function kgAlzati(carico) {
  if (!carico || Array.isArray(carico) || carico.tipo !== 'kg') return null
  const v = Number(carico.valore)
  if (!Number.isFinite(v) || v <= 0) return null
  return carico.coppia ? v * 2 : v
}

/** Il carico più pesante in kg di uno schema (per i record), o null. */
export function caricoMassimoKg(schema) {
  let max = null
  for (const x of serieEspanse(schema)) {
    if (x.carico?.tipo !== 'kg' || !(x.carico.valore > 0)) continue
    if (!max || x.carico.valore > max.valore) max = x.carico
  }
  return max
}

// ---------------------------------------------------------------------------
// Come si mostra
// ---------------------------------------------------------------------------

/** 42.5 → "42,5", 40 → "40". */
export function numeroIt(n) {
  return String(Math.round(Number(n) * 100) / 100).replace('.', ',')
}

/** Secondi come li scrive un PT: 45 → 45", 120 → 2', 75 → 1'15". */
export function formattaSecondi(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return ''
  const s = Math.max(0, Math.round(sec))
  if (s < 60) return `${s}"`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}'${String(r).padStart(2, '0')}"` : `${m}'`
}

export function formattaRecupero(schemaOSec) {
  const sec = typeof schemaOSec === 'number' || schemaOSec == null
    ? schemaOSec
    : normalizzaSchema(schemaOSec).recuperoSec
  return formattaSecondi(sec)
}

function ripSingola(r) {
  if (r == null) return ''
  if (typeof r === 'number') return String(r)
  if (r === 'max') return 'max'
  if ('sec' in r) return r.sec == null ? '' : formattaSecondi(r.sec)
  // Un intervallo a metà (uno dei due campi svuotato) mostra quello che c'è.
  return [r.min, r.max].filter((x) => x != null).join('-')
}

/** "10", "8-10", "max", "30\"", "12/10/8", con " per lato" se serve. */
export function formattaRip(rip, perLato = false) {
  const t = Array.isArray(rip) ? rip.map(ripSingola).join('/') : ripSingola(rip)
  return t && perLato ? `${t} per lato` : t
}

function caricoSingolo(c) {
  if (!c || c.valore == null) return ''
  const v = numeroIt(c.valore)
  switch (c.tipo) {
    case 'kg':
      return c.coppia ? `2×${v}kg` : `${v}kg`
    case 'rm':
      return `${v}RM`
    case 'pct':
      return `${v}%`
    case 'rpe':
      return `RPE ${v}`
    case 'rir':
      return `RIR ${v}`
    default:
      return ''
  }
}

/** "80kg", "2×20kg", "12RM", "70%", "RPE 8"; serie per serie "60/70/80kg". */
export function formattaCarico(carico) {
  if (!Array.isArray(carico)) return caricoSingolo(carico)
  const pezzi = carico.map(caricoSingolo)
  if (carico.every((c) => c?.tipo === 'kg' && !c.coppia)) {
    return pezzi.map((p) => p.replace(/kg$/, '')).join('/') + 'kg'
  }
  return pezzi.map((p) => p || '-').join('/')
}

function serieRipDiUna(f) {
  const n = f.serie ? String(f.serie) : ''
  const r = formattaRip(f.rip, f.perLato)
  if (n && r) return `${n}×${r}`
  if (n) return `${n} serie`
  if (r) return `${r} rip`
  return ''
}

/** "4×8-10", "3×5 + 2×2", "3×12/10/8". */
export function formatSerieRip(schema) {
  const fasi = fasiDi(schema)
  return fasi.map(serieRipDiUna).filter(Boolean).join(' + ')
}

/**
 * Il carico da mostrare: con più fasi e pesi diversi uno per fase, nello
 * stesso ordine di formatSerieRip ("80kg + 90kg").
 */
export function formatCarico(schema) {
  const fasi = fasiDi(schema)
  if (fasi.length < 2) return formattaCarico(fasi[0]?.carico)
  const carichi = fasi.map((f) => formattaCarico(f.carico))
  if (carichi.every((c) => c === carichi[0])) return carichi[0]
  return carichi.map((c) => c || '-').join(' + ')
}

/** Uno schema è "vuoto" se non ha nessun dato utile. */
export function schemaHaContenuto(schema) {
  if (!schema) return false
  const s = normalizzaSchema(schema)
  return (
    s.fasi.some((f) => f.serie || f.rip != null || f.carico) ||
    s.recuperoSec != null ||
    !!(s.nota || '').trim()
  )
}

/**
 * Lo schema in una riga di testo, nella sintassi del formato da incollare:
 * "4x8-10 80kg rec 90\"". Per l'export e per i riassunti.
 */
export function schemaInTesto(schema) {
  const s = normalizzaSchema(schema)
  const pezzi = s.fasi
    .map((f) => [serieRipDiUna(f).replace('×', 'x'), formattaCarico(f.carico)].filter(Boolean).join(' '))
    .filter(Boolean)
  const out = [pezzi.join(' poi ')]
  if (s.recuperoSec != null) out.push(`rec ${formattaSecondi(s.recuperoSec)}`)
  return out.filter(Boolean).join(' ')
}

/**
 * Serie, ripetizioni e recupero come testo confrontabile ("3", "8-10", "1'30\""),
 * per contare lo "stile" più frequente di una persona (lib/consiglio,
 * lib/comunita). Della prima fase: è quella che dice com'è l'esercizio.
 */
export function stileDi(schema) {
  const s = normalizzaSchema(schema)
  const f = s.fasi[0] || faseVuota()
  return {
    serie: f.serie ? String(f.serie) : '',
    ripetizioni: formattaRip(f.rip),
    recupero: formattaSecondi(s.recuperoSec),
  }
}
