// ---------------------------------------------------------------------------
// Le FASI di un esercizio: "Military press 3×5 poi 2×2", cioè serie,
// ripetizioni e carico che cambiano dentro lo stesso esercizio.
//
// ⚠️ NON C'È UN CAMPO NUOVO. Le fasi stanno nei campi di sempre, scritti
// serie per serie col "/" — la notazione che l'app capiva già ("15/12/10" di
// ripetizioni, "60/70/80" di carico, vedi lib/recap):
//
//   3×5 a 80kg poi 2×2 a 90kg  →  serie "5"
//                                ripetizioni "5/5/5/2/2"
//                                carico "80kg/80kg/80kg/90kg/90kg"
//
// e si ricavano rileggendoli: serie di fila con le stesse ripetizioni e lo
// stesso carico sono una fase. Così il volume del recap è già giusto, l'export
// in Excel scrive quello che c'è, e un telefono con l'app vecchia vede un
// esercizio da 5 serie con le ripetizioni una per una — non un dato rotto.
//
// Un campo uguale per tutte le serie resta scritto una volta sola ("80kg",
// non "80kg/80kg/80kg/80kg/80kg"): è quello che si legge ovunque non si passi
// da qui.
//
// ⚠️ Fasi vere solo se almeno una ha più di una serie. "3 × 12/10/8" è una
// piramide, e resta scritta com'era: spezzarla in "1×12 + 1×10 + 1×8" non
// direbbe niente di più e si leggerebbe peggio.
// ---------------------------------------------------------------------------

import { numeroSet } from './session.js'

const MAX_SERIE = 30

// Il pezzo `j` di un valore scritto serie per serie (oltre l'ultimo vale
// l'ultimo, come in lib/recap). Senza "/" è lo stesso per tutte.
function pezzo(testo, j) {
  const t = String(testo ?? '').trim()
  if (!t.includes('/')) return t
  const p = t.split('/').map((x) => x.trim())
  return p[Math.min(j, p.length - 1)]
}

/**
 * Il valore di ciascuna delle `n` serie, o null se il campo non si lascia
 * leggere serie per serie. "15/12" su 4 serie non dice come si dividono, e
 * qui non si indovina.
 * @returns {string[]|null}
 */
export function perSerie(testo, n) {
  const t = String(testo ?? '').trim()
  if (!t.includes('/')) return Array(n).fill(t)
  const p = t.split('/').map((x) => x.trim())
  return p.length === n ? p : null
}

/** Quante serie ha una fase: la cifra scritta, 0 se non c'è ancora. */
export function serieDellaFase(fase) {
  const m = String(fase?.serie ?? '').match(/\d+/)
  return m ? Math.min(MAX_SERIE, parseInt(m[0], 10)) : 0
}

/**
 * Le fasi di uno schema. Una sola (i campi così come sono) se non ce ne sono
 * di diverse.
 * @param {{serie?:string, ripetizioni?:string, carico?:string}} schema
 * @returns {{serie:string, ripetizioni:string, carico:string}[]}
 */
export function fasiDi(schema) {
  const s = schema || {}
  const unica = [{ serie: s.serie || '', ripetizioni: s.ripetizioni || '', carico: s.carico || '' }]
  const n = numeroSet(s)
  if (n < 2) return unica
  const rip = perSerie(s.ripetizioni, n)
  const car = perSerie(s.carico, n)
  if (!rip || !car) return unica
  const gruppi = []
  for (let j = 0; j < n; j++) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.ripetizioni === rip[j] && ultimo.carico === car[j]) ultimo.n += 1
    else gruppi.push({ n: 1, ripetizioni: rip[j], carico: car[j] })
  }
  if (gruppi.length < 2 || !gruppi.some((g) => g.n > 1)) return unica
  return gruppi.map((g) => ({ serie: String(g.n), ripetizioni: g.ripetizioni, carico: g.carico }))
}

/** Lo schema ha più fasi (3×5 poi 2×2)? */
export function haFasi(schema) {
  return fasiDi(schema).length > 1
}

