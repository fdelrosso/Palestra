import { gruppiEsercizio, normalizzaNome, patchGruppi, sottogruppiEsercizio } from './eserciziLibreria'
import { SOTTOGRUPPI } from './muscoli'

// ---------------------------------------------------------------------------
// I muscoli INDOVINATI degli esercizi già salvati (2026-10-20).
//
// Dal 2026-10-20 i muscoli di un esercizio si scrivono quando si salva la
// scheda (conMuscoliScritti): i disegni del corpo colorano quelli. Gli
// esercizi salvati prima, di gambe, spalle o schiena, non dicono quali
// muscoli: il corpo li indovina dal nome ogni volta, e con un nome che non
// conosce ("Leg ext", "Macchina di Marco") accende il gruppo intero.
//
// L'avviso dei muscoli (components/AvvisoMuscoli) li fa scegliere UNA volta
// per nome e gruppi: la scelta va a tutti gli esercizi uguali, nelle schede e
// negli allenamenti già fatti.
// ---------------------------------------------------------------------------

const CON_SOTTO = new Set(SOTTOGRUPPI.map((s) => s.gruppo))

/** Un esercizio coi muscoli da scegliere: un gruppo che si divide, e niente scritto. */
export function muscoliIndovinati(e) {
  if (!e?.nome || Array.isArray(e.sottogruppi)) return false
  return gruppiEsercizio(e).some((g) => CON_SOTTO.has(g))
}

/** La chiave di un esercizio per l'avviso: nome e gruppi. */
export const chiaveMuscoli = (e) => `${normalizzaNome(e.nome)}|${gruppiEsercizio(e).join(',')}`

/**
 * Gli esercizi da completare, uno per nome e gruppi, prima quelli che dal
 * nome non si sanno (il corpo accende il gruppo intero), poi in ordine di nome.
 * @returns {{chiave:string, nome:string, gruppi:string[], ipotesi:string[], inScheda:number, fatti:number}[]}
 */
export function muscoliDaCompletare(schede = []) {
  const righe = new Map()
  const conta = (e, dove) => {
    if (!muscoliIndovinati(e)) return
    const chiave = chiaveMuscoli(e)
    const r = righe.get(chiave) || {
      chiave,
      nome: e.nome,
      gruppi: gruppiEsercizio(e),
      ipotesi: sottogruppiEsercizio(e),
      inScheda: 0,
      fatti: 0,
    }
    r[dove] += 1
    righe.set(chiave, r)
  }
  for (const s of schede) {
    for (const g of s.giorni || []) for (const e of g.esercizi || []) conta(e, 'inScheda')
    for (const c of s.completamenti || []) for (const e of c.esercizi || []) conta(e, 'fatti')
  }
  return [...righe.values()].sort(
    (a, b) => (a.ipotesi.length > 0) - (b.ipotesi.length > 0) || a.nome.localeCompare(b.nome, 'it'),
  )
}

/** Almeno un gruppo, e per ogni gruppo che si divide almeno un muscolo? */
export function sceltaCompleta({ gruppi, sottogruppi }) {
  if (!gruppi.length) return false
  return gruppi
    .filter((g) => CON_SOTTO.has(g))
    .every((g) => sottogruppi.some((s) => SOTTOGRUPPI.find((x) => x.id === s)?.gruppo === g))
}

/**
 * La scheda con le scelte applicate (`scelte`: chiave → {gruppi, sottogruppi}),
 * negli esercizi dei giorni e degli allenamenti fatti. La STESSA scheda se
 * non cambia niente.
 */
export function conMuscoliCompletati(scheda, scelte) {
  let cambiata = false
  const tocca = (lista) =>
    (lista || []).map((e) => {
      if (!muscoliIndovinati(e)) return e
      const s = scelte.get(chiaveMuscoli(e))
      if (!s) return e
      cambiata = true
      return { ...e, ...patchGruppi(s.gruppi), sottogruppi: s.sottogruppi }
    })
  const giorni = (scheda.giorni || []).map((g) => ({ ...g, esercizi: tocca(g.esercizi) }))
  const completamenti = (scheda.completamenti || []).map((c) =>
    Array.isArray(c.esercizi) ? { ...c, esercizi: tocca(c.esercizi) } : c,
  )
  return cambiata ? { ...scheda, giorni, completamenti } : scheda
}
