import { useEffect, useState } from 'react'

// Router minimale basato sul percorso (/schede, /dieta/oggi), senza dipendenze.
// Supporta il tasto "indietro" del telefono.
//
// ⚠️ Una pagina nuova va aggiunta in `routes` qui sotto e due volte in
// `vercel.json`: nei `rewrites` (il server manda all'app solo i percorsi
// elencati lì, il resto è 404; il service worker legge la stessa lista in
// vite.config.js) e negli `headers`, con noindex (Google non fa l'accesso, per
// lui ogni pagina dell'app è la schermata "Benvenuto"). Nella sitemap no: lì
// ci sono solo l'ingresso e le pagine statiche (/privacy, /termini, che non
// sono dell'app). tests/percorsi.test.js controlla che combacino.
//
// Fino al 2026-09-30 le pagine stavano dopo il # (#/schede): i vecchi indirizzi
// (segnalibri, link salvati) si riscrivono all'avvio, vedi daHashVecchio.

export function parse(percorso) {
  const path = String(percorso || '').split(/[?#]/)[0]
  const seg = path.split('/').filter(Boolean) // es. "/scheda/abc" -> ["scheda","abc"]
  // La pagina iniziale è la home a riquadri; il calendario sta nello Storico
  // della sezione Allenamento (/calendario), l'elenco delle schede su /schede.
  if (seg.length === 0) return { name: 'inizio' }
  if (seg[0] === 'profilo') return { name: 'profilo' }
  if (seg[0] === 'messaggi') return { name: 'messaggi' }
  if (seg[0] === 'altro') return { name: 'altro' }
  if (seg[0] === 'schede') return { name: 'home' }
  if (seg[0] === 'nuova') return { name: 'nuova' }
  if (seg[0] === 'crea') return { name: 'editor', id: null }
  if (seg[0] === 'nuovo-allenamento') return { name: 'nuovo-allenamento' }
  if (seg[0] === 'importa') return { name: 'importa' }
  if (seg[0] === 'allenamento') return { name: 'allenamento' }
  if (seg[0] === 'calendario') return { name: 'calendario' }
  if (seg[0] === 'storico') return { name: 'storico' }
  if (seg[0] === 'schede-generali') return { name: 'schede-generali' }
  if (seg[0] === 'consigliato') return { name: 'consigliato' }
  if (seg[0] === 'amici') return { name: 'amici' }
  if (seg[0] === 'feed') return { name: 'feed' }
  if (seg[0] === 'cerca') return { name: 'cerca' }
  if (seg[0] === 'chat' && seg[1]) return { name: 'chat', id: seg[1] }
  if (seg[0] === 'foto') return { name: 'foto' }
  if (seg[0] === 'schede-prefatte') return { name: 'schede-prefatte' }
  if (seg[0] === 'lavoro') {
    if (seg[1] === 'atleti') return { name: 'atleti' }
    if (seg[1] === 'foto') return { name: 'foto-atleti' }
    return { name: 'lavoro' }
  }
  if (seg[0] === 'esercizi') {
    if (!seg[1]) return { name: 'esercizi' }
    return { name: 'esercizi-gruppo', gruppo: seg[1] }
  }
  // "Condivisi" non e' piu' una pagina: sta dentro Amici. Il vecchio indirizzo
  // porta li', cosi' un segnalibro o un'app installata non finiscono nel vuoto.
  if (seg[0] === 'condivisi') return { name: 'amici' }
  if (seg[0] === 'dati') return { name: 'dati' }
  if (seg[0] === 'dieta') {
    if (!seg[1]) return { name: 'dieta' }
    // "Dieta giornaliera", e dentro un pasto: le sue alternative.
    if (seg[1] === 'oggi') return { name: 'dieta-oggi', pasto: seg[2] || null }
    // "Nuova dieta": si sceglie da dove partire (PDF, macro, calcolo).
    if (seg[1] === 'crea') return { name: 'dieta-crea' }
    if (seg[1] === 'nuova') return { name: 'dieta-editor', id: null }
    if (seg[1] === 'preferenze') return { name: 'dieta-preferenze' }
    if (seg[1] === 'importa') return { name: 'dieta-importa' }
    if (seg[1] === 'macro') return { name: 'dieta-macro' }
    if (seg[2] === 'schema') return { name: 'dieta-schema', id: seg[1] }
    return { name: 'dieta-editor', id: seg[1] }
  }
  if (seg[0] === 'scheda' && seg[1]) {
    if (seg[2] === 'edit') return { name: 'editor', id: seg[1] }
    return { name: 'scheda', id: seg[1] }
  }
  return { name: 'inizio' }
}

// Il cambio di pagina fatto da navigate: pushState non manda eventi da solo.
const CAMBIO = 'cambio-pagina'

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.pathname))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.pathname))
    window.addEventListener(CAMBIO, onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener(CAMBIO, onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])
  return route
}

