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
// Come lo Storico e le Schede Generali, non legge niente da sola: riceve dal
// collettivo (lib/collettivo) le schede e gli allenamenti che il database
// lascia vedere, e li conta.
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
import { gruppoDaNome, normalizzaNome } from './eserciziLibreria'
import { VISIBILITA, visibilitaDi } from './visibilita'

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
    v = { key, nome: String(nome).trim(), gruppo: g, svolti: 0, pianificati: 0, utenti: new Set() }
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
function scansionaScheda(mappa, riga, peso = 1, campioni = null) {
  const { utenteId, scheda } = riga
  // "Nascondi a tutti" vuol dire proprio tutti: quello che è nascosto non entra
  // nemmeno in questo conteggio, per quanto anonimo sia. Le schede "solo al PT"
  // invece contano: il PT le vede comunque, ed è il suo segnale.
  if (visibilitaDi(scheda) === VISIBILITA.NASCOSTA) return
  // Quelle degli allenamenti liberi le generiamo noi: conterebbero due volte il
  // nostro stesso consiglio.
  if (scheda.libera) return

  const raccogli = (schema) => {
    if (!campioni || !schema) return
    campioni.serie.push(schema.serie)
    campioni.ripetizioni.push(schema.ripetizioni)
    campioni.recuperi.push(schema.recupero)
  }

  for (const g of scheda.giorni || []) {
    if (g.tipo !== 'workout') continue
    for (const e of g.esercizi || []) {
      const v = voce(mappa, e.nome, e.gruppo)
      if (!v) continue
      v.pianificati += peso
      v.utenti.add(utenteId)
      if (e.variaPerSettimana) (e.settimane || []).forEach(raccogli)
      else raccogli(e.schemaBase)
    }
  }
}

/**
 * Conta dentro `mappa` gli esercizi di UN allenamento svolto.
 * ⚠️ Vale da qualsiasi scheda, anche da quella degli allenamenti liberi e anche
 * da una nascosta: l'allenamento è stato fatto sul serio, e chi l'ha pubblicato
 * ha detto proprio quello.
 */
function scansionaAllenamento(mappa, riga, peso = 1) {
  const { utenteId, completamento } = riga
  if (visibilitaDi(completamento) === VISIBILITA.NASCOSTA) return
  for (const e of completamento.esercizi || []) {
    const v = voce(mappa, e.nome, e.gruppo)
    if (!v) continue
    v.svolti += peso
    v.utenti.add(utenteId)
  }
}

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
      utenti: v.utenti.size,
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
 * @param {{ collettivo?: import('./collettivo').Collettivo|null,
 *   escludiUtenteId?: string|null }} opts `collettivo` = le schede che il
 *   database lascia vedere (useCollettivo); `escludiUtenteId` = il profilo
 *   attivo: i suoi dati sono già il segnale "personale" (lib/consiglio), qui
 *   conterebbero due volte.
 * @returns {{
 *   perGruppo: Record<string, {nome,gruppo,svolti,pianificati,utenti,punteggio,top}[]>,
 *   nUtenti: number,
 *   vuota: boolean,
 * }} liste per gruppo ordinate dal più usato.
 */
export function popolaritaEsercizi({ collettivo = null, escludiUtenteId = null } = {}) {
  const mappa = new Map()
  const visti = new Set()

  for (const riga of collettivo?.schede || []) {
    if (escludiUtenteId && riga.utenteId === escludiUtenteId) continue
    visti.add(riga.utenteId)
    scansionaScheda(mappa, riga)
  }
  for (const riga of collettivo?.allenamenti || []) {
    if (escludiUtenteId && riga.utenteId === escludiUtenteId) continue
    visti.add(riga.utenteId)
    scansionaAllenamento(mappa, riga)
  }
  let nUtenti = visti.size

  // Allenamenti dei profili eliminati: restano un segnale valido.
  for (const av of caricaArchivio()) {
    if (escludiUtenteId && av.utenteId === escludiUtenteId) continue
    if (visibilitaDi(av) === VISIBILITA.NASCOSTA) continue
    for (const e of av.esercizi || []) {
      const v = voce(mappa, e.nome, e.gruppo)
      if (!v) continue
      v.svolti += 1
      if (av.utenteId) v.utenti.add(av.utenteId)
    }
  }

  return { perGruppo: costruisciPerGruppo(mappa), nUtenti, vuota: mappa.size === 0 }
}

