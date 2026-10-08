// ---------------------------------------------------------------------------
// Le FORME del corpo umano: sagoma e muscoli, gruppo per gruppo e vista per
// vista, come semplici stringhe di path SVG in un riquadro 100 x 200.
//
// Perche' esistono qui e non dentro il componente. Il corpo col muscolo acceso
// serve ormai in due posti che disegnano in modi diversi:
//   - components/CorpoMuscoli (sezione Esercizi) e components/CorpoAllenato
//     (recap) lo disegnano come SVG in React;
//   - lib/recapImmagine lo disegna su una <canvas> 1080x1350, perche' la card
//     da condividere e' un'immagine e non un pezzo di pagina.
// Se le forme stessero nel JSX, la card e la pagina sarebbero due disegni
// diversi destinati a divergere alla prima correzione. Qui sono UNA cosa sola:
// le stringhe di path si danno a <path d>, e su canvas a `new Path2D(d)`.
//
// Come e' fatta una forma:
//   `pieni`  = path da riempire (fill);
//   `tratti` = path da tracciare, con lo spessore che fa da volume ({ d, w });
//   `solchi` = path da tracciare NEL COLORE DELLO SFONDO ({ d, w }): sono le
//              separazioni dentro un muscolo (le teste del deltoide, i due
//              capi del tricipite, la linea alba). Chi disegna li tratta a
//              parte, perche' nel colore del muscolo sparirebbero.
//
// ⚠️ RIFATTO (21a tornata) da manichino a TAVOLA ANATOMICA. Prima la sagoma era
// fatta di segmenti spessi arrotondati (braccia e gambe erano linee con `w`) e
// i muscoli erano ellissi: si capiva, ma non era un corpo. Adesso il contorno e'
// un profilo umano chiuso — deltoide, svaso dei dorsali, vita stretta, ventre
// del polpaccio — e ogni muscolo e' il suo ventre vero, con le sue separazioni.
// La struttura del file NON e' cambiata: chi disegnava prima disegna adesso.
//
// ⚠️ Queste forme sono disegnate a mano, coordinata per coordinata. Non
// ricalcare MAI un'immagine trovata in giro per ritoccarle: nella 42a si e'
// provato a ricalcare una tavola anatomica e si e' tornati indietro, perche'
// voleva dire pubblicare il disegno di un altro. Si cambiano i numeri.
//
// Riferimenti verticali (gli stessi di prima, cosi' niente altro si sposta):
//   testa 3..30 · collo 28..38 · spalle 42 · linea del capezzolo 55 · vita 79
//   · anche 96 · inguine 105 · ginocchia 142 · caviglie 179 · pianta 190
// L'asse di simmetria e' x = 50: la meta' sinistra si specchia con 100 - x.
//
// Fronte e retro condividono la stessa sagoma (visto da davanti o da dietro un
// corpo ha lo stesso contorno): cambiano i muscoli sopra e un dettaglio che
// dice da che parte stiamo guardando (i lineamenti davanti, la colonna dietro).
// ---------------------------------------------------------------------------

import { gruppoDi } from './muscoli'

export const CORPO_W = 100
export const CORPO_H = 200

const r3 = (n) => Math.round(n * 1000) / 1000

// Specchia un path attorno a x = 50. Serve perche' il corpo e' simmetrico e
// scrivere due volte le stesse curve a mano vuol dire sbagliarne una: qui la
// meta' destra e' la sinistra, per costruzione.
//
// ⚠️ Accetta SOLO comandi assoluti, e su uno relativo si ferma con un errore
// invece di restituire un path storto. Un `h-5.6` specchiato "a numeri" darebbe
// 105.6 al posto di 5.6 e il muscolo finirebbe fuori dal corpo — un difetto che
// si vede a occhio ma non si capisce guardando il codice.
// ⚠️ Sugli archi il verso di percorrenza si inverte, quindi va ribaltato anche
// il flag di spazzata: senza, l'ellisse specchiata si chiude dalla parte
// sbagliata e viene una lente invece di un ovale.
function specchia(d) {
  let out = ''
  const re = /([A-Za-z])([^A-Za-z]*)/g
  let m
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1]
    if (cmd === 'z' || cmd === 'Z') {
      out += 'Z'
      continue
    }
    if (cmd !== cmd.toUpperCase()) {
      throw new Error(`specchia: comando relativo "${cmd}" non supportato, usa le maiuscole`)
    }
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number)
    if (n.some(Number.isNaN)) throw new Error(`specchia: numeri illeggibili dopo "${cmd}"`)
    if (cmd === 'A') {
      // rx ry rotazione archiGrandi spazzata x y — a gruppi di 7
      for (let i = 0; i + 6 < n.length; i += 7) {
        n[i + 2] = -n[i + 2]
        n[i + 4] = n[i + 4] ? 0 : 1
        n[i + 5] = r3(100 - n[i + 5])
      }
    } else if (cmd === 'H') {
      for (let i = 0; i < n.length; i++) n[i] = r3(100 - n[i])
    } else if (cmd !== 'V') {
      // M L C Q S T: coppie x y, si specchia la x
      for (let i = 0; i < n.length; i += 2) n[i] = r3(100 - n[i])
    }
    out += cmd + n.join(' ')
  }
  return out
}

