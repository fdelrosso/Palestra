// ---------------------------------------------------------------------------
// Programmazione: quante serie, quante ripetizioni, quanto recupero e quanti
// esercizi per ogni gruppo muscolare.
//
// Nasce da un difetto reale del generatore: dava a TUTTI gli esercizi le stesse
// serie/ripetizioni/recupero e lo stesso numero di esercizi per gruppo. Nelle
// schede vere non è così, per due motivi che la letteratura sull'allenamento
// dà per acquisiti:
//
//   1. UN ESERCIZIO NON VALE L'ALTRO. Uno squat con bilanciere e un curl non si
//      programmano uguale: i multiarticolari pesanti vogliono meno ripetizioni
//      e recuperi lunghi (2-3 minuti, fino a 3-5 sui fondamentali col
//      bilanciere), gli esercizi di isolamento più ripetizioni e 60-90 secondi,
//      dove il recupero corto aiuta invece di penalizzare.
//   2. UN GRUPPO NON VALE L'ALTRO. Petto, schiena e gambe reggono (e chiedono)
//      2-3 esercizi a seduta e 12-20 serie a settimana; bicipiti, tricipiti e
//      polpacci ne vogliono circa la metà — 1-2 esercizi e 8-12 serie — anche
//      perché lavorano già parecchio dentro le spinte e le trazioni.
//
// In più l'ordine conta: i guadagni sono maggiori sugli esercizi fatti PRIMA
// nella seduta, quindi i fondamentali vanno in testa e l'isolamento in coda, e
// i gruppi grandi prima dei piccoli.
//
// Il "modo" (forza / ipertrofia / resistenza) sposta tutta la tabella: sono i
// tre blocchi classici del continuum carico-ripetizioni (poche ripetizioni e
// carichi alti per la forza, 6-12 per l'ipertrofia, 15+ con recuperi corti per
// la resistenza).
//
// Fonti consultate (2026-09-08), tutte concordi sui numeri qui sopra:
//   - ACSM, linee guida sull'allenamento contro resistenza (aggiornamento 2026)
//   - Schoenfeld et al., loading recommendations / repetition continuum (PMC7927075)
//   - sintesi divulgative su volume settimanale e recuperi (Weightology, StrengthLog,
//     Barbell Medicine, Hevy)
// È comunque un'euristica per un'app personale, non una prescrizione medica.
// ---------------------------------------------------------------------------

import { normalizzaNome } from './eserciziLibreria'
import { boostGruppo } from './focus'
import { parseRecuperoSec } from './parseRecupero'

// Che tipo di esercizio è. Decide serie/ripetizioni/recupero e la posizione
// nella seduta.
export const TIPO = {
  FONDAMENTALE: 'fondamentale', // multiarticolare pesante col bilanciere (o trazioni)
  COMPOSTO: 'composto', // multiarticolare, ma macchina/manubri/corpo libero
  ISOLAMENTO: 'isolamento', // monoarticolare
  CORE: 'core', // addome
  CARDIO: 'cardio',
}

// Ordine in cui i tipi entrano nella seduta: prima il pesante, poi il resto.
const ORDINE_TIPO = {
  [TIPO.FONDAMENTALE]: 0,
  [TIPO.COMPOSTO]: 1,
  [TIPO.ISOLAMENTO]: 2,
  [TIPO.CORE]: 3,
  [TIPO.CARDIO]: 4,
}

// I fondamentali riconosciuti per nome: sono pochi e vale la pena elencarli,
// invece di indovinarli. Li rilegge anche lib/livello: sono esattamente gli
// esercizi che separano chi ha appena cominciato da chi va in palestra da un
// po', quindi l'elenco dev'essere UNO — se ne aggiungi uno qui, cambia in
// entrambi i posti insieme.
export const FONDAMENTALI = [
  'squat bilanciere', 'squat frontale', 'stacco da terra', 'stacco sumo', 'stacco rumeno',
  'panca piana bilanciere', 'panca inclinata bilanciere', 'panca declinata bilanciere',
  'lento avanti bilanciere (military)', 'rematore bilanciere', 'rematore pendlay',
  'trazioni presa prona', 'trazioni presa supina (chin-up)', 'trazioni presa neutra',
].map(normalizzaNome)

