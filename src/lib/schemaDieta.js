// ---------------------------------------------------------------------------
// Lo SCHEMA SETTIMANALE di una dieta.
//
// È il foglio che il nutrizionista dà insieme al piano: una tabella coi giorni
// della settimana in colonna e i pasti in riga, dove ogni casella dice CHE
// TIPO di piatto va fatto ("lunedì a pranzo legumi, a cena carne bianca;
// sabato sera pasto libero"). Il piano dice come si compone un pranzo; lo
// schema dice quale pranzo tocca oggi.
//
// Una casella è { giorno, pasto, categoria, testo, esempi }:
//   giorno    0 = lunedì … 6 = domenica (come si legge la settimana in Italia);
//   pasto     uno dei cinque di lib/pastiBase;
//   categoria legumi | uova | carne-bianca | carne-rossa | pesce | formaggio |
//             affettati | libero | '' (niente di preciso);
//   testo     com'è composto, se il foglio lo dice ("1 porzione di legumi +
//             pasta o pane + verdura");
//   esempi    i piatti d'esempio scritti nella casella.
//
// In "Dieta giornaliera" lo schema fa da lente sulle alternative del pasto:
// prima quelle della categoria del giorno, poi — separate, in fondo — le altre.
// Se una dieta generata dai macro non ha nessuna alternativa di quella
// categoria, se ne costruisce una qui (`pastoConCategoria`), a macro invariati.
// ---------------------------------------------------------------------------

import { SLOT_VALIDI, semplifica, slotDaNome } from './pastiBase'
import { alimentoDaId, alimentoVietato, macroDi, SEPARATORE_PASTO, trovaAlimento } from './alimenti'
import { righeDaRun } from './pdfTesto'

export const GIORNI_SETTIMANA = [
  { id: 0, nome: 'Lunedì', breve: 'Lun', chiave: 'lunedi' },
  { id: 1, nome: 'Martedì', breve: 'Mar', chiave: 'martedi' },
  { id: 2, nome: 'Mercoledì', breve: 'Mer', chiave: 'mercoledi' },
  { id: 3, nome: 'Giovedì', breve: 'Gio', chiave: 'giovedi' },
  { id: 4, nome: 'Venerdì', breve: 'Ven', chiave: 'venerdi' },
  { id: 5, nome: 'Sabato', breve: 'Sab', chiave: 'sabato' },
  { id: 6, nome: 'Domenica', breve: 'Dom', chiave: 'domenica' },
]

/** Il giorno della settimana di una data: 0 = lunedì. */
export function giornoSettimana(data = new Date()) {
  return (data.getDay() + 6) % 7
}

