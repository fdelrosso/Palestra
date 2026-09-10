import { visibileA } from './visibilita'

// ---------------------------------------------------------------------------
// Schede Generali: tutte le schede inserite nell'app da QUALSIASI utente,
// trasversali ai profili (come lo Storico Allenamenti ma per le schede stesse).
// Servono per prendere spunto: si può cercare per esercizio e filtrare per
// numero di allenamenti a settimana o durata (settimane) della scheda.
//
// Chi ha un PERSONAL TRAINER trova in cima le schede che lo riguardano: quelle
// scritte dal suo PT e quelle degli altri atleti che lui segue — è lì che c'è
// da prendere spunto davvero. Per tutti gli altri l'ordine resta quello di
// prima (dalla più recente): l'influenza dei PT sui consigli resta leggera.
//
// VISIBILITÀ: creando una scheda si sceglie chi la vede (lib/visibilita). Qui
// compaiono solo le **pubbliche**, più sempre le proprie. Quelle "solo al PT"
// le vede il proprio PT nella sezione Lavoro (schedeDiUtente con comePt).
//
// Come lo Storico, non legge niente da sola: le schede degli altri arrivano
// dal database già filtrate (lib/collettivo), e qui si contano e si ordinano.
// ⚠️ Chi ha scritto la scheda è un PT? È un altro atleta del MIO PT? Non lo si
// può dedurre da qui: vorrebbe dire leggere il profilo di uno sconosciuto, e il
// database — giustamente — non lo permette. Le due risposte arrivano insieme
// alle schede (`autoreEPt`, `relazionePt`), calcolate là dove si possono
// calcolare.
// ---------------------------------------------------------------------------

// Nomi degli esercizi (giorni workout), utili per la ricerca.
function nomiEsercizi(scheda) {
  const nomi = []
  for (const g of scheda.giorni) {
    if (g.tipo !== 'workout') continue
    for (const e of g.esercizi) {
      const n = (e.nome || '').trim()
      if (n) nomi.push(n)
    }
  }
  return nomi
}

/**
 * Tutte le schede che si possono vedere, arricchite con l'autore e con i campi
 * derivati per filtro/ricerca.
 * @param {{ collettivo?: import('./collettivo').Collettivo|null,
 *   utente?: {id?:string}|null }} [opts] `collettivo` = le schede che il
 *   database lascia vedere (useCollettivo); `utente` = chi sta guardando, per
 *   riconoscere le proprie (che si vedono sempre, anche se non pubbliche).
 */
export function schedeGenerali({ collettivo = null, utente = null } = {}) {
  const out = []
  for (const v of collettivo?.schede || []) {
    const { scheda } = v
    if (scheda.libera) continue // le schede degli allenamenti liberi non sono "spunti"
    // Le tue le vedi sempre; delle altrui solo quelle rese pubbliche.
    const mia = v.utenteId === utente?.id
    if (!mia && !visibileA(scheda)) continue
    const giorniWorkout = scheda.giorni.filter((g) => g.tipo === 'workout')
    const eserciziNomi = nomiEsercizi(scheda)
    out.push({
      key: `${v.utenteId}:${scheda.id}`,
      utenteId: v.utenteId,
      utenteNome: v.utenteNome,
      autoreEPt: v.autoreEPt,
      relazionePt: v.relazionePt,
      scheda,
      nome: scheda.nome,
      nota: scheda.nota,
      numeroSettimane: scheda.numeroSettimane,
      numAllenamenti: giorniWorkout.length, // allenamenti a settimana
      numEsercizi: eserciziNomi.length,
      eserciziNomi,
      creataIl: scheda.creataIl,
    })
  }
  out.sort(
    (a, b) => b.relazionePt - a.relazionePt || new Date(b.creataIl || 0) - new Date(a.creataIl || 0),
  )
  return out
}

/**
 * Le schede di UN profilo, dalla più recente: quelle di un atleta viste dal suo
 * PT (sezione Lavoro) o quelle di un amico. La prima della lista è la più
 * recente, cioè quella su cui sta lavorando adesso.
 * @param {{id:string}} utente
 * @param {{ collettivo?: import('./collettivo').Collettivo|null, comePt?: boolean }} [opts]
 *   `comePt` = chi guarda è il suo personal trainer: allora vede anche le
 *   schede marcate "solo al PT".
 */
export function schedeDiUtente(utente, { collettivo = null, comePt = false } = {}) {
  if (!utente?.id) return []
  return (collettivo?.schede || [])
    .filter((v) => v.utenteId === utente.id)
    .map((v) => v.scheda)
    .filter((s) => !s.libera && visibileA(s, { comePt }))
    .sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0))
}
