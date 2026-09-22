// ---------------------------------------------------------------------------
// LE UNITÀ DI MISURA: da "2 biscotti" ai grammi.
//
// Tutto il resto dell'app conta in GRAMMI — i macro stanno per 100g, le dieta
// parla di grammi, il diario somma grammi. Ma nessuno mangia in grammi: si
// mangiano due biscotti, si beve mezzo bicchiere di latte, si condisce con un
// cucchiaio d'olio. Questo file sta in mezzo: prende quello che dice la
// persona e lo traduce in quello che serve ai conti.
//
// Un posto solo, usato da due parti che devono per forza andare d'accordo:
//   - il testo scritto a mano ("200 ml di latte") in lib/diario;
//   - il menù a tendina accanto alla quantità in components/AggiungiMangiato.
// Se le due strade non dessero lo stesso numero, la stessa cosa scritta in due
// modi peserebbe diverso, ed è il genere di sbaglio che nessuno trova più.
//
// ⚠️ I PEZZI NON SI INVENTANO. Quanto pesa un biscotto lo sa solo chi lo ha in
// mano: se l'alimento non porta un `pezzo` noto, `grammiDa` torna **null** e
// chi chiama DEVE chiedere. Meglio una domanda in più che venti grammi
// inventati moltiplicati per due.
//
// ⚠️ I MILLILITRI NON SONO GRAMMI. Per l'acqua sì, e per quasi tutto quello
// che si beve la differenza sta nel rumore; per l'olio no — un decilitro
// d'olio pesa 91 grammi, non 100, e sull'olio il 9% sono calorie vere. Chi ha
// una densità che conta se la porta scritta (`densita`, in g/ml); per tutti
// gli altri vale 1, che è la verità per l'acqua e una buona approssimazione
// per il resto.
// ---------------------------------------------------------------------------

/**
 * Le unità che l'app conosce.
 *
 * `scelta: true`  → compare nel menù a tendina accanto alla quantità.
 * `scritte`       → come si può scriverla a mano nel diario.
 * `grammi`        → quanti grammi vale UNA, quando è un peso.
 * `ml`            → quanti millilitri vale UNA (poi × densità).
 * `aPezzi`        → vale quanto pesa un pezzo dell'alimento, che va saputo.
 *
 * ⚠️ Cucchiai e cucchiaini sono PESI e non volumi, apposta: 10g e 5g sono i
 * valori che il diario usa da sempre, e sono giusti proprio per le cose che si
 * misurano a cucchiaio (olio, miele, marmellata). Girarli in millilitri
 * cambierebbe i conti di chi scrive "un cucchiaio d'olio" da mesi.
 */
export const UNITA = [
  { id: 'g', nome: 'g', lungo: 'grammi', scelta: true, grammi: 1, scritte: ['grammi', 'grammo', 'gr', 'g'] },
  { id: 'kg', nome: 'kg', lungo: 'chili', grammi: 1000, scritte: ['chilogrammi', 'chilo', 'chili', 'kg'] },
  { id: 'ml', nome: 'ml', lungo: 'millilitri', scelta: true, ml: 1, scritte: ['millilitri', 'ml'] },
  { id: 'cl', nome: 'cl', lungo: 'centilitri', ml: 10, scritte: ['centilitri', 'cl'] },
  { id: 'l', nome: 'l', lungo: 'litri', ml: 1000, scritte: ['litri', 'litro', 'lt', 'l'] },
  { id: 'pz', nome: 'pezzi', lungo: 'pezzi', scelta: true, aPezzi: true, scritte: ['pezzi', 'pezzo', 'pz'] },
  { id: 'cucchiai', nome: 'cucchiai', lungo: 'cucchiai', scelta: true, grammi: 10, scritte: [] },
  { id: 'cucchiaini', nome: 'cucchiaini', lungo: 'cucchiaini', scelta: true, grammi: 5, scritte: [] },
]

/** Le unità da mettere nel menù a tendina, nell'ordine in cui vanno mostrate. */
export const UNITA_SCELTA = UNITA.filter((u) => u.scelta)

const PER_ID = new Map(UNITA.map((u) => [u.id, u]))

/** L'unità con quell'id, o `undefined`. */
export function unitaDa(id) {
  return PER_ID.get(String(id || '').trim())
}

