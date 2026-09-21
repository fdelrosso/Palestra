// ---------------------------------------------------------------------------
// Alimenti, esclusioni e SOSTITUZIONI.
//
// Serve a una cosa sola: prendere una dieta — calcolata dall'app, scritta dal
// nutrizionista o incollata da un PDF — e riscriverla togliendo ciò che chi la
// segue non può o non vuole mangiare, **senza cambiare i macro**.
//
// L'idea è che ogni alimento vale per un macro (p/c/g) e ha una densità `per`
// = grammi di quel macro per grammo di alimento (il petto di pollo ha ~0,31 g
// di proteine per grammo). Sostituire allora è aritmetica: 150g di pollo (46g
// di proteine) diventano 46/0,18 ≈ 255g di merluzzo. I grammi cambiano, il
// piatto no.
//
// I `tag` dicono cosa c'è dentro (latticini, glutine, pesce…): un'esclusione
// non è altro che un tag da evitare. I regimi (vegetariano/vegano) sono
// scorciatoie che accendono più tag insieme.
//
// ⚠️ Come in lib/eserciziLibreria, il riconoscimento nel testo cerca
// SOTTOSTRINGHE: gli alias lunghi vanno provati prima dei corti, altrimenti
// "riso" pesca dentro "risotto ai formaggi" e anche dentro "sorriso".
//
// Non è un software medico: le densità sono valori medi da tabella, servono a
// tenere in piedi i macro, non a curare nessuno.
// ---------------------------------------------------------------------------

/** Le allergie/intolleranze proposte come caselle da spuntare. */
export const ESCLUSIONI = [
  { id: 'lattosio', label: 'Lattosio / latticini', tag: ['lattosio'] },
  { id: 'glutine', label: 'Glutine', tag: ['glutine'] },
  { id: 'uova', label: 'Uova', tag: ['uova'] },
  { id: 'pesce', label: 'Pesce', tag: ['pesce'] },
  { id: 'crostacei', label: 'Crostacei e molluschi', tag: ['crostacei'] },
  { id: 'frutta-secca', label: 'Frutta secca', tag: ['frutta-secca'] },
  { id: 'arachidi', label: 'Arachidi', tag: ['arachidi'] },
  { id: 'soia', label: 'Soia', tag: ['soia'] },
  { id: 'carne-rossa', label: 'Carne rossa', tag: ['carne-rossa'] },
  { id: 'maiale', label: 'Maiale', tag: ['maiale'] },
  { id: 'legumi', label: 'Legumi', tag: ['legumi'] },
]

/** Regimi alimentari: una scorciatoia che accende più esclusioni insieme. */
export const REGIMI = [
  { id: 'onnivoro', label: 'Mangio di tutto', tag: [] },
  { id: 'vegetariano', label: 'Vegetariano', tag: ['carne', 'pesce', 'crostacei'] },
  { id: 'vegano', label: 'Vegano', tag: ['carne', 'pesce', 'crostacei', 'lattosio', 'latticini', 'uova', 'miele'] },
]

export function labelRegime(id) {
  return REGIMI.find((r) => r.id === id)?.label || 'Mangio di tutto'
}

