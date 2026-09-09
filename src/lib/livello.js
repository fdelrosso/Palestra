// ---------------------------------------------------------------------------
// Livello di esperienza: da quanto e con quanta cognizione uno si allena.
//
// E' la terza domanda del motore, accanto alle altre due che gia' c'erano:
//   - l'OBIETTIVO (lib/schedePrefatte) dice COME allenarsi → serie, ripetizioni
//     e recuperi di tutta la scheda;
//   - il FOCUS (lib/focus) dice DOVE va il lavoro in piu';
//   - il LIVELLO (qui) dice CON COSA e QUANTO si puo' lavorare.
// Sono tre cose diverse e si sommano: si puo' volere massa, con focus sui
// bicipiti, da principiante — e la scheda che esce e' quella giusta per tutti e
// tre, non la media di niente.
//
// Cosa cambia davvero, in concreto (tre leve, tutte nel motore):
//   1. QUALI ESERCIZI. Ogni esercizio ha una difficolta' di ESECUZIONE (non di
//      fatica): `base` sono macchine, cavi, manubri e corpo libero, dove il
//      movimento e' guidato o comunque perdonabile; `medio` e' il bilanciere
//      libero e i fondamentali; `avanzato` e' quello che fa male se fatto male
//      — stacco da terra, squat frontale, rematore Pendlay, sprint. Un livello
//      prende gli esercizi fino alla sua difficolta' e non oltre. In piu' un
//      avanzato regge DUE multiarticolari pesanti nella stessa seduta, dove gli
//      altri ne prendono uno solo: senza questa deroga intermedio e avanzato
//      generavano quasi sempre la stessa scheda.
//   2. QUANTO VOLUME. Un principiante prende una serie in meno per esercizio,
//      un esercizio in meno per gruppo e un tetto di esercizi per seduta: la
//      prima cosa che deve succedere e' che impari il gesto e ci torni la
//      settimana dopo, non che finisca distrutto. Il tetto non e' ridondante —
//      senza, il tempo risparmiato sulle serie tornava indietro sotto forma di
//      esercizi in piu' (vedi il commento su `eserciziMaxSeduta`).
//   3. COME E' FATTA LA SETTIMANA. Quanti allenamenti si possono chiedere
//      (4 / 5 / 6) e se conviene partire da un full body. Sei sedute a
//      settimana non sono "piu' impegno": sono un problema di recupero, e a chi
//      ha appena iniziato tolgono piu' di quanto diano.
//
// ⚠️ Quello che il livello NON fa: vietare. Filtra solo quello che l'app
// PROPONE da sola; un esercizio scelto A MANO entra sempre, e nella lista di
// scelta gli esercizi sopra il livello restano visibili, con una freccia
// accanto. Il livello e' un consiglio che si e' chiesto, non un lucchetto.
//
// ⚠️ Il filtro vale ANCHE sugli esercizi che uno ha gia' nelle sue schede.
// La prima versione li lasciava passare ("se lo fai, lo sai fare"), e non
// reggeva: ogni profilo nuovo nasce con la scheda d'esempio del PT, quindi un
// principiante appena iscritto aveva gia' stacchi e panche tra i suoi esercizi
// "noti" e si ritrovava esattamente la scheda che il livello doveva evitargli.
//
// ⚠️ Chi non ha dichiarato un livello (i profili nati prima di questa funzione)
// non ha nessun limite: `regoleLivello('')` torna null e tutto il motore si
// comporta come prima. Quello che non si sa non si inventa, nemmeno in
// negativo — non si mette qualcuno tra i principianti perche' non ha risposto.
// ---------------------------------------------------------------------------

import { normalizzaNome } from './eserciziLibreria'
import { FONDAMENTALI } from './programmazione'

// Le tre voci, con la riga che spiega cosa vuol dire ognuna: si sceglie
// creando l'account e si cambia quando si vuole da "I miei dati".
export const LIVELLI = [
  {
    id: 'principiante',
    label: 'Principiante',
    descrizione:
      'Hai iniziato da poco o riparti dopo una lunga pausa: i gesti li devi ancora imparare.',
    effetto:
      'esercizi di base (macchine, cavi, manubri e corpo libero), una serie in meno per ' +
      'esercizio, ripetizioni mai sotto le otto e fino a quattro allenamenti a settimana',
  },
  {
    id: 'intermedio',
    label: 'Intermedio',
    descrizione:
      'Vai in palestra da un po’: conosci le basi e sai eseguire i fondamentali col bilanciere.',
    effetto:
      'tutti gli esercizi comuni, fondamentali col bilanciere compresi, con serie e ripetizioni ' +
      'piene e fino a cinque allenamenti a settimana',
  },
  {
    id: 'avanzato',
    label: 'Avanzato',
    descrizione: 'Ti alleni da anni: tecnica e intensità non sono un problema.',
    effetto:
      'tutto il catalogo (stacco da terra, squat frontale, rematore Pendlay, sprint), due ' +
      'multiarticolari pesanti nella stessa seduta e fino a sei allenamenti a settimana',
  },
]

