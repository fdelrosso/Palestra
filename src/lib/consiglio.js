// ---------------------------------------------------------------------------
// Motore di "allenamento consigliato".
//
// Analizza lo storico dell'utente (le SUE schede + i completamenti) per capire:
//   - quali gruppi muscolari ha allenato di recente (per ruotare i muscoli);
//   - il suo "stile" (serie / ripetizioni / recupero tipici);
//   - gli esercizi che conosce (ripetuti nelle sue schede/allenamenti).
// Da qui propone i gruppi da allenare e genera un allenamento su misura,
// eventualmente ristretto ai gruppi / esercizi / durata scelti dall'utente.
//
// È un'euristica che si affina man mano, MA non deve mai proporre roba a caso
// a chi ha appena iniziato. Le quattro fonti, in ordine di peso:
//   1. PERSONALE  — cosa allena e con quali esercizi (lib/consiglio, da schede
//                   e completamenti dell'utente);
//   2. IL TUO PT  — cosa il tuo personal trainer fa fare agli altri suoi atleti
//                   (lib/comunita → influenzaPt). Pesa quasi quanto il tuo
//                   storico: se qualcuno ti allena, il consiglio deve assomigliare
//                   a quello che ti darebbe lui. Se sei autodidatta al suo posto
//                   entrano i PT più seguiti dell'app, ma con un peso piccolo:
//                   un'indicazione in più, non una scheda altrui;
//   3. COMUNITÀ   — cosa svolgono davvero gli altri utenti dell'app
//                   (lib/comunita): è ciò che regge il caso "storico vuoto";
//   4. CATALOGO   — lib/eserciziLibreria, ordinato dai fondamentali agli
//                   accessori: l'ultima rete di sicurezza, mai una scelta casuale.
// Anche i GRUPPI partono da combinazioni sensate (SPLIT_BASE) e non da un
// gruppo qualsiasi: con lo storico la scelta ruota, senza storico resta valida.
//
// Sopra a tutte e quattro c'e' il LIVELLO dichiarato sul profilo (lib/livello):
// decide quali esercizi sono alla portata di chi si allena e quanto volume
// reggono. Un principiante non si vede proporre uno stacco da terra nemmeno se
// e' l'esercizio piu' svolto dell'app — a meno che non lo faccia gia' lui.
//
// NB: euristica, non un vero programmatore di allenamenti. È un punto di
// partenza modificabile.
// ---------------------------------------------------------------------------

import { GRUPPI, gruppoDi } from './muscoli'
import { gruppoDaNome, eserciziDiGruppo, normalizzaNome } from './eserciziLibreria'
import { storicoCarichi, consiglioCarico } from './carico'
import { maxStessaFamiglia } from './focus'
import { livelloAmmette, regoleLivello } from './livello'
import {
  MODO_DEFAULT,
  TIPO,
  famigliaEsercizio,
  modoDaStile,
  ordinaSeduta,
  prescrizione,
  quoteEsercizi,
  tipoEsercizio,
  volumeGruppo,
} from './programmazione'
import { nuovoEsercizio, schemaVuoto, indiceSettimana } from '../data/model'

// Stile di default se non si ricava nulla dallo storico.
const STILE_DEFAULT = { serie: '4', ripetizioni: '8-10', recupero: "1,30min" }

// Quanto pesa ciascuna fonte nell'ordinare gli esercizi di un gruppo. I tre
// contributi sono normalizzati 0..1 dentro al gruppo, quindi confrontabili.
// Il personale comanda (è il TUO allenamento), ma la comunità conta davvero:
// a parità di esperienza personale vengono prima gli esercizi che le persone
// svolgono di più. Senza nessuno dei due resta l'ordine del catalogo.
const PESO_PERSONALE = 3
const PESO_COMUNITA = 2
const PESO_CATALOGO = 1
// Il TUO personal trainer: sotto al tuo storico, sopra alla comunità.
const PESO_PT_MIO = 2.5
// Nessun PT tuo: i PT più seguiti dell'app spostano la classifica di poco
// (mezzo punto su ~6), quanto basta a farsi sentire a parità di tutto il resto.
const PESO_PT_FAMOSI = 0.5

