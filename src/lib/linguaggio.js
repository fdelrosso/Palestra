// ---------------------------------------------------------------------------
// Il filtro delle PAROLE: parolacce, bestemmie, insulti e offese.
//
// Vale per TUTTO il testo che una persona scrive nell'app: i campi lo
// applicano mentre si scrive (installaFiltroLinguaggio, montato una volta in
// main.jsx), e i punti dove il testo arriva agli altri — commenti, chat, nome,
// username — lo ricontrollano prima di mandarlo (testoPulito / errorePerParole).
//
// Come riconosce le parole:
//   - minuscole, senza accenti, coi numeri al posto delle lettere riportati a
//     lettere ("c4zz0" → "cazzo", "$tronzo" → "stronzo");
//   - ogni lettera può ripetersi ("cazzzzo", "merdaaa"); una doppia resta
//     doppia ("cazzo" sì, "indicazione" no): gli schemi si scrivono normali;
//   - le lettere staccate ("c a z z o", "c.a.z.z.o") si riattaccano;
//   - le bestemmie sono due parole vicine ("porco dio", "dio cane"), in
//     qualsiasi ordine, anche attaccate ("porcodio").
// La sostituzione tiene la LUNGHEZZA: ogni lettera trovata diventa un "*",
// così nei campi il cursore resta dov'era.
//
// ⚠️ Le parole innocue che contengono una parolaccia restano libere: per
// questo quasi tutti gli schemi partono da inizio parola, e le eccezioni
// (cazzuola, inculcare, finocchio — che è anche un ortaggio della dieta)
// sono scritte qui sotto. Una parola nuova da bloccare va in PAROLE; se
// blocca qualcosa di innocuo, l'eccezione va in ECCEZIONI. Prove:
// tests/linguaggio.test.js.
// ---------------------------------------------------------------------------

// Schemi di UNA parola. `^` = deve essere l'inizio della parola (se no può
// stare anche dentro: "testadicazzo"); `*` in fondo = qualsiasi finale.
const PAROLE = [
  // parolacce
  'cazz*', 'kazz*', 'minchi*', 'merd*', 'stronz*', 'fancul*', 'vaffancul*', 'affancul*', '^culo', '^culi',
  '^culatton*', '^culon*', 'puttan*', '^troia', '^troie', '^zoccola', '^zoccole', '^mignott*',
  '^baldracc*', '^bagasc*', '^figa', '^fighe', '^fica', '^pompin*', '^bocchinar*', 'sborr*',
  '^incul*', 'coglion*', '^segaiol*', '^sputtan*', '^rompipalle', '^cornut*', '^cagacazz*',
  // insulti e offese
  '^bastard*', '^frocio', '^froci', '^froce', '^ricchion*', '^recchion*', '^negro', '^negri',
  '^negra', '^negre', '^terrone', '^terroni', '^mongoloid*', '^idiota', '^idioti', '^idiote',
  '^cretin*', '^deficient*', '^imbecill*', '^pirla',
  '^porco', '^porca', '^maiala', '^cagna',
  // inglese
  'fuck*', '^shit*', '^bitch*', '^cunt*', 'asshol*', 'motherfuck*', '^nigg*', '^fagg*',
  '^whore*', '^slut*', '^dickhead*', '^bastard*', '^retard*',
]

// Parole che uno schema sopra prenderebbe, ma che sono innocue.
const ECCEZIONI = new Set([
  'cazzuola', 'cazzuole', 'inculcare', 'inculcato', 'inculcata', 'inculcati', 'inculcate',
])

// Gli schemi che valgono solo per la parola INTERA (senza finali): "^culo"
// non deve prendere "culotte", "^figa" non "figata", "^negro" non "negroni".
const INTERE = new Set([
  '^culo', '^culi', '^troia', '^troie', '^zoccola', '^zoccole', '^figa', '^fighe', '^fica',
  '^frocio', '^froci', '^froce', '^negro', '^negri', '^negra', '^negre', '^terrone', '^terroni',
  '^idiota', '^idioti', '^idiote', '^pirla', '^rompipalle', '^porco', '^porca',
  '^maiala', '^cagna',
])

