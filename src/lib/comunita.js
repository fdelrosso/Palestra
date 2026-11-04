// ---------------------------------------------------------------------------
// Popolarità degli esercizi nella "comunità" = tutti i profili dell'app.
//
// Serve al motore dei consigli (lib/consiglio) per due cose:
//   1. partire da esercizi VALIDI anche quando l'utente non ha ancora storico
//      (invece di pescare a caso dal catalogo, si guarda cosa fanno gli altri);
//   2. dare più peso — quindi proporli più spesso — agli esercizi che le
//      persone svolgono davvero.
//
// Da qui esce anche il segnale del PERSONAL TRAINER (influenzaPt): cosa fa fare
// un PT ai suoi atleti. Se hai un PT è un segnale forte (è lui che ti allena);
// se sei autodidatta contano i PT più seguiti, ma con un peso piccolo — vedi i
// PESO_* in lib/consiglio.
//
// Non legge niente da sola: i conti li fa il database (`conteggi_esercizi`,
// migrazione 20261104220000; lib/comunitaServer li legge), una riga per nome di
// esercizio e per segnale. Qui si uniscono i nomi scritti in modi diversi, si
// pesano e si ordinano.
//
// ⚠️ I due segnali arrivano da due liste diverse, e non e' un caso: i
// PIANIFICATI stanno nelle schede, gli SVOLTI negli allenamenti — che hanno una
// visibilita' loro e possono venire anche da una scheda nascosta (chi tiene per
// se' il programma ma pubblica gli allenamenti conta lo stesso, con quello che
// ha fatto).
//
// ⚠️ COSA SI È RISTRETTO PASSANDO AL CLOUD, e perché. Prima, sul telefono, si
// vedevano tutti i profili del dispositivo: si poteva quindi contare anche
// quello che un PT famoso fa fare ai SUOI atleti. Adesso no — per sapere di chi
// è atleta l'autore di una scheda pubblica bisognerebbe leggere il suo profilo,
// e chi pubblica una scheda ha deciso di mostrare quella, non con chi si allena.
// Quindi per chi NON ha un PT contano solo le schede scritte dai PT stessi,
// pesate per quanti atleti seguono. Chi un PT ce l'ha non perde niente: il suo
// PT e i compagni di allenamento sono un legame vero, e il database li segnala
// (`relazionePt`).
// ---------------------------------------------------------------------------

import { caricaArchivio } from './storico'
import { gruppiAggiornati, gruppoDaNome, normalizzaNome } from './eserciziLibreria'
import { VISIBILITA, visibilitaDi } from './visibilita'
import { stileDi } from './schema'

// Un esercizio SVOLTO (in un allenamento completato) vale più di uno solo
// PIANIFICATO (scritto in una scheda ma magari mai fatto).
const PESO_SVOLTO = 3
const PESO_PIANIFICATO = 1

// Quanti esercizi per gruppo marcare come "popolare" (badge nella UI).
const TOP_PER_GRUPPO = 3

// Trova/crea la voce di un esercizio nella mappa dei conteggi. Ritorna null se
// il nome è vuoto o se non si riesce ad attribuirlo a un gruppo muscolare.
function voce(mappa, nome, gruppo) {
  const key = normalizzaNome(nome)
  if (!key) return null
  const g = gruppo || gruppoDaNome(nome)
  if (!g) return null
  let v = mappa.get(key)
  if (!v) {
    v = { key, nome: String(nome).trim(), gruppo: g, svolti: 0, pianificati: 0, utenti: 0, archivio: new Set() }
    mappa.set(key, v)
  }
  return v
}

/**
 * Conta dentro `mappa` gli esercizi di UNA scheda, con un peso (1 = normale).
 * Il peso serve ai PT: chi segue più atleti conta di più (vedi influenzaPt).
 * @param {{serie:string[],ripetizioni:string[],recuperi:string[]}} [campioni]
 *   se passato, raccoglie anche gli schemi (serie/rip/recupero) incontrati:
 *   è la "firma" di come quel profilo scrive gli allenamenti.
 */
/**
 * Somma nella mappa le righe di `conteggi_esercizi` di un segnale.
 * ⚠️ Il database unisce i nomi solo per maiuscole e spazi: `utenti` si somma
 * fra quelli che differiscono per gli accenti ("Panca inclinata" e "Panca
 * inclìnata"), e chi li usa tutti e due conta due volte. Pesa solo a parità di
 * punteggio.
 */
function contaRighe(mappa, righe) {
  for (const r of righe) {
    // I gruppi rivisti (es. un calf raise scritto "gambe"): normalizzaScheda li
    // applica alle schede, non agli allenamenti.
    const gruppo = (r.da_scheda && gruppiAggiornati(r)?.gruppo) || r.gruppo
    // Senza gruppo scritto conta solo se il gruppo si ricava dal nome (`voce`).
    const anche = !!gruppoDaNome(r.nome)
    const v = voce(mappa, r.nome, gruppo)
    if (!v) continue
    v.pianificati += r.pianificati + (anche ? r.pianificati_senza : 0)
    v.svolti += r.svolti + (anche ? r.svolti_senza : 0)
    v.utenti += anche ? r.utenti_tutti : r.utenti
  }
}

const delSegnale = (conteggi, fonte) => (conteggi?.righe || []).filter((r) => r.fonte === fonte)

