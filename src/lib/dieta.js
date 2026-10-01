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
import { adattaPiano, alimentoAmmesso, alimentoDaId, alimentoVietato, costoDelMacro, macroDi } from './alimenti'
import { PASTI_BASE, SLOT_VALIDI, labelPasto, semplifica, slotDaNome } from './pastiBase'
import { GIORNI_SETTIMANA, giornoSettimana, normalizzaSchema } from './schemaDieta'
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
// aspettano e le liste restano UNA sola. Stessa cosa per i cinque pasti.
export { MOVIMENTI, OBIETTIVI, SESSI, labelMovimento, labelObiettivo }
export { PASTI_BASE, labelPasto, slotDaNome }

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

// ---- I cinque pasti (vedi lib/pastiBase) ---------------------------------

/**
 * Lo slot di ogni pasto di una giornata. Un secondo "Spuntino" scritto DOPO il
 * pranzo è la merenda: i nutrizionisti scrivono spesso "spuntino" due volte.
 * Un pasto che cadrebbe su uno slot già preso resta un extra, non si perde.
 */
function assegnaSlot(pasti) {
  const presi = new Set()
  return pasti.map((p) => {
    let slot = SLOT_VALIDI.has(p.slot) ? p.slot : slotDaNome(p.nome)
    if (slot === 'spuntino' && presi.has('spuntino') && presi.has('pranzo') && !presi.has('merenda')) {
      slot = 'merenda'
    }
    if (slot && presi.has(slot)) slot = ''
    if (slot) presi.add(slot)
    return { ...p, slot, nome: slot ? labelPasto(slot) : p.nome }
  })
}

/**
 * I pasti con i cinque di base SEMPRE presenti, in ordine: quelli che mancano
 * si aggiungono vuoti. Gli extra restano dopo il pasto base che li precedeva
 * (il pre-workout scritto dopo la merenda resta lì).
 */
export function conPastiBase(pasti) {
  const conSlot = assegnaSlot(pasti || [])
  const perSlot = new Map()
  const extraDopo = new Map() // slot che precede → extra
  let ultimo = ''
  for (const p of conSlot) {
    if (p.slot) {
      perSlot.set(p.slot, p)
      ultimo = p.slot
    } else {
      const lista = extraDopo.get(ultimo) || []
      lista.push(p)
      extraDopo.set(ultimo, lista)
    }
  }
  const out = [...(extraDopo.get('') || [])]
  for (const b of PASTI_BASE) {
    out.push(perSlot.get(b.id) || { id: nuovoId(), slot: b.id, nome: b.label, testo: '', opzioni: [] })
    out.push(...(extraDopo.get(b.id) || []))
  }
  return out
}

/** Un pasto senza niente dentro: né testo né alternative. */
export function pastoVuoto(p) {
  return !String(p?.testo || '').trim() && !(p?.opzioni || []).some((o) => String(o || '').trim())
}

const arrotonda10 = (n) => Math.round(n / 10) * 10