/** Una coppia sinistra/destra da un solo path scritto per la sinistra. */
const paio = (d) => [d, specchia(d)]

// Ruota un path attorno a (cx, cy) di `gradi` (positivo = orario sullo schermo,
// cioe' per la meta' sinistra il fondo va verso l'esterno). Serve alla POSA
// (42a): braccia scostate dai fianchi e gambe un po' aperte, come nelle tavole
// anatomiche. Le forme di braccia e gambe restano scritte DRITTE, come prima,
// e si girano qui: cosi' sagoma e muscoli dell'arto girano insieme e non c'e'
// da ricalcolare a mano ogni curva.
// ⚠️ Come `specchia`, solo comandi assoluti; H e V non si ruotano (una
// orizzontale girata non e' piu' orizzontale) e fermano tutto con un errore.
function ruota(d, cx, cy, gradi) {
  const rad = (gradi * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return mappa(d, 'ruota', (x, y) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos], gradi)
}

// Applica `punto(x, y) -> [x, y]` a ogni punto di un path. `gradiArco` e' di
// quanto girare l'asse degli archi (una rotazione lo gira; una deformazione
// che non e' una rotazione gli archi non li sa trattare, e allora si ferma).
function mappa(d, nome, punto, gradiArco = null) {
  const p = (x, y) => punto(x, y).map(r3)
  let out = ''
  const re = /([A-Za-z])([^A-Za-z]*)/g
  let m
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1]
    if (cmd === 'z' || cmd === 'Z') {
      out += 'Z'
      continue
    }
    if (cmd !== cmd.toUpperCase() || cmd === 'H' || cmd === 'V' || (cmd === 'A' && gradiArco == null)) {
      throw new Error(`${nome}: comando "${cmd}" non supportato`)
    }
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number)
    if (n.some(Number.isNaN)) throw new Error(`${nome}: numeri illeggibili dopo "${cmd}"`)
    if (cmd === 'A') {
      // rx ry rotazione archiGrandi spazzata x y: gira l'asse e il punto d'arrivo
      for (let i = 0; i + 6 < n.length; i += 7) {
        n[i + 2] = r3(n[i + 2] + gradiArco)
        ;[n[i + 5], n[i + 6]] = p(n[i + 5], n[i + 6])
      }
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) [n[i], n[i + 1]] = p(n[i], n[i + 1])
    }
    out += cmd + n.join(' ')
  }
  return out
}

// Il TELAIO in alto (42a): spalle e torace piu' larghi, come nella tavola.
// Invece di ridisegnare tronco e muscoli si allarga quello che c'e' attorno
// all'asse x = 50: del 10% fino alle spalle, sfumando a niente alla vita
// (bacino e gambe non si muovono). Le curve restano lisce perche' lo
// stiramento cambia piano piano con l'altezza.
// Le braccia NON si stirano (verrebbero grosse): si spostano in fuori tutte
// intere, di quanto si sposta il tronco all'ascella (SPALLA.dx).
const TELAIO = { piu: 0.1, finoA: 44, vita: 78 }
function quantoLargo(y) {
  if (y <= TELAIO.finoA) return 1 + TELAIO.piu
  if (y >= TELAIO.vita) return 1
  return 1 + (TELAIO.piu * (TELAIO.vita - y)) / (TELAIO.vita - TELAIO.finoA)
}
const larga = (d) => mappa(d, 'larga', (x, y) => [50 + (x - 50) * quantoLargo(y), y])

// La posa. Il braccio gira attorno all'articolazione della spalla, la gamba
// attorno all'anca. Il deltoide gira della meta': sta SULLA spalla, e girato
// per intero scivolerebbe sopra il pettorale.
const SPALLA = { x: 30, y: 46, gradi: 10, dx: -1.35 }
const ANCA = { x: 41, y: 100, gradi: 4 }
const braccio = (d, gradi = SPALLA.gradi) =>
  mappa(ruota(d, SPALLA.x, SPALLA.y, gradi), 'braccio', (x, y) => [x + SPALLA.dx, y], 0)
const gamba = (d) => ruota(d, ANCA.x, ANCA.y, ANCA.gradi)
const paioB = (d) => paio(braccio(d))
const paioG = (d) => paio(gamba(d))