export function livelloDi(id) {
  return LIVELLI.find((l) => l.id === id) || null
}

export function labelLivello(id) {
  return livelloDi(id)?.label || ''
}

// ---------------------------------------------------------------------------
// Difficolta' di ESECUZIONE di un esercizio. Non e' quanto stanca: e' quanto
// e' facile farlo storto. Una pressa 45° e' faticosissima e resta `base`,
// perche' il movimento e' guidato; uno stacco da terra con 40 kg e' leggero ed
// e' `avanzato`, perche' la schiena la si perde li'.
// ---------------------------------------------------------------------------

export const DIFFICOLTA = { BASE: 'base', MEDIO: 'medio', AVANZATO: 'avanzato' }

const RANGO = { base: 0, medio: 1, avanzato: 2 }

// ⚠️ Come in lib/eserciziLibreria, qui si cercano SOTTOSTRINGHE: le chiavi
// devono essere abbastanza lunghe da non pescare dentro altre parole ("chin"
// sta dentro "maCHINe", per questo si scrive "chin-up"), e le piu' specifiche
// vanno prima ("panca piana presa stretta" e' un bilanciere sopra la faccia,
// "lat machine presa stretta" e' un'altra cosa).
const AVANZATI = [
  'stacco da terra', 'stacco sumo', 'squat frontale', 'pendlay',
  'hiit', 'sprint', 'ab wheel', 'muscle up', 'clean', 'snatch', 'strappo', 'slancio',
]

// Quello che resta alla portata di chiunque, qualunque cosa dica il resto del
// nome. Due categorie diverse con la stessa conseguenza:
//
//   - l'ATTREZZO che perdona. Lo stesso gesto su una macchina, al multipower,
//     ai cavi o con due manubri e' un'altra cosa: il percorso e' guidato o il
//     peso e' diviso in due mani, e sbagliarlo costa molto meno. E' cosi' che
//     "Panca piana manubri" resta di tutti mentre "Panca piana" (come la scrive
//     un PT, cioe' col bilanciere) no.
//   - il MOVIMENTO di ISOLAMENTO. Un curl e' un curl anche quando si chiama
//     "Curl panca inclinata" — ⚠️ ed e' esattamente li' che si sbagliava, perche'
//     "panca inclinata" nell'elenco sotto vuol dire bilanciere. E' lo stesso
//     inciampo che lib/eserciziLibreria segnala per i gruppi muscolari.
//
// Non tocca gli AVANZATI, che si controllano prima: uno stacco resta uno stacco.
const SEMPRE_BASE = [
  // attrezzo guidato o carico diviso
  'manubri', 'macchina', 'machine', 'multipower', 'smith', 'cavi', 'cavo',
  'pressa', 'leg press', 'goblet', 'hack squat',
  // isolamento: monoarticolari, qualunque panca ci sia scritta accanto
  'curl', 'alzate', 'croci', 'pectoral', 'pec deck', 'push down', 'pushdown',
  'kickback', 'scrollate', 'shrug', 'face pull',
]

// Movimenti col bilanciere libero o a corpo libero. Ci sono anche le forme
// abbreviate con cui li scrivono i personal trainer nei messaggi ("military",
// "panca piana", "squat", "rematore", "stacco"): sono i nomi che arrivano
// davvero dentro l'app tramite l'import da testo.
const MEDI = [
  'trazion', 'chin-up', 'chin up', 'dips', 'bulgari', 'split squat', 'arnold',
  'hollow', 'leg raise alla sbarra', 'gambe tese', 'panca piana presa stretta',
  'panca piana', 'panca inclinata', 'panca declinata', 'lento avanti', 'military',
  'squat', 'rematore', 'stacco',
]

/**
 * Quanto e' difficile da eseguire questo esercizio.
 *
 * I fondamentali col bilanciere (lib/programmazione) sono `medio` per
 * definizione — sono LA cosa che un intermedio sa fare e un principiante no.
 * Chi non e' riconosciuto e' `base`: gli esercizi arrivano anche dalle schede
 * scritte a mano dai PT e dalla comunita', e con un nome che non conosciamo la
 * risposta onesta e' "non lo so", che qui vuol dire non mettersi di mezzo.
 *
 * @param {string} nome
 * @returns {'base'|'medio'|'avanzato'}
 */
