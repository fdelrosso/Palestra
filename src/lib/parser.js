import { nuovaScheda, nuovoGiorno, nuovoEsercizio } from '../data/model.js'
import { gruppoDaNome, normalizzaNome } from './eserciziLibreria.js'
import { faseVuota, leggiCaricoSingolo, leggiRecupero, leggiRipSingola } from './schema.js'

// ---------------------------------------------------------------------------
// Il parser della scheda incollata come testo.
//
// Legge il FORMATO documentato in ImportPage (una riga per esercizio):
//
//   Giorno A - Petto
//   Panca piana 4x8-10 80kg rec 90s
//   + Push down 3x12 rec 60s          ← "+" = in superserie col precedente
//   Dips 3xMAX nota: lenti
//     S1-2: 4x10 70kg                 ← righe per settimana
//   Rest (bici)
//
// ma è fatto per sopportare i messaggi veri, che a quel formato somigliano e
// basta: elenchi puntati e numerati, "4 serie da 10", "@ 80kg", "rest 2 min",
// l'inglese, e il dialetto del PT per cui il parser era nato (blocchi separati
// da righe vuote, il nome su una riga e lo schema sotto, "Sett1-2", "rec.",
// "3x5 poi 2x2").
//
// Riga per riga si riconoscono dei PEZZI (serie×ripetizioni, carico, recupero,
// "per lato"); il nome è quello che sta prima del primo pezzo, e quello che
// avanza diventa la nota dell'esercizio. Quello che non si riesce ad attaccare
// a niente non sparisce: torna in `problemi`, con la riga, perché la schermata
// di controllo lo mostri.
// ---------------------------------------------------------------------------

// Le ripetizioni dentro "NxR": un numero, un intervallo, una piramide, "max",
// un tempo.
const RIP =
  `(?:max|amrap|cedimento|failure|` +
  `\\d+\\s*'\\s*\\d+\\s*(?:"|'')?|` +
  `\\d+(?:[.,]\\d+)?\\s*(?:min|minuti|m)\\b|` +
  `\\d+\\s*(?:s|sec|secondi|"|'')(?![a-z])|` +
  `\\d+(?:\\s*[-–]\\s*\\d+)?(?:\\s*\\/\\s*\\d+)*)`

// "4x10 reps", "3 serie da 12 ripetizioni": la parola dopo fa parte del pezzo.
const PAROLA_RIP = `(?:\\s*(?:rip\\.?|reps?|ripetizioni|ripetute)(?![a-z]))?`

const TEMPO =
  `(?:\\d+\\s*'\\s*\\d+\\s*(?:"|'')?|` +
  `\\d+(?:[.,]\\d+)?\\s*(?:min\\b|minuti\\b|minutes\\b|m\\b|'|"|''|sec\\b|secondi\\b|seconds\\b|s\\b)?)`

