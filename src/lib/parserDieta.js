// ---------------------------------------------------------------------------
// Da un testo qualsiasi alle GIORNATE TIPO.
//
// È il fratello di lib/parser.js (che legge le schede mandate dal PT su
// WhatsApp): stessa filosofia, stesso patto con l'utente. Il nutrizionista
// manda un PDF o un messaggio, noi ci ricaviamo quello che si capisce e il
// resto lo si corregge nell'editor. Meglio l'80% subito che il 100% mai.
//
// Cosa si riconosce:
//   - i TITOLI di giornata ("GIORNO DI ALLENAMENTO", "Giornata tipo 2",
//     "Lunedì — riposo") e se sono giorni di allenamento o di riposo;
//   - i PASTI (colazione, spuntino, pranzo, merenda, cena, pre/post workout);
//   - le CALORIE e i MACRO scritti in cifre ("2400 kcal", "P 180 C 250 G 70").
//
// Quello che non si capisce non si butta: finisce nel pasto aperto in quel
// momento, così sotto gli occhi resta tutto e si sistema a mano.
// ---------------------------------------------------------------------------

import { nuovoId } from '../data/model'
import { TIPO_GIORNATA, nuovaGiornataTipo } from './dieta'

// I nomi dei pasti che ci aspettiamo, dal più specifico al più generico (il
// solito problema delle sottostringhe: "spuntino post workout" prima di
// "spuntino").
const PASTI = [
  'pre workout', 'pre-workout', 'pre allenamento',
  'post workout', 'post-workout', 'post allenamento',
  'spuntino mattina', 'spuntino di meta mattina', 'spuntino pomeriggio',
  'colazione', 'spuntino', 'merenda', 'pranzo', 'cena', 'break',
  'prima colazione', 'seconda colazione',
]

const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica']

// Parole che dicono di che giornata si tratta.
const PAROLE_ALLENAMENTO = ['allenamento', 'allenante', 'workout', 'palestra', 'training', 'on ']
const PAROLE_RIPOSO = ['riposo', 'rest', 'scarico', 'off ', 'non allenamento', 'senza allenamento']

