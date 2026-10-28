// ---------------------------------------------------------------------------
// Il RECAP DEL MESE (docs/superpowers/specs/2026-10-28-recap-mese-design.md):
// una storia alla Spotify Wrapped, una slide per argomento, che finisce su una
// card da condividere (lib/recapMeseImmagine, pages/RecapMesePage).
//
// Qui solo conti, niente rete: il mese SOMMA quello che statisticheRecap
// (lib/recap) dà per ogni allenamento, cosi' volume, record e durata sono
// quelli dei recap di ogni giorno. Vale la regola del recap: quello che non
// si sa non si mostra (null, e la slide sparisce).
// ---------------------------------------------------------------------------

import { durataLunga, formattaMigliaia, gruppiAllenati, statisticheRecap } from './recap'
import { normalizzaNome } from './eserciziLibreria'
import { normalizzaMusica } from './musica'
import { formattaNumero, parseCarico } from './carico'

// Il recap si apre SOLO dal link esatto (/recap-mese/AAAA-MM): la card della
// Home e il tasto del Calendario sono spenti finché non lo si annuncia.
// Riaccenderli: true.
export const RECAP_MESE_VISIBILE = false

export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** '2026-10' → { anno: 2026, mese: 9 }; null se non è un mese. */
export function meseDaPercorso(testo) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(testo ?? ''))
  if (!m) return null
  const mese = Number(m[2]) - 1
  return mese >= 0 && mese <= 11 ? { anno: Number(m[1]), mese } : null
}

export const percorsoMese = ({ anno, mese }) => `${anno}-${String(mese + 1).padStart(2, '0')}`

/** "il lunedì", ma "la domenica". */
export const conGiorno = (giorno) => `${giorno === 'domenica' ? 'la' : 'il'} ${giorno}`

/** Il giorno in breve, in minuscolo: "venerdì 4" (il mese lo dice la slide). */
export const dataBreve = (iso) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric' }).format(new Date(iso))

/** Il mese è già finito (oggi è dopo il suo ultimo giorno). */
export function meseFinito({ anno, mese }, oggi = new Date()) {
  return anno < oggi.getFullYear() || (anno === oggi.getFullYear() && mese < oggi.getMonth())
}

export function mesePrima({ anno, mese }) {
  const d = new Date(anno, mese - 1, 1)
  return { anno: d.getFullYear(), mese: d.getMonth() }
}

/** Le celle del mese, settimana da lunedì; null = cella vuota. */
export function celleDelMese(anno, mese) {
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate()
  const vuoti = (new Date(anno, mese, 1).getDay() + 6) % 7
  const celle = []
  for (let i = 0; i < vuoti; i++) celle.push(null)
  for (let g = 1; g <= giorniNelMese; g++) celle.push(g)
  while (celle.length % 7 !== 0) celle.push(null)
  return celle
}

// Il mese della data in ORA LOCALE, come il calendario.
function delMese(voci, { anno, mese }) {
  return (voci || []).filter((v) => {
    if (!v?.data) return false
    const d = new Date(v.data)
    return d.getFullYear() === anno && d.getMonth() === mese
  })
}

const fatto = (e) => (e?.sets || []).some((s) => s?.colore)

// Il lunedì della settimana, in giorni dal 1970 (arrotondati: l'ora legale
// sposta la mezzanotte di un'ora).
function lunedi(iso) {
  const d = new Date(iso)
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return Math.round(l.getTime() / 86400000)
}