// "porco", "porca", "maiala", "cagna" da soli sono parole normali ("porca
// miseria", "la cagna del vicino"): diventano offese solo VICINO a un nome
// sacro. Stanno sopra solo per le bestemmie, e qui si tolgono dal giro delle
// parole singole.
const SOLO_IN_BESTEMMIA = new Set(['^porco', '^porca', '^maiala', '^cagna'])

// Le bestemmie: un nome sacro vicino a un'offesa, nei due ordini.
// ⚠️ Niente forme corte: le lettere si possono ripetere, e "dii" diventerebbe
// "di" — "un pezzo di stronzo" sarebbe una bestemmia.
const SACRI = ['dio', 'madonna', 'cristo', 'gesu', 'gesucristo', 'signore', 'santo', 'santi']
const OFFESE = [
  'cane', 'can', 'porco', 'porca', 'porci', 'maiale', 'maiala', 'boia', 'bestia', 'merda',
  'ladro', 'ladra', 'schifoso', 'schifosa', 'bastardo', 'bastarda', 'infame', 'puttana', 'troia',
  'zoccola', 'cagna', 'serpente', 'lurido', 'lurida', 'impestato', 'assassino', 'animale',
  'stronzo', 'stronza', 'vacca', 'impiccato', 'crocifisso', 'fottuto', 'bestione',
]

// ---------------------------------------------------------------------------
// Normalizzare senza cambiare la lunghezza (serve a censurare al posto giusto).
// ---------------------------------------------------------------------------

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '€': 'e' }

// Un carattere alla volta, sempre UN carattere in uscita.
function normaCarattere(c) {
  return c.normalize('NFD').charAt(0).toLowerCase().charAt(0) || c
}

// Un numero o un simbolo vale come lettera solo dentro una parola: "c4zz0" sì,
// "100kg" e "dio!" no. Il punto esclamativo solo se dopo c'è una lettera
// ("d!o"), se no chiude la frase.
function lettera(c) {
  return !!c && /\p{L}/u.test(c)
}

function normalizza(testo) {
  const originali = [...String(testo || '')]
  const chars = originali.map(normaCarattere)
  let out = ''
  chars.forEach((n, i) => {
    let x = n
    const leet = LEET[n]
    if (leet) {
      const prima = lettera(chars[i - 1])
      const dopo = lettera(chars[i + 1])
      if (n === '!' ? prima && dopo : prima || dopo) x = leet
    }
    // Un carattere fuori dal BMP (emoji) occupa due posti: si tengono due posti.
    out += originali[i].length === 2 ? x + x : x
  })
  return out
}

const LETTERA = /\p{L}/u
const eLettera = (c) => !!c && LETTERA.test(c)