// --------------------------------------------------------------- la sagoma
//
// Proporzioni (in un riquadro 100 x 200, asse a x = 50):
//   tronco alle spalle 32.4, piu' i deltoidi che sporgono fino a x 23 e 77
//   vita 25.4 · bacino 30.4 · coscia 15 · caviglia 4.8
// ⚠️ Il tronco NON arriva sotto le braccia: le braccia stanno fuori e si
// toccano appena all'ascella. Nella prima stesura si sovrapponevano di cinque
// unita' e le due spalle venivano un blocco solo.

// Testa: calotta, zigomi, mandibola che si stringe al mento.
// ⚠️ Senza occhi ne' bocca. Una tavola anatomica non ha una faccia, e due
// puntini con un sorriso facevano scivolare tutto il disegno verso il fumetto —
// che e' esattamente il contrario di quello che serve qui.
const TESTA =
  'M50 4 C56.4 4 60.4 9.2 60.4 16.2 C60.4 19.8 59.6 22.9 58.2 25.3 ' +
  'C57 27.4 55.4 29 53.6 29.9 C52.4 30.5 51.2 30.8 50 30.8 ' +
  'C48.8 30.8 47.6 30.5 46.4 29.9 C44.6 29 43 27.4 41.8 25.3 ' +
  'C40.4 22.9 39.6 19.8 39.6 16.2 C39.6 9.2 43.6 4 50 4 Z'

// Collo: si stringe verso la fossetta fra le clavicole.
const COLLO = 'M45.8 27.4 L54.2 27.4 L54.2 36 Q50 38.4 45.8 36 Z'

// Tronco: trapezio verso la spalla, costato, vita stretta, svaso del bacino.
// Scritto per intero (non specchiato) perche' e' un anello solo.
const TRONCO =
  'M54.4 35 ' +
  'C58.8 36 62.2 38 64.6 41.2 ' + // trapezio -> spalla. ⚠️ x 64.6 e' dove
  'C66.2 44.8 66.4 48.6 66 52.4 ' + //   comincia il deltoide: se il tronco
  '' + //   arriva piu' in fuori, il suo angolo sbuca sopra la spalla e si
  '' + //   vede uno scalino grigio. E' successo nella prima stesura.
  'C65.2 59.6 64.2 65.6 63.4 71 ' + // costato
  'C62.8 75 62.6 77.6 62.7 80.4 ' + // vita
  'C63 86 64.6 91 65.2 96 ' + // bacino
  'C65.6 100.4 63.6 104 59.8 105.6 ' +
  'C56.6 106.8 53.4 107.4 50 107.4 ' +
  'C46.6 107.4 43.4 106.8 40.2 105.6 ' +
  'C36.4 104 34.4 100.4 34.8 96 ' +
  'C35.4 91 37 86 37.3 80.4 ' +
  'C37.4 77.6 37.2 75 36.6 71 ' +
  'C35.8 65.6 34.8 59.6 34 52.4 ' +
  'C33.6 48.6 33.8 44.8 35.4 41.2 ' +
  'C37.8 38 41.2 36 45.6 35 Z'

// Braccio sinistro: deltoide, ventre del braccio, gomito stretto, avambraccio
// che si gonfia e si assottiglia al polso.
const BRACCIO =
  'M34.6 40.4 ' +
  'C29.4 41.6 25.4 44.6 23.6 49.4 ' + // deltoide
  'C22.4 53.6 22.6 58.4 23.2 63 ' + // braccio, esterno
  'C23.6 67.4 24.2 72 24.6 76.4 ' + // gomito
  'C25.2 81.6 26 87 27 92.4 ' + // avambraccio
  'C27.6 95.8 28 99 28.2 101.6 ' + // polso
  'L33 101.2 ' +
  'C32.8 98.6 32.6 95.6 32.2 92.6 ' +
  'C31.4 87.4 30.6 82 30.4 76.8 ' +
  'C30.2 72.4 30.6 68 31.2 63.6 ' +
  'C31.8 59 32.6 54.2 33.4 49.6 ' + // interno, verso l'ascella
  'C33.9 46.6 34.4 43.4 34.6 40.4 Z'

