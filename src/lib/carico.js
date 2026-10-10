// ---------------------------------------------------------------------------
// Consiglio sul CARICO, a partire dai pallini colorati delle serie.
//
// Durante l'allenamento ogni serie viene chiusa con un colore (lib/session):
//   🟢 verde = facile · 🟡 giallo = medio · 🔴 rosso = duro.
// Quel giudizio non serve solo al riepilogo: la volta dopo che incontri lo
// stesso esercizio ti dice se il peso era giusto. Se un 3x10 è andato tutto
// verde il carico è troppo leggero; se metà serie sono rosse è troppo alto.
//
// Due usi:
//   - dentro una SCHEDA: quando rincontri l'esercizio, il consiglio di salire /
//     tenere / scendere (e, se fili liscio da più volte, di cambiare stile);
//   - in un allenamento LIBERO (fuori scheda): il peso di partenza viene dagli
//     esercizi che hai già svolto. Se non ne abbiamo mai fatto uno, NON si
//     forza nessun peso: si mostra GUIDA_CARICO e sceglie l'utente.
//
// Tutto si basa su quello che è già salvato nei completamenti (schema + colori
// delle serie): nessun campo nuovo nel modello dati.
// ---------------------------------------------------------------------------

import { normalizzaNome } from './eserciziLibreria'
import {
  formatCarico,
  formatSerieRip,
  formattaCarico,
  formattaRip,
  haFasi,
  normalizzaSchema,
  obiettivoSerie,
  ripNumero,
  serieDellaFase,
} from './schema'

// Cosa mostrare quando di un esercizio non sappiamo ancora nulla: si spiega
// come scegliere il peso invece di inventarne uno.
export const GUIDA_CARICO =
  'Non abbiamo ancora dati su questo esercizio: il peso lo scegli tu. ' +
  'Regola pratica: deve farti chiudere l’ultima serie con 1–2 ripetizioni ancora in canna. ' +
  'Se finisci tutte le serie senza fatica (pallini verdi) è troppo leggero; se non arrivi alle ' +
  'ripetizioni previste è troppo pesante. Parti prudente: dai colori di oggi ricaviamo il consiglio ' +
  'per la prossima volta.'

// Numero in stile italiano: 42.5 → "42,5", 40 → "40".
export function formattaNumero(n) {
  const arrotondato = Math.round(n * 100) / 100
  return String(arrotondato).replace('.', ',')
}

// Quanto vale il "click" minimo di quel carico: i dischi da 2,5 kg sul
// bilanciere, tagli più piccoli sui pesi leggeri. Esportato anche per i
// tasti −/+ del modale peso (components/ModalePeso).
export function passoCarico(n) {
  if (n >= 20) return 2.5
  if (n >= 5) return 1
  return 0.5
}

// Incremento consigliato: circa il 5% del carico, arrotondato a un passo utile
// (mai meno di un passo, altrimenti il consiglio non si potrebbe applicare).
export function incrementoCarico(n) {
  const p = passoCarico(n)
  return Math.max(p, Math.round((n * 0.05) / p) * p)
}

const RE_NUMERO = /\d+(?:[.,]\d+)?/g
const RE_UNITA = /^\s*(kg|kg\.|chili|lb|libbre)/i

/**
 * Estrae il peso da un campo "carico" scritto a mano, conservando il testo
 * attorno per poterlo ricostruire ("2x20 kg" → 20, prefisso "2x", suffisso " kg").
 * Sceglie il numero seguito dall'unità di misura; in mancanza prende il più
 * grande, perché nelle notazioni tipo "2x20" o "20x2" il moltiplicatore è
 * sempre il numero piccolo.
 * @returns {{numero:number, prima:string, dopo:string}|null} null se non c'è un peso.
 */
