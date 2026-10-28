// ---------------------------------------------------------------------------
// Il formato della dieta per l'AI: il gemello di lib/formatoScheda, per la
// dieta del nutrizionista invece della scheda del PT.
//
// La dieta arriva come capita (foto del foglio, PDF di Word, PDF scansionato,
// messaggio): un'AI di Mistral (api/riscrivi-dieta) la riscrive in un testo
// che lib/parserDieta legge senza sorprese, e da lì la strada è quella di
// sempre (DietaImportPage: si vede, si corregge, si salva).
//
// Perché serve: il parser da solo, sui PDF veri, sbaglia in modi che non si
// vedono. Su un piano reale (Word, 5 pagine) perdeva lo spuntino dei giorni di
// allenamento dietro un numero di pagina, faceva diventare "2-3 fette di pane"
// (un'alternativa alla PASTA) un pranzo intero, chiamava "Merenda" lo spuntino
// prima di dormire e spezzava la tabella delle sostituzioni. L'AI legge il
// foglio come una persona e lo riscrive nella forma che il parser capisce.
//
// ⚠️ tests/formatoDieta.test.js controlla che l'esempio qui sotto si legga
// come promesso: cambiando le regole, si cambia anche lui.
// ---------------------------------------------------------------------------

// Quello che l'AI risponde quando le si dà altro (la foto di un piatto, una
// scheda di allenamento): senza, le sue scuse finivano nella casella.
export const NESSUNA_DIETA = 'NESSUNA_DIETA'

export const ESEMPIO_DIETA = `GIORNO DI ALLENAMENTO
Colazione: una tazza di latte parzialmente scremato, 40-50g di cereali (cornflakes, fiocchi di riso o avena)
oppure: una tazza di latte + 3 fette biscottate con marmellata
oppure: un vasetto di yogurt greco + una porzione di frutta + 3 cucchiai di muesli
Spuntino: un pacchetto di crackers, un bicchiere di succo di frutta
oppure: una banana + 2 gallette
Pranzo: 80g di pasta o riso (oppure 100g di pane, oppure 4 fette di pan bauletto); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: riso con tonno e pomodori + frutta
Cena: 80g di pasta o riso (oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: trancio di salmone con verdure e patate + frutta
Spuntino serale: un bicchiere di latte parzialmente scremato, 10g di frutta secca

GIORNO DI RIPOSO
Colazione: una tazza di latte parzialmente scremato, 40-50g di cereali (cornflakes, fiocchi di riso o avena)
oppure: una tazza di latte + 3 fette biscottate con marmellata
oppure: un vasetto di yogurt greco + una porzione di frutta + 3 cucchiai di muesli
Pranzo: 80g di pasta o riso (oppure 100g di pane, oppure 4 fette di pan bauletto); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: riso con tonno e pomodori + frutta
Merenda: un vasetto di yogurt greco 0%, una porzione di frutta
oppure: 2 gallette con 6 fette di bresaola
Cena: 80g di pasta o riso (oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: trancio di salmone con verdure e patate + frutta
Spuntino serale: un bicchiere di latte parzialmente scremato, 10g di frutta secca

Note:
Sono previsti 20g di olio extravergine d'oliva al giorno, preferibilmente a crudo.
Sostituzioni della pasta (80g): riso, cous cous, farro 80g; gnocchi di patate 160-170g; pane 100g; patate 300g.
Pesce almeno 2-3 volte a settimana (filetti 200-250g, salmone o tonno 150g).`

const REGOLE_DIETA = [
  'Ogni giornata comincia con il suo titolo, da solo su una riga, tutto maiuscolo: "GIORNO DI ALLENAMENTO", "GIORNO DI RIPOSO", oppure "GIORNATA TIPO" se la dieta non distingue. Se la dieta ha più giornate diverse (es. "Giornata tipo 1", "Giornata tipo 2"), una per ciascuna, col nome com\'è scritto.',
  'Se un pasto cambia fra giorni di allenamento e di riposo (es. "Nei giorni di rest: …" e "Nei giorni di allenamento: …"), scrivi DUE giornate, GIORNO DI ALLENAMENTO e GIORNO DI RIPOSO, ognuna con TUTTI i suoi pasti: quelli uguali si ripetono in tutte e due. Anche se cambia UN SOLO pasto: mai un titolo di giornata in mezzo ai pasti.',
  'Un pasto per riga, sempre cominciando col suo nome e i due punti: "Colazione:", "Spuntino:", "Pranzo:", "Merenda:", "Cena:". Lo spuntino della mattina è "Spuntino", quello del pomeriggio è "Merenda", quello dopo cena o prima di dormire è "Spuntino serale". Pre e post allenamento: "Pre workout:", "Post workout:", ma SOLO se la dieta li scrive come pasti; i consigli generali su cosa mangiare prima, durante e dopo l\'allenamento vanno nelle note.',
  'Sulla riga del pasto, separati da punto e virgola, gli alimenti della prima proposta, con le quantità esattamente come sono scritte.',
  'Un ingrediente che si può sostituire con un altro (es. "80g di pasta oppure 100g di pane") resta sulla riga del pasto, tra parentesi: "80g di pasta (oppure 100g di pane)". Mai a inizio riga.',
  'Ogni altro modo di fare TUTTO il pasto (le liste "In alternativa è possibile consumare", "Esempi", "Opzione 2") va su una riga sua subito sotto il pasto, che comincia con "oppure: ".',
  'Calorie e macro solo se la dieta li scrive: una riga sotto il titolo della giornata, es. "2400 kcal, proteine 150 g, carboidrati 280 g, grassi 70 g". Mai inventarli o calcolarli.',
  'In fondo, dopo tutte le giornate, una riga "Note:" e sotto le indicazioni generali del nutrizionista (olio, sostituzioni, porzioni dei secondi, consigli), una per riga, riassunte senza perdere numeri. Nessuna riga delle note deve cominciare col nome di un pasto.',
  'Niente nome del paziente, nome o contatti del nutrizionista, numeri di pagina, intestazioni.',
  'Copia alimenti e quantità ESATTAMENTE: niente alimenti, grammi o pasti inventati, niente consigli aggiunti.',
  'Testo semplice: niente markdown (niente **, #, ---, elenchi puntati).',
]