// In ordine di precedenza: quando due pezzi si sovrappongono vince il primo
// ("3x45s" è una serie a tempo, non un recupero di 45 secondi).
const PEZZI = [
  { tipo: 'fase', re: new RegExp(`(\\d{1,2})\\s*[x×*]\\s*(${RIP})${PAROLA_RIP}`, 'gi') },
  { tipo: 'fase', re: new RegExp(`(\\d{1,2})\\s*(?:serie|sets?|series)\\s*(?:da|di|of|x|×)\\s*(${RIP})${PAROLA_RIP}`, 'gi') },
  { tipo: 'kg', re: /(?:@\s*)?(2\s*[x×]\s*)?(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*(?:kg|kgs|chili)\b\.?/gi },
  { tipo: 'rm', re: /(\d+(?:[.,]\d+)?)\s*rm\b/gi },
  { tipo: 'pct', re: /@?\s*(\d+(?:[.,]\d+)?)\s*%(?:\s*(?:1rm|del massimale))?/gi },
  { tipo: 'rpe', re: /(?:@\s*)?(rpe|rir)\s*@?\s*(\d+(?:[.,]\d+)?)/gi },
  { tipo: 'rec', re: new RegExp(`(?:rec\\.?|recupero|rest|riposo|pausa)\\s*[:=]?\\s*(${TEMPO})`, 'gi') },
  { tipo: 'serie', re: /(\d{1,2})\s*(?:serie|sets?|series|giri|giro|rounds?)\b/gi },
  { tipo: 'rip', re: /(\d+(?:\s*[-–]\s*\d+)?)\s*(?:rip\.?|reps?|ripetizioni|ripetute)(?![a-z])/gi },
  {
    tipo: 'tempo',
    re: /(\d+\s*'\s*\d+\s*(?:"|'')?|\d+(?:[.,]\d+)?\s*(?:min|minuti|minutes)\b|\d+\s*(?:"|''|sec\b|secondi\b|seconds\b)|\d+\s*s\b|\d+\s*')/gi,
  },
  { tipo: 'rpe@', re: /@\s*(\d+(?:[.,]\d+)?)(?!\s*(?:kg|%|[.,\d]))/gi },
  {
    tipo: 'lato',
    re: /\b(?:per|x|a|each)\s+(?:lato|gamba|braccio|arto|side|leg|arm)\b|\bper\s+parte\b|\bunilaterale\b/gi,
  },
]

const RE_GIORNO =
  /^(?:#+\s*)?(?:giorno|day|allenamento|workout|seduta|sessione|session|lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?![\p{L}\d])/iu
const RE_RIPOSO = /^(?:rest|riposo|off|day off|recupero attivo)\b\s*[-:–]?\s*(?:\((.*)\))?\s*(.*)$/i
const RE_SETTIMANA =
  /^(?:s|sett\.?|settimana|settimane|w|wk|week|weeks)\s*(\d{1,2}(?:\s*(?:[-–,]|e|and)\s*\d{1,2})*)\s*[:.)-]?\s*(.*)$/i
const RE_NUM_SETTIMANE = /^(?:(\d{1,2})\s*(?:settimane|weeks)|(?:settimane|weeks|durata)\s*[:=]?\s*(\d{1,2})(?:\s*(?:settimane|weeks))?)\s*$/i
const RE_NOME_SCHEDA = /^(?:scheda|programma|program|nome)\s*:\s*(.+)$/i
const RE_NOTA = /\b(?:nota|note|nb|n\.b\.)\s*:\s*/i
const RE_PUNTO = /^(?:[-–—•*·▪►✓✔]+|\d{1,2}\s*[.)]|[a-z]\s*\))\s+/i

const MAX_SETTIMANE = 52

const pulisci = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:·|\-–—]+|[\s.,;:·|\-–—]+$/g, '')
    .trim()

// Una nota tra parentesi è una nota: "(ultimo a cedimento)" → "ultimo a cedimento".
const pulisciNota = (s) => pulisci(pulisci(s).replace(/^\((.*)\)$/, '$1'))

/** Le settimane di "1-2", "3,4", "1 e 3", "2-5". */
function settimaneDi(testo) {
  const out = new Set()
  for (const pezzo of testo.split(/\s*(?:,|\be\b|\band\b)\s*/i)) {
    const m = pezzo.match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/)
    if (!m) continue
    const a = parseInt(m[1], 10)
    const b = m[2] ? parseInt(m[2], 10) : a
    for (let w = Math.min(a, b); w <= Math.max(a, b) && w <= MAX_SETTIMANE; w++) if (w > 0) out.add(w)
  }
  return [...out].sort((x, y) => x - y)
}

/** Tutti i pezzi di una riga, senza sovrapposizioni, da sinistra a destra. */
function trovaPezzi(testo) {
  const presi = []
  const libero = (a, b) => presi.every((p) => b <= p.inizio || a >= p.fine)
  for (const { tipo, re } of PEZZI) {
    re.lastIndex = 0
    for (const m of testo.matchAll(re)) {
      const inizio = m.index
      const fine = m.index + m[0].length
      if (!m[0].trim() || !libero(inizio, fine)) continue
      // "2x12kg" sono due manubri da 12, non due serie da 12.
      if (tipo === 'fase' && /^\s*(?:kg|kgs|chili)\b/i.test(testo.slice(fine)) && /^\d+$/.test(m[2].trim())) continue
      presi.push({ tipo, m, inizio, fine })
    }
  }
  return presi.sort((a, b) => a.inizio - b.inizio)
}