export function parseCarico(testo) {
  const t = String(testo || '')
  const trovati = [...t.matchAll(RE_NUMERO)]
  if (trovati.length === 0) return null

  const valore = (m) => parseFloat(m[0].replace(',', '.'))
  const conUnita = trovati.find((m) => RE_UNITA.test(t.slice(m.index + m[0].length)))
  const scelto = conUnita || trovati.reduce((a, b) => (valore(b) > valore(a) ? b : a))

  const numero = parseFloat(scelto[0].replace(',', '.'))
  if (!Number.isFinite(numero) || numero <= 0) return null
  return {
    numero,
    prima: t.slice(0, scelto.index),
    dopo: t.slice(scelto.index + scelto[0].length),
  }
}

// Conta i colori delle serie svolte (le serie non completate non contano) e
// ne conserva l'ORDINE: lo storico dell'esercizio ridisegna i pallini com'erano.
function contaColori(sets) {
  let verde = 0
  let giallo = 0
  let rosso = 0
  const colori = []
  // Le ripetizioni fatte nelle serie dure, quando sono state scritte (null
  // altrimenti), nello stesso ordine dei colori.
  const fatte = []
  // Le ripetizioni registrate in OGNI serie chiusa (dalla 37ª, serieChiusa):
  // servono alla stima del massimale. Gli allenamenti di prima non le hanno.
  const ripFatte = []
  // I kg registrati chiudendo ogni serie (lib/session serieChiusa), null se
  // non ci sono: è il peso VERO della volta scorsa, anche se il piano diceva
  // un'altra cosa.
  const kg = []
  for (const s of sets || []) {
    const c = s?.colore || ''
    colori.push(c)
    fatte.push(c === 'rosso' && s?.rip != null ? s.rip : null)
    ripFatte.push(c && s?.rip > 0 ? s.rip : null)
    kg.push(c && s?.kg > 0 ? s.kg : null)
    if (c === 'verde') verde += 1
    else if (c === 'giallo') giallo += 1
    else if (c === 'rosso') rosso += 1
  }
  return { verde, giallo, rosso, tot: verde + giallo + rosso, colori, fatte, ripFatte, kg }
}

/**
 * Com'è andato l'esercizio quella volta:
 *   'facile'       tutte le serie verdi → il carico non allena più
 *   'quasi-facile' nessuna rossa e almeno 2/3 verdi → c'è margine
 *   'troppo'       metà o più delle serie rosse → si è esagerato
 *   'giusto'       il resto: impegnativo al punto giusto
 */
export function esitoSerie(conteggio) {
  const { verde, giallo, rosso, tot } = conteggio
  if (tot === 0) return 'ignoto'
  if (rosso === 0 && giallo === 0) return 'facile'
  if (rosso / tot >= 0.5) return 'troppo'
  if (rosso === 0 && verde / tot >= 2 / 3) return 'quasi-facile'
  return 'giusto'
}

/**
 * Come è andato ogni esercizio le volte scorse, per nome normalizzato.
 * Legge i completamenti di TUTTE le schede dell'utente (anche quella degli
 * allenamenti liberi: sono allenamenti veri e valgono come esperienza).
 * @param {import('../data/model').Scheda[]} schede
 * @returns {Map<string, {data:string,nome:string,schema:object,verde:number,giallo:number,rosso:number,tot:number}[]>}
 *   `schema`: lo schema di quella volta, nella forma di lib/schema.
 *   liste ordinate dalla volta più recente.
 */
export function storicoCarichi(schede) {
  const mappa = new Map()
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (!c.data) continue
      for (const e of c.esercizi || []) {
        const key = normalizzaNome(e.nome)
        if (!key) continue
        const colori = contaColori(e.sets)
        if (colori.tot === 0) continue // completamento manuale: nessun giudizio
        if (!mappa.has(key)) mappa.set(key, [])
        mappa.get(key).push({
          data: c.data,
          nome: e.nome,
          schema: normalizzaSchema(e.schema),
          nomeScheda: c.nomeScheda || s.nome || '',
          nomeGiorno: c.nomeGiorno || '',
          settimana: c.settimana,
          ...colori,
        })
      }
    }
  }
  for (const arr of mappa.values()) arr.sort((a, b) => new Date(b.data) - new Date(a.data))
  return mappa
}

