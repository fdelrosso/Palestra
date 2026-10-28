// ---------------------------------------------------------------------------
// Gli orari di un appuntamento atleta–PT (2026-10-28, lib/appuntamenti): i
// conti, senza import, così si provano da Node (tests/appuntamenti.test.js).
// Un orario è { giorno: 'AAAA-MM-GG', ora: 'HH:MM' }, nell'ora di chi guarda.
// ---------------------------------------------------------------------------

export const MAX_ORARI = 10

export const chiaveOrario = (o) => `${o.giorno} ${o.ora}`

/** Ha giorno e ora scritti bene, ed è da adesso in poi. */
export function orarioValido(o, adesso = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o?.giorno || '') || !/^[0-2]\d:[0-5]\d$/.test(o?.ora || '')) return false
  const [a, m, g] = o.giorno.split('-').map(Number)
  const [h, min] = o.ora.split(':').map(Number)
  return new Date(a, m - 1, g, h, min) > adesso
}

/** Dal più vicino. */
export function ordinaOrari(orari) {
  return [...orari].sort((x, y) => chiaveOrario(x).localeCompare(chiaveOrario(y)))
}

/**
 * Cosa non va negli orari scritti, in parole ('' = vanno bene).
 * `rifiutati`: le chiavi già rifiutate in questa trattativa, che non si
 * possono riproporre; `impegni`: i propri, che occupano la fascia (vedi giù).
 */
export function problemaOrari(orari, rifiutati = new Set(), adesso = new Date(), impegni = []) {
  if (!orari.length) return 'Metti almeno un giorno con l’orario.'
  if (orari.length > MAX_ORARI) return `Al massimo ${MAX_ORARI} orari per volta.`
  if (orari.some((o) => !orarioValido(o, adesso))) return 'Ogni orario va messo con giorno e ora, da adesso in poi.'
  const chiavi = orari.map(chiaveOrario)
  if (new Set(chiavi).size !== chiavi.length) return 'C’è lo stesso orario due volte.'
  if (chiavi.some((k) => rifiutati.has(k))) return 'Uno di questi orari è già stato rifiutato: scegline un altro.'
  if (orari.some((o) => orarioImpegnato(o, impegni))) return 'Uno di questi orari è già impegnato: scegline un altro.'
  return ''
}

/** "Mar 3 novembre, 18:00". */
export function orarioInParole(o) {
  const [a, m, g] = o.giorno.split('-').map(Number)
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(a, m - 1, g))
  return `${s.charAt(0).toUpperCase() + s.slice(1)}, ${o.ora}`
}

// ---------------------------------------------------------------------------
// Le fasce già impegnate (2026-10-28): un appuntamento dura un'ora, e una
// fascia è occupata se c'è un impegno a meno di un'ora da lì — in qualunque
// ruolo: appuntamenti fissati da PT o da atleta, voci con l'orario
// dell'agenda del PT. Lo ricontrolla il database quando si fissa
// (`accetta_orario`, migrazione 20261028200000).
// ---------------------------------------------------------------------------

/** Le ore che si scelgono: ogni mezz'ora, dalle 6 alle 22:30. */
export const FASCE = Array.from({ length: 34 }, (_, i) => {
  const min = 6 * 60 + i * 30
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${min % 60 ? '30' : '00'}`
})

const minuti = (o) => {
  const [a, m, g] = o.giorno.split('-').map(Number)
  const [h, mi] = o.ora.split(':').map(Number)
  return Date.UTC(a, m - 1, g, h, mi) / 60000
}

/**
 * L'impegno che occupa questo orario, o null. `impegni`: [{ giorno, ora,
 * titolo? }], quelli senza ora ("tutto il giorno") non bloccano.
 */
export function orarioImpegnato(orario, impegni) {
  if (!orario?.giorno || !orario?.ora) return null
  const t = minuti(orario)
  return (impegni || []).find((x) => x.giorno && x.ora && Math.abs(minuti(x) - t) < 60) || null
}

/** La prima fascia libera di quel giorno (da `da` in poi), o ''. */
export function primaFasciaLibera(giorno, impegni, da = '18:00') {
  const ordine = [...FASCE.filter((f) => f >= da), ...FASCE.filter((f) => f < da)]
  return ordine.find((ora) => !orarioImpegnato({ giorno, ora }, impegni)) || ''
}