// Parole che indicano un multiarticolare anche fuori dall'elenco sopra.
const CHIAVI_COMPOSTO = [
  'panca', 'chest press', 'spinte', 'dips', 'piegament', 'push-up',
  'lat machine', 'pulley', 'rematore', 'trazion', 'pull down', 'pulldown',
  'leg press', 'pressa', 'hack squat', 'squat', 'affond', 'split squat', 'step up',
  'goblet', 'gambe tese', 'stacco',
  'lento avanti', 'military', 'arnold', 'shoulder press', 'tirate al mento', 'upright',
  'presa stretta', 'multipower', 'smith',
]

/**
 * Che tipo è questo esercizio.
 * @param {string} nome
 * @param {string} [gruppo] id del gruppo muscolare (lib/muscoli)
 */
export function tipoEsercizio(nome, gruppo) {
  if (gruppo === 'cardio') return TIPO.CARDIO
  if (gruppo === 'addome') return TIPO.CORE
  const n = normalizzaNome(nome)
  if (!n) return TIPO.ISOLAMENTO
  if (FONDAMENTALI.includes(n)) return TIPO.FONDAMENTALE
  // La famiglia sa cos'è l'esercizio meglio di una parola trovata nel nome.
  if (FAMIGLIE_ISOLAMENTO.has(famigliaEsercizio(nome))) return TIPO.ISOLAMENTO
  if (CHIAVI_COMPOSTO.some((k) => n.includes(k))) return TIPO.COMPOSTO
  return TIPO.ISOLAMENTO
}

// ---------------------------------------------------------------------------
// Famiglie di movimento. Due esercizi della stessa famiglia sono lo stesso
// esercizio con un'altra impugnatura: "push down alla corda" e "push down alla
// barra", o "squat" e "squat frontale". Metterli nella stessa seduta non
// aggiunge niente e toglie spazio a quello che manca — tipicamente i
// femorali, che così restano fuori da un allenamento di gambe.
// Chi non rientra in nessuna famiglia fa famiglia a sé (vedi famigliaEsercizio),
// quindi non blocca mai nessun altro.
// ---------------------------------------------------------------------------
// L'ordine conta: si riconosce per PAROLA CHIAVE, quindi le famiglie con un
// nome inequivocabile ("curl", "leg curl") devono venire prima di quelle con
// parole generiche ("panca"). Altrimenti "Curl panca inclinata" finisce tra le
// distensioni su panca inclinata, che è l'esatto contrario di quello che è.
const FAMIGLIE = [
  // --- isolamento: nomi specifici, vanno riconosciuti per primi -----------
  ['leg-extension', ['leg extension']],
  ['leg-curl', ['leg curl']], // prima di 'curl', se no diventa un curl per bicipiti
  ['polpaccio', ['calf', 'polpacc']],
  ['curl', ['curl', 'hammer', 'martello', 'scott', 'preacher', 'spider']],
  ['estensione-tricipiti', ['push down', 'pushdown', 'french press', 'estensioni sopra', 'estensione manubrio', 'kickback']],
  ['croci', ['croci', 'pectoral', 'pec deck']],
  ['alzate-laterali', ['alzate laterali', 'tirate al mento', 'upright']],
  ['alzate-frontali', ['alzate frontali']],
  ['deltoide-posteriore', ['alzate posteriori', 'rear delt', 'reverse pec', 'face pull']],
  ['trapezio', ['scrollate', 'shrug']],
  ['pullover', ['pullover']],
  // --- multiarticolari ----------------------------------------------------
  ['squat', ['squat', 'hack', 'leg press', 'pressa', 'goblet']],
  ['affondo', ['affond', 'split squat', 'step up', 'bulgari']],
  ['stacco', ['stacco', 'gambe tese', 'hyperext', 'iperestensioni']],
  ['spinta-inclinata', ['panca inclinata']],
  ['spinta-orizzontale', ['panca piana', 'panca declinata', 'chest press', 'spinte al multipower', 'piegament', 'push-up']],
  ['dips', ['dips']],
  ['trazione-verticale', ['trazion', 'lat machine', 'chin', 'pull down', 'pulldown']],
  ['trazione-orizzontale', ['rematore', 'pulley', 'row ']],
  ['spinta-verticale', ['lento avanti', 'military', 'arnold', 'shoulder press']],
  // --- addome -------------------------------------------------------------
  ['crunch', ['crunch', 'sit-up', 'situp', 'v-up', 'bicycle']],
  ['plank', ['plank', 'hollow', 'ab wheel']],
  ['leg-raise', ['leg raise', 'mountain climber']],
  ['rotazione', ['russian twist']],
]

