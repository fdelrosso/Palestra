// ---------------------------------------------------------------------------
// Focus: il muscolo (o l'idea) su cui una persona vuole insistere.
//
// L'obiettivo (forza / massa / dimagrimento — lib/schedePrefatte) dice COME ci
// si allena: quante ripetizioni, quanto recupero. Il focus dice invece DOVE va
// il lavoro in più: "voglio far crescere i bicipiti", "voglio spalle e
// braccia", "voglio definirmi". Sono due cose diverse e si sommano — si può
// volere massa con focus sui bicipiti, o dimagrimento con focus sulle gambe.
//
// Come si traduce in una scheda, in concreto (tre effetti, tutti in
// lib/programmazione e lib/consiglio):
//   1. VOLUME — il gruppo sotto focus prende un esercizio in più a seduta
//      (e quindi più serie): è il modo in cui si fa crescere un muscolo che
//      resta indietro, ed è l'unica leva che conta davvero.
//   2. PRECEDENZA — quando il tempo non basta per tutti si taglia dagli altri
//      gruppi, mai dal focus; e a parità di "peso" il focus viene servito prima.
//   3. VARIANTI — sui gruppi del focus si ammette più di un esercizio della
//      stessa famiglia di movimento. Serve: i bicipiti sono quasi tutti "curl",
//      e con la regola normale (una famiglia per seduta) "crescita bicipiti"
//      darebbe comunque un esercizio solo.
// In più il focus può portare il muscolo dentro giornate che non lo
// prevedevano (vedi gruppiConFocus).
//
// Quello che il focus NON fa: cambiare la struttura della settimana e stravolgere
// l'ordine della seduta. I fondamentali pesanti restano davanti anche col focus
// sui bicipiti — si rende di più da freschi, e tre curl fatti per primi
// rovinerebbero le trazioni senza far crescere niente di più.
// ---------------------------------------------------------------------------

import { GRUPPI, gruppoDi } from './muscoli'

// Quanto insiste un focus su un gruppo:
//   1 = lavoro in più, ma diviso con altri muscoli ("spalle e braccia");
//   2 = è IL motivo per cui ci si allena ("crescita bicipiti").
export const BOOST_PARZIALE = 1
export const BOOST_PIENO = 2

// Quante varianti della stessa famiglia di movimento si ammettono in una seduta
// per un gruppo sotto focus (fuori dal focus resta 1).
export function maxStessaFamiglia(boost) {
  return 1 + (boost || 0)
}

/**
 * Le scelte di focus proposte. `boost` è la mappa gruppo → quanto insistere,
 * `cardio` aggiunge una coda di cardio alle sedute.
 * L'ultima voce ("Su misura") non ha muscoli suoi: li sceglie l'utente e il
 * focus viene costruito al volo da `focusSuMisura`.
 */
export const FOCUS = [
  {
    id: 'equilibrato',
    label: 'Equilibrato',
    descrizione: 'Nessun muscolo in particolare: il volume si distribuisce come da manuale.',
    boost: {},
  },
  {
    id: 'bicipiti',
    label: 'Crescita bicipiti',
    descrizione: 'Più serie e più varianti di curl, dentro la stessa struttura.',
    boost: { bicipiti: BOOST_PIENO },
  },
  {
    id: 'tricipiti',
    label: 'Crescita tricipiti',
    descrizione: 'Il tricipite è i due terzi del braccio: qui prende il lavoro in più.',
    boost: { tricipiti: BOOST_PIENO },
  },
  {
    id: 'braccia',
    label: 'Braccia',
    descrizione: 'Bicipiti e tricipiti insieme, un esercizio in più a testa.',
    boost: { bicipiti: BOOST_PARZIALE, tricipiti: BOOST_PARZIALE },
  },
  {
    id: 'spalle-braccia',
    label: 'Spalle e braccia',
    descrizione: 'Deltoidi, bicipiti e tricipiti: la parte alta che si vede di più.',
    boost: { spalle: BOOST_PARZIALE, bicipiti: BOOST_PARZIALE, tricipiti: BOOST_PARZIALE },
  },
  {
    id: 'petto',
    label: 'Petto',
    descrizione: 'Più spinte e più croci: dove può, il petto apre la seduta.',
    boost: { petto: BOOST_PIENO },
  },
  {
    id: 'schiena',
    label: 'Schiena e dorsali',
    descrizione: 'Trazioni e rematori: la schiena regge molto volume.',
    boost: { schiena: BOOST_PIENO },
  },
  {
    id: 'spalle',
    label: 'Spalle',
    descrizione: 'Deltoidi da tutti e tre i lati, alzate comprese.',
    boost: { spalle: BOOST_PIENO },
  },
  {
    id: 'gambe',
    label: 'Gambe',
    descrizione: 'La parte bassa: squat, spinte e femorali.',
    boost: { gambe: BOOST_PIENO },
  },
  {
    id: 'addome',
    label: 'Addome e core',
    descrizione: 'Addome in ogni seduta, non solo quando avanza tempo.',
    boost: { addome: BOOST_PIENO },
  },
  {
    id: 'parte-alta',
    label: 'Parte alta del corpo',
    descrizione: 'Petto, schiena e spalle prima delle gambe.',
    boost: { petto: BOOST_PARZIALE, schiena: BOOST_PARZIALE, spalle: BOOST_PARZIALE },
  },
  {
    id: 'definizione',
    label: 'Definizione generale',
    descrizione:
      'Stesso lavoro coi pesi, più cardio in coda e più addome. Il grosso però lo fa la dieta.',
    boost: { addome: BOOST_PARZIALE },
    cardio: true,
  },
  {
    id: 'personalizzato',
    label: 'Su misura',
    descrizione: 'Scegli tu i muscoli su cui insistere (fino a 3).',
    boost: {},
    personalizzato: true,
  },
]