// ---- Il catalogo ---------------------------------------------------------
// `macro`: quale macro porta (p proteine, c carboidrati, g grassi). È quello
//          che comanda nelle SOSTITUZIONI: si scambia proteina con proteina.
// `m`:     i grammi di proteine / carboidrati / grassi in 100g di alimento.
//          ⚠️ È l'UNICA fonte: da qui si ricavano sia `per` (la densità del
//          macro dominante, che serve a sostituire) sia le calorie, che servono
//          al diario. Scritti due volte, erano due numeri destinati a divergere.
// `kcal`:  solo dove 4/4/9 non basta — l'alcol fa 7 kcal/g e non è un macro.
// `pezzo`: quanto pesa UNO ("2 uova", "una banana"), dove la domanda ha senso.
// `alias`: come può essere scritto in una dieta (minuscolo, senza accenti).
// `peso`:  quanto ci piace proporlo. **0 = mai come sostituto**: lo riconosco
//          se c'è scritto (e lo tolgo se è vietato), ma non lo propongo io.
//          È il caso di miele, cioccolato e integratori — giusti sui macro e
//          sbagliati nel piatto (115g di miele a pranzo al posto del riso) — e
//          di tutta la coda "solo per il diario" in fondo all'elenco.
//
// ⚠️ CRUDO O COTTO. Nelle diete i cereali e i legumi si pesano **a crudo**, ed
// è così che stanno qui: 80g di riso sono 62g di carboidrati, non 22. Chi nel
// diario scrive "riso cotto" trova la voce apposta, che è un alimento diverso
// con numeri diversi. Confonderli è l'errore che sballa di più i conti.
const CATALOGO = [
  // ---- proteine ----
  { id: 'pollo', nome: 'Petto di pollo', macro: 'p', m: { p: 31, c: 0, g: 3 }, tag: ['carne', 'carne-bianca'], alias: ['petto di pollo', 'pollo'], peso: 3 },
  { id: 'tacchino', nome: 'Fesa di tacchino', macro: 'p', m: { p: 30, c: 0, g: 2 }, tag: ['carne', 'carne-bianca'], alias: ['fesa di tacchino', 'tacchino'], peso: 2 },
  { id: 'manzo', nome: 'Manzo magro', macro: 'p', m: { p: 27, c: 0, g: 8 }, tag: ['carne', 'carne-rossa'], alias: ['manzo', 'vitello', 'carne rossa', 'hamburger'], peso: 2 },
  { id: 'lonza', nome: 'Lonza di maiale', macro: 'p', m: { p: 28, c: 0, g: 6 }, tag: ['carne', 'maiale'], alias: ['lonza', 'maiale'], peso: 1 },
  { id: 'bresaola', nome: 'Bresaola', macro: 'p', m: { p: 32, c: 0, g: 2 }, tag: ['carne', 'carne-rossa', 'salumi'], alias: ['bresaola'], peso: 1 },
  { id: 'prosciutto', nome: 'Prosciutto crudo sgrassato', macro: 'p', m: { p: 28, c: 0, g: 8 }, tag: ['carne', 'maiale', 'salumi'], alias: ['prosciutto crudo', 'prosciutto cotto', 'prosciutto'], peso: 1 },
  { id: 'uova', nome: 'Uova intere', macro: 'p', m: { p: 13, c: 1, g: 10 }, pezzo: 55, tag: ['uova'], alias: ['uova intere', 'uovo', 'uova', 'frittata'], peso: 3 },
  { id: 'albume', nome: 'Albume', macro: 'p', m: { p: 11, c: 1, g: 0 }, pezzo: 33, tag: ['uova'], alias: ['albume', 'albumi'], peso: 1 },
  { id: 'merluzzo', nome: 'Merluzzo', macro: 'p', m: { p: 18, c: 0, g: 1 }, tag: ['pesce'], alias: ['merluzzo', 'nasello', 'platessa', 'pesce bianco'], peso: 2 },
  { id: 'salmone', nome: 'Salmone', macro: 'p', m: { p: 20, c: 0, g: 12 }, tag: ['pesce'], alias: ['salmone'], peso: 2 },
  { id: 'tonno', nome: 'Tonno al naturale', macro: 'p', m: { p: 25, c: 0, g: 1 }, tag: ['pesce'], alias: ['tonno al naturale', 'tonno'], peso: 2 },
  { id: 'gamberi', nome: 'Gamberi', macro: 'p', m: { p: 20, c: 0, g: 1 }, tag: ['pesce', 'crostacei'], alias: ['gamberi', 'gamberetti', 'calamari', 'cozze'], peso: 1 },
  { id: 'yogurt-greco', nome: 'Yogurt greco 0%', macro: 'p', m: { p: 10, c: 4, g: 0 }, pezzo: 150, tag: ['latticini', 'lattosio'], alias: ['yogurt greco', 'yogurt'], peso: 3 },
  { id: 'skyr', nome: 'Skyr', macro: 'p', m: { p: 11, c: 4, g: 0 }, pezzo: 150, tag: ['latticini', 'lattosio'], alias: ['skyr'], peso: 2 },
  { id: 'ricotta', nome: 'Ricotta', macro: 'p', m: { p: 11, c: 3, g: 11 }, tag: ['latticini', 'lattosio'], alias: ['ricotta'], peso: 2 },
  { id: 'fiocchi-latte', nome: 'Fiocchi di latte', macro: 'p', m: { p: 12, c: 3, g: 4 }, tag: ['latticini', 'lattosio'], alias: ['fiocchi di latte', 'cottage'], peso: 2 },
  { id: 'mozzarella', nome: 'Mozzarella', macro: 'p', m: { p: 19, c: 1, g: 16 }, pezzo: 125, tag: ['latticini', 'lattosio'], alias: ['mozzarella', 'formaggio fresco'], peso: 1 },
  { id: 'parmigiano', nome: 'Parmigiano', macro: 'p', m: { p: 33, c: 0, g: 28 }, tag: ['latticini'], alias: ['parmigiano', 'grana'], peso: 1 },
  { id: 'whey', nome: 'Proteine in polvere', macro: 'p', m: { p: 80, c: 6, g: 6 }, pezzo: 30, tag: ['latticini', 'integratori'], alias: ['proteine in polvere', 'whey', 'proteine del siero'], peso: 0 },
  { id: 'whey-veg', nome: 'Proteine vegetali in polvere', macro: 'p', m: { p: 75, c: 8, g: 5 }, pezzo: 30, tag: ['integratori', 'vegetale'], alias: ['proteine vegetali'], peso: 0 },
  { id: 'tofu', nome: 'Tofu', macro: 'p', m: { p: 12, c: 2, g: 7 }, tag: ['soia', 'vegetale'], alias: ['tofu'], peso: 1 },
  { id: 'tempeh', nome: 'Tempeh', macro: 'p', m: { p: 19, c: 9, g: 11 }, tag: ['soia', 'vegetale'], alias: ['tempeh'], peso: 1 },
  { id: 'seitan', nome: 'Seitan', macro: 'p', m: { p: 24, c: 14, g: 2 }, tag: ['glutine', 'vegetale'], alias: ['seitan'], peso: 1 },
  { id: 'lenticchie', nome: 'Lenticchie (a crudo)', macro: 'p', m: { p: 25, c: 51, g: 1 }, tag: ['legumi', 'vegetale'], alias: ['lenticchie'], peso: 2 },
  { id: 'ceci', nome: 'Ceci (a crudo)', macro: 'p', m: { p: 20, c: 55, g: 6 }, tag: ['legumi', 'vegetale'], alias: ['ceci', 'fagioli', 'legumi'], peso: 2 },

  // ---- carboidrati ----
  { id: 'riso', nome: 'Riso (a crudo)', macro: 'c', m: { p: 7, c: 78, g: 1 }, tag: ['cereali', 'vegetale'], alias: ['riso basmati', 'riso'], peso: 3 },
  { id: 'pasta', nome: 'Pasta (a crudo)', macro: 'c', m: { p: 13, c: 72, g: 2 }, tag: ['cereali', 'glutine'], alias: ['pasta integrale', 'pasta', 'spaghetti'], peso: 3 },
  { id: 'pasta-legumi', nome: 'Pasta di legumi', macro: 'c', m: { p: 22, c: 50, g: 3 }, tag: ['legumi', 'vegetale'], alias: ['pasta di legumi'], peso: 1 },
  { id: 'pane', nome: 'Pane integrale', macro: 'c', m: { p: 9, c: 48, g: 2 }, pezzo: 35, tag: ['cereali', 'glutine'], alias: ['pane integrale', 'pane'], peso: 2 },
  { id: 'pane-sg', nome: 'Pane senza glutine', macro: 'c', m: { p: 3, c: 50, g: 4 }, pezzo: 35, tag: ['cereali', 'vegetale'], alias: ['pane senza glutine'], peso: 1 },
  { id: 'avena', nome: "Fiocchi d'avena", macro: 'c', m: { p: 13, c: 60, g: 7 }, tag: ['cereali', 'glutine'], alias: ["fiocchi d'avena", 'fiocchi di avena', 'avena', 'porridge'], peso: 3 },
  { id: 'gallette', nome: 'Gallette di riso', macro: 'c', m: { p: 8, c: 80, g: 3 }, pezzo: 8, tag: ['cereali', 'vegetale'], alias: ['gallette di riso', 'gallette', 'galletta'], peso: 2 },
  { id: 'patate', nome: 'Patate', macro: 'c', m: { p: 2, c: 17, g: 0 }, tag: ['tuberi', 'vegetale'], alias: ['patate dolci', 'patate', 'patata'], peso: 2 },
  { id: 'quinoa', nome: 'Quinoa', macro: 'c', m: { p: 14, c: 64, g: 6 }, tag: ['cereali', 'vegetale'], alias: ['quinoa', 'grano saraceno', 'miglio'], peso: 1 },
  { id: 'mais', nome: 'Polenta / mais', macro: 'c', m: { p: 8, c: 75, g: 1 }, tag: ['cereali', 'vegetale'], alias: ['polenta', 'mais'], peso: 1 },
  { id: 'cous-cous', nome: 'Cous cous (a crudo)', macro: 'c', m: { p: 12, c: 72, g: 1 }, tag: ['cereali', 'glutine'], alias: ['cous cous', 'couscous', 'farro', 'orzo'], peso: 1 },
  { id: 'frutta', nome: 'Frutta fresca', macro: 'c', m: { p: 1, c: 13, g: 0 }, pezzo: 150, tag: ['frutta', 'vegetale'], alias: ['frutta fresca', 'frutta', 'mela', 'pera', 'arancia'], peso: 3 },
  { id: 'banana', nome: 'Banana', macro: 'c', m: { p: 1, c: 23, g: 0 }, pezzo: 120, tag: ['frutta', 'vegetale'], alias: ['banana'], peso: 2 },
  { id: 'miele', nome: 'Miele', macro: 'c', m: { p: 0, c: 80, g: 0 }, tag: ['miele'], alias: ['miele', 'marmellata'], peso: 0 },
  { id: 'cereali', nome: 'Cereali integrali', macro: 'c', m: { p: 10, c: 70, g: 5 }, tag: ['cereali', 'glutine'], alias: ['cereali integrali', 'corn flakes', 'fette biscottate', 'biscotti'], peso: 1 },

  // ---- grassi ----
  { id: 'olio', nome: 'Olio EVO', macro: 'g', m: { p: 0, c: 0, g: 100 }, pezzo: 10, tag: ['vegetale'], alias: ['olio evo', "olio d'oliva", 'olio di oliva', 'olio'], peso: 3 },
  { id: 'mandorle', nome: 'Mandorle', macro: 'g', m: { p: 21, c: 9, g: 55 }, tag: ['frutta-secca', 'vegetale'], alias: ['mandorle', 'frutta secca'], peso: 2 },
  { id: 'noci', nome: 'Noci', macro: 'g', m: { p: 15, c: 7, g: 65 }, tag: ['frutta-secca', 'vegetale'], alias: ['noci', 'nocciole', 'anacardi', 'pistacchi'], peso: 2 },
  { id: 'arachidi', nome: "Burro d'arachidi", macro: 'g', m: { p: 25, c: 12, g: 50 }, tag: ['arachidi', 'frutta-secca'], alias: ["burro d'arachidi", 'arachidi'], peso: 1 },
  { id: 'avocado', nome: 'Avocado', macro: 'g', m: { p: 2, c: 9, g: 15 }, pezzo: 150, tag: ['vegetale'], alias: ['avocado'], peso: 2 },
  { id: 'semi', nome: 'Semi di lino o chia', macro: 'g', m: { p: 17, c: 8, g: 31 }, tag: ['semi', 'vegetale'], alias: ['semi di lino', 'semi di chia', 'semi di zucca', 'semi'], peso: 1 },
  { id: 'cioccolato', nome: 'Cioccolato fondente', macro: 'g', m: { p: 8, c: 30, g: 30 }, tag: ['cacao', 'vegetale'], alias: ['cioccolato fondente', 'cioccolato', 'cacao'], peso: 0 },
  { id: 'burro', nome: 'Burro', macro: 'g', m: { p: 1, c: 1, g: 83 }, pezzo: 10, tag: ['latticini'], alias: ['burro'], peso: 1 },
  { id: 'olive', nome: 'Olive', macro: 'g', m: { p: 1, c: 1, g: 15 }, tag: ['vegetale'], alias: ['olive'], peso: 1 },

  // ---- solo per il DIARIO (peso 0: riconosciuti, mai proposti) -------------
  // Non servono a comporre una dieta: servono a non dire "non lo conosco" a chi
  // scrive quello che ha mangiato davvero. ⚠️ Qui dentro i cereali e i legumi
  // sono **cotti**, al contrario di quelli sopra: è esattamente perché esistono.
  { id: 'riso-cotto', nome: 'Riso cotto', macro: 'c', m: { p: 2.5, c: 28, g: 0.3 }, tag: ['cereali', 'vegetale'], alias: ['riso cotto', 'riso lesso'], peso: 0 },
  { id: 'pasta-cotta', nome: 'Pasta cotta', macro: 'c', m: { p: 5, c: 30, g: 1 }, tag: ['cereali', 'glutine'], alias: ['pasta cotta', 'pasta al pomodoro', 'pasta al sugo'], peso: 0 },
  { id: 'legumi-cotti', nome: 'Legumi cotti', macro: 'p', m: { p: 9, c: 17, g: 2 }, tag: ['legumi', 'vegetale'], alias: ['lenticchie cotte', 'ceci cotti', 'fagioli cotti', 'legumi cotti', 'legumi in scatola'], peso: 0 },
  { id: 'verdure', nome: 'Verdure', macro: 'c', m: { p: 1.5, c: 4, g: 0.3 }, tag: ['verdura', 'vegetale'], alias: ['verdure', 'insalata', 'zucchine', 'broccoli', 'spinaci', 'pomodori', 'pomodoro', 'melanzane', 'peperoni', 'carote', 'finocchi', 'contorno'], peso: 0 },
  { id: 'latte', nome: 'Latte', macro: 'c', m: { p: 3.4, c: 5, g: 3.6 }, pezzo: 200, tag: ['latticini', 'lattosio'], alias: ['latte intero', 'latte scremato', 'latte'], peso: 0 },
  { id: 'latte-vegetale', nome: 'Bevanda vegetale', macro: 'c', m: { p: 0.5, c: 3, g: 1.5 }, pezzo: 200, tag: ['vegetale'], alias: ['latte di mandorla', 'latte di soia', 'latte di avena', 'bevanda vegetale'], peso: 0 },
  { id: 'pizza', nome: 'Pizza margherita', macro: 'c', m: { p: 11, c: 33, g: 10 }, pezzo: 300, tag: ['cereali', 'glutine', 'latticini', 'lattosio'], alias: ['pizza margherita', 'pizza'], peso: 0 },
  { id: 'piadina', nome: 'Piadina / panino', macro: 'c', m: { p: 8, c: 47, g: 10 }, pezzo: 100, tag: ['cereali', 'glutine'], alias: ['piadina', 'panino', 'focaccia', 'tramezzino'], peso: 0 },
  { id: 'patatine', nome: 'Patatine fritte', macro: 'c', m: { p: 3, c: 35, g: 15 }, tag: ['tuberi', 'vegetale'], alias: ['patatine fritte', 'patatine', 'fritte'], peso: 0 },
  { id: 'gelato', nome: 'Gelato', macro: 'c', m: { p: 4, c: 25, g: 12 }, pezzo: 100, tag: ['latticini', 'lattosio'], alias: ['gelato'], peso: 0 },
  { id: 'dolce', nome: 'Dolce / merendina', macro: 'c', m: { p: 6, c: 55, g: 18 }, pezzo: 45, tag: ['cereali', 'glutine', 'latticini'], alias: ['merendina', 'brioche', 'cornetto', 'croissant', 'crostata', 'torta', 'dolce'], peso: 0 },
  { id: 'zucchero', nome: 'Zucchero', macro: 'c', m: { p: 0, c: 100, g: 0 }, pezzo: 5, tag: [], alias: ['zucchero'], peso: 0 },
  { id: 'caffe', nome: 'Caffè', macro: 'c', m: { p: 0, c: 0, g: 0 }, pezzo: 30, tag: [], alias: ['caffe', 'espresso', 'tisana'], peso: 0 },
  // ⚠️ L'alcol fa 7 kcal/g e non è nessuno dei tre macro: senza un `kcal`
  // scritto a mano, una birra risulterebbe da 16 calorie.
  { id: 'birra', nome: 'Birra', macro: 'c', m: { p: 0.5, c: 3.6, g: 0 }, kcal: 43, pezzo: 330, tag: ['glutine', 'alcol'], alias: ['birra'], peso: 0 },
  { id: 'vino', nome: 'Vino', macro: 'c', m: { p: 0.1, c: 0.6, g: 0 }, kcal: 85, pezzo: 125, tag: ['alcol'], alias: ['vino rosso', 'vino bianco', 'vino'], peso: 0 },
]