// Dalla mappa dei conteggi alle liste per gruppo, ordinate dal più usato.
function costruisciPerGruppo(mappa) {
  const perGruppo = {}
  for (const v of mappa.values()) {
    const punteggio = v.svolti * PESO_SVOLTO + v.pianificati * PESO_PIANIFICATO
    if (punteggio <= 0) continue
    if (!perGruppo[v.gruppo]) perGruppo[v.gruppo] = []
    perGruppo[v.gruppo].push({
      nome: v.nome,
      gruppo: v.gruppo,
      svolti: v.svolti,
      pianificati: v.pianificati,
      utenti: v.utenti + v.archivio.size,
      punteggio,
    })
  }
  for (const lista of Object.values(perGruppo)) {
    // Più usato prima; a parità, quello adottato da più persone.
    lista.sort(
      (a, b) => b.punteggio - a.punteggio || b.utenti - a.utenti || a.nome.localeCompare(b.nome),
    )
    lista.forEach((r, i) => {
      r.top = i < TOP_PER_GRUPPO
    })
  }
  return perGruppo
}

/**
 * Quanto è usato ogni esercizio dagli altri utenti dell'app.
 * @param {{ conteggi?: import('./comunitaServer').Conteggi|null,
 *   escludiUtenteId?: string|null }} opts `conteggi` = i conti del database
 *   (già senza i miei); `escludiUtenteId` = il profilo attivo, tolto anche
 *   dall'archivio dei profili eliminati: i suoi dati sono già il segnale
 *   "personale" (lib/consiglio), qui conterebbero due volte.
 * @returns {{
 *   perGruppo: Record<string, {nome,gruppo,svolti,pianificati,utenti,punteggio,top}[]>,
 *   vuota: boolean,
 * }} liste per gruppo ordinate dal più usato.
 */
export function popolaritaEsercizi({ conteggi = null, escludiUtenteId = null } = {}) {
  const mappa = new Map()
  contaRighe(mappa, delSegnale(conteggi, 'comunita'))

  // Allenamenti dei profili eliminati: restano un segnale valido.
  for (const av of caricaArchivio()) {
    if (escludiUtenteId && av.utenteId === escludiUtenteId) continue
    if (visibilitaDi(av) === VISIBILITA.NASCOSTA) continue
    for (const e of av.esercizi || []) {
      const v = voce(mappa, e.nome, e.gruppo)
      if (!v) continue
      v.svolti += 1
      if (av.utenteId) v.archivio.add(av.utenteId)
    }
  }

  return { perGruppo: costruisciPerGruppo(mappa), vuota: mappa.size === 0 }
}

// Nessun PT in giro: un oggetto nuovo ogni volta, così chi lo riceve non può
// ritrovarsi a condividere `perGruppo` con qualcun altro.
const influenzaVuota = () => ({
  perGruppo: {},
  campioniStile: null,
  tuo: false,
  nome: '',
  nAtleti: 0,
  vuota: true,
})

/**
 * Il segnale dei PERSONAL TRAINER per l'utente attivo.
 *
 * - **Hai un PT** (`tuo: true`): conta ciò che il TUO PT fa fare agli altri suoi
 *   atleti (e ciò che scrive per sé). È la risposta a "cosa mi darebbe lui".
 *   Tu sei escluso: i tuoi dati sono già il segnale personale.
 * - **Sei autodidatta** (`tuo: false`): contano tutti i PT dell'app, ciascuno in
 *   proporzione a quanti atleti segue (il più seguito pesa 1, gli altri meno).
 *   Quello che fa fare un PT seguito da molti è un default migliore del caso —
 *   ma resta un'influenza leggera: il peso lo decide lib/consiglio.
 *
 * Chi sia il PT, chi i suoi atleti e quanto pesi ognuno lo dice il database
 * (`conteggi_esercizi`, segnali 'mio_pt' e 'pt').
 *
 * @param {{ conteggi?: import('./comunitaServer').Conteggi|null,
 *   mioPt?: {id?:string, nome?:string}|null }} opts
 * @returns {ReturnType<typeof influenzaVuota> & {
 *   perGruppo: Record<string, {nome:string,punteggio:number,top:boolean}[]>,
 *   campioniStile: {serie:string[],ripetizioni:string[],recuperi:string[]}|null,
 * }}
 */
export function influenzaPt({ conteggi = null, mioPt = null } = {}) {
  const mappa = new Map()

  if (mioPt?.id) {
    contaRighe(mappa, delSegnale(conteggi, 'mio_pt'))
    const campioni = { serie: [], ripetizioni: [], recuperi: [] }
    for (const { schema, n } of conteggi?.stile || []) {
      const st = stileDi(schema)
      for (let i = 0; i < n; i++) {
        campioni.serie.push(st.serie)
        campioni.ripetizioni.push(st.ripetizioni)
        campioni.recuperi.push(st.recupero)
      }
    }
    return {
      perGruppo: costruisciPerGruppo(mappa),
      // Lo stile del PT serve solo a chi ce l'ha: è un default per chi non ha
      // ancora un proprio storico da cui ricavarlo (vedi lib/consiglio).
      campioniStile: campioni,
      tuo: true,
      nome: mioPt.nome || '',
      // Quanti atleti segue lo sa il database (`fama_pt`): almeno io.
      nAtleti: conteggi?.famaMioPt || 1,
      vuota: mappa.size === 0,
    }
  }

  const righe = delSegnale(conteggi, 'pt')
  if (righe.length === 0) return influenzaVuota()
  contaRighe(mappa, righe)
  return {
    perGruppo: costruisciPerGruppo(mappa),
    campioniStile: null, // lo stile di un PT che non è il tuo non ti riguarda
    tuo: false,
    nome: '',
    nAtleti: 0,
    vuota: mappa.size === 0,
  }
}