// Data di oggi in formato 'YYYY-MM-DD' (per gli <input type="date">).
export function oggiISO(d = new Date()) {
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
//
// `alt`: con che cosa si può cambiare QUEL posto in QUEL pasto, in ordine di
// preferenza. ⚠️ Serve un elenco scritto a mano e non "tutti gli alimenti dello
// stesso macro": il manzo ha le proteine dello yogurt greco, ma manzo e patate
// a colazione sono la risposta giusta a una domanda che non ha fatto nessuno.
// Le sostituzioni per allergie (lib/alimenti) restano libere — lì si deve
// togliere un alimento vietato e il piatto strano è meglio del piatto proibito.
const PASTI_TEMPLATE = [
  {
    nome: 'Colazione',
    quote: { p: 0.2, c: 0.25, g: 0.25 },
    cibi: [
      { id: 'yogurt-greco', alt: ['skyr', 'fiocchi-latte', 'ricotta', 'yogurt-bianco', 'kefir', 'uova', 'albume', 'tofu'] },
      // Niente 'frutta' qui: la frutta e gia nel pasto come porzione libera.
      { id: 'avena', alt: ['muesli', 'cereali', 'pane', 'pane-segale', 'gallette', 'banana', 'pane-sg'] },
      { id: 'mandorle', alt: ['noci', 'arachidi', 'semi', 'semi-girasole', 'burro'] },
      { fisso: 'Frutta fresca', porzione: '1 frutto' },
    ],
  },
  {
    nome: 'Spuntino',
    quote: { p: 0.1, c: 0.1, g: 0.1 },
    cibi: [
      { id: 'ricotta', alt: ['skyr', 'yogurt-greco', 'yogurt-bianco', 'kefir', 'fiocchi-latte', 'bresaola', 'tonno', 'tofu'] },
      { id: 'frutta', alt: ['mela', 'pera', 'kiwi', 'pesca', 'ananas', 'banana', 'gallette', 'pane'] },
      { id: 'mandorle', alt: ['noci', 'arachidi', 'semi', 'semi-girasole', 'avocado'] },
    ],
  },
  {
    nome: 'Pranzo',
    quote: { p: 0.3, c: 0.3, g: 0.25 },
    cibi: [
      { id: 'pollo', alt: ['tacchino', 'manzo', 'coniglio', 'tonno', 'merluzzo', 'orata', 'branzino', 'salmone', 'polpo', 'lonza', 'ceci', 'lenticchie', 'fagioli', 'seitan'] },
      { id: 'riso', alt: ['pasta', 'farro', 'orzo', 'riso-integrale', 'cous-cous', 'patate', 'patate-dolci', 'quinoa', 'mais', 'pane', 'pasta-legumi'] },
      { id: 'olio', alt: ['olive', 'avocado', 'semi', 'semi-girasole', 'noci'] },
      { fisso: 'Verdure', porzione: 'a piacere' },
    ],
  },
  {
    nome: 'Merenda',
    quote: { p: 0.15, c: 0.15, g: 0.05 },
    cibi: [
      { id: 'yogurt-greco', alt: ['skyr', 'kefir', 'fiocchi-latte', 'ricotta', 'yogurt-bianco', 'bresaola', 'prosciutto', 'tofu'] },
      { id: 'pane', alt: ['gallette', 'pane-segale', 'frutta', 'mela', 'banana', 'cereali', 'avena', 'pane-sg'] },
      { id: 'noci', alt: ['mandorle', 'arachidi', 'semi', 'avocado'] },
    ],
  },
  {
    nome: 'Cena',
    quote: { p: 0.25, c: 0.2, g: 0.35 },
    cibi: [
      { id: 'merluzzo', alt: ['orata', 'branzino', 'sogliola', 'trota', 'salmone', 'gamberi', 'seppie', 'polpo', 'pollo', 'tacchino', 'uova', 'mozzarella', 'scamorza', 'primo-sale', 'tofu', 'tempeh', 'lenticchie', 'fagioli'] },
      { id: 'patate', alt: ['riso', 'riso-integrale', 'pasta', 'farro', 'orzo', 'quinoa', 'pane', 'cous-cous', 'mais', 'patate-dolci'] },
      { id: 'olio', alt: ['olive', 'avocado', 'semi', 'burro'] },
      { fisso: 'Verdure', porzione: 'a piacere' },
    ],
  },
]

/**
 * L'alimento da mettere in uno slot del template, alla `variante` richiesta.
 *
 * Variante 0 = quello scritto nel template (o il suo sostituto, se è vietato).
 * Dalla 1 in su si scorre l'elenco `alt` dello slot, saltando quello che non
 * si può mangiare: è ciò che trasforma un pasto in "pollo e riso, oppure
 * tacchino e pasta, oppure merluzzo e patate".
 *
 * ⚠️ `peso > 0` esclude miele, cioccolato, integratori e tutta la coda del
 * catalogo che sta lì solo per essere riconosciuta nel diario: sono giusti sui
 * macro e sbagliati nel piatto.
 *
 * Finite le alternative si torna al principale: chi chiama se ne accorge
 * perché il testo si ripete, e lo scarta.
 */
// Fra gli alimenti permessi di un posto, quello che più somiglia a `base`:
// calorie per grammo del macro (scarto logaritmico) più un decimo per ogni
// posizione nell'elenco, che è scritto in ordine di preferenza.
function piuSimile(base, permessi) {
  const costo = costoDelMacro(base)
  const punteggio = (a, i) => Math.abs(Math.log(costoDelMacro(a) / costo)) + 0.1 * i
  return permessi
    .map((a, i) => ({ a, p: punteggio(a, i) }))
    .sort((x, y) => x.p - y.p)[0]?.a
}

function alimentoVariante(slot, variante, preferenze) {
  const base = alimentoDaId(slot.id)
  const permessi = (slot.alt || [])
    .map(alimentoDaId)
    .filter((a) => a && a.peso > 0 && !alimentoVietato(a, preferenze))
  // Se l'utente non può mangiarlo si prende subito l'alternativa: meglio
  // che generare un piano da correggere un attimo dopo. ⚠️ Prima fra quelle
  // scritte per QUESTO pasto (`alt`), e solo se nessuna va bene fra tutto il
  // catalogo: a un vegetariano il pollo del pranzo diventava parmigiano
  // (stesse proteine per grammo, il doppio delle calorie), lo yogurt della
  // colazione di un vegano edamame. Fra quelle del pasto vince la più simile
  // per CALORIE a parità di macro (costoDelMacro), con l'ordine dell'elenco a
  // fare da correttivo: per il pollo il seitan, non i ceci, che portano con
  // sé tanti carboidrati quanto un piatto di riso e lasciano il pranzo senza
  // proteine.
  const ammesso = alimentoVietato(base, preferenze)
    ? piuSimile(base, permessi) || alimentoAmmesso(base, preferenze) || base
    : base
  if (!variante) return ammesso
  const altri = permessi.filter((a) => a.id !== ammesso.id)
  return altri[variante - 1] || ammesso
}

// Quanto pesa un grammo di sbaglio su ogni macro: le sue calorie (4/4/9).
const KCAL_MACRO = { p: 4, c: 4, g: 9 }

// Un sistema lineare piccolo (al massimo 3×3), per eliminazione. null se non
// ha una soluzione sola (due alimenti con la stessa composizione).
function risolvi(A, b) {
  const n = b.length
  const M = A.map((riga, i) => [...riga, b[i]])
  for (let k = 0; k < n; k += 1) {
    let piu = k
    for (let i = k + 1; i < n; i += 1) if (Math.abs(M[i][k]) > Math.abs(M[piu][k])) piu = i
    if (Math.abs(M[piu][k]) < 1e-9) return null
    const riga = M[k]
    M[k] = M[piu]
    M[piu] = riga
    for (let i = k + 1; i < n; i += 1) {
      const f = M[i][k] / M[k][k]
      for (let j = k; j <= n; j += 1) M[i][j] -= f * M[k][j]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i -= 1) {
    let r = M[i][n]
    for (let j = i + 1; j < n; j += 1) r -= M[i][j] * x[j]
    x[i] = r / M[i][i]
  }
  return x
}

/**
 * I grammi di ogni alimento perché il pasto, contato TUTTO, arrivi ai suoi
 * macro. ⚠️ Ogni alimento porta anche gli altri due: 135g di parmigiano sono
 * le proteine del pollo più 38g di grassi, i ceci sono proteine E
 * carboidrati. Contare solo il macro principale di ciascuno gonfiava una
 * giornata generata del 30%, e del 70-90% per vegetariani e vegani.
 *
 * Si cercano i grammi che sbagliano meno in CALORIE sui tre macro insieme,
 * mai negativi. Gli alimenti sono al massimo tre, quindi si provano tutti i
 * gruppi possibili (sette) e si tiene il migliore senza grammi negativi: un
 * alimento che non serve (il riso, quando i ceci portano già i carboidrati)
 * resta a zero ed esce dal piatto.
 * @returns {Map<string, number>} id → grammi (non arrotondati)
 */
function grammiDelPasto(alimenti, obiettivo) {
  const macro = ['p', 'c', 'g']
  const peso = (m) => KCAL_MACRO[m] * KCAL_MACRO[m]
  const per = (a, m) => (Number(a.m?.[m]) || 0) / 100
  const errore = (grammi) =>
    macro.reduce((t, m) => {
      const d = alimenti.reduce((x, a, i) => x + per(a, m) * grammi[i], 0) - obiettivo[m]
      return t + peso(m) * d * d
    }, 0)

  let migliore = { grammi: alimenti.map(() => 0), errore: errore(alimenti.map(() => 0)) }
  for (let gruppo = 1; gruppo < 2 ** alimenti.length; gruppo += 1) {
    const dentro = alimenti.map((_, i) => i).filter((i) => Math.floor(gruppo / 2 ** i) % 2 === 1)
    // Minimi quadrati pesati sul gruppo: (AᵀWA) g = AᵀW t.
    const A = dentro.map((i) =>
      dentro.map((j) => macro.reduce((t, m) => t + peso(m) * per(alimenti[i], m) * per(alimenti[j], m), 0)),
    )
    const b = dentro.map((i) => macro.reduce((t, m) => t + peso(m) * per(alimenti[i], m) * obiettivo[m], 0))
    const x = risolvi(A, b)
    if (!x || x.some((v) => !(v >= 0))) continue
    const grammi = alimenti.map(() => 0)
    dentro.forEach((i, k) => {
      grammi[i] = x[k]
    })
    const e = errore(grammi)
    if (e < migliore.errore) migliore = { grammi, errore: e }
  }
  return new Map(alimenti.map((a, i) => [a.id, migliore.grammi[i]]))
}

/**
 * Un pasto alla variante chiesta: il testo E quanto vale davvero.
 *
 * I grammi li decide grammiDelPasto contando tutti e tre i macro di ogni
 * alimento; dopo l'arrotondamento a 5g il totale va comunque misurato, non
 * dato per scontato — è quello che usa `sceltaAlternative`.
 */
function componiPasto(template, tot, preferenze, variante) {
  const obiettivo = { p: tot.p * template.quote.p, c: tot.c * template.quote.c, g: tot.g * template.quote.g }
  // Gli alimenti del pasto, al loro posto. Uno il cui macro non serve più (un
  // consiglio a fine giornata, carboidrati finiti) non si mette.
  const posti = template.cibi.map((c) => {
    if (c.fisso) return { fisso: c }
    const alimento = alimentoVariante(c, variante, preferenze)
    return obiettivo[alimento.macro] > 0 ? { alimento } : null
  })
  const alimenti = posti.filter((x) => x?.alimento).map((x) => x.alimento)
  const grammi = grammiDelPasto(alimenti, obiettivo)

  const parti = []
  const pezzi = []
  for (const x of posti) {
    if (!x) continue
    if (x.fisso) {
      parti.push(`${x.fisso.fisso}: ${x.fisso.porzione}`)
      continue
    }
    const g = grammi.get(x.alimento.id) || 0
    // Sotto i 4g non è una porzione: l'alimento non serve (lo fanno già gli
    // altri), ed esce dal piatto.
    if (g < 4) continue
    const arrotondati = Math.max(5, Math.round(g / 5) * 5)
    parti.push(`${x.alimento.nome}: ${arrotondati}g`)
    pezzi.push(macroDi(x.alimento, arrotondati))
  }
  const totale = pezzi.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteine: a.proteine + m.proteine,
      carbo: a.carbo + m.carbo,
      grassi: a.grassi + m.grassi,
    }),
    { kcal: 0, proteine: 0, carbo: 0, grassi: 0 },
  )
  return { testo: parti.join(' · '), totale }
}