export const FOCUS_DEFAULT = 'equilibrato'

// Quanti muscoli si possono scegliere in un focus "su misura": oltre tre non è
// più un focus, è un allenamento normale.
export const MAX_GRUPPI_SU_MISURA = 3

export function focusDi(id) {
  return FOCUS.find((f) => f.id === id) || FOCUS[0]
}

/**
 * Il focus costruito dai gruppi che l'utente ha scelto a mano. Un muscolo solo
 * prende tutto il lavoro in più; su due o tre lo si divide.
 * @param {string[]} gruppi id dei gruppi muscolari
 */
export function focusSuMisura(gruppi) {
  const scelti = [...new Set((gruppi || []).filter(Boolean))].slice(0, MAX_GRUPPI_SU_MISURA)
  const quanto = scelti.length <= 1 ? BOOST_PIENO : BOOST_PARZIALE
  return {
    id: 'personalizzato',
    label: scelti.length ? etichettaGruppi(scelti) : 'Su misura',
    descrizione: 'Focus scelto da te.',
    boost: Object.fromEntries(scelti.map((g) => [g, quanto])),
    personalizzato: true,
  }
}

/**
 * Il focus vero da passare al generatore, a partire da com'è messa la UI.
 * @param {string} id voce scelta tra FOCUS
 * @param {string[]} [gruppiSuMisura] usati solo se la voce è "Su misura"
 */
export function risolviFocus(id, gruppiSuMisura) {
  const f = focusDi(id)
  return f.personalizzato ? focusSuMisura(gruppiSuMisura) : f
}

/** Quanto insistere su questo gruppo: 0 = per niente. */
export function boostGruppo(focus, gruppo) {
  return focus?.boost?.[gruppo] || 0
}

/** I gruppi su cui il focus insiste, dal più al meno. */
export function gruppiFocus(focus) {
  return Object.entries(focus?.boost || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)
}

/** C'è davvero qualcosa da assecondare, o è un allenamento equilibrato? */
export function focusAttivo(focus) {
  return gruppiFocus(focus).length > 0 || !!focus?.cardio
}

// "bicipiti", "spalle e bicipiti", "spalle, bicipiti e tricipiti".
export function etichettaGruppi(gruppi) {
  const nomi = (gruppi || []).map((g) => (gruppoDi(g)?.label || g).toLowerCase())
  if (nomi.length <= 1) return nomi[0] || ''
  return nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1]
}

/** I muscoli del focus, scritti per esteso ("spalle, bicipiti e tricipiti"). */
export function etichettaFocus(focus) {
  return etichettaGruppi(gruppiFocus(focus))
}

/** I gruppi selezionabili in un focus su misura (il cardio non è un focus). */
export function gruppiSelezionabili() {
  return GRUPPI.filter((g) => g.id !== 'cardio')
}

// In quale metà della seduta lavora un gruppo. Serve a capire in quali giornate
// ha senso infilare il muscolo del focus: i bicipiti stanno nel giorno di
// tirata (lavorano già lì), non in mezzo a uno di gambe.
const AREA = {
  petto: 'spinta',
  spalle: 'spinta',
  tricipiti: 'spinta',
  schiena: 'tirata',
  bicipiti: 'tirata',
  gambe: 'gambe',
  addome: 'ovunque',
  cardio: 'ovunque',
}

// Oltre questo numero di gruppi una seduta non è più un allenamento, è una lista.
const MAX_GRUPPI_GIORNO = 5

/**
 * I gruppi di una giornata dopo aver assecondato il focus. Un muscolo del focus
 * che la giornata non prevedeva entra solo se quella giornata lavora già la sua
 * metà del corpo (addome e cardio stanno bene ovunque). Se non entra da nessuna
 * parte ci pensa chi costruisce la scheda, mettendolo nella giornata più scarica.
 *
 * @param {string[]} gruppiGiorno i gruppi previsti dalla struttura
 * @param {{boost?:Record<string,number>}} focus
 * @returns {{ gruppi: string[], aggiunti: string[] }}
 */
export function gruppiConFocus(gruppiGiorno, focus) {
  const base = (gruppiGiorno || []).filter(Boolean)
  const dentro = new Set(base)
  const aree = new Set(base.map((g) => AREA[g]).filter(Boolean))
  const aggiunti = []

  for (const g of gruppiFocus(focus)) {
    if (dentro.has(g)) continue
    if (base.length + aggiunti.length >= MAX_GRUPPI_GIORNO) break
    if (AREA[g] !== 'ovunque' && !aree.has(AREA[g])) continue
    aggiunti.push(g)
    dentro.add(g)
  }

  return { gruppi: [...base, ...aggiunti], aggiunti }
}
