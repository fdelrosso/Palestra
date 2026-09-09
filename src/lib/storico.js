import { normalizzaScheda } from '../data/model'
import { caricaUtenti, chiaviUtente } from './utenti'
import { visibileA } from './visibilita'

// ---------------------------------------------------------------------------
// Storico allenamenti GLOBALE (trasversale a tutti i profili).
//
// A differenza dello StoreContext — isolato sull'utente attivo — qui leggiamo
// i dati di TUTTI gli utenti direttamente da localStorage, per mostrare gli
// allenamenti svolti da chiunque (così ci si può prendere spunto). Ogni voce
// riporta l'utente che l'ha svolto.
//
// Gli allenamenti dei profili ELIMINATI non spariscono: al momento della
// cancellazione vengono "archiviati" (vedi archiviaAllenamentiUtente) in una
// chiave globale, e qui rientrano nello storico insieme a quelli dei profili
// ancora esistenti.
//
// VISIBILITÀ: a fine allenamento si sceglie chi lo vede (lib/visibilita). Nello
// Storico generale compaiono solo quelli **pubblici** — più sempre i propri, che
// nella propria cronologia devono esserci comunque. Gli allenamenti "solo al PT"
// li vede il PT nella sua sezione Lavoro (allenamentiDiUtente con comePt).
// ---------------------------------------------------------------------------

// Chiave globale con gli allenamenti dei profili eliminati (restano nello storico).
const KEY_ARCHIVIO = 'palestra:storico-archiviato:v1'

// Schede di un singolo utente lette da localStorage (non dallo store).
// Esportata perché serve anche alle altre viste trasversali ai profili
// (lib/comunita.js): meglio un solo lettore che tante copie.
export function caricaSchedeUtente(id) {
  try {
    const raw = localStorage.getItem(chiaviUtente(id).schede)
    if (raw) return JSON.parse(raw).map(normalizzaScheda)
  } catch (e) {
    console.warn('Lettura schede utente fallita', e)
  }
  return []
}

// Voci di storico già archiviate (allenamenti di profili eliminati).
export function caricaArchivio() {
  try {
    const raw = localStorage.getItem(KEY_ARCHIVIO)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Lettura storico archiviato fallita', e)
  }
  return []
}

function salvaArchivio(voci) {
  try {
    localStorage.setItem(KEY_ARCHIVIO, JSON.stringify(voci))
  } catch (e) {
    console.warn('Salvataggio storico archiviato fallito', e)
  }
}

// Prima di eliminare un profilo, conserva i suoi allenamenti completati così da
// non perderli dallo Storico. Le voci sono già "risolte" (nome scheda/giorno,
// durata, dettaglio serie), perché dopo la cancellazione la scheda non esiste più.
export function archiviaAllenamentiUtente(utente) {
  if (!utente?.id) return
  const voci = caricaArchivio()
  for (const scheda of caricaSchedeUtente(utente.id)) {
    for (const c of scheda.completamenti || []) {
      if (!c.data) continue
      const giorno = scheda.giorni.find((g) => g.id === c.giornoId)
      voci.push({
        utenteId: utente.id,
        utenteNome: utente.nome,
        data: c.data,
        nomeScheda: c.nomeScheda || scheda.nome,
        nomeGiorno: c.nomeGiorno || giorno?.nome || 'Allenamento',
        settimana: c.settimana,
        durataSec: c.durataSec,
        esercizi: c.esercizi,
        nota: c.nota,
        calorieReali: c.calorieReali,
        fcMedia: c.fcMedia,
        fcMax: c.fcMax,
        visibilita: c.visibilita,
        archiviato: true,
      })
    }
  }
  salvaArchivio(voci)
}

// Un completamento diventa una voce di storico "risolta" (nomi già dentro),
// come serve a tutte le liste di allenamenti.
function voceStorico(utente, scheda, c) {
  const giorno = scheda.giorni.find((g) => g.id === c.giornoId)
  return {
    utenteId: utente.id,
    utenteNome: utente.nome,
    data: c.data,
    nomeScheda: c.nomeScheda || scheda.nome,
    nomeGiorno: c.nomeGiorno || giorno?.nome || 'Allenamento',
    settimana: c.settimana,
    durataSec: c.durataSec,
    esercizi: c.esercizi,
    nota: c.nota,
    calorieReali: c.calorieReali,
    fcMedia: c.fcMedia,
    fcMax: c.fcMax,
    visibilita: c.visibilita,
    dettagliato: Array.isArray(c.esercizi) && c.esercizi.length > 0,
  }
}

/**
 * Gli allenamenti di UN profilo, dal più recente. È la lista che vedono un
 * amico (solo i pubblici) e un PT sui propri atleti (anche i "solo al PT").
 * @param {{id:string, nome:string}} utente
 * @param {{ comePt?: boolean, tutti?: boolean }} [opts] `comePt` = chi guarda è
 *   il suo personal trainer; `tutti` = nessun filtro (sei tu).
 */
export function allenamentiDiUtente(utente, { comePt = false, tutti = false } = {}) {
  if (!utente?.id) return []
  const voci = []
  for (const scheda of caricaSchedeUtente(utente.id)) {
    for (const c of scheda.completamenti || []) {
      if (!c.data) continue
      if (!tutti && !visibileA(c, { comePt })) continue
      voci.push(voceStorico(utente, scheda, c))
    }
  }
  voci.sort((a, b) => new Date(b.data) - new Date(a.data))
  return voci
}

/**
 * Tutti gli allenamenti completati da tutti gli utenti, arricchiti col nome
 * dell'utente e ordinati dal più recente. Un completamento "dettagliato"
 * (creato da una sessione guidata) ha durata + esercizi; quello manuale no.
 * Mostra solo i **pubblici**, più i propri (`ioId`), che restano sempre visibili
 * a chi li ha fatti.
 * @param {{ ioId?: string|null }} [opts]
 */
export function storicoGlobale({ ioId = null } = {}) {
  const utenti = caricaUtenti()
  const voci = []
  for (const u of utenti) {
    const mio = ioId && u.id === ioId
    for (const scheda of caricaSchedeUtente(u.id)) {
      for (const c of scheda.completamenti || []) {
        if (!c.data) continue
        if (!mio && !visibileA(c)) continue
        voci.push(voceStorico(u, scheda, c))
      }
    }
  }
  // Allenamenti dei profili eliminati: restano nello storico.
  for (const v of caricaArchivio()) {
    if (!(ioId && v.utenteId === ioId) && !visibileA(v)) continue
    voci.push({ ...v, dettagliato: Array.isArray(v.esercizi) && v.esercizi.length > 0 })
  }
  voci.sort((a, b) => new Date(b.data) - new Date(a.data))
  return voci
}
