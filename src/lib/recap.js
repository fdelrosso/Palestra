// ---------------------------------------------------------------------------
// Statistiche del recap di fine allenamento — quelle che rendono un allenamento
// "raccontabile" e non solo una lista di serie.
//
// Tutto si ricava dal riepilogo già salvato (schema + colori delle serie) più
// le schede dell'utente (per i record) e le sue diete (per il peso corporeo,
// che serve alle calorie). Nessun campo nuovo obbligatorio nel modello.
//
// NB: volume e calorie sono STIME. Le ripetizioni sono testo libero ("8-10",
// "max"): si prende il primo numero, e dove non c'è un numero l'esercizio non
// entra nel volume (ma resta contato negli esercizi).
//
// ⚠️ REGOLA: quello che non si sa NON si mostra. Le calorie hanno bisogno del
// peso corporeo, il volume di carichi e ripetizioni numerici, il peso massimo
// di un carico scritto: se il dato non c'è, la cifra vale `null` e la casella
// sparisce dal recap. Prima le calorie si calcolavano su 75 kg di default —
// un numero che sembrava tuo e non lo era.
// ---------------------------------------------------------------------------

import { gruppoDi } from './muscoli'
import { gruppoDaNome, normalizzaNome } from './eserciziLibreria'
import { parseCarico, formattaNumero } from './carico'
import { pesoDi } from './datiFisici'

// MET dell'allenamento coi pesi: ~3,5 se tirato via, ~6 se davvero intenso.
// Lo ricaviamo dai colori delle serie, che sono il nostro unico indice di sforzo.
const MET_MIN = 3.5
const MET_MAX = 6