function senzaAccenti(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

// Un numero scritto in italiano: "2.400" o "2400" o "72,5".
function numero(testo) {
  if (testo == null) return null
  const n = parseFloat(String(testo).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Che tipo di giornata descrive questa riga? null se non lo dice. */
function tipoDaRiga(riga) {
  const t = senzaAccenti(riga) + ' '
  if (PAROLE_RIPOSO.some((p) => t.includes(p))) return TIPO_GIORNATA.RIPOSO
  if (PAROLE_ALLENAMENTO.some((p) => t.includes(p))) return TIPO_GIORNATA.ALLENAMENTO
  return null
}

/** È il titolo di una giornata tipo? */
function titoloGiornata(riga) {
  const t = senzaAccenti(riga)
  if (!t || t.length > 60) return null
  // Volutamente stretto: "piano", "menu" e "schema" aprono le INTESTAZIONI dei
  // documenti ("Piano alimentare per Federico"), non le giornate.
  const parlaDiGiornata =
    /^(giorno|giornata|day|opzione)\b/.test(t) ||
    GIORNI.some((g) => t.startsWith(g)) ||
    // Una riga tutta maiuscola che nomina allenamento/riposo è un titolo anche
    // se non comincia con "giorno" (i nutrizionisti scrivono "ALLENAMENTO A").
    (riga === riga.toUpperCase() && tipoDaRiga(riga) != null)
  if (!parlaDiGiornata) return null
  // Un titolo non ha il corpo di un pasto attaccato ("Pranzo: 100g di riso").
  if (nomePasto(riga)) return null
  return riga.replace(/[:\-–—]\s*$/, '').trim()
}

/** Se la riga apre un pasto, il suo nome (com'era scritto) e cosa resta. */
function nomePasto(riga) {
  const t = senzaAccenti(riga)
  for (const p of PASTI) {
    if (!t.startsWith(p)) continue
    const resto = riga.slice(p.length).replace(/^\s*[:\-–—]\s*/, '')
    // "colazione" da sola apre il pasto; "colazioni abbondanti" no.
    const dopo = t.slice(p.length)
    if (dopo && !/^[\s:\-–—(]/.test(dopo)) continue
    return { nome: riga.slice(0, p.length).trim(), resto: resto.trim() }
  }
  return null
}

// Calorie e macro scritti in una riga qualsiasi. Riconosce sia "2400 kcal"
// sia "Proteine 180 g", "P: 180", "carboidrati 250g".
function macroDaRiga(riga) {
  const t = senzaAccenti(riga)
  const out = {}
  const kcal = t.match(/(\d[\d.,]*)\s*(?:kcal|calorie|cal\b)/) || t.match(/(?:kcal|calorie)\s*:?\s*(\d[\d.,]*)/)
  if (kcal) out.kcal = numero(kcal[1])
  const cerca = (etichette) => {
    for (const e of etichette) {
      const m =
        t.match(new RegExp(`${e}\\s*:?\\s*(\\d[\\d.,]*)\\s*g?\\b`)) ||
        t.match(new RegExp(`(\\d[\\d.,]*)\\s*g?\\s*(?:di\\s+)?${e}`))
      if (m) return numero(m[1])
    }
    return null
  }
  const p = cerca(['proteine', 'protein', 'prot\\.', '\\bpro\\b', '\\bp\\b'])
  const c = cerca(['carboidrati', 'carbo', 'cho', 'glucidi', '\\bc\\b'])
  const g = cerca(['grassi', 'lipidi', 'fat', '\\bg\\b'])
  if (p != null) out.proteine = p
  if (c != null) out.carbo = c
  if (g != null) out.grassi = g
  return Object.keys(out).length > 0 ? out : null
}

// Una riga è "solo macro" se togliendo i numeri e le etichette non resta cibo:
// serve a non trasformare "Pranzo: 100g di riso" in una riga di macro.
function soloMacro(riga) {
  const t = senzaAccenti(riga).replace(/[-\d.,:;%()]/g, ' ')
  const parole = t.split(/\s+/).filter(Boolean)
  const ammesse = new Set([
    'kcal', 'calorie', 'cal', 'proteine', 'protein', 'prot', 'pro', 'p',
    'carboidrati', 'carbo', 'cho', 'glucidi', 'c', 'grassi', 'lipidi', 'fat',
    'totale', 'totali', 'circa', 'di', 'e', 'tot', 'g', 'gr', 'grammi',
  ])
  return parole.length > 0 && parole.every((w) => ammesse.has(w))
}

function giornataVuota(nome, tipo) {
  return nuovaGiornataTipo({ nome: nome || 'Giornata tipo', tipo: tipo || TIPO_GIORNATA.QUALSIASI })
}

/**
 * Legge un testo (incollato o estratto da un PDF) e ne ricava le giornate tipo.
 *
 * @param {string} testo
 * @returns {{giornate:object[], avvisi:string[], righeIgnorate:number}}
 */
export function parseDietaTesto(testo) {
  const righe = String(testo || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => r.replace(/^[\s•*·\-–—]+/, '').trim())

  const giornate = []
  const avvisi = []
  let giornata = null
  let pasto = null
  let righeIgnorate = 0

  const apriGiornata = (nome, tipo) => {
    giornata = giornataVuota(nome, tipo)
    giornate.push(giornata)
    pasto = null
  }
  const apriPasto = (nome) => {
    pasto = { id: nuovoId(), nome: nome || 'Pasto', testo: '' }
    if (!giornata) apriGiornata('Giornata tipo', TIPO_GIORNATA.QUALSIASI)
    giornata.pasti.push(pasto)
  }
  const aggiungiAlPasto = (riga) => {
    if (!pasto) apriPasto('Pasto')
    pasto.testo = pasto.testo ? `${pasto.testo}\n${riga}` : riga
  }

  for (const riga of righe) {
    if (!riga) continue

    const titolo = titoloGiornata(riga)
    if (titolo) {
      apriGiornata(titolo, tipoDaRiga(riga) || TIPO_GIORNATA.QUALSIASI)
      continue
    }

    // Macro/calorie: vanno alla giornata aperta (o alla prima, se il totale è
    // scritto in testa al documento).
    if (soloMacro(riga)) {
      const m = macroDaRiga(riga)
      if (m) {
        if (!giornata) apriGiornata('Giornata tipo', TIPO_GIORNATA.QUALSIASI)
        Object.assign(giornata, m)
        continue
      }
    }

    const p = nomePasto(riga)
    if (p) {
      apriPasto(p.nome)
      if (p.resto) aggiungiAlPasto(p.resto)
      continue
    }

    if (!giornata && !pasto) {
      // Roba prima di qualsiasi giornata: intestazioni, nome del paziente,
      // firma del nutrizionista. Non serve, ma la contiamo per dirlo.
      righeIgnorate += 1
      continue
    }
    aggiungiAlPasto(riga)
  }

  // Una giornata senza pasti non serve a nessuno.
  const buone = giornate.filter((g) => g.pasti.some((p) => p.testo.trim()))
  if (buone.length === 0) {
    avvisi.push(
      'Non ho riconosciuto nessun pasto. Controlla che il testo abbia righe tipo "Colazione: …", "Pranzo: …".',
    )
  } else if (buone.length === 1 && buone[0].tipo === TIPO_GIORNATA.QUALSIASI) {
    avvisi.push(
      'Ho trovato una sola giornata e il testo non dice se è di allenamento o di riposo: scegli tu qui sotto.',
    )
  }
  if (righeIgnorate > 3) {
    avvisi.push(`Ho saltato ${righeIgnorate} righe iniziali che non sembravano parte del piano.`)
  }
  return { giornate: buone, avvisi, righeIgnorate }
}

/**
 * I totali di una giornata quando il documento non li scrive: si sommano i
 * grammi riconosciuti? No — sarebbe una stima nella stima. Meglio dire che
 * mancano e lasciare che li inserisca l'utente (o li erediti dal piano base).
 */
export function macroMancanti(giornata) {
  return !(giornata?.kcal > 0) && !(giornata?.proteine > 0)
}