// ---- Le categorie ------------------------------------------------------------
// ⚠️ Parole INTERE, non sottostringhe: "fagiolini" non sono fagioli e le
// "fettine di carne" non dicono di che carne. `alimenti` sono gli id del
// catalogo (lib/alimenti) con cui si costruisce un piatto di quella categoria,
// in ordine di preferenza; `porzioneMax` i grammi oltre i quali quel piatto
// non lo mangia nessuno (le porzioni dei nutrizionisti: 3 uova, 70-80g di
// legumi secchi, 100-150g di formaggio fresco).
export const CATEGORIE = [
  {
    id: 'legumi',
    label: 'Legumi',
    breve: 'Legumi',
    parole: ['legumi', 'ceci', 'fagioli', 'lenticchie', 'piselli', 'fave', 'hummus', 'cicerchie', 'lupini',
      'edamame', 'pasta di legumi', 'tofu', 'tempeh'],
    alimenti: ['lenticchie', 'ceci', 'fagioli'],
    porzioneMax: 80,
  },
  {
    id: 'uova',
    label: 'Uova',
    breve: 'Uova',
    parole: ['uova', 'uovo', 'frittata', 'frittate', 'albume', 'albumi', 'omelette'],
    alimenti: ['uova'],
    porzioneMax: 165,
  },
  {
    id: 'carne-bianca',
    label: 'Carne bianca',
    breve: 'C. bianca',
    parole: ['carne bianca', 'carni bianche', 'pollo', 'tacchino', 'coniglio', 'petto di pollo'],
    alimenti: ['pollo', 'tacchino'],
    porzioneMax: 200,
  },
  {
    id: 'carne-rossa',
    label: 'Carne rossa',
    breve: 'C. rossa',
    parole: ['carne rossa', 'carni rosse', 'manzo', 'maiale', 'vitello', 'vitellone', 'bistecca', 'agnello',
      'cavallo', 'lonza', 'suino', 'roast beef', 'fiorentina'],
    alimenti: ['manzo', 'lonza'],
    porzioneMax: 150,
  },
  {
    id: 'pesce',
    label: 'Pesce',
    breve: 'Pesce',
    parole: ['pesce', 'merluzzo', 'nasello', 'platessa', 'salmone', 'tonno', 'spigola', 'branzino', 'orata',
      'sogliola', 'seppie', 'seppia', 'totani', 'polpo', 'calamari', 'gamberi', 'gamberetti', 'sgombro',
      'pesce spada', 'trota', 'alici', 'acciughe', 'sardine', 'cozze', 'vongole', 'baccala', 'molluschi',
      'crostacei'],
    alimenti: ['merluzzo', 'salmone', 'tonno'],
    porzioneMax: 250,
  },
  {
    id: 'formaggio',
    label: 'Formaggio',
    breve: 'Formagg.',
    parole: ['formaggio', 'formaggi', 'mozzarella', 'ricotta', 'fiocchi di latte', 'feta', 'stracchino',
      'philadelphia', 'parmigiano', 'grana', 'pecorino', 'scamorza', 'primo sale', 'caciotta', 'burrata',
      'provola', 'emmental', 'fontina', 'asiago', 'crescenza', 'squacquerone'],
    alimenti: ['mozzarella', 'ricotta', 'fiocchi-latte'],
    porzioneMax: 150,
  },
  {
    id: 'affettati',
    label: 'Affettati',
    breve: 'Affettati',
    parole: ['affettati', 'affettato', 'salumi', 'prosciutto', 'bresaola', 'speck', 'salame', 'mortadella'],
    alimenti: ['bresaola', 'prosciutto'],
    porzioneMax: 120,
  },
  {
    id: 'libero',
    label: 'Pasto libero',
    breve: 'Libero',
    parole: ['pasto fuori', 'pasto libero', 'a scelta', 'sgarro', 'ristorante', 'pizza', 'sushi'],
    alimenti: [],
  },
]

export function labelCategoria(id, breve = false) {
  const c = CATEGORIE.find((k) => k.id === id)
  return (breve ? c?.breve : c?.label) || ''
}

const RE_CATEGORIE = CATEGORIE.map((c) => ({
  id: c.id,
  re: new RegExp(
    `(^|[^a-z])(${[...c.parole].sort((a, b) => b.length - a.length).map((p) => p.replace(/ /g, '\\s+')).join('|')})(?=[^a-z]|$)`,
    'g',
  ),
}))

/**
 * Le categorie nominate in un testo, nell'ordine in cui compaiono.
 * "Riso/pasta al pomodoro + frittata" → ['uova'].
 */
export function categorieDi(testo) {
  const t = semplifica(testo)
  if (!t) return []
  const trovate = []
  for (const { id, re } of RE_CATEGORIE) {
    re.lastIndex = 0
    const m = re.exec(t)
    if (m) trovate.push({ id, pos: m.index + m[1].length })
  }
  return trovate.sort((a, b) => a.pos - b.pos).map((x) => x.id)
}

/** La categoria di un piatto: la prima nominata. '' se non se ne nomina nessuna. */
export function categoriaDi(testo) {
  return categorieDi(testo)[0] || ''
}

// ---- Il modello ------------------------------------------------------------

function normalizzaCasella(c) {
  const giorno = Number(c?.giorno)
  if (!Number.isInteger(giorno) || giorno < 0 || giorno > 6) return null
  const pasto = SLOT_VALIDI.has(c?.pasto) ? c.pasto : slotDaNome(c?.pasto)
  if (!pasto) return null
  const categoria = CATEGORIE.some((k) => k.id === c?.categoria) ? c.categoria : ''
  const testo = String(c?.testo || '').trim()
  const esempi = Array.isArray(c?.esempi) ? c.esempi.map((e) => String(e || '').trim()).filter(Boolean) : []
  if (!categoria && !testo && esempi.length === 0) return null
  return { giorno, pasto, categoria, testo, esempi }
}

/** Lo schema pulito: caselle valide, una sola per giorno e pasto (vince l'ultima). */
export function normalizzaSchema(schema) {
  if (!Array.isArray(schema)) return []
  const perChiave = new Map()
  for (const c of schema) {
    const n = normalizzaCasella(c)
    if (n) perChiave.set(`${n.giorno}-${n.pasto}`, n)
  }
  return [...perChiave.values()].sort((a, b) => a.giorno - b.giorno || ordinePasto(a.pasto) - ordinePasto(b.pasto))
}