export const PROMPT_AI_DIETA = `Riscrivi la dieta qui sotto nel formato che segue, senza aggiungere né togliere alimenti e senza inventare numeri che non ci sono. Rispondi solo con la dieta, senza commenti. Se il testo non è una dieta, rispondi solo: ${NESSUNA_DIETA}

Regole del formato:
${REGOLE_DIETA.map((r) => `- ${r}`).join('\n')}

Esempio:
${ESEMPIO_DIETA}

Ecco la dieta da riscrivere:
`

// Per una foto o un PDF che non si legge come testo: prima l'AI trascrive,
// poi la trascrizione si riscrive come un testo (come per le schede, dove
// leggere e riscrivere nella stessa chiamata era troppo per ministral).
export const PROMPT_TRASCRIVI_DIETA = `Trascrivi ESATTAMENTE il testo di questa dieta o piano alimentare, senza riscriverlo né interpretarlo: titoli, pasti, elenchi e tabelle nell'ordine in cui sono. Per ogni riga di tabella una riga, con le celle separate da " | ". Salta i numeri di pagina. Niente commenti. Se nell'immagine non c'è una dieta o un piano alimentare (per esempio è una foto di cibo, una scheda di allenamento, una persona), rispondi solo: ${NESSUNA_DIETA}`

// ---------------------------------------------------------------------------
// Le giornate rimesse al posto giusto, dopo l'AI.
//
// Il prompt chiede due giornate intere quando un pasto cambia fra allenamento
// e riposo, ma ministral non sempre lo fa: su un piano vero (lo spuntino del
// pomeriggio diverso nei giorni di rest e di allenamento, il resto uguale)
// ha copiato il foglio com'era, coi titoli IN MEZZO alla giornata:
//
//   Pranzo: …
//   Spuntino:
//   GIORNO DI RIPOSO
//   un vasetto di yogurt greco 0% …
//   GIORNO DI ALLENAMENTO
//   un pacchetto di crackers …
//   Cena: …
//
// e il parser ne faceva tre giornate rotte (colazione e pranzo; solo lo
// spuntino di riposo; lo spuntino di allenamento con la cena). Qui le si
// rimette in fila: una giornata per titolo, ognuna coi pasti in comune
// ripetuti, e il pasto che cambia col suo nome. Pre e post workout restano
// solo nel giorno di allenamento.
//
// E il nome degli spuntini secondo il posto: uno "Spuntino" dopo il pranzo è
// la merenda, dopo la cena è lo spuntino serale (il prompt lo chiede, l'AI a
// volte se lo scorda, e il parser lo metterebbe la mattina).
//
// E i pasti di pre e post workout via, se la dieta di partenza non li nomina:
// ministral se li inventava dai consigli "Prima/Dopo l'allenamento" delle note.
//
// Un testo già in ordine (titoli prima dei pasti) esce identico.
// ---------------------------------------------------------------------------

const RE_TITOLO_GIORNO = /^(giorn[oi]|giornat[ae]|nei\s+giorni)\b.*\b(allenamento|riposo|rest|workout)\b[^:]*:?$/i
const RE_GIORNATA_TIPO = /^giornat[ae]\s+tip[oi]\b[^:]*:?$/i
const RE_NOME_PASTO = /^(colazione|seconda\s+colazione|spuntino|pranzo|merenda|cena|pre[\s-]*(workout|allenamento)|post[\s-]*(workout|allenamento))\b/i
const RE_WORKOUT = /^(pre|post)[\s-]*(workout|allenamento)\b/i
const RE_NOTE = /^note\b\s*:?/i

function pastoDellaRiga(riga) {
  const m = String(riga).trim().match(/^([^:]{2,40}):\s*(.*)$/)
  if (!m || !RE_NOME_PASTO.test(m[1].trim())) return null
  return { nome: m[1].trim(), resto: m[2].trim() }
}

