// ---------------------------------------------------------------------------
// I CIRCUITI: esercizi di fila con un modo loro di contare. Come la
// SUPERSERIE (lib/superserie) — i successivi hanno `insiemeAlPrecedente` —
// con le impostazioni sul primo:
//
//   circuito: { tipo: 'giri',    giri: 3, recuperoSec: 90 }
//   circuito: { tipo: 'emom',    ogniSec: 60, minuti: 12 }          // minuti null = finché ce la faccio
//   circuito: { tipo: 'tabata',  lavoroSec: 20, riposoSec: 10, giri: 8 }
//   circuito: { tipo: 'amrap',   minuti: 12 }
//   circuito: { tipo: 'fortime', giri: 3, capMinuti: 20 }          // capMinuti null = senza limite
//
// Le serie di ognuno si CALCOLANO (allineaCircuiti) ma si scrivono nello
// schema: recap, volume, storico ed esportazione le leggono come serie normali.
// In allenamento (WorkoutSession, components/CardCircuito) l'orologio si
// calcola dall'istante di partenza `inizio` (ms); a fine circuito l'allenamento
// svolto tiene i risultati: `intervalliFatti` (EMOM, Tabata), `giriFatti` e
// `ripExtra` (AMRAP), `giriFatti` e `tempoSec` (For time).
// Spec: docs/superpowers/specs/2026-11-03-circuiti-design.md
// ---------------------------------------------------------------------------
import { faseVuota, formattaSecondi, normalizzaSchema } from './schema.js'
import { blocchi } from './superserie.js'

export const OGNI_PROPOSTI = [30, 45, 60, 90, 120, 180]
export const MINUTI_MAX = 60
// I secondi di "Pronti… 3, 2, 1" fra ▶ e il via.
export const PRONTI_SEC = 5

// L'ordine del menu "+ Circuito".
export const TIPI_CIRCUITO = [
  { id: 'giri', nome: 'A giri' },
  { id: 'emom', nome: 'EMOM' },
  { id: 'tabata', nome: 'Tabata' },
  { id: 'amrap', nome: 'AMRAP' },
  { id: 'fortime', nome: 'For time' },
]

/** Il nome in testata: "A giri" nel menu, "Circuito" sul riquadro. */
export function nomeCircuito(tipo) {
  return tipo === 'giri' ? 'Circuito' : TIPI_CIRCUITO.find((t) => t.id === tipo)?.nome || 'Circuito'
}

export const CIRCUITO_INIZIALE = {
  giri: { tipo: 'giri', giri: 3, recuperoSec: 90 },
  emom: { tipo: 'emom', ogniSec: 60, minuti: 12 },
  tabata: { tipo: 'tabata', lavoroSec: 20, riposoSec: 10, giri: 8 },
  amrap: { tipo: 'amrap', minuti: 12 },
  fortime: { tipo: 'fortime', giri: 3, capMinuti: null },
}

/** Ha un orologio suo (tutti tranne A giri, che usa il recupero di sempre). */
export function conOrologio(c) {
  return !!c && c.tipo !== 'giri'
}

/** Il campo di prima (`emom`, 150ª) col nome nuovo. Senza, lo stesso oggetto. */
export function circuitoDaEmom(e) {
  if (!e?.emom) return e
  const { emom, ...resto } = e
  const { minutiFatti, ...c } = emom
  const fatti = minutiFatti != null ? { intervalliFatti: minutiFatti } : {}
  return { ...resto, circuito: { tipo: 'emom', ...c, ...fatti } }
}

/** Quanti intervalli (EMOM: il pezzo di minuto che avanza non si fa; Tabata: i giri). null = a oltranza / non conta. */
export function intervalli(c) {
  if (c?.tipo === 'tabata') return c.giri
  if (c?.tipo !== 'emom' || c.minuti == null) return null
  return Math.max(1, Math.floor((c.minuti * 60) / c.ogniSec))
}

/** Le serie dell'esercizio k (da 0) su n. null = nascono in allenamento (AMRAP, EMOM a oltranza). */
export function serieCircuito(c, n, k) {
  if (c.tipo === 'giri' || c.tipo === 'fortime') return c.giri
  const tot = intervalli(c)
  return tot == null ? null : Math.max(0, Math.ceil((tot - k) / n))
}

