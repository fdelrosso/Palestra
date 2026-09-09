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
// Come lo Storico e le Schede Generali, legge da localStorage i dati di tutti
// gli utenti (per dispositivo). Con Supabase (Fase 2) leggerà dal cloud.
// ---------------------------------------------------------------------------

import { caricaUtenti } from './utenti'
import { caricaSchedeUtente, caricaArchivio } from './storico'
import { gruppoDaNome, normalizzaNome } from './eserciziLibreria'
import { atletiDiPt, famaPt, ptDi } from './pt'
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
 * Conta dentro `mappa` gli esercizi di UN profilo, con un peso (1 = normale).
 * Il peso serve ai PT: chi segue più atleti conta di più (vedi influenzaPt).
 * @param {{serie:string[],ripetizioni:string[],recuperi:string[]}} [campioni]
 *   se passato, raccoglie anche gli schemi (serie/rip/recupero) incontrati:
 *   è la "firma" di come quel profilo scrive gli allenamenti.
 */
function scansionaUtente(mappa, utenteId, peso = 1, campioni = null) {
  // "Nascondi a tutti" vuol dire proprio tutti: quello che è nascosto non entra
  // nemmeno in questo conteggio, per quanto anonimo sia. Le schede "solo al PT"
  // invece contano: il PT le vede comunque, ed è il suo segnale.
  const nascosto = (x) => visibilitaDi(x) === VISIBILITA.NASCOSTA
  const raccogli = (schema) => {
    if (!campioni || !schema) return
    campioni.serie.push(schema.serie)
    campioni.ripetizioni.push(schema.ripetizioni)
    campioni.recuperi.push(schema.recupero)
  }

  for (const scheda of caricaSchedeUtente(utenteId)) {
    // Pianificati: solo dalle schede scritte davvero da qualcuno. Quelle
    // degli allenamenti liberi le generiamo noi: conterebbero due volte il
    // nostro stesso consiglio.
    if (!scheda.libera && !nascosto(scheda)) {
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
    // Svolti: contano da qualsiasi scheda, anche da quella degli allenamenti
    // liberi (l'allenamento è stato fatto sul serio).
    for (const c of scheda.completamenti || []) {
      if (nascosto(c)) continue
      for (const e of c.esercizi || []) {
        const v = voce(mappa, e.nome, e.gruppo)
        if (!v) continue
        v.svolti += peso
        v.utenti.add(utenteId)
      }
    }
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
 * @param {{ escludiUtenteId?: string|null }} opts `escludiUtenteId` = il profilo
 *   attivo: i suoi dati sono già il segnale "personale" (lib/consiglio), qui
 *   conterebbero due volte.
 * @returns {{
 *   perGruppo: Record<string, {nome,gruppo,svolti,pianificati,utenti,punteggio,top}[]>,
 *   nUtenti: number,
 *   vuota: boolean,
 * }} liste per gruppo ordinate dal più usato.
 */
export function popolaritaEsercizi({ escludiUtenteId = null } = {}) {
  const mappa = new Map()
  let nUtenti = 0

  for (const u of caricaUtenti()) {
    if (escludiUtenteId && u.id === escludiUtenteId) continue
    nUtenti += 1
    scansionaUtente(mappa, u.id)
  }

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
 * @param {{ utente?: {id?:string, ptId?:string|null}|null }} opts
 * @returns {ReturnType<typeof influenzaVuota> & {
 *   perGruppo: Record<string, {nome:string,punteggio:number,top:boolean}[]>,
 *   campioniStile: {serie:string[],ripetizioni:string[],recuperi:string[]}|null,
 * }}
 */
export function influenzaPt({ utente = null } = {}) {
  const utenti = caricaUtenti()
  const escludi = utente?.id || null
  const mappa = new Map()

  const mio = ptDi(utente, utenti)
  if (mio) {
    const campioni = { serie: [], ripetizioni: [], recuperi: [] }
    const fonti = [mio, ...atletiDiPt(mio.id, utenti)].filter((u) => u.id !== escludi)
    for (const u of fonti) scansionaUtente(mappa, u.id, 1, campioni)
    return {
      perGruppo: costruisciPerGruppo(mappa),
      // Lo stile del PT serve solo a chi ce l'ha: è un default per chi non ha
      // ancora un proprio storico da cui ricavarlo (vedi lib/consiglio).
      campioniStile: campioni,
      tuo: true,
      nome: mio.nome,
      nAtleti: atletiDiPt(mio.id, utenti).length,
      nPt: 1,
      vuota: mappa.size === 0,
    }
  }

  const fama = famaPt(utenti)
  if (fama.size === 0) return influenzaVuota()
  const maxFama = Math.max(...fama.values())
  for (const [ptId, nAtleti] of fama) {
    const pt = utenti.find((u) => u.id === ptId)
    if (!pt) continue
    // Il PT più seguito dell'app pesa 1, gli altri in proporzione: "molto
    // famoso" conta di più, ma nessuno domina il consiglio da solo.
    const peso = nAtleti / maxFama
    const fonti = [pt, ...atletiDiPt(ptId, utenti)].filter((u) => u.id !== escludi)
    for (const u of fonti) scansionaUtente(mappa, u.id, peso)
  }
  return {
    perGruppo: costruisciPerGruppo(mappa),
    campioniStile: null, // lo stile di un PT che non è il tuo non ti riguarda
    tuo: false,
    nome: '',
    nAtleti: 0,
    nPt: fama.size,
    vuota: mappa.size === 0,
  }
}