// ---- LA PILA DELLE PAGINE -------------------------------------------------
//
// Il browser non dice quali pagine ci sono dietro a quella di adesso, e senza
// saperlo la freccia di un editor poteva solo fare history.back(): da
// "Nuova dieta → Calorie e macro → editor → schema → editor" per uscire si
// ripassava da ogni pagina, moduli vuoti compresi. Qui si tiene la pila: ogni
// voce della cronologia ha la sua posizione in `history.state.pos`, e `pila`
// dice che indirizzo c'è a ogni posizione. Sta in sessionStorage perché
// l'app installata su iPhone si ricarica spesso tornando in primo piano, e la
// cronologia (state compreso) sopravvive al ricaricamento.
// v2: fino alla v1 la pila teneva gli hash (#/schede), che ora non vogliono
// dire più niente.
const CHIAVE_PILA = 'rotte-pila:v2'
const percorsoDi = (path) => (path.startsWith('/') ? path : '/' + path)
const percorsoAdesso = () => window.location.pathname || '/'

let pila = []
let pos = 0
// Dove andare appena finito un salto all'indietro (vedi esci).
let dopoIlSalto = null

function salvaPila() {
  try {
    sessionStorage.setItem(CHIAVE_PILA, JSON.stringify(pila))
  } catch {
    /* senza storage la pila vale finché la pagina è aperta */
  }
}

// La posizione nella voce di cronologia di adesso, tenendo quello che c'era.
function timbra(p) {
  window.history.replaceState({ ...(window.history.state || {}), pos: p }, '')
}

// Dopo ogni cambio di voce: dove siamo. Una voce senza timbro è nata fuori da
// navigate (un # scritto a mano nella barra): è una voce nuova in cima.
function allinea() {
  // Un vecchio indirizzo aperto ad app già caricata non ricarica la pagina:
  // si riscrive qui (vedi daHashVecchio).
  daHashVecchio()
  const p = window.history.state?.pos
  if (Number.isInteger(p)) {
    pos = p
  } else {
    pos += 1
    pila.length = pos
    timbra(pos)
  }
  pila[pos] = percorsoAdesso()
  salvaPila()
  if (dopoIlSalto) {
    const dove = dopoIlSalto
    dopoIlSalto = null
    if (percorsoAdesso() !== percorsoDi(dove)) navigate(dove)
  }
}

// Un indirizzo di prima, `/#/dieta/oggi`, diventa `/dieta/oggi`. La query resta
// com'era: può portare il token di un link della mail (lib/linkEmail), che
// AccountContext deve ancora leggere. ⚠️ Solo gli hash che cominciano per
// "#/": `#access_token=…` è quel token, e va lasciato dov'è.
function daHashVecchio() {
  const h = window.location.hash || ''
  if (!h.startsWith('#/')) return
  const percorso = h.slice(1).split('?')[0]
  window.history.replaceState(window.history.state, '', percorso + (window.location.search || ''))
}

if (typeof window !== 'undefined') {
  daHashVecchio()
  const p = window.history.state?.pos
  if (Number.isInteger(p)) {
    try {
      pila = JSON.parse(sessionStorage.getItem(CHIAVE_PILA) || '[]') || []
    } catch {
      pila = []
    }
    pos = p
  } else {
    timbra(0)
  }
  pila[pos] = percorsoAdesso()
  salvaPila()
  // popstate per i salti nella cronologia (anche verso lo stesso indirizzo).
  window.addEventListener('popstate', allinea)
}

/**
 * Va a un indirizzo. `sostituisci: true` prende il posto della pagina di
 * adesso invece di aggiungersi: per le pagine che, fatto il loro lavoro, non
 * ha senso ritrovarsi tornando indietro (il modulo di una dieta già salvata).
 */