// Combinazioni di partenza: ogni voce è una giornata di allenamento sensata,
// non due gruppi a caso. Con storico si ruota tra queste; senza, si parte dalla
// prima. Addome e cardio restano selezionabili a mano ma non entrano nella
// rotazione automatica.
export const SPLIT_BASE = [
  { id: 'spinta', label: 'Spinta', gruppi: ['petto', 'tricipiti'] },
  { id: 'tirata', label: 'Tirata', gruppi: ['schiena', 'bicipiti'] },
  { id: 'gambe', label: 'Gambe e spalle', gruppi: ['gambe', 'spalle'] },
]

// Restituisce il valore più frequente (non vuoto) di un array di stringhe.
function piuFrequente(valori) {
  const conte = new Map()
  for (const v of valori) {
    const s = String(v || '').trim()
    if (!s) continue
    conte.set(s, (conte.get(s) || 0) + 1)
  }
  let best = ''
  let max = 0
  for (const [k, n] of conte) {
    if (n > max) {
      max = n
      best = k
    }
  }
  return best
}

// Gruppo di un esercizio di un completamento: usa il campo `gruppo` se presente
// (i nuovi completamenti lo salvano), altrimenti prova a dedurlo dal nome.
function gruppoEsercizio(e) {
  return e.gruppo || gruppoDaNome(e.nome) || ''
}

/**
 * Analizza le schede dell'utente attivo.
 * @param {import('../data/model').Scheda[]} schede
 */
export function analizzaStorico(schede) {
  const lista = (schede || []).filter((s) => !s.libera)

  // Completamenti (con data), dal più recente.
  const completamenti = []
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (c && c.data) completamenti.push(c)
    }
  }
  completamenti.sort((a, b) => new Date(b.data) - new Date(a.data))

  // Ultima data di allenamento per gruppo + gruppi degli ultimi allenamenti.
  const ultimoPerGruppo = new Map()
  const gruppiRecenti = new Set() // allenati negli ultimi 2 allenamenti
  completamenti.forEach((c, idx) => {
    for (const e of c.esercizi || []) {
      const g = gruppoEsercizio(e)
      if (!g) continue
      if (!ultimoPerGruppo.has(g)) ultimoPerGruppo.set(g, c.data)
      if (idx < 2) gruppiRecenti.add(g)
    }
  })

  // Stile: serie / ripetizioni / recupero più frequenti tra tutti gli schemi
  // (schede + completamenti).
  const serie = []
  const ripetizioni = []
  const recuperi = []
  const raccogli = (schema) => {
    if (!schema) return
    serie.push(schema.serie)
    ripetizioni.push(schema.ripetizioni)
    recuperi.push(schema.recupero)
  }
  for (const s of lista) {
    for (const g of s.giorni || []) {
      if (g.tipo !== 'workout') continue
      for (const e of g.esercizi || []) {
        if (e.variaPerSettimana) (e.settimane || []).forEach(raccogli)
        else raccogli(e.schemaBase)
      }
    }
  }
  for (const c of completamenti) for (const e of c.esercizi || []) raccogli(e.schema)

  // Grezzo = solo ciò che si è davvero ricavato dai dati (campo vuoto = non
  // rilevato). Serve a stileEffettivo per sapere dove può entrare il PT.
  const stileGrezzo = {
    serie: piuFrequente(serie),
    ripetizioni: piuFrequente(ripetizioni),
    recupero: piuFrequente(recuperi),
  }
  const stile = {
    serie: stileGrezzo.serie || STILE_DEFAULT.serie,
    ripetizioni: stileGrezzo.ripetizioni || STILE_DEFAULT.ripetizioni,
    recupero: stileGrezzo.recupero || STILE_DEFAULT.recupero,
  }

  // Esercizi noti per gruppo (frequenza d'uso), da schede + completamenti.
  const notiPerGruppo = {}
  const aggiungiNoto = (nome, gruppo) => {
    const n = (nome || '').trim()
    if (!n) return
    const g = gruppo || gruppoDaNome(n)
    if (!g) return
    if (!notiPerGruppo[g]) notiPerGruppo[g] = new Map()
    const key = normalizzaNome(n)
    const prev = notiPerGruppo[g].get(key)
    if (prev) prev.count += 1
    else notiPerGruppo[g].set(key, { nome: n, count: 1 })
  }
  for (const s of lista) {
    for (const g of s.giorni || []) {
      if (g.tipo !== 'workout') continue
      for (const e of g.esercizi || []) aggiungiNoto(e.nome, e.gruppo)
    }
  }
  for (const c of completamenti) for (const e of c.esercizi || []) aggiungiNoto(e.nome, e.gruppo)

  // Converte le mappe in array ordinati per frequenza.
  const eserciziNoti = {}
  for (const [g, mappa] of Object.entries(notiPerGruppo)) {
    eserciziNoti[g] = [...mappa.values()].sort((a, b) => b.count - a.count)
  }

  return {
    completamenti,
    ultimoPerGruppo, // Map gruppoId -> data ISO dell'ultimo allenamento
    gruppiRecenti, // Set gruppoId allenati negli ultimi 2 allenamenti
    stile, // { serie, ripetizioni, recupero } (con i default dove manca il dato)
    stileGrezzo, // come sopra ma senza default: '' = non rilevato dai tuoi dati
    eserciziNoti, // { gruppoId: [{nome, count}] }
    carichi: storicoCarichi(schede), // com'è andato ogni esercizio (pallini + carico)
    haStorico: completamenti.length > 0,
  }
}

