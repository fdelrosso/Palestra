// ---------------------------------------------------------------------------
// Dieta settimanale (per profilo).
//
// Una Dieta descrive COSA MANGIARE in due tipi di giornata:
//   - giorni di ALLENAMENTO (più carboidrati, più calorie);
//   - giorni di RIPOSO (meno carboidrati).
// Ha un periodo di validità (dataInizio/dataFine, modificabile) e i parametri
// usati per il calcolo, così la si può rigenerare/aggiornare.
//
// Da dove arrivano i numeri — due strade, entrambe legittime:
//   `fonte: 'calcolata'` → li stima l'app da peso/altezza/età (Mifflin-St Jeor);
//   `fonte: 'esterna'`   → li ha dati il nutrizionista e si scrivono a mano.
// Nel secondo caso l'app non ricalcola niente e non "corregge" nessuno: si
// limita a tenere i numeri e a proporre i pasti giusti nel giorno giusto.
//
// GIORNATE TIPO. Oltre ai due piani base, una dieta può avere N giornate tipo
// ("Giorno A", "Opzione pesce", "Lunedì"), ognuna marcata come giornata di
// allenamento, di riposo o valida per tutti. Servono a due cose: dare varietà
// (in "cosa mangiare oggi" ruotano) e reggere i piani che arrivano da fuori,
// che sono quasi sempre scritti così. Si possono anche importare da un PDF o da
// un testo incollato (lib/parserDieta, lib/pdfTesto).
//
// PREFERENZE. Allergie, intolleranze e cose che non si mangiano stanno sul
// profilo (lib/preferenzeCibo) e si applicano qui in due momenti: quando si
// genera la dieta (si sceglie subito un alimento ammesso) e quando la si legge
// (lib/alimenti riscrive i pasti). La dieta salvata non viene toccata a meno
// che non lo si chieda: così si vede sempre da dove si è partiti.
//
// `calcolaDieta(params)` stima le calorie e i macro e genera un piano pasti
// d'esempio che li rispetta — un punto di partenza da personalizzare. NON è un
// consiglio medico: è una stima indicativa.
// ---------------------------------------------------------------------------

import { nuovoId } from '../data/model'
import { adattaPiano, alimentoAmmesso, alimentoDaId } from './alimenti'
import {
  MOVIMENTI,
  OBIETTIVI,
  SESSI,
  datiCompleti,
  labelMovimento,
  labelObiettivo,
  metabolismoBasale,
  movimentoDi,
  numeroValido,
  obiettivoDi,
  LIMITI,
} from './datiFisici'

// Sesso, movimento e obiettivo sono la stessa cosa per la dieta e per il
// profilo (lib/datiFisici): li definisce quel file e da qui si ri-esportano,
// così le pagine che parlano di dieta continuano a importarli da dove se li
// aspettano e le liste restano UNA sola.
export { MOVIMENTI, OBIETTIVI, SESSI, labelMovimento, labelObiettivo }

/** Da dove arrivano calorie e macro di questa dieta. */
export const FONTE = { CALCOLATA: 'calcolata', ESTERNA: 'esterna' }

/** A quale tipo di giornata si applica una giornata tipo. */
export const TIPO_GIORNATA = {
  ALLENAMENTO: 'allenamento',
  RIPOSO: 'riposo',
  QUALSIASI: 'qualsiasi',
}

export const ETICHETTA_GIORNATA = {
  [TIPO_GIORNATA.ALLENAMENTO]: 'Giorni di allenamento',
  [TIPO_GIORNATA.RIPOSO]: 'Giorni di riposo',
  [TIPO_GIORNATA.QUALSIASI]: 'Tutti i giorni',
}

const arrotonda10 = (n) => Math.round(n / 10) * 10

// Data di oggi in formato 'YYYY-MM-DD' (per gli <input type="date">).
export function oggiISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ---- Generazione del piano pasti d'esempio -------------------------------