export function navigate(path, { sostituisci = false } = {}) {
  const percorso = percorsoDi(path)
  if (percorsoAdesso() === percorso) return
  // ⚠️ pushState/replaceState e non `location.assign`/`location.replace`: non
  // ricaricano la pagina e sono sincroni, quindi la posizione si scrive sulla
  // voce giusta. Il cambio di pagina lo si annuncia a mano.
  if (sostituisci) {
    window.history.replaceState({ ...(window.history.state || {}), pos }, '', percorso)
  } else {
    pos += 1
    pila.length = pos
    window.history.pushState({ pos }, '', percorso)
  }
  pila[pos] = percorso
  salvaPila()
  window.dispatchEvent(new Event(CAMBIO))
  // Riporta in cima quando si cambia schermata.
  window.scrollTo(0, 0)
}

/**
 * Cambia l'indirizzo della pagina di adesso senza andarci (nessun evento):
 * una dieta appena nata, che in cronologia deve diventare la SUA pagina.
 */
export function riscriviIndirizzo(path) {
  const percorso = percorsoDi(path)
  window.history.replaceState({ ...(window.history.state || {}), pos }, '', percorso)
  pila[pos] = percorso
  salvaPila()
}

/** La pagina subito dietro a quella di adesso, già letta (`{name, …}`), o null. */
export function paginaDietro() {
  return pos > 0 && pila[pos - 1] ? parse(pila[pos - 1]) : null
}

/**
 * La posizione della pagina di adesso nella cronologia: resta la stessa quando
 * ci si torna con la freccia, e cambia se la pagina si riapre da capo.
 */
export function posizioneAdesso() {
  return pos
}

export function goBack() {
  if (window.history.length > 1) window.history.back()
  else navigate('/')
}

/**
 * La freccia di chi sta dentro un flusso (un editor, i suoi passi): torna alla
 * prima pagina dietro che NON ne fa parte, saltando tutte quelle che sì.
 * `salta(rotta)` dice se una pagina è del flusso (riceve la rotta già letta,
 * `{name, id, …}`). `poi`: dove andare una volta usciti, se non ci si è già
 * (salvata una scheda nuova, si esce dalla creazione e si apre la scheda).
 * Se dietro non c'è niente di buono (si è entrati da un link), si va a
 * `riserva` al posto della pagina di adesso.
 */
export function esci({ salta, poi = null, riserva = '/' }) {
  let k = pos - 1
  while (k >= 0 && pila[k] && salta(parse(pila[k]))) k -= 1
  if (k < 0 || !pila[k]) {
    navigate(poi || riserva, { sostituisci: true })
    return
  }
  dopoIlSalto = poi
  window.history.go(k - pos)
}

export const routes = {
  inizio: () => '/', // la home a riquadri
  home: () => '/schede', // "Programmi" della sezione Allenamento
  scheda: (id) => `/scheda/${id}`,
  editor: (id) => (id ? `/scheda/${id}/edit` : '/crea'),
  nuova: () => '/nuova',
  nuovoAllenamento: () => '/nuovo-allenamento',
  importa: () => '/importa',
  allenamento: () => '/allenamento',
  calendario: () => '/calendario',
  storico: () => '/storico',
  schedeGenerali: () => '/schede-generali',
  consigliato: () => '/consigliato',
  amici: () => '/amici',
  feed: () => '/feed',
  cerca: () => '/cerca',
  chat: (id) => `/chat/${id}`,
  messaggi: () => '/messaggi',
  profilo: () => '/profilo',
  altro: () => '/altro',
  foto: () => '/foto',
  schedePrefatte: () => '/schede-prefatte',
  lavoro: () => '/lavoro',
  atleti: () => '/lavoro/atleti',
  fotoAtleti: () => '/lavoro/foto',
  esercizi: () => '/esercizi',
  eserciziGruppo: (id) => `/esercizi/${id}`,
  datiFisici: () => '/dati',
  dieta: () => '/dieta',
  dietaOggi: (pastoId) => (pastoId ? `/dieta/oggi/${pastoId}` : '/dieta/oggi'),
  dietaCrea: () => '/dieta/crea',
  dietaSchema: (id) => `/dieta/${id}/schema`,
  dietaEditor: (id) => (id ? `/dieta/${id}` : '/dieta/nuova'),
  dietaPreferenze: () => '/dieta/preferenze',
  dietaImporta: () => '/dieta/importa',
  dietaMacro: () => '/dieta/macro',
  // Fuori dall'app: la apre UserGate direttamente su "Password dimenticata".
  passwordDimenticata: () => '/password-dimenticata',
}