/** All'intervallo m (da 0) tocca l'esercizio k del blocco, alla sua serie j. */
export function esercizioDelMinuto(n, m) {
  return { k: m % n, j: Math.floor(m / n) }
}

/**
 * Dov'è l'orologio. `fase`: 'pronti' (i primi PRONTI_SEC), 'lavoro' (EMOM,
 * Tabata), 'riposo' (Tabata), 'corre' (AMRAP, For time), 'fine'. `numero`: i
 * secondi da mostrare — alla rovescia, o in avanti nel For time. `intervallo`:
 * quello in corso (da 0) per EMOM e Tabata, null per gli altri.
 */
export function statoOrologio(c, inizio, adesso) {
  const t = (adesso - inizio) / 1000 - PRONTI_SEC
  if (t < 0) return { fase: 'pronti', numero: Math.ceil(-t), intervallo: 0, finito: false }
  if (c.tipo === 'emom') {
    const m = Math.floor(t / c.ogniSec)
    const tot = intervalli(c)
    if (tot != null && m >= tot) return { fase: 'fine', numero: 0, intervallo: tot, finito: true }
    return { fase: 'lavoro', numero: Math.ceil(c.ogniSec * (m + 1) - t), intervallo: m, finito: false }
  }
  if (c.tipo === 'tabata') {
    const ciclo = c.lavoroSec + c.riposoSec
    const m = Math.floor(t / ciclo)
    if (m >= c.giri) return { fase: 'fine', numero: 0, intervallo: c.giri, finito: true }
    const r = t - m * ciclo
    return r < c.lavoroSec
      ? { fase: 'lavoro', numero: Math.ceil(c.lavoroSec - r), intervallo: m, finito: false }
      : { fase: 'riposo', numero: Math.ceil(ciclo - r), intervallo: m, finito: false }
  }
  if (c.tipo === 'amrap') {
    const durata = c.minuti * 60
    if (t >= durata) return { fase: 'fine', numero: 0, intervallo: null, finito: true }
    return { fase: 'corre', numero: Math.ceil(durata - t), intervallo: null, finito: false }
  }
  // For time: in avanti; finisce col cap (i giri li chiude chi li segna).
  const cap = c.capMinuti != null ? c.capMinuti * 60 : null
  if (cap != null && t >= cap) return { fase: 'fine', numero: cap, intervallo: null, finito: true }
  return { fase: 'corre', numero: Math.floor(t), intervallo: null, finito: false }
}

/** Finito e coi suoi risultati (chi lo chiude: lib/session). */
export function circuitoChiuso(c) {
  return c.intervalliFatti != null || c.giriFatti != null
}

/** La testata: "EMOM 12' · ogni 1'", "AMRAP 12' · 7 giri + 5"… */
export function testoCircuito(c) {
  const s = formattaSecondi
  if (c.tipo === 'giri') {
    return [`Circuito · ${c.giri} giri`, c.recuperoSec ? `rec ${s(c.recuperoSec)}` : null].filter(Boolean).join(' · ')
  }
  if (c.tipo === 'emom') {
    const ogni = `ogni ${s(c.ogniSec)}`
    const tot = intervalli(c)
    const fatti = c.intervalliFatti
    if (fatti != null && (tot == null || fatti < tot)) {
      return `EMOM · ${ogni} · ${c.ogniSec === 60 ? `fino al ${fatti}° minuto` : `${fatti} intervalli`}`
    }
    return tot == null ? `EMOM · ${ogni} · finché ce la faccio` : `EMOM ${c.minuti}' · ${ogni}`
  }
  if (c.tipo === 'tabata') {
    const base = `Tabata ${s(c.lavoroSec)}/${s(c.riposoSec)} × ${c.giri}`
    return c.intervalliFatti != null && c.intervalliFatti < c.giri ? `${base} · fino al ${c.intervalliFatti}° giro` : base
  }
  if (c.tipo === 'amrap') {
    if (c.giriFatti == null) return `AMRAP ${c.minuti}'`
    return `AMRAP ${c.minuti}' · ${c.giriFatti} giri${c.ripExtra ? ` + ${c.ripExtra}` : ''}`
  }
  const cap = c.capMinuti != null ? `cap ${c.capMinuti}'` : null
  if (c.giriFatti == null) return [`For time · ${c.giri} giri`, cap].filter(Boolean).join(' · ')
  if (c.giriFatti >= c.giri) return `For time · ${c.giri} giri · ${s(c.tempoSec)}`
  return [`For time · ${c.giriFatti} giri su ${c.giri}`, cap].filter(Boolean).join(' · ')
}