// Mano rilassata: pende lungo la coscia col palmo verso la gamba, le dita
// appena chiuse (il bordo basso e' in sbieco) e il pollice davanti che si
// chiude sull'indice. Fra i due resta un forellino: e' quello che la fa
// leggere come mano.
// ⚠️ Rifatta piu' volte nella 42a (ovale, manopola, dita aperte, guanto col
// pollice). Questa e' presa, a una decina di punti, dalla mano di una tavola
// anatomica di riferimento: e' l'unico pezzo del corpo che ne deriva.
// ⚠️ Il foro e' un secondo sotto-path girato AL CONTRARIO del contorno: con la
// regola di riempimento di default (nonzero, sia SVG sia canvas) diventa un
// buco. `ruota` e `specchia` conservano il fatto che i due giri sono opposti.
// ⚠️ Sta in SAGOMA.mani e va riempita SENZA contorno: il tratto di un'unita'
// della sagoma (.corpo-base) chiuderebbe il foro. Per non avere uno scalino al
// polso e' mezza unita' piu' larga del braccio per lato, e parte da dentro
// l'avambraccio.
const MANO =
  'M27.6 99 ' +
  'C27.4 101.4 27.1 103.4 27 105 ' + // dorso, esterno
  'C26.9 106.4 26.8 107.6 27.1 108.8 ' +
  'C27.5 110.2 28.3 111.6 29.2 112.3 ' + // nocche
  'C30.4 112.8 31.8 112.5 33 112 ' + // le dita chiuse, in sbieco
  'C34.2 111.7 35.1 111.3 35.4 110.6 ' + // punta del pollice
  'C35.6 109.9 34.9 109.2 34.4 108.6 ' +
  'C33.8 108 33.7 107.4 33.8 106.6 ' + // fra pollice e palmo
  'C34.2 105.6 34.7 104.4 34.6 103.2 ' + // la base del pollice, verso la coscia
  'C34.5 101.8 33.8 100.6 33.2 99 Z ' +
  'M30.5 107.1 L31.6 106.75 L32.1 109.1 L31 109.4 Z'

// Gamba sinistra: coscia piena, ginocchio stretto, polpaccio che si gonfia in
// fuori e dentro (42a: prima il polpaccio non sporgeva oltre il ginocchio e la
// gamba finiva in un cono), caviglia sottile.
const GAMBA =
  'M35.6 97.4 ' +
  'C33.4 104 32.6 112 33 120 ' + // vasto laterale
  'C33.4 127.4 35 134 36.8 140 ' + // ginocchio
  'C36 144 35.6 147.6 35.8 151 ' + // polpaccio, esterno
  'C36.2 156.6 38.6 162 40 166.6 ' +
  'C40.8 169.6 41.1 173.6 41 179.2 ' + // caviglia
  'L45.8 179.2 ' +
  'C45.8 173.6 46 169.6 46.6 166 ' +
  'C47.6 161.4 48.8 156.6 48.8 151.6 ' + // polpaccio, interno
  'C48.8 147.4 48 143.4 47.8 140 ' +
  'C48.4 133.6 49 127 49.1 120 ' +
  'C49.2 112.6 49.2 108 49.2 104.6 ' + // interno coscia -> inguine
  'L44.4 104.4 ' +
  'C41.6 101.6 38.6 99 35.6 97.4 Z'

// Piede sinistro, di taglio: dal collo del piede alle dita.
const PIEDE =
  'M40.8 177.8 L45.9 177.8 C46 181 46.1 184 46.2 186.2 ' +
  'C46.3 188.6 45.2 190 42.8 190 L35.4 190 ' +
  'C33.2 190 32.6 188.4 33.8 186.6 C35 184.8 37.2 183 38.9 181.6 ' +
  'C40 180.6 40.7 179.2 40.8 177.8 Z'

/** La sagoma: quello che c'e' sotto i muscoli, uguale nelle due viste. */
export const SAGOMA = {
  // ⚠️ Vuoto e non tolto: chi disegna (SVG e canvas) cicla comunque su
  // `tratti`, e una sagoma fatta di soli pieni e' esattamente il punto della
  // riscrittura — le braccia non sono piu' linee spesse, sono braccia.
  tratti: [],
  // Le mani, da riempire SENZA contorno (vedi MANO).
  mani: paioB(MANO),
  pieni: [TESTA, COLLO, larga(TRONCO), ...paioB(BRACCIO), ...paioG(GAMBA), ...paioG(PIEDE)],
}

/** Il dettaglio che distingue le due viste: le clavicole davanti, la colonna dietro. */
export const TRATTI_VISTA = {
  fronte: [
    // Le clavicole, nella striscia fra il trapezio e il pettorale.
    { d: larga('M48.8 40.6 C46 40.3 42.6 40.5 39.4 41.3'), w: 0.8 },
    { d: larga('M51.2 40.6 C54 40.3 57.4 40.5 60.6 41.3'), w: 0.8 },
  ],
  dietro: [
    // Dal trapezio in giu': sopra lo copre lui, che e' un pezzo solo.
    { d: 'M50 68.6 L50 94', w: 1.2 },
    { d: 'M50 97 L50 106.4', w: 1.2 },
  ],
}

const vuoto = { pieni: [], tratti: [] }

// Un quadretto della tartaruga: rettangolo con gli angoli smussati, scritto
// con soli comandi assoluti perche' passi da `specchia`.
function quadretto(x0, y0, x1, y1, r = 1.4) {
  return (
    `M${x1} ${y0} L${r3(x0 + r)} ${y0} Q${x0} ${y0} ${x0} ${r3(y0 + r)} ` +
    `L${x0} ${r3(y1 - r)} Q${x0} ${y1} ${r3(x0 + r)} ${y1} L${x1} ${y1} Z`
  )
}