// Le parole che valgono come unità, le più lunghe davanti: se "g" venisse
// prima di "grammi", "150 grammi" si leggerebbe "150 g" + la parola "rammi".
const SCRITTE = UNITA.flatMap((u) => u.scritte.map((s) => [s, u])).sort((a, b) => b[0].length - a[0].length)

/** Il pezzo di regola che riconosce un'unità scritta a mano. */
export const UNITA_SCRITTE = SCRITTE.map(([s]) => s).join('|')

/** Da "gr", "millilitri", "pz" all'unità. */
export function unitaScritta(parola) {
  const p = String(parola || '')
    .trim()
    .toLowerCase()
  return SCRITTE.find(([s]) => s === p)?.[1]
}

/** Quanto pesa UN pezzo di questo alimento, o `null` se non si sa. */
export function pesoPezzo(alimento) {
  const n = Number(alimento?.pezzo)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Quanti grammi in un millilitro. 1 se non c'è scritto niente (vedi in testa). */
export function densitaDi(alimento) {
  const n = Number(alimento?.densita)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Un numero scritto all'italiana ("1,5") o all'inglese ("1.5"). */
export function numeroIt(testo) {
  if (typeof testo === 'number') return Number.isFinite(testo) ? testo : null
  const n = parseFloat(String(testo ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Quanti grammi sono `quantita` di `unita` di questo alimento.
 *
 * @returns {number|null} `null` quando la domanda non ha risposta: quantità
 *          vuota o non numerica, oppure pezzi di un alimento di cui non si sa
 *          quanto pesa un pezzo. ⚠️ Chi chiama non deve trattare `null` come
 *          zero: deve CHIEDERE (vedi il commento in testa al file).
 */
export function grammiDa(quantita, unita, alimento) {
  const q = numeroIt(quantita)
  if (q == null || q <= 0) return null
  const u = unitaDa(unita) || UNITA[0]
  if (u.aPezzi) {
    const pezzo = pesoPezzo(alimento)
    return pezzo == null ? null : q * pezzo
  }
  if (u.ml) return q * u.ml * densitaDi(alimento)
  return q * (u.grammi || 1)
}

/**
 * La stessa quantità detta con un'altra unità: 150 g di yogurt da 150 → 1
 * vasetto, 20 g d'olio → 2 cucchiai.
 *
 * Serve quando si cambia il menù a tendina: il numero scritto deve seguire,
 * se no "150 g" diventa "150 pezzi" e sono quindici chili di biscotti.
 *
 * @returns {string} pronto da rimettere nel campo. '1' quando la conversione
 *          non si può fare (pezzo sconosciuto): si riparte da uno, e la
 *          domanda su quanto pesa la fa l'interfaccia.
 */
export function converti(quantita, da, a, alimento) {
  if (da === a) return String(quantita ?? '')
  const grammi = grammiDa(quantita, da, alimento)
  const uno = grammiDa(1, a, alimento)
  if (grammi == null || uno == null) return '1'
  // All'italiana ("1,03"): finisce dentro un campo che la persona può
  // continuare a scrivere, e il punto in mezzo a un numero qui è straniero.
  return numeroBreve(grammi / uno)
}

/** Come si scrive un numero senza gli zeri inutili: 2 e non 2.00. */
export function numeroBreve(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100
  return String(v).replace('.', ',')
}

/**
 * Come si racconta a schermo una quantità: "150 g", "2 pezzi · 16 g".
 *
 * ⚠️ I grammi si aggiungono solo quando dicono qualcosa di nuovo. "200 ml ·
 * 200 g" è rumore; "2 pezzi · 16 g" no, perché è l'unico modo per accorgersi
 * che il peso di un biscotto è finito storto.
 */
export function descriviQuantita(voce) {
  const grammi = Math.round(Number(voce?.grammi) || 0)
  const u = unitaDa(voce?.unita)
  const q = numeroIt(voce?.quantita)
  if (!u || u.id === 'g' || q == null) return `${grammi} g`
  const detto = `${numeroBreve(q)} ${u.nome}`
  return Math.round(q) === grammi && !u.aPezzi ? detto : `${detto} · ${grammi} g`
}
