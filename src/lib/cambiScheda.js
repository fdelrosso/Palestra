// ---------------------------------------------------------------------------
// Il PT e la scheda di un suo atleta, dopo l'invio (2026-10-28): cosa è
// cambiato quando la modifica (la notifica all'atleta) e come sta andando
// l'atleta su quella scheda (la pagina della scheda in Atleti). Senza
// dipendenze dal browser: si prova da Node (tests/cambiScheda.test.js).
// ---------------------------------------------------------------------------

import { formatSerieRip, schemiUguali } from './schema.js'

const MAX_CAMBI = 8

const nomeDi = (x, riserva) => (x?.nome || '').trim() || riserva

// Lo schema di un esercizio "uguale per tutte le settimane" in parole, o ''.
const schemaInParole = (e) => (e?.variaPerSettimana ? 'varia per settimana' : formatSerieRip(e?.schemaBase) || '')

/**
 * Le differenze fra due versioni della scheda, in frasi brevi da notifica:
 * nome, settimane, giorni aggiunti e tolti, esercizi aggiunti, tolti o con
 * serie/ripetizioni diverse. Al massimo MAX_CAMBI, poi "e altro".
 * @returns {string[]} vuoto = niente di cambiato
 */
export function cambiScheda(prima, dopo) {
  const cambi = []
  if (nomeDi(prima, '') !== nomeDi(dopo, '')) cambi.push(`Nome: «${nomeDi(dopo, 'senza nome')}»`)
  if (!!prima?.senzaFine !== !!dopo?.senzaFine) cambi.push(dopo?.senzaFine ? 'Ora è senza fine' : `Ora dura ${dopo.numeroSettimane} settimane`)
  else if (!dopo?.senzaFine && prima?.numeroSettimane !== dopo?.numeroSettimane)
    cambi.push(`Settimane: ${prima?.numeroSettimane} → ${dopo?.numeroSettimane}`)

  const giorniPrima = new Map((prima?.giorni || []).map((g) => [g.id, g]))
  const idDopo = new Set((dopo?.giorni || []).map((g) => g.id))
  for (const g of prima?.giorni || []) if (!idDopo.has(g.id)) cambi.push(`Tolto il giorno «${nomeDi(g, 'Giorno')}»`)

  for (const g of dopo?.giorni || []) {
    const gp = giorniPrima.get(g.id)
    const dove = nomeDi(g, 'Giorno')
    if (!gp) {
      cambi.push(`Nuovo giorno «${dove}»`)
      continue
    }
    if (gp.tipo !== g.tipo) cambi.push(`«${dove}»: ${g.tipo === 'rest' ? 'ora è riposo' : 'ora è allenamento'}`)
    const eserciziPrima = new Map((gp.esercizi || []).map((e) => [e.id, e]))
    const idEDopo = new Set((g.esercizi || []).map((e) => e.id))
    for (const e of gp.esercizi || []) if (!idEDopo.has(e.id)) cambi.push(`${dove}: tolto ${nomeDi(e, 'un esercizio')}`)
    for (const e of g.esercizi || []) {
      const ep = eserciziPrima.get(e.id)
      if (!ep) {
        const s = schemaInParole(e)
        cambi.push(`${dove}: aggiunto ${nomeDi(e, 'un esercizio')}${s ? ` (${s})` : ''}`)
      } else if (nomeDi(ep, '') !== nomeDi(e, '')) {
        cambi.push(`${dove}: ${nomeDi(ep, 'un esercizio')} → ${nomeDi(e, 'un altro')}`)
      } else if (
        !!ep.variaPerSettimana !== !!e.variaPerSettimana ||
        (!e.variaPerSettimana && !schemiUguali(ep.schemaBase, e.schemaBase)) ||
        (e.variaPerSettimana && JSON.stringify(ep.settimane || []) !== JSON.stringify(e.settimane || []))
      ) {
        const da = schemaInParole(ep)
        const a = schemaInParole(e)
        cambi.push(`${dove}: ${nomeDi(e, 'un esercizio')} ${da && a && da !== a ? `${da} → ${a}` : 'con serie diverse'}`)
      }
    }
  }
  // Due giorni con lo stesso nome danno la stessa frase: una volta sola, col conto.
  const conte = new Map()
  for (const c of cambi) conte.set(c, (conte.get(c) || 0) + 1)
  const uniche = [...conte].map(([c, n]) => (n > 1 ? `${c} (×${n})` : c))
  return uniche.length > MAX_CAMBI ? [...uniche.slice(0, MAX_CAMBI), `e altre ${uniche.length - MAX_CAMBI} modifiche`] : uniche
}

// Il carico più alto di un esercizio in un allenamento: i kg delle serie
// chiuse (lib/carico, `sets[].kg`), null se non ne ha scritti.
function kgMassimo(e) {
  const kg = (e?.sets || []).filter((s) => s?.colore && s.kg > 0).map((s) => s.kg)
  return kg.length ? Math.max(...kg) : null
}

const chiave = (nome) => String(nome || '').trim().toLowerCase()

/**
 * Come sta andando l'atleta su una scheda: gli allenamenti fatti (quelli che
 * il PT può vedere) e, per ogni esercizio della scheda, quante volte, il
 * carico della prima e dell'ultima volta e il più alto.
 * @returns {{ volte:number, ultimo:string|null, esercizi:{nome:string, volte:number, primoKg:number|null, ultimoKg:number|null, maxKg:number|null}[] }}
 */
export function progressiSulla(scheda, allenamenti) {
  const fatti = (allenamenti || [])
    .filter((a) => a.schedaId === scheda.id && a.data)
    .sort((x, y) => String(x.data).localeCompare(String(y.data)))
  const perNome = new Map()
  for (const a of fatti) {
    for (const e of a.esercizi || []) {
      const k = chiave(e.nome)
      if (!k) continue
      const v = perNome.get(k) || { volte: 0, primoKg: null, ultimoKg: null, maxKg: null }
      const kg = kgMassimo(e)
      v.volte += 1
      if (kg != null) {
        if (v.primoKg == null) v.primoKg = kg
        v.ultimoKg = kg
        v.maxKg = Math.max(v.maxKg ?? 0, kg)
      }
      perNome.set(k, v)
    }
  }
  const visti = new Set()
  const esercizi = []
  for (const g of scheda.giorni || [])
    for (const e of g.esercizi || []) {
      const k = chiave(e.nome)
      if (!k || visti.has(k)) continue
      visti.add(k)
      esercizi.push({ nome: e.nome, ...(perNome.get(k) || { volte: 0, primoKg: null, ultimoKg: null, maxKg: null }) })
    }
  return { volte: fatti.length, ultimo: fatti.at(-1)?.data || null, esercizi }
}