export function difficoltaEsercizio(nome) {
  const n = normalizzaNome(nome)
  if (!n) return DIFFICOLTA.BASE
  // L'ordine è la regola: prima quello che resta difficile comunque, poi
  // l'attrezzo che perdona, poi il movimento.
  if (AVANZATI.some((k) => n.includes(k))) return DIFFICOLTA.AVANZATO
  if (SEMPRE_BASE.some((k) => n.includes(k))) return DIFFICOLTA.BASE
  if (MEDI.some((k) => n.includes(k))) return DIFFICOLTA.MEDIO
  if (FONDAMENTALI.includes(n)) return DIFFICOLTA.MEDIO
  return DIFFICOLTA.BASE
}

// ---------------------------------------------------------------------------
// Le regole: cosa cambia nel motore, livello per livello.
//
// Sono numeri, non funzioni, apposta — cosi' lib/programmazione li applica
// senza dover importare questo file (importa gia' lui i fondamentali da li',
// e due import incrociati sono un problema che non vale la pena avere).
// ---------------------------------------------------------------------------

const REGOLE = {
  principiante: {
    id: 'principiante',
    difficoltaMax: DIFFICOLTA.BASE,
    serieDelta: -1, // una serie in meno per esercizio (mai sotto 2)
    ripMinime: 8, // niente sotto le 8 ripetizioni: sono carichi che non sa ancora gestire
    eserciziDelta: -1, // un esercizio in meno per gruppo
    // ⚠️ Senza questo tetto il livello si ritorceva contro: con una serie in
    // meno ogni esercizio costa meno tempo, quindi nella stessa ora ne
    // entravano DI PIÙ — un full body da sette esercizi a chi ha appena
    // cominciato, cioè l'opposto di "leggero". Il tempo risparmiato sulle serie
    // resta risparmiato.
    eserciziMaxSeduta: 6,
    fondamentaliMax: 1,
    giorniMax: 4,
    preferisci: 'fullbody', // con poche sedute, tutto il corpo ogni volta
  },
  intermedio: {
    id: 'intermedio',
    difficoltaMax: DIFFICOLTA.MEDIO,
    serieDelta: 0,
    ripMinime: 0,
    eserciziDelta: 0,
    eserciziMaxSeduta: 0, // nessun tetto: decide il tempo che ha
    fondamentaliMax: 1,
    giorniMax: 5,
    preferisci: '',
  },
  avanzato: {
    id: 'avanzato',
    difficoltaMax: DIFFICOLTA.AVANZATO,
    serieDelta: 0,
    ripMinime: 0,
    eserciziDelta: 0,
    eserciziMaxSeduta: 0,
    // L'unica cosa che davvero separa un avanzato da un intermedio nel motore:
    // due multiarticolari pesanti nella stessa seduta (trazioni E stacco,
    // panca E lento avanti). E' programmazione da chi regge il carico e sa
    // recuperare; sotto, la regola resta uno solo per gruppo.
    fondamentaliMax: 2,
    giorniMax: 6,
    preferisci: '',
  },
}

/**
 * Le regole di un livello, o `null` se non ne e' stato dichiarato uno.
 * `null` significa "nessun limite": e' il comportamento che l'app aveva prima
 * che i livelli esistessero, ed e' quello che tocca ai profili piu' vecchi.
 *
 * @param {string|{id?:string}} livello id (com'e' salvato sul profilo) o regole gia' risolte
 * @returns {null | typeof REGOLE.principiante}
 */
export function regoleLivello(livello) {
  if (!livello) return null
  const id = typeof livello === 'string' ? livello : livello.id
  return REGOLE[id] || null
}

/**
 * Questo esercizio e' alla portata di chi ha dichiarato questo livello?
 * Senza livello dichiarato: si', sempre.
 * @param {ReturnType<typeof regoleLivello>} regole
 * @param {string} nome
 */
export function livelloAmmette(regole, nome) {
  if (!regole) return true
  return RANGO[difficoltaEsercizio(nome)] <= RANGO[regole.difficoltaMax]
}

/**
 * Quanti allenamenti a settimana ha senso proporre. Non e' un divieto morale:
 * chi vuole di piu' alza il proprio livello da "I miei dati", che e' la
 * domanda giusta da farsi prima di allenarsi sei volte a settimana.
 * @param {ReturnType<typeof regoleLivello>} regole
 * @param {number[]} possibili
 */
export function giorniPerLivello(regole, possibili) {
  if (!regole) return possibili
  const ok = possibili.filter((n) => n <= regole.giorniMax)
  // Non si torna mai una lista vuota: se qualcuno stringesse troppo il tetto
  // resterebbe comunque la struttura piu' leggera.
  return ok.length ? ok : possibili.slice(0, 1)
}

/** La riga da mostrare sotto una scheda generata ("Livello: principiante — …"). */
export function spiegazioneLivello(id) {
  const l = livelloDi(id)
  return l ? `Livello: ${l.label.toLowerCase()} — ${l.effetto}.` : ''
}