function caricoDa(p) {
  const { tipo, m } = p
  if (tipo === 'kg') {
    const valori = m[2].split('/').map((v) => leggiCaricoSingolo(v.trim() + 'kg'))
    if (valori.some((v) => !v)) return null
    if (m[1]) return valori.length === 1 ? { ...valori[0], coppia: true } : valori.map((v) => ({ ...v, coppia: true }))
    return valori.length === 1 ? valori[0] : valori
  }
  if (tipo === 'rm') return leggiCaricoSingolo(m[1] + 'rm')
  if (tipo === 'pct') return leggiCaricoSingolo(m[1] + '%')
  if (tipo === 'rpe') return leggiCaricoSingolo(`${m[1]} ${m[2]}`)
  if (tipo === 'rpe@') return leggiCaricoSingolo(`rpe ${m[1]}`)
  return null
}

function ripDa(testo) {
  const t = testo.trim()
  if (t.includes('/')) {
    const pezzi = t.split('/').map((x) => leggiRipSingola(x))
    return pezzi.every((x) => x != null) ? pezzi : null
  }
  return leggiRipSingola(t)
}

/**
 * Una riga letta: il nome (quello prima del primo pezzo), le fasi, il carico
 * e il recupero, "per lato", e le note (tutto quello che avanza).
 * @param {string} riga
 * @param {{ conNome?: boolean }} [opts] `conNome: false` per le righe che non
 *   possono avere un nome (le settimane): tutto ciò che non è un pezzo è nota.
 */
export function leggiRiga(riga, { conNome = true } = {}) {
  let testo = riga
  const note = []
  const mNota = testo.match(RE_NOTA)
  if (mNota) {
    note.push(pulisci(testo.slice(mNota.index + mNota[0].length)))
    testo = testo.slice(0, mNota.index)
  }

  const pezzi = trovaPezzi(testo)
  const primo = pezzi[0]?.inizio ?? testo.length
  let nome = conNome ? testo.slice(0, primo) : ''
  // "Panca piana. Solite regole…": il nome finisce al primo punto.
  const punto = nome.search(/\.\s/)
  if (punto > 0) {
    note.unshift(pulisci(nome.slice(punto + 1)))
    nome = nome.slice(0, punto)
  }
  nome = pulisci(nome)

  // Le fasi, ognuna col carico scritto dopo di lei e prima della prossima.
  const fasi = []
  let carichiFuori = []
  let recuperoSec = null
  let durataSec = null
  let perLato = false
  let serieSole = null
  let ripSole = null
  for (const p of pezzi) {
    if (p.tipo === 'fase') {
      const rip = ripDa(p.m[2])
      fasi.push(faseVuota({ serie: Math.min(30, parseInt(p.m[1], 10)), rip }))
    } else if (['kg', 'rm', 'pct', 'rpe', 'rpe@'].includes(p.tipo)) {
      const c = caricoDa(p)
      if (!c) continue
      const ultima = fasi[fasi.length - 1]
      if (ultima && !ultima.carico) ultima.carico = c
      else carichiFuori.push(c)
    } else if (p.tipo === 'rec') {
      recuperoSec = leggiRecupero(p.m[1])
    } else if (p.tipo === 'tempo') {
      // Un tempo senza "rec": su una riga con le serie è il recupero, da solo
      // è la durata dell'esercizio ("Tapis roulant 20 min").
      durataSec = leggiRecupero(p.m[1])
    } else if (p.tipo === 'serie') {
      serieSole = Math.min(30, parseInt(p.m[1], 10))
    } else if (p.tipo === 'rip') {
      ripSole = ripDa(p.m[1].replace(/\s+/g, ''))
    } else if (p.tipo === 'lato') {
      perLato = true
    }
  }
  if (!fasi.length && (serieSole != null || ripSole != null)) {
    fasi.push(faseVuota({ serie: serieSole, rip: ripSole }))
  }
  if (durataSec != null) {
    if (fasi.length || recuperoSec != null || !conNome) recuperoSec = recuperoSec ?? durataSec
    else fasi.push(faseVuota({ serie: 1, rip: { sec: durataSec } }))
  }
  // Un peso solo in fondo ("3x5 poi 2x2 80kg"), o scritto prima delle serie,
  // vale per tutte le fasi che non ne hanno uno.
  const caricoComune = carichiFuori.length ? carichiFuori[carichiFuori.length - 1] : null
  if (fasi.length > 1) {
    const conPeso = fasi.filter((f) => f.carico)
    if (conPeso.length === 1 && fasi[fasi.length - 1].carico && !caricoComune) {
      for (const f of fasi) f.carico = conPeso[0].carico
    }
  }
  if (perLato) for (const f of fasi) f.perLato = true

  // Quello che avanza è nota: tolti nome, pezzi e le parole che legano le fasi.
  let resto = ''
  let da = conNome ? primo : 0
  for (const p of pezzi) {
    if (p.inizio > da) resto += ' ' + testo.slice(da, p.inizio)
    da = Math.max(da, p.fine)
  }
  resto += ' ' + testo.slice(da)
  resto = resto
    .replace(/(^|\s)(?:poi|then|e poi|\+|x|,|;|\||·|e|and)(?=\s|$)/gi, ' ')
    .replace(/\(\s*\)/g, ' ')
  resto = pulisciNota(resto)
  // "panca 3x10 60": un numero nudo dopo le serie, senza altro carico, è il peso.
  if (/^\d+(?:[.,]\d+)?$/.test(resto) && fasi.length === 1 && !fasi[0].carico && !caricoComune) {
    fasi[0].carico = leggiCaricoSingolo(resto + 'kg')
    resto = ''
  }
  if (resto) note.push(resto)
  if (!conNome) {
    const pre = pulisci(testo.slice(0, primo))
    if (pre && !note.includes(pre) && primo < testo.length) note.unshift(pre)
  }

  return {
    nome,
    fasi: fasi.length ? fasi : null,
    caricoComune,
    recuperoSec,
    perLato,
    note: note.filter(Boolean),
    haPezzi: pezzi.length > 0,
  }
}

