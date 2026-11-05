// ---------------------------------------------------------------------------
// I PIATTI COMPOSTI DEGLI ESEMPI: "Tagliata di pollo con peperoni + riso".
//
// Il nutrizionista li scrive senza grammi: dicono COSA cucinare, le dosi sono
// quelle che la dieta ha già scritto altrove. Qui il piatto si scompone nei
// suoi alimenti e ognuno prende la SUA dose, poi si somma:
//
//   - lo stesso alimento scritto coi grammi in un'altra versione o nello
//     schema → quei grammi ("riso: 100g");
//   - un alimento dello stesso tipo → le stesse calorie. Il tipo è la
//     categoria dello schema per le proteine (carne bianca, carne rossa,
//     uova…: 190g di pollo e 135g di manzo non sono la stessa porzione),
//     il gruppo del catalogo per il resto (cereali, legumi, frutta…).
//     100g di pasta valgono così 145g di pane, che è come ragiona chi scrive
//     "100g di pasta oppure 120g di pane";
//   - le verdure senza dose → una porzione da 200g;
//   - l'olio del pasto, se il piatto non nomina già un condimento: un piatto
//     cucinato lo porta con sé.
//
// Quello che non si sa dosare lascia il conto per difetto (`completo` false),
// e i grammi sono sempre una stima: chi li mostra lo deve dire.
// ---------------------------------------------------------------------------

import { kcalPer100, macroDi, trovaAlimenti } from './alimenti'
import { trovaFraIMiei } from './cibiMiei'
import { PORZIONE_VERDURA, macroDelPasto, pezziDelPiano, somma } from './diario'
import { categoriaDi as gruppoDi } from './catalogoCibi'
import { categorieDi } from './schemaDieta'


/** Il "tipo" di un alimento, per scambiarne la dose con un altro. */
export function tipoDi(alimento) {
  const schema = categorieDi(alimento.nome)[0] || categorieDi((alimento.alias || []).join(' · '))[0]
  return schema ? `schema:${schema}` : `gruppo:${gruppoDi(alimento)}`
}

/**
 * Le dosi che la dieta ha scritto: per alimento e per tipo. Vince la prima
 * che si incontra, quindi `testi` va dato dal più vicino al piatto (le
 * versioni dello stesso pasto) al più lontano (lo schema degli altri giorni).
 *
 * ⚠️ Qui le alternative CONTANO: "100g di pasta/riso oppure 120g di pane"
 * dice la dose della pasta, del riso E del pane. Per i conti di un pasto si
 * tiene solo la prima (lib/diario), per sapere le dosi servono tutte.
 */
export function dosiScritte(testi, cibiMiei) {
  const perId = new Map()
  const perTipo = new Map()
  let condimento = null
  for (const t of testi || []) {
    const tutte = String(t || '')
      .replace(/\s+oppure\s+/gi, '\n')
      .replace(/^\s*oppure\s+/gim, '')
    for (const v of macroDelPasto(tutte, cibiMiei).voci) {
      // Le verdure non danno dosi: la loro è sempre la porzione libera.
      if (gruppoDi(v.alimento) === 'verdura') continue
      const tipo = tipoDi(v.alimento)
      // "100g di pasta/riso/farro": la stessa dose a tutti quelli della riga.
      for (const a of [v.alimento, ...trovaAlimenti(v.pezzo)]) {
        if (tipoDi(a) === tipo && !perId.has(a.id)) perId.set(a.id, v.grammi)
      }
      if (!perTipo.has(tipo)) perTipo.set(tipo, { alimento: v.alimento, grammi: v.grammi })
      if (!condimento && v.alimento.macro === 'g') condimento = { alimento: v.alimento, grammi: v.grammi }
    }
  }
  return { perId, perTipo, condimento }
}

/** Quanto mettere di un alimento del piatto, o null se non si sa. */
export function grammiPer(alimento, dosi) {
  if (dosi.perId.has(alimento.id)) return dosi.perId.get(alimento.id)
  const simile = dosi.perTipo.get(tipoDi(alimento))
  if (!simile) return null
  // Stesse calorie dell'alimento che la dieta ha dosato — stesse PROTEINE fra
  // due proteici (il tacchino al posto del pollo) — arrotondate a 5g.
  const proteici = alimento.macro === 'p' && simile.alimento.macro === 'p' && alimento.m.p > 0
  const fatto = macroDi(simile.alimento, simile.grammi)
  const per100 = proteici ? alimento.m.p : kcalPer100(alimento)
  const serve = proteici ? fatto.proteine : fatto.kcal
  if (!(per100 > 0)) return null
  // ⚠️ Ma non un piatto che nessuno mangia: le calorie di 75g di ceci secchi
  // sono 330g di piselli. Si resta fra la metà e il doppio dei grammi dosati.
  const g = Math.min(simile.grammi * 2, Math.max(simile.grammi / 2, (serve / per100) * 100))
  return Math.max(5, Math.round(g / 5) * 5)
}

/**
 * Gli alimenti di un pezzo del piatto. ⚠️ Uno per tipo, e una proteina sola:
 * "fagioli/ceci" è l'uno o l'altro, e in "hamburger di tacchino" l'hamburger
 * è la forma e il tacchino l'alimento — vince quello nominato per ultimo.
 */