// Nessun PT in giro: un oggetto nuovo ogni volta, così chi lo riceve non può
// ritrovarsi a condividere `perGruppo` con qualcun altro.
const influenzaVuota = () => ({
  perGruppo: {},
  campioniStile: null,
  tuo: false,
  nome: '',
  nAtleti: 0,
  nPt: 0,
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
 * @param {{ collettivo?: import('./collettivo').Collettivo|null,
 *   utente?: {id?:string}|null, mioPt?: {id?:string, nome?:string}|null }} opts
 * @returns {ReturnType<typeof influenzaVuota> & {
 *   perGruppo: Record<string, {nome:string,punteggio:number,top:boolean}[]>,
 *   campioniStile: {serie:string[],ripetizioni:string[],recuperi:string[]}|null,
 * }}
 */
export function influenzaPt({ collettivo = null, utente = null, mioPt = null } = {}) {
  const righe = collettivo?.schede || []
  const escludi = utente?.id || null
  const mappa = new Map()

  if (mioPt?.id) {
    const campioni = { serie: [], ripetizioni: [], recuperi: [] }
    // ⚠️ Chi sia il PT e chi siano i suoi atleti lo dice il DATABASE, riga per
    // riga (`relazionePt`): 2 = l'ha scritta lui, 1 = un altro suo atleta.
    // Qui non si potrebbe sapere — i profili degli altri suoi atleti non si
    // possono leggere, se non ci si è amici.
    const compagni = new Set()
    const suo = (riga) => riga.utenteId !== escludi && (riga.relazionePt === 2 || riga.relazionePt === 1)
    for (const riga of righe) {
      if (!suo(riga)) continue
      if (riga.relazionePt === 1) compagni.add(riga.utenteId)
      scansionaScheda(mappa, riga, 1, campioni)
    }
    for (const riga of collettivo?.allenamenti || []) {
      if (!suo(riga)) continue
      if (riga.relazionePt === 1) compagni.add(riga.utenteId)
      scansionaAllenamento(mappa, riga, 1)
    }
    return {
      perGruppo: costruisciPerGruppo(mappa),
      // Lo stile del PT serve solo a chi ce l'ha: è un default per chi non ha
      // ancora un proprio storico da cui ricavarlo (vedi lib/consiglio).
      campioniStile: campioni,
      tuo: true,
      nome: mioPt.nome || '',
      // Quanti atleti segue lo sa il database (`fama_pt`); se non lo dice, si
      // contano quelli che si vedono più sé stessi — mai un numero inventato.
      nAtleti: collettivo?.fama?.get(mioPt.id) ?? compagni.size + 1,
      nPt: 1,
      vuota: mappa.size === 0,
    }
  }

  // Nessun PT: contano le schede scritte dai personal trainer, ciascuno in
  // proporzione a quanti atleti segue. ⚠️ Solo le LORO: di chi siano i PT degli
  // altri autori non lo si può sapere senza leggerne il profilo (vedi il
  // commento in testa al file).
  const fama = collettivo?.fama || new Map()
  const dellePt = righe.filter((r) => r.autoreEPt && r.utenteId !== escludi && fama.has(r.utenteId))
  if (dellePt.length === 0) return influenzaVuota()
  const maxFama = Math.max(...[...fama.values()])
  const pts = new Set()
  for (const riga of dellePt) {
    pts.add(riga.utenteId)
    // Il PT più seguito che si vede pesa 1, gli altri in proporzione: "molto
    // seguito" conta di più, ma nessuno domina il consiglio da solo.
    scansionaScheda(mappa, riga, fama.get(riga.utenteId) / maxFama)
  }
  // E quello che i PT si allenano davvero, non solo quello che scrivono.
  for (const riga of collettivo?.allenamenti || []) {
    if (riga.utenteId === escludi || !pts.has(riga.utenteId)) continue
    scansionaAllenamento(mappa, riga, fama.get(riga.utenteId) / maxFama)
  }
  return {
    perGruppo: costruisciPerGruppo(mappa),
    campioniStile: null, // lo stile di un PT che non è il tuo non ti riguarda
    tuo: false,
    nome: '',
    nAtleti: 0,
    nPt: pts.size,
    vuota: mappa.size === 0,
  }
}
