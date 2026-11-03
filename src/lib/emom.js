// src/lib/emom.js
// ---------------------------------------------------------------------------
// L'EMOM ("every minute on the minute"): a ogni intervallo si parte con una
// serie, e quello che resta dell'intervallo è il recupero. È una SUPERSERIE
// (lib/superserie) con le impostazioni sul primo esercizio:
//
//   Esercizio.emom = { ogniSec: 60, minuti: 12 }   // minuti null = a oltranza
//
// Più esercizi si alternano un intervallo per uno (A, B, A, B…): è l'ordine
// del giro. Le serie di ognuno si CALCOLANO (allineaEmom) ma si scrivono nello
// schema: recap, volume, storico ed esportazione le leggono come serie normali.
// Spec: docs/superpowers/specs/2026-11-03-emom-design.md
// ---------------------------------------------------------------------------
import { faseVuota, formattaSecondi, normalizzaSchema } from './schema.js'
import { blocchi } from './superserie.js'

export const OGNI_PROPOSTI = [30, 45, 60, 90, 120, 180]
export const MINUTI_MAX = 60
// I secondi di "Pronti… 3, 2, 1" fra "Avvia EMOM" e il primo intervallo.
export const PRONTI_SEC = 10

/** Quanti intervalli: il pezzo di minuto che avanza non si fa. null = a oltranza. */
export function intervalli(emom) {
  if (!emom || emom.minuti == null) return null
  return Math.max(1, Math.floor((emom.minuti * 60) / emom.ogniSec))
}

/** Le serie dell'esercizio k (da 0) su n: i primi prendono l'intervallo in più. */
export function serieEmom(emom, n, k) {
  const tot = intervalli(emom)
  return tot == null ? null : Math.max(0, Math.ceil((tot - k) / n))
}

/**
 * Il turno dell'esercizio k su n nel giro: "1° di 2". Da solo non ha turno
 * (null). Non si contano i minuti: con "ogni 2'" il quarto intervallo non è
 * il quarto minuto, e l'elenco intero (1·3·5·7…) era lungo comunque.
 */
export function turnoEmom(n, k) {
  return n > 1 ? `${k + 1}° di ${n}` : null
}

/** All'intervallo m (da 0) tocca l'esercizio k del blocco, alla sua serie j. */
export function esercizioDelMinuto(n, m) {
  return { k: m % n, j: Math.floor(m / n) }
}

/**
 * Dov'è l'orologio, calcolato dall'istante di partenza (`inizio`, ms): regge
 * il telefono in tasca e "Esci" → "Riprendi". `pronti` = secondi del conto
 * alla rovescia iniziale (0 quando si è partiti), `minuto` = l'intervallo in
 * corso (da 0), `restanteSec` = quanto gli resta.
 */
export function statoOrologio(inizio, emom, adesso) {
  const t = (adesso - inizio) / 1000 - PRONTI_SEC
  if (t < 0) return { pronti: Math.ceil(-t), minuto: 0, restanteSec: emom.ogniSec, finito: false }
  const minuto = Math.floor(t / emom.ogniSec)
  const tot = intervalli(emom)
  if (tot != null && minuto >= tot) return { pronti: 0, minuto: tot, restanteSec: 0, finito: true }
  return { pronti: 0, minuto, restanteSec: Math.ceil(emom.ogniSec * (minuto + 1) - t), finito: false }
}

/** "EMOM 12' · ogni 1'"; a oltranza, o fermato prima, fin dove si è arrivati. */
export function testoEmom(emom) {
  const ogni = `ogni ${formattaSecondi(emom.ogniSec)}`
  const tot = intervalli(emom)
  const fatti = emom.minutiFatti
  if (fatti != null && (tot == null || fatti < tot)) {
    return `EMOM · ${ogni} · ${emom.ogniSec === 60 ? `fino al ${fatti}° minuto` : `${fatti} intervalli`}`
  }
  return tot == null ? `EMOM · ${ogni} · finché ce la faccio` : `EMOM ${emom.minuti}' · ${ogni}`
}

/**
 * Gli esercizi di una SCHEDA con ogni blocco EMOM in ordine: `emom` solo sul
 * primo (preso da chiunque del blocco ce l'abbia), le serie calcolate, una
 * fase sola, niente recupero né settimane diverse. Chi non è in un EMOM
 * resta lo stesso oggetto. Si lancia dopo ogni modifica della lista e in
 * normalizzaScheda: una serie fuori conto non resta mai.
 */
export function allineaEmom(esercizi) {
  const out = [...(esercizi || [])]
  for (const b of blocchi(out)) {
    const emom = b.indici.map((i) => out[i].emom).find(Boolean) || null
    b.indici.forEach((i, k) => {
      let e = out[i]
      if (k > 0 && e.emom) {
        const { emom: _, ...resto } = e
        e = resto
      }
      if (emom) {
        if (k === 0 && e.emom !== emom) e = { ...e, emom }
        const serie = serieEmom(emom, b.indici.length, k)
        const s = normalizzaSchema(e.schemaBase)
        const f = s.fasi[0] || faseVuota()
        if (s.fasi.length !== 1 || f.serie !== serie || s.recuperoSec != null || e.variaPerSettimana) {
          e = { ...e, variaPerSettimana: false, schemaBase: { ...s, fasi: [{ ...f, serie }], recuperoSec: null } }
        }
      }
      out[i] = e
    })
  }
  return out
}

/** L'EMOM dell'esercizio i: le impostazioni, quanti sono (n) e lui chi è (k). */
export function posizioneEmom(esercizi, i) {
  const blocco = blocchi(esercizi).find((b) => b.indici.includes(i))
  const emom = blocco && esercizi[blocco.inizio]?.emom
  return emom ? { emom, n: blocco.indici.length, k: blocco.indici.indexOf(i), blocco } : null
}

/** "Sciogli": il blocco dell'esercizio `id` torna esercizi normali, slegati. */
export function sciogliEmom(esercizi, id) {
  const i = esercizi.findIndex((e) => e.id === id)
  const blocco = blocchi(esercizi).find((b) => b.indici.includes(i))
  if (!blocco) return esercizi
  return esercizi.map((e, k) => {
    if (!blocco.indici.includes(k)) return e
    const { emom: _, ...resto } = e
    return { ...resto, insiemeAlPrecedente: false }
  })
}

/**
 * Cosa mostra la card del blocco: `scelto` (un pallino o un esercizio toccato),
 * se no chi tocca nell'intervallo in corso; prima di partire e a EMOM finito
 * il primo esercizio, alla sua prima serie non data.
 */
export function vistaEmom(esercizi, blocco, scelto, adesso = Date.now()) {
  if (scelto) return scelto
  const emom = esercizi[blocco.inizio].emom
  if (emom.inizio != null && emom.minutiFatti == null) {
    const s = statoOrologio(emom.inizio, emom, adesso)
    if (!s.pronti && !s.finito) {
      const { k, j } = esercizioDelMinuto(blocco.indici.length, s.minuto)
      return { i: blocco.indici[k], j }
    }
  }
  const i = blocco.indici[0]
  const j = esercizi[i].sets.findIndex((x) => !x.colore)
  return { i, j: j === -1 ? 0 : j }
}