/**
 * Lo stile con cui scrivere l'allenamento generato: serie, ripetizioni e
 * recupero. Per ogni campo, in ordine: **il tuo** (se si ricava dai tuoi dati),
 * poi quello del **tuo PT** (come scrive gli allenamenti ai suoi atleti), poi
 * il default. Lo stile di un PT che non è il tuo non entra mai: sarebbe
 * un'influenza tutt'altro che leggera, visto che qui non c'è una media da fare.
 * @param {ReturnType<typeof analizzaStorico>} analisi
 * @param {ReturnType<typeof import('./comunita').influenzaPt>} [pt]
 */
export function stileEffettivo(analisi, pt) {
  const mio = analisi?.stileGrezzo || {}
  const campioni = pt?.tuo ? pt.campioniStile : null
  const delPt = campioni
    ? {
        serie: piuFrequente(campioni.serie),
        ripetizioni: piuFrequente(campioni.ripetizioni),
        recupero: piuFrequente(campioni.recuperi),
      }
    : {}
  return {
    serie: mio.serie || delPt.serie || STILE_DEFAULT.serie,
    ripetizioni: mio.ripetizioni || delPt.ripetizioni || STILE_DEFAULT.ripetizioni,
    recupero: mio.recupero || delPt.recupero || STILE_DEFAULT.recupero,
    // Da dove arriva il grosso dello stile: serve solo a spiegarlo nella UI.
    fonte: mio.serie || mio.ripetizioni ? 'tuo' : delPt.serie || delPt.ripetizioni ? 'pt' : 'default',
  }
}

// Quando un gruppo è stato allenato l'ultima volta (ms epoch); 0 = mai.
function ultimoAllenamento(analisi, gruppoId) {
  const d = analisi?.ultimoPerGruppo?.get(gruppoId)
  return d ? new Date(d).getTime() : 0
}

/**
 * La combinazione base da proporre oggi: quella allenata meno di recente.
 * Senza storico tutti i punteggi sono pari e vince la prima di SPLIT_BASE —
 * cioè si parte comunque da una giornata sensata, non da gruppi a caso.
 * @param {ReturnType<typeof analizzaStorico>} analisi
 */
export function splitConsigliato(analisi) {
  const classifica = SPLIT_BASE.map((split, ordine) => ({
    split,
    ordine,
    // Uno dei gruppi allenato negli ultimi 2 allenamenti → lo split "scotta".
    recente: split.gruppi.some((g) => analisi?.gruppiRecenti?.has(g)) ? 1 : 0,
    // Quanto è "fresco" lo split = l'allenamento più recente tra i suoi gruppi.
    ultimo: Math.max(...split.gruppi.map((g) => ultimoAllenamento(analisi, g))),
  })).sort((a, b) => a.recente - b.recente || a.ultimo - b.ultimo || a.ordine - b.ordine)
  return classifica[0].split
}

