// ---------------------------------------------------------------------------
// IL CATALOGO COME LO VEDE LA PERSONA: gli alimenti di lib/alimenti più i
// propri (lib/cibiMiei), divisi per categoria e cercabili per nome.
//
// Serve a due posti: la pagina del catalogo in Altro (sfogliare, aggiungere i
// propri) e la ricerca di "Cosa hai mangiato" in Dieta, che mostra i risultati
// mentre si scrive. ⚠️ Lì non si dice da dove arriva un alimento: i propri
// vengono prima (chi ha salvato "yogurt greco Fage" vuole quello, non il
// generico), poi il catalogo, poi quello che si trova online — ma per chi
// guarda è un elenco solo.
// ---------------------------------------------------------------------------

import { ALIMENTI, alimentoDaId, kcalPer100, normalizzaCibo } from './alimenti'
import { normalizzaCibiMiei } from './cibiMiei'
import { slotDellaVoce } from './diario'

// Le categorie, nell'ordine in cui si sfogliano. Un alimento sta nella PRIMA
// che lo riconosce: gli integratori prima dei latticini (le proteine del
// siero non sono un formaggio), i grassi per macro dopo tutto il resto (l'olio
// non ha un tag suo, il burro sì ma è un latticino solo per le intolleranze).
export const CATEGORIE_CIBO = [
  { id: 'altro', nome: 'Dolci, bevande e altro', e: (a) => a.tag.includes('integratori') || a.tag.includes('alcol') || a.tag.includes('cacao') || a.tag.includes('miele') },
  { id: 'carne', nome: 'Carne e salumi', e: (a) => a.tag.includes('carne') },
  { id: 'pesce', nome: 'Pesce', e: (a) => a.tag.includes('pesce') },
  { id: 'uova', nome: 'Uova', e: (a) => a.tag.includes('uova') },
  { id: 'latticini', nome: 'Latte e latticini', e: (a) => a.tag.includes('latticini') && a.macro !== 'g' },
  { id: 'legumi', nome: 'Legumi', e: (a) => a.tag.includes('legumi') || a.tag.includes('soia') },
  { id: 'cereali', nome: 'Cereali, pane e patate', e: (a) => a.tag.includes('cereali') || a.tag.includes('tuberi') },
  { id: 'frutta', nome: 'Frutta', e: (a) => a.tag.includes('frutta') },
  { id: 'verdura', nome: 'Verdura', e: (a) => a.tag.includes('verdura') },
  { id: 'secca', nome: 'Frutta secca e semi', e: (a) => a.tag.includes('frutta-secca') || a.tag.includes('semi') || a.tag.includes('arachidi') },
  { id: 'grassi', nome: 'Oli e condimenti', e: (a) => a.macro === 'g' },
]
const RESTO = CATEGORIE_CIBO[0]

/** La categoria di un alimento (del catalogo o mio, che di tag può non averne). */
export function categoriaDi(alimento) {
  const a = { ...alimento, tag: alimento?.tag || [] }
  if (RESTO.e(a)) return RESTO.id
  return (CATEGORIE_CIBO.slice(1).find((c) => c.e(a)) || RESTO).id
}

/** Il catalogo diviso per categoria: [{ id, nome, alimenti }], vuote escluse. */
export function catalogoPerCategoria(alimenti = ALIMENTI) {
  const per = new Map(CATEGORIE_CIBO.map((c) => [c.id, []]))
  for (const a of alimenti) per.get(categoriaDi(a)).push(a)
  const ordine = [...CATEGORIE_CIBO.slice(1), RESTO]
  return ordine
    .map((c) => ({ id: c.id, nome: c.nome, alimenti: per.get(c.id).sort((x, y) => x.nome.localeCompare(y.nome, 'it')) }))
    .filter((c) => c.alimenti.length > 0)
}

// Quanto bene un alimento risponde a quello che si scrive: 0 se il nome (o un
// alias) COMINCIA così, 1 se ci comincia una parola, 2 se c'è dentro, null se
// non c'entra.
function punteggio(alimento, t) {
  const nomi = [normalizzaCibo(alimento.nome), normalizzaCibo(alimento.marca), ...(alimento.alias || [])].filter(Boolean)
  let migliore = null
  for (const n of nomi) {
    const p = n.startsWith(t) ? 0 : n.includes(` ${t}`) ? 1 : n.includes(t) ? 2 : null
    if (p != null && (migliore == null || p < migliore)) migliore = p
  }
  return migliore
}

/**
 * Gli alimenti che rispondono a `testo`: prima i miei, poi il catalogo, ognuno
 * ordinato da chi risponde meglio. Senza rete: è la parte che si vede subito.
 */
export function cercaAlimenti(testo, cibiMiei, limite = 12) {
  const t = normalizzaCibo(testo)
  if (t.length < 2) return []
  const ordina = (lista) =>
    lista
      .map((a) => ({ a, p: punteggio(a, t) }))
      .filter((x) => x.p != null)
      .sort((x, y) => x.p - y.p || x.a.nome.length - y.a.nome.length)
      .map((x) => x.a)
  return [...ordina(normalizzaCibiMiei(cibiMiei)), ...ordina(ALIMENTI)].slice(0, limite)
}

// Quali pasti si scambiano i recenti: a pranzo e a cena si mangiano le stesse
// cose, a spuntino e a merenda pure, la colazione fa storia a sé. "Extra"
// (fuori dai cinque pasti) li vede tutti.
const GRUPPI_PASTO = [['colazione'], ['pranzo', 'cena'], ['spuntino', 'merenda']]

/** I pasti che condividono i recenti con `slot` (null = tutti). */
export function pastiVicini(slot) {
  return GRUPPI_PASTO.find((g) => g.includes(slot)) || null
}

/**
 * Gli alimenti usati di recente nel diario, dal più recente: da toccare prima
 * ancora di scrivere. Solo quelli che si conoscono (catalogo o miei), e solo
 * dei pasti che somigliano a `slot` (vedi GRUPPI_PASTO): il pollo della cena
 * non va proposto a colazione.
 */
export function cibiRecenti(diario, cibiMiei, { slot = null, limite = 8 } = {}) {
  const miei = normalizzaCibiMiei(cibiMiei)
  const trova = (id) => miei.find((c) => c.id === id) || alimentoDaId(id)
  const vicini = pastiVicini(slot)
  const giorni = [...(diario || [])].sort((a, b) => String(b.data).localeCompare(String(a.data)))
  const visti = new Set()
  const fuori = []
  for (const g of giorni) {
    const voci = [...(g.voci || [])].sort((a, b) => String(b.ora).localeCompare(String(a.ora)))
    for (const v of voci) {
      if (!v.alimentoId || visti.has(v.alimentoId)) continue
      if (vicini && !vicini.includes(slotDellaVoce(v))) continue
      visti.add(v.alimentoId)
      const a = trova(v.alimentoId)
      if (a) fuori.push(a)
      if (fuori.length >= limite) return fuori
    }
  }
  return fuori
}

/** "97 kcal · P 10 · C 4 · G 0", per 100 g. */
export function riassuntoPer100(alimento) {
  const m = alimento.m || {}
  return `${Math.round(kcalPer100(alimento))} kcal · P ${m.p} · C ${m.c} · G ${m.g}`
}