/**
 * Il catalogo vero, con `per` (grammi del macro dominante per grammo di
 * alimento) ricavato da `m`: vedi l'avvertenza qui sopra sull'unica fonte.
 */
export const ALIMENTI = CATALOGO.map((a) => ({ ...a, per: a.m[a.macro] / 100 }))

/** Le calorie di 100g: 4/4/9, salvo dove c'è un `kcal` scritto (l'alcol). */
export function kcalPer100(alimento) {
  if (!alimento) return 0
  if (alimento.kcal != null) return alimento.kcal
  return alimento.m.p * 4 + alimento.m.c * 4 + alimento.m.g * 9
}

/**
 * Quanto vale una porzione: calorie e macro di `grammi` di un alimento.
 * I macro restano con un decimale — 30g di pollo sono 9,3g di proteine, e
 * arrotondarli a 9 dieci volte al giorno fa sparire un pasto intero.
 * @returns {{kcal:number, proteine:number, carbo:number, grassi:number}}
 */
export function macroDi(alimento, grammi) {
  const q = (Number(grammi) || 0) / 100
  if (!alimento || q <= 0) return { kcal: 0, proteine: 0, carbo: 0, grassi: 0 }
  return {
    kcal: Math.round(kcalPer100(alimento) * q),
    proteine: Math.round(alimento.m.p * q * 10) / 10,
    carbo: Math.round(alimento.m.c * q * 10) / 10,
    grassi: Math.round(alimento.m.g * q * 10) / 10,
  }
}