// Le parti di schema accumulate da più righe: quello che manca si riempie con
// le righe dopo, quello che c'è già resta.
function riempi(base, riga) {
  if (!base.fasi && riga.fasi) base.fasi = riga.fasi
  else if (base.fasi && riga.fasi) {
    // Una riga di sole ripetizioni o di sole serie completa la fase che c'è.
    const f = base.fasi[base.fasi.length - 1]
    const r = riga.fasi[0]
    if (riga.fasi.length === 1 && (f.serie == null || f.rip == null)) {
      if (f.serie == null) f.serie = r.serie
      if (f.rip == null) f.rip = r.rip
      if (!f.carico) f.carico = r.carico
    }
  }
  if (!base.caricoComune && riga.caricoComune) base.caricoComune = riga.caricoComune
  if (base.recuperoSec == null && riga.recuperoSec != null) base.recuperoSec = riga.recuperoSec
  if (riga.perLato) base.perLato = true
}

function schemaDa(parti, settimana = null) {
  const sopra = settimana || {}
  const fasi = (sopra.fasi || parti.fasi || [faseVuota()]).map((f) => ({ ...f }))
  const comune = sopra.caricoComune || parti.caricoComune
  for (const f of fasi) {
    if (!f.carico && comune) f.carico = comune
    if (parti.perLato || sopra.perLato) f.perLato = true
  }
  return {
    fasi,
    recuperoSec: sopra.recuperoSec ?? parti.recuperoSec ?? null,
    nota: '',
  }
}

// Una riga senza pezzi dopo un esercizio: è il nome di uno nuovo o una nota
// a quello di prima? Un nome è corto e somiglia a un esercizio.
function sembraEsercizio(testo) {
  const parole = testo.split(/\s+/).length
  if (parole > 6) return false
  return !!gruppoDaNome(testo)
}

/**
 * Legge una scheda dal testo.
 * @returns {{ scheda: object, problemi: { riga: number, testo: string, motivo: string }[] }}
 */