// Quanto una variante si allontana dal pasto principale: la media degli scarti
// relativi sui tre macro più quello sulle calorie. 0 = identica.
function distanzaPasto(base, alt) {
  const scarto = (a, b) => (b > 1 ? Math.abs(a - b) / b : 0)
  return (
    (scarto(alt.proteine, base.proteine) +
      scarto(alt.carbo, base.carbo) +
      scarto(alt.grassi, base.grassi) +
      scarto(alt.kcal, base.kcal)) /
    4
  )
}

// Oltre questo scarto un'alternativa non è più un'alternativa: è un altro
// pasto. Meglio proporne una sola, o nessuna, che una da 400 kcal in più
// presentata come equivalente.
const SCARTO_MAX = 0.18
// Quante varianti si provano prima di scegliere. Il catalogo di alimenti
// proponibili per macro è sull'ordine della decina: andare oltre vuol dire
// ripescare gli stessi.
const VARIANTI_PROVATE = 14

/**
 * Le alternative di un pasto: si generano tutte, si misurano e si tengono le
 * più vicine al pasto principale. Cambia il piatto, non il conto — che è
 * l'unica cosa che rende un'alternativa utile invece che pericolosa.
 */
function sceltaAlternative(template, tot, preferenze, base, quante) {
  if (quante <= 0) return []
  const viste = new Set([base.testo])
  const candidate = []
  for (let v = 1; v <= VARIANTI_PROVATE; v += 1) {
    const alt = componiPasto(template, tot, preferenze, v)
    // Con poche alternative ammesse (un vegano con mezze esclusioni) le
    // varianti si ripetono: elencare due volte lo stesso pasto è peggio che
    // proporne una sola.
    if (viste.has(alt.testo)) continue
    viste.add(alt.testo)
    const distanza = distanzaPasto(base.totale, alt.totale)
    if (distanza <= SCARTO_MAX) candidate.push({ testo: alt.testo, distanza })
  }
  return candidate
    .sort((a, b) => a.distanza - b.distanza)
    .slice(0, quante)
    .map((c) => c.testo)
}

