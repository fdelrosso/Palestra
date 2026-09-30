// ---------------------------------------------------------------------------
// IL DIARIO: cosa si è mangiato davvero oggi.
//
// La dieta dice cosa si dovrebbe mangiare; questo file tiene il conto di cosa è
// finito nel piatto, e da lì ricava **quanto manca** — che è l'unica cosa che
// uno vuole sapere alle quattro del pomeriggio.
//
// Tre pezzi, in ordine di importanza:
//
//   1. RICONOSCERE. Si scrive "150g di pollo e una banana" e ne escono due
//      voci con i loro macro. Si guarda in due posti, in quest'ordine: prima
//      fra I MIEI CIBI (lib/cibiMiei: quelli gia' incontrati, marca compresa),
//      poi nel catalogo generico di lib/alimenti. L'ordine conta — chi ha
//      salvato "yogurt greco Fage" vuole quello, non il generico. Tutte e due
//      le strade funzionano **senza rete**: la ricerca online (lib/ricercaCibo)
//      serve solo la prima volta che si incontra un prodotto.
//      ⚠️ Quello che non si riconosce NON viene inventato: torna indietro
//      segnato come tale, e i macro li scrive la persona. Un numero sbagliato
//      inventato dall'app è peggio di un numero mancante, perché non si vede.
//
//   2. CONTARE. Somme, totali del giorno, quanto resta rispetto al piano.
//
//   3. ADATTARE. I pasti che restano da fare si riscrivono sui macro che
//      restano: se a pranzo si è esagerato coi carboidrati, la cena ne ha meno.
//      È aritmetica sui grammi, la stessa di lib/alimenti: si moltiplica ogni
//      alimento per il fattore del SUO macro, così il piatto resta quello.
//
// ⚠️ Non è un software medico e non vuole esserlo. Le densità sono valori medi
// da tabella: servono a non mangiare 1000 kcal di troppo senza accorgersene,
// non a pesare un farmaco.
// ---------------------------------------------------------------------------

import { nuovoId } from '../data/model'
import {
  ALIMENTI,
  SEPARATORE_PASTO,
  macroDi,
  normalizzaCibo,
  trovaAlimento,
} from './alimenti'
import { trovaFraIMiei } from './cibiMiei'
import { oggiISO } from './dieta'
import { PASTI_BASE, SLOT_VALIDI, slotDaNome } from './pastiBase'
import { UNITA_SCRITTE, grammiDa, numeroIt, unitaScritta } from './unita'

/** Un totale vuoto: la base di ogni somma. */
export const ZERO = { kcal: 0, proteine: 0, carbo: 0, grassi: 0 }

const arrotonda1 = (n) => Math.round(n * 10) / 10

/** Somma calorie e macro di una lista di cose che hanno quei quattro campi. */
export function somma(voci) {
  const t = (voci || []).reduce(
    (acc, v) => ({
      kcal: acc.kcal + (Number(v?.kcal) || 0),
      proteine: acc.proteine + (Number(v?.proteine) || 0),
      carbo: acc.carbo + (Number(v?.carbo) || 0),
      grassi: acc.grassi + (Number(v?.grassi) || 0),
    }),
    ZERO,
  )
  return {
    kcal: Math.round(t.kcal),
    proteine: arrotonda1(t.proteine),
    carbo: arrotonda1(t.carbo),
    grassi: arrotonda1(t.grassi),
  }
}

/** Quanto manca per arrivare all'obiettivo. Può venire NEGATIVO, ed è giusto. */
export function restante(obiettivo, mangiato) {
  return {
    kcal: Math.round((Number(obiettivo?.kcal) || 0) - (mangiato?.kcal || 0)),
    proteine: arrotonda1((Number(obiettivo?.proteine) || 0) - (mangiato?.proteine || 0)),
    carbo: arrotonda1((Number(obiettivo?.carbo) || 0) - (mangiato?.carbo || 0)),
    grassi: arrotonda1((Number(obiettivo?.grassi) || 0) - (mangiato?.grassi || 0)),
  }
}

/**
 * Come si distribuiscono le calorie fra i tre macro, in percentuale.
 * ⚠️ Si calcola sulle calorie DEI MACRO (4/4/9), non su `kcal`: se uno beve
 * una birra le due cose non coincidono, e una percentuale che non fa 100 su
 * uno schermo sembra un errore dell'app.
 */