export function leggiScheda(testo, nomeScelto = '') {
  const righe = String(testo || '').replace(/\r/g, '').split('\n')
  const problemi = []
  const giorni = []
  let titolo = ''
  let settimaneScritte = null
  let giorno = null
  let es = null // l'esercizio in costruzione: { nome, note, parti, bersaglio, settimane, riga, superserie }
  let vuotaDopo = false // una riga vuota dopo l'ultimo esercizio
  let etichetta = null // la lettera di "A1)", "A2)": stessa lettera = superserie
  const esercizi = []

  // Le schede scritte A SEZIONI per settimana ("Settimana 1" → i giorni →
  // "Settimana 2" → gli stessi giorni): dalla seconda sezione in poi un giorno
  // con lo stesso nome è quello di prima, e un esercizio con lo stesso nome
  // riceve lo schema di quelle settimane.
  let sezione = null // le settimane della sezione in corso
  let sezioni = 0
  let usati = new Set() // gli esercizi del giorno già ritrovati in questa sezione

  const nuovoGiornoDa = (nomeGiorno) => {
    es = null
    etichetta = null
    usati = new Set()
    if (sezioni > 1) {
      const esiste = giorni.find((g) => g.tipo === 'workout' && normalizzaNome(g.nome) === normalizzaNome(nomeGiorno))
      if (esiste) {
        giorno = esiste
        return
      }
    }
    giorno = { tipo: 'workout', nome: nomeGiorno, esercizi: [] }
    giorni.push(giorno)
  }
  const partiDi = (r) => ({
    fasi: r.fasi,
    caricoComune: r.caricoComune,
    recuperoSec: r.recuperoSec,
    perLato: r.perLato,
  })
  const nuovoEs = (r, n, superserie) => {
    if (!giorno) nuovoGiornoDa(giorni.length ? `Giorno ${giorni.length + 1}` : 'Giorno 1')
    vuotaDopo = false
    if (sezioni > 1) {
      const esiste = giorno.esercizi.find((e) => !usati.has(e) && normalizzaNome(e.nome) === normalizzaNome(r.nome))
      if (esiste) {
        es = esiste
        usati.add(es)
        es.bersaglio = partiDi(r)
        for (const w of sezione) es.settimane[w] = es.bersaglio
        for (const nota of r.note) if (!es.note.includes(nota)) es.note.push(nota)
        return
      }
    }
    es = {
      nome: r.nome,
      note: [...r.note],
      parti: partiDi(r),
      settimane: {},
      riga: n,
      superserie,
    }
    es.bersaglio = es.parti
    if (sezione) for (const w of sezione) es.settimane[w] = es.parti
    giorno.esercizi.push(es)
    usati.add(es)
    esercizi.push(es)
  }

  righe.forEach((grezza, i) => {
    const n = i + 1
    const rientrata = /^\s+\S/.test(grezza)
    let t = grezza.replace(/\*\*|__/g, '').trim()
    if (!t) {
      vuotaDopo = true
      return
    }
    // "A1) Panca", "A2) Croci": la stessa lettera di fila è una superserie.
    let superserie = false
    // ⚠️ Non su "S1-2: 4x10", che è una settimana.
    const lab = RE_SETTIMANA.test(t) ? null : t.match(/^([A-Za-z])(\d{1,2})(?:\s*[.)]\s+|\s+(?=\p{L}))/u)
    if (lab) {
      const lettera = lab[1].toUpperCase()
      superserie = lettera === etichetta && parseInt(lab[2], 10) > 1
      etichetta = lettera
      t = t.slice(lab[0].length)
    }
    t = t.replace(RE_PUNTO, '').trim()
    if (!t) return

    let m
    if ((m = t.match(RE_NOME_SCHEDA)) && !giorni.length) {
      titolo = pulisci(m[1]) || titolo
      return
    }
    if ((m = t.match(RE_NUM_SETTIMANE))) {
      settimaneScritte = Math.min(MAX_SETTIMANE, parseInt(m[1] || m[2], 10)) || null
      return
    }
    if ((m = t.match(RE_SETTIMANA))) {
      const settimane = settimaneDi(m[1])
      if (!settimane.length) {
        problemi.push({ riga: n, testo: t, motivo: 'Non capisco di quali settimane si parla' })
        return
      }
      // "Settimana 1" da sola, non rientrata: comincia una sezione.
      if (!pulisci(m[2]) && !rientrata) {
        sezione = settimane
        sezioni += 1
        giorno = null
        es = null
        return
      }
      if (!es) {
        problemi.push({ riga: n, testo: t, motivo: 'Una settimana senza un esercizio sopra a cui riferirsi' })
        return
      }
      const r = leggiRiga(m[2], { conNome: false })
      if (!r.haPezzi) {
        problemi.push({ riga: n, testo: t, motivo: 'Settimana senza serie, ripetizioni o carico' })
        return
      }
      for (const w of settimane) es.settimane[w] = r
      for (const nota of r.note) if (!es.note.includes(nota)) es.note.push(nota)
      return
    }
    if (!rientrata || !es) {
      const giornoTitolo = t.match(RE_GIORNO) && !trovaPezzi(t).some((p) => p.tipo === 'fase')
      // "Upper A:" — una riga che finisce coi due punti e non ha schema.
      const titoloDuePunti = /:\s*$/.test(t) && !trovaPezzi(t).length && t.length <= 40
      if (giornoTitolo || (titoloDuePunti && !RE_NOTA.test(t)) || /^#+\s*\S/.test(t)) {
        nuovoGiornoDa(pulisci(t.replace(/^#+\s*/, '')))
        return
      }
    }
    if ((m = t.match(RE_RIPOSO)) && !trovaPezzi(t).some((p) => ['rec', 'tempo', 'fase'].includes(p.tipo))) {
      // Il riposo si scrive una volta: nelle sezioni dopo la prima è lo stesso.
      if (sezioni <= 1) giorni.push({ tipo: 'rest', nome: 'Rest', nota: pulisci(m[1] || m[2] || ''), esercizi: [] })
      giorno = null
      es = null
      return
    }
    if (/^(?:nota|note|nb|n\.b\.)\s*[:.]/i.test(t)) {
      const nota = pulisci(t.replace(/^(?:nota|note|nb|n\.b\.)\s*[:.]\s*/i, ''))
      if (es) es.note.push(nota)
      else if (giorno) giorno.nota = [giorno.nota, nota].filter(Boolean).join(' · ')
      else problemi.push({ riga: n, testo: t, motivo: 'Una nota senza un esercizio a cui attaccarla' })
      return
    }
    // Il titolo della scheda: la prima riga, prima di giorni ed esercizi, se
    // non ha schema e non somiglia a un esercizio ("PROGRAMMA IPERTROFIA").
    if (!giorni.length && !esercizi.length && !titolo && !trovaPezzi(t).length && !sembraEsercizio(t)) {
      titolo = pulisci(t)
      return
    }

    if (/^\+\s*/.test(t)) {
      superserie = true
      t = t.replace(/^\+\s*/, '')
    }
    const r = leggiRiga(t)

    if (r.nome && /\p{L}/u.test(r.nome)) {
      // Una riga senza schema subito sotto un esercizio dello stesso blocco,
      // che non somiglia a un esercizio: è una nota a quello.
      if (!r.haPezzi && es && !vuotaDopo && !superserie && (rientrata || !sembraEsercizio(r.nome))) {
        es.note.push(pulisciNota(t))
        return
      }
      // "Curl + French press (superserie) 3x12": due esercizi, in superserie.
      const coppia = r.nome.match(/^(.+?)\s+\+\s+(.+)$/)
      if (coppia) {
        const parola = /\b(?:in\s+)?(?:superserie|superset|ss|jumpset)\b/i
        const a = pulisci(coppia[1].replace(parola, ''))
        const b = pulisci(coppia[2].replace(parola, '').replace(/\(\s*\)/g, ''))
        if (a && b && (parola.test(r.nome) || (sembraEsercizio(a) && sembraEsercizio(b)))) {
          const copia = () => ({ ...r, fasi: r.fasi && r.fasi.map((f) => ({ ...f })) })
          nuovoEs({ ...copia(), nome: a }, n, superserie)
          nuovoEs({ ...copia(), nome: b, note: [] }, n, true)
          return
        }
      }
      nuovoEs(r, n, superserie)
      return
    }
    if (r.haPezzi) {
      if (!es) {
        problemi.push({ riga: n, testo: t, motivo: 'Serie o recupero senza il nome di un esercizio' })
        return
      }
      riempi(es.bersaglio, r)
      for (const nota of r.note) if (!es.note.includes(nota)) es.note.push(nota)
      return
    }
    problemi.push({ riga: n, testo: t, motivo: 'Non capisco questa riga' })
  })

  const nome = pulisci(nomeScelto) || titolo || 'Scheda importata'

  // Le settimane: quelle scritte in testa, o la più alta citata; senza, 5
  // (la durata tipica di una scheda), da cambiare poi nell'editor.
  const citate = esercizi.flatMap((e) => Object.keys(e.settimane).map(Number))
  const maxCitata = citate.length ? Math.max(...citate) : 0
  const numeroSettimane = settimaneScritte || maxCitata || (esercizi.length ? 5 : 1)
  if (settimaneScritte && maxCitata > settimaneScritte) {
    for (const e of esercizi) {
      const oltre = Object.keys(e.settimane).map(Number).filter((w) => w > settimaneScritte)
      if (oltre.length) {
        problemi.push({
          riga: e.riga,
          testo: e.nome,
          motivo: `Settimana ${oltre.join(', ')} oltre le ${settimaneScritte} della scheda: non la uso`,
        })
      }
    }
  }

  for (const e of esercizi) {
    const fatto = (e.parti.fasi || []).some((f) => f.serie || f.rip != null)
    const settimaneFatte = Object.values(e.settimane).some((r) => r.fasi)
    if (!fatto && !settimaneFatte) {
      problemi.push({ riga: e.riga, testo: e.nome, motivo: 'Mancano serie e ripetizioni: aggiungile nell’editor' })
    }
  }

  const giorniFinali = giorni.map((g) => {
    if (g.tipo === 'rest') return nuovoGiorno({ tipo: 'rest', nome: 'Rest', nota: g.nota })
    return nuovoGiorno({
      tipo: 'workout',
      nome: g.nome,
      nota: g.nota || '',
      esercizi: g.esercizi.map((e, k) => {
        // Settimane tutte uguali (una scheda scritta in una sezione sola, o con
        // "S1-5"): non varia, è lo schema di sempre.
        const tutte = Array.from({ length: numeroSettimane }, (_, w) => {
          let ultima = null
          for (let x = 1; x <= w + 1; x++) if (e.settimane[x]) ultima = e.settimane[x]
          return JSON.stringify(schemaDa(e.parti, ultima))
        })
        const varia = Object.keys(e.settimane).length > 0 && new Set(tutte).size > 1
        const nota = [...new Set(e.note.filter(Boolean))].join(' · ')
        const base = {
          nome: e.nome || 'Esercizio',
          nota,
          insiemeAlPrecedente: k > 0 && e.superserie,
        }
        if (!varia) {
          const unico = Object.keys(e.settimane).length ? JSON.parse(tutte[0]) : schemaDa(e.parti)
          return nuovoEsercizio({ ...base, variaPerSettimana: false, schemaBase: unico })
        }
        // Una settimana non scritta vale come quella prima (o lo schema base).
        const settimane = []
        let ultima = null
        for (let w = 1; w <= numeroSettimane; w++) {
          if (e.settimane[w]) ultima = e.settimane[w]
          settimane.push(schemaDa(e.parti, ultima))
        }
        return nuovoEsercizio({ ...base, variaPerSettimana: true, schemaBase: schemaDa(e.parti), settimane })
      }),
    })
  })

  return { scheda: nuovaScheda({ nome, numeroSettimane, giorni: giorniFinali }), problemi }
}

/** Solo la scheda (per chi non mostra i problemi). */
export function parseSchedaTesto(testo, nomeScelto = '') {
  return leggiScheda(testo, nomeScelto).scheda
}