// Famiglie che sono monoarticolari per definizione: qualunque cosa ci finisca
// dentro è isolamento, anche se nel nome compare una parola da multiarticolare
// ("curl su panca inclinata" resta un curl).
const FAMIGLIE_ISOLAMENTO = new Set([
  'leg-extension', 'leg-curl', 'polpaccio', 'curl', 'estensione-tricipiti',
  'croci', 'alzate-laterali', 'alzate-frontali', 'deltoide-posteriore',
  'trapezio', 'pullover',
])

export function famigliaEsercizio(nome) {
  const n = normalizzaNome(nome)
  if (!n) return ''
  for (const [famiglia, chiavi] of FAMIGLIE) {
    if (chiavi.some((k) => n.includes(k.trim()))) return famiglia
  }
  return 'x:' + n
}

// I tre modi di allenarsi, con le etichette per la UI.
export const MODI = [
  {
    id: 'forza',
    label: 'Forza',
    descrizione: 'Carichi alti e poche ripetizioni, recuperi lunghi.',
  },
  {
    id: 'ipertrofia',
    label: 'Massa muscolare',
    descrizione: 'Il classico 6-12 ripetizioni, tanto volume: è il modo che fa crescere.',
  },
  {
    id: 'resistenza',
    label: 'Dimagrimento e resistenza',
    descrizione: 'Ripetizioni alte e recuperi corti: si tiene alto il ritmo.',
  },
]

export const MODO_DEFAULT = 'ipertrofia'

/**
 * La prescrizione per ogni combinazione modo × tipo di esercizio.
 * Le ripetizioni sono un RANGE apposta: si sale di carico quando si completa
 * tutto il range (doppia progressione), ed è così che si progredisce senza
 * dover ricalcolare percentuali di massimale.
 */
export const PRESCRIZIONI = {
  forza: {
    [TIPO.FONDAMENTALE]: { serie: '5', ripetizioni: '4-6', recupero: '3min' },
    [TIPO.COMPOSTO]: { serie: '4', ripetizioni: '6-8', recupero: '2,30min' },
    [TIPO.ISOLAMENTO]: { serie: '3', ripetizioni: '8-10', recupero: '1,30min' },
    [TIPO.CORE]: { serie: '3', ripetizioni: '10-12', recupero: '1min' },
    [TIPO.CARDIO]: { serie: '1', ripetizioni: '10 min', recupero: '' },
  },
  ipertrofia: {
    [TIPO.FONDAMENTALE]: { serie: '4', ripetizioni: '6-8', recupero: '2,30min' },
    [TIPO.COMPOSTO]: { serie: '4', ripetizioni: '8-10', recupero: '2min' },
    [TIPO.ISOLAMENTO]: { serie: '3', ripetizioni: '10-12', recupero: '1,15min' },
    [TIPO.CORE]: { serie: '3', ripetizioni: '12-15', recupero: '1min' },
    [TIPO.CARDIO]: { serie: '1', ripetizioni: '10 min', recupero: '' },
  },
  resistenza: {
    [TIPO.FONDAMENTALE]: { serie: '3', ripetizioni: '12-15', recupero: '1,30min' },
    [TIPO.COMPOSTO]: { serie: '3', ripetizioni: '12-15', recupero: '1min' },
    [TIPO.ISOLAMENTO]: { serie: '3', ripetizioni: '15-20', recupero: '45"' },
    [TIPO.CORE]: { serie: '3', ripetizioni: '15-20', recupero: '45"' },
    [TIPO.CARDIO]: { serie: '1', ripetizioni: '15 min', recupero: '' },
  },
}

// Alza un range di ripetizioni fino a un minimo, spostandolo tutto ("4-6" con
// minimo 8 diventa "8-10"): serve al principiante, per cui poche ripetizioni
// vogliono dire carichi che non sa ancora gestire. Tocca SOLO le stringhe che
// sono davvero un numero o un range — "10 min" del cardio resta "10 min".
function alzaRipetizioni(testo, minimo) {
  if (!minimo) return testo
  const m = String(testo || '').match(/^(\d+)(?:\s*-\s*(\d+))?$/)
  if (!m) return testo
  const da = Number(m[1])
  if (da >= minimo) return testo
  const salto = minimo - da
  return m[2] ? `${da + salto}-${Number(m[2]) + salto}` : String(da + salto)
}