// Template dei pasti: quote (frazione) dei macro giornalieri per pasto e gli
// alimenti suggeriti, nominati per `id` del catalogo (lib/alimenti). Nominarli
// per id — e non come testo — è ciò che permette di sostituirli quando l'utente
// non può mangiarli: il catalogo sa a quale macro servono e con che densità.
// `fisso` = porzione libera (verdure/frutta), non entra nel conto dei macro.
const PASTI_TEMPLATE = [
  {
    nome: 'Colazione',
    quote: { p: 0.2, c: 0.25, g: 0.25 },
    cibi: [{ id: 'yogurt-greco' }, { id: 'avena' }, { id: 'mandorle' }, { fisso: 'Frutta fresca', porzione: '1 frutto' }],
  },
  {
    nome: 'Spuntino di metà mattina',
    quote: { p: 0.1, c: 0.1, g: 0.1 },
    cibi: [{ id: 'ricotta' }, { id: 'frutta' }, { id: 'mandorle' }],
  },
  {
    nome: 'Pranzo',
    quote: { p: 0.3, c: 0.3, g: 0.25 },
    cibi: [{ id: 'pollo' }, { id: 'riso' }, { id: 'olio' }, { fisso: 'Verdure', porzione: 'a piacere' }],
  },
  {
    nome: 'Spuntino del pomeriggio',
    quote: { p: 0.15, c: 0.15, g: 0.05 },
    cibi: [{ id: 'yogurt-greco' }, { id: 'pane' }, { id: 'noci' }],
  },
  {
    nome: 'Cena',
    quote: { p: 0.25, c: 0.2, g: 0.35 },
    cibi: [{ id: 'merluzzo' }, { id: 'patate' }, { id: 'olio' }, { fisso: 'Verdure', porzione: 'a piacere' }],
  },
]

function generaPasti(proteine, carbo, grassi, preferenze) {
  const tot = { p: proteine, c: carbo, g: grassi }
  return PASTI_TEMPLATE.map((t) => {
    const parti = t.cibi.map((c) => {
      if (c.fisso) return `${c.fisso}: ${c.porzione}`
      const base = alimentoDaId(c.id)
      // Se l'utente non può mangiarlo si prende subito l'alternativa: meglio
      // che generare un piano da correggere un attimo dopo.
      const alimento = alimentoAmmesso(base, preferenze) || base
      const targetMacro = tot[alimento.macro] * t.quote[alimento.macro]
      const grammi = Math.max(5, Math.round(targetMacro / alimento.per / 5) * 5)
      return `${alimento.nome}: ${grammi}g`
    })
    return { id: nuovoId(), nome: t.nome, testo: parti.join(' · ') }
  })
}

// Calorie + macro di un piano a partire dalle kcal target e dai grammi fissi di
// proteine/grassi (per kg): i carboidrati riempiono le calorie rimanenti.
function pianoDaKcal(kcal, proteine, grassi, preferenze) {
  const carbo = Math.max(0, Math.round((kcal - proteine * 4 - grassi * 9) / 4))
  return { kcal, proteine, carbo, grassi, pasti: generaPasti(proteine, carbo, grassi, preferenze) }
}

/**
 * Calcola una dieta consigliata (piani per giorni di allenamento e di riposo).
 * @param {{peso:number, altezza:number, eta:number, sesso:'m'|'f',
 *          movimento:string, obiettivo:string, preferenze?:object}} params
 * @returns {{allenamento:PianoGiorno, riposo:PianoGiorno}}
 */
export function calcolaDieta({ peso, altezza, eta, sesso, movimento, obiettivo, preferenze }) {
  const p = numeroValido(peso, LIMITI.peso) || 0
  const mov = movimentoDi(movimento)
  const ob = obiettivoDi(obiettivo)

  // Metabolismo basale (Mifflin-St Jeor): la stessa formula del profilo, così
  // le calorie della dieta e quelle mostrate in "I miei dati" coincidono.
  const bmr = metabolismoBasale({ peso, altezza, eta, sesso }) || 0
  // Extra calorico bruciato in una seduta di allenamento (scala col peso).
  const kcalWorkout = Math.round(p * 6)

  const mantRiposo = bmr * mov.fattore
  const mantAllen = mantRiposo + kcalWorkout
  const kcalRiposo = arrotonda10(mantRiposo * ob.fattore)
  const kcalAllen = arrotonda10(mantAllen * ob.fattore)

  const proteine = Math.round(p * ob.proteine)
  const grassi = Math.round(p * 0.9)

  return {
    allenamento: pianoDaKcal(kcalAllen, proteine, grassi, preferenze),
    riposo: pianoDaKcal(kcalRiposo, proteine, grassi, preferenze),
  }
}

/**
 * I pasti d'esempio per macro DATI DA FUORI: stesso motore della dieta
 * calcolata, ma partendo dai numeri del nutrizionista invece che dal peso.
 * Serve a chi ha le calorie sul foglio ma non l'elenco della spesa.
 */
export function pastiDaMacro({ proteine, carbo, grassi }, preferenze) {
  return generaPasti(Number(proteine) || 0, Number(carbo) || 0, Number(grassi) || 0, preferenze)
}

