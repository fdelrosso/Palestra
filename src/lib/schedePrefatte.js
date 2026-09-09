// ---------------------------------------------------------------------------
// Schede prefatte: programmi già impostati che un atleta sceglie dicendo
// quattro cose — che obiettivo ha, su cosa vuole insistere (il FOCUS: "crescita
// bicipiti", "spalle e braccia", "definizione generale"…), quante volte a
// settimana si allena e quanto dura una seduta.
//
// Obiettivo e focus rispondono a due domande diverse e si sommano:
//   - l'OBIETTIVO dice COME allenarsi → il modo (forza / ipertrofia /
//     resistenza), cioè serie, ripetizioni e recuperi di tutta la scheda;
//   - il FOCUS dice DOVE va il lavoro in più → quali muscoli prendono un
//     esercizio in più, più varianti e la precedenza quando il tempo è poco,
//     ed eventualmente entrano in giornate che non li prevedevano (lib/focus).
// Si può quindi chiedere "massa, con focus sui bicipiti" o "dimagrimento, con
// focus su spalle e braccia": la struttura resta quella giusta per i giorni a
// disposizione, cambia cosa c'è dentro.
//
// Sopra a tutti e due c'è il LIVELLO dichiarato sul profilo (lib/livello), che
// non si sceglie qui perché non è una scelta di questa scheda ma di chi la fa:
// decide quali esercizi possono entrarci, quante serie hanno e quanti giorni a
// settimana ha senso proporre.
//
// La parte "prefatta" è la STRUTTURA: come si dividono i muscoli nella
// settimana. Non è una scelta libera, dipende da quante volte ci si allena, ed
// è materia su cui la pratica è concorde:
//   2 volte  → full body (tutto il corpo ogni volta): con due sedute è l'unico
//              modo di allenare ogni muscolo abbastanza spesso;
//   3 volte  → full body A/B/C, oppure Push / Pull / Legs (spinta, tirata, gambe);
//   4 volte  → Upper / Lower ×2 (parte alta e parte bassa, due volte ciascuna);
//   5 volte  → Push / Pull / Legs + Upper / Lower;
//   6 volte  → Push / Pull / Legs ×2.
//
// Gli ESERCIZI dentro ogni giorno non sono scritti a mano: li sceglie lo stesso
// motore dell'allenamento consigliato (lib/consiglio), quindi tengono conto di
// quello che già fai, di quello che il tuo PT dà agli altri e di quello che
// fanno gli altri utenti — e ricevono serie/ripetizioni/recupero dal loro tipo
// e dall'obiettivo scelto (lib/programmazione).
//
// La progressione è a "doppia progressione": lo schema resta lo stesso ogni
// settimana e si sale di carico quando si chiude tutto il range di ripetizioni.
// È il motivo per cui le ripetizioni sono scritte come range ("8-10") ed è ciò
// che i pallini colorati dell'app già misurano (lib/carico).
// ---------------------------------------------------------------------------

import { generaAllenamento } from './consiglio'
import { normalizzaNome } from './eserciziLibreria'
import { etichettaFocus, focusAttivo, gruppiConFocus, gruppiFocus } from './focus'
import { regoleLivello, spiegazioneLivello } from './livello'
import { MODO_DEFAULT, modoDi } from './programmazione'
import { nuovaScheda, nuovoGiorno } from '../data/model'
import { gruppoDi } from './muscoli'

// Obiettivi tra cui sceglie l'atleta. `modo` è la tabella serie/ripetizioni/
// recupero da usare (lib/programmazione); `cardio` aggiunge una coda di cardio
// alle sedute, `preferisci` dice quale struttura proporre per prima a parità
// di giorni.
export const OBIETTIVI = [
  {
    id: 'forza',
    label: 'Forza',
    descrizione: 'Diventare più forte sui fondamentali: carichi alti, poche ripetizioni.',
    modo: 'forza',
    cardio: false,
    preferisci: 'fullbody',
  },
  {
    id: 'massa',
    label: 'Massa muscolare',
    descrizione: 'Mettere muscolo: volume alto e 6-12 ripetizioni.',
    modo: 'ipertrofia',
    cardio: false,
    preferisci: 'split',
  },
  {
    id: 'dimagrimento',
    label: 'Dimagrimento',
    descrizione: 'Consumare di più: ripetizioni alte, recuperi corti e cardio in coda.',
    modo: 'resistenza',
    cardio: true,
    preferisci: 'fullbody',
  },
  {
    id: 'tonificazione',
    label: 'Rimettersi in forma',
    descrizione: 'Ripartire con calma: tutto il corpo, carichi gestibili, niente eroismi.',
    modo: 'ipertrofia',
    cardio: false,
    preferisci: 'fullbody',
  },
]