function abitudini(lista) {
  const conta = new Map()
  for (const v of lista) {
    for (const e of v.esercizi || []) {
      const k = normalizzaNome(e.nome)
      if (!k || !fatto(e)) continue
      const c = conta.get(k) || { nome: e.nome, volte: 0 }
      c.volte += 1
      conta.set(k, c)
    }
  }
  // A pari merito il primo incontrato.
  let esercizio = null
  for (const c of conta.values()) if (!esercizio || c.volte > esercizio.volte) esercizio = c

  const perGiorno = Array(7).fill(0)
  for (const v of lista) perGiorno[new Date(v.data).getDay()] += 1
  // A pari merito il primo della settimana, da lunedì.
  const giorno = [1, 2, 3, 4, 5, 6, 0].reduce((a, g) => (perGiorno[g] > perGiorno[a] ? g : a), 1)

  const settimane = [...new Set(lista.map((v) => lunedi(v.data)))].sort((a, b) => a - b)
  let fila = 1
  let settimaneDiFila = 1
  for (let i = 1; i < settimane.length; i++) {
    fila = settimane[i] - settimane[i - 1] === 7 ? fila + 1 : 1
    settimaneDiFila = Math.max(settimaneDiFila, fila)
  }
  return { esercizio, giorno: GIORNI[giorno], settimaneDiFila }
}

// I record del mese, UNO per esercizio e misura (lib/recap prestazione): il
// numero di prima del mese (`primaN`, il migliore di sempre fino al primo
// record) e il migliore battuto nel mese (`dopoN`). La misura dice l'unità:
//   kg     il peso (di più è meglio)
//   rip    a corpo libero, le ripetizioni (di più è meglio)
//   aiuto  gli assistiti, i kg di aiuto (di MENO è meglio)
// `crescita` è sempre il miglioramento, positivo. I più recenti per primi.
const UNITA_RECORD = { kg: 'kg', rip: 'rip', aiuto: 'kg di aiuto' }
function misuraDi(x) {
  if (x.prima == null) return 'kg' // lib/recap scrive `prima` solo fuori dai kg
  return /rip$/.test(x.carico) ? 'rip' : 'aiuto'
}
function recordDelMese(stat) {
  const per = new Map()
  for (const { v, s } of stat) {
    for (const x of s.record) {
      const misura = misuraDi(x)
      const dopoN = misura === 'kg' ? (parseCarico(x.carico)?.numero ?? 0) : parseFloat(String(x.carico).replace(',', '.')) || 0
      const k = `${normalizzaNome(x.esercizio)}|${misura}`
      const g = per.get(k)
      if (!g) per.set(k, { esercizio: x.esercizio, misura, unita: UNITA_RECORD[misura], prima: formattaNumero(x.precedente), primaN: x.precedente, carico: x.carico, dopoN, data: v.data })
      else if (misura === 'aiuto' ? dopoN < g.dopoN : dopoN > g.dopoN) Object.assign(g, { carico: x.carico, dopoN, data: v.data })
    }
  }
  return [...per.values()]
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .map((r) => ({ ...r, crescita: r.misura === 'aiuto' ? r.primaN - r.dopoN : r.dopoN - r.primaN }))
}

/**
 * I record da mostrare in fila: prima quelli in kg (il peso è il record che
 * si racconta), poi gli altri; dentro, dal più cresciuto (a pari merito il più recente).
 */
export function recordPerCrescita(record) {
  const kg = (x) => (x.misura === 'kg' ? 0 : 1)
  return [...(record || [])].sort((a, b) => kg(a) - kg(b) || b.crescita - a.crescita)
}

