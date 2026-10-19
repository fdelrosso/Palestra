// ---------------------------------------------------------------------------
// Statistiche del recap di fine allenamento — quelle che rendono un allenamento
// "raccontabile" e non solo una lista di serie.
//
// Tutto si ricava dal riepilogo già salvato (schema + colori delle serie) più
// le schede dell'utente (per i record) e le sue diete (per il peso corporeo,
// che serve alle calorie). Nessun campo nuovo obbligatorio nel modello.
//
// NB: il volume si conta serie per serie (lib/schema): dove una serie non ha un
// numero ("max", "12RM") quella serie non entra nel volume (ma l'esercizio
// resta contato). Le calorie invece
// compaiono SOLO se l'utente le ha scritte: la stima non va più sul recap.
//
// ⚠️ REGOLA: quello che non si sa NON si mostra. Le calorie hanno bisogno del
// peso corporeo, il volume di carichi e ripetizioni numerici, il peso massimo
// di un carico scritto: se il dato non c'è, la cifra vale `null` e la casella
// sparisce dal recap. Prima le calorie si calcolavano su 75 kg di default —
// un numero che sembrava tuo e non lo era.
// ---------------------------------------------------------------------------

import { gruppoDi, sottogruppoDi } from './muscoli'
import { gruppiEsercizio, normalizzaNome, sottogruppiEsercizio } from './eserciziLibreria'
import { formattaNumero } from './carico'
import { caricoMassimoKg, formattaCarico, kgAlzati, obiettivoSerie, ripNumero } from './schema'
import { pesoDi } from './datiFisici'
import { normalizzaLayout } from './recapLayout'

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

// ---- Il volume, serie per serie --------------------------------------------
// Volume = la somma, su ogni serie FATTA (con un pallino), di peso × ripetizioni
// di QUELLA serie. Prima quello registrato chiudendola (`rip`, `kg`: vedi
// serieChiusa in lib/session), se no quello del piano (lib/schema: una
// piramide "15/12/10" ha le sue, "60/70/80kg" i suoi pesi). Di un intervallo
// "8-10" si contano 8, che è sicuro; "max", il tempo, "12RM" e "RPE 8" non sono
// numeri da moltiplicare e la serie resta fuori. Due manubri da 20 ("2×20kg")
// sono 40 kg a ripetizione.

/** I kg alzati a ogni ripetizione nella serie `i`: i fatti, o quelli del piano. */
function pesoFatto(esercizio, s, i) {
  const { carico } = obiettivoSerie(esercizio.schema, i)
  if (s?.kg != null) return s.kg > 0 ? (carico?.coppia ? s.kg * 2 : s.kg) : null
  return kgAlzati(carico)
}

/** Kg alzati in un esercizio: somma sulle serie fatte di peso × ripetizioni. */
export function volumeEsercizio(esercizio) {
  let volume = 0
  ;(esercizio.sets || []).forEach((s, i) => {
    if (!s?.colore) return
    const peso = pesoFatto(esercizio, s, i)
    const r = s.rip ?? ripNumero(obiettivoSerie(esercizio.schema, i).rip)
    if (peso && r) volume += peso * r
  })
  return volume
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

const serieFatte = (e) => (e.sets || []).filter((s) => s?.colore).length

/**
 * I gruppi muscolari toccati dall'allenamento, dal più al meno lavorato.
 * Serve alle pillole colorate del recap e al corpo che si accende di rosso
 * (components/CorpoAllenato): entrambi devono contare le stesse serie.
 * `serieDi` dice quanto conta un esercizio: le serie fatte, o 1 per esercizio
 * dove non c'è niente di fatto (la figurina di un giorno della scheda).
 */
export function gruppiAllenati(esercizi = [], serieDi = serieFatte) {
  const conta = new Map()
  // Per il corpo: le serie di ogni gruppo divise fra i suoi SOTTOGRUPPI
  // (lib/muscoli) e quelle "intere", di esercizi che non dicono quali.
  const sotto = new Map()
  const intere = new Map()
  for (const e of esercizi) {
    const serie = serieDi(e)
    const sg = sottogruppiEsercizio(e)
    // ⚠️ Un esercizio con più gruppi porta le sue serie a TUTTI: tre serie di
    // dip sono tre serie per il petto e tre per i tricipiti. La somma delle
    // pastiglie può quindi superare le serie fatte, ed è giusto così — ogni
    // pastiglia dice quanto ha lavorato QUEL muscolo, non una fetta del totale.
    // Lo stesso per i sottogruppi: uno stacco dà le sue serie ai femorali E ai
    // quadricipiti.
    for (const id of gruppiEsercizio(e)) {
      conta.set(id, (conta.get(id) || 0) + serie)
      const suoi = sg.filter((s) => sottogruppoDi(s)?.gruppo === id)
      if (suoi.length === 0) intere.set(id, (intere.get(id) || 0) + serie)
      for (const s of suoi) {
        const m = sotto.get(id) || {}
        m[s] = (m[s] || 0) + serie
        sotto.set(id, m)
      }
    }
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, serie]) => ({
      id,
      serie,
      label: gruppoDi(id)?.label || id,
      colore: gruppoDi(id)?.colore || '#98a2b3',
      ...(sotto.has(id) ? { sotto: sotto.get(id), intere: intere.get(id) || 0 } : {}),
    }))
}

