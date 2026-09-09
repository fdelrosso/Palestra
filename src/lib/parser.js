import { nuovaScheda, nuovoGiorno, nuovoEsercizio, schemaVuoto } from '../data/model.js'

// ---------------------------------------------------------------------------
// Parser del testo della scheda inviato dal PT via WhatsApp.
//
// È volutamente "best effort": il formato umano è irregolare, quindi l'obiettivo
// è pre-compilare l'80-90% e portare l'utente nell'editor per rifinire.
// ---------------------------------------------------------------------------

const RE_SERIE_RIP = /(\d+)\s*[x×]\s*(\d+(?:\/\d+)?)/i
const RE_SERIE_ONLY = /(\d+)\s*serie\b/i
const RE_KG = /(\d+(?:[.,]\d+)?)\s*kg\b/i
const RE_RM = /\b(\d+)\s*rm\b/i
const RE_REC = /rec\.?\s*([\d][\d.,]*\s*(?:min|'|"|m)?)/i
const RE_MIN = /\b(\d+(?:[.,]\d+)?)\s*min\b/i
const RE_SEC = /\b(\d+)\s*"/

const pulisci = (s) =>
  (s || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:·-]+|[\s.,;:·-]+$/g, '')
    .trim()

const cleanRec = (s) => (s || '').replace(/\s+/g, '').trim()

// Indice del primo "token da schema" nella riga del nome, per separare nome e schema.
function primoSchemaIdx(line) {
  let idx = null
  for (const re of [RE_SERIE_RIP, RE_KG, RE_RM, RE_REC, RE_SERIE_ONLY, RE_MIN]) {
    const m = line.match(re)
    if (m && (idx === null || m.index < idx)) idx = m.index
  }
  return idx
}

// Estrae i campi schema da un pezzo di testo; ritorna anche il testo "resto".
function parseScheme(text) {
  const scheme = { serie: '', ripetizioni: '', carico: '', recupero: '' }
  let resto = ' ' + text + ' '
  let m = text.match(RE_SERIE_RIP)
  if (m) {
    scheme.serie = m[1]
    scheme.ripetizioni = m[2]
    resto = resto.replace(m[0], ' ')
  } else if ((m = text.match(RE_SERIE_ONLY))) {
    scheme.serie = m[1]
    resto = resto.replace(m[0], ' ')
  }
  if ((m = text.match(RE_KG))) {
    scheme.carico = m[1].replace('.', ',') + 'kg'
    resto = resto.replace(m[0], ' ')
  }
  if ((m = text.match(RE_REC))) {
    scheme.recupero = cleanRec(m[1])
    resto = resto.replace(m[0], ' ')
  } else if ((m = text.match(RE_MIN))) {
    scheme.recupero = m[0].replace(/\s+/g, '')
    resto = resto.replace(m[0], ' ')
  } else if ((m = text.match(RE_SEC))) {
    scheme.recupero = m[1] + '"'
    resto = resto.replace(m[0], ' ')
  }
  return { scheme, resto }
}

function mergeFill(base, scheme) {
  for (const k of ['serie', 'ripetizioni', 'carico', 'recupero']) {
    if (scheme[k] && !base[k]) base[k] = scheme[k]
  }
}
function mergeOver(base, scheme) {
  const out = { ...base }
  for (const k of ['serie', 'ripetizioni', 'carico', 'recupero']) {
    if (scheme[k]) out[k] = scheme[k]
  }
  return out
}

function parseEsercizio(lines) {
  const nameLine = lines[0]
  const notaParts = []

  // Punto di taglio nome/schema: il primo tra "prima frase (punto)" e primo token schema.
  const periodMatch = nameLine.match(/\.\s/)
  const periodIdx = periodMatch ? periodMatch.index : null
  const schemaIdx = primoSchemaIdx(nameLine)
  let splitIdx = null
  if (periodIdx !== null) splitIdx = periodIdx
  if (schemaIdx !== null && (splitIdx === null || schemaIdx < splitIdx)) splitIdx = schemaIdx

  let nome
  const base = { serie: '', ripetizioni: '', carico: '', recupero: '' }
  if (splitIdx !== null) {
    nome = nameLine.slice(0, splitIdx)
    const tail = nameLine.slice(splitIdx)
    const { scheme, resto } = parseScheme(tail)
    mergeFill(base, scheme)
    const rm = tail.match(RE_RM)
    if (rm) notaParts.push(rm[0].replace(/\s+/g, ''))
    const r = pulisci(resto.replace(RE_RM, ''))
    if (r) notaParts.push(r)
  } else {
    nome = nameLine
  }
  nome = pulisci(nome)

  // Righe successive: schemi per settimana ("SettN ...") o schema base o note.
  const weekMap = {}
  for (const ln of lines.slice(1)) {
    const sm = ln.match(/^sett\.?\s*(\d+(?:\s*[-–,]\s*\d+)*)\s*(.*)$/i)
    if (sm) {
      const weeks = sm[1].split(/[-–,]/).map((x) => parseInt(x.trim(), 10)).filter(Boolean)
      const { scheme, resto } = parseScheme(sm[2])
      for (const w of weeks) weekMap[w] = scheme
      const r = pulisci(resto.replace(RE_RM, ''))
      if (r) notaParts.push(r) // es. "cedimento", "tra gli arti"
      continue
    }
    const { scheme, resto } = parseScheme(ln)
    mergeFill(base, scheme)
    const rm = ln.match(RE_RM)
    if (rm) notaParts.push(rm[0].replace(/\s+/g, ''))
    const r = pulisci(resto.replace(RE_RM, ''))
    if (r) notaParts.push(r)
  }

  const nota = [...new Set(notaParts.filter(Boolean))].join(' · ')
  const weeks = Object.keys(weekMap).map(Number)

  if (weeks.length) {
    return { nome, nota, _varia: true, _base: base, _weekMap: weekMap, _maxWeek: Math.max(...weeks) }
  }
  return { nome, nota, _varia: false, _base: base }
}

// Divide il testo in giorni e ciascun giorno in blocchi-esercizio (separati da righe vuote).
export function parseSchedaTesto(testo, nomeDefault = 'Scheda importata') {
  const righe = String(testo || '').replace(/\r/g, '').split('\n')
  const giorni = []
  let corrente = null // giorno workout in costruzione
  let blocco = []
  const parsed = [] // esercizi grezzi (con _varia) per calcolare numeroSettimane

  const chiudiBlocco = () => {
    if (blocco.length === 0) return
    const first = blocco[0].trim()
    if (/^giorno\b/i.test(first)) {
      corrente = nuovoGiorno({ tipo: 'workout', nome: pulisci(first) })
      giorni.push(corrente)
      // eventuali righe extra nel blocco header -> esercizio
      if (blocco.length > 1) {
        const raw = parseEsercizio(blocco.slice(1))
        raw._giorno = corrente
        parsed.push(raw)
      }
    } else if (/^rest\b/i.test(first)) {
      const nota = (first.match(/\(([^)]*)\)/) || [])[1] || ''
      giorni.push(nuovoGiorno({ tipo: 'rest', nome: 'Rest', nota: pulisci(nota) }))
      corrente = null
    } else if (corrente) {
      const raw = parseEsercizio(blocco.map((l) => l.trim()))
      raw._giorno = corrente
      parsed.push(raw)
    }
    blocco = []
  }

  for (const r of righe) {
    if (r.trim() === '') chiudiBlocco()
    else blocco.push(r)
  }
  chiudiBlocco()

  // numeroSettimane = massima settimana citata (default 5 se ci sono esercizi, altrimenti 1).
  const maxWeek = parsed.reduce((mx, e) => Math.max(mx, e._maxWeek || 0), 0)
  const numeroSettimane = maxWeek > 0 ? maxWeek : parsed.length ? 5 : 1

  // Costruisce gli esercizi finali e li appende ai rispettivi giorni.
  for (const e of parsed) {
    let esercizio
    if (e._varia) {
      let last = { ...e._base }
      const settimane = []
      for (let i = 1; i <= numeroSettimane; i++) {
        if (e._weekMap[i]) last = mergeOver(e._base, e._weekMap[i])
        settimane.push(schemaVuoto(last))
      }
      esercizio = nuovoEsercizio({ nome: e.nome || 'Esercizio', nota: e.nota, variaPerSettimana: true, settimane })
    } else {
      esercizio = nuovoEsercizio({
        nome: e.nome || 'Esercizio',
        nota: e.nota,
        variaPerSettimana: false,
        schemaBase: schemaVuoto(e._base),
      })
    }
    e._giorno.esercizi.push(esercizio)
  }

  return nuovaScheda({ nome: nomeDefault, numeroSettimane, giorni })
}