/**
 * La prescrizione per un esercizio, gia' adattata al livello di chi si allena.
 *
 * Il livello arriva come REGOLE gia' risolte (lib/livello → regoleLivello), non
 * come id: sono numeri, e cosi' questo file non ha bisogno di importare
 * lib/livello — che invece importa i fondamentali da qui.
 *
 * @param {string} modo forza | ipertrofia | resistenza
 * @param {string} tipo lib/programmazione TIPO
 * @param {{serieDelta?:number, ripMinime?:number}|null} [livello]
 */
export function prescrizione(modo, tipo, livello) {
  const tabella = PRESCRIZIONI[modo] || PRESCRIZIONI[MODO_DEFAULT]
  const base = tabella[tipo] || tabella[TIPO.ISOLAMENTO]
  // Il cardio non ha ne' serie ne' ripetizioni da abbassare: sono minuti.
  if (!livello || tipo === TIPO.CARDIO) return base
  const serie = String(
    Math.max(2, (parseInt(base.serie, 10) || 3) + (livello.serieDelta || 0)),
  )
  const ripetizioni = alzaRipetizioni(base.ripetizioni, livello.ripMinime)
  if (serie === base.serie && ripetizioni === base.ripetizioni) return base
  return { ...base, serie, ripetizioni }
}

/**
 * Quanto "spazio" merita ogni gruppo in una seduta.
 *   min/max — esercizi per seduta: 2-4 sui gruppi grandi, 1-2 sui piccoli.
 *   peso    — a chi va l'esercizio in più quando avanza tempo.
 *   ordine  — chi viene prima nella seduta (i grandi prima, cardio in fondo).
 * I gruppi piccoli ne prendono meno anche perché lavorano già dentro le
 * spinte (tricipiti) e le trazioni (bicipiti).
 */
export const VOLUME_GRUPPO = {
  gambe: { min: 2, max: 4, peso: 3, ordine: 0 },
  petto: { min: 2, max: 4, peso: 3, ordine: 1 },
  schiena: { min: 2, max: 4, peso: 3, ordine: 1 },
  spalle: { min: 1, max: 3, peso: 2, ordine: 2 },
  tricipiti: { min: 1, max: 2, peso: 1, ordine: 3 },
  bicipiti: { min: 1, max: 2, peso: 1, ordine: 3 },
  addome: { min: 1, max: 3, peso: 1, ordine: 4 },
  cardio: { min: 1, max: 1, peso: 1, ordine: 5 },
}

/**
 * Lo spazio di un gruppo nella seduta, già tenendo conto del focus dell'atleta.
 *
 * Un muscolo sotto focus prende un esercizio in più (`max`), è più difficile che
 * resti fuori quando il tempo è poco (`min` e `focus`, che protegge dai tagli),
 * ed è il primo servito quando avanza tempo (`peso`). L'`ordine` si sposta di
 * poco — mezza posizione per livello di focus — quanto basta a far aprire la
 * seduta al muscolo che conta *tra i suoi pari*, senza mai mandare l'isolamento
 * davanti ai fondamentali: quello lo decide il tipo di esercizio, non il focus.
 *
 * Il LIVELLO entra solo sul `max`: un principiante prende un esercizio in meno
 * per gruppo. Non tocca il minimo — un gruppo scelto non può sparire — e non
 * tocca l'ordine: la seduta si apre col pesante a qualunque livello.
 *
 * @param {string} gruppo
 * @param {{boost?:Record<string,number>}} [focus] vedi lib/focus
 * @param {{eserciziDelta?:number}|null} [livello] regole gia' risolte, vedi lib/livello
 */
export function volumeGruppo(gruppo, focus, livello) {
  const base = VOLUME_GRUPPO[gruppo] || { min: 1, max: 3, peso: 2, ordine: 2 }
  const b = boostGruppo(focus, gruppo)
  const d = livello?.eserciziDelta || 0
  if (!b) return { ...base, max: Math.max(base.min, base.max + d), focus: 0 }
  return {
    // Il minimo sale di uno solo: il focus dà lavoro in più, non trasforma i
    // bicipiti nel gruppo più voluminoso della seduta.
    min: base.min + 1,
    max: Math.max(base.min + 1, base.max + b + d),
    peso: base.peso + b,
    ordine: base.ordine - 0.5 * b,
    focus: b,
  }
}

