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
//   - i PASTI, ricondotti ai cinque di lib/pastiBase (colazione, spuntino,
//     pranzo, merenda, cena); pre/post workout restano pasti in più;
//   - le CALORIE e i MACRO scritti in cifre ("2400 kcal", "P 180 C 250 G 70");
//   - le ALTERNATIVE di uno stesso pasto, scritte in due modi:
//       · una per riga, "oppure…", "Opzione 2:…" (i messaggi);
//       · un elenco puntato sotto "In alternativa è possibile consumare:" o
//         sotto "Esempi:" (i PDF). Ogni punto è un'alternativa, e le righe
//         che vanno a capo dentro un punto restano sue.
//     Finiscono in `pasto.opzioni`, e nel piano di oggi diventano le voci fra
//     cui scegliere;
//   - le NOTE del nutrizionista che vengono dopo i pasti (le porzioni dei
//     secondi, le sostituzioni, i consigli): tenute da parte in `note`, non
//     appiccicate alla cena.
//
// Quello che non si capisce non si butta: finisce nel pasto aperto in quel
// momento, così sotto gli occhi resta tutto e si sistema a mano.
// ---------------------------------------------------------------------------

import { nuovoId } from '../data/model'
import { TIPO_GIORNATA, nuovaGiornataTipo } from './dieta'
import { labelPasto, semplifica, slotDaNome } from './pastiBase'

// I nomi dei pasti che ci aspettiamo, dal più specifico al più generico (il
// solito problema delle sottostringhe: "spuntino post workout" prima di
// "spuntino").
const PASTI = [
  'pre workout', 'pre-workout', 'pre allenamento',
  'post workout', 'post-workout', 'post allenamento',
  'spuntino di meta mattina', 'spuntino di metà mattina', 'spuntino mattina', 'spuntino del mattino',
  'spuntino del pomeriggio', 'spuntino pomeriggio', 'spuntino pomeridiano',
  'prima colazione', 'seconda colazione',
  'colazione', 'spuntino', 'merenda', 'pranzo', 'cena', 'break',
]

const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica']

// Parole che dicono di che giornata si tratta.
const PAROLE_ALLENAMENTO = ['allenamento', 'allenante', 'workout', 'palestra', 'training', 'on ']
const PAROLE_RIPOSO = ['riposo', 'rest', 'scarico', 'off ', 'non allenamento', 'senza allenamento']

