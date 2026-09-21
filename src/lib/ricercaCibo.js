// ---------------------------------------------------------------------------
// CERCARE UN ALIMENTO FUORI DAL CATALOGO: Open Food Facts.
//
// Il catalogo di lib/alimenti sa cos'è il "petto di pollo", non cos'è lo
// yogurt greco della Fage da 150g. Per quello serve una banca dati di prodotti
// veri, e questa è Open Food Facts: aperta, senza chiave, senza account, con
// una copertura italiana reale (marche da supermercato comprese).
//
// Si entra in due modi, e tutti e due restano DENTRO l'app: si scrive il nome
// e si sceglie da un elenco, oppure si inquadra il codice a barre. In nessun
// caso si manda la persona su un altro sito.
//
// ⚠️ QUESTO PEZZO HA BISOGNO DELLA RETE, ed è l'unico di tutta la dieta. Il
// resto dell'app è costruito per funzionare in palestra col telefono senza
// campo, quindi qui si fa attenzione a tre cose:
//   - si distingue "il server ha detto che non c'è" da "non sono riuscito a
//     parlargli" (è la stessa distinzione di lib/supabase, ed è la più
//     importante: al primo si risponde "non l'ho trovato", al secondo "riprova
//     quando hai campo");
//   - c'è un tempo massimo, se no su una rete lenta la pagina resta appesa;
//   - quello che si trova viene salvato fra "i miei cibi" (lib/cibiMiei), così
//     la seconda volta non serve più la rete.
//
// ⚠️ I dati sono compilati dagli utenti e NON sono tutti completi: ci sono
// prodotti senza valori nutrizionali. Quelli tornano indietro segnati e NON si
// inventano numeri, esattamente come per gli alimenti che non si riconoscono
// nel diario. Un valore sbagliato è peggio di un valore mancante.
// ---------------------------------------------------------------------------

const BASE_PRODOTTO = 'https://world.openfoodfacts.org/api/v2/product'
// La ricerca passa dal dominio italiano: a parità di parole mette davanti i
// prodotti venduti qui, che è quello che serve a chi fa la spesa in Italia.
const BASE_RICERCA = 'https://it.openfoodfacts.org/cgi/search.pl'

const CAMPI = 'code,product_name,product_name_it,brands,quantity,serving_quantity,nutriments'
const ATTESA_MAX = 8000

/** Errore che sa dire se la colpa è della rete o della risposta. */
export class ErroreRicerca extends Error {
  constructor(messaggio, { diRete = false } = {}) {
    super(messaggio)
    this.name = 'ErroreRicerca'
    this.diRete = diRete
  }
}

async function chiedi(url) {
  const taglia = new AbortController()
  const timer = setTimeout(() => taglia.abort(), ATTESA_MAX)
  try {
    const risposta = await fetch(url, { signal: taglia.signal, headers: { Accept: 'application/json' } })
    if (!risposta.ok) {
      throw new ErroreRicerca(`Il servizio ha risposto ${risposta.status}. Riprova fra poco.`)
    }
    return await risposta.json()
  } catch (e) {
    if (e instanceof ErroreRicerca) throw e
    // AbortError, TypeError ("Failed to fetch"), DNS: sono tutti "non ci sono
    // arrivato". ⚠️ Vanno detti in modo diverso da "non l'ho trovato": qui il
    // prodotto potrebbe esserci benissimo.
    const scaduto = e?.name === 'AbortError'
    throw new ErroreRicerca(
      scaduto
        ? 'Il servizio non ha risposto in tempo. Riprova, o scrivi i valori a mano.'
        : 'Non riesco a collegarmi: serve la rete per cercare un alimento nuovo.',
      { diRete: true },
    )
  } finally {
    clearTimeout(timer)
  }
}

const numero = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Le calorie di 100g del prodotto. Open Food Facts a volte ha solo i kJ
 * (l'etichetta europea li riporta per primi), e 1 kcal = 4,184 kJ.
 */
function kcalDi(n) {
  const dirette = numero(n?.['energy-kcal_100g']) ?? numero(n?.['energy-kcal'])
  if (dirette != null) return Math.round(dirette)
  const kj = numero(n?.['energy-kj_100g']) ?? numero(n?.energy_100g)
  return kj == null ? null : Math.round(kj / 4.184)
}

/**
 * Da una riga di Open Food Facts a un alimento nella FORMA DI CASA NOSTRA —
 * la stessa di lib/alimenti: macro per 100g in `m`, più le calorie quando non
 * sono 4/4/9 (succede spesso: fibre, polioli, alcol).
 *
 * @returns {object|null} null se non è nemmeno un prodotto con un nome.
 */
export function daProdotto(riga) {
  if (!riga) return null
  const nome = (riga.product_name_it || riga.product_name || '').trim()
  if (!nome) return null
  const n = riga.nutriments || {}
  const p = numero(n.proteins_100g)
  const c = numero(n.carbohydrates_100g)
  const g = numero(n.fat_100g)
  const kcal = kcalDi(n)
  // Senza NESSUN valore non è un alimento utilizzabile: si mostra lo stesso,
  // perché l'utente lo riconosce e può scrivere i numeri lui, ma va detto.
  const senzaValori = p == null && c == null && g == null && kcal == null

  return {
    id: `off:${riga.code}`,
    codice: String(riga.code || ''),
    nome,
    marca: (riga.brands || '').split(',')[0].trim(),
    confezione: (riga.quantity || '').trim(),
    // Le porzioni di OFF sono spesso sbagliate o assenti: si tiene solo se è
    // un numero sensato, se no la quantità la chiede l'app.
    pezzo: (() => {
      const q = numero(riga.serving_quantity)
      return q && q >= 5 && q <= 1500 ? Math.round(q) : undefined
    })(),
    m: { p: p ?? 0, c: c ?? 0, g: g ?? 0 },
    kcal: kcal ?? undefined,
    senzaValori,
    fonte: 'openfoodfacts',
  }
}

/**
 * Il prodotto di un codice a barre.
 * @returns {object|null} null = codice valido ma sconosciuto al servizio.
 */
export async function cercaPerCodice(codice) {
  const pulito = String(codice || '').replace(/\D/g, '')
  if (pulito.length < 6) throw new ErroreRicerca('Questo non sembra un codice a barre.')
  const dati = await chiedi(`${BASE_PRODOTTO}/${pulito}.json?fields=${CAMPI}`)
  // `status` 0 = non trovato. Non è un errore: è una risposta.
  if (!dati || dati.status === 0 || !dati.product) return null
  return daProdotto({ ...dati.product, code: dati.product.code || pulito })
}

/**
 * I prodotti che somigliano a quello che si è scritto, i più completi prima:
 * un elenco pieno di voci senza valori nutrizionali non serve a niente.
 */
export async function cercaPerNome(testo, { limite = 12 } = {}) {
  const q = String(testo || '').trim()
  if (q.length < 3) return []
  const url =
    `${BASE_RICERCA}?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${Math.min(40, limite * 3)}&fields=${CAMPI}`
  const dati = await chiedi(url)
  const trovati = (dati?.products || []).map(daProdotto).filter(Boolean)
  const completi = trovati.filter((a) => !a.senzaValori)
  const vuoti = trovati.filter((a) => a.senzaValori)
  // Via i doppioni: lo stesso prodotto compare con piu' codici a barre.
  const visti = new Set()
  return [...completi, ...vuoti]
    .filter((a) => {
      const chiave = `${a.nome.toLowerCase()}|${a.marca.toLowerCase()}`
      if (visti.has(chiave)) return false
      visti.add(chiave)
      return true
    })
    .slice(0, limite)
}