/**
 * Gruppi consigliati da allenare oggi. Si parte dalla combinazione base meno
 * recente (vedi splitConsigliato) così il consiglio è sempre una giornata che
 * ha senso; se ne servono più di due si completa con gli altri gruppi, dando
 * la precedenza a quelli allenati meno di recente. Esclude cardio dai
 * suggerimenti automatici (resta selezionabile a mano).
 * @param {ReturnType<typeof analizzaStorico>} analisi
 * @param {number} n
 * @returns {string[]} id dei gruppi
 */
export function gruppiConsigliati(analisi, n = 2) {
  const quanti = Math.max(1, n)
  const scelti = splitConsigliato(analisi).gruppi.slice(0, quanti)
  if (scelti.length >= quanti) return scelti

  // Servono più gruppi dello split: completa con gli altri, meno allenati di
  // recente per primi e a parità quelli che l'utente già conosce.
  const noti = new Set(Object.keys(analisi?.eserciziNoti || {}))
  const resto = GRUPPI.map((g) => g.id)
    .filter((id) => id !== 'cardio' && !scelti.includes(id))
    .sort((a, b) => {
      const pa = ultimoAllenamento(analisi, a)
      const pb = ultimoAllenamento(analisi, b)
      if (pa !== pb) return pa - pb
      return (noti.has(b) ? 1 : 0) - (noti.has(a) ? 1 : 0)
    })
  return [...scelti, ...resto].slice(0, quanti)
}

/**
 * Esercizi candidati per un gruppo, dal più consigliabile al meno. Fonde le
 * quattro fonti (personale, PT, comunità, catalogo) normalizzando ciascuna 0..1
 * dentro al gruppo e pesandole: così la classifica ha sempre un ordine sensato,
 * che sia guidata dal tuo storico, dal tuo PT, da quello degli altri o — al
 * peggio — dal catalogo. Usata sia dal generatore sia dalla lista di scelta
 * manuale, così l'utente vede lo stesso ordine che userebbe l'automatico.
 * @param {string} gruppo
 * @param {ReturnType<typeof analizzaStorico>} analisi
 * @param {{ perGruppo: Record<string, {nome:string,punteggio:number,top:boolean}[]> }} [comunita]
 * @param {ReturnType<typeof import('./comunita').influenzaPt>} [pt] segnale del
 *   personal trainer: `tuo:true` = è il TUO (pesa molto), `tuo:false` = i PT più
 *   seguiti dell'app (pesa poco).
 * @returns {{nome:string, noto:boolean, popolare:boolean, dalPt:boolean, punteggio:number}[]}
 */
