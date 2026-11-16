import { conKcal, normalizzaDieta, nuovaDieta, oggiISO, pastoVuoto, FONTE } from './dieta'

// ---------------------------------------------------------------------------
// La dieta dal PT, la parte che non parla col database (quella sta in
// lib/proposteDieta): cosa parte dal PT e cosa arriva all'atleta. A parte
// perché i test di Node la leggono senza la sessione di Supabase.
//
// Due modi:
//   - 'piano': una dieta intera, pasti compresi (una di quelle che il PT ha
//     preparato nella sua sezione Dieta);
//   - 'macro': solo calorie e macro, per i giorni di allenamento e di riposo.
//     I piatti li propone l'app all'atleta, pasto per pasto.
// ---------------------------------------------------------------------------

export const MODI = {
  piano: 'Il piano, coi pasti',
  macro: 'Solo calorie e macro',
}

/**
 * Come parte una delle diete del PT: 'piano' se ha qualcosa da mangiare
 * scritto (pasti, giornate tipo, schema), altrimenti 'macro'. Una dieta fatta
 * coi soli numeri non deve arrivare all'atleta come "il piano, coi pasti".
 */
export function modoDi(dieta) {
  const d = normalizzaDieta(dieta)
  const conPasti = [d.allenamento, d.riposo, ...d.giornate].some((pi) => pi.pasti.some((p) => !pastoVuoto(p)))
  return conPasti || d.schema.length > 0 ? 'piano' : 'macro'
}

/**
 * Quello che viaggia: la dieta del PT pulita da quello che è solo suo (la
 * scelta di seguirla, il periodo, quando l'ha creata). In modo 'macro' solo i
 * numeri: niente pasti, giornate tipo, schema.
 */
export function dietaPerIlViaggio(dieta, modo) {
  const d = normalizzaDieta(dieta)
  const numeri = (pi) => ({ kcal: conKcal(pi), proteine: pi.proteine, carbo: pi.carbo, grassi: pi.grassi, pasti: [] })
  const base = {
    nome: (d.nome || '').trim() || 'Dieta',
    obiettivo: d.obiettivo,
    note: d.note,
    allenamento: modo === 'macro' ? numeri(d.allenamento) : d.allenamento,
    riposo: modo === 'macro' ? numeri(d.riposo) : d.riposo,
  }
  return modo === 'macro' ? base : { ...base, giornate: d.giornate, schema: d.schema }
}

/** Una dieta di soli macro, scritta dal PT nel modulo (allenamento e riposo). */
export function dietaDaMacro({ nome, obiettivo, allenamento, riposo }) {
  const piano = (m) => ({
    kcal: 0,
    proteine: Number(m.proteine) || 0,
    carbo: Number(m.carbo) || 0,
    grassi: Number(m.grassi) || 0,
    pasti: [],
  })
  return normalizzaDieta(nuovaDieta({ nome, obiettivo, allenamento: piano(allenamento), riposo: piano(riposo) }))
}

/**
 * La dieta da salvare fra quelle dell'atleta. L'id è quello della proposta
 * (prefisso `pt-`): accettarla due volte, da due telefoni, non la duplica.
 * Parte da oggi, senza fine, e dice da dove viene.
 */
export function dietaDaProposta(proposta, nomePt = '') {
  return normalizzaDieta({
    ...nuovaDieta(),
    ...proposta.dati,
    id: 'pt-' + proposta.id,
    fonte: FONTE.ESTERNA,
    fonteNota: nomePt ? `${nomePt}, il tuo PT` : 'Il tuo PT',
    dataInizio: oggiISO(),
    dataFine: '',
    attivataIl: '',
    creataIl: new Date().toISOString(),
    daPt: { id: proposta.ptId, nome: nomePt, propostaId: proposta.id },
  })
}

/**
 * Le proposte partite da questa dieta del PT. La dieta si segna gli id
 * (`mandate`, scritti da components/DietaPerAtleta all'invio); quelle mandate
 * prima, che nessuna dieta reclama, si riconoscono dal nome.
 * @param {{nome?:string, mandate?:string[]}} dieta
 * @param {{id:string, nome:string}[]} proposte  tutte quelle mandate dal PT
 * @param {Set<string>} reclamate  gli id che una qualche dieta si è segnata
 */
export function mandateDi(dieta, proposte, reclamate) {
  const mie = new Set(dieta.mandate || [])
  const nome = (dieta.nome || '').trim()
  return proposte.filter((p) => mie.has(p.id) || (!reclamate.has(p.id) && nome && p.nome === nome))
}