// Quanto dura davvero un esercizio: le serie durano ~40 secondi l'una, poi c'è
// il recupero, più un minuto per spostarsi e sistemare i carichi. È da qui che
// esce il numero di esercizi che stanno in 30, 45, 60 o 90 minuti — non da una
// divisione a occhio.
const SEC_SERIE = 40
const SEC_TRANSIZIONE = 45

// Riscaldamento e serie di avvicinamento, tolti dal tempo disponibile. È
// proporzionale alla seduta: cinque minuti fissi, su un allenamento da mezz'ora,
// si mangiano un esercizio intero.
function secRiscaldamento(durataMin) {
  const m = Math.min(8, Math.max(3, Math.round((Number(durataMin) || 60) * 0.1)))
  return m * 60
}

export function tempoEsercizioSec(presc) {
  const nSerie = Math.max(1, parseInt(presc.serie, 10) || 3)
  const rec = parseRecuperoSec(presc.recupero) || 0
  return nSerie * (SEC_SERIE + rec) + SEC_TRANSIZIONE
}

/**
 * Distribuisce gli esercizi tra i gruppi scelti, dentro il tempo disponibile.
 *
 * Parte dal minimo di ogni gruppo, poi aggiunge un esercizio alla volta al
 * gruppo che "se lo merita" di più (peso più alto, meno esercizi finora),
 * finché il tempo regge. Se non basta nemmeno per i minimi, taglia partendo dal
 * gruppo meno prioritario, ma lascia sempre almeno un esercizio a testa: un
 * gruppo scelto dall'utente non può sparire.
 *
 * Il focus (lib/focus) entra qui due volte: i suoi gruppi partono da un minimo
 * più alto e vengono tagliati per ultimi. Il livello (lib/livello) entra sui
 * tetti e sul COSTO di un esercizio: a un principiante ogni esercizio costa
 * meno (una serie in meno) ma gliene tocca comunque uno in meno per gruppo —
 * il tempo risparmiato non deve tornare indietro come volume.
 *
 * @param {{ gruppi: string[], durataMin: number, modo: string, focus?: object,
 *           livello?: object|null,
 *           tipoPerIndice?: (gruppo:string, i:number)=>string }} opts
 * @returns {{ quote: Record<string, number>, tempoStimatoSec: number }}
 */