// "3 serie su 4" / "tutte e 3 le serie".
function quante(n, tot) {
  if (n === tot) return tot === 1 ? 'l’unica serie' : `tutte e ${tot} le serie`
  return `${n} serie su ${tot}`
}

/**
 * Una voce dello storico ristretta a una fase: lo schema di quella fase e i
 * colori delle SUE serie. È ciò che serve al consiglio sul peso: se il 3×5 è
 * andato liscio e il 2×2 no, i due pesi vanno consigliati ognuno per sé.
 * Una voce di quando l'esercizio aveva una fase sola resta com'è.
 */
export function vocePerFase(voce, k) {
  const schema = normalizzaSchema(voce.schema)
  if (schema.fasi.length < 2 || !Array.isArray(voce.colori)) return voce
  const i = Math.min(k, schema.fasi.length - 1)
  const f = schema.fasi[i]
  let inizio = 0
  for (let x = 0; x < i; x++) inizio += serieDellaFase(schema.fasi[x])
  const fine = inizio + serieDellaFase(f)
  const colori = voce.colori.slice(inizio, fine)
  const fatte = Array.isArray(voce.fatte) ? voce.fatte.slice(inizio, fine) : voce.fatte
  const ripFatte = Array.isArray(voce.ripFatte) ? voce.ripFatte.slice(inizio, fine) : voce.ripFatte
  const kg = Array.isArray(voce.kg) ? voce.kg.slice(inizio, fine) : voce.kg
  const conta = (c) => colori.filter((x) => x === c).length
  const verde = conta('verde')
  const giallo = conta('giallo')
  const rosso = conta('rosso')
  return {
    ...voce,
    schema: { ...schema, fasi: [f] },
    colori,
    fatte,
    ripFatte,
    kg,
    verde,
    giallo,
    rosso,
    tot: verde + giallo + rosso,
  }
}

// "3×10 a 40kg" — il contesto della volta scorsa, per far capire da dove
// arriva il consiglio. Con più fasi: "3×5 + 2×2 a 80kg + 90kg".
function comEra(v) {
  const schema = formatSerieRip(v.schema)
  // Il peso usato davvero, se è registrato; se no quello della scheda.
  const kgFatti = (v.kg || []).filter((x) => x > 0)
  const coppia = !!normalizzaSchema(v.schema).fasi[0]?.carico?.coppia
  const carico = kgFatti.length
    ? formattaCarico({ tipo: 'kg', valore: Math.max(...kgFatti), ...(coppia ? { coppia } : {}) })
    : formatCarico(v.schema)
  const pezzi = []
  if (schema) pezzi.push(schema)
  if (carico) pezzi.push(`a ${carico}`)
  return pezzi.join(' ')
}

// ---------------------------------------------------------------------------
// Il peso per lo schema di OGGI, non per quello della volta scorsa.
//
// Un 5×5 a 100 kg andato tutto verde non vuol dire "105 kg" se oggi la scheda
// dice 2×10: con il doppio delle ripetizioni il peso scende. Per questo i
// pallini passano da un MASSIMALE stimato:
//   - il colore di una serie dice quante ripetizioni avevi ancora in canna
//     (🟢 ~4, 🟡 ~2, 🔴 ~0 — zero tondo se non sei arrivato a quelle previste);
//   - peso × (1 + ripetizioni a cedimento / 30) è il massimale (Epley), e la
//     media sulle serie della volta scorsa è la stima;
//   - all'indietro, il peso di oggi è quello che con le ripetizioni di oggi ne
//     lascia 2 in canna nell'ultima serie (0 a cedimento, drop set e
//     rest-pause; quante dicono RPE e RIR; l'RM e la % del massimale si
//     leggono così come sono), un filo meno per ogni serie in più (−1%,
//     fino a 4), il 10% in meno con il fermo o la discesa lenta.
// Con lo stesso schema della volta scorsa i conti tornano quelli di prima:
// tutto verde ≈ +5%, qualche giallo = un passo, metà rosse = giù.
//
// Il peso della scheda per oggi è il RIFERIMENTO: se è vicino alla stima (un
// passo di dischi, o il 2,5%) si tiene quello, perché il PT l'ha scelto per
// questo giorno; se è lontano, vince quello che dicono i tuoi pallini, e il
// testo dice tutte e due le cose.
// ---------------------------------------------------------------------------