const eTitolo = (riga) => RE_TITOLO_GIORNO.test(String(riga).trim())
const eRiposo = (riga) => /\b(riposo|rest)\b/i.test(riga)
const eWorkout = (pasto) => Boolean(pasto && RE_WORKOUT.test(pasto.nome))

function senzaRigheVuoteAiBordi(righe) {
  let a = 0
  let b = righe.length
  while (a < b && !righe[a].trim()) a++
  while (b > a && !righe[b - 1].trim()) b--
  return righe.slice(a, b)
}

// Via i pasti di pre e post workout, con le righe che li seguono.
function senzaWorkout(righe) {
  const out = []
  let salta = false
  for (const riga of righe) {
    const pasto = pastoDellaRiga(riga)
    if (pasto) salta = eWorkout(pasto)
    else if (!riga.trim()) salta = false
    if (!salta) out.push(riga)
  }
  return out
}

function sdoppiaGiornate(righe) {
  const titoli = righe.map((r, i) => (eTitolo(r) ? i : -1)).filter((i) => i >= 0)
  const primoPasto = righe.findIndex((r) => pastoDellaRiga(r))
  // Niente titoli, o titoli prima dei pasti: è già in ordine.
  if (!titoli.length || primoPasto < 0 || titoli[0] < primoPasto) return righe

  const prima = senzaRigheVuoteAiBordi(righe.slice(0, titoli[0]).filter((r) => !RE_GIORNATA_TIPO.test(r.trim())))
  // "Spuntino:" lasciato vuoto subito sopra il primo titolo: è il pasto che
  // cambia, e il suo nome va dato al contenuto di ogni giornata.
  let condiviso = null
  const ultimo = pastoDellaRiga(prima[prima.length - 1] || '')
  if (ultimo && !ultimo.resto) {
    condiviso = ultimo.nome
    prima.pop()
  }

  // L'ultima giornata finisce dove ricomincia un pasto in comune: il primo
  // pasto (non di workout) dopo quello che cambia.
  const ultimoTitolo = titoli[titoli.length - 1]
  let fine = righe.length
  let visti = condiviso ? 1 : 0
  for (let i = ultimoTitolo + 1; i < righe.length; i++) {
    const pasto = pastoDellaRiga(righe[i])
    if (!pasto || eWorkout(pasto)) continue
    if (visti >= 1) {
      fine = i
      break
    }
    visti++
  }
  const dopo = senzaRigheVuoteAiBordi(righe.slice(fine))

  const giornate = titoli.map((t, k) => {
    let sezione = senzaRigheVuoteAiBordi(righe.slice(t + 1, k < titoli.length - 1 ? titoli[k + 1] : fine))
    if (condiviso && sezione.length && !pastoDellaRiga(sezione[0]) && !/^oppure\b/i.test(sezione[0].trim())) {
      sezione = [`${condiviso}: ${sezione[0].trim()}`, ...sezione.slice(1)]
    }
    const riposo = eRiposo(righe[t])
    const pezzi = [prima, riposo ? senzaWorkout(sezione) : sezione, riposo ? senzaWorkout(dopo) : dopo]
    const corpo = pezzi.filter((p) => p.length).flatMap((p, i) => (i ? ['', ...p] : p))
    return [righe[t].trim().replace(/:$/, '').toUpperCase(), ...corpo]
  })
  return giornate.flatMap((g, i) => (i ? ['', ...g] : g))
}

function nomiDegliSpuntini(righe) {
  let pranzo = false
  let cena = false
  return righe.map((riga) => {
    if (eTitolo(riga) || RE_GIORNATA_TIPO.test(riga.trim())) {
      pranzo = false
      cena = false
      return riga
    }
    const pasto = pastoDellaRiga(riga)
    if (!pasto) return riga
    const nome = pasto.nome.toLowerCase()
    if (nome === 'pranzo') pranzo = true
    if (nome === 'cena') cena = true
    if (nome !== 'spuntino' || !(pranzo || cena)) return riga
    return `${cena ? 'Spuntino serale' : 'Merenda'}: ${pasto.resto}`
  })
}

const RE_WORKOUT_NEL_TESTO = /\b(pre|post)[\s-]*(workout|allenamento)\b/i

/** Il testo dell'AI con le giornate intere e gli spuntini col nome giusto.
 *  `originale` è la dieta data all'AI: se non nomina pre e post workout, quei
 *  pasti sono inventati e si tolgono. */
export function sistemaGiornate(testo, originale) {
  const righe = String(testo || '').split('\n')
  const iNote = righe.findIndex((r) => RE_NOTE.test(r.trim()))
  const corpo = iNote < 0 ? righe : righe.slice(0, iNote)
  const note = iNote < 0 ? [] : righe.slice(iNote)
  const inventati = originale != null && !RE_WORKOUT_NEL_TESTO.test(originale)
  const giornate = sdoppiaGiornate(corpo)
  const sistemato = nomiDegliSpuntini(inventati ? senzaWorkout(giornate) : giornate)
  return [...senzaRigheVuoteAiBordi(sistemato), ...(note.length ? ['', ...note] : [])]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