export function obiettivoDi(id) {
  return OBIETTIVI.find((o) => o.id === id) || OBIETTIVI[1]
}

export const GIORNI_POSSIBILI = [2, 3, 4, 5, 6]
export const DURATE_POSSIBILI = [30, 45, 60, 90]

// I muscoli che compongono le giornate tipiche.
const SPINTA = ['petto', 'spalle', 'tricipiti']
const TIRATA = ['schiena', 'bicipiti']
const GAMBE = ['gambe', 'addome']
const UPPER = ['petto', 'schiena', 'spalle']
const LOWER = ['gambe', 'addome']

/**
 * Le strutture disponibili. Ogni voce dice per quanti giorni a settimana vale,
 * che "famiglia" è (per assecondare il focus) e come sono fatte le giornate.
 */
export const SPLIT = [
  {
    id: 'fullbody-ab',
    giorni: 2,
    famiglia: 'fullbody',
    nome: 'Full body A / B',
    sottotitolo: 'Tutto il corpo, due volte a settimana',
    perche:
      'Con due sedute conviene allenare tutto ogni volta: ogni muscolo lavora due volte a settimana invece di una.',
    giorniDef: [
      { nome: 'Giorno A', gruppi: ['gambe', 'petto', 'schiena'] },
      { nome: 'Giorno B', gruppi: ['schiena', 'spalle', 'gambe'] },
    ],
  },
  {
    id: 'fullbody-abc',
    giorni: 3,
    famiglia: 'fullbody',
    nome: 'Full body A / B / C',
    sottotitolo: 'Tutto il corpo, tre volte a settimana',
    perche:
      'Ogni muscolo tre volte a settimana, con esercizi diversi ogni giorno: è la struttura che rende di più a chi riparte.',
    giorniDef: [
      { nome: 'Giorno A', gruppi: ['gambe', 'petto', 'schiena'] },
      { nome: 'Giorno B', gruppi: ['schiena', 'spalle', 'addome'] },
      { nome: 'Giorno C', gruppi: ['gambe', 'petto', 'bicipiti'] },
    ],
  },
  {
    id: 'ppl-3',
    giorni: 3,
    famiglia: 'split',
    nome: 'Push / Pull / Legs',
    sottotitolo: 'Spinta · Tirata · Gambe',
    perche:
      'I muscoli che lavorano insieme si allenano insieme: chi spinge un giorno, chi tira il giorno dopo, gambe il terzo.',
    giorniDef: [
      { nome: 'Push · spinta', gruppi: SPINTA },
      { nome: 'Pull · tirata', gruppi: TIRATA },
      { nome: 'Legs · gambe', gruppi: GAMBE },
    ],
  },
  {
    id: 'upper-lower-4',
    giorni: 4,
    famiglia: 'split',
    nome: 'Upper / Lower',
    sottotitolo: 'Parte alta e parte bassa, due volte ciascuna',
    perche:
      'Con quattro sedute è la divisione più collaudata: ogni metà del corpo due volte a settimana, con il giusto recupero.',
    giorniDef: [
      { nome: 'Upper A · parte alta', gruppi: UPPER },
      { nome: 'Lower A · parte bassa', gruppi: LOWER },
      { nome: 'Upper B · parte alta', gruppi: ['schiena', 'petto', 'bicipiti', 'tricipiti'] },
      { nome: 'Lower B · parte bassa', gruppi: ['gambe', 'addome'] },
    ],
  },
  {
    id: 'ppl-ul-5',
    giorni: 5,
    famiglia: 'split',
    nome: 'Push / Pull / Legs + Upper / Lower',
    sottotitolo: 'Cinque sedute, parte alta tre volte',
    perche:
      'Aggiunge due sedute alla struttura Push/Pull/Legs: la parte alta viene allenata tre volte a settimana, le gambe due.',
    giorniDef: [
      { nome: 'Push · spinta', gruppi: SPINTA },
      { nome: 'Pull · tirata', gruppi: TIRATA },
      { nome: 'Legs · gambe', gruppi: GAMBE },
      { nome: 'Upper · parte alta', gruppi: UPPER },
      { nome: 'Lower · parte bassa', gruppi: LOWER },
    ],
  },
  {
    id: 'ppl-6',
    giorni: 6,
    famiglia: 'split',
    nome: 'Push / Pull / Legs ×2',
    sottotitolo: 'Sei sedute, ogni muscolo due volte',
    perche:
      'La struttura Push/Pull/Legs ripetuta due volte: tanto volume, ma serve costanza e un buon recupero.',
    giorniDef: [
      { nome: 'Push A · spinta', gruppi: SPINTA },
      { nome: 'Pull A · tirata', gruppi: TIRATA },
      { nome: 'Legs A · gambe', gruppi: GAMBE },
      { nome: 'Push B · spinta', gruppi: ['petto', 'spalle', 'tricipiti'] },
      { nome: 'Pull B · tirata', gruppi: ['schiena', 'bicipiti'] },
      { nome: 'Legs B · gambe', gruppi: ['gambe', 'addome'] },
    ],
  },
]