export function candidatiGruppo(gruppo, analisi, comunita, pt) {
  const noti = analisi?.eserciziNoti?.[gruppo] || []
  const popolari = comunita?.perGruppo?.[gruppo] || []
  const daPt = pt?.perGruppo?.[gruppo] || []
  const catalogo = eserciziDiGruppo(gruppo)

  const maxNoto = Math.max(1, ...noti.map((e) => e.count || 0))
  const maxPop = Math.max(1, ...popolari.map((e) => e.punteggio || 0))
  const maxPt = Math.max(1, ...daPt.map((e) => e.punteggio || 0))

  /** @type {Map<string, {nome:string, noto:boolean, popolare:boolean, dalPt:boolean, pPers:number, pPt:number, pCom:number, pCat:number}>} */
  const perKey = new Map()
  const tocca = (nome) => {
    const key = normalizzaNome(nome)
    if (!key) return null
    let v = perKey.get(key)
    if (!v) {
      v = { nome, noto: false, popolare: false, dalPt: false, pPers: 0, pPt: 0, pCom: 0, pCat: 0 }
      perKey.set(key, v)
    }
    return v
  }

  // Ordine di scrittura = ordine di priorità del NOME da mostrare (l'ultimo
  // vince): la grafia dell'utente batte quella del catalogo, che batte quella
  // del PT, che batte quella trovata nelle schede altrui.
  popolari.forEach((e) => {
    const v = tocca(e.nome)
    if (!v) return
    v.nome = e.nome
    v.pCom = (e.punteggio || 0) / maxPop
    v.popolare = !!e.top
  })
  daPt.forEach((e) => {
    const v = tocca(e.nome)
    if (!v) return
    v.nome = e.nome
    v.pPt = (e.punteggio || 0) / maxPt
    // Marchiamo solo i primi: "questo te lo darebbe il tuo PT" dev'essere un
    // segnale, non un'etichetta su mezzo catalogo.
    v.dalPt = !!e.top
  })
  catalogo.forEach((e, i) => {
    const v = tocca(e.nome)
    if (!v) return
    v.nome = e.nome
    // I primi del catalogo sono i fondamentali: valgono più degli accessori.
    v.pCat = 1 - i / Math.max(1, catalogo.length)
  })
  noti.forEach((e) => {
    const v = tocca(e.nome)
    if (!v) return
    v.nome = e.nome
    v.noto = true
    v.pPers = (e.count || 0) / maxNoto
  })

  const pesoPt = pt?.tuo ? PESO_PT_MIO : PESO_PT_FAMOSI
  const punteggio = (v) =>
    PESO_PERSONALE * v.pPers + pesoPt * v.pPt + PESO_COMUNITA * v.pCom + PESO_CATALOGO * v.pCat

  // A parità di punteggio decide il catalogo (i fondamentali prima), poi il
  // nome: l'ordine dev'essere stabile a ogni render.
  return [...perKey.values()]
    .sort((a, b) => punteggio(b) - punteggio(a) || b.pCat - a.pCat || a.nome.localeCompare(b.nome))
    .map((v) => ({
      nome: v.nome,
      noto: v.noto,
      popolare: v.popolare,
      dalPt: v.dalPt,
      punteggio: punteggio(v),
    }))
}

/**
 * Quanti esercizi per gruppo, dentro la durata scelta. È solo un ponte verso
 * lib/programmazione, dove sta la logica vera (gruppi grandi 2-4 esercizi,
 * piccoli 1-2; il tempo si calcola da serie e recuperi, non a occhio).
 */
export function pianoGruppi({ gruppi, durataMin, modo, focus, livello }) {
  return quoteEsercizi({ gruppi, durataMin, modo, focus, livello: regoleLivello(livello) })
}

/**
 * Genera un allenamento dai gruppi/durata/esercizi scelti.
 *
 * Non dà più lo stesso schema a tutti: ogni esercizio prende serie/ripetizioni/
 * recupero dal SUO tipo (fondamentale, composto, isolamento…) secondo il modo
 * scelto, e ogni gruppo prende il numero di esercizi che gli compete — di più
 * ai grandi, di meno a bicipiti/tricipiti/addome. Vedi lib/programmazione.
 *
 * @param {{
 *   gruppi: string[],
 *   durataMin: number,
 *   eserciziPerGruppo?: Record<string,string[]>,  // nomi scelti a mano per gruppo
 *   analisi: ReturnType<typeof analizzaStorico>,
 *   comunita?: ReturnType<typeof import('./comunita').popolaritaEsercizi>,
 *   pt?: ReturnType<typeof import('./comunita').influenzaPt>,  // il tuo PT (o i più seguiti)
 *   modo?: string,          // forza | ipertrofia | resistenza; default: dal tuo storico
 *   focus?: object,         // su quali muscoli insistere (lib/focus): più esercizi,
 *                           // più varianti e la precedenza quando il tempo è poco
 *   livello?: string,       // principiante | intermedio | avanzato (lib/livello): quali
 *                           // esercizi sono alla portata e quanto volume reggono.
 *                           // '' o assente = nessun limite, com'era prima dei livelli
 *   nome?: string,          // per le schede prefatte, che danno un nome al giorno
 *   evita?: Set<string>,    // nomi normalizzati già usati negli ALTRI giorni della
 *                           // stessa scheda: non vietati, solo spostati in fondo
 * }} opts
 * @returns {{ nome, esercizi, modo, tempoStimatoSec }}
 */
