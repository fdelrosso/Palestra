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

// Riscrive il carico con un peso diverso, mantenendo formato e unità di misura.
function conNuovoPeso(base, peso) {
  if (peso <= 0) return ''
  return `${base.prima}${formattaNumero(peso)}${base.dopo}`.trim()
}

// Conta i colori delle serie svolte (le serie non completate non contano) e
// ne conserva l'ORDINE: lo storico dell'esercizio ridisegna i pallini com'erano.
function contaColori(sets) {
  let verde = 0
  let giallo = 0
  let rosso = 0
  const colori = []
  for (const s of sets || []) {
    const c = s?.colore || ''
    colori.push(c)
    if (c === 'verde') verde += 1
    else if (c === 'giallo') giallo += 1
    else if (c === 'rosso') rosso += 1
  }
  return { verde, giallo, rosso, tot: verde + giallo + rosso, colori }
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
 * @returns {Map<string, {data:string,nome:string,carico:string,serie:string,ripetizioni:string,verde:number,giallo:number,rosso:number,tot:number}[]>}
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
          carico: e.schema?.carico || '',
          serie: e.schema?.serie || '',
          ripetizioni: e.schema?.ripetizioni || '',
          recupero: e.schema?.recupero || '',
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

// "3×10 a 40 kg" — il contesto della volta scorsa, per far capire da dove
// arriva il consiglio.
function comEra(v) {
  const schema = [v.serie, v.ripetizioni].filter(Boolean).join('×')
  const pezzi = []
  if (schema) pezzi.push(schema)
  if (v.carico) pezzi.push(`a ${v.carico}`)
  return pezzi.join(' ')
}

/**
 * Il consiglio sul carico per un esercizio, dalla volta scorsa che l'hai fatto.
 * @param {string} nome
 * @param {ReturnType<typeof storicoCarichi>} carichi
 * @param {{ caricoAttuale?: string }} [opts] il carico scritto in scheda: usato
 *   come base solo se la volta scorsa non ne avevi segnato uno.
 * @returns {{
 *   azione: 'aumenta'|'mantieni'|'riduci',
 *   titolo: string,
 *   testo: string,
 *   caricoSuggerito: string,
 *   cambiaStile: boolean,
 *   ultimo: object,
 *   storia: object[],
 *   volteFacili: number,
 * }|null} null se di quell'esercizio non sappiamo ancora nulla.
 */
export function consiglioCarico(nome, carichi, { caricoAttuale = '' } = {}) {
  const storia = carichi?.get(normalizzaNome(nome)) || []
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

  const base = parseCarico(ultimo.carico) || parseCarico(caricoAttuale)
  const contesto = comEra(ultimo)
  const dallaVoltaScorsa = contesto ? `L’ultima volta (${contesto})` : 'L’ultima volta'

  let azione = 'mantieni'
  let titolo = 'Tieni questo carico'
  let testo = ''
  let caricoSuggerito = ultimo.carico || caricoAttuale || ''

  if (esito === 'facile' || esito === 'quasi-facile') {
    azione = 'aumenta'
    titolo = 'Prova ad aumentare il carico'
    // Tutto verde → passo pieno (~5%); qualche gialla → il passo minimo.
    const delta = base
      ? esito === 'facile'
        ? incrementoCarico(base.numero)
        : passoCarico(base.numero)
      : 0
    if (base) {
      caricoSuggerito = conNuovoPeso(base, base.numero + delta)
      testo =
        `${dallaVoltaScorsa} ${quante(ultimo.verde, ultimo.tot)} ` +
        `${ultimo.verde === 1 ? 'è andata' : 'sono andate'} facili: prova a salire a ${caricoSuggerito}.`
    } else {
      caricoSuggerito = ''
      testo =
        `${dallaVoltaScorsa} ${quante(ultimo.verde, ultimo.tot)} ` +
        `${ultimo.verde === 1 ? 'è andata' : 'sono andate'} facili: aggiungi peso, ` +
        'oppure una ripetizione per serie se il carico non si può cambiare.'
    }
  } else if (esito === 'troppo') {
    azione = 'riduci'
    titolo = 'Meglio scendere'
    const delta = base ? incrementoCarico(base.numero) : 0
    if (base && base.numero - delta > 0) {
      caricoSuggerito = conNuovoPeso(base, base.numero - delta)
      testo =
        `${dallaVoltaScorsa} ${quante(ultimo.rosso, ultimo.tot)} ` +
        `${ultimo.rosso === 1 ? 'è stata dura' : 'sono state dure'}: scendi a ${caricoSuggerito} ` +
        'per chiudere tutte le ripetizioni pulite.'
    } else {
      caricoSuggerito = ''
      testo =
        `${dallaVoltaScorsa} ${quante(ultimo.rosso, ultimo.tot)} ` +
        `${ultimo.rosso === 1 ? 'è stata dura' : 'sono state dure'}: togli un po’ di peso ` +
        'o una ripetizione per serie.'
    }
  } else {
    testo = caricoSuggerito
      ? `${dallaVoltaScorsa} è stata impegnativa al punto giusto: resta su ${caricoSuggerito}.`
      : `${dallaVoltaScorsa} è stata impegnativa al punto giusto: tieni lo stesso carico.`
  }

  const cambiaStile = volteFacili >= 2
  if (cambiaStile) {
    testo +=
      ` È la ${volteFacili}ª volta di fila che fili liscio: puoi anche cambiare stile — ` +
      'più ripetizioni, recupero più corto o una serie in più.'
  }

  return { azione, titolo, testo, caricoSuggerito, cambiaStile, ultimo, storia, volteFacili }
}
