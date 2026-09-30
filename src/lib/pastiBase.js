// ---------------------------------------------------------------------------
// I cinque pasti della giornata.
//
// Ogni giornata ha questi cinque pasti, sempre con questi nomi e in quest'ordine.
// Il nutrizionista può scriverli come vuole ("Spuntino di metà mattina",
// "Seconda colazione", "Spuntino del pomeriggio"): lo `slot` dice quale dei
// cinque è, e il nome a schermo diventa quello canonico. Chi ha un pasto in più
// (il pre-workout) lo tiene: è un extra, con `slot: ''` e il suo nome.
//
// Sta in un file suo, senza dipendenze, perché lo usano sia lib/dieta sia
// lib/schemaDieta, e i due non devono importarsi a vicenda.
// ---------------------------------------------------------------------------

export const PASTI_BASE = [
  { id: 'colazione', label: 'Colazione' },
  { id: 'spuntino', label: 'Spuntino' },
  { id: 'pranzo', label: 'Pranzo' },
  { id: 'merenda', label: 'Merenda' },
  { id: 'cena', label: 'Cena' },
]

export const SLOT_VALIDI = new Set(PASTI_BASE.map((p) => p.id))

export function labelPasto(slot) {
  return PASTI_BASE.find((p) => p.id === slot)?.label || ''
}

/** Minuscolo e senza accenti: il formato in cui si confrontano i nomi. */
export function semplifica(testo) {
  return String(testo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Quale dei cinque pasti è, a partire dal nome com'è scritto. '' se non è uno
 * dei cinque (pre/post workout, spuntino serale…).
 */
export function slotDaNome(nome) {
  const t = semplifica(nome)
  if (!t) return ''
  if (/\b(pre|post)[\s-]*(workout|allenamento)\b/.test(t)) return ''
  if (/^(prima\s+)?colazione\b/.test(t)) return 'colazione'
  if (/^merenda\b/.test(t)) return 'merenda'
  if (/^(spuntino|seconda\s+colazione|break)\b/.test(t)) {
    if (/\b(pomeriggio|pomeridiano)\b/.test(t)) return 'merenda'
    if (/\b(sera|serale|notte|dopo\s+cena)\b/.test(t)) return ''
    return 'spuntino'
  }
  if (/^pranzo\b/.test(t)) return 'pranzo'
  if (/^cena\b/.test(t)) return 'cena'
  return ''
}