/**
 * I pasti di una giornata per quei macro, ognuno con le sue ALTERNATIVE.
 * `opzioni` = quante alternative oltre alla principale.
 */
function generaPasti(proteine, carbo, grassi, preferenze, opzioni = 2) {
  const tot = { p: proteine, c: carbo, g: grassi }
  return PASTI_TEMPLATE.map((t) => {
    const base = componiPasto(t, tot, preferenze, 0)
    return {
      id: nuovoId(),
      slot: slotDaNome(t.nome),
      nome: t.nome,
      testo: base.testo,
      opzioni: sceltaAlternative(t, tot, preferenze, base, Math.max(0, opzioni)),
    }
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
export function pastiDaMacro({ proteine, carbo, grassi }, preferenze, opzioni = 2) {
  return generaPasti(
    Number(proteine) || 0,
    Number(carbo) || 0,
    Number(grassi) || 0,
    preferenze,
    opzioni,
  )
}

// Il template di un pasto dal suo slot. "Extra" è fuori dai cinque pasti: si
// consiglia come uno spuntino.
const templateDelloSlot = (slot) =>
  PASTI_TEMPLATE.find((t) => slotDaNome(t.nome) === slot) ||
  PASTI_TEMPLATE.find((t) => slotDaNome(t.nome) === 'spuntino')

// Sotto queste kcal "quello che resta" è un arrotondamento, non un pasto.
const KCAL_MINIME_CONSIGLIO = 60

/**
 * Un consiglio per UN pasto, chiesto dentro la dieta giornaliera quando la
 * dieta non ha niente di scritto per quel pasto (una dieta "da calorie e
 * macro" è solo il limite).
 *
 * ⚠️ Il pasto prende la SUA parte di quello che manca oggi, non tutto: a
 * colazione, con la giornata davanti, proporre tutto il resto vorrebbe dire
 * lasciare la cena a zero — e le calorie spese male a colazione non tornano.
 * Quello che manca si divide fra questo pasto e quelli che vengono DOPO e sono
 * ancora da fare, con le quote dei piani calcolati (PASTI_TEMPLATE): a cena,
 * con il resto della giornata fatto, è tutto suo. I pasti saltati prima non
 * si aspettano più e non si tengono niente.
 *
 * @param {{slot:string, resta:{proteine,carbo,grassi}, dopo?:string[]}} p
 *        `dopo` = gli slot che vengono dopo questo e sono ancora da fare.
 * @returns {{testo:string, opzioni:string[], obiettivo:{kcal,proteine,carbo,grassi}}|null}
 *          null se oggi non resta abbastanza per un pasto.
 */
export function consiglioPerPasto({ slot, resta, dopo = [] }, preferenze, opzioni = 2) {
  // Pochi grammi di un macro sono un arrotondamento: non chiamano un alimento.
  const manca = (x) => {
    const n = Number(x) || 0
    return n >= 3 ? n : 0
  }
  const r = { p: manca(resta?.proteine), c: manca(resta?.carbo), g: manca(resta?.grassi) }
  if (r.p * 4 + r.c * 4 + r.g * 9 < KCAL_MINIME_CONSIGLIO) return null

  const questo = templateDelloSlot(slot)
  const insieme = [questo, ...dopo.filter((s) => s !== slot).map(templateDelloSlot)]
  // componiPasto dà a questo pasto tot[m] × la sua quota: con tot così, la
  // sua parte di quello che manca.
  const tot = {}
  for (const m of ['p', 'c', 'g']) tot[m] = r[m] / insieme.reduce((t, x) => t + x.quote[m], 0)

  const base = componiPasto(questo, tot, preferenze, 0)
  if (base.totale.kcal < KCAL_MINIME_CONSIGLIO) return null
  const quota = (m) => Math.round(tot[m] * questo.quote[m])
  const obiettivo = { proteine: quota('p'), carbo: quota('c'), grassi: quota('g') }
  obiettivo.kcal = obiettivo.proteine * 4 + obiettivo.carbo * 4 + obiettivo.grassi * 9
  return {
    testo: base.testo,
    opzioni: sceltaAlternative(questo, tot, preferenze, base, Math.max(0, opzioni)),
    obiettivo,
  }
}

// ---- Una dieta dai NUMERI, senza passare dal peso -------------------------

/**
 * Le calorie che quei macro valgono davvero (4/4/9) e di quanto si discostano
 * dalle kcal dichiarate. Serve a dirlo PRIMA di salvare: "2000 kcal" con
 * "P150 C250 G80" sono in realtà 2320, e chi le ha scritte vuole saperlo.
 * @returns {{kcalDaMacro:number, scarto:number, coerente:boolean}}
 *          `coerente` entro il 5%: sotto quella soglia è arrotondamento.
 */
export function coerenzaMacro({ kcal, proteine, carbo, grassi }) {
  const kcalDaMacro = Math.round(
    (Number(proteine) || 0) * 4 + (Number(carbo) || 0) * 4 + (Number(grassi) || 0) * 9,
  )
  const dichiarate = Number(kcal) || 0
  const scarto = kcalDaMacro - dichiarate
  return {
    kcalDaMacro,
    scarto,
    coerente: dichiarate <= 0 || Math.abs(scarto) <= Math.max(50, dichiarate * 0.05),
  }
}

/** I carboidrati che riempiono le calorie che restano dopo proteine e grassi. */
export function carboDaKcal({ kcal, proteine, grassi }) {
  return Math.max(
    0,
    Math.round(((Number(kcal) || 0) - (Number(proteine) || 0) * 4 - (Number(grassi) || 0) * 9) / 4),
  )
}

/**
 * La dieta costruita sui numeri che uno ha già in mano — le calorie che vuole
 * assumere e i suoi macro — invece che sul peso e sul metabolismo basale.
 *
 * È `fonte: ESTERNA` e non è un dettaglio: vuol dire che i numeri li ha decisi
 * qualcun altro (la persona, o il suo nutrizionista) e che l'app non deve
 * ricalcolarli mai. L'app ci mette solo i piatti per arrivarci, alternative
 * comprese — e con `conPasti: false` nemmeno quelli: la dieta è solo il
 * LIMITE di calorie e macro, e i piatti si chiedono pasto per pasto dentro la
 * dieta giornaliera (consiglioPerPasto). È quello che fa "Calorie e macro".
 *
 * I giorni di allenamento si possono scrivere in due modi:
 *  - `allenamento: {kcal, proteine, carbo, grassi}` — numeri tutti suoi, come
 *    li dà il nutrizionista che distingue i due giorni (è il caso normale);
 *  - `extraAllenamento`, le kcal in più, che finiscono tutte in carboidrati: è
 *    la scorciatoia di chi mangia uguale e aggiunge qualcosa quando si allena.
 * Senza nessuno dei due, i due giorni sono uguali.
 */
export function dietaDaMacro(
  {
    nome,
    obiettivo = 'mantenimento',
    kcal,
    proteine,
    carbo,
    grassi,
    allenamento = null,
    extraAllenamento = 0,
    fonteNota = '',
    conPasti = true,
  },
  preferenze,
  overrides = {},
) {
  // I numeri di un giorno: le kcal scritte o, se mancano, quelle dei macro.
  const numeri = (x) => {
    const p = Math.round(Number(x?.proteine) || 0)
    const c = Math.round(Number(x?.carbo) || 0)
    const g = Math.round(Number(x?.grassi) || 0)
    const k = Math.round(Number(x?.kcal) || 0) || coerenzaMacro({ proteine: p, carbo: c, grassi: g }).kcalDaMacro
    return { kcal: k, proteine: p, carbo: c, grassi: g }
  }
  const piano = (n) => ({ ...n, pasti: conPasti ? generaPasti(n.proteine, n.carbo, n.grassi, preferenze) : [] })

  const riposo = numeri({ kcal, proteine, carbo, grassi })
  const conMacro = allenamento && ['proteine', 'carbo', 'grassi'].some((k) => Number(allenamento[k]) > 0)
  const extra = Math.max(0, Math.round(Number(extraAllenamento) || 0))
  const giornoAllenamento = conMacro
    ? numeri(allenamento)
    : { ...riposo, kcal: riposo.kcal + extra, carbo: riposo.carbo + Math.round(extra / 4) }

  return nuovaDieta({
    nome: (nome || '').trim() || 'La mia dieta',
    obiettivo,
    fonte: FONTE.ESTERNA,
    fonteNota,
    allenamento: piano(giornoAllenamento),
    riposo: piano(riposo),
    ...overrides,
  })
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
 * @property {{id:string, slot:string, nome:string, testo:string, opzioni:string[]}[]} pasti
 *   `slot` è uno dei cinque pasti (lib/pastiBase) o '' per un pasto in più.
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
    // Quando l'ha resa attiva la persona, dall'elenco delle diete (vedi
    // dietaDiOggi). Vuoto = mai scelta: decide il periodo.
    attivataIl: '',
    // Piani base.
    allenamento: pianoVuoto(),
    riposo: pianoVuoto(),
    // Giornate tipo (facoltative): variano il menu a parità di macro.
    giornate: [],
    // Schema settimanale (facoltativo): per ogni giorno e pasto, che tipo di
    // piatto va fatto ("lunedì a pranzo legumi"). Vedi lib/schemaDieta.
    schema: [],
    // Le indicazioni del nutrizionista che non sono pasti (porzioni dei
    // secondi, sostituzioni, consigli): lette dal PDF, si tengono da parte.
    note: '',
    creataIl: new Date().toISOString(),
    ...overrides,
  }
}

function normalizzaPasti(pasti) {
  // `opzioni`: gli ALTRI modi di fare lo stesso pasto ("oppure…" del
  // nutrizionista, o le varianti generate dall'app). `testo` resta il pasto
  // principale, così tutto ciò che è stato scritto prima delle opzioni
  // continua a funzionare senza sapere che esistono.
  return Array.isArray(pasti)
    ? assegnaSlot(
        pasti.map((p) => ({
          id: p.id || nuovoId(),
          slot: SLOT_VALIDI.has(p.slot) ? p.slot : undefined,
          nome: p.nome || '',
          testo: p.testo || '',
          opzioni: Array.isArray(p.opzioni) ? p.opzioni.filter((o) => String(o || '').trim()) : [],
        })),
      )
    : []
}

/**
 * Le calorie di un piano che ne dichiara solo i macro: 4 kcal per grammo di
 * proteine e carboidrati, 9 per i grassi. Chi scrive i macro e lascia vuote le
 * calorie vuole questo conto, non uno zero.
 */
export function conKcal(pi) {
  const kcal = Number(pi?.kcal) || 0
  if (kcal > 0) return kcal
  return coerenzaMacro({ kcal: 0, proteine: pi?.proteine, carbo: pi?.carbo, grassi: pi?.grassi }).kcalDaMacro
}

function normalizzaPiano(pi) {
  const base = pianoVuoto()
  if (!pi || typeof pi !== 'object') return base
  return {
    kcal: conKcal(pi),
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
    kcal: conKcal(g),
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
    // Idem per lo schema settimanale e le note.
    schema: normalizzaSchema(dieta?.schema),
    note: typeof dieta?.note === 'string' ? dieta.note : '',
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

/**
 * La dieta da seguire oggi fra quelle salvate.
 *
 * Vince quella resa attiva per ULTIMA dall'elenco delle diete (`attivataIl`):
 * è una scelta della persona e batte qualsiasi regola. Una sola riga cambia
 * quando se ne sceglie un'altra, niente da spegnere sulle altre: vince la più
 * recente. ⚠️ Solo finché il suo periodo comprende oggi — finito quello si
 * torna alla regola di sempre, la prima il cui periodo comprende oggi, così
 * una dieta "fino al 31 marzo" non resta attiva ad aprile.
 */
export function dietaDiOggi(diete, dataISO) {
  const oggi = dataISO || oggiISO()
  const valide = (diete || []).filter((d) => dietaAttiva(d, oggi))
  const scelte = valide
    .filter((d) => d.attivataIl)
    .sort((a, b) => String(b.attivataIl).localeCompare(String(a.attivataIl)))
  return scelte[0] || valide[0] || null
}

/**
 * La dieta resa attiva da adesso. Se il suo periodo non comprende oggi (una
 * dieta vecchia, finita) riparte da oggi, senza fine: rendere attiva una
 * dieta che poi non vale sarebbe un tasto che non fa niente. Chi la rende
 * attiva lo legge prima, sotto il tasto (DietaPage).
 */
export function rendiAttiva(dieta, adesso = new Date()) {
  const oggi = oggiISO(adesso)
  const periodo = dietaAttiva(dieta, oggi) ? {} : { dataInizio: oggi, dataFine: '' }
  return { ...dieta, ...periodo, attivataIl: adesso.toISOString() }
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
 *
 * ⚠️ Una giornata che si chiama come un giorno della settimana ("Lunedì")
 * esce QUEL giorno. Con la sola rotazione, sette giornate da lunedì a domenica
 * finivano sfasate di tre giorni: il lunedì proponeva quella del giovedì.
 */
export function giornataDelGiorno(dieta, allenamento, data = new Date()) {
  const buone = giornatePerTipo(dieta, allenamento)
  if (buone.length === 0) return null
  const oggi = GIORNI_SETTIMANA[giornoSettimana(data)]
  const diOggi = buone.find((g) => semplifica(g.nome).startsWith(oggi.chiave))
  if (diOggi) return diOggi
  const conGiorno = (g) => GIORNI_SETTIMANA.some((x) => semplifica(g.nome).startsWith(x.chiave))
  // Le giornate legate a un altro giorno non ruotano negli altri giorni: se
  // sono tutte così e oggi non c'è la sua, vale il piano base.
  const libere = buone.filter((g) => !conGiorno(g))
  if (libere.length === 0) return null
  const giorniDaEpoca = Math.floor(
    new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() / 86400000,
  )
  return libere[giorniDaEpoca % libere.length]
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