export function quoteEsercizi({
  gruppi,
  durataMin,
  modo = MODO_DEFAULT,
  focus,
  livello,
  tipoPerIndice,
}) {
  const lista = (gruppi || []).filter(Boolean)
  if (lista.length === 0) return { quote: {}, tempoStimatoSec: 0 }

  const riscaldamento = secRiscaldamento(durataMin)
  const budget = Math.max(0, (Number(durataMin) || 60) * 60 - riscaldamento)

  // Che tipo sarà l'i-esimo esercizio di un gruppo: senza saperlo davvero, si
  // assume il normale ordine di una seduta (pesante → composto → isolamento).
  const tipoDi =
    tipoPerIndice ||
    ((gruppo, i) => {
      if (gruppo === 'cardio') return TIPO.CARDIO
      if (gruppo === 'addome') return TIPO.CORE
      // Senza focus: qui si indovina che tipo di esercizio sarà, e un bicipite
      // sotto focus resta un bicipite — non diventa un fondamentale pesante.
      const grande = volumeGruppo(gruppo).peso >= 3
      if (i === 0) return grande ? TIPO.FONDAMENTALE : TIPO.COMPOSTO
      if (i === 1) return TIPO.COMPOSTO
      return TIPO.ISOLAMENTO
    })

  const costo = (gruppo, i) => tempoEsercizioSec(prescrizione(modo, tipoDi(gruppo, i), livello))

  const quote = {}
  let tempo = 0
  // 1) I minimi.
  for (const g of lista) {
    quote[g] = 0
    for (let i = 0; i < volumeGruppo(g, focus, livello).min; i += 1) {
      tempo += costo(g, i)
      quote[g] += 1
    }
  }

  // 2) Se si sfora, si taglia dal gruppo meno prioritario (mai sotto 1). I
  // muscoli del focus si toccano per ultimi: sono il motivo per cui questa
  // scheda è fatta così.
  const perPriorita = [...lista].sort((a, b) => {
    const va = volumeGruppo(a, focus, livello)
    const vb = volumeGruppo(b, focus, livello)
    return va.focus - vb.focus || vb.ordine - va.ordine
  })
  let sicurezza = 0
  while (tempo > budget && sicurezza < 50) {
    sicurezza += 1
    const g = perPriorita.find((x) => quote[x] > 1)
    if (!g) break
    quote[g] -= 1
    tempo -= costo(g, quote[g])
  }

  // 3) Se avanza tempo, si aggiunge dove serve di più — ma non oltre il tetto
  // di esercizi che il livello si porta dietro. Serve perché le due leve del
  // livello altrimenti si annullano: con una serie in meno ogni esercizio costa
  // meno, quindi nello stesso tempo ne entrerebbero DI PIÙ, e un principiante
  // si ritroverebbe la seduta più lunga di tutti. 0 = nessun tetto.
  const tettoSeduta = livello?.eserciziMaxSeduta || Infinity
  const totale = () => lista.reduce((n, g) => n + quote[g], 0)
  sicurezza = 0
  while (sicurezza < 50) {
    sicurezza += 1
    if (totale() >= tettoSeduta) break
    const candidati = lista
      .filter((g) => quote[g] < volumeGruppo(g, focus, livello).max)
      .sort((a, b) => {
        const va = volumeGruppo(a, focus, livello)
        const vb = volumeGruppo(b, focus, livello)
        // Chi ha più "peso" per esercizio già assegnato viene servito prima.
        return vb.peso / (quote[b] + 1) - va.peso / (quote[a] + 1) || va.ordine - vb.ordine
      })
    const g = candidati.find((x) => tempo + costo(x, quote[x]) <= budget)
    if (!g) break
    tempo += costo(g, quote[g])
    quote[g] += 1
  }

  return { quote, tempoStimatoSec: tempo + riscaldamento }
}

/**
 * Ordina gli esercizi di una seduta come andrebbero fatti: prima i gruppi
 * grandi, e dentro ogni gruppo prima il pesante. Serve perché i risultati sono
 * migliori sugli esercizi fatti quando si è freschi. Il gruppo sotto focus
 * guadagna mezza posizione per livello: sale davanti ai suoi pari, non davanti
 * ai fondamentali.
 */
export function ordinaSeduta(esercizi, focus) {
  return [...esercizi].sort((a, b) => {
    const va = volumeGruppo(a.gruppo, focus)
    const vb = volumeGruppo(b.gruppo, focus)
    if (va.ordine !== vb.ordine) return va.ordine - vb.ordine
    // A parità di posizione apre la seduta il muscolo su cui si vuole insistere:
    // è lì che si rende di più, ed è il motivo per cui la scheda è fatta così.
    if (va.focus !== vb.focus) return vb.focus - va.focus
    if (a.gruppo !== b.gruppo) return a.gruppo.localeCompare(b.gruppo)
    return ORDINE_TIPO[a.tipo] - ORDINE_TIPO[b.tipo]
  })
}

// Il primo numero di un range di ripetizioni ("8-10" → 8, "12" → 12).
function primeRipetizioni(testo) {
  const m = String(testo || '').match(/\d+/)
  return m ? Number(m[0]) : 0
}

/**
 * Come si allena questa persona, letto dalle ripetizioni che usa di solito.
 * Serve a far somigliare l'allenamento consigliato a quelli che fa davvero,
 * senza però copiare lo stesso schema su ogni esercizio.
 * @param {{ripetizioni?:string}} stileGrezzo da analizzaStorico
 */
export function modoDaStile(stileGrezzo) {
  const rip = primeRipetizioni(stileGrezzo?.ripetizioni)
  if (!rip) return MODO_DEFAULT
  if (rip <= 6) return 'forza'
  if (rip >= 13) return 'resistenza'
  return 'ipertrofia'
}

export function modoDi(id) {
  return MODI.find((m) => m.id === id) || MODI.find((m) => m.id === MODO_DEFAULT)
}