// Un numero scritto in italiano: "2.400" o "2400" o "72,5".
function numero(testo) {
  if (testo == null) return null
  const n = parseFloat(String(testo).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Che tipo di giornata descrive questa riga? null se non lo dice. */
function tipoDaRiga(riga) {
  const t = semplifica(riga) + ' '
  if (PAROLE_RIPOSO.some((p) => t.includes(p))) return TIPO_GIORNATA.RIPOSO
  if (PAROLE_ALLENAMENTO.some((p) => t.includes(p))) return TIPO_GIORNATA.ALLENAMENTO
  return null
}

/** È il titolo di una giornata tipo? */
function titoloGiornata(riga) {
  const t = semplifica(riga)
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
  const t = semplifica(riga)
  for (const p of PASTI) {
    const ps = semplifica(p)
    if (!t.startsWith(ps)) continue
    // "colazione" da sola apre il pasto; "colazioni abbondanti" no.
    const dopo = t.slice(ps.length)
    if (dopo && !/^[\s:\-–—(]/.test(dopo)) continue
    // ⚠️ "Pranzo e cena: evitare i fritti" non apre un pasto: è una regola
    // che vale per due pasti, e di solito sta nelle note.
    const resto = riga.slice(p.length).replace(/^\s*[:\-–—]\s*/, '').trim()
    if (/^(e|o|ed)\s/i.test(resto)) continue
    return { nome: riga.slice(0, p.length).trim(), resto }
  }
  return null
}

// Calorie e macro scritti in una riga qualsiasi. Riconosce sia "2400 kcal"
// sia "Proteine 180 g", "P: 180", "carboidrati 250g".
function macroDaRiga(riga) {
  const t = semplifica(riga)
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
  const t = semplifica(riga).replace(/[-\d.,:;%()]/g, ' ')
  const parole = t.split(/\s+/).filter(Boolean)
  const ammesse = new Set([
    'kcal', 'calorie', 'cal', 'proteine', 'protein', 'prot', 'pro', 'p',
    'carboidrati', 'carbo', 'cho', 'glucidi', 'c', 'grassi', 'lipidi', 'fat',
    'totale', 'totali', 'circa', 'di', 'e', 'tot', 'g', 'gr', 'grammi',
  ])
  return parole.length > 0 && parole.every((w) => ammesse.has(w))
}

// Come si annuncia un'alternativa allo stesso pasto. ⚠️ La "o" da sola NON
// c'è: apre troppe righe che alternative non sono ("o di soia", "pollo o
// tacchino" a capo). Meglio perderne una che spezzare un pasto in due.
const RE_ALTERNATIVA =
  /^(?:oppure|in alternativa|in sostituzione|alternativa|alt\.|opzione\s*\d*|opz\.?\s*\d*|variante\s*\d*)\s*[:.)\-–—]?\s*/i

// "In alternativa, cercando di variare, è possibile consumare:" — non è
// un'alternativa, è il titolo dell'ELENCO di alternative che segue.
function apreElencoAlternative(riga) {
  const t = semplifica(riga)
  if (!/^(in alternativa|in sostituzione|alternative|oppure|altre opzioni)\b/.test(t)) return false
  return /:\s*$/.test(t) || /\b(e possibile|si puo|puoi|potete|consumare|scegliere)\b/.test(t) || t.length < 16
}

// "Esempi:", "Ad esempio:", "Esempi di piatti:" — sotto, i piatti d'esempio:
// modi concreti di fare quel pasto, cioè alternative.
function apreElencoEsempi(riga) {
  const m = /^(?:ad\s+)?esemp[io](?:\s+di\s+[a-z ]+)?\s*:?\s*(.*)$/i.exec(semplifica(riga))
  if (!m) return null
  return { resto: m[1] ? riga.slice(riga.length - m[1].length).trim() : '' }
}

// Dove finiscono i pasti e cominciano le indicazioni generali del
// nutrizionista: "N.B.", i titoli tutti maiuscoli ("SOSTITUZIONI"), "Per il
// secondo piatto è possibile scegliere:" e simili.
function apreNote(riga) {
  const t = semplifica(riga)
  if (/^(n\.?\s?b\.?|nota\b|note\b|indicazioni|consigli|sostituzioni|per il secondo|per i secondi|attenzione)/.test(t)) {
    return true
  }
  // Un titolo tutto maiuscolo che annuncia qualcosa ("SOSTITUZIONI UTILI:").
  // ⚠️ Solo senza numeri e coi due punti: c'è chi scrive TUTTO il piano in
  // maiuscolo, e "RISO 80G, POLLO 150G" è un pranzo, non una nota.
  const lettere = riga.replace(/[^A-Za-zÀ-ÿ]/g, '')
  return lettere.length >= 8 && riga === riga.toUpperCase() && !/\d/.test(riga) && /:\s*$/.test(riga)
}

// Un pallino a inizio riga: è così che nei PDF comincia un punto di un elenco.
// Il trattino conta come pallino solo se è seguito da uno spazio ("- 100g
// riso"): "-5% di grassi" non è un elenco.
const RE_PALLINO = /^[\s•*·▪●◦‣➢✓✔\-–—]+/
const RE_PUNTATA = /^\s*(?:[•*·▪●◦‣➢✓✔]|[-–—]\s)/

function giornataVuota(nome, tipo) {
  return nuovaGiornataTipo({ nome: nome || 'Giornata tipo', tipo: tipo || TIPO_GIORNATA.QUALSIASI })
}

/**
 * Legge un testo (incollato o estratto da un PDF) e ne ricava le giornate tipo.
 *
 * @param {string} testo
 * @returns {{giornate:object[], avvisi:string[], righeIgnorate:number, note:string}}
 */
export function parseDietaTesto(testo) {
  const righe = String(testo || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => ({ puntata: RE_PUNTATA.test(r), testo: r.replace(RE_PALLINO, '').trim() }))

  const giornate = []
  const avvisi = []
  const note = []
  let giornata = null
  let pasto = null
  let righeIgnorate = 0
  // Dove va la prossima riga del pasto aperto: nel corpo, o nell'elenco delle
  // alternative. `puntato` = il pasto è scritto a elenco puntato (i PDF): le
  // righe senza pallino sono il seguito del punto sopra.
  let modo = 'corpo'
  let puntato = false
  let inNote = false
  // Nelle note le righe andate a capo per il margine della pagina si
  // ricuciono: una riga lunga senza punto finale continua sotto. Le righe
  // corte (le tabelle delle sostituzioni) restano righe.
  const aggiungiNota = (riga, puntata) => {
    const ultima = note[note.length - 1]
    if (!puntata && ultima && ultima.length > 70 && !/[.:;!?]$/.test(ultima)) {
      note[note.length - 1] = `${ultima} ${riga}`
    } else note.push(puntata ? `• ${riga}` : riga)
  }

  const apriGiornata = (nome, tipo) => {
    giornata = giornataVuota(nome, tipo)
    giornate.push(giornata)
    pasto = null
  }
  const apriPasto = (nome) => {
    // Prima la giornata, POI il pasto. Invertiti, `apriGiornata` azzerava il
    // pasto appena creato (e' il suo lavoro: una giornata nuova non ha pasti
    // aperti) e nell'elenco finiva un `null` che faceva esplodere tutto il
    // resto. Capita con ogni documento che parte da "Colazione: ..." senza un
    // titolo di giornata sopra, cioe' con la meta' dei messaggi incollati.
    if (!giornata) apriGiornata('Giornata tipo', TIPO_GIORNATA.QUALSIASI)
    // Il secondo "Spuntino" della giornata, dopo il pranzo, è la merenda.
    const presi = new Set(giornata.pasti.map((p) => p.slot))
    let slot = slotDaNome(nome)
    if (slot === 'spuntino' && presi.has('spuntino') && presi.has('pranzo') && !presi.has('merenda')) slot = 'merenda'
    if (slot && presi.has(slot)) slot = ''
    pasto = { id: nuovoId(), slot, nome: slot ? labelPasto(slot) : nome || 'Pasto', testo: '', opzioni: [] }
    giornata.pasti.push(pasto)
    modo = 'corpo'
    puntato = false
  }
  const aggiungiAlPasto = (riga, continua = false) => {
    if (!pasto) apriPasto('Pasto')
    if (continua && pasto.testo) pasto.testo += ` ${riga}`
    else pasto.testo = pasto.testo ? `${pasto.testo}\n${riga}` : riga
  }
  const aggiungiOpzione = (riga, continua = false) => {
    const n = pasto.opzioni.length
    if (continua && n > 0) pasto.opzioni[n - 1] += ` ${riga}`
    else pasto.opzioni.push(riga)
  }
  // Il testo che segue un marcatore di alternativa, se c'è un pasto aperto e se
  // dopo il marcatore c'è davvero qualcosa.
  const alternativa = (riga) => {
    if (!pasto) return null
    const m = riga.match(RE_ALTERNATIVA)
    if (!m) return null
    return riga.slice(m[0].length).trim() || null
  }

  for (const { testo: riga, puntata } of righe) {
    if (!riga) continue

    // Le note finiscono solo quando ricomincia un pasto o una giornata.
    if (inNote) {
      const p = nomePasto(riga)
      const titolo = titoloGiornata(riga)
      if (!p && !titolo) {
        aggiungiNota(riga, puntata)
        continue
      }
      inNote = false
    }

    // Dentro un elenco puntato di alternative (o di esempi): un pallino apre
    // una voce nuova, una riga senza pallino continua quella di prima. Se però
    // è una frase lunga che comincia maiuscola, l'elenco è finito.
    if (pasto && modo === 'elenco' && !nomePasto(riga) && !titoloGiornata(riga)) {
      if (apreNote(riga)) {
        inNote = true
        aggiungiNota(riga, puntata)
        continue
      }
      if (apreElencoAlternative(riga)) continue
      const esempi = apreElencoEsempi(riga)
      if (esempi) {
        if (esempi.resto) aggiungiOpzione(esempi.resto)
        continue
      }
      if (puntata || pasto.opzioni.length === 0) {
        aggiungiOpzione(riga)
        continue
      }
      const seguito = /^[a-zà-ÿ(0-9½¼+,.]/.test(riga) || /^(oppure|o)\b/i.test(riga) || riga.length < 50
      if (seguito) {
        aggiungiOpzione(riga, true)
        continue
      }
      inNote = true
      aggiungiNota(riga, puntata)
      continue
    }

    // Il titolo di un elenco di alternative o di esempi, sotto un pasto.
    if (pasto && apreElencoAlternative(riga)) {
      modo = 'elenco'
      continue
    }
    const esempi = pasto && apreElencoEsempi(riga)
    if (esempi) {
      modo = 'elenco'
      if (esempi.resto) aggiungiOpzione(esempi.resto)
      continue
    }

    // Un pasto scritto a elenco puntato: "oppure 120g di pane" senza pallino
    // sotto "• 100g di pasta" è un'alternativa a QUEL punto (la pasta), non
    // all'intero pranzo. Resta dentro il pasto, attaccata al suo punto.
    if (pasto && puntato && !puntata && /^(oppure|o)\b/i.test(riga)) {
      aggiungiAlPasto(riga, true)
      continue
    }

    // ⚠️ PRIMA di tutto il resto, e non è un capriccio dell'ordine: "Opzione 2"
    // da sola su una riga è il titolo di una giornata alternativa (e
    // `titoloGiornata` la riconosce apposta), ma "Opzione 2: 2 uova" scritta
    // sotto una colazione è un altro modo di fare QUELLA colazione. A
    // distinguerle sono due cose sole: che un pasto sia aperto, e che dopo il
    // marcatore ci sia del testo. Sono note qui e in nessun'altra funzione.
    //
    // Un'alternativa non si somma al pasto: senza questa distinzione "Pranzo:
    // riso e pollo / oppure: pasta e tonno" diventa un pranzo da quattro
    // portate e col doppio dei macro.
    const alt = alternativa(riga)
    if (alt) {
      aggiungiOpzione(alt)
      continue
    }

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
    if (pasto && apreNote(riga) && pasto.testo) {
      inNote = true
      aggiungiNota(riga, puntata)
      continue
    }
    if (puntata) puntato = true
    // Senza pallino, dentro un pasto a elenco, una riga minuscola è il seguito
    // del punto di sopra ("3 fette di fesa di tacchino" sotto "Pan Bauletto con:").
    const continua = puntato && !puntata && /^[a-zà-ÿ(0-9½¼]/.test(riga)
    aggiungiAlPasto(riga, continua)
  }

  // Un pasto scritto SOLO come elenco di alternative ("Colazione / oppure A /
  // oppure B") non ha un testo principale: la prima alternativa lo diventa, se
  // no il pasto risulta vuoto e la giornata viene buttata qui sotto.
  for (const g of giornate) {
    for (const p of g.pasti) {
      p.opzioni = p.opzioni.map((o) => o.replace(/\s+/g, ' ').trim()).filter(Boolean)
      if (!p.testo.trim() && p.opzioni?.length) {
        p.testo = p.opzioni[0]
        p.opzioni = p.opzioni.slice(1)
      }
    }
  }

  // Una giornata senza pasti non serve a nessuno.
  const buone = giornate.filter((g) => g.pasti.some((p) => p.testo.trim()))
  if (buone.length === 0) {
    avvisi.push(
      'Non ho riconosciuto nessun pasto. Controlla che il testo abbia righe tipo "Colazione: …", "Pranzo: …".',
    )
  } else if (buone.length === 1 && buone[0].tipo === TIPO_GIORNATA.QUALSIASI) {
    avvisi.push(
      'Ho trovato una sola giornata e il testo non dice se è di allenamento o di riposo: vale per tutti i giorni, se vuoi cambialo qui sotto.',
    )
  }
  if (righeIgnorate > 3) {
    avvisi.push(`Ho saltato ${righeIgnorate} righe iniziali che non sembravano parte del piano.`)
  }
  return { giornate: buone, avvisi, righeIgnorate, note: note.join('\n') }
}

/**
 * I totali di una giornata quando il documento non li scrive: si sommano i
 * grammi riconosciuti? No — sarebbe una stima nella stima. Meglio dire che
 * mancano e lasciare che li inserisca l'utente (o li erediti dal piano base).
 */
export function macroMancanti(giornata) {
  return !(giornata?.kcal > 0) && !(giornata?.proteine > 0)
}
