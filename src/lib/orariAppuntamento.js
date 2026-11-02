// ---------------------------------------------------------------------------
// Gli orari di un appuntamento atleta–PT (2026-10-28, lib/appuntamenti): i
// conti, senza import, così si provano da Node (tests/appuntamenti.test.js).
// Un orario è { giorno: 'AAAA-MM-GG', ora: 'HH:MM' }, nell'ora di chi guarda.
// Dal 2026-11-02 è una FASCIA: `ora` e `fine` la chiudono, `durata` (minuti) è
// quanto dura l'appuntamento, e chi accetta sceglie l'inizio lì dentro. Senza
// `fine` e `durata` (le righe di prima, un orario fissato) vale un'ora.
// ---------------------------------------------------------------------------

export const MAX_ORARI = 10

// Quanto può durare un appuntamento: si sceglie, se ci sta nella fascia.
export const DURATE = [30, 45, 60, 75, 90, 120, 180, 240]

const minutiOra = (ora) => {
  const [h, m] = ora.split(':').map(Number)
  return h * 60 + m
}
const oraDi = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** L'ora `n` minuti dopo. */
export const piuMinuti = (ora, n) => oraDi(minutiOra(ora) + n)

/** Dove finisce la fascia, e quanto dura l'appuntamento. Senza: un'ora. */
export const fineDi = (o) => o.fine || piuMinuti(o.ora, 60)
export const durataDi = (o) => o.durata || 60
export const ampiezza = (o) => minutiOra(fineDi(o)) - minutiOra(o.ora)
/** Un'ora dopo, senza passare le 23. */
export const fineVicina = (ora) => (ora >= '22:00' ? '23:00' : piuMinuti(ora, 60))

/** "1 ora e 30". */
export function durataInParole(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return `${h} ${h === 1 ? 'ora' : 'ore'}${m ? ` e ${m}` : ''}`
}

/** Si sceglie l'inizio? No se la fascia è lunga come l'appuntamento. */
export const conScelta = (o) => durataDi(o) < ampiezza(o)

export const chiaveOrario = (o) => `${o.giorno} ${o.ora}`

/** Ha giorno e ora scritti bene, ed è da adesso in poi. */
export function orarioValido(o, adesso = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o?.giorno || '') || !/^[0-2]\d:[0-5]\d$/.test(o?.ora || '')) return false
  const [a, m, g] = o.giorno.split('-').map(Number)
  const [h, min] = o.ora.split(':').map(Number)
  if (o.fine && !/^[0-2]\d:[0-5]\d$/.test(o.fine)) return false
  if (ampiezza(o) <= 0) return false
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
  if (orari.some((o) => durataDi(o) > ampiezza(o))) return 'La durata non ci sta nella fascia.'
  if (orari.some((o, i) => orari.some((x, j) => j > i && sovrapposti(o, x)))) return 'Due fasce si sovrappongono.'
  if (chiavi.some((k) => rifiutati.has(k))) return 'Uno di questi orari è già stato rifiutato: scegline un altro.'
  if (orari.some((o) => orarioImpegnato(o, impegni))) return 'Uno di questi orari è già impegnato: scegline un altro.'
  return ''
}

/** "Mar 3 novembre, 18:00". */
export function orarioInParole(o) {
  const [a, m, g] = o.giorno.split('-').map(Number)
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(a, m - 1, g))
  const orario = o.fine ? `${o.ora}–${o.fine}` : o.ora
  const durata = o.durata && conScelta(o) ? ` · ${durataInParole(o.durata)}` : ''
  return `${s.charAt(0).toUpperCase() + s.slice(1)}, ${orario}${durata}`
}

// ---------------------------------------------------------------------------
// I periodi già impegnati (2026-10-28): un periodo è occupato se si sovrappone a
// un impegno — in qualunque ruolo: appuntamenti fissati da PT o da atleta, voci
// con l'orario dell'agenda del PT, fasce ancora aperte di altre richieste. Lo
// ricontrolla il database (`appuntamenti_metti_orari`, `accetta_orario_alle`,
// migrazione 20261102130000).
// ---------------------------------------------------------------------------

/** Le ore che si scelgono: ogni mezz'ora, dalle 6 alle 22:30. La fine può arrivare alle 23. */
export const FASCE = Array.from({ length: 34 }, (_, i) => {
  const min = 6 * 60 + i * 30
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${min % 60 ? '30' : '00'}`
})

export const FINI = [...FASCE.slice(1), '23:00']

const minuti = (o) => {
  const [a, m, g] = o.giorno.split('-').map(Number)
  const [h, mi] = o.ora.split(':').map(Number)
  return Date.UTC(a, m - 1, g, h, mi) / 60000
}
const sovrapposti = (x, y) =>
  minuti(x) < minuti({ giorno: y.giorno, ora: fineDi(y) }) && minuti(y) < minuti({ giorno: x.giorno, ora: fineDi(x) })

/**
 * L'impegno che occupa questo periodo, o null. `impegni`: [{ giorno, ora,
 * fine?, titolo? }], quelli senza ora ("tutto il giorno") non bloccano.
 */
export function orarioImpegnato(orario, impegni) {
  if (!orario?.giorno || !orario?.ora) return null
  return (impegni || []).find((x) => x.giorno && x.ora && sovrapposti(orario, x)) || null
}

/** Gli inizi possibili dentro una fascia, ogni mezz'ora: la durata ci sta ed è libera. */
export function iniziPossibili(o, impegni = []) {
  const inizi = []
  for (let t = minutiOra(o.ora); t + durataDi(o) <= minutiOra(fineDi(o)); t += 30) {
    const ora = oraDi(t)
    if (!orarioImpegnato({ giorno: o.giorno, ora, fine: oraDi(t + durataDi(o)) }, impegni)) inizi.push(ora)
  }
  return inizi
}

/** Una fascia nuova di quel giorno: un'ora, dalla prima libera. */
export function nuovaFascia(giorno, impegni = [], da = '18:00') {
  const ora = primaFasciaLibera(giorno, impegni, da) || da
  const fine = fineVicina(ora)
  return { giorno, ora, fine, durata: Math.min(60, ampiezza({ ora, fine })) }
}

/** La prima fascia libera di quel giorno (da `da` in poi), o ''. */
export function primaFasciaLibera(giorno, impegni, da = '18:00') {
  const ordine = [...FASCE.filter((f) => f >= da), ...FASCE.filter((f) => f < da)]
  return ordine.find((ora) => !orarioImpegnato({ giorno, ora }, impegni)) || ''
}
