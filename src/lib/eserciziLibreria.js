// ---------------------------------------------------------------------------
// Libreria esercizi: per ogni gruppo muscolare (vedi lib/muscoli) un catalogo
// di tutte le varianti più comuni. Usata da:
//   - la sezione "Esercizi" (sfoglia le varianti per gruppo);
//   - il generatore di allenamenti consigliati (lib/consiglio), come pool di
//     esercizi da proporre quando non se ne conoscono di "propri".
//
// `gruppoDaNome(nome)` prova a indovinare il gruppo di un esercizio dal nome
// (prima per appartenenza al catalogo, poi per parole chiave): serve a taggare
// col gruppo gli esercizi dello storico/schede che non lo riportano.
// ---------------------------------------------------------------------------

import { GRUPPI } from './muscoli'

export const LIBRERIA = {
  petto: [
    'Panca piana bilanciere',
    'Panca piana manubri',
    'Panca inclinata bilanciere',
    'Panca inclinata manubri',
    'Panca declinata bilanciere',
    'Chest press macchina',
    'Croci ai cavi',
    'Croci ai cavi alti',
    'Croci ai cavi bassi',
    'Croci su panca piana manubri',
    'Croci su panca inclinata manubri',
    'Pectoral machine (pec deck)',
    'Spinte al multipower (Smith)',
    'Dips alle parallele (petto)',
    'Piegamenti (push-up)',
    'Pullover con manubrio',
  ],
  schiena: [
    'Trazioni presa prona',
    'Trazioni presa supina (chin-up)',
    'Trazioni presa neutra',
    'Lat machine avanti',
    'Lat machine presa inversa',
    'Lat machine presa stretta',
    'Pulley basso (rematore al cavo)',
    'Rematore bilanciere',
    'Rematore manubrio singolo',
    'Rematore Pendlay',
    'Rematore T-bar',
    'Rematore alla macchina',
    'Pullover ai cavi',
    'Stacco da terra',
    'Stacco rumeno',
    'Hyperextension (lombari)',
    'Face pull',
  ],
  gambe: [
    'Squat bilanciere',
    'Squat frontale',
    'Hack squat',
    'Leg press',
    'Pressa 45°',
    'Affondi con manubri',
    'Affondi bulgari (split squat)',
    'Goblet squat',
    'Leg extension',
    'Leg curl sdraiato',
    'Leg curl seduto',
    'Stacco gambe tese',
    'Calf raise in piedi',
    'Calf raise seduto',
    'Adductor machine',
    'Abductor machine',
    'Step up',
    'Stacco sumo',
  ],
  spalle: [
    'Lento avanti bilanciere (military)',
    'Lento avanti manubri',
    'Arnold press',
    'Shoulder press macchina',
    'Alzate laterali manubri',
    'Alzate laterali ai cavi',
    'Alzate frontali manubri',
    'Alzate posteriori (rear delt)',
    'Reverse pec deck (rear delt machine)',
    'Tirate al mento (upright row)',
    'Face pull',
    'Scrollate bilanciere (shrug)',
    'Scrollate manubri',
  ],
  bicipiti: [
    'Curl bilanciere',
    'Curl bilanciere EZ',
    'Curl manubri alternato',
    'Curl manubri simultaneo',
    'Curl a martello (hammer)',
    'Curl concentrato',
    'Curl panca Scott (preacher)',
    'Curl ai cavi',
    'Curl panca inclinata',
    'Curl Spider',
    'Curl inverso (reverse)',
  ],
  tricipiti: [
    'Push down ai cavi (corda)',
    'Push down ai cavi (barra)',
    'Push down presa inversa',
    'French press bilanciere EZ',
    'French press manubri',
    'Estensioni sopra la testa ai cavi',
    'Estensione manubrio singolo dietro la testa',
    'Dips alle parallele',
    'Dips tra due panche',
    'Panca piana presa stretta',
    'Kickback manubri',
    'Kickback ai cavi',
  ],
  addome: [
    'Crunch a terra',
    'Crunch inverso',
    'Crunch ai cavi',
    'Plank',
    'Plank laterale',
    'Russian twist',
    'Sit-up',
    'Leg raise a terra',
    'Leg raise alla sbarra',
    'Bicycle crunch',
    'Mountain climber',
    'Ab wheel (ruota)',
    'Hollow hold',
    'V-up',
  ],
  cardio: [
    'Tapis roulant (corsa)',
    'Camminata in salita',
    'Cyclette',
    'Ellittica',
    'Vogatore (rowing)',
    'Corda per saltare',
    'Stair climber (scalatore)',
    'HIIT sprint',
    'Bici da spinning',
  ],
}