// ⚠️ RIDISEGNATI (42a) sul modello di una tavola anatomica "a tessere": ogni
// muscolo e' un pezzo a se', arrotondato, e fra un muscolo e l'altro resta
// UNA STRISCIA DI SAGOMA (circa un'unita'). E' quella striscia che fa leggere
// il disegno come muscolatura e non come una macchia: per questo i solchi
// tratteggiati dentro i muscoli non servono piu' e sono quasi tutti spariti.
// Sono comparsi i muscoli piccoli che prima mancavano (brachiale, flessori ed
// estensori dell'avambraccio, sartorio, adduttori, sottospinato, medio gluteo,
// i due capi del polpaccio) e alcuni gruppi si vedono adesso anche dall'altra
// parte: il trapezio spunta sopra le spalle davanti, il polpaccio dall'interno
// dello stinco, il medio gluteo sul fianco. Quei pezzi sono piccoli e non
// cambiano `dueViste` in lib/muscoli: nella sezione Esercizi il gruppo resta
// presentato dalla parte dove si riconosce.
//
// Avambracci: non sono un gruppo. Si accendono coi bicipiti davanti (flessori)
// e coi tricipiti dietro (estensori), come prima.

const AVAMBRACCIO = [
  // Brachioradiale: il fuso esterno, il piu' grosso.
  ...paioB(
    'M25.4 78.6 C25 82.6 25.6 87.4 27 91.6 C27.6 93.6 28.4 94.4 29 93.6 ' +
      'C29.4 89.6 29.2 84.6 28.2 80.4 C27.6 78.4 26.2 77.4 25.4 78.6 Z',
  ),
  // Il fascio interno (flessore radiale del carpo davanti, ulnare dietro).
  ...paioB(
    'M30 79 C29.4 81 29.6 85.6 30.4 90.2 C30.8 93.4 31.6 95.4 32.2 94.6 ' +
      'C32.4 90.6 31.8 85.2 30.8 80.6 C30.6 79.4 30.3 78.6 30 79 Z',
  ),
]

/**
 * I muscoli di ogni gruppo, per vista. `null` = quel gruppo da quella parte non
 * si vede (i pettorali da dietro non ci sono).
 */