/**
 * La dieta che l'app propone quando NON ce n'è una scritta: si parte dai dati
 * del profilo (lib/datiFisici), si calcola il metabolismo basale e si arriva
 * alle calorie dell'obiettivo dichiarato, piani pasti compresi.
 *
 * È un oggetto Dieta completo ma NON salvato: serve a "cosa mangiare oggi" per
 * avere sempre qualcosa da dire, e a "Nuova dieta" per partire già compilata.
 * Chi la vede la può salvare con un tocco, e da quel momento è una dieta come
 * tutte le altre — modificabile e non più ricalcolata alle spalle di nessuno.
 *
 * @returns {object|null} null se i dati del profilo non bastano.
 */
export function dietaDaDatiFisici(dati, preferenze, overrides = {}) {
  if (!datiCompleti(dati)) return null
  const { allenamento, riposo } = calcolaDieta({
    peso: dati.peso,
    altezza: dati.altezza,
    eta: dati.eta,
    sesso: dati.sesso,
    movimento: dati.movimento,
    obiettivo: dati.obiettivo,
    preferenze,
  })
  return nuovaDieta({
    nome: `Dieta ${labelObiettivo(dati.obiettivo)}`,
    obiettivo: dati.obiettivo,
    fonte: FONTE.CALCOLATA,
    peso: dati.peso,
    altezza: dati.altezza,
    eta: dati.eta,
    sesso: dati.sesso,
    movimento: dati.movimento,
    allenamento,
    riposo,
    ...overrides,
  })
}

// ---- Modello -------------------------------------------------------------

function pianoVuoto() {
  return { kcal: 0, proteine: 0, carbo: 0, grassi: 0, pasti: [] }
}

/**
 * @typedef {Object} PianoGiorno
 * @property {number} kcal
 * @property {number} proteine  grammi
 * @property {number} carbo     grammi
 * @property {number} grassi    grammi
 * @property {{id:string, nome:string, testo:string}[]} pasti
 */

/**
 * @typedef {Object} GiornataTipo
 * @property {string} id
 * @property {string} nome   es. "Giorno A", "Opzione pesce"
 * @property {'allenamento'|'riposo'|'qualsiasi'} tipo
 * @property {number} kcal      0 = eredita dal piano base del suo tipo
 * @property {number} proteine
 * @property {number} carbo
 * @property {number} grassi
 * @property {{id:string, nome:string, testo:string}[]} pasti
 */

export function nuovaGiornataTipo(overrides = {}) {
  return {
    id: nuovoId(),
    nome: 'Giornata tipo',
    tipo: TIPO_GIORNATA.QUALSIASI,
    kcal: 0,
    proteine: 0,
    carbo: 0,
    grassi: 0,
    pasti: [],
    ...overrides,
  }
}

export function nuovaDieta(overrides = {}) {
  return {
    id: nuovoId(),
    nome: '',
    obiettivo: 'mantenimento',
    // Chi ha deciso i numeri: l'app o il nutrizionista (vedi FONTE).
    fonte: FONTE.CALCOLATA,
    fonteNota: '', // es. "PDF della dott.ssa Bianchi, marzo"
    // Parametri di calcolo (per rigenerare/aggiornare).
    peso: '',
    altezza: '',
    eta: '',
    sesso: 'm',
    giorniAllenamento: 3,
    movimento: 'leggero',
    // Periodo di validità (modificabile).
    dataInizio: oggiISO(),
    dataFine: '',
    // Piani base.
    allenamento: pianoVuoto(),
    riposo: pianoVuoto(),
    // Giornate tipo (facoltative): variano il menu a parità di macro.
    giornate: [],
    creataIl: new Date().toISOString(),
    ...overrides,
  }
}

function normalizzaPasti(pasti) {
  return Array.isArray(pasti)
    ? pasti.map((p) => ({ id: p.id || nuovoId(), nome: p.nome || '', testo: p.testo || '' }))
    : []
}

function normalizzaPiano(pi) {
  const base = pianoVuoto()
  if (!pi || typeof pi !== 'object') return base
  return {
    kcal: Number(pi.kcal) || 0,
    proteine: Number(pi.proteine) || 0,
    carbo: Number(pi.carbo) || 0,
    grassi: Number(pi.grassi) || 0,
    pasti: normalizzaPasti(pi.pasti),
  }
}

export function normalizzaGiornata(g) {
  const tipo = [TIPO_GIORNATA.ALLENAMENTO, TIPO_GIORNATA.RIPOSO].includes(g?.tipo)
    ? g.tipo
    : TIPO_GIORNATA.QUALSIASI
  return {
    ...nuovaGiornataTipo(),
    ...g,
    tipo,
    kcal: Number(g?.kcal) || 0,
    proteine: Number(g?.proteine) || 0,
    carbo: Number(g?.carbo) || 0,
    grassi: Number(g?.grassi) || 0,
    pasti: normalizzaPasti(g?.pasti),
  }
}

