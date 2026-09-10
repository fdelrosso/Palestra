import { normalizzaScheda } from '../data/model'
import { chiaviUtente } from './utenti'
import { visibileA } from './visibilita'

// ---------------------------------------------------------------------------
// Storico allenamenti GLOBALE (trasversale a tutti i profili).
//
// A differenza dello StoreContext — isolato sull'utente attivo — qui si
// guardano gli allenamenti svolti da chiunque, così ci si può prendere spunto.
// Ogni voce riporta l'utente che l'ha svolto.
//
// ⚠️ QUI NON SI LEGGE PIÙ NIENTE DA SOLI. Gli allenamenti degli altri arrivano
// dal database (lib/collettivo), e queste funzioni li ricevono già pronti: sono
// conti, non letture. Prima aprivano il localStorage di tutti i profili del
// telefono — una cosa che nel cloud non esiste più, e che comunque rispondeva
// "chi c'è su questo dispositivo" a una domanda che era "chi usa l'app".
//
// ⚠️ UN ALLENAMENTO NON È UN PEZZO DELLA SUA SCHEDA. La visibilità è sua: si
// sceglie a fine allenamento, e vale anche se la scheda in cui è finito è
// nascosta — nascondere il programma e mostrare gli allenamenti fatti dentro è
// una combinazione legittima. Per questo il collettivo li porta in una lista a
// parte (`collettivo.allenamenti`) e non dentro le schede: della scheda
// nascosta non arriva niente, dell'allenamento arriva tutto quello che serve
// (nome della scheda e del giorno sono congelati dentro il completamento, vedi
// lib/session.js).
//
// Gli allenamenti dei profili ELIMINATI non spariscono: al momento della
// cancellazione vengono "archiviati" (vedi archiviaAllenamentiUtente) in una
// chiave globale del dispositivo, e qui rientrano nello storico. ⚠️ È rimasto
// un fatto LOCALE: riguarda i profili cancellati da questo telefono, non gli
// account cancellati dal cloud (quelli il database li porta via a cascata).
//
// VISIBILITÀ: a fine allenamento si sceglie chi lo vede (lib/visibilita). Nello
// Storico generale compaiono solo quelli **pubblici** — più sempre i propri, che
// nella propria cronologia devono esserci comunque. Gli allenamenti "solo al PT"
// li vede il PT nella sua sezione Lavoro (allenamentiDiUtente con comePt).
// ---------------------------------------------------------------------------

// Chiave globale con gli allenamenti dei profili eliminati (restano nello storico).
const KEY_ARCHIVIO = 'palestra:storico-archiviato:v1'

// La copia locale delle PROPRIE schede (quella che StoreContext tiene per
// partire subito e per funzionare senza rete).
// ⚠️ Serve a una cosa sola: archiviare i propri allenamenti prima di cancellare
// il proprio account. Per vedere le schede di qualcun ALTRO si passa dal
// collettivo — questa chiave, per gli altri, non contiene niente.
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

// Una voce del collettivo diventa una voce di storico, come serve a tutte le
// liste di allenamenti.
// ⚠️ I nomi della scheda e del giorno si prendono dal COMPLETAMENTO, dove sono
// stati congelati a fine allenamento (lib/session.js). Non si va a cercarli
// nella scheda: quella, se è nascosta, non arriva — ed è giusto così.
function voceStorico({ utenteId, utenteNome, completamento: c }) {
  return {
    utenteId,
    utenteNome,
    data: c.data,
    nomeScheda: c.nomeScheda || '',
    nomeGiorno: c.nomeGiorno || 'Allenamento',
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
 * @param {{ collettivo?: import('./collettivo').Collettivo|null, comePt?: boolean,
 *   tutti?: boolean }} [opts] `collettivo` = le schede che il database lascia
 *   vedere (useCollettivo); `comePt` = chi guarda è il suo personal trainer;
 *   `tutti` = nessun filtro (sei tu).
 */
export function allenamentiDiUtente(utente, { collettivo = null, comePt = false, tutti = false } = {}) {
  if (!utente?.id) return []
  const voci = []
  for (const v of collettivo?.allenamenti || []) {
    if (v.utenteId !== utente.id) continue
    if (!v.completamento?.data) continue
    if (!tutti && !visibileA(v.completamento, { comePt })) continue
    voci.push(voceStorico(v))
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
 * @param {{ collettivo?: import('./collettivo').Collettivo|null, ioId?: string|null }} [opts]
 */
export function storicoGlobale({ collettivo = null, ioId = null } = {}) {
  const voci = []
  for (const v of collettivo?.allenamenti || []) {
    if (!v.completamento?.data) continue
    const mio = ioId && v.utenteId === ioId
    if (!mio && !visibileA(v.completamento)) continue
    voci.push(voceStorico(v))
  }
  // Allenamenti dei profili eliminati: restano nello storico.
  for (const v of caricaArchivio()) {
    if (!(ioId && v.utenteId === ioId) && !visibileA(v)) continue
    voci.push({ ...v, dettagliato: Array.isArray(v.esercizi) && v.esercizi.length > 0 })
  }
  voci.sort((a, b) => new Date(b.data) - new Date(a.data))
  return voci
}