// Dove cade la macchia di ogni gruppo nello sfondo del post, dal più lavorato
// in giù: il primo in alto a destra (dove la card ha sempre avuto l'alone),
// poi gli angoli e i lati opposti, così le macchie non si coprono. Sono
// posizioni sulla PAGINA (0–100).
const MACCHIE = [
  [85, 4],
  [8, 96],
  [6, 14],
  [94, 88],
  [98, 46],
  [2, 56],
  [50, 102],
  [45, -4],
]
// ⚠️ Lo strato che porta lo sfondo è più grande della pagina (`.post-fondo`,
// inset -30%: 160%) perché si muove senza scoprire i bordi. Posizioni e raggi
// vanno riportati dentro la parte che si vede, se no le macchie degli angoli
// finiscono fuori dallo schermo. Se cambia l'inset nel CSS, cambia qui.
const BORDO = 30
const SCALA = 100 / (100 + 2 * BORDO)
const nelloStrato = (p) => Math.round((BORDO + p) * SCALA * 10) / 10

// Quanto "pesa" un colore sul fondo scuro: la luminanza relativa (WCAG). A
// parità di trasparenza un giallo chiaro si vede più del doppio di un rosso,
// e un allenamento 11 schiena / 8 petto veniva tutto giallo.
function luminanza(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => lin(c / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const tra = (min, v, max) => Math.max(min, Math.min(max, v))

/**
 * Lo sfondo del post nel feed (components/PostSchermo, RecapCartolina): ogni
 * gruppo allenato è una macchia sfumata del suo colore (PASTELLO: un po' di
 * bianco, pieni gridavano). Due allenamenti diversi non hanno mai lo stesso
 * sfondo. Senza gruppi: null, e resta quello del CSS.
 *
 * Quanto conta ogni gruppo lo dicono TRE coefficienti, perché a occhio lo
 * sfondo deve raccontare le stesse proporzioni delle pastiglie:
 *   1. la QUOTA sulle serie totali (11 schiena e 8 petto = 58% e 42%), non
 *      il rapporto sul più lavorato, che gonfiava il primo;
 *   2. la SUPERFICIE della macchia segue la quota (raggio ∝ √quota, quindi
 *      area ∝ quota), e così la sua intensità;
 *   3. la LUMINOSITÀ del colore: i chiari (giallo) si attenuano, gli scuri
 *      (rosso, viola) si rinforzano, se no il giallo copriva tutto.
 * Il fondo scuro sotto prende i due gruppi principali, mischiati nella loro
 * proporzione: tinto dal solo primo, diventava tutto del suo colore.
 * @param {{colore:string, serie:number}[]} gruppi  da gruppiAllenati, in ordine
 */
export function sfondoGruppi(gruppi = []) {
  const m = macchieGruppi(gruppi)
  if (!m) return null
  const pastello = (colore) => `color-mix(in srgb, ${colore} 78%, #fff)`
  const macchie = m.macchie.map(
    (k) =>
      `radial-gradient(${k.raggio}% ${Math.round(k.raggio * 0.65)}% at ${k.x}% ${k.y}%, color-mix(in srgb, ${pastello(k.colore)} ${k.forza}%, transparent), transparent 70%)`,
  )
  const { primo, secondo, quotaPrimo } = m.misto
  const misto = secondo ? `color-mix(in srgb, ${primo} ${quotaPrimo}%, ${secondo})` : primo
  const c = pastello(misto)
  const fondo = `linear-gradient(135deg, color-mix(in srgb, ${c} 8%, #0b0b0d) 0%, color-mix(in srgb, ${c} 16%, #111114) 55%, color-mix(in srgb, ${c} 8%, #0b0b0d) 100%)`
  return [...macchie, fondo].join(', ')
}

/**
 * I numeri di sfondoGruppi, senza il CSS: la card disegnata su canvas
 * (lib/recapImmagine) non sa leggere color-mix e se li ridisegna da sé.
 * Posizioni e raggi sono in % dello STRATO (`.post-fondo`, 160% della pagina).
 * @returns {null | {macchie: {x:number, y:number, raggio:number, forza:number, colore:string}[],
 *   misto: {primo:string, secondo?:string, quotaPrimo:number}}}
 */
export function macchieGruppi(gruppi = []) {
  if (!gruppi.length) return null
  const tot = gruppi.reduce((t, g) => t + (g.serie || 0), 0)
  const quota = (g) => (tot > 0 ? (g.serie || 0) / tot : 1 / gruppi.length)
  const macchie = gruppi.slice(0, MACCHIE.length).map((g, i) => {
    const q = quota(g)
    const compensa = tra(0.6, Math.sqrt(0.3 / Math.max(luminanza(g.colore), 0.01)), 1.5)
    const forza = Math.round(tra(10, (20 + 45 * Math.sqrt(q)) * compensa, 65)) // % di colore al centro
    const raggio = Math.round(tra(30, 115 * Math.sqrt(q), 100) * SCALA) // % dello strato
    const [x, y] = MACCHIE[i]
    return { x: nelloStrato(x), y: nelloStrato(y), raggio, forza, colore: g.colore }
  })
  const [primo, secondo] = gruppi
  return {
    macchie,
    misto: {
      primo: primo.colore,
      secondo: secondo?.colore,
      quotaPrimo: secondo ? Math.round((100 * quota(primo)) / (quota(primo) + quota(secondo))) : 100,
    },
  }
}

/**
 * Lo stile dello strato che porta lo sfondo (`.post-fondo`, che si muove
 * piano): il gradiente e da che punto del giro parte, ricavato dalle serie,
 * così i post uno sotto l'altro non si muovono tutti insieme.
 */
export function stileFondo(gruppi = []) {
  const background = sfondoGruppi(gruppi)
  if (!background) return null
  const serie = gruppi.reduce((s, g) => s + (g.serie || 0), 0)
  return { background, animationDelay: `-${(serie * 7) % 18}s` }
}

/**
 * Gli esercizi che lavorano almeno uno dei gruppi scelti, ognuno col suo posto
 * nell'allenamento (serve a dire "in superserie con" quello di prima, che nel
 * filtro può non esserci). Nessun gruppo scelto = tutti.
 * ⚠️ La regola è quella delle pastiglie (gruppiEsercizio): i dip stanno sotto il
 * petto E sotto i tricipiti. Se scegliendo "Tricipiti · 6" uscissero solo gli
 * esercizi col tricipite come gruppo principale, le serie non tornerebbero.
 * @returns {{esercizio: object, indice: number}[]}
 */
export function eserciziDeiGruppi(esercizi = [], gruppi = []) {
  const scelti = new Set(gruppi)
  return (esercizi || [])
    .map((esercizio, indice) => ({ esercizio, indice }))
    .filter(({ esercizio }) => scelti.size === 0 || gruppiEsercizio(esercizio).some((g) => scelti.has(g)))
}

// Il peso più alto di uno schema in kg, e come si scrive. Con le fasi conta
// la serie più pesante: il 2×2 pesante di un "3×5 poi 2×2".
export function caricoMassimo(schema) {
  const c = caricoMassimoKg(schema)
  return c ? { numero: c.valore, testo: formattaCarico(c) } : null
}

// Il peso più alto di un esercizio FATTO: quello registrato nelle serie
// chiuse, se c'è; se no quello del piano (gli allenamenti di prima).
export function caricoMassimoFatto(esercizio) {
  const fatte = (esercizio?.sets || [])
    .map((s, j) => ({ s, j }))
    .filter(({ s }) => s?.colore && s.kg > 0)
  if (!fatte.length) return caricoMassimo(esercizio?.schema)
  const top = fatte.reduce((a, b) => (b.s.kg > a.s.kg ? b : a))
  const coppia = !!obiettivoSerie(esercizio.schema, top.j).carico?.coppia
  return { numero: top.s.kg, testo: formattaCarico({ tipo: 'kg', valore: top.s.kg, coppia }) }
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
        const p = caricoMassimoFatto(e)
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

    // Il gruppo PRINCIPALE: questo dettaglio ragiona per un gruppo solo.
    const gruppoId = gruppiEsercizio(e)[0] || ''

    const carico = caricoMassimoFatto(e)

    // Volume = i kg alzati davvero, serie per serie (vedi volumeEsercizio).
    // Le serie senza un peso o senza ripetizioni numeriche restano fuori.
    volume += volumeEsercizio(e)

    if (carico && (!pesoMax || carico.numero > pesoMax.numero)) {
      pesoMax = { numero: carico.numero, testo: carico.testo, esercizio: e.nome }
    }

    // Record personale: oggi hai usato più peso che in qualsiasi volta prima.
    const prec = maxPrec.get(normalizzaNome(e.nome))
    if (carico && colori.tot > 0 && prec != null && carico.numero > prec) {
      record.push({ esercizio: e.nome, carico: carico.testo, precedente: prec })
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

  // ⚠️ Niente più "3° allenamento del mese": l'utente non lo vuole sul recap
  // (2026-09-18).

  return {
    durataSec,
    esercizi: dettaglio,
    numEsercizi: dettaglio.length,
    serieFatte,
    volume,
    volumeTesto: volume > 0 ? formattaMigliaia(volume) + ' kg' : null,
    pesoMax,
    pesoMaxTesto: pesoMax ? pesoMax.testo : null,
    // ⚠️ Le calorie sono FACOLTATIVE (2026-09-18): ci sono solo se l'utente le
    // ha scritte (dall'orologio). La stima resta calcolata ma non si mostra da
    // sola: un numero che non hai inserito non deve comparire sul tuo recap.
    calorie: calorieReali != null ? Math.round(calorieReali) : null,
    calorieStimate,
    calorieMisurate: calorieReali != null,
    fcMedia: fcMedia != null ? Math.round(fcMedia) : null,
    fcMax: fcMax != null ? Math.round(fcMax) : null,
    pesoKg,
    sforzo,
    intensita,
    gruppi,
    record,
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

// "9:23–10:33": l'orario dell'allenamento, accanto alla data in fondo al
// recap. Nel completamento c'è la FINE (`data`, il "Termina") e la durata:
// l'inizio è la fine meno la durata. Senza durata (un "fatto" segnato a mano)
// un orario non c'è, e non lo si inventa.
export function orarioAllenamento(iso, durataSec) {
  const fine = new Date(iso || '')
  if (Number.isNaN(fine.getTime()) || !(durataSec > 0)) return ''
  const inizio = new Date(fine.getTime() - durataSec * 1000)
  const ora = (d) => new Intl.DateTimeFormat('it-IT', { hour: 'numeric', minute: '2-digit' }).format(d)
  return `${ora(inizio)}–${ora(fine)}`
}

// Etichetta sintetica dello sforzo, per il sottotitolo della card.
export function etichettaIntensita(intensita) {
  if (intensita >= 0.66) return 'Intenso'
  if (intensita >= 0.33) return 'Impegnativo'
  return 'Scorrevole'
}

export { formattaNumero }

// Il trattino lo scrivevano le versioni vecchie al posto del dato mancante.
const haValore = (v) => !!v && v !== '-'

/**
 * I blocchi del recap, già scremati di quello che è spento o non ha un dato,
 * con i vicini fusi: le tessere in una striscia, esercizi-serie-battito in una
 * riga, lo sforzo subito dopo i muscoli sotto le loro pillole. `perno` segna
 * dov’è la lista esercizi (anche spenta): quello che segue va in fondo.
 * ⚠️ È LA regola sia del feed (components/RecapPost) sia dell’immagine da
 * condividere (lib/recapImmagine): così le due non possono divergere.
 * @param {object} voce  data, nomeScheda, settimana, recap (il layout), nota
 */
export function pezziRecap(voce, stat, senzaCommento = false) {
  const L = normalizzaLayout(voce.recap)
  const on = (id) => !L.nascosti.includes(id)
  const out = []
  const ultimo = () => out[out.length - 1]
  const tessera = (t) => {
    if (ultimo()?.tipo === 'griglia') ultimo().tessere.push(t)
    else out.push({ tipo: 'griglia', tessere: [t] })
  }
  const contorno = (parte) => {
    if (ultimo()?.tipo === 'contorno') ultimo().parti.push(parte)
    else out.push({ tipo: 'contorno', parti: [parte] })
  }

  for (const id of L.ordine) {
    // Il perno c'è anche con la lista spenta: quello che segue va in fondo.
    if (id === 'esercizi') out.push({ tipo: 'perno', esercizi: on('esercizi') && stat.esercizi.length > 0 })
    if (!on(id)) continue
    switch (id) {
      case 'data':
        if (voce.data) out.push({ tipo: 'data' })
        break
      case 'titolo':
        out.push({ tipo: 'titolo' })
        break
      case 'sottotitolo': {
        const testo = [
          voce.nomeScheda,
          voce.settimana != null ? `Settimana ${voce.settimana}` : null,
          stat.sforzo.tot > 0 ? etichettaIntensita(stat.intensita) : null,
        ]
          .filter(Boolean)
          .join(' · ')
        if (testo) out.push({ tipo: 'sottotitolo', testo })
        break
      }
      case 'durata':
        if (stat.durataSec > 0) {
          tessera({
            etichetta: 'Durata',
            valore: durataLunga(stat.durataSec),
            // "1 h 10 min" non sta in un quarto di riga: "1 h 10" si capisce.
            valoreCorto: durataLunga(stat.durataSec).replace(/(h \d+) min$/, '$1'),
            nota: stat.secPerSerie ? `~${mmss(stat.secPerSerie)} a serie` : '',
            notaCorta: stat.secPerSerie ? `~${mmss(stat.secPerSerie)}/serie` : '',
          })
        }
        break
      case 'volume':
        if (haValore(stat.volumeTesto)) tessera({ etichetta: 'Volume', valore: stat.volumeTesto, accento: true })
        break
      case 'pesoMax':
        if (haValore(stat.pesoMaxTesto)) {
          tessera({
            etichetta: 'Peso max',
            corta: 'Max',
            valore: stat.pesoMaxTesto,
            nota: stat.pesoMax?.esercizio,
          })
        }
        break
      case 'calorie':
        if (stat.calorie != null && stat.calorieMisurate) {
          tessera({
            etichetta: 'Calorie',
            corta: 'Kcal',
            valore: `${formattaMigliaia(stat.calorie)} kcal`,
            valoreCorto: formattaMigliaia(stat.calorie),
          })
        }
        break
      case 'conteggi':
        if (stat.numEsercizi > 0) contorno({ t: `${stat.numEsercizi} esercizi` })
        if (stat.serieFatte > 0) contorno({ t: `${stat.serieFatte} serie` })
        break
      case 'battito':
        if (stat.fcMedia) contorno({ t: `♥ ${stat.fcMedia} bpm${stat.fcMax ? ` · max ${stat.fcMax}` : ''}`, rosso: true })
        break
      case 'corpo':
        if (stat.gruppi.length) out.push({ tipo: 'corpo', sforzo: false })
        break
      case 'sforzo':
        if (!stat.sforzo.tot) break
        if (ultimo()?.tipo === 'corpo' && !ultimo().sforzo) ultimo().sforzo = true
        else out.push({ tipo: 'sforzo' })
        break
      case 'record':
        if (stat.record.length) out.push({ tipo: 'record', record: stat.record.slice(0, 2) })
        break
      case 'commento': {
        const testo = String(voce.nota || '').trim()
        if (testo && !senzaCommento) out.push({ tipo: 'commento', testo })
        break
      }
    }
  }
  return { pezzi: out, L }
}
