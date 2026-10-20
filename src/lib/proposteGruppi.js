// ---------------------------------------------------------------------------
// I gruppi rivisti della libreria (2026-10-19: sottogruppi, dip petto E
// tricipiti, stacchi gambe/schiena/glutei, scrollate in schiena...) PROPOSTI a
// chi ha già schede e allenamenti salvati.
//
// Non si applicano da soli: un esercizio salvato resta com'è finché chi l'ha
// salvato non dice di sì (components/AvvisoSottogruppi). Qui il conto di cosa
// cambierebbe, per mostrarlo prima, e l'applicazione su una scheda.
// La regola su QUALI esercizi e con quali gruppi sta in lib/eserciziLibreria
// (gruppiProposti).
// ---------------------------------------------------------------------------

import { gruppiProposti, gruppiScritti, normalizzaNome, patchMuscoli } from './eserciziLibreria'

/**
 * Cosa cambierebbe nelle schede: una riga per esercizio e gruppi di adesso,
 * con quante volte compare nelle schede (`inScheda`) e negli allenamenti già
 * fatti (`fatti`). [] se non c'è niente da proporre.
 * @returns {{nome:string, prima:string[], dopo:string[], inScheda:number, fatti:number}[]}
 */
export function proposteGruppi(schede = []) {
  const righe = new Map()
  const conta = (e, dove) => {
    const p = gruppiProposti(e)
    if (!p) return
    const prima = gruppiScritti(e)
    const k = `${normalizzaNome(e.nome)}|${prima.join(',')}`
    const r = righe.get(k) || { nome: e.nome, prima, dopo: p.gruppi, inScheda: 0, fatti: 0 }
    r[dove] += 1
    righe.set(k, r)
  }
  for (const s of schede) {
    for (const g of s.giorni || []) for (const e of g.esercizi || []) conta(e, 'inScheda')
    for (const c of s.completamenti || []) for (const e of c.esercizi || []) conta(e, 'fatti')
  }
  return [...righe.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
}

// Coi gruppi nuovi anche i loro sottogruppi: un esercizio che li ha già
// scritti (conMuscoliScritti, dal salvataggio dell'editor) tiene i suoi e
// prende quelli della libreria per i gruppi appena arrivati (patchMuscoli).
const conProposti = (e) => {
  const p = gruppiProposti(e)
  if (!p) return e
  return Array.isArray(e.sottogruppi) ? { ...e, ...patchMuscoli(e, p.gruppi) } : { ...e, ...p }
}

/**
 * La scheda coi gruppi proposti applicati, negli esercizi dei giorni e in
 * quelli degli allenamenti già fatti. La STESSA scheda se non cambia niente:
 * così chi la salva sa che non c'è niente da salvare.
 */
export function conGruppiProposti(scheda) {
  let cambiata = false
  const tocca = (lista) =>
    (lista || []).map((e) => {
      const n = conProposti(e)
      if (n !== e) cambiata = true
      return n
    })
  const giorni = (scheda.giorni || []).map((g) => ({ ...g, esercizi: tocca(g.esercizi) }))
  const completamenti = (scheda.completamenti || []).map((c) =>
    Array.isArray(c.esercizi) ? { ...c, esercizi: tocca(c.esercizi) } : c,
  )
  return cambiata ? { ...scheda, giorni, completamenti } : scheda
}