export function percentualiMacro(tot) {
  const kp = (tot?.proteine || 0) * 4
  const kc = (tot?.carbo || 0) * 4
  const kg = (tot?.grassi || 0) * 9
  const totale = kp + kc + kg
  if (totale <= 0) return { proteine: 0, carbo: 0, grassi: 0 }
  return {
    proteine: Math.round((kp / totale) * 100),
    carbo: Math.round((kc / totale) * 100),
    grassi: Math.round((kg / totale) * 100),
  }
}

// ---- Riconoscere quello che è stato scritto -------------------------------

// Quanto pesa una misura "da cucina", in grammi. Non sono precise e non devono
// esserlo: servono a chi l'olio non lo pesa e non lo peserà mai.
// `unita` è come quella misura si chiama in lib/unita, dove ce n'è una che le
// corrisponde: serve a riscriverla uguale a schermo ("2 cucchiai", non "20 g").
const MISURE = [
  { re: /\bcucchiain[oi]\b/, grammi: 5, unita: 'cucchiaini' },
  { re: /\bcucchia[io]\b/, grammi: 10, unita: 'cucchiai' },
  { re: /\bbicchier[ei]\b/, grammi: 200 },
  { re: /\btazz[ae]\b/, grammi: 250 },
  { re: /\bvasett[oi]\b/, grammi: 0, aPezzi: true, unita: 'pz' },
  { re: /\bfett[ae]\b/, grammi: 0, aPezzi: true, unita: 'pz' },
  { re: /\bporzion[ei]\b/, grammi: 0, aPezzi: true, unita: 'pz' },
  // Il tonno si compra così e così si scrive: una scatoletta sgocciolata pesa
  // sui 60g. ⚠️ Senza questa riga "tonno 1 scatoletta" valeva UN grammo.
  { re: /\bscatolett[ae]\b/, grammi: 60 },
  { re: /\blattin[ae]\b/, grammi: 330 },
]

// I numeri scritti a parole che capitano davvero in un diario alimentare.
const NUMERI = {
  un: 1, uno: 1, una: 1, "un'": 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6,
  mezzo: 0.5, mezza: 0.5,
}
// Per riscriverli in cifre prima di cercare l'unità.
const RE_PAROLE_NUM = new RegExp(`(^|\\s)(${Object.keys(NUMERI).join('|')})(?=\\s)`, 'gi')

// Un numero secco così piccolo, su un alimento che non si conta a pezzi, non
// sono grammi: "pane 2" sono due fette, non due grammi. Meglio una porzione
// stimata (e detta) che un conto che sbaglia di 200 kcal senza farsi vedere.
const MAX_NUMERO_NON_GRAMMI = 4