// Parole chiave per indovinare il gruppo dal nome, quando l'esercizio non è nel
// catalogo (tipico delle schede scritte a mano dal PT).
//
// L'ordine conta due volte:
//   - i gruppi con parole INEQUIVOCABILI vanno prima di quelli con parole
//     generiche, se no "Curl panca Scott" diventa petto per via di "panca";
//   - dentro un gruppo, le parole devono essere abbastanza lunghe da non
//     pescare dentro altre parole: "chin" (di chin-up) sta dentro "maCHINe" e
//     "macCHINa", e da solo mandava ogni macchina nella schiena.
const KEYWORDS = [
  ['gambe', ['squat', 'affond', 'leg press', 'leg extension', 'leg curl', 'pressa', 'polpacc', 'calf', 'adduct', 'abduct', 'hack', 'goblet', 'gambe tese', 'stacco sumo', 'step up']],
  ['addome', ['crunch', 'plank', 'addominal', 'russian twist', 'sit-up', 'situp', 'leg raise', 'mountain climber', 'hollow', 'ab wheel', 'bicycle', 'v-up', 'core']],
  ['cardio', ['tapis', 'corsa', 'cyclette', 'ellittica', 'vogatore', 'rowing', 'corda per', 'spinning', 'hiit', 'camminata', 'stair', 'bici da', 'cardio']],
  ['bicipiti', ['curl', 'hammer', 'scott', 'preacher', 'bicip', 'martello', 'spider']],
  ['tricipiti', ['push down', 'pushdown', 'french press', 'tricip', 'kickback', 'estensioni sopra', 'estensione manubrio', 'dips', 'presa stretta']],
  ['spalle', ['lento avanti', 'military', 'alzate', 'arnold', 'shoulder', 'upright', 'tirate al mento', 'rear delt', 'scrollate', 'shrug', 'face pull', 'deltoid']],
  ['schiena', ['trazion', 'lat machine', 'rematore', 'pulley', 'stacco', 'pull down', 'pulldown', 'chin-up', 'chin up', 'hyperext', 'iperestensioni', 'pullover', 'row ']],
  ['petto', ['panca', 'croci', 'chest', 'pector', 'push-up', 'piegament', 'spinte', 'distensioni']],
]

