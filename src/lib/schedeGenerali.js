import { normalizzaScheda } from '../data/model'
import { caricaUtenti, chiaviUtente } from './utenti'
import { isPt } from './pt'
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
// Come lo Storico, legge da localStorage i dati di tutti gli utenti (per
// dispositivo). Con Supabase (Fase 2) leggerà dal cloud.
// ---------------------------------------------------------------------------

function caricaSchedeUtente(id) {
  try {
    const raw = localStorage.getItem(chiaviUtente(id).schede)
    if (raw) return JSON.parse(raw).map(normalizzaScheda)
  } catch (e) {
    console.warn('Lettura schede utente fallita', e)
  }
  return []
}

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
 * Tutte le schede di tutti gli utenti, arricchite con l'autore e con i campi
 * derivati per filtro/ricerca.
 * @param {{ utente?: {id?:string, ptId?:string|null}|null }} [opts] chi sta
 *   guardando: serve solo a riconoscere le schede del suo PT e dei "compagni di
 *   PT", che finiscono in cima. Senza, l'ordine è quello di sempre.
 */
export function schedeGenerali({ utente = null } = {}) {
  const utenti = caricaUtenti()
  const mioPtId = utente?.ptId || null
  const out = []
  for (const u of utenti) {
    // 2 = l'ha scritta il tuo PT · 1 = un altro atleta che segue · 0 = tutti gli altri.
    let relazionePt = 0
    if (mioPtId && u.id !== utente?.id) {
      if (u.id === mioPtId && isPt(u)) relazionePt = 2
      else if (u.ptId === mioPtId) relazionePt = 1
    }
    const mia = u.id === utente?.id
    for (const scheda of caricaSchedeUtente(u.id)) {
      if (scheda.libera) continue // le schede degli allenamenti liberi non sono "spunti"
      // Le tue le vedi sempre; delle altrui solo quelle rese pubbliche.
      if (!mia && !visibileA(scheda)) continue
      const giorniWorkout = scheda.giorni.filter((g) => g.tipo === 'workout')
      const eserciziNomi = nomiEsercizi(scheda)
      out.push({
        key: `${u.id}:${scheda.id}`,
        utenteId: u.id,
        utenteNome: u.nome,
        autoreEPt: isPt(u),
        relazionePt,
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
 * @param {{ comePt?: boolean }} [opts] `comePt` = chi guarda è il suo personal
 *   trainer: allora vede anche le schede marcate "solo al PT".
 */
export function schedeDiUtente(utente, { comePt = false } = {}) {
  if (!utente?.id) return []
  return caricaSchedeUtente(utente.id)
    .filter((s) => !s.libera && visibileA(s, { comePt }))
    .sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0))
}