const ORDINE = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena']
const ordinePasto = (p) => ORDINE.indexOf(p)

export function casellaDi(schema, giorno, pasto) {
  return (schema || []).find((c) => c.giorno === giorno && c.pasto === pasto) || null
}

// ---- Dal PDF: la tabella dei giorni ------------------------------------------

const PASTI_TABELLA = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena']

// Il nome di un pasto scritto come etichetta di riga. Spesso è scritto in
// verticale, una lettera o due alla volta ("PR" "A" "N" "ZO"): si prova a
// leggerlo nei due sensi e nell'ordine in cui arriva.
function pastoDaEtichetta(runs) {
  const prove = [
    runs,
    [...runs].sort((a, b) => a.y - b.y),
    [...runs].sort((a, b) => b.y - a.y),
  ]
  for (const lista of prove) {
    const t = semplifica(lista.map((r) => r.testo).join('')).replace(/[^a-z]/g, '')
    const trovato = PASTI_TABELLA.find((p) => t === p || t.startsWith(p))
    if (trovato) return slotDaNome(trovato)
  }
  return ''
}

// Il testo di una casella, riga per riga: le righe vengono dai run della
// casella, pagina per pagina (le y di due pagine non si confrontano).
function righeCasella(runs) {
  const perPagina = new Map()
  for (const r of runs) {
    const lista = perPagina.get(r.pagina) || []
    lista.push(r)
    perPagina.set(r.pagina, lista)
  }
  return [...perPagina.keys()].sort((a, b) => a - b).flatMap((p) => righeDaRun(perPagina.get(p)))
}

