// ---------------------------------------------------------------------------
// Correggere un allenamento già svolto: quando è finito e quanto è durato.
//
// Il caso da cui nasce: ieri non si è premuto "Termina", lo si preme oggi, e
// l'app registra un allenamento di 16 ore fatto oggi. I dati delle serie sono
// giusti, sono sbagliati l'orologio e il calendario — e sono proprio le due
// cose che calorie, recap e consigli usano come se fossero vere.
//
// ⚠️ LA DATA È ANCHE L'IDENTITÀ. Un completamento non ha un id: lo riconoscono
// `schedaId` + `data` (aggiornaCompletamento, eliminaCompletamento, e la
// chiave delle foto in lib/fotoAllenamento). Cambiare la data vuol dire
// cambiare la chiave, e chi chiama deve spostare con lei le foto attaccate —
// se no restano appese a un allenamento che non esiste più.
//
// ⚠️ `data` è l'ora di FINE, non di inizio: è così che la scrive
// riepilogoSessione (lib/session). Qui si chiede quindi "quando l'hai finito",
// che è anche la domanda a cui si sa rispondere guardando l'orologio.
// ---------------------------------------------------------------------------

/** La durata massima accettata. Oltre, è quasi sempre il caso "dimenticato aperto". */
import { conCarico, formatCarico, leggiCarico, normalizzaSchema, obiettivoSerie } from './schema.js'

export const DURATA_MAX_MIN = 12 * 60

const due = (n) => String(n).padStart(2, '0')

/**
 * I valori da mettere nel modulo, presi dall'allenamento com'è adesso.
 * Tutto in ORARIO LOCALE: il calendario raggruppa per giorno locale, e un
 * allenamento finito alle 00:30 deve risultare del giorno in cui lo si vede.
 */
export function valoriIniziali(c) {
  const d = new Date(c?.data || Date.now())
  const sec = Number.isFinite(c?.durataSec) ? c.durataSec : 0
  const min = Math.round(sec / 60)
  return {
    giorno: `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`,
    ora: `${due(d.getHours())}:${due(d.getMinutes())}`,
    ore: String(Math.floor(min / 60)),
    minuti: String(min % 60),
    nota: c?.nota || '',
  }
}

/** Dura in modo sospetto? Serve a suggerire la correzione prima che la si chieda. */
export function durataSospetta(c) {
  return Number.isFinite(c?.durataSec) && c.durataSec > 4 * 3600
}

/**
 * Dai valori del modulo alla modifica da salvare.
 *
 * @param {object} c       il completamento com'è adesso
 * @param {object} v       { giorno:'YYYY-MM-DD', ora:'HH:MM', ore, minuti, nota }
 * @param {{ adesso?: Date, haDurata?: boolean }} [opts]
 *   `haDurata` = false per gli allenamenti segnati a mano, che una durata non
 *   l'avevano: lasciare vuoti ore e minuti non deve inventargliene una.
 * @returns {{ ok:boolean, patch?:object, cambiaData?:boolean, errore?:string }}
 */
export function patchDaValori(c, v, { adesso = new Date(), haDurata = true } = {}) {
  const [a, m, g] = String(v.giorno || '').split('-').map(Number)
  const [hh, mm] = String(v.ora || '').split(':').map(Number)
  if (!a || !m || !g || !Number.isFinite(hh) || !Number.isFinite(mm)) {
    return { ok: false, errore: 'Manca il giorno o l’ora.' }
  }
  const fine = new Date(a, m - 1, g, hh, mm, 0, 0)
  // Il giorno scritto deve esistere davvero: new Date(2026, 1, 31) diventa il
  // 3 marzo senza dire niente, e l'allenamento finirebbe in un altro mese.
  if (fine.getFullYear() !== a || fine.getMonth() !== m - 1 || fine.getDate() !== g) {
    return { ok: false, errore: 'Quel giorno non esiste.' }
  }
  if (fine.getTime() > adesso.getTime() + 60 * 1000) {
    return { ok: false, errore: 'Un allenamento non può finire nel futuro.' }
  }

  const patch = { nota: String(v.nota || '').trim() }

  const oreVuote = String(v.ore ?? '').trim() === '' && String(v.minuti ?? '').trim() === ''
  if (haDurata || !oreVuote) {
    const ore = Number(String(v.ore || '0').trim() || 0)
    const minuti = Number(String(v.minuti || '0').trim() || 0)
    if (!Number.isInteger(ore) || !Number.isInteger(minuti) || ore < 0 || minuti < 0 || minuti > 59) {
      return { ok: false, errore: 'La durata va scritta in ore e minuti (0-59).' }
    }
    const totale = ore * 60 + minuti
    if (totale < 1) return { ok: false, errore: 'La durata deve essere di almeno un minuto.' }
    if (totale > DURATA_MAX_MIN) {
      return { ok: false, errore: `Oltre ${DURATA_MAX_MIN / 60} ore non è un allenamento: controlla la durata.` }
    }
    patch.durataSec = totale * 60
  }

  // ⚠️ La data si riscrive SOLO se è cambiata davvero. Riconvertire la stessa
  // ora darebbe una stringa diversa (i secondi e i millesimi dell'originale si
  // perdono), e basterebbe a staccare le foto da un allenamento mai spostato.
  const prima = new Date(c.data)
  const stessoMinuto =
    prima.getFullYear() === fine.getFullYear() &&
    prima.getMonth() === fine.getMonth() &&
    prima.getDate() === fine.getDate() &&
    prima.getHours() === fine.getHours() &&
    prima.getMinutes() === fine.getMinutes()
  if (!stessoMinuto) patch.data = fine.toISOString()

  return { ok: true, patch, cambiaData: !stessoMinuto }
}