/** Il turno dell'esercizio k su n: "1° di 2" (da solo null). */
export function turnoCircuito(n, k) {
  return n > 1 ? `${k + 1}° di ${n}` : null
}

/**
 * Gli esercizi di una SCHEDA con ogni circuito in ordine: `circuito` solo sul
 * primo (preso da chiunque del blocco ce l'abbia), le serie calcolate, una
 * fase sola, niente settimane diverse; il recupero c'è solo in A giri,
 * sull'ultimo (è quello di fine giro); nel Tabata le reps vuote sono "max".
 * Chi non è in un circuito resta lo stesso oggetto. Si lancia dopo ogni
 * modifica della lista e in normalizzaScheda.
 */
export function allineaCircuiti(esercizi) {
  const out = [...(esercizi || [])]
  for (const b of blocchi(out)) {
    const c = b.indici.map((i) => out[i].circuito).find(Boolean) || null
    const n = b.indici.length
    b.indici.forEach((i, k) => {
      let e = out[i]
      if (k > 0 && e.circuito) {
        const { circuito: _, ...resto } = e
        e = resto
      }
      if (c) {
        if (k === 0 && e.circuito !== c) e = { ...e, circuito: c }
        const serie = serieCircuito(c, n, k)
        const recuperoSec = c.tipo === 'giri' && k === n - 1 ? (c.recuperoSec ?? null) : null
        const s = normalizzaSchema(e.schemaBase)
        const f = s.fasi[0] || faseVuota()
        const rip = c.tipo === 'tabata' && f.rip == null ? 'max' : f.rip
        const cambia = s.fasi.length !== 1 || f.serie !== serie || f.rip !== rip
          || s.recuperoSec !== recuperoSec || e.variaPerSettimana
        if (cambia) {
          e = { ...e, variaPerSettimana: false, schemaBase: { ...s, fasi: [{ ...f, serie, rip }], recuperoSec } }
        }
      }
      out[i] = e
    })
  }
  return out
}

/** Il circuito dell'esercizio i: le impostazioni, quanti sono (n), lui chi è (k), il blocco. */
export function posizioneCircuito(esercizi, i) {
  const blocco = blocchi(esercizi).find((b) => b.indici.includes(i))
  const circuito = blocco && esercizi[blocco.inizio]?.circuito
  return circuito ? { circuito, n: blocco.indici.length, k: blocco.indici.indexOf(i), blocco } : null
}

/** "Sciogli": il blocco dell'esercizio `id` torna esercizi normali, slegati. */
export function sciogliCircuito(esercizi, id) {
  const i = esercizi.findIndex((e) => e.id === id)
  const blocco = blocchi(esercizi).find((b) => b.indici.includes(i))
  if (!blocco) return esercizi
  return esercizi.map((e, k) => {
    if (!blocco.indici.includes(k)) return e
    const { circuito: _, ...resto } = e
    return { ...resto, insiemeAlPrecedente: false }
  })
}

/**
 * Cosa mostra la card del blocco in allenamento: `scelto` (un pallino o un
 * esercizio toccato), se no — EMOM e Tabata, orologio in corso — chi tocca
 * nell'intervallo (nel riposo del Tabata chi l'ha appena fatto, da valutare);
 * altrimenti il primo esercizio alla sua prima serie non data.
 */
export function vistaCircuito(esercizi, blocco, scelto, adesso = Date.now()) {
  if (scelto) return scelto
  const c = esercizi[blocco.inizio].circuito
  if ((c.tipo === 'emom' || c.tipo === 'tabata') && c.inizio != null && !circuitoChiuso(c)) {
    const s = statoOrologio(c, c.inizio, adesso)
    if (s.fase === 'lavoro' || s.fase === 'riposo') {
      const { k, j } = esercizioDelMinuto(blocco.indici.length, s.intervallo)
      return { i: blocco.indici[k], j }
    }
  }
  const i = blocco.indici[0]
  const j = esercizi[i].sets.findIndex((x) => !x.colore)
  return { i, j: j === -1 ? 0 : j }
}