function alimentiDelPezzo(pezzo, cibiMiei) {
  const mio = trovaFraIMiei(pezzo, cibiMiei)
  if (mio) return [mio]
  // "Yogurt bianco/alla frutta": dopo la barra è il gusto, non un alimento.
  const tutti = trovaAlimenti(pezzo.replace(/\/\s*(?:all'\s*|(?:al|alla|allo|ai|alle|agli)\s+)\S+/gi, ''))
  return tutti.filter(
    (a, i) =>
      !tutti.slice(i + 1).some((b) => tipoDi(b) === tipoDi(a) || (a.macro === 'p' && b.macro === 'p')),
  )
}

/**
 * I macro di un piatto composto senza grammi, alimento per alimento.
 * @returns {{voci:object[], totale:object, completo:boolean}}
 */
export function macroDelPiatto(testo, dosi, cibiMiei, { tipiche = false } = {}) {
  const dosati = []
  const verdure = []
  let completo = true
  for (const pezzo of pezziDelPiano(testo)) {
    for (const alimento of alimentiDelPezzo(pezzo, cibiMiei)) {
      if ([...dosati, ...verdure].some((v) => v.alimento.id === alimento.id)) continue
      const grammi = grammiPer(alimento, dosi)
      if (grammi != null) dosati.push({ pezzo, alimento, grammi })
      else if (gruppoDi(alimento) === 'verdura') verdure.push({ pezzo, alimento })
      else if (kcalPer100(alimento) > 0) {
        const tipica = tipiche ? porzioneTipica(alimento) : null
        if (tipica != null) dosati.push({ pezzo, alimento, grammi: tipica, tipica: true })
        else completo = false
      }
    }
  }
  // Le verdure senza dose si dividono UNA porzione: "insalata e pomodori"
  // sono un contorno, non due.
  const quota = verdure.length ? Math.max(50, Math.round(PORZIONE_VERDURA / verdure.length / 5) * 5) : 0
  const voci = [...dosati, ...verdure.map((v) => ({ ...v, grammi: quota, tipica: tipiche }))]
  if (voci.length > 0 && dosi.condimento && !voci.some((v) => v.alimento.macro === 'g')) {
    voci.push({ pezzo: dosi.condimento.alimento.nome, ...dosi.condimento })
  }
  const conMacro = voci.map((v) => ({ ...v, ...macroDi(v.alimento, v.grammi) }))
  return { voci: conMacro, totale: somma(conMacro), completo }
}

// Quando la dieta non dà nessuna dose: una porzione normale. È l'ultima strada
// e lo si dice ("≈"), ma senza il pranzo "pollo + pane + frutta" valeva niente.
const PORZIONI_TIPICHE = {
  pane: 50,
  'pane-segale': 50,
  'pane-sg': 50,
  'pasta-cotta': 200,
  'riso-cotto': 200,
  crackers: 25,
  uova: 110, // due
  tonno: 60, // una scatoletta
  bresaola: 50,
  prosciutto: 60,
  'salmone-affumicato': 50,
  parmigiano: 20,
  patate: 200,
  ceci: 70,
  'pasta-legumi': 80,
  miele: 7,
  noci: 10,
  olive: 15,
  pesto: 15,
  cioccolato: 10,
}

/** I grammi di una porzione normale di un alimento, quando non sono scritti. */
export function porzioneTipica(alimento) {
  if (PORZIONI_TIPICHE[alimento.id]) return PORZIONI_TIPICHE[alimento.id]
  if (alimento.pezzo) return alimento.pezzo
  return { p: 150, c: 80, g: 10 }[alimento.macro] ?? null
}

/**
 * Quanto vale un pasto da MOSTRARE e da segnare nel diario: i grammi scritti
 * restano quelli; quello che li ha solo nominati prende, nell'ordine, la dose
 * che la dieta dà altrove (macroDelPiatto) e poi una porzione normale.
 * @returns {{voci:object[], totale:object, completo:boolean, stimato:boolean}}
 *          le voci stimate hanno `stimata`, e `tipica` se la dose non viene
 *          dalla dieta. `completo` è false solo per i buchi veri (`buco`).
 */
export function macroConStime(testo, dosi, cibiMiei) {
  const scritto = macroDelPasto(testo, cibiMiei)
  if (scritto.daStimare.length === 0) return { ...scritto, stimato: false }
  // Le verdure senza grammi si rifanno col piatto (ne dividono una porzione),
  // tranne quelle che il piatto non saprebbe nominare ("Una porzione di contorno").
  const rifatta = (v) => v.libera && trovaAlimenti(v.pezzo).length > 0
  const fermi = scritto.voci.filter((v) => !rifatta(v))
  const pezzi = [...scritto.daStimare, ...scritto.voci.filter(rifatta).map((v) => v.pezzo)]
  const piatto = macroDelPiatto(
    [...new Set(pezzi)].join('\n'),
    // L'olio del piatto solo se è tutto un piatto: dove i grammi sono scritti, l'olio lo è anche lui.
    fermi.length ? { ...dosi, condimento: null } : dosi,
    cibiMiei,
    { tipiche: true },
  )
  const stimate = piatto.voci
    .filter((v) => !fermi.some((f) => f.alimento.id === v.alimento.id))
    .map((v) => {
      // La dose presa da un altro alimento dello stesso tipo vale AL POSTO di
      // quello ("100g di pasta = 145g di pane"). Accanto a lui è un'aggiunta:
      // "80g di riso + pane" è il pane di contorno, non altri 80g di riso.
      const accanto = !dosi.perId.has(v.alimento.id) && fermi.some((f) => tipoDi(f.alimento) === tipoDi(v.alimento))
      if (!accanto) return { ...v, stimata: true }
      const grammi = porzioneTipica(v.alimento) ?? v.grammi
      return { ...v, grammi, ...macroDi(v.alimento, grammi), stimata: true, tipica: true }
    })
  if (stimate.length === 0) return { ...scritto, stimato: false }
  const voci = [...fermi, ...stimate]
  return { voci, totale: somma(voci), completo: !scritto.buco && piatto.completo, stimato: true }
}