// L'unità scritta subito dopo il numero: "150g", "200 ml", "2 pezzi", "1 litro".
// Le parole le tiene lib/unita, le più lunghe davanti (se no "150 grammi"
// diventerebbe "150 g" più la parola "rammi").
const RE_PESO = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNITA_SCRITTE})\\b`, 'i')
const RE_NUMERO = /(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/
const RE_PAROLA_NUM = new RegExp(`(?:^|\\s)(${Object.keys(NUMERI).join('|')})\\s`, 'i')

/**
 * Quanti grammi dice questo pezzo di testo, e come l'ha detto.
 *
 * `quantita` + `unita` sono la frase com'era ("2 pezzi"), `grammi` è quanto
 * pesa. Servono tutte e due: i conti si fanno sui grammi, ma a schermo va
 * riscritto quello che ha detto la persona — chi ha inserito due biscotti
 * vuole rileggere "2 pezzi", non "16 g".
 *
 * @returns {{grammi:number|null, quanti:number|null, misura:string|null,
 *            quantita:number|null, unita:string|null}}
 */
export function leggiPorzione(pezzo, alimento) {
  // I numeri a parole diventano cifre prima di cercare l'unità: "mezzo litro
  // di latte" deve arrivare dove arriva "0.5 litri", non a mezzo bicchiere.
  const t = normalizzaCibo(pezzo).replace(
    RE_PAROLE_NUM,
    (_, prima, parola) => `${prima}${NUMERI[parola.toLowerCase()]}`,
  )
  // 1. Un'unità scritta vince su tutto: "150g", "200 ml", "2 pezzi".
  //    ⚠️ Se l'unità c'è ma non si può tradurre (i pezzi di un alimento di cui
  //    non si sa quanto pesa uno), si esce lo stesso con grammi null: meglio
  //    "quantità stimata" che leggere quel 2 come due grammi.
  const peso = t.match(RE_PESO)
  if (peso) {
    const u = unitaScritta(peso[2])
    const quantita = numeroIt(peso[1])
    const grammi = grammiDa(quantita, u?.id, alimento)
    return {
      grammi,
      quanti: null,
      misura: null,
      quantita: grammi == null ? null : quantita,
      unita: grammi == null ? null : u?.id || 'g',
    }
  }

  // 2. Una misura da cucina, eventualmente moltiplicata ("2 cucchiai di olio").
  const quanti =
    (t.match(RE_PAROLA_NUM) && NUMERI[t.match(RE_PAROLA_NUM)[1].toLowerCase()]) ||
    (t.match(RE_NUMERO) && numeroIt(t.match(RE_NUMERO)[1])) ||
    null
  for (const m of MISURE) {
    if (!m.re.test(t)) continue
    const unita = m.aPezzi ? alimento?.pezzo || 0 : m.grammi
    if (unita > 0) {
      return {
        grammi: unita * (quanti || 1),
        quanti,
        misura: m.re.source,
        quantita: quanti || 1,
        unita: m.unita || null,
      }
    }
  }

  // 3. Un numero secco: pezzi se l'alimento ne ha uno ("2 uova"), grammi se no
  //    ("pollo 150" — nessuno mangia 150 petti di pollo).
  //    ⚠️ Per i grassi il "pezzo" è un cucchiaio (olio, burro): "olio 10" sono
  //    dieci grammi, non dieci cucchiai — 90 kcal contro 900.
  if (quanti != null) {
    const maxPezzi = alimento?.macro === 'g' ? MAX_NUMERO_NON_GRAMMI : 12
    if (alimento?.pezzo && quanti <= maxPezzi) {
      return { grammi: alimento.pezzo * quanti, quanti, misura: null, quantita: quanti, unita: 'pz' }
    }
    if (quanti <= MAX_NUMERO_NON_GRAMMI) {
      return { grammi: null, quanti, misura: null, quantita: null, unita: null }
    }
    return { grammi: quanti, quanti: null, misura: null, quantita: quanti, unita: 'g' }
  }
  return { grammi: null, quanti: null, misura: null, quantita: null, unita: null }
}

/**
 * Una voce sola: "150g di pollo" → l'alimento, i grammi e i suoi macro.
 *
 * ⚠️ `stimata` dice che il numero non l'ha scritto la persona: o la quantità
 * mancava (e si è preso il peso di una porzione, o 100g) o l'alimento non è
 * nel catalogo. Chi lo mostra DEVE farlo vedere — è la differenza fra un conto
 * e un'impressione.
 */
export function analizzaVoce(pezzo, cibiMiei) {
  const testo = String(pezzo || '').trim()
  if (!testo) return null
  // ⚠️ I miei cibi PRIMA del catalogo: sono piu' specifici, e sono quelli che
  // la persona ha scelto di tenere.
  const alimento = trovaFraIMiei(testo, cibiMiei) || trovaAlimento(testo)
  if (!alimento) {
    return {
      id: nuovoId(),
      testo,
      nome: testo,
      alimentoId: null,
      grammi: null,
      quantita: null,
      unita: 'g',
      ...ZERO,
      riconosciuto: false,
      stimata: true,
    }
  }
  const porzione = leggiPorzione(testo, alimento)
  // Senza quantità si stima una porzione. ⚠️ Non 100g per tutto: 100g di
  // marmellata o di mandorle sono 300-600 kcal, e nessuno ne mangia tanto
  // senza dirlo. Per i grassi e per miele/marmellata la porzione è piccola.
  const grammi =
    porzione.grammi ?? alimento.pezzo ?? (alimento.macro === 'g' ? 15 : alimento.id === 'miele' ? 20 : 100)
  return {
    id: nuovoId(),
    testo,
    nome: alimento.nome,
    alimentoId: alimento.id,
    grammi: Math.round(grammi),
    // Com'era detta, per poterla riscrivere uguale. Quando la quantità non
    // c'era e se l'è immaginata l'app, l'unità torna a essere i grammi: non si
    // fa finta che qualcuno abbia detto "1 pezzo".
    quantita: porzione.grammi == null ? null : porzione.quantita,
    unita: porzione.grammi == null ? 'g' : porzione.unita || 'g',
    ...macroDi(alimento, grammi),
    riconosciuto: true,
    stimata: porzione.grammi == null,
  }
}

// Come si separano più alimenti in una riga scritta a mano. Oltre ai separatori
// dei pasti (· ; ,) ci sono la "e" e il "+" di chi elenca parlando.
// ⚠️ E "con": "pane con 50g di prosciutto" sono due cose. Lasciate insieme il
// pane spariva, e "latte 200 ml con 40g di fiocchi" diventava 200g di fiocchi:
// 710 kcal al posto di 280.
const RE_PEZZI = /\s*[·•;+]\s*|,(?!\d)|\s+(?:e|con)\s+|\n+/

/**
 * Tutto quello che è stato scritto in una volta: "2 uova e 50g di pane".
 * @returns {{voci:object[], totale:object, ignote:object[]}}
 */
export function analizzaTesto(testo, cibiMiei) {
  const voci = String(testo || '')
    .split(RE_PEZZI)
    .map((p) => analizzaVoce(p, cibiMiei))
    .filter(Boolean)
  return {
    voci,
    totale: somma(voci.filter((v) => v.riconosciuto)),
    ignote: voci.filter((v) => !v.riconosciuto),
  }
}

// ---- Il modello del giorno ------------------------------------------------

/**
 * @typedef {Object} VoceDiario
 * @property {string} id
 * @property {string} testo      com'è stato scritto
 * @property {string} nome       l'alimento riconosciuto (o il testo stesso)
 * @property {string|null} alimentoId
 * @property {number|null} grammi
 * @property {number|null} quantita  quanto se n'è detto ("2"), se l'ha detto qualcuno
 * @property {string} unita          in che unità ('g' | 'ml' | 'pz' | …, vedi lib/unita)
 * @property {number} kcal
 * @property {number} proteine
 * @property {number} carbo
 * @property {number} grassi
 * @property {string} pasto      il nome del pasto del piano, o '' (fuori pasto)
 * @property {string} pastoId    l'id del pasto del piano: è ciò che lo segna fatto
 * @property {boolean} stimata   il numero l'ha messo l'app, non la persona
 * @property {string} ora        ISO, per l'ordine
 */

/**
 * Un giorno di diario. ⚠️ `id` è la DATA: è la chiave con cui il giorno va e
 * torna dal server (una riga per giorno), e rende impossibile averne due.
 */
export function nuovoGiornoDiario(data = oggiISO()) {
  return { id: data, data, voci: [], aggiornatoIl: new Date().toISOString() }
}

export function normalizzaVoce(v) {
  return {
    id: v?.id || nuovoId(),
    testo: v?.testo || '',
    nome: v?.nome || v?.testo || '',
    alimentoId: v?.alimentoId || null,
    grammi: v?.grammi == null ? null : Number(v.grammi) || 0,
    // ⚠️ I diari salvati prima che esistessero le unità non hanno questi due
    // campi: valgono grammi, che è come erano stati scritti.
    quantita: v?.quantita == null ? null : Number(v.quantita) || null,
    unita: v?.unita || 'g',
    kcal: Number(v?.kcal) || 0,
    proteine: Number(v?.proteine) || 0,
    carbo: Number(v?.carbo) || 0,
    grassi: Number(v?.grassi) || 0,
    pasto: v?.pasto || '',
    pastoId: v?.pastoId || '',
    // A quale dei cinque pasti appartiene ('extra' = fuori dai cinque). null
    // per le voci scritte prima che la pagina fosse divisa per pasti: il pasto
    // lo ricava slotDellaVoce.
    slot: SLOT_VALIDI.has(v?.slot) || v?.slot === SLOT_EXTRA ? v.slot : null,
    stimata: !!v?.stimata,
    ora: v?.ora || new Date().toISOString(),
  }
}

export function normalizzaGiornoDiario(g) {
  const data = g?.data || g?.id || oggiISO()
  return {
    ...nuovoGiornoDiario(data),
    ...g,
    id: data,
    data,
    voci: Array.isArray(g?.voci) ? g.voci.map(normalizzaVoce) : [],
  }
}

/** Il giorno chiesto, o uno vuoto: chi legge non deve mai controllare null. */
export function giornoDi(diario, data = oggiISO()) {
  return (diario || []).find((g) => g.data === data) || nuovoGiornoDiario(data)
}

/** I totali di un giorno. */
export function totaliGiorno(giorno) {
  return somma(giorno?.voci)
}

/** Gli id dei pasti del piano già segnati come mangiati. */
export function pastiFatti(giorno) {
  return new Set((giorno?.voci || []).map((v) => v.pastoId).filter(Boolean))
}

// ---- I macro di un pasto scritto ------------------------------------------

/**
 * Quanto vale un pasto del piano ("Petto di pollo: 150g · Riso: 80g").
 * @returns {{voci:object[], totale:object, completo:boolean}}
 *          `completo` = ogni pezzo con un alimento riconosciuto aveva anche i
 *          suoi grammi. Senza, il totale è per difetto e non va spacciato per
 *          buono: è la differenza fra "sono 620 kcal" e "almeno 620 kcal".
 */
export function macroDelPasto(testo, cibiMiei) {
  const pezzi = String(testo || '')
    .split('\n')
    .flatMap((riga) => riga.split(SEPARATORE_PASTO))
    .map((p) => p.trim())
    .filter(Boolean)

  const voci = []
  let completo = true
  for (const pezzo of pezzi) {
    const alimento = trovaFraIMiei(pezzo, cibiMiei) || trovaAlimento(pezzo)
    if (!alimento) continue // "Verdure: a piacere" e simili: non sono un buco
    const { grammi } = leggiPorzione(pezzo, alimento)
    if (grammi == null) {
      completo = false
      continue
    }
    voci.push({ pezzo, alimento, grammi, ...macroDi(alimento, grammi) })
  }
  return { voci, totale: somma(voci), completo }
}

/** Le voci di diario che nascono da un pasto del piano, pronte da salvare. */
export function vociDaPasto(pasto, cibiMiei) {
  const { voci } = macroDelPasto(pasto?.testo, cibiMiei)
  const ora = new Date().toISOString()
  if (voci.length === 0) return []
  return voci.map((v) => ({
    id: nuovoId(),
    testo: v.pezzo,
    nome: v.alimento.nome,
    alimentoId: v.alimento.id,
    grammi: v.grammi,
    quantita: v.grammi,
    unita: 'g',
    kcal: v.kcal,
    proteine: v.proteine,
    carbo: v.carbo,
    grassi: v.grassi,
    pasto: pasto?.nome || '',
    pastoId: pasto?.id || '',
    slot: pasto?.slot || SLOT_EXTRA,
    stimata: false,
    ora,
  }))
}

// ---- Le voci divise per pasto ---------------------------------------------

/** Quello che non sta in nessuno dei cinque pasti. */
export const SLOT_EXTRA = 'extra'

// I cinque pasti e l'extra, nell'ordine in cui si mostrano.
export const SLOT_GIORNATA = [...PASTI_BASE, { id: SLOT_EXTRA, label: 'Extra' }]

// Per le voci che non dicono il pasto: l'ora in cui sono state scritte.
function slotDallOra(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return SLOT_EXTRA
  const minuti = d.getHours() * 60 + d.getMinutes()
  if (minuti < 10 * 60 + 30) return 'colazione'
  if (minuti < 12 * 60) return 'spuntino'
  if (minuti < 15 * 60) return 'pranzo'
  if (minuti < 18 * 60 + 30) return 'merenda'
  return 'cena'
}

/**
 * A quale pasto appartiene una voce del diario. Chi la scrive oggi lo dice
 * (`slot`); per quelle di prima si guarda, in ordine, il pasto del piano da cui
 * nasce, il nome del pasto scritto a mano ("Pranzo") e per ultimo l'ora.
 * @param {object[]} pastiPiano i pasti del piano, per risalire da `pastoId`
 */
export function slotDellaVoce(v, pastiPiano = []) {
  if (v?.slot) return v.slot
  if (v?.pastoId) {
    const p = pastiPiano.find((x) => x.id === v.pastoId)
    if (p) return p.slot || SLOT_EXTRA
  }
  return slotDaNome(v?.pasto) || slotDallOra(v?.ora)
}

/** Le voci di un giorno raccolte per pasto: `{ colazione: [...], …, extra: [...] }`. */
export function vociPerSlot(giorno, pastiPiano = []) {
  const out = Object.fromEntries(SLOT_GIORNATA.map((s) => [s.id, []]))
  for (const v of giorno?.voci || []) out[slotDellaVoce(v, pastiPiano)]?.push(v)
  return out
}

// ---- Adattare quello che resta --------------------------------------------

const RE_PESO_G = /(\d+(?:[.,]\d+)?)\s*(g|gr|grammi)\b/i
const arrotonda5 = (n) => Math.max(5, Math.round(n / 5) * 5)

// Nessun fattore fuori da qui. Senza limiti, una colazione saltata farebbe
// diventare la cena da 900g di riso — matematicamente giusta e inutile.
//
// ⚠️ IL MINIMO NON E' UN DETTAGLIO. Chi a pranzo ha esagerato si ritroverebbe
// una cena da 30g di pasta e 40g di pesce: un piano che nessuno segue, e che
// invece di aiutare fa smettere di aprire l'app. Il pasto resta un pasto —
// al peggio piu' leggero — e che si stia sforando **si dice**, non si
// nasconde riducendo il piatto a niente. Sforare ogni tanto e' normale;
// mentire sul piatto no.
const MIN_FATTORE = 0.6
const MAX_FATTORE = 2.5
const clamp = (n) => Math.min(MAX_FATTORE, Math.max(MIN_FATTORE, n))

/**
 * Riscrive i pasti che restano da fare perché coprano i macro che restano.
 *
 * Ogni alimento si scala col fattore del SUO macro (le proteine con quello
 * delle proteine, il riso con quello dei carboidrati): è lo stesso principio
 * delle sostituzioni in lib/alimenti, e tiene in piedi il piatto invece di
 * gonfiarlo tutto uguale. Le porzioni libere ("Verdure: a piacere") non hanno
 * grammi e restano come sono.
 *
 * @param {{id:string,nome:string,testo:string}[]} pasti  quelli NON ancora fatti
 * @param {{kcal:number,proteine:number,carbo:number,grassi:number}} resta
 * @returns {{pasti, fattori, previsto, previstoDopo, sforo, attendibile}}
 *          `attendibile` = dei pasti rimasti si è capito abbastanza da poterli
 *          riscrivere. Se è false NON si mostra niente di riscritto: si dice
 *          solo quanto resta, e si lascia il piano del nutrizionista com'è.
 *          `sforo` = di quanto i pasti riscritti passano comunque il rimanente
 *          (positivo = si sfora). Nasce dal minimo qui sopra, e va MOSTRATO.
 */
export function adattaPastiRimasti(pasti, resta) {
  const analisi = (pasti || []).map((p) => ({ pasto: p, ...macroDelPasto(p.testo) }))
  const previsto = somma(analisi.map((a) => a.totale))
  const vuoto = {
    pasti: pasti || [],
    fattori: { p: 1, c: 1, g: 1 },
    previsto,
    previstoDopo: previsto,
    sforo: restante(previsto, resta),
    attendibile: false,
  }
  if (previsto.kcal <= 0) return vuoto

  const fattori = {
    p: previsto.proteine > 0 ? clamp(Math.max(0, resta.proteine) / previsto.proteine) : 1,
    c: previsto.carbo > 0 ? clamp(Math.max(0, resta.carbo) / previsto.carbo) : 1,
    g: previsto.grassi > 0 ? clamp(Math.max(0, resta.grassi) / previsto.grassi) : 1,
  }

  const nuovi = (pasti || []).map((p) => ({
    ...p,
    testo: String(p.testo || '')
      .split('\n')
      .map((riga) =>
        riga
          // Lo split con gruppo di cattura tiene i separatori: la riga si
          // ricompone identica, spazi compresi (come in adattaTestoPasto).
          .split(SEPARATORE_PASTO)
          .map((pezzo, i) => {
            if (i % 2 === 1) return pezzo
            const alimento = trovaAlimento(pezzo)
            if (!alimento) return pezzo
            const f = fattori[alimento.macro]
            return pezzo.replace(RE_PESO_G, (tutto, num, unita) => {
              const g = parseFloat(String(num).replace(',', '.'))
              if (!Number.isFinite(g)) return tutto
              return `${arrotonda5(g * f)}${unita === 'grammi' ? ' grammi' : unita}`
            })
          })
          .join(''),
      )
      .join('\n'),
  }))

  // Quanto valgono DAVVERO i pasti riscritti: si rileggono, invece di fidarsi
  // dei fattori. I grammi sono arrotondati a 5 e sotto c'è un minimo, quindi
  // il conto teorico e quello nel piatto non coincidono — e quello che conta
  // per dire "stai sforando" è il secondo.
  const previstoDopo = somma(nuovi.map((p) => macroDelPasto(p.testo).totale))

  return {
    pasti: nuovi,
    fattori,
    previsto,
    previstoDopo,
    // Positivo = anche mangiando così si passa l'obiettivo. Succede quando il
    // minimo entra in gioco, cioè proprio quando serve dirlo.
    sforo: restante(previstoDopo, resta),
    attendibile: true,
  }
}

// ---- Non ripetere quello che si è già mangiato ----------------------------

/** Gli alimenti già finiti nel piatto oggi (id del catalogo o dei miei cibi). */
export function alimentiMangiati(giorno) {
  return new Set((giorno?.voci || []).map((v) => v.alimentoId).filter(Boolean))
}

/**
 * Le versioni di un pasto — la principale e le sue alternative — con scritto
 * quali ripetono qualcosa che oggi si è già mangiato.
 *
 * Serve a una cosa sola: se a pranzo c'era il pollo, la cena col pollo non è
 * il consiglio migliore quando nella stessa dieta c'è scritta un'alternativa
 * col pesce. Non si nasconde niente e non si riordina niente — l'ordine dei
 * pasti è quello che ha scritto il nutrizionista — si dice solo quale ripete,
 * e si parte da quella che non lo fa (vedi `sceltaDiPartenza`).
 *
 * @returns {{i:number, etichetta:string, testo:string, ripete:string[]}[]}
 */
export function versioniPasto(pasto, giaMangiati, cibiMiei) {
  const mangiati = giaMangiati instanceof Set ? giaMangiati : new Set(giaMangiati || [])
  const testi = [pasto?.testo || '', ...(pasto?.opzioni || [])]
  return testi.map((testo, i) => {
    const ripete = []
    for (const pezzo of String(testo).split(SEPARATORE_PASTO)) {
      const a = trovaFraIMiei(pezzo, cibiMiei) || trovaAlimento(pezzo)
      if (a && mangiati.has(a.id) && !ripete.includes(a.nome)) ripete.push(a.nome)
    }
    return { i, etichetta: i === 0 ? 'Principale' : `Alternativa ${i}`, testo, ripete }
  })
}

/**
 * Da quale versione partire: la prima che non ripete niente di oggi, o la
 * principale se ripetono tutte (a quel punto tanto vale quella del piano).
 * `limite`: si cerca solo fra le prime N — quelle dentro lo schema
 * settimanale, quando c'è (lib/schemaDieta): non ripetere il pollo non è un
 * buon motivo per uscire dallo schema.
 */
export function sceltaDiPartenza(pasto, giaMangiati, cibiMiei, limite = Infinity) {
  const versioni = versioniPasto(pasto, giaMangiati, cibiMiei).slice(0, Math.max(1, limite))
  return versioni.find((v) => v.ripete.length === 0)?.i ?? 0
}

/** Gli alimenti che si possono proporre in un elenco (per i suggerimenti). */
export function alimentiProponibili() {
  return ALIMENTI.filter((a) => a.peso > 0)
}