// Numero positivo o null: i campi "dall'orologio" arrivano da <input>, quindi
// possono essere stringhe, vuoti o spazzatura.
export function numeroPositivo(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Primo numero di un testo libero ("8-10" → 8, "max" → null).
function primoNumero(testo) {
  const m = String(testo || '').match(/\d+(?:[.,]\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Numero con separatore delle migliaia all'italiana: 3240 → "3.240".
// Fatto a mano di proposito: toLocaleString('it-IT') NON raggruppa i numeri di
// 4 cifre (minimumGroupingDigits=2 nella locale italiana), e su una card di
// statistiche "4623 kg" si legge molto peggio di "4.623 kg".
export function formattaMigliaia(n) {
  const segno = n < 0 ? '-' : ''
  return segno + Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Secondi in "m:ss" (per il ritmo medio a serie).
export function mmss(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Conta i colori delle serie e ne conserva l'ordine: la card ridisegna i
// pallini com'erano, serie per serie.
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
 * Il peso corporeo da usare per le calorie, in kg, oppure NULL.
 *
 * Prima i dati del profilo (lib/datiFisici): sono il posto dove uno scrive
 * quanto pesa, e valgono anche se non ha mai aperto la sezione Dieta. Poi, per
 * i profili nati prima dei dati fisici, il peso scritto in una dieta: quella
 * valida oggi, altrimenti l'ultima che ne abbia uno. Se non c'è né l'uno né
 * l'altro si torna null e le calorie non si mostrano affatto.
 */
export function pesoCorporeo(dati, diete) {
  const dalProfilo = pesoDi(dati)
  if (dalProfilo != null) return dalProfilo
  const conPeso = (diete || []).filter((d) => Number(d?.peso) > 0)
  if (conPeso.length === 0) return null
  const oggi = new Date().toISOString().slice(0, 10)
  const attiva = conPeso.find(
    (d) => (!d.dataInizio || d.dataInizio <= oggi) && (!d.dataFine || oggi <= d.dataFine),
  )
  return Number((attiva || conPeso[conPeso.length - 1]).peso)
}

/**
 * I gruppi muscolari toccati dall'allenamento, dal più al meno lavorato.
 * Serve alle pillole colorate del recap e al corpo che si accende di rosso
 * (components/CorpoAllenato): entrambi devono contare le stesse serie.
 */
export function gruppiAllenati(esercizi = []) {
  const conta = new Map()
  for (const e of esercizi) {
    const id = e.gruppo || gruppoDaNome(e.nome) || ''
    if (!id) continue
    const serie = (e.sets || []).filter((s) => s?.colore).length
    conta.set(id, (conta.get(id) || 0) + serie)
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, serie]) => ({
      id,
      serie,
      label: gruppoDi(id)?.label || id,
      colore: gruppoDi(id)?.colore || '#98a2b3',
    }))
}

// Massimo carico mai usato per ogni esercizio PRIMA di questo allenamento:
// serve a riconoscere i record personali di oggi.
function massimiPrecedenti(schede, dataEsclusa) {
  const max = new Map()
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (!c.data || c.data === dataEsclusa) continue
      for (const e of c.esercizi || []) {
        const key = normalizzaNome(e.nome)
        if (!key) continue
        const p = parseCarico(e.schema?.carico)
        if (!p) continue
        if (!max.has(key) || p.numero > max.get(key)) max.set(key, p.numero)
      }
    }
  }
  return max
}

/**
 * Tutte le cifre del recap. Le voci che non si possono calcolare valgono
 * `null`: chi disegna il recap le salta invece di scrivere un trattino.
 * @param {object} riep riepilogo restituito da terminaSessione()
 * @param {{ schede?: object[], diete?: object[], dati?: object }} [ctx]
 *        `dati` = i dati fisici del profilo (lib/datiFisici)
 */
export function statisticheRecap(riep, { schede = [], diete = [], dati = null } = {}) {
  const esercizi = riep?.esercizi || []
  const durataSec = riep?.durataSec || 0

  let serieFatte = 0
  let volume = 0
  let pesoMax = null // { numero, testo, esercizio }
  const sforzo = { verde: 0, giallo: 0, rosso: 0, tot: 0 }

  const maxPrec = massimiPrecedenti(schede, riep?.data)
  const record = []

  const dettaglio = esercizi.map((e) => {
    const colori = contaColori(e.sets)
    serieFatte += colori.tot
    sforzo.verde += colori.verde
    sforzo.giallo += colori.giallo
    sforzo.rosso += colori.rosso
    sforzo.tot += colori.tot

    const gruppoId = e.gruppo || gruppoDaNome(e.nome) || ''

    const carico = parseCarico(e.schema?.carico)
    const rip = primoNumero(e.schema?.ripetizioni)

    // Volume = quanti kg hai spostato in totale (serie × ripetizioni × peso).
    // Gli esercizi senza un peso o senza ripetizioni numeriche restano fuori.
    if (carico && rip && colori.tot > 0) volume += carico.numero * rip * colori.tot

    if (carico && (!pesoMax || carico.numero > pesoMax.numero)) {
      pesoMax = { numero: carico.numero, testo: e.schema.carico, esercizio: e.nome }
    }

    // Record personale: oggi hai usato più peso che in qualsiasi volta prima.
    const prec = maxPrec.get(normalizzaNome(e.nome))
    if (carico && colori.tot > 0 && prec != null && carico.numero > prec) {
      record.push({ esercizio: e.nome, carico: e.schema.carico, precedente: prec })
    }

    return {
      nome: e.nome,
      gruppo: gruppoId,
      schema: e.schema,
      serie: colori.tot,
      totSerie: (e.sets || []).length,
      colori,
    }
  })

  // Intensità 0..1 dai colori (giallo mezzo punto, rosso pieno) → MET → kcal.
  // Senza il peso corporeo la formula non ha un ingrediente: niente stima.
  const intensita = sforzo.tot > 0 ? (sforzo.giallo * 0.5 + sforzo.rosso) / sforzo.tot : 0.5
  const met = MET_MIN + (MET_MAX - MET_MIN) * intensita
  const pesoKg = pesoCorporeo(dati, diete)
  const calorieStimate =
    pesoKg != null && durataSec > 0 ? Math.round(met * pesoKg * (durataSec / 3600)) : null

  // Dati letti dall'orologio (Apple Watch & co.) e inseriti a mano a fine
  // allenamento: se ci sono, le calorie MISURATE battono la stima e la card lo
  // dichiara. Nessun collegamento automatico: una PWA non può leggere Salute.
  const calorieReali = numeroPositivo(riep?.calorieReali)
  const fcMedia = numeroPositivo(riep?.fcMedia)
  const fcMax = numeroPositivo(riep?.fcMax)

  const gruppi = gruppiAllenati(esercizi)

  // "3° allenamento del mese": dà il senso della costanza, non del singolo giorno.
  const mese = riep?.data ? new Date(riep.data).getMonth() : new Date().getMonth()
  const anno = riep?.data ? new Date(riep.data).getFullYear() : new Date().getFullYear()
  let nelMese = 0
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (!c.data) continue
      const d = new Date(c.data)
      if (d.getMonth() === mese && d.getFullYear() === anno) nelMese += 1
    }
  }

  return {
    durataSec,
    esercizi: dettaglio,
    numEsercizi: dettaglio.length,
    serieFatte,
    volume,
    volumeTesto: volume > 0 ? formattaMigliaia(volume) + ' kg' : null,
    pesoMax,
    pesoMaxTesto: pesoMax ? pesoMax.testo : null,
    calorie: calorieReali != null ? Math.round(calorieReali) : calorieStimate,
    calorieStimate,
    calorieMisurate: calorieReali != null,
    fcMedia: fcMedia != null ? Math.round(fcMedia) : null,
    fcMax: fcMax != null ? Math.round(fcMax) : null,
    pesoKg,
    sforzo,
    intensita,
    gruppi,
    record,
    nelMese,
    // Ritmo medio: quanto tempo per serie. Dice se è stato un allenamento
    // tirato o rilassato meglio della sola durata.
    secPerSerie: serieFatte > 0 ? Math.round(durataSec / serieFatte) : 0,
  }
}

// "1 h 02 min" / "47 min" — più leggibile di mm:ss su una card da condividere.
export function durataLunga(sec) {
  const m = Math.round((sec || 0) / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const resto = m % 60
  return resto === 0 ? `${h} h` : `${h} h ${String(resto).padStart(2, '0')} min`
}

// "Venerdì 4 settembre 2026"
export function dataLunga(iso) {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso || Date.now()))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Etichetta sintetica dello sforzo, per il sottotitolo della card.
export function etichettaIntensita(intensita) {
  if (intensita >= 0.66) return 'Intenso'
  if (intensita >= 0.33) return 'Impegnativo'
  return 'Scorrevole'
}

export { formattaNumero }