export function generaAllenamento({
  gruppi,
  durataMin,
  eserciziPerGruppo = {},
  analisi,
  comunita,
  pt,
  modo,
  focus,
  livello,
  nome: nomeForzato,
  evita,
}) {
  const gruppiSel = (gruppi || []).filter(Boolean)
  if (gruppiSel.length === 0) {
    return { nome: 'Allenamento', esercizi: [], modo: modo || MODO_DEFAULT, tempoStimatoSec: 0 }
  }

  // Come ti alleni di solito, letto dalle ripetizioni che usi: così l'allenamento
  // consigliato somiglia ai tuoi, senza copiare lo stesso schema su ogni esercizio.
  const modoScelto = modo || modoDaStile(analisi?.stileGrezzo)
  // Le regole del livello dichiarato: null se non ne ha dichiarato nessuno, e
  // in quel caso niente di quello che segue cambia (vedi lib/livello).
  const liv = regoleLivello(livello)

  // Prima si sceglie CHI fa parte della seduta, poi si guarda quanto dura: il
  // tipo vero di ogni esercizio (e quindi il suo tempo) si sa solo dopo.
  const scelte = {}
  const usati = new Set()
  // Quante volte una famiglia di movimento è già stata usata NELLA SEDUTA: due
  // esercizi della stessa famiglia sono lo stesso esercizio con un'altra presa
  // (push down alla corda e alla barra), e mettendoli tutti e due si lascia
  // fuori quello che manca. Il tetto è uno — tranne sui muscoli del focus, dove
  // sale a due o tre (vedi sotto).
  const famiglieUsate = new Map()

  for (const gruppo of gruppiSel) {
    // Prima quelli scelti a mano; poi la classifica del gruppo (tuo storico +
    // quello che il tuo PT dà agli altri + esercizi più svolti dalle altre
    // persone + catalogo).
    const aMano = (eserciziPerGruppo[gruppo] || []).map((n) => ({ nome: n, aMano: true }))
    const classifica = candidatiGruppo(gruppo, analisi, comunita, pt)
    // In una scheda di più giorni gli esercizi già usati altrove passano in
    // fondo: un "full body A/B/C" con lo stesso squat tre volte è un A/A/A.
    // Non si escludono del tutto, così un gruppo con poche varianti non resta
    // a secco. Nella FORZA i fondamentali si ripetono apposta (è il programma:
    // lo squat tre volte a settimana), quindi loro non si spostano.
    const daEvitare = (c) =>
      evita?.has(normalizzaNome(c.nome)) &&
      !(modoScelto === 'forza' && tipoEsercizio(c.nome, gruppo) === TIPO.FONDAMENTALE)
    const freschi = classifica.filter((c) => !daEvitare(c))
    const riusati = classifica.filter(daEvitare)
    const candidati = [...aMano, ...freschi, ...riusati]
    const vol = volumeGruppo(gruppo, focus, liv)
    const presi = []
    // Di fondamentali pesanti ne regge uno per gruppo: due squat con bilanciere
    // di fila non sono un allenamento, sono lo stesso allenamento due volte.
    // Vale anche sotto focus: il volume in più si prende con le varianti, non
    // raddoppiando l'esercizio più pesante della seduta.
    // L'unica deroga è il livello AVANZATO, che ne regge due (trazioni e stacco,
    // panca e lento avanti): lì la regola smette di proteggere e comincia a
    // togliere, ed è esattamente la differenza tra "so allenarmi" e "sto
    // imparando". Senza livello dichiarato resta uno, com'era.
    const tettoFondamentali = liv?.fondamentaliMax || 1
    let fondamentali = 0
    // Scartati SOLO perché la loro famiglia era già occupata: sui muscoli del
    // focus si ripescano nel secondo giro.
    const scarti = []

    const prendi = (cand, secondoGiro) => {
      const key = normalizzaNome(cand.nome)
      if (!cand.nome || usati.has(key)) return
      const tipo = tipoEsercizio(cand.nome, gruppo)
      const famiglia = famigliaEsercizio(cand.nome)
      // Quello che l'utente ha scelto a mano entra comunque: è una sua decisione.
      if (!cand.aMano) {
        // Sopra il suo livello: non si propone. Vale anche per gli esercizi che
        // stanno già nelle sue schede — provato il contrario, e non regge: una
        // scheda scritta da un PT (o quella d'esempio che ogni profilo nuovo si
        // ritrova) rende "noti" stacchi e panche a chi si è appena iscritto, e
        // il livello appena dichiarato non serviva più a niente. Chi lo vuole
        // comunque lo sceglie a mano, ed entra.
        if (!livelloAmmette(liv, cand.nome)) return
        if (tipo === TIPO.FONDAMENTALE && fondamentali >= tettoFondamentali) return
        const tetto = secondoGiro ? maxStessaFamiglia(vol.focus) : 1
        if (famiglia && (famiglieUsate.get(famiglia) || 0) >= tetto) {
          if (!secondoGiro) scarti.push(cand)
          return
        }
      }
      usati.add(key)
      if (famiglia) famiglieUsate.set(famiglia, (famiglieUsate.get(famiglia) || 0) + 1)
      if (tipo === TIPO.FONDAMENTALE) fondamentali += 1
      presi.push({ nome: cand.nome, gruppo, tipo })
    }

    for (const cand of candidati) {
      if (presi.length >= vol.max) break
      prendi(cand, false)
    }
    // Secondo giro, solo sui muscoli del focus: si ammette una seconda (o terza)
    // variante della stessa famiglia. Senza questa deroga "crescita bicipiti"
    // darebbe un esercizio solo, perché i bicipiti sono quasi tutti "curl".
    if (vol.focus > 0) {
      for (const cand of scarti) {
        if (presi.length >= vol.max) break
        prendi(cand, true)
      }
    }
    // Dentro il gruppo: prima il pesante, poi il resto (si rende di più da freschi).
    scelte[gruppo] = ordinaSeduta(presi, focus)
  }

  // Quanti ne stanno davvero nel tempo che hai, sapendo il tipo di ciascuno.
  const { quote, tempoStimatoSec } = quoteEsercizi({
    gruppi: gruppiSel,
    durataMin,
    modo: modoScelto,
    focus,
    livello: liv,
    tipoPerIndice: (gruppo, i) => scelte[gruppo]?.[i]?.tipo || tipoEsercizio('', gruppo),
  })

  const seduta = ordinaSeduta(
    gruppiSel.flatMap((g) => (scelte[g] || []).slice(0, quote[g] || 0)),
    focus,
  )

  const esercizi = seduta.map((e) => {
    const presc = prescrizione(modoScelto, e.tipo, liv)
    // Peso di partenza da quello che hai già fatto con questo esercizio. Se
    // non l'hai mai svolto NON si inventa nulla: il campo resta vuoto e in
    // allenamento compare la guida su come scegliere il carico (lib/carico).
    const cons = consiglioCarico(e.nome, analisi?.carichi)
    return nuovoEsercizio({
      nome: e.nome,
      gruppo: e.gruppo,
      schemaBase: schemaVuoto({
        serie: presc.serie,
        ripetizioni: presc.ripetizioni,
        recupero: presc.recupero,
        carico: cons?.caricoSuggerito || '',
      }),
    })
  })

  const nome =
    nomeForzato || 'Consigliato · ' + gruppiSel.map((g) => gruppoDi(g)?.label || g).join(' + ')
  return { nome, esercizi, modo: modoScelto, tempoStimatoSec }
}

// ---- Utility condivise (dieta "cosa mangiare oggi") ----------------------

// Insieme degli indici (0..6) dei giorni di allenamento, dall'unione dei
// `giorniSettimana` di tutte le schede (esclusa quella degli allenamenti liberi).
export function giorniAllenamentoSettimanali(schede) {
  const set = new Set()
  for (const s of schede || []) {
    if (s.libera) continue
    for (const g of s.giorniSettimana || []) set.add(g)
  }
  return set
}

/**
 * Oggi è un giorno di allenamento?
 * @returns {{ noto: boolean, allenamento: boolean }} `noto`=false se nessuna
 *   scheda ha impostato i giorni (non possiamo saperlo).
 */
export function oggiEAllenamento(schede, data = new Date()) {
  const set = giorniAllenamentoSettimanali(schede)
  return { noto: set.size > 0, allenamento: set.has(indiceSettimana(data)) }
}
