// ---------------------------------------------------------------------------
// PESO E MISURE: come cambia il corpo, giorno per giorno.
//
// Il peso dei dati fisici (lib/datiFisici) è UNO, quello di adesso: serve alle
// calorie, e ogni volta che lo si cambia quello di prima sparisce. Per capire
// se una dieta funziona serve invece la STORIA: il peso di oggi accanto a
// quello di un mese fa, e le misure (vita, fianchi…) che spesso si muovono
// quando la bilancia sta ferma.
//
// Una voce per GIORNO: chi si pesa due volte lo stesso giorno corregge la
// voce di quel giorno, non ne aggiunge un'altra. Tutti i campi sono
// facoltativi, basta che ce ne sia uno.
//
// ⚠️ DOVE STANNO. Dentro le preferenze del profilo (`preferenze.misure`),
// come "i miei cibi" (vedi la testa di lib/cibiMiei): una riga per persona
// che si sincronizza già da sola e che vede solo lei. Una tabella nuova
// vorrebbe dire rilanciare `schema.sql` sul database di tutti; per qualche
// centinaio di pesate in anni non vale. Il PT non le vede: se e quando, lo si
// decide a parte.
//
// ⚠️ L'ultima pesata è anche il peso dei dati fisici: chi la scrive qui
// aggiorna il peso con cui l'app conta le calorie (pages/DietaPesoPage).
// ---------------------------------------------------------------------------

/** I campi di una voce, nell'ordine in cui si mostrano. */
export const CAMPI_MISURE = [
  { id: 'peso', label: 'Peso', unita: 'kg', min: 30, max: 300 },
  { id: 'vita', label: 'Vita', unita: 'cm', min: 40, max: 200 },
  { id: 'fianchi', label: 'Fianchi', unita: 'cm', min: 50, max: 200 },
  { id: 'petto', label: 'Petto', unita: 'cm', min: 50, max: 200 },
  { id: 'braccio', label: 'Braccio', unita: 'cm', min: 15, max: 70 },
  { id: 'coscia', label: 'Coscia', unita: 'cm', min: 25, max: 100 },
  { id: 'grasso', label: 'Massa grassa', unita: '%', min: 3, max: 60 },
]

const MAX_VOCI = 1000
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/

export function campoMisura(id) {
  return CAMPI_MISURE.find((c) => c.id === id) || null
}

/**
 * Un numero dentro i limiti del campo, oppure null. Arriva da un <input>:
 * stringa, vuoto, virgola italiana ("78,5").
 */
export function valoreMisura(id, v) {
  const c = campoMisura(id)
  if (!c || v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  if (!Number.isFinite(n) || n < c.min || n > c.max) return null
  return Math.round(n * 10) / 10
}

/** Il testo dell'errore per un campo fuori scala, o '' se va bene (o è vuoto). */
export function erroreMisura(id, v) {
  if (v == null || String(v).trim() === '') return ''
  if (valoreMisura(id, v) != null) return ''
  const c = campoMisura(id)
  return `${c.label}: tra ${c.min} e ${c.max} ${c.unita}`
}

/** Una voce pulita, o null se non ha una data o nemmeno un numero buono. */
export function normalizzaVoceMisure(v) {
  if (!v || typeof v !== 'object' || !RE_DATA.test(String(v.data || ''))) return null
  const voce = { data: v.data }
  for (const c of CAMPI_MISURE) {
    const n = valoreMisura(c.id, v[c.id])
    if (n != null) voce[c.id] = n
  }
  if (Object.keys(voce).length === 1) return null
  return voce
}

/** L'elenco pulito: una voce per giorno (vince l'ultima), dalla più vecchia. */
export function normalizzaMisure(lista) {
  if (!Array.isArray(lista)) return []
  const perGiorno = new Map()
  for (const v of lista) {
    const voce = normalizzaVoceMisure(v)
    if (voce) perGiorno.set(voce.data, voce)
  }
  return [...perGiorno.values()].sort((a, b) => a.data.localeCompare(b.data)).slice(-MAX_VOCI)
}

/** L'elenco con la voce di quel giorno al posto di quella che c'era. */
export function conMisura(lista, voce) {
  const v = normalizzaVoceMisure(voce)
  if (!v) return normalizzaMisure(lista)
  return normalizzaMisure([...(lista || []).filter((x) => x?.data !== v.data), v])
}

export function senzaMisura(lista, data) {
  return normalizzaMisure((lista || []).filter((x) => x?.data !== data))
}

/** La voce di un giorno, o null. */
export function misuraDel(lista, data) {
  return normalizzaMisure(lista).find((v) => v.data === data) || null
}

/** I punti di un campo nel tempo: solo i giorni in cui c'è. */
export function andamento(lista, campo) {
  return normalizzaMisure(lista)
    .filter((v) => v[campo] != null)
    .map((v) => ({ data: v.data, valore: v[campo] }))
}

/** L'ultimo valore di un campo, con la sua data, o null. */
export function ultimaMisura(lista, campo) {
  const punti = andamento(lista, campo)
  return punti.length ? punti[punti.length - 1] : null
}

/**
 * Il peso da riportare nei dati fisici dopo una modifica, o null se non serve.
 * Solo quando cambia l'ULTIMA pesata: correggere una voce vecchia non deve
 * coprire il peso scritto a mano in "I miei dati" dopo l'ultima pesata.
 */
export function pesoDaAllineare(prima, dopo) {
  const a = ultimaMisura(prima, 'peso')
  const b = ultimaMisura(dopo, 'peso')
  if (!b || (a?.data === b.data && a.valore === b.valore)) return null
  return b.valore
}

const giorni = (da, a) => Math.round((Date.parse(a) - Date.parse(da)) / 86_400_000)

/**
 * Di quanto è cambiato un campo, dall'ultima voce indietro di circa `periodo`
 * giorni: il confronto è con la voce più vicina a quella data, mai più
 * recente. Null se c'è una voce sola o nessuna abbastanza vecchia.
 * @returns {{differenza:number, da:string, a:string, giorni:number}|null}
 */
export function variazione(lista, campo, periodo = 30) {
  const punti = andamento(lista, campo)
  if (punti.length < 2) return null
  const ultimo = punti[punti.length - 1]
  const prima = punti.slice(0, -1)
  // La più recente fra quelle almeno `periodo` giorni prima; se non ce ne
  // sono, la prima di tutte (si dice da quanti giorni).
  const vecchie = prima.filter((p) => giorni(p.data, ultimo.data) >= periodo)
  const base = vecchie.length ? vecchie[vecchie.length - 1] : prima[0]
  return {
    differenza: Math.round((ultimo.valore - base.valore) * 10) / 10,
    da: base.data,
    a: ultimo.data,
    giorni: giorni(base.data, ultimo.data),
  }
}

/** "78,4" all'italiana, senza zeri inutili. */
export function numeroMisura(n) {
  if (n == null) return ''
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

/** "−1,2 kg" / "+0,5 cm" / "= 0 kg". */
export function testoVariazione(differenza, unita) {
  if (differenza === 0) return `= 0 ${unita}`
  const segno = differenza > 0 ? '+' : '−'
  return `${segno}${numeroMisura(Math.abs(differenza))} ${unita}`
}

/** "in 34 giorni", "da ieri", "da oggi". */
export function testoGiorni(n) {
  if (n <= 0) return 'da oggi'
  if (n === 1) return 'da ieri'
  return `in ${n} giorni`
}