// Ripetizioni ancora in canna per colore, e quante lasciarne oggi.
const IN_CANNA = { verde: 4, giallo: 2, rosso: 0.5 }
const IN_CANNA_OBIETTIVO = 2
// Ogni serie in più rispetto alla volta scorsa: −1%, fino a 4. Con meno serie
// non si sale: il colore dell'ultima serie dice già abbastanza, meglio prudenti.
const PER_SERIE = 0.01
const SERIE_MAX_DIFF = 4
// Quanto si toglie nel drop.
const DROP = 0.8

const massimaleDa = (kg, aCedimento) => kg * (1 + aCedimento / 30)
const pesoDa = (massimale, aCedimento) => massimale / (1 + aCedimento / 30)

// Le tecniche d'intensità, lette dalla nota dello schema di quella settimana
// (dove il PT scrive "ultima a cedimento", "drop set", "fermo 2''"). La nota
// dell'esercizio no: vale tutte le settimane, quindi pesa uguale prima e oggi.
// `inCanna`: quante ripetizioni lasciarne nell'ultima serie. `fattore`: quanta
// forza resta (col fermo o la discesa lenta si alza meno).
const TECNICHE = [
  { id: 'drop', re: /\bdrop|stripping|scalar/, inCanna: 0, fattore: 1, con: 'col drop set', nome: 'drop set' },
  { id: 'rest-pause', re: /rest.?pause|\bmyo/, inCanna: 0, fattore: 1, con: 'in rest-pause', nome: 'rest-pause' },
  { id: 'cedimento', re: /cediment|failure|amrap|esauriment/, inCanna: 0, fattore: 1, con: 'a cedimento', nome: 'cedimento' },
  { id: 'fermo', re: /\bferm[oaie]\b|fermata|paused|isometri/, inCanna: null, fattore: 0.9, con: 'col fermo', nome: 'fermo' },
  {
    id: 'lento',
    re: /\blent[oaie]\b(?!\s+(?:avanti|dietro))|eccentric|discesa|super ?slow|\btempo\b|\b\d-\d-\d\b/,
    inCanna: null,
    fattore: 0.9,
    con: 'con la discesa lenta',
    nome: 'discesa lenta',
  },
]

/**
 * Le tecniche d'intensità di uno schema, dalla sua nota.
 * @returns {{ id:string, inCanna:number|null, fattore:number, voci:object[] }}
 *   `id` vuoto = nessuna tecnica; `voci` = le righe di TECNICHE trovate.
 */