export function normalizzaDieta(dieta) {
  return {
    ...nuovaDieta(),
    ...dieta,
    // Le diete salvate prima di questo campo erano tutte calcolate dall'app.
    fonte: dieta?.fonte === FONTE.ESTERNA ? FONTE.ESTERNA : FONTE.CALCOLATA,
    allenamento: normalizzaPiano(dieta.allenamento),
    riposo: normalizzaPiano(dieta.riposo),
    // Le diete salvate prima delle giornate tipo semplicemente non ne hanno.
    giornate: Array.isArray(dieta?.giornate) ? dieta.giornate.map(normalizzaGiornata) : [],
  }
}

// ---- Utility per l'interfaccia -------------------------------------------

// Formatta 'YYYY-MM-DD' in italiano breve (es. "5 set 2026").
export function formattaData(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  )
}

export function periodoTesto(dieta) {
  const i = formattaData(dieta.dataInizio)
  const f = formattaData(dieta.dataFine)
  if (i && f) return `${i} – ${f}`
  if (i) return `Dal ${i}`
  if (f) return `Fino al ${f}`
  return 'Periodo non impostato'
}

// Una dieta è "attiva" se oggi ricade nel suo periodo di validità (estremi
// vuoti = aperti). Il confronto di stringhe 'YYYY-MM-DD' è cronologico.
export function dietaAttiva(dieta, dataISO) {
  const oggi = dataISO || oggiISO()
  const dopoInizio = !dieta.dataInizio || dieta.dataInizio <= oggi
  const primaFine = !dieta.dataFine || oggi <= dieta.dataFine
  return dopoInizio && primaFine
}

/** Il piano base del giorno: allenamento o riposo. */
export function pianoDelGiorno(dieta, allenamento) {
  return allenamento ? dieta?.allenamento : dieta?.riposo
}

/** Le giornate tipo buone per oggi (quelle del tipo giusto + le "sempre"). */
export function giornatePerTipo(dieta, allenamento) {
  const cercato = allenamento ? TIPO_GIORNATA.ALLENAMENTO : TIPO_GIORNATA.RIPOSO
  return (dieta?.giornate || []).filter(
    (g) => g.tipo === cercato || g.tipo === TIPO_GIORNATA.QUALSIASI,
  )
}

/**
 * Quale giornata tipo proporre oggi. Ruotano sul giorno del calendario: due
 * giorni di allenamento di fila non danno lo stesso menu, e la stessa data dà
 * sempre la stessa risposta (nessuna sorpresa se si riapre la pagina).
 */
export function giornataDelGiorno(dieta, allenamento, data = new Date()) {
  const buone = giornatePerTipo(dieta, allenamento)
  if (buone.length === 0) return null
  const giorniDaEpoca = Math.floor(
    new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() / 86400000,
  )
  return buone[giorniDaEpoca % buone.length]
}

/**
 * I macro da mostrare per una giornata tipo: i suoi, se li ha; altrimenti
 * quelli del piano base del giorno (una giornata importata da un PDF spesso
 * elenca i pasti e basta).
 */
export function macroGiornata(giornata, dieta, allenamento) {
  const base = pianoDelGiorno(dieta, allenamento) || {}
  if (giornata?.kcal || giornata?.proteine) return giornata
  return { ...base, pasti: giornata?.pasti || [] }
}

/**
 * La dieta riscritta secondo le preferenze alimentari: piani base e giornate
 * tipo. Non tocca i macro, solo gli alimenti (vedi lib/alimenti).
 * @returns {{dieta:object, sostituzioni:{da:string,a:string}[], avvisi:string[]}}
 */
export function adattaDieta(dieta, preferenze) {
  const sostituzioni = []
  const avvisi = []
  const applica = (piano) => {
    const r = adattaPiano(piano, preferenze)
    sostituzioni.push(...r.sostituzioni)
    avvisi.push(...r.avvisi)
    return r.piano
  }
  const adattata = {
    ...dieta,
    allenamento: applica(dieta.allenamento),
    riposo: applica(dieta.riposo),
    giornate: (dieta.giornate || []).map((g) => applica(g)),
  }
  const viste = new Set()
  const uniche = sostituzioni.filter((s) => {
    const k = `${s.da}→${s.a}`
    if (viste.has(k)) return false
    viste.add(k)
    return true
  })
  return { dieta: adattata, sostituzioni: uniche, avvisi: [...new Set(avvisi)] }
}