/**
 * Le strutture proposte per un certo numero di giorni, con davanti quella che
 * si adatta meglio a chi la userà.
 *
 * Decide prima il LIVELLO e poi l'obiettivo: a un principiante conviene il full
 * body qualunque cosa stia cercando, perché con poche sedute ogni muscolo
 * lavora più spesso ed è lì che si impara il gesto. Chi non ha dichiarato un
 * livello ricade sull'obiettivo, cioè su com'era prima.
 *
 * @param {number} giorni
 * @param {string} obiettivoId
 * @param {string} [livello] id del livello dichiarato sul profilo (lib/livello)
 */
export function splitPerGiorni(giorni, obiettivoId, livello) {
  const o = obiettivoDi(obiettivoId)
  const preferita = regoleLivello(livello)?.preferisci || o.preferisci
  return SPLIT.filter((s) => s.giorni === Number(giorni)).sort((a, b) => {
    const pa = a.famiglia === preferita ? 0 : 1
    const pb = b.famiglia === preferita ? 0 : 1
    return pa - pb
  })
}

// I giorni della settimana su cui distribuire le sedute, tenendole staccate il
// più possibile (lunedì-first, 0..6). Serve alle card "allenamento di oggi".
const CALENDARIO = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
}

/**
 * I gruppi di ogni giornata della struttura, dopo aver assecondato il focus.
 *
 * Un muscolo su cui si vuole insistere entra nelle giornate che già lavorano la
 * sua metà del corpo (i bicipiti nei giorni di tirata) — se ne occupa
 * `gruppiConFocus`. Se non trova posto da nessuna parte, però, allenarlo di più
 * resta una richiesta esplicita dell'atleta: lo si mette allora nella giornata
 * più scarica, che è il danno minore.
 *
 * @param {{gruppi:string[]}[]} giorniDef
 * @param {object} focus lib/focus
 * @param {boolean} conCardio coda di cardio in ogni seduta
 * @returns {string[][]} i gruppi giorno per giorno
 */
export function gruppiPerGiorno(giorniDef, focus, conCardio) {
  const liste = giorniDef.map((def) => gruppiConFocus(def.gruppi, focus).gruppi)

  for (const g of gruppiFocus(focus)) {
    if (liste.some((l) => l.includes(g))) continue
    let piuScarica = 0
    liste.forEach((l, i) => {
      if (l.length < liste[piuScarica].length) piuScarica = i
    })
    liste[piuScarica] = [...liste[piuScarica], g]
  }

  if (!conCardio) return liste
  return liste.map((l) => (l.includes('cardio') ? l : [...l, 'cardio']))
}