// "Esempi:" divide la casella in due: sopra com'è composto il pasto, sotto i
// piatti. I piatti si separano dove fra una riga e l'altra c'è più aria del
// solito (ogni esempio va a capo su due righe, e fra un esempio e l'altro c'è
// una riga vuota).
function casellaDaRighe(righe) {
  const iEsempi = righe.findIndex((r) => /^esemp[io]\b/i.test(r.testo))
  const corpo = (iEsempi >= 0 ? righe.slice(0, iEsempi) : righe).map((r) => r.testo).join(' ')
  const dopo = iEsempi >= 0 ? righe.slice(iEsempi + 1) : []
  const inline = iEsempi >= 0 ? righe[iEsempi].testo.replace(/^esemp[io]\s*:?\s*/i, '') : ''

  const esempi = []
  if (inline) esempi.push(inline)
  for (let k = 0; k < dopo.length; k += 1) {
    const r = dopo[k]
    const prima = dopo[k - 1]
    const aria = prima ? prima.y - r.y : Infinity
    const nuovo = !prima || aria > 1.7 * (r.h || 10) || aria < 0 || /^[•\-–]/.test(r.testo)
    const testo = r.testo.replace(/^[•\-–]\s*/, '')
    if (nuovo || esempi.length === 0) esempi.push(testo)
    else esempi[esempi.length - 1] += ` ${testo}`
  }

  // Il corpo è una somma ("1 porzione di legumi + pasta… + verdura"): un
  // addendo per riga, che si legge meglio.
  const parti = corpo
    .split(/(?:^|\s)\+(?:\s|$)/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const testo = parti.join('\n')
  return {
    categoria: categoriaDi(parti[0] || '') || categoriaDi(testo),
    testo,
    esempi: esempi.map((e) => e.replace(/\s+/g, ' ').trim()).filter(Boolean),
  }
}

/**
 * Lo schema settimanale letto dalle pagine di un PDF (lib/pdfTesto): cerca la
 * riga coi nomi dei giorni, ne ricava le colonne, e mette ogni pezzo di testo
 * nella casella della sua colonna e della riga del pasto sotto cui è scritto.
 *
 * ⚠️ Le righe si seguono nell'ORDINE in cui il PDF le scrive, non per altezza:
 * i programmi scrivono le tabelle riga per riga, e una riga che va a cavallo
 * fra due pagine resta una riga sola.
 *
 * @returns {{caselle:object[], trovato:boolean}}
 */
export function schemaDaPagine(pagine) {
  // Intestazioni e piè di pagina ripetuti (lib/pdfTesto li segna) non sono
  // caselle, anche quando cadono in mezzo a una riga della tabella.
  const tutti = []
  pagine.forEach((p, pagina) => {
    for (const r of p.runs || []) if (!r.ripetuta) tutti.push({ ...r, pagina })
  })

  // Le colonne: la riga con almeno quattro nomi di giorni. Si guardano i
  // SEGMENTI della riga e non i run: Word spezza "LUNEDI" in "LU" "NED" "I"
  // per la crenatura.
  let colonne = null
  let testata = null
  for (const [pagina, p] of pagine.entries()) {
    for (const riga of p.righe || []) {
      const giorni = []
      for (const s of riga.segmenti || []) {
        const t = semplifica(s.testo).replace(/[^a-z]/g, '')
        const g = GIORNI_SETTIMANA.find((x) => t === x.chiave)
        if (g && !giorni.some((y) => y.giorno === g.id)) giorni.push({ giorno: g.id, centro: (s.x + s.x1) / 2 })
      }
      if (giorni.length >= 4) {
        colonne = giorni.sort((a, b) => a.centro - b.centro)
        testata = { pagina, y: riga.y, h: riga.h || 10 }
        break
      }
    }
    if (colonne) break
  }
  if (!colonne) return { caselle: [], trovato: false }

  const larghezza =
    colonne.length > 1 ? (colonne[colonne.length - 1].centro - colonne[0].centro) / (colonne.length - 1) : 100
  const sinistra = colonne[0].centro - larghezza / 2
  const colonnaDi = (r) => {
    const centro = (r.x + r.x1) / 2
    let migliore = null
    for (const c of colonne) if (!migliore || Math.abs(c.centro - centro) < Math.abs(migliore.centro - centro)) migliore = c
    return Math.abs(migliore.centro - centro) <= larghezza * 0.75 ? migliore.giorno : null
  }
  const caselle = new Map() // "giorno-pasto" → runs
  let pasto = ''
  let etichetta = []
  const chiudiEtichetta = () => {
    if (etichetta.length) {
      const trovato = pastoDaEtichetta(etichetta)
      if (trovato) pasto = trovato
    }
    etichetta = []
  }
  for (const r of tutti) {
    if (!r.testo.trim()) continue
    // La testata e quello che c'è sopra (il nome, il titolo) non sono caselle.
    if (r.pagina < testata.pagina || (r.pagina === testata.pagina && r.y > testata.y - 0.4 * testata.h)) continue
    const centro = (r.x + r.x1) / 2
    if (centro < sinistra) {
      etichetta.push(r)
      continue
    }
    chiudiEtichetta()
    if (!pasto) continue
    const giorno = colonnaDi(r)
    if (giorno == null) continue
    const k = `${giorno}-${pasto}`
    if (!caselle.has(k)) caselle.set(k, [])
    caselle.get(k).push(r)
  }

  const out = []
  for (const [k, runs] of caselle) {
    const [giorno, slot] = k.split('-')
    const c = casellaDaRighe(righeCasella(runs))
    out.push({ giorno: Number(giorno), pasto: slot, ...c })
  }
  const caselleOk = normalizzaSchema(out)
  return { caselle: caselleOk, trovato: caselleOk.length > 0 }
}

// ---- In "Dieta giornaliera" ------------------------------------------------

/**
 * Le versioni di un pasto per un giorno, ordinate secondo lo schema.
 *
 * Senza casella (o con "pasto libero" o senza categoria) le versioni sono
 * quelle del pasto, com'erano. Con una categoria:
 *   1. quello che dice la casella (il testo e i suoi esempi);
 *   2. le versioni del pasto di quella categoria;
 *   3. quelle che non nominano nessuna categoria (vanno bene sempre);
 *   4. in fondo, separate, quelle di un'altra categoria: FUORI SCHEMA.
 *
 * @returns {{versioni:{testo:string, fonte:'schema'|'piano'|'generata', categoria:string, fuoriSchema:boolean}[],
 *            nelloSchema:number}}  `nelloSchema` = quante sono prima di quelle fuori schema.
 */
export function versioniConSchema(pasto, casella, generata = null) {
  const crea = (testo, fonte) => ({
    testo: String(testo || '').trim(),
    fonte,
    categoria: categoriaDi(testo),
    fuoriSchema: false,
  })
  const dallaCasella = casella ? [casella.testo, ...(casella.esempi || [])].map((t) => crea(t, 'schema')) : []
  const dalPiano = [pasto?.testo, ...(pasto?.opzioni || [])].map((t) => crea(t, 'piano'))

  const cat = casella?.categoria
  let ordinate
  if (!cat || cat === 'libero') {
    ordinate = [...dallaCasella, ...dalPiano]
  } else {
    // Quello che dice la casella è nello schema per definizione, anche quando
    // l'esempio nomina di passaggio un'altra cosa ("pasta con uova sode").
    for (const v of dallaCasella) v.categoria = cat
    const diQuesta = (v) => categorieDi(v.testo).includes(cat)
    const prima = [...dallaCasella, ...dalPiano.filter(diQuesta)]
    if (generata && !prima.some((v) => v.testo)) {
      prima.push({ testo: generata, fonte: 'generata', categoria: cat, fuoriSchema: false })
    }
    const neutre = dalPiano.filter((v) => !v.categoria)
    const altre = dalPiano.filter((v) => v.categoria && !diQuesta(v)).map((v) => ({ ...v, fuoriSchema: true }))
    ordinate = [...prima, ...neutre, ...altre]
  }

  // Niente doppioni (l'esempio della casella è spesso anche fra quelli del
  // piano) e niente versioni vuote.
  const viste = new Set()
  const versioni = ordinate.filter((v) => {
    const k = semplifica(v.testo)
    if (!k || viste.has(k)) return false
    viste.add(k)
    return true
  })
  return { versioni, nelloSchema: versioni.filter((v) => !v.fuoriSchema).length }
}

// "Petto di pollo: 150g" → 150
const RE_GRAMMI = /(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi)\b/i

/**
 * Lo stesso pasto con il secondo di un'altra categoria, a macro (quasi)
 * invariati: si cambia l'alimento proteico e si tolgono dal carboidrato e dal
 * condimento i carboidrati e i grassi che il nuovo porta con sé (i legumi sono
 * mezzi carboidrati: 230g di ceci al posto del pollo, col riso di prima, fanno
 * un pranzo da 400 kcal in più).
 *
 * Serve alle diete GENERATE dai macro, i cui pasti sono scritti "Alimento:
 * grammi". Per un testo scritto a mano torna null: non si indovinano grammi
 * che nessuno ha scritto.
 *
 * @returns {string|null}
 */
export function pastoConCategoria(testo, categoria, preferenze) {
  const cat = CATEGORIE.find((c) => c.id === categoria)
  if (!cat || !cat.alimenti.length) return null
  const nuovo = cat.alimenti.map(alimentoDaId).find((a) => a && !alimentoVietato(a, preferenze))
  if (!nuovo) return null

  const pezzi = String(testo || '')
    .split(SEPARATORE_PASTO)
    .filter((p, i) => i % 2 === 0)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const a = trovaAlimento(p)
      const m = p.match(RE_GRAMMI)
      return { testo: p, alimento: a, grammi: m ? parseFloat(m[1].replace(',', '.')) : null }
    })
  const iProteina = pezzi.findIndex((p) => p.alimento?.macro === 'p' && p.grammi)
  if (iProteina < 0) return null
  const vecchio = pezzi[iProteina]
  if (categorieDi(`${vecchio.alimento.nome} ${vecchio.testo}`).includes(categoria)) return null

  // Le stesse proteine, ma non oltre una porzione vera: 150g di pollo "valgono"
  // 6 uova o 180g di lenticchie secche, e nessun nutrizionista li scrive.
  // Meglio qualche grammo di proteine in meno che un piatto che non si mangia.
  const proteine = macroDi(vecchio.alimento, vecchio.grammi).proteine
  const grammiNuovo = Math.max(5, Math.round(Math.min(proteine / (nuovo.m.p / 100), cat.porzioneMax || Infinity) / 5) * 5)
  const prima = macroDi(vecchio.alimento, vecchio.grammi)
  const dopo = macroDi(nuovo, grammiNuovo)
  let extraCarbo = dopo.carbo - prima.carbo
  let extraGrassi = dopo.grassi - prima.grassi

  const riscritti = pezzi.map((p, i) => {
    if (i === iProteina) return `${nuovo.nome}: ${grammiNuovo}g`
    if (!p.alimento || !p.grammi) return p.testo
    const macro = p.alimento.macro
    const extra = macro === 'c' ? extraCarbo : macro === 'g' ? extraGrassi : 0
    if (extra <= 0) return p.testo
    const per = (macro === 'c' ? p.alimento.m.c : p.alimento.m.g) / 100
    if (!per) return p.testo
    const togli = Math.min(p.grammi, extra / per)
    if (macro === 'c') extraCarbo -= togli * per
    else extraGrassi -= togli * per
    const resto = Math.round((p.grammi - togli) / 5) * 5
    if (resto < 10) return null
    return p.testo.replace(RE_GRAMMI, `${resto}g`)
  })
  return riscritti.filter(Boolean).join(' · ')
}