// ---------------------------------------------------------------------------
// Carichi e pallini. All'inizio le serie non si toccavano ("sono l'unica cosa
// registrata mentre succedeva"). Ma capita di doverle rimettere a posto: un
// allenamento rovinato da un "Ripeti" chiuso a meta', un carico scritto male,
// una serie colorata di fretta. Si corregge a mano, e chi lo fa sa cosa ha
// fatto: e' meglio uno storico giusto scritto dopo che uno sbagliato.
// ---------------------------------------------------------------------------

// Il giro di un pallino toccato: vuoto → facile → medio → duro → vuoto.
const GIRO_COLORI = [null, 'verde', 'giallo', 'rosso']

/** Il colore dopo `colore` nel giro dei pallini. */
export function coloreSuccessivo(colore) {
  const i = GIRO_COLORI.indexOf(colore || null)
  return GIRO_COLORI[(i + 1) % GIRO_COLORI.length]
}

/** Gli esercizi del modulo: carico e colori, copiati per poterli cambiare. */
export function eserciziIniziali(c) {
  return (c?.esercizi || []).map((e) => ({
    // Il carico come si legge (lib/schema): "80kg", o "80kg + 90kg" con le fasi.
    carico: formatCarico(e.schema),
    colori: (e.sets || []).map((s) => s.colore || null),
    // Le ripetizioni fatte delle serie dure: si mostrano nel pallino finché
    // resta rosso (vedi eserciziDaValori).
    rip: (e.sets || []).map((s) => (s.colore === 'rosso' && s.rip != null ? s.rip : null)),
  }))
}

// Una serie col colore nuovo. Ripetizioni e kg fatti restano: dicono cosa si
// è fatto, il colore com'è andata. Una serie rimessa "da fare" non ha fatto
// niente, e li perde.
function conColore(s, colore) {
  if (!colore) return { colore: null }
  return { ...s, colore }
}

// I kg di una serie fatta secondo il carico NUOVO dello schema: cambiare il
// carico nel modulo vuol dire "ho usato questo".
function conKgDelPiano(s, schema, j) {
  if (!s.colore) return s
  const { kg: _, ...resto } = s
  const c = obiettivoSerie(schema, j).carico
  return c && !Array.isArray(c) && c.tipo === 'kg' && c.valore > 0 ? { ...resto, kg: c.valore } : resto
}

/**
 * Gli esercizi da salvare, o null se nessuno e' cambiato (cosi' la patch non
 * riscrive un campo intero per niente).
 * ⚠️ Si toccano SOLO il carico dello schema e le serie (colore, e i kg fatti
 * quando cambia il carico): nome, gruppi, superserie e il resto dello schema
 * restano quelli registrati. Un carico scritto in un modo che non si capisce
 * resta quello di prima.
 */
export function eserciziDaValori(c, valori) {
  const esercizi = c?.esercizi || []
  let cambiato = false
  const nuovi = esercizi.map((e, i) => {
    const v = valori?.[i]
    if (!v) return e
    const testo = String(v.carico ?? '').trim()
    const schemaNuovo = testo === formatCarico(e.schema) ? null : schemaConCaricoTesto(e.schema, testo)
    const caricoCambiato = !!schemaNuovo
    const setsCambiati = (e.sets || []).some((s, j) => (s.colore || null) !== (v.colori[j] || null))
    if (!caricoCambiato && !setsCambiati) return e
    cambiato = true
    return {
      ...e,
      schema: caricoCambiato ? schemaNuovo : e.schema,
      sets: (setsCambiati || caricoCambiato)
        ? (e.sets || []).map((s, j) => {
            const col = setsCambiati ? conColore(s, v.colori[j] || null) : s
            return caricoCambiato ? conKgDelPiano(col, schemaNuovo, j) : col
          })
        : e.sets,
    }
  })
  return cambiato ? nuovi : null
}

/**
 * Lo schema col carico scritto nel modulo, o null se il testo non si capisce.
 * Vuoto = nessun carico. Con le fasi si può scrivere un carico per fase,
 * separati da "+" come li mostra formatCarico ("80kg + 90kg"); uno solo vale
 * per tutte.
 */
export function schemaConCaricoTesto(schema, testo) {
  const s = normalizzaSchema(schema)
  const t = String(testo ?? '').trim()
  if (!t) return conCarico(s, null)
  const pezzi = t.split('+').map((p) => p.trim())
  if (s.fasi.length > 1 && pezzi.length === s.fasi.length) {
    const carichi = pezzi.map((p) => (p === '—' ? { carico: null, resto: '' } : leggiCarico(p)))
    if (carichi.some((c) => c.resto)) return null
    return { ...s, fasi: s.fasi.map((f, k) => ({ ...f, carico: carichi[k].carico })) }
  }
  const { carico, resto } = leggiCarico(t)
  if (!carico || resto) return null
  return conCarico(s, carico)
}