// "cazzo" → "c+a+z{2,}o+": ogni lettera si può ripetere, ma una DOPPIA resta
// almeno doppia. Senza, "cazzo" varrebbe anche "caz" e prenderebbe tutte le
// "-cazioni" (indicazioni, tonificazione), "fagg" i fagioli, "sborr" la sbornia.
function schemaLettere(s) {
  let out = ''
  const lettere = [...s]
  for (let i = 0; i < lettere.length; ) {
    let n = 1
    while (lettere[i + n] === lettere[i]) n++
    const c = lettere[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out += n === 1 ? c + '+' : `${c}{${n},}`
    i += n
  }
  return out
}

const SCHEMI = PAROLE.filter((p) => !SOLO_IN_BESTEMMIA.has(p)).map((p) => {
  const inizio = p.startsWith('^')
  const finale = p.endsWith('*')
  const nucleo = p.replace(/^\^/, '').replace(/\*$/, '')
  return { p, inizio, finale, intera: INTERE.has(p), re: new RegExp(schemaLettere(nucleo), 'gu') }
})
// Un controllo solo, veloce, prima di quello parola per parola: un testo
// lungo (una scheda incollata) si controlla a ogni tasto.
const QUALCUNO = new RegExp(SCHEMI.map((s) => s.re.source).join('|'), 'u')

const reSacri = SACRI.map(schemaLettere).join('|')
const reOffese = OFFESE.map(schemaLettere).join('|')
// Due parole vicine, con in mezzo al più spazi e segni (non altre lettere).
const BESTEMMIA = new RegExp(
  `(?<![\\p{L}])(?:(?:${reSacri})[^\\p{L}]*(?:${reOffese})|(?:${reOffese})[^\\p{L}]*(?:${reSacri}))(?![\\p{L}])`,
  'gu',
)

// Le parole del testo normalizzato, con la loro posizione.
function parole(norm) {
  const out = []
  const re = /\p{L}+/gu
  let m
  while ((m = re.exec(norm))) out.push({ testo: m[0], inizio: m.index, fine: m.index + m[0].length })
  return out
}

// Le lettere staccate ("c a z z o", "c.a.z.z.o"): almeno 3 lettere singole
// separate da un solo segno. Si riattaccano per il controllo, e se c'è una
// parolaccia si censura tutto il tratto.
const STACCATE = /(?<!\p{L})\p{L}(?:[\s._\-*,'|/]\p{L}(?!\p{L})){2,}/gu

function parolaVietata(parola) {
  if (ECCEZIONI.has(parola) || !QUALCUNO.test(parola)) return false
  for (const s of SCHEMI) {
    s.re.lastIndex = 0
    let m
    while ((m = s.re.exec(parola))) {
      const daInizio = m.index === 0
      const finoInFondo = m.index + m[0].length === parola.length
      if (s.inizio && !daInizio) continue
      if (s.intera && !finoInFondo) continue
      if (!s.finale && !s.intera && !finoInFondo && s.inizio) continue
      return true
    }
  }
  return false
}

/**
 * I tratti vietati di un testo, come intervalli sul testo ORIGINALE.
 * @returns {{ inizio:number, fine:number }[]}
 */
export function trovaParole(testo) {
  const t = String(testo || '')
  if (!t) return []
  const norm = normalizza(t)
  const trovati = []
  for (const w of parole(norm)) {
    if (parolaVietata(w.testo) || bestemmiaAttaccata(w.testo)) trovati.push({ inizio: w.inizio, fine: w.fine })
  }
  BESTEMMIA.lastIndex = 0
  let m
  while ((m = BESTEMMIA.exec(norm))) trovati.push({ inizio: m.index, fine: m.index + m[0].length })
  STACCATE.lastIndex = 0
  while ((m = STACCATE.exec(norm))) {
    const unita = m[0].replace(/[^\p{L}]/gu, '')
    if (parolaVietata(unita) || bestemmiaAttaccata(unita)) trovati.push({ inizio: m.index, fine: m.index + m[0].length })
  }
  return unisci(trovati)
}

// "porcodio", "diocane": la bestemmia scritta tutta attaccata, dentro una parola sola.
const ATTACCATA = new RegExp(`^(?:(?:${reSacri})(?:${reOffese})|(?:${reOffese})(?:${reSacri}))$`, 'u')
function bestemmiaAttaccata(parola) {
  return ATTACCATA.test(parola)
}

function unisci(intervalli) {
  const ord = [...intervalli].sort((a, b) => a.inizio - b.inizio)
  const out = []
  for (const x of ord) {
    const ultimo = out[out.length - 1]
    if (ultimo && x.inizio <= ultimo.fine) ultimo.fine = Math.max(ultimo.fine, x.fine)
    else out.push({ ...x })
  }
  return out
}

/** C'è almeno una parola vietata? */
export function contieneParole(testo) {
  return trovaParole(testo).length > 0
}

/**
 * Il testo con le parole vietate coperte da asterischi, della stessa
 * lunghezza (spazi e segni nel mezzo restano: "porco dio" → "***** ***").
 * @param {string} testo
 * @param {{ soloFinite?: boolean }} [opts] `soloFinite`: lascia stare una
 *   parola che arriva fino in fondo al testo — mentre si scrive "cazzuola",
 *   "cazz" non è ancora una parolaccia. Si copre quando la parola è finita.
 */
export function censura(testo, { soloFinite = false } = {}) {
  const t = String(testo || '')
  let out = t
  for (const { inizio, fine } of trovaParole(t)) {
    if (soloFinite && fine >= t.length) continue
    let pezzo = ''
    for (let i = inizio; i < fine; i++) pezzo += eLettera(normalizza(t[i])) || /[0-9@$!€]/.test(t[i]) ? '*' : t[i]
    out = out.slice(0, inizio) + pezzo + out.slice(fine)
  }
  return out
}

export const MESSAGGIO_PAROLE = 'Niente parolacce, bestemmie o offese: quella parola non si può scrivere.'

/** Per i campi che si rifiutano invece di coprire (nome, username): '' se va bene. */
export function errorePerParole(testo) {
  return contieneParole(testo) ? 'Questo testo contiene una parola che non si può usare.' : ''
}

/** Il testo da mandare: coperto, se serve. Per commenti, chat, didascalie. */
export function testoPulito(testo) {
  return censura(testo)
}

// ---------------------------------------------------------------------------
// Il filtro sui CAMPI, per tutta l'app.
//
// Un ascoltatore solo, sul documento: ogni campo di testo (input e textarea)
// viene ripulito mentre si scrive, senza toccare i componenti uno per uno.
// La parola si copre quando è finita (dopo uno spazio o un segno), e in ogni
// caso prima che il testo parta: quando il campo perde il fuoco, a "Invio", e
// al tocco di qualsiasi tasto (su iPhone toccare "Invia" non toglie il fuoco
// al campo, quindi non basterebbe la perdita del fuoco).
//
// ⚠️ I campi sono quasi tutti "controllati" da React: cambiare `value` a mano
// non basterebbe, React rimetterebbe il suo. Si usa il setter nativo e si
// manda un evento `input`, così lo stato del componente si aggiorna come se
// avesse scritto la persona.
// Restano fuori: password, email, numeri, file, e i campi con
// `data-parole-libere` (non ce ne sono: è la porta per un caso futuro).
// ---------------------------------------------------------------------------

const TIPI = new Set(['text', 'search', 'textarea', ''])

function campoDaControllare(el) {
  if (!el || el.dataset?.paroleLibere != null) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  return TIPI.has((el.getAttribute('type') || '').toLowerCase())
}

function scriviNelCampo(el, valore) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const inizio = el.selectionStart
  const fine = el.selectionEnd
  if (setter) setter.call(el, valore)
  else el.value = valore
  el.dispatchEvent(new Event('input', { bubbles: true }))
  // Stessa lunghezza: il cursore torna dov'era.
  try {
    if (inizio != null && document.activeElement === el) el.setSelectionRange(inizio, fine)
  } catch {
    /* alcuni tipi di campo non hanno la selezione */
  }
}

/**
 * Ripulisce un campo. `tutto`: anche la parola in fondo, non ancora finita.
 * @returns {boolean} true se ha dovuto coprire qualcosa.
 */
export function ripulisciCampo(el, tutto = false) {
  if (!campoDaControllare(el)) return false
  const prima = el.value
  if (!prima) return false
  const dopo = censura(prima, { soloFinite: !tutto })
  if (dopo === prima) return false
  scriviNelCampo(el, dopo)
  return true
}

let installato = false

/**
 * Accende il filtro su tutta la pagina. `onCoperto` viene chiamato quando una
 * parola è stata coperta (per dirlo a chi scrive).
 */
export function installaFiltroLinguaggio({ onCoperto = () => {} } = {}) {
  if (installato || typeof document === 'undefined') return
  installato = true
  const avvisa = (coperto) => coperto && onCoperto()
  document.addEventListener('input', (e) => avvisa(ripulisciCampo(e.target, false)), true)
  document.addEventListener('focusout', (e) => avvisa(ripulisciCampo(e.target, true)), true)
  document.addEventListener(
    'keydown',
    (e) => e.key === 'Enter' && !e.isComposing && avvisa(ripulisciCampo(e.target, true)),
    true,
  )
  // Prima di qualsiasi tocco (anche su "Invia"): il campo attivo si chiude.
  document.addEventListener('pointerdown', () => avvisa(ripulisciCampo(document.activeElement, true)), true)
  document.addEventListener('submit', () => avvisa(ripulisciCampo(document.activeElement, true)), true)
}