export function tecnicaDi(schema) {
  const nota = String(normalizzaSchema(schema).nota || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const voci = TECNICHE.filter((t) => t.re.test(nota))
  const conCanna = voci.filter((t) => t.inCanna != null)
  return {
    id: voci.map((t) => t.id).join('+'),
    inCanna: conCanna.length ? Math.min(...conCanna.map((t) => t.inCanna)) : null,
    fattore: voci.reduce((p, t) => p * t.fattore, 1),
    voci,
  }
}

// Le ripetizioni per il conto: di un intervallo il minimo (è quello che
// serieChiusa registra), di una piramide sullo stesso peso la serie più lunga,
// che è la più dura. null per "max" e per il tempo.
function ripPerConto(rip) {
  if (Array.isArray(rip)) {
    const n = rip.map(ripNumero)
    return n.length && n.every((x) => x != null) ? Math.max(...n) : null
  }
  return ripNumero(rip)
}

/**
 * Cosa chiede una fase di uno schema: serie, ripetizioni, carico scritto e
 * tecnica. null per un esercizio a più fasi quando non si dice quale.
 */
function obiettivoDi(schema, fase) {
  const s = normalizzaSchema(schema)
  if (fase == null && s.fasi.length > 1) return null
  const f = s.fasi[Math.min(fase ?? 0, s.fasi.length - 1)]
  return {
    serie: serieDellaFase(f) || 1,
    rip: ripPerConto(f.rip),
    ripTesto: formattaRip(f.rip),
    // Un peso per serie ("60/70/80kg") non si consiglia con un numero solo.
    perSerie: Array.isArray(f.carico),
    carico: Array.isArray(f.carico) ? null : f.carico || null,
    tecnica: tecnicaDi(s),
    testo: formatSerieRip({ fasi: [f] }),
  }
}

// Il carico "di intensità" (RPE 8, 12RM, 75%): diverso = schema diverso.
const intensita = (c) => (c && c.tipo !== 'kg' ? `${c.tipo}:${c.valore}` : '')

/**
 * Il massimale stimato dalla volta scorsa: per ogni serie chiusa, peso,
 * ripetizioni fatte e quelle che il colore dice ancora in canna.
 * null se mancano i kg o le ripetizioni (corpo libero, "max", a tempo).
 */
export function stimaMassimale(voce) {
  const schema = normalizzaSchema(voce?.schema)
  const { fattore } = tecnicaDi(schema)
  const stime = []
  ;(voce?.colori || []).forEach((c, j) => {
    if (!(c in IN_CANNA)) return
    const piano = obiettivoSerie(schema, j)
    const previste = ripNumero(piano.rip)
    const fatte = voce.ripFatte?.[j] ?? voce.fatte?.[j] ?? previste
    if (!(fatte > 0)) return
    const pianoKg = piano.carico && !Array.isArray(piano.carico) && piano.carico.tipo === 'kg' ? piano.carico.valore : null
    const kg = voce.kg?.[j] ?? pianoKg
    if (!(kg > 0)) return
    const inCanna = c === 'rosso' && previste != null && fatte < previste ? 0 : IN_CANNA[c]
    stime.push(massimaleDa(kg, fatte + inCanna) / fattore)
  })
  if (!stime.length) return null
  return stime.reduce((a, b) => a + b, 0) / stime.length
}

// Il peso (non arrotondato) che lo schema di oggi chiede, dal massimale.
function pesoPerOggi(massimale, oggi, seriePrima) {
  const c = oggi.carico
  const { fattore, inCanna: cannaTecnica } = oggi.tecnica
  const diff = Math.max(0, Math.min(SERIE_MAX_DIFF, oggi.serie - (seriePrima || oggi.serie)))
  const perSerie = 1 - PER_SERIE * diff
  if (c?.tipo === 'pct' && c.valore > 0) return massimale * (c.valore / 100) * fattore
  if (oggi.rip == null) return null
  let inCanna = cannaTecnica ?? IN_CANNA_OBIETTIVO
  if (c?.tipo === 'rpe' && c.valore > 0) inCanna = Math.max(0, 10 - c.valore)
  if (c?.tipo === 'rir' && c.valore >= 0) inCanna = c.valore
  const aCedimento = c?.tipo === 'rm' && c.valore >= oggi.rip ? c.valore : oggi.rip + inCanna
  return pesoDa(massimale, aCedimento) * fattore * perSerie
}

// Al passo di dischi più vicino (mai sotto un passo). `prudente`: per difetto,
// a meno di non essere a un soffio dal passo sopra — quando lo schema cambia
// la stima viaggia più lontano, e un disco in meno costa meno di uno in più.
function arrotonda(n, prudente = false) {
  const p = passoCarico(n)
  const passi = prudente ? Math.floor(n / p + 0.25) : Math.round(n / p)
  return Math.max(p, passi * p)
}

const comeKg = (c) => (c && !Array.isArray(c) && c.tipo === 'kg' && c.valore > 0 ? c : null)

// "Oggi è 3×10 col drop set, con più ripetizioni e meno serie": cosa cambia
// oggi rispetto alla volta scorsa, per spiegare il numero.
function oggiE(prima, oggi) {
  const come = [oggi.testo]
  const tecnicheOggi = oggi.tecnica.voci
  for (const t of tecnicheOggi) come.push(t.con)
  for (const t of prima.tecnica.voci) if (!tecnicheOggi.includes(t)) come.push(`senza ${t.nome}`)
  if (intensita(oggi.carico)) come.push(`a ${formattaCarico(oggi.carico)}`)
  const con = []
  if (prima.rip != null && oggi.rip != null && prima.rip !== oggi.rip) {
    con.push(`${oggi.rip > prima.rip ? 'più' : 'meno'} ripetizioni`)
  }
  if (prima.serie !== oggi.serie) con.push(`${oggi.serie > prima.serie ? 'più' : 'meno'} serie`)
  const testo = come.filter(Boolean).join(' ') || 'diverso'
  return `Oggi è ${testo}${con.length ? `, con ${con.join(' e ')}` : ''}`
}

/**
 * Il consiglio sul carico per un esercizio: com'è andata la volta scorsa,
 * tradotto nello schema di oggi.
 * @param {string} nome
 * @param {ReturnType<typeof storicoCarichi>} carichi
 * @param {{ schemaOggi?: object|null, caricoAttuale?: object|null, fase?: number|null }} [opts]
 *   `schemaOggi`: lo schema di oggi (lib/schema) — serie, ripetizioni, tecnica
 *   nella nota, RPE/RIR/RM/%: il peso si consiglia per QUESTO. Senza, si dà
 *   per uguale a quello della volta scorsa.
 *   `caricoAttuale`: il peso che oggi c'è già ({tipo, valore}): il riferimento
 *   (si tiene se è vicino alla stima) e la base se la volta scorsa non ne
 *   avevi segnato uno. Senza, quello di `schemaOggi`.
 *   `fase`: per un esercizio a fasi ("3×5 poi 2×2"), di quale fase si parla —
 *   il suo schema e i colori delle SUE serie. ⚠️ Senza, di un esercizio a fasi
 *   non si propone un peso: ogni fase ha il suo.
 *   Il peso proposto è sempre in kg, anche quando la scheda dice "RPE 8": è
 *   il numero da mettere sul bilanciere per quello sforzo.
 * @returns {{
 *   azione: 'aumenta'|'mantieni'|'riduci',
 *   titolo: string,
 *   testo: string,
 *   caricoSuggerito: object|null,
 *   cambiaStile: boolean,
 *   schemaCambiato: boolean,
 *   ultimo: object,
 *   storia: object[],
 *   volteFacili: number,
 * }|null} null se di quell'esercizio non sappiamo ancora nulla.
 */
export function consiglioCarico(nome, carichi, { schemaOggi = null, caricoAttuale = null, fase = null } = {}) {
  const tutta = carichi?.get(normalizzaNome(nome)) || []
  const storia = fase == null ? tutta : tutta.map((v) => vocePerFase(v, fase))
  if (storia.length === 0) return null

  const ultimo = storia[0]
  const esito = esitoSerie(ultimo)
  if (esito === 'ignoto') return null

  // Quante volte DI FILA è andato tutto liscio: se sono almeno due, il
  // problema non è più solo il peso ma lo stimolo.
  let volteFacili = 0
  for (const v of storia) {
    if (esitoSerie(v) === 'facile') volteFacili += 1
    else break
  }

  // La volta scorsa e oggi, fase per fase. `ultimo` è già ristretto alla fase.
  const aFasi = fase == null && (haFasi(ultimo.schema) || (!!schemaOggi && haFasi(schemaOggi)))
  const prima = aFasi ? null : obiettivoDi(ultimo.schema, 0)
  const oggi = aFasi ? null : schemaOggi ? obiettivoDi(schemaOggi, fase ?? 0) : prima
  const schemaCambiato =
    !aFasi &&
    (prima.serie !== oggi.serie ||
      prima.ripTesto !== oggi.ripTesto ||
      prima.tecnica.id !== oggi.tecnica.id ||
      intensita(prima.carico) !== intensita(oggi.carico))

  // Il peso della volta scorsa: quello registrato nelle serie (il più alto),
  // se c'è; se no quello che diceva la scheda.
  const kgFatti = (ultimo.kg || []).filter((x) => x > 0)
  const caricoUltimo = aFasi
    ? null
    : kgFatti.length
      ? { tipo: 'kg', valore: Math.max(...kgFatti), ...(prima.carico?.coppia ? { coppia: true } : {}) }
      : prima.carico
  const kgUltimo = comeKg(caricoUltimo)?.valore ?? null
  // Il riferimento di oggi: il peso già scritto (in sessione o in scheda).
  const rif = aFasi ? null : comeKg(caricoAttuale) || (schemaOggi ? comeKg(oggi.carico) : null)
  const coppia = !!(rif?.coppia ?? comeKg(caricoUltimo)?.coppia ?? oggi?.carico?.coppia)
  const inKg = (n) => ({ tipo: 'kg', valore: Math.round(n * 100) / 100, ...(coppia ? { coppia: true } : {}) })

  // 1) La stima dal massimale, se ci sono kg e ripetizioni.
  let suggerito = null // kg
  let comeScheda = false
  const massimale = aFasi || oggi.perSerie ? null : stimaMassimale(ultimo)
  const esatto = massimale ? pesoPerOggi(massimale, oggi, ultimo.tot) : null
  if (esatto > 0) {
    const tolleranza = Math.max(passoCarico(esatto), 0.025 * esatto)
    if (rif && Math.abs(rif.valore - esatto) <= tolleranza) {
      suggerito = rif.valore
      comeScheda = true
    } else {
      suggerito = arrotonda(esatto, schemaCambiato)
    }
    // Stesso schema: il verso lo decidono i pallini, come sempre — tutto
    // facile è almeno un passo su, troppo duro almeno uno giù, al punto
    // giusto si resta (a meno che la scheda non dica un peso lì vicino).
    if (!schemaCambiato && kgUltimo) {
      const facile = esito === 'facile' || esito === 'quasi-facile'
      if (facile && suggerito <= kgUltimo) suggerito = kgUltimo + passoCarico(kgUltimo)
      else if (esito === 'troppo' && suggerito >= kgUltimo && kgUltimo - passoCarico(kgUltimo) > 0) {
        suggerito = kgUltimo - passoCarico(kgUltimo)
      } else if (esito === 'giusto' && !comeScheda) suggerito = kgUltimo
      comeScheda = !!rif && suggerito === rif.valore
    }
  } else if (!aFasi && !schemaCambiato) {
    // 2) Niente stima (ripetizioni "max", a tempo, kg mai segnati) ma lo
    // schema è quello: si sale o si scende di un passo dal peso che c'è.
    const base = comeKg(caricoUltimo)?.valore ?? rif?.valore ?? null
    if (base) {
      if (esito === 'facile') suggerito = base + incrementoCarico(base)
      else if (esito === 'quasi-facile') suggerito = base + passoCarico(base)
      else if (esito === 'troppo' && base - incrementoCarico(base) > 0) suggerito = base - incrementoCarico(base)
      else if (esito !== 'troppo') suggerito = base
      comeScheda = !!rif && suggerito === rif.valore
    }
  }
  const caricoSuggerito = suggerito ? inKg(suggerito) : null
  const pesoTesto = caricoSuggerito ? formattaCarico(caricoSuggerito) : ''
  const rifTesto = rif ? formattaCarico(rif) : ''

  // Il verso: a schema uguale rispetto alla volta scorsa (si sta progredendo
  // o no); se no rispetto al peso che c'è oggi; se no lo dicono i pallini.
  // `confronto` = il peso col quale si è confrontato e da dove viene (per il
  // "+2,5 kg" della modale): l'ultima volta o quello già impostato oggi.
  let azione = 'mantieni'
  let confronto = null
  const confronta = (kg, da) => {
    confronto = { kg, da }
    return suggerito > kg ? 'aumenta' : suggerito < kg ? 'riduci' : 'mantieni'
  }
  if (suggerito && !schemaCambiato && kgUltimo) azione = confronta(kgUltimo, 'ultima')
  else if (suggerito && rif) azione = confronta(rif.valore, 'impostato')
  else if (!suggerito && !schemaCambiato) {
    azione = esito === 'facile' || esito === 'quasi-facile' ? 'aumenta' : esito === 'troppo' ? 'riduci' : 'mantieni'
  }

  let titolo = 'Tieni questo carico'
  if (azione === 'aumenta') titolo = 'Prova ad aumentare il carico'
  else if (azione === 'riduci') titolo = 'Meglio scendere'
  else if (schemaCambiato && !rif) titolo = suggerito ? 'Il peso per lo schema di oggi' : 'Oggi lo schema cambia'

  // Com'è andata la volta scorsa.
  const contesto = comEra(ultimo)
  const dallaVoltaScorsa = contesto ? `L’ultima volta (${contesto})` : 'L’ultima volta'
  let com
  if (esito === 'facile' || esito === 'quasi-facile') {
    com = `${dallaVoltaScorsa} ${quante(ultimo.verde, ultimo.tot)} ${ultimo.verde === 1 ? 'è andata' : 'sono andate'} facili`
  } else if (esito === 'troppo') {
    com = `${dallaVoltaScorsa} ${quante(ultimo.rosso, ultimo.tot)} ${ultimo.rosso === 1 ? 'è stata dura' : 'sono state dure'}`
  } else {
    com = `${dallaVoltaScorsa} è stata impegnativa al punto giusto`
  }

  let testo
  if (schemaCambiato) {
    let verdetto
    if (!suggerito) {
      verdetto = rif
        ? `parti da ${rifTesto} e regolati coi pallini`
        : 'scegli un peso che ti lasci 1–2 ripetizioni in canna nell’ultima serie'
    } else if (comeScheda) verdetto = `${rifTesto} va bene`
    else if (rif && suggerito < rif.valore) verdetto = `prova ${pesoTesto}, ${rifTesto} sono tanti`
    else if (rif) verdetto = `prova ${pesoTesto}, con ${rifTesto} resti leggero`
    else verdetto = `prova ${pesoTesto}`
    testo = `${com}. ${oggiE(prima, oggi)}: ${verdetto}.`
  } else if (suggerito) {
    const base = kgUltimo ?? rif?.valore ?? suggerito
    let verso
    if (suggerito > base) verso = `prova a salire a ${pesoTesto}`
    else if (suggerito < base) verso = `scendi a ${pesoTesto} per chiudere tutte le ripetizioni pulite`
    else verso = `resta su ${pesoTesto}`
    // Il peso già impostato (dalla scheda o cambiato oggi), quando non è
    // né il consiglio né quello della volta scorsa.
    let scheda = ''
    if (comeScheda && rif.valore !== base) scheda = ', come già impostato'
    else if (rif && rif.valore !== suggerito && rif.valore !== base) scheda = `, non ${rifTesto}`
    testo = `${com}: ${verso}${scheda}.`
  } else if (esito === 'facile' || esito === 'quasi-facile') {
    testo = `${com}: aggiungi peso, oppure una ripetizione per serie se il carico non si può cambiare.`
  } else if (esito === 'troppo') {
    testo = `${com}: togli un po’ di peso o una ripetizione per serie.`
  } else {
    testo = `${com}: tieni lo stesso carico.`
  }

  if (suggerito && oggi?.tecnica.voci.some((t) => t.id === 'drop')) {
    testo += ` Nel drop togli circa un quinto: ${formattaCarico(inKg(arrotonda(suggerito * DROP)))}.`
  }

  const cambiaStile = volteFacili >= 2
  if (cambiaStile) {
    testo +=
      ` È la ${volteFacili}ª volta di fila che fili liscio: puoi anche cambiare stile: ` +
      'più ripetizioni, recupero più corto o una serie in più.'
  }

  return { azione, titolo, testo, caricoSuggerito, confronto, cambiaStile, schemaCambiato, ultimo, storia, volteFacili }
}