/**
 * Il contrario di fasiDi: i tre campi da scrivere nello schema.
 * Una fase sola passa così com'è (anche "4 giri" o "12/10/8"). Una fase con
 * dentro una piramide ("12/10/8" su 3 serie) si srotola serie per serie.
 * ⚠️ Una fase senza serie scritte non conta: è quella appena aggiunta
 * nell'editor, che non si è ancora finito di riempire.
 * @returns {{serie:string, ripetizioni:string, carico:string}}
 */
export function schemaDaFasi(fasi) {
  const piene = (fasi || []).filter((f) => serieDellaFase(f) > 0)
  if (piene.length <= 1) {
    const f = piene[0] || fasi?.[0] || {}
    return { serie: f.serie || '', ripetizioni: f.ripetizioni || '', carico: f.carico || '' }
  }
  const rip = []
  const car = []
  for (const f of piene) {
    for (let j = 0; j < serieDellaFase(f); j++) {
      rip.push(pezzo(f.ripetizioni, j))
      car.push(pezzo(f.carico, j))
    }
  }
  const compatta = (v) => (v.every((x) => x === v[0]) ? v[0] : v.join('/'))
  return { serie: String(rip.length), ripetizioni: compatta(rip), carico: compatta(car) }
}

/** In quale fase cade la serie `j` (0-based). 0 se la fase è una sola. */
export function faseDiSerie(schema, j) {
  const fasi = fasiDi(schema)
  let fine = 0
  for (let k = 0; k < fasi.length; k++) {
    fine += serieDellaFase(fasi[k])
    if (j < fine) return k
  }
  return fasi.length - 1
}

/** Ripetizioni e carico della serie `j`, come sono scritti. */
export function obiettivoSerie(schema, j) {
  return { ripetizioni: pezzo(schema?.ripetizioni, j), carico: pezzo(schema?.carico, j) }
}

/**
 * I campi da scrivere per cambiare il carico di UNA fase (il peso cambiato in
 * allenamento sulla serie 4 di "3×5 poi 2×2" è quello del 2×2). Con una fase
 * sola è il carico e basta, come sempre.
 */
export function conCaricoFase(schema, k, carico) {
  const fasi = fasiDi(schema)
  if (fasi.length < 2) return { carico }
  return schemaDaFasi(fasi.map((f, i) => (i === k ? { ...f, carico } : f)))
}

/** Il carico di una fase ("" se non c'è o se la fase non esiste). */
export function caricoDellaFase(schema, k) {
  const fasi = fasiDi(schema)
  if (fasi.length < 2) return schema?.carico || ''
  return fasi[k]?.carico || ''
}

/**
 * Una voce dello storico (lib/carico) ristretta a una fase: il carico di quella
 * fase e i colori delle SUE serie. È ciò che serve al consiglio sul peso: se il
 * 3×5 è andato liscio e il 2×2 no, i due pesi vanno consigliati ognuno per sé.
 * Una voce di quando l'esercizio aveva una fase sola resta com'è.
 */
export function vocePerFase(voce, k) {
  const schema = { serie: voce.serie, ripetizioni: voce.ripetizioni, carico: voce.carico }
  const fasi = fasiDi(schema)
  if (fasi.length < 2 || !Array.isArray(voce.colori)) return voce
  const f = fasi[Math.min(k, fasi.length - 1)]
  let inizio = 0
  for (let i = 0; i < Math.min(k, fasi.length - 1); i++) inizio += serieDellaFase(fasi[i])
  const colori = voce.colori.slice(inizio, inizio + serieDellaFase(f))
  const conta = (c) => colori.filter((x) => x === c).length
  const verde = conta('verde')
  const giallo = conta('giallo')
  const rosso = conta('rosso')
  return {
    ...voce,
    serie: f.serie,
    ripetizioni: f.ripetizioni,
    carico: f.carico,
    colori,
    verde,
    giallo,
    rosso,
    tot: verde + giallo + rosso,
  }
}