// Normalizza un nome per confronti (minuscolo, senza accenti, spazi compattati).
export function normalizzaNome(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Slug stabile di un esercizio (per key/selezione).
export function slugEsercizio(nome) {
  return normalizzaNome(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Indice inverso slug → gruppo, costruito una volta dal catalogo.
const INDICE_SLUG = (() => {
  const m = {}
  for (const g of GRUPPI) {
    for (const nome of LIBRERIA[g.id] || []) {
      const s = slugEsercizio(nome)
      if (!(s in m)) m[s] = g.id
    }
  }
  return m
})()

/**
 * Esercizi di un gruppo come oggetti { id, nome, gruppo }.
 * @param {string} gruppoId
 */
export function eserciziDiGruppo(gruppoId) {
  return (LIBRERIA[gruppoId] || []).map((nome) => ({
    id: slugEsercizio(nome),
    nome,
    gruppo: gruppoId,
  }))
}

// ---------------------------------------------------------------------------
// I GRUPPI di un esercizio — al plurale.
//
// Un esercizio può lavorare più gruppi: i dip sono petto E tricipiti, lo
// stacco rumeno è gambe E schiena. Per anni il modello ne ha tenuto uno solo
// (`gruppo`), e il recap di un allenamento di dip accendeva il petto e
// lasciava spenti i tricipiti.
//
// ⚠️ `gruppi` è l'elenco vero; `gruppo` resta, ed è il PRIMO dell'elenco —
// il principale. Non è un doppione da tenere per pigrizia: una trentina di
// punti dell'app (consigli, libreria, animazioni, excel) ragionano per gruppo
// principale e continuano a farlo. Chi ha bisogno di tutti i gruppi — il corpo
// che si accende, le pastiglie del recap, il filtro del feed — passa da
// `gruppiEsercizio`, e da nessun'altra parte. Per scriverli si passa da
// `patchGruppi`, che tiene le due cose allineate.
// ---------------------------------------------------------------------------

const ID_GRUPPI = new Set(GRUPPI.map((g) => g.id))

/**
 * Tutti i gruppi di un esercizio, dal principale.
 * In ordine: quelli scritti in `gruppi`; se mancano, il vecchio `gruppo`; se
 * manca anche quello, l'ipotesi dal nome. ⚠️ L'ipotesi dà UN gruppo solo:
 * i secondari non si indovinano, si scrivono — è il motivo per cui l'import
 * chiede di confermarli.
 * @returns {string[]}
 */
export function gruppiEsercizio(e) {
  const scritti = Array.isArray(e?.gruppi) ? e.gruppi.filter((g) => ID_GRUPPI.has(g)) : []
  if (scritti.length > 0) return [...new Set(scritti)]
  if (e?.gruppo && ID_GRUPPI.has(e.gruppo)) return [e.gruppo]
  const g = gruppoDaNome(e?.nome)
  return g ? [g] : []
}

/**
 * Solo i gruppi SCRITTI, senza ipotesi dal nome. Serve dove si modificano:
 * mostrare acceso un gruppo indovinato, che nel salvataggio non c'è, farebbe
 * credere di averlo già scelto.
 * @returns {string[]}
 */
export function gruppiScritti(e) {
  const scritti = Array.isArray(e?.gruppi) ? e.gruppi.filter((g) => ID_GRUPPI.has(g)) : []
  if (scritti.length > 0) return [...new Set(scritti)]
  return e?.gruppo && ID_GRUPPI.has(e.gruppo) ? [e.gruppo] : []
}

/**
 * La modifica da applicare a un esercizio per dargli questi gruppi: l'elenco
 * pulito (niente doppioni, niente id sconosciuti) e il principale allineato.
 * @param {string[]} gruppi
 * @returns {{ gruppi: string[], gruppo: string }}
 */
export function patchGruppi(gruppi) {
  const puliti = [...new Set((gruppi || []).filter((g) => ID_GRUPPI.has(g)))]
  return { gruppi: puliti, gruppo: puliti[0] || '' }
}

/**
 * Aggiunge o toglie un gruppo. Toccare il principale lo toglie e il secondo
 * diventa principale: l'ordine è quello in cui li si è scelti.
 */
export function alternaGruppo(gruppi, id) {
  const ora = gruppi || []
  return ora.includes(id) ? ora.filter((g) => g !== id) : [...ora, id]
}

/**
 * Prova a dedurre il gruppo muscolare dal nome di un esercizio.
 * @param {string} nome
 * @returns {string} id del gruppo, o '' se non riconosciuto
 */
export function gruppoDaNome(nome) {
  const n = normalizzaNome(nome)
  if (!n) return ''
  const slug = slugEsercizio(nome)
  if (INDICE_SLUG[slug]) return INDICE_SLUG[slug]
  for (const [gruppo, chiavi] of KEYWORDS) {
    if (chiavi.some((k) => n.includes(k.trim()))) return gruppo
  }
  return ''
}

// ---------------------------------------------------------------------------
// Cercare un esercizio per nome: la ricerca dell'editor (components/
// CercaEsercizio) e il "Usa il nome della libreria" dell'import.
//
// Si confrontano le PAROLE, senza accenti, maiuscole e parole vuote ("ai",
// "con"): "panca bil" trova "Panca piana bilanciere", "Military" trova "Lento
// avanti bilanciere (military)". Una parola cercata vale se è l'inizio di una
// parola del nome.
// ---------------------------------------------------------------------------

const PAROLE_VUOTE = new Set(['a', 'ai', 'al', 'alla', 'alle', 'con', 'da', 'di', 'del', 'e', 'in', 'la', 'le', 'il', 'su', 'per', 'the', 'with', 'of'])

function paroleDi(nome) {
  return normalizzaNome(nome)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p && !PAROLE_VUOTE.has(p))
}

// Quanto `nome` risponde a `parole` (0..1): la parte delle parole cercate che
// si trova, e a parità chi ha meno parole in più.
function punteggio(parole, nome) {
  const sue = paroleDi(nome)
  if (!parole.length || !sue.length) return 0
  const trovate = parole.filter((p) => sue.some((s) => s.startsWith(p))).length
  if (!trovate) return 0
  // "lat" è più Lat machine che Plank laterale: conta come comincia il nome.
  const inTesta = sue[0].startsWith(parole[0]) ? 0.05 : 0
  return trovate / parole.length - (sue.length - trovate) * 0.01 + inTesta
}

const NOMI_LIBRERIA = Object.entries(LIBRERIA).flatMap(([gruppo, nomi]) => nomi.map((nome) => ({ nome, gruppo })))

/**
 * Gli esercizi che rispondono a una ricerca: prima i propri (`propri`, i nomi
 * già usati nelle schede e nello storico), poi la libreria, dai più vicini.
 * @param {string} testo
 * @param {string[]} [propri]
 * @param {number} [quanti]
 * @returns {{ nome: string, gruppo: string, proprio: boolean }[]}
 */
export function cercaEsercizi(testo, propri = [], quanti = 30) {
  const parole = paroleDi(testo)
  const visti = new Set()
  const tutti = [
    ...propri.map((nome) => ({ nome, gruppo: gruppoDaNome(nome), proprio: true })),
    ...NOMI_LIBRERIA.map((e) => ({ ...e, proprio: false })),
  ].filter((e) => {
    const k = normalizzaNome(e.nome)
    if (!k || visti.has(k)) return false
    visti.add(k)
    return true
  })
  if (!parole.length) return tutti.slice(0, quanti)
  return tutti
    .map((e) => ({ e, p: punteggio(parole, e.nome) }))
    // Tutte le parole cercate devono esserci: "panca bil" non trova le croci.
    .filter(({ p }) => p > 0.9)
    // I propri prima: è quasi sempre uno di quelli che si cerca.
    .sort((a, b) => Number(b.e.proprio) - Number(a.e.proprio) || b.p - a.p)
    .slice(0, quanti)
    .map(({ e }) => e)
}

/**
 * Il nome della libreria che contiene tutte le parole di un nome scritto a
 * mano (il più corto, a parità), se non è già lui: "Panca piana" → "Panca piana bilanciere",
 * "Military" → "Lento avanti bilanciere (military)". null se non c'è.
 */
export function nomeInLibreria(nome) {
  const parole = paroleDi(nome)
  if (!parole.length) return null
  let meglio = null
  for (const e of NOMI_LIBRERIA) {
    const sue = paroleDi(e.nome)
    // Qui le parole devono esserci intere: "pec" non è "pectoral".
    const trovate = parole.filter((p) => sue.includes(p)).length
    const p = trovate / parole.length - (sue.length - trovate) * 0.01
    if (trovate && (!meglio || p > meglio.p)) meglio = { p, nome: e.nome }
  }
  // Tutte le parole scritte devono esserci: "Curl a 45 manubri" non è il
  // curl alternato, e proporlo vorrebbe dire sbagliare esercizio.
  if (!meglio || meglio.p < 0.9) return null
  return normalizzaNome(meglio.nome) === normalizzaNome(nome) ? null : meglio.nome
}

/**
 * Gli esercizi che una persona ha già usato, dal più recente, ognuno con lo
 * schema dell'ultima volta: quello di un allenamento fatto, o se non l'ha mai
 * fatto quello scritto in scheda. Servono alla ricerca dell'editor, che li
 * propone per primi e ne copia lo schema.
 * @param {object[]} schede
 * @returns {{ nome: string, schema: object|null }[]}
 */
export function eserciziPropri(schede) {
  const visti = new Map() // nome normalizzato → { nome, schema, data }
  const metti = (nome, schema, data) => {
    const k = normalizzaNome(nome)
    if (!k) return
    const c = visti.get(k)
    if (!c || data > c.data) visti.set(k, { nome: String(nome).trim(), schema: schema || null, data })
  }
  for (const s of schede || []) {
    for (const g of s.giorni || []) {
      for (const e of g.esercizi || []) {
        const schema = e.variaPerSettimana ? e.settimane?.[0] : e.schemaBase
        metti(e.nome, schema, s.creataIl || '')
      }
    }
    for (const c of s.completamenti || []) {
      for (const e of c.esercizi || []) metti(e.nome, e.schema, c.data || '')
    }
  }
  return [...visti.values()].sort((a, b) => (a.data < b.data ? 1 : -1)).map(({ nome, schema }) => ({ nome, schema }))
}