// I dischi del bilanciere della fatica: uno per allenamento col suo peso
// sollevato, dal più pesante (dentro) al più leggero (fuori). Il colore è
// quello dei dischi veri, dal rosso dei 25 al bianco dei piccoli, secondo la
// parte del più pesante; `quota` ne fa l'altezza.
const COLORI_DISCO = [
  [0.85, 'rosso'],
  [0.65, 'blu'],
  [0.45, 'giallo'],
  [0.25, 'verde'],
  [0, 'bianco'],
]
export function dischiDelMese(lista) {
  const max = Math.max(0, ...lista.map((x) => x.volume))
  if (!max) return []
  return lista
    .filter((x) => x.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .map((x) => {
      const quota = x.volume / max
      return { ...x, quota, colore: COLORI_DISCO.find(([q]) => quota >= q)[1] }
    })
}

// Le serie di ogni allenamento in fila, coi loro colori: la slide dello sforzo
// è un mese di pallini, una riga per allenamento. Solo i tre colori dello sforzo.
const COLORI_SFORZO = new Set(['verde', 'giallo', 'rosso'])
function pallini(lista) {
  return lista
    .map((v) => ({
      giorno: new Date(v.data).getDate(),
      colori: (v.esercizi || []).flatMap((e) => (e.sets || []).map((s) => s?.colore).filter((c) => COLORI_SFORZO.has(c))),
    }))
    .filter((p) => p.colori.length)
}

// Le canzoni del mese, dalla più scelta; a pari merito l'ultima usata (lista
// in ordine). Ognuna con quante volte.
function canzoniDelMese(lista) {
  const conta = new Map()
  lista.forEach((v, i) => {
    const m = normalizzaMusica(v.musica)
    if (!m?.id) return
    const c = conta.get(m.id) || { musica: m, volte: 0, ultima: 0 }
    c.volte += 1
    c.ultima = i
    c.musica = m
    conta.set(m.id, c)
  })
  return [...conta.values()]
    .sort((a, b) => b.volte - a.volte || b.ultima - a.ultima)
    .map(({ musica, volte }) => ({ musica, volte }))
}

/**
 * Tutti i numeri del mese, o null se non c'è nessun allenamento.
 * @param {object[]} voci le voci di raccogliCompletamenti (lib/oggi), in fila
 * @param {{anno: number, mese: number}} periodo
 * @param {{ schede?: object[] }} [ctx] la storia, per i record
 */
export function recapDelMese(voci, periodo, { schede = [] } = {}) {
  const lista = delMese(voci, periodo).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  if (!lista.length) return null
  const stat = lista.map((v) => ({ v, s: statisticheRecap(v, { schede }) }))

  const conDurata = stat.filter((x) => x.s.durataSec > 0)
  const durataSec = conDurata.reduce((t, x) => t + x.s.durataSec, 0)
  const lungo = conDurata.reduce((a, x) => (!a || x.s.durataSec > a.s.durataSec ? x : a), null)
  const volume = stat.reduce((t, x) => t + (x.s.volume || 0), 0)
  const pesoMax = stat.reduce((a, x) => (x.s.pesoMax && (!a || x.s.pesoMax.numero > a.numero) ? x.s.pesoMax : a), null)
  const sforzo = { verde: 0, giallo: 0, rosso: 0, tot: 0 }
  for (const { s } of stat) for (const k of Object.keys(sforzo)) sforzo[k] += s.sforzo[k]
  const duro = stat.filter((x) => x.s.sforzo.tot > 0).reduce((a, x) => (!a || x.s.intensita > a.s.intensita ? x : a), null)
  const record = recordDelMese(stat)
  const vociPrima = delMese(voci, mesePrima(periodo))
  const prima = vociPrima.length
  const volumePrima = vociPrima.reduce((t, v) => t + (statisticheRecap(v, { schede }).volume || 0), 0)

  return {
    ...periodo,
    nomeMese: MESI[periodo.mese],
    nomeMesePrima: MESI[mesePrima(periodo).mese],
    allenamenti: lista.length,
    giorni: [...new Set(lista.map((v) => new Date(v.data).getDate()))].sort((a, b) => a - b),
    inPiu: prima > 0 && lista.length > prima ? lista.length - prima : null,
    durataSec: durataSec || null,
    piuLungo: lungo ? { nome: lungo.v.nomeGiorno, data: lungo.v.data, durataSec: lungo.s.durataSec } : null,
    volume: volume > 0 ? Math.round(volume) : null,
    // Come `inPiu`: solo se è salito, e solo se il mese prima c'era.
    volumeInPiu: volumePrima > 0 && volume > volumePrima ? Math.round(volume - volumePrima) : null,
    pesoMax: pesoMax ? { testo: pesoMax.testo, esercizio: pesoMax.esercizio } : null,
    gruppi: gruppiAllenati(lista.flatMap((v) => v.esercizi || [])),
    sforzo: sforzo.tot > 0 ? sforzo : null,
    dischi: dischiDelMese(stat.map((x) => ({ data: x.v.data, volume: Math.round(x.s.volume || 0) }))),
    pallini: pallini(lista),
    piuDuro: duro ? { nome: duro.v.nomeGiorno, data: duro.v.data } : null,
    record: record.slice(0, 5),
    numRecord: record.length,
    abitudini: lista.length >= 3 ? abitudini(lista) : null,
    minutiCardio: stat.reduce((t, x) => t + (x.s.minutiCardio || 0), 0),
    canzoni: canzoniDelMese(lista),
    // La più scelta: la polaroid della card.
    musica: canzoniDelMese(lista)[0]?.musica || null,
    // Gli allenamenti del mese, per chi deve cercarne le foto (pages/RecapMesePage).
    voci: lista,
  }
}

// Usati dalle slide e dalla card (Task 2): qui perché sono testi del recap.
export { durataLunga, formattaMigliaia }

// L'ordine delle slide (pages/RecapMesePage, components/SlideRecapMese):
// poche e piene. I record, il picco, per ultimi prima della card.
//   mese    il nome, il calendario, quanti allenamenti
//   foto    le foto PUBBLICATE del mese (le porta la pagina: qui non c'è rete)
//   fatica  tempo, peso sollevato, cardio
//   stile   i muscoli e le abitudini
export const SLIDE = ['mese', 'foto', 'fatica', 'stile', 'sforzo', 'canzoni', 'record', 'riepilogo']

/** Le slide di questo mese: ognuna solo se ha il suo dato. */
export function slideDelMese(r, { foto = [] } = {}) {
  if (!r) return []
  const ce = {
    foto: foto.length > 0,
    fatica: !!(r.durataSec || r.volume || r.minutiCardio > 0),
    stile: r.gruppi.length > 0 || !!r.abitudini,
    sforzo: !!r.sforzo,
    canzoni: r.canzoni.length > 0,
    record: r.numRecord > 0,
  }
  return SLIDE.filter((id) => ce[id] ?? true)
}

// ---- La storia (pages/RecapMesePage) ---------------------------------------
// Il visore mostra lo stato e manda gli eventi; le regole stanno qui, provate.
// L'ultima slide (il riepilogo) non va avanti da sola: si ferma piena.
export const DURATA_SLIDE = 6000

// `inPausa`: tenuto premuto o app in secondo piano, finisce da sola; `ferma`:
// il tasto pausa, finché non lo si ritocca.
export const storiaIniziale = (totale) => ({ indice: 0, trascorso: 0, inPausa: false, ferma: false, totale })

export function avanzaStoria(s, e) {
  const ultima = s.indice >= s.totale - 1
  // Sull'ultima, già a fondo: lo stesso oggetto, così nessuno si ridisegna.
  const avanti = () => (ultima ? (s.trascorso === DURATA_SLIDE ? s : { ...s, trascorso: DURATA_SLIDE }) : { ...s, indice: s.indice + 1, trascorso: 0 })
  switch (e?.tipo) {
    case 'tempo': {
      if (s.inPausa || s.ferma) return s
      const trascorso = s.trascorso + Math.max(0, Number(e.ms) || 0)
      return trascorso < DURATA_SLIDE ? { ...s, trascorso } : avanti()
    }
    case 'avanti':
      return avanti()
    case 'indietro':
      return { ...s, indice: Math.max(0, s.indice - 1), trascorso: 0 }
    case 'pausa':
      return { ...s, inPausa: true }
    case 'riprendi':
      return { ...s, inPausa: false }
    case 'fermaRiparti':
      return { ...s, ferma: !s.ferma }
    case 'rivedi':
      return storiaIniziale(s.totale)
    default:
      return s
  }
}

// ---- La card della Home (components/CardRecapMese) -------------------------
// Dal 1° al 7 del mese si annuncia il recap del mese prima. "Visto" sta nelle
// preferenze del profilo (avvisi), una chiave per mese: vale su tutti i telefoni.
export const chiaveAvvisoMese = (periodo) => `recapMese:${percorsoMese(periodo)}`

export function meseDaAnnunciare(oggi = new Date()) {
  if (oggi.getDate() > 7) return null
  return mesePrima({ anno: oggi.getFullYear(), mese: oggi.getMonth() })
}