export const MUSCOLI = {
  // ---------------------------------------------------------------- petto
  petto: {
    fronte: {
      // Gran pettorale: una placca larga dallo sterno alla spalla, col bordo
      // basso arrotondato. Le due meta' si toccano quasi sullo sterno.
      // ⚠️ L'angolo in alto e fuori sale fino in cima al deltoide e il bordo
      // esterno ne segue la curva interna a un'unita' di distanza, fino
      // all'ascella: e' quella striscia sottile e regolare che attacca la
      // spalla al petto. Se si tocca il deltoide (o la posa del braccio, che
      // lo gira) va rifatto anche questo bordo.
      pieni: paio(
        'M49.3 42.6 C46 41.6 41.6 41.6 37.5 42.7 ' +
          'C36.6 44 35.8 46.6 34.8 48.4 C34.2 49.6 34.4 51.2 35.4 52.8 ' +
          'C37.4 56 40.6 58.6 43.6 59.4 C45.8 60 47.8 59.6 49.3 58.6 Z',
      ),
      solchi: [],
      tratti: [],
    },
    dietro: null,
  },

  // --------------------------------------------------------------- schiena
  schiena: {
    // Davanti si vede solo il trapezio: i due cunei fra collo e spalla.
    fronte: {
      pieni: paio(
        'M45.4 35.6 C42.8 36.4 40 37.8 37.6 39.8 C40.4 39.6 43 39 44.8 38.2 ' +
          'C45.3 37.4 45.5 36.6 45.4 35.6 Z',
      ),
      solchi: [],
      tratti: [],
    },
    dietro: {
      pieni: [
        // Trapezio: dal collo alle due spalle e a punta fra le scapole. E' un
        // pezzo solo, attraversa la colonna.
        'M50 30.4 C48.6 33 46.8 35 44.2 36.4 C41 38 38 39.4 36 41.4 ' +
          'C35.2 42.4 35.8 43.6 37.2 44.2 C40.8 46 43.6 50 45.6 55.6 ' +
          'C46.8 59.8 48 64.6 50 67.6 C52 64.6 53.2 59.8 54.4 55.6 ' +
          'C56.4 50 59.2 46 62.8 44.2 C64.2 43.6 64.8 42.4 64 41.4 ' +
          'C62 39.4 59 38 55.8 36.4 C53.2 35 51.4 33 50 30.4 Z',
        // Sottospinato e grande rotondo: la scapola, fra trapezio e deltoide.
        ...paio(
          'M37.4 46.4 C35.8 48.2 35.6 51 36.8 53.4 C38.4 56.4 41.2 58 43.6 57.6 ' +
            'C44.4 57.4 44.6 56.4 44.2 55.2 C43 51.4 40.8 48 37.4 46.4 Z',
        ),
        // Gran dorsale: largo sotto l'ascella, a punta verso la colonna.
        ...paio(
          'M35.6 56.4 C35.2 61.2 35.8 66.4 37.2 71.4 C38.2 76 40 80 42.6 83.2 ' +
            'L47.4 87.4 C48.6 88.2 49.2 87.4 48.8 85.8 C47.6 79.6 46.4 72.8 45.6 66 ' +
            'C45.2 62.4 44.4 60.2 42.4 59.4 C40 58.6 37.6 57.8 35.6 56.4 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
  },

  // ---------------------------------------------------------------- spalle
  spalle: (() => {
    // Il deltoide e' la stessa goccia vista dai due lati: tonda sulla spalla,
    // a punta verso l'esterno del braccio. Si scrive una volta.
    const goccia = paio(
      braccio(
        'M36.2 41.6 C31 42 26.6 44.6 24.6 49.4 C23.4 52.6 23.6 56 24.6 59 ' +
          'C26.6 57.2 29 55 31 52.6 C33.4 49.6 35.2 45.8 36.2 41.6 Z',
        SPALLA.gradi / 2,
      ),
    )
    return {
      fronte: { pieni: goccia, solchi: [], tratti: [] },
      dietro: { pieni: goccia, solchi: [], tratti: [] },
    }
  })(),

  // ------------------------------------------------------------- bicipiti
  bicipiti: {
    fronte: {
      pieni: [
        // Il ventre del bicipite.
        ...paioB(
          'M31 55.2 C28.6 56.6 27 60.6 26.8 65.6 C26.6 70.4 27.4 74.4 29 75.8 ' +
            'C30.4 76.8 31.3 75 31.4 71.4 C31.6 66 31.6 60.2 31 55.2 Z',
        ),
        // Il brachiale: la lama che spunta fuori dal bicipite.
        ...paioB(
          'M24.4 61.4 C23.6 64.6 23.7 68.8 24.6 72.6 C25 74.2 25.8 74.4 26 73.2 ' +
            'C25.6 69.4 25.6 65 25.8 61.2 C25.6 60.2 24.8 60.2 24.4 61.4 Z',
        ),
        ...AVAMBRACCIO,
      ],
      solchi: [],
      tratti: [],
    },
    dietro: null,
  },

  // ------------------------------------------------------------ tricipiti
  tricipiti: {
    fronte: null,
    dietro: {
      pieni: [
        // Capo laterale, fuori.
        ...paioB(
          'M24.8 61.6 C23.8 64.8 23.9 68.8 25 72.4 C25.8 75 27 75.8 27.6 74.6 ' +
            'C27.8 69.6 27.6 65.2 27.1 62 C26.7 60.4 25.4 60.4 24.8 61.6 Z',
        ),
        // Capo lungo, dentro: il piu' grosso.
        ...paioB(
          'M30.8 54.8 C29 56.6 28.4 60.8 28.6 65.4 C28.8 70 29.6 73.8 30.4 74.8 ' +
            'C30.9 75.4 31.2 73.8 31.2 71 C31.2 65.6 31.2 59.8 30.8 54.8 Z',
        ),
        ...AVAMBRACCIO,
      ],
      solchi: [],
      tratti: [],
    },
  },

  // --------------------------------------------------------------- addome
  addome: {
    fronte: {
      // ⚠️ Quadretti SEPARATI, non un rettangolo con sopra dei solchi: quando
      // il gruppo si accende, i vuoti restano del colore del corpo e la
      // tartaruga si legge davvero. La linea alba e' il vuoto fra le due file.
      pieni: [
        ...paio(quadretto(43.4, 61, 49.3, 67.4)),
        ...paio(quadretto(43.4, 68.4, 49.3, 74.8)),
        ...paio(quadretto(43.4, 75.8, 49.3, 82.2)),
        // La parte bassa, lunga, che si stringe verso l'inguine.
        ...paio('M49.3 83.2 L44.8 83.2 Q43.4 83.2 43.4 84.6 L43.6 92 Q44 98 46.6 100.6 Q48 101.8 49.3 101.6 Z'),
        // Obliqui esterni: le lame lunghe ai fianchi.
        ...paio(
          'M41.6 60.4 C39.4 61.6 38 64.6 37.6 69 C37.3 74.4 37.8 80.2 39.2 85 ' +
            'C40 87.8 41.2 89.4 42.2 88.6 C42.6 82 42.6 74 42.4 66.6 C42.3 63.8 42.1 61.6 41.6 60.4 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
    dietro: null,
  },

  // ---------------------------------------------------------------- gambe
  gambe: {
    fronte: {
      pieni: [
        // Vasto laterale: la fascia esterna della coscia.
        ...paioG(
          'M35.4 103.6 C33.8 109.4 33.4 117 34.2 124.6 C34.8 130.4 36 135.4 37.6 137.6 ' +
            'C38.6 138.8 39.4 137.4 38.8 134.6 C37.2 128.4 36.4 121 36.6 113.6 ' +
            'C36.7 109.6 36.4 106 35.4 103.6 Z',
        ),
        // Retto femorale: il fuso centrale.
        ...paioG(
          'M39.8 103.4 C37.9 108.8 37.3 116.4 37.8 123.6 C38.2 129 39.4 133.4 41 134.6 ' +
            'C42.2 135.4 42.9 133.4 43 129.4 C43.2 121.8 42.6 112.6 41.4 106.4 ' +
            'C41 104.4 40.4 103 39.8 103.4 Z',
        ),
        // Sartorio: la striscia che scende di sbieco verso l'interno del ginocchio.
        ...paioG(
          'M42.2 102.6 C44.2 108.2 46 114.4 47 120.6 C47.6 124.8 47.8 129.6 47.8 134.8 ' +
            'L48.6 134.6 C48.8 129.4 48.7 124.4 48.2 120 C47.2 113.4 45.4 107.4 43.6 101.8 ' +
            'C43.2 101.4 42.4 101.8 42.2 102.6 Z',
        ),
        // Adduttori: il cuneo in alto, dentro la coscia.
        ...paioG('M45.4 103.8 L48.8 104.4 C48.9 109.2 48.8 113.4 48.4 117 C47.6 112 46.6 107.6 45.4 103.8 Z'),
        // Vasto mediale: la goccia sopra il ginocchio, dalla parte interna.
        ...paioG(
          'M45.2 120.6 C43.8 123.4 43.4 128 44.2 132.2 C44.8 135.4 46.2 137.2 47 136 ' +
            'C47.4 134.6 47.2 130.4 46.8 126.4 C46.5 123.4 46 121.2 45.2 120.6 Z',
        ),
        // Tibiale anteriore: davanti allo stinco, verso l'esterno.
        ...paioG(
          'M38.8 144.2 C37.6 148.8 37.6 154.4 38.6 159.2 C39.2 162 40.2 164.6 41 165.4 ' +
            'C41.6 165.8 42 164.8 42 163.2 C41.8 157.8 41.4 152.4 40.8 148.2 ' +
            'C40.4 145.6 39.6 143.8 38.8 144.2 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
    // Da dietro le gambe sono i femorali: glutei e polpacci hanno i loro
    // gruppi (sotto), e si accendono per conto loro.
    dietro: {
      pieni: [
        // Bicipite femorale, fuori.
        ...paioG(
          'M36.6 111 C35 116 34.6 122.4 35.4 128.6 C36 133.4 37.6 137.4 39.4 138.4 ' +
            'C40.6 139 41 137.6 40.8 134.8 C40.4 127.6 39.8 120 38.6 114 ' +
            'C38.2 112 37.4 110.6 36.6 111 Z',
        ),
        // Semitendinoso, dentro.
        ...paioG(
          'M44.6 110.6 C42.8 115.6 42 122.6 42.4 129 C42.7 133.8 43.8 137.8 45.4 138.6 ' +
            'C46.6 139.2 47.4 137.6 47.6 134.4 C48 127.6 47.6 119.6 46.6 113.8 ' +
            'C46.2 111.6 45.4 110.2 44.6 110.6 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
  },

  // --------------------------------------------------------------- glutei
  // Fino alla 37a erano dentro "gambe".
  glutei: {
    // Davanti spunta il medio gluteo, sul fianco sotto gli obliqui.
    fronte: {
      pieni: paio(
        'M35.8 92.4 C35 94.8 35 97.8 35.8 100 C36.6 98.8 37.4 96.8 37.6 94.6 ' +
          'C37.4 93.2 36.6 92.4 35.8 92.4 Z',
      ),
      solchi: [],
      tratti: [],
    },
    dietro: {
      pieni: [
        // Medio gluteo: la fetta sopra e fuori.
        ...paio('M37.2 89.2 C36.2 90.4 35.6 92 35.6 93.8 C38.4 92.8 41.6 92.6 44.4 93 C43.2 91 40.6 89.2 37.2 89.2 Z'),
        // Grande gluteo: la massa tonda, le due meta' divise dal solco centrale.
        ...paio(
          'M37.4 95.4 C35 97.6 34.6 101.6 35.8 104.8 C37.2 108.2 40.6 109.8 44.4 109.2 ' +
            'C47 108.8 48.8 107 49.2 104.2 L49.3 99.4 C49.3 97.4 48.2 96 46 95.2 ' +
            'C43.2 94.2 39.6 94.2 37.4 95.4 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
  },

  // ------------------------------------------------------------- polpacci
  // Anche loro dentro "gambe" fino alla 37a. Da davanti se ne vede solo il
  // capo interno, accanto allo stinco: si riconoscono da dietro.
  polpacci: {
    fronte: {
      pieni: paioG(
        'M46.4 144.4 C45 148.4 44.4 153.8 44.8 158.8 C45.1 162.4 45.8 164.2 46.6 163.4 ' +
          'C47.4 162.2 47.8 157.6 47.8 152.6 C47.8 148.6 47.2 145.4 46.4 144.4 Z',
      ),
      solchi: [],
      tratti: [],
    },
    dietro: {
      pieni: [
        // Gemello, capo laterale.
        ...paioG(
          'M38.6 142.6 C36.8 145.6 36.2 150.4 36.8 155.4 C37.3 159.4 38.8 162.6 40.6 163 ' +
            'C41.6 163.2 42 161.6 41.9 158.4 C41.8 152.6 41.2 147 40.2 143.8 ' +
            'C39.8 142.6 39.2 142.2 38.6 142.6 Z',
        ),
        // Gemello, capo mediale: il piu' grosso.
        ...paioG(
          'M45.4 142.4 C44 145.4 43.4 150.6 43.8 156 C44.1 160.2 45.2 163.6 46.6 163.8 ' +
            'C47.6 164 48.2 161.6 48.2 157.6 C48.2 151.8 47.6 146.6 46.6 143.4 ' +
            'C46.2 142.4 45.8 142 45.4 142.4 Z',
        ),
      ],
      solchi: [],
      tratti: [],
    },
  },

  // Il cardio non e' un muscolo: chi disegna accende tutta la sagoma e ci mette
  // un cuore (vedi CUORE). Qui non ha forme proprie.
  cardio: { fronte: null, dietro: null },
}

// I muscoli del tronco seguono il telaio (vedi `larga`): sono scritti sul
// tronco stretto di prima e si allargano qui, tutti insieme, cosi' le
// distanze fra l'uno e l'altro restano quelle disegnate. Lo stiramento e'
// simmetrico, quindi va bene anche sulle meta' gia' specchiate.
for (const id of ['petto', 'schiena', 'addome']) {
  for (const vista of ['fronte', 'dietro']) {
    const f = MUSCOLI[id][vista]
    if (f) f.pieni = f.pieni.map(larga)
  }
}

// Il cuore del cardio, disegnato attorno all'origine e non in posizione: cosi'
// il battito e' una `scale` attorno al suo centro sia in SVG (dentro un <g>
// traslato) sia su canvas (translate + scale), senza due path diversi.
export const CUORE =
  'M0 -6 q-4.6 -6.4 -9.2 -2.4 q-4 3.6 0 8.6 L0 8.4 L9.2 0.2 q4 -5 0 -8.6 q-4.6 -4 -9.2 2.4 Z'
// ⚠️ Alzato da y=66 a y=53 con la sagoma nuova: 66 era il centro del vecchio
// tronco, adesso e' l'ombelico. Il cuore sta in mezzo al petto.
export const CUORE_CENTRO = { x: 50, y: 53 }

// Il colore dei muscoli allenati: quello del SUO gruppo (lib/muscoli: petto
// rosso, schiena blu, gambe viola...), lo stesso dei pallini e delle etichette
// in tutta l'app, così il corpo si legge con lo stesso codice. Cambia solo di
// intensità: il gruppo su cui è andato il lavoro di oggi è pieno, quello
// sfiorato con due serie è slavato. La funzione sta qui perché il corpo si
// disegna in due modi (SVG nella pagina, canvas nella card) e i due devono
// venire dello stesso colore.
// Fino al 2026-10-08 era un rosso solo per tutti: diceva "quanto", non "cosa".
const SENZA_GRUPPO = [235, 60, 55]

function rgbDi(hex) {
  const n = parseInt(String(hex || '').replace('#', ''), 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : SENZA_GRUPPO
}

/**
 * @param {string} gruppo  id del gruppo (lib/muscoli)
 * @param {number} quota 0..1 = quanto pesa questo gruppo sull'allenamento
 */
export function coloreMuscolo(gruppo, quota) {
  const q = Math.max(0, Math.min(1, Number(quota) || 0))
  const [r, g, b] = rgbDi(gruppoDi(gruppo)?.colore)
  return `rgba(${r}, ${g}, ${b}, ${r3(0.52 + 0.48 * q)})`
}

/** Le forme di un gruppo in una vista (null se da quella parte non si vede). */
export function formeGruppo(gruppo, vista) {
  const set = MUSCOLI[gruppo]
  if (!set) return null
  return set[vista] || null
}

/** Tutti i gruppi che hanno qualcosa da mostrare in questa vista. */
export function gruppiDellaVista(vista) {
  return Object.keys(MUSCOLI).filter((id) => formeGruppo(id, vista))
}

export { vuoto as FORME_VUOTE, specchia }