// Alias ordinati dal più lungo al più corto: vedi l'avvertenza in testa.
const INDICE_ALIAS = ALIMENTI.flatMap((a) => a.alias.map((al) => ({ alias: al, alimento: a }))).sort(
  (x, y) => y.alias.length - x.alias.length,
)

/** Minuscolo, senza accenti, spazi normalizzati: il formato degli alias. */
export function normalizzaCibo(testo) {
  return String(testo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // via gli accenti: "però" e "pero" pari sono
    .replace(/\s+/g, ' ')
    .trim()
}

/** L'alimento nominato in un testo (il primo alias che compare), o null. */
export function trovaAlimento(testo) {
  const t = normalizzaCibo(testo)
  if (!t) return null
  for (const voce of INDICE_ALIAS) {
    if (t.includes(voce.alias)) return voce.alimento
  }
  return null
}

// ---- Preferenze → tag da evitare ----------------------------------------

/**
 * Tutti i tag vietati da un insieme di preferenze: quelli del regime più
 * quelli delle esclusioni spuntate.
 * @param {{regime?:string, esclusioni?:string[]}} pref
 * @returns {Set<string>}
 */
export function tagVietati(pref) {
  const out = new Set()
  const regime = REGIMI.find((r) => r.id === pref?.regime)
  for (const t of regime?.tag || []) out.add(t)
  for (const id of pref?.esclusioni || []) {
    const e = ESCLUSIONI.find((x) => x.id === id)
    for (const t of e?.tag || []) out.add(t)
  }
  // Chi esclude il lattosio esclude anche il burro e simili: l'intolleranza
  // riguarda il latte, non il singolo prodotto.
  if (out.has('lattosio')) out.add('latticini')
  return out
}

/** Vietato dai tag oppure nominato tra i cibi che l'utente non vuole. */
export function alimentoVietato(alimento, pref, vietati = tagVietati(pref)) {
  if (!alimento) return false
  if (alimento.tag.some((t) => vietati.has(t))) return true
  return listaContiene(pref?.evito, alimento)
}

// Un cibo scritto a mano dall'utente ("niente cipolla") che compare tra i nomi
// o gli alias dell'alimento.
function listaContiene(lista, alimento) {
  for (const voce of lista || []) {
    const v = normalizzaCibo(voce)
    if (!v) continue
    if (normalizzaCibo(alimento.nome).includes(v)) return true
    if (alimento.alias.some((a) => a.includes(v))) return true
  }
  return false
}

/**
 * Il sostituto di un alimento: stesso macro, niente di vietato.
 *
 * Chi vince, in ordine: quello che l'utente ha detto di gradire; poi quello di
 * DENSITÀ più vicina, con il "quanto è comune" (peso) come correttivo.
 *
 * La densità conta più della popolarità per una ragione pratica: sostituire un
 * alimento con uno molto più diluito fa esplodere le porzioni. Provato per
 * davvero: senza questa regola, a un celiaco 120g di riso diventavano 720g di
 * frutta — giusto sui carboidrati, impossibile nel piatto. E lo yogurt della
 * colazione diventava petto di pollo.
 *
 * La distanza è il logaritmo del rapporto (non la differenza): tra 0,10 e 0,20
 * c'è lo stesso salto che tra 0,40 e 0,80, ed è quello che si sente sui grammi.
 * @returns {object|null} null se non c'è niente di adatto (raro)
 */
export function alternativaPer(alimento, pref) {
  if (!alimento) return null
  const vietati = tagVietati(pref)
  const candidati = ALIMENTI.filter(
    (a) =>
      a.macro === alimento.macro &&
      a.id !== alimento.id &&
      a.peso > 0 &&
      !alimentoVietato(a, pref, vietati),
  )
  if (candidati.length === 0) return null
  const gradito = (a) => (listaContiene(pref?.preferisco, a) ? 1 : 0)
  // Più basso è meglio: distanza di densità, scontata di 0,15 per ogni punto
  // di "comune" (bastano due punti di peso per pareggiare un 35% di densità).
  const punteggio = (a) => Math.abs(Math.log(a.per / alimento.per)) - 0.15 * a.peso
  candidati.sort((x, y) => gradito(y) - gradito(x) || punteggio(x) - punteggio(y))
  return candidati[0]
}

// ---- Riscrittura del testo di un pasto -----------------------------------

// "Petto di pollo: 150g" → { nome:'Petto di pollo', grammi:150, coda:'' }.
// Regge anche "150 g di petto di pollo" e "Petto di pollo 150g".
const RE_GRAMMI = /(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi)\b/i

function arrotonda5(n) {
  return Math.max(5, Math.round(n / 5) * 5)
}

/**
 * Riscrive UN alimento dentro un pezzo di testo ("150g merluzzo", "Pollo: 200g")
 * se è vietato. I grammi si ricalcolano per lasciare invariato il macro, e la
 * sostituzione avviene SUL POSTO: il resto della riga (le note, le porzioni
 * libere, l'ordine delle parole) resta com'era scritto.
 * @returns {{testo:string, sostituzione:{da:string,a:string}|null, avviso:string|null}}
 */
export function adattaVoce(pezzo, pref) {
  const originale = String(pezzo || '')
  const alimento = trovaAlimento(originale)
  if (!alimento || !alimentoVietato(alimento, pref)) {
    return { testo: originale, sostituzione: null, avviso: null }
  }
  const nuovo = alternativaPer(alimento, pref)
  if (!nuovo) {
    return {
      testo: originale,
      sostituzione: null,
      avviso: `${alimento.nome}: da togliere, ma non ho un'alternativa in elenco`,
    }
  }

  let testo = originale
  // Prima i grammi (sull'originale, dove il numero è ancora quello giusto).
  const m = originale.match(RE_GRAMMI)
  if (m) {
    const grammi = parseFloat(m[1].replace(',', '.'))
    const nuoviGrammi = arrotonda5((grammi * alimento.per) / nuovo.per)
    testo = testo.replace(RE_GRAMMI, `${nuoviGrammi}g`)
  }
  // Poi il nome, al posto dell'alias che avevamo riconosciuto.
  const alias = [...alimento.alias].sort((a, b) => b.length - a.length).map(escapeRe)
  const re = new RegExp(alias.join('|'), 'i')
  if (re.test(testo)) testo = testo.replace(re, nuovo.nome)
  else testo = m ? `${nuovo.nome}: ${testo}` : nuovo.nome

  return { testo, sostituzione: { da: alimento.nome, a: nuovo.nome }, avviso: null }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Come sono separati gli alimenti dentro un pasto: il puntino che genera l'app
// ("Pollo: 150g · Riso: 80g"), il punto e virgola, o la virgola di chi scrive a
// mano ("150g yogurt, 60g avena"). La virgola seguita da una cifra NON separa:
// è il separatore decimale italiano ("1,5g di olio").
export const SEPARATORE_PASTO = /(\s*[·•;]\s*|,(?!\d))/

/**
 * Adatta il testo di un pasto alle preferenze, alimento per alimento.
 * @returns {{testo:string, sostituzioni:{da:string,a:string}[], avvisi:string[]}}
 */
export function adattaTestoPasto(testo, pref) {
  const sostituzioni = []
  const avvisi = []
  const righe = String(testo || '')
    .split('\n')
    .map((riga) =>
      // Lo split con gruppo di cattura tiene i separatori nell'array: si
      // riscrivono solo i pezzi in posizione pari e la riga si ricompone
      // identica, spazi compresi.
      riga
        .split(SEPARATORE_PASTO)
        .map((pezzo, i) => {
          if (i % 2 === 1) return pezzo
          const r = adattaVoce(pezzo, pref)
          if (r.sostituzione) sostituzioni.push(r.sostituzione)
          if (r.avviso) avvisi.push(r.avviso)
          return r.testo
        })
        .join(''),
    )
  return { testo: righe.join('\n'), sostituzioni, avvisi: [...new Set(avvisi)] }
}

/**
 * Adatta un piano intero (pasti + eventuali giornate tipo).
 * @param {{pasti:{id:string,nome:string,testo:string}[]}} piano
 * @param {object} pref
 * @returns {{piano:object, sostituzioni:{da:string,a:string}[], avvisi:string[]}}
 */
export function adattaPiano(piano, pref) {
  if (!piano) return { piano, sostituzioni: [], avvisi: [] }
  const sostituzioni = []
  const avvisi = []
  const pasti = (piano.pasti || []).map((p) => {
    const r = adattaTestoPasto(p.testo, pref)
    sostituzioni.push(...r.sostituzioni)
    avvisi.push(...r.avvisi)
    return { ...p, testo: r.testo }
  })
  // Le stesse sostituzioni tornano in più pasti: elencarle una volta basta.
  const uniche = []
  const viste = new Set()
  for (const s of sostituzioni) {
    const k = `${s.da}→${s.a}`
    if (viste.has(k)) continue
    viste.add(k)
    uniche.push(s)
  }
  return { piano: { ...piano, pasti }, sostituzioni: uniche, avvisi: [...new Set(avvisi)] }
}

/** L'alimento del catalogo con quell'id (i template lo nominano così). */
export function alimentoDaId(id) {
  return ALIMENTI.find((a) => a.id === id) || null
}

/** L'alimento "buono" da usare al posto di quello del template, se serve. */
export function alimentoAmmesso(alimento, pref) {
  if (!alimento) return null
  return alimentoVietato(alimento, pref) ? alternativaPer(alimento, pref) : alimento
}