/**
 * Costruisce la scheda vera e propria a partire da una struttura.
 *
 * @param {{
 *   split: (typeof SPLIT)[number],
 *   obiettivoId: string,
 *   focus?: object,                           // lib/focus: su cosa insistere
 *   livello?: string,                         // lib/livello: quali esercizi e quanto volume
 *   durataMin: number,
 *   settimane?: number,
 *   analisi: any, comunita?: any, pt?: any,   // per la scelta degli esercizi
 * }} opts
 * @returns {import('../data/model').Scheda}
 */
export function generaSchedaPrefatta({
  split,
  obiettivoId,
  focus,
  livello,
  durataMin,
  settimane = 6,
  analisi,
  comunita,
  pt,
}) {
  const obiettivo = obiettivoDi(obiettivoId)
  const modo = obiettivo.modo || MODO_DEFAULT
  // Il cardio in coda arriva se l'obiettivo è dimagrire o se il focus è la
  // definizione: sono la stessa richiesta detta in due modi.
  const conCardio = !!obiettivo.cardio || !!focus?.cardio
  const gruppiGiorno = gruppiPerGiorno(split.giorniDef, focus, conCardio)

  // Quello che è già finito nei giorni precedenti: serve a non ritrovarsi lo
  // stesso squat in tutti e tre i giorni di un "full body A/B/C".
  const giaUsati = new Set()

  const giorni = split.giorniDef.map((def, i) => {
    const gen = generaAllenamento({
      gruppi: gruppiGiorno[i],
      durataMin,
      analisi,
      comunita,
      pt,
      modo,
      focus,
      livello,
      nome: def.nome,
      evita: giaUsati,
    })
    for (const e of gen.esercizi) giaUsati.add(normalizzaNome(e.nome))
    return nuovoGiorno({ tipo: 'workout', nome: def.nome, esercizi: gen.esercizi })
  })

  const conFocus = focusAttivo(focus)
  const muscoliFocus = etichettaFocus(focus)

  return nuovaScheda({
    nome: `${split.nome} · ${conFocus ? focus.label : obiettivo.label}`,
    nota:
      `${split.perche}\n\n` +
      `Obiettivo: ${obiettivo.label.toLowerCase()} — ${modoDi(modo).descrizione}\n` +
      // Il livello dichiarato ha cambiato quali esercizi ci sono qui dentro e
      // quante serie hanno: chi legge la scheda deve poterlo sapere, e sapere
      // che si cambia da "I miei dati".
      (spiegazioneLivello(livello) ? `${spiegazioneLivello(livello)}\n` : '') +
      (conFocus
        ? `Focus: ${focus.label.toLowerCase()}` +
          (muscoliFocus
            ? ` — il lavoro in più va su ${muscoliFocus}: un esercizio in più per seduta, più ` +
              `varianti dello stesso movimento e la precedenza quando il tempo non basta per tutto.`
            : '.') +
          (focus.cardio ? ' In coda a ogni seduta c’è il cardio.' : '') +
          '\n'
        : '') +
      `Come si progredisce: tieni lo stesso carico finché non chiudi tutte le serie in cima al ` +
      `range di ripetizioni; quando ci riesci, sali. I pallini colorati di fine serie ti dicono ` +
      `già quando è il momento.`,
    numeroSettimane: settimane,
    settimanaCorrente: 1,
    giorniSettimana: CALENDARIO[split.giorni] || [],
    giorni,
  })
}

/**
 * Riassunto di una scheda generata, per la card di anteprima. Con un focus
 * attivo conta anche le serie settimanali che finiscono sui suoi muscoli: è il
 * numero che dice davvero se la scheda ha assecondato la richiesta o no.
 */
export function riassuntoScheda(scheda, focus) {
  const daContare = new Set(gruppiFocus(focus))
  const gruppi = new Set()
  let esercizi = 0
  let serie = 0
  let serieFocus = 0
  for (const g of scheda.giorni) {
    for (const e of g.esercizi) {
      esercizi += 1
      if (e.gruppo) gruppi.add(e.gruppo)
      const n = parseInt(e.schemaBase?.serie, 10) || 0
      serie += n
      if (daContare.has(e.gruppo)) serieFocus += n
    }
  }
  return {
    esercizi,
    serie,
    serieFocus,
    gruppi: [...gruppi].map((g) => gruppoDi(g)?.label || g),
  }
}
