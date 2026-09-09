// ---------------------------------------------------------------------------
// Come si esegue un esercizio: il catalogo dei MOVIMENTI.
//
// Ogni voce e' un movimento descritto da due pose del manichino (lib/figura):
// `a` = punto di partenza, `b` = punto di arrivo. Il resto (i fotogrammi in
// mezzo, l'andata e il ritorno) lo calcola figura.js e lo anima il browser.
// Ogni movimento porta anche l'attrezzo da disegnare in mano, la "scena" (la
// panca, la sbarra, il cavo, il tapis roulant...) e una riga di tecnica.
//
// UN MOVIMENTO SERVE PIU' ESERCIZI. "Panca piana bilanciere" e "Spinte al
// multipower" sono lo stesso gesto: cambia l'attrezzo, non il movimento. Per
// questo i 110 esercizi della libreria si appoggiano a una settantina di
// movimenti, spesso derivati l'uno dall'altro con uno spread.
//
// COME SI SCRIVE UNA POSA (dettagli in lib/figura.js):
//   bacino: [x, y]         dove sta il bacino nel riquadro 120x112 (terra y=100)
//   tronco: gradi          90 = dritto in piedi, 0 = orizzontale in avanti,
//                          180 = sdraiato con la testa a sinistra
//   mano: [x, y]           dove finisce la mano: gli angoli di braccio e
//                          avambraccio li trova la cinematica inversa
//   caviglia: [x, y]       idem per la gamba
//   gomito / ginocchio     +1 o -1: da che parte si piega l'articolazione
//   specchio: true         vista frontale (due braccia e due gambe simmetriche)
//
// Se un esercizio non ha un movimento suo, si prende quello di riserva del suo
// gruppo muscolare (RISERVA): meglio un gesto della famiglia giusta che niente.
// ---------------------------------------------------------------------------

import { slugEsercizio } from './eserciziLibreria'

// ---------------------------------------------------------------- pose base

const IN_PIEDI = {
  bacino: [56, 62],
  tronco: 88,
  mano: [58, 66],
  caviglia: [57, 96],
  piede: 0,
}

const IN_PIEDI_FRONTE = {
  bacino: [56, 62],
  tronco: 90,
  specchio: true,
  mano: [68, 66],
  caviglia: [61, 97],
  piede: 10,
}

// Seduto su una panca/macchina: cosce in avanti, tibie a terra.
const SEDUTO = {
  bacino: [44, 80],
  tronco: 93,
  coscia: -3,
  tibia: -90,
  piede: 0,
}

// Sdraiato di schiena su una panca piana, testa a sinistra.
const SUPINO = {
  bacino: [58, 74],
  tronco: 180,
  coscia: -20,
  tibia: -68,
  piede: 0,
}

// ------------------------------------------------------------------ catalogo

/** @type {Record<string, any>} */
export const MOVIMENTI = {}

function M(id, dati) {
  MOVIMENTI[id] = { id, durata: 2.6, vista: 'lato', scena: 'terra', attrezzo: 'nessuno', ...dati }
  return MOVIMENTI[id]
}

// ============================================================ PETTO

M('panca-piana', {
  tecnica: 'Scapole strette e ferme sulla panca, il bilanciere scende al petto e risale sopra le spalle.',
  scena: 'panca',
  attrezzo: 'bilanciere',
  a: { ...SUPINO, mano: [40, 68], gomito: 1 },
  b: { ...SUPINO, mano: [37, 45], gomito: 1 },
})

M('panca-manubri', {
  ...MOVIMENTI['panca-piana'],
  id: 'panca-manubri',
  tecnica: 'Manubri larghi quanto il petto: scendi finche il gomito supera la panca, poi spingi.',
  attrezzo: 'manubrio',
  a: { ...SUPINO, mano: [42, 66], gomito: 1 },
  b: { ...SUPINO, mano: [38, 45], gomito: 1 },
})

const SUPINO_INCL = { bacino: [58, 72], tronco: 150, coscia: -30, tibia: -75, piede: 0 }

M('panca-inclinata', {
  tecnica: 'Panca a 30-40 gradi: il bilanciere tocca la parte alta del petto, non la gola.',
  scena: 'panca-inclinata',
  attrezzo: 'bilanciere',
  a: { ...SUPINO_INCL, mano: [45, 54], gomito: 1 },
  b: { ...SUPINO_INCL, mano: [46, 32], gomito: 1 },
})

M('panca-inclinata-manubri', {
  ...MOVIMENTI['panca-inclinata'],
  id: 'panca-inclinata-manubri',
  tecnica: 'Con i manubri scendi un dito piu in basso: e il vantaggio di questo attrezzo.',
  attrezzo: 'manubrio',
  a: { ...SUPINO_INCL, mano: [47, 56], gomito: 1 },
})

const SUPINO_DECL = { bacino: [58, 68], tronco: 203, coscia: -8, tibia: -55, piede: 0 }

M('panca-declinata', {
  tecnica: 'Testa piu in basso del bacino: il bilanciere scende alla parte bassa del petto.',
  scena: 'panca-declinata',
  attrezzo: 'bilanciere',
  a: { ...SUPINO_DECL, mano: [40, 74], gomito: 1 },
  b: { ...SUPINO_DECL, mano: [36, 52], gomito: 1 },
})

M('chest-press', {
  tecnica: 'Schiena appoggiata, maniglie all altezza del petto: spingi in avanti senza bloccare i gomiti.',
  scena: 'macchina-schienale',
  attrezzo: 'maniglia',
  a: { ...SEDUTO, mano: [46, 62], gomito: 1 },
  b: { ...SEDUTO, mano: [70, 58], gomito: 1 },
})

M('croci-cavi', {
  tecnica: 'Gomiti morbidi e fermi: le braccia si chiudono davanti al petto come per abbracciare.',
  vista: 'fronte',
  scena: 'cavi-doppi',
  attrezzo: 'cavo',
  ancora: [116, 44],
  a: { ...IN_PIEDI_FRONTE, mano: [93, 34], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [60, 52], gomito: -1 },
})

M('croci-cavi-alti', {
  ...MOVIMENTI['croci-cavi'],
  id: 'croci-cavi-alti',
  tecnica: 'Cavi alti: le mani scendono e si incrociano davanti alla pancia. Lavora il petto basso.',
  ancora: [116, 14],
  a: { ...IN_PIEDI_FRONTE, mano: [92, 26], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [61, 58], gomito: -1 },
})

M('croci-cavi-bassi', {
  ...MOVIMENTI['croci-cavi'],
  id: 'croci-cavi-bassi',
  tecnica: 'Cavi bassi: le mani salgono davanti fino all altezza delle spalle. Lavora il petto alto.',
  ancora: [116, 88],
  a: { ...IN_PIEDI_FRONTE, mano: [88, 52], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [62, 34], gomito: -1 },
})

M('croci-panca', {
  tecnica: 'Braccia quasi tese che si aprono a semicerchio: senti tirare il petto, non la spalla.',
  scena: 'panca',
  attrezzo: 'manubrio',
  a: { ...SUPINO, mano: [30, 60], gomito: 1 },
  b: { ...SUPINO, mano: [36, 46], gomito: 1 },
})

M('croci-panca-inclinata', {
  ...MOVIMENTI['croci-panca'],
  id: 'croci-panca-inclinata',
  scena: 'panca-inclinata',
  a: { ...SUPINO_INCL, mano: [36, 48], gomito: 1 },
  b: { ...SUPINO_INCL, mano: [45, 34], gomito: 1 },
})

M('pec-deck', {
  tecnica: 'Avambracci sui cuscinetti: chiudi con il petto, le mani non spingono.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'nessuno',
  a: { ...IN_PIEDI_FRONTE, braccio: 5, avambraccio: 88, mano: null },
  b: { ...IN_PIEDI_FRONTE, braccio: -100, avambraccio: 70, mano: null },
})

M('dips', {
  tecnica: 'Busto leggermente in avanti, scendi finche le spalle stanno sotto i gomiti.',
  scena: 'parallele',
  attrezzo: 'nessuno',
  a: { bacino: [58, 71], tronco: 100, mano: [52, 60], gomito: 1, coscia: -70, tibia: -25 },
  b: { bacino: [58, 57], tronco: 100, mano: [52, 60], gomito: 1, coscia: -70, tibia: -25 },
})

M('push-up', {
  tecnica: 'Corpo dritto dalla testa ai talloni: scendi col petto, non col bacino.',
  scena: 'terra',
  attrezzo: 'nessuno',
  a: { bacino: [56, 83], tronco: 163, mano: [33, 100], gomito: 1, coscia: -27, tibia: -27, piede: -10 },
  b: { bacino: [56, 83], tronco: 153, mano: [33, 100], gomito: 1, coscia: -27, tibia: -27, piede: -10 },
})

M('pullover', {
  tecnica: 'Il manubrio va dietro la testa a braccia quasi tese, poi torna sopra il petto.',
  scena: 'panca',
  attrezzo: 'manubrio',
  a: { ...SUPINO, mano: [14, 70], gomito: 1 },
  b: { ...SUPINO, mano: [34, 48], gomito: 1 },
})

// ============================================================ SCHIENA

const APPESO = { tronco: 90, coscia: -100, tibia: -12, piede: -20 }

M('trazioni', {
  tecnica: 'Parti a braccia distese: tira i gomiti verso il basso, il petto sale alla sbarra.',
  scena: 'sbarra-alta',
  attrezzo: 'nessuno',
  durata: 3,
  a: { ...APPESO, bacino: [52, 73], mano: [52, 18], gomito: 1 },
  b: { ...APPESO, bacino: [52, 61], mano: [52, 18], gomito: 1 },
})

M('lat-machine', {
  tecnica: 'Petto in fuori: la barra scende davanti fino alle clavicole, i gomiti puntano al pavimento.',
  scena: 'lat-machine',
  attrezzo: 'cavo',
  ancora: [52, 10],
  a: { ...SEDUTO, mano: [52, 26], gomito: 1 },
  b: { ...SEDUTO, mano: [56, 52], gomito: 1 },
})

M('pulley-basso', {
  tecnica: 'Busto fermo: tira le maniglie alla pancia stringendo le scapole, poi torna piano.',
  scena: 'pulley',
  attrezzo: 'cavo',
  ancora: [110, 76],
  a: {
    bacino: [42, 80],
    tronco: 95,
    mano: [66, 62],
    gomito: 1,
    coscia: -8,
    tibia: -8,
    piede: 70,
  },
  b: {
    bacino: [42, 80],
    tronco: 100,
    mano: [46, 64],
    gomito: 1,
    coscia: -8,
    tibia: -8,
    piede: 70,
  },
})

const PIEGATO = { tronco: 25, coscia: -100, tibia: -85, piede: 0 }

M('rematore-bilanciere', {
  tecnica: 'Busto quasi parallelo a terra e schiena piatta: il bilanciere sale all ombelico.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { ...PIEGATO, bacino: [58, 62], mano: [86, 80], gomito: 1 },
  b: { ...PIEGATO, bacino: [58, 62], mano: [80, 64], gomito: 1 },
})

M('rematore-manubrio', {
  tecnica: 'Una mano e un ginocchio sulla panca: il manubrio sale lungo il fianco.',
  scena: 'panca-bassa',
  attrezzo: 'manubrio',
  a: {
    ...PIEGATO,
    bacino: [58, 62],
    mano: [85, 79],
    gomito: 1,
    braccio2: -40,
    avambraccio2: -90,
  },
  b: {
    ...PIEGATO,
    bacino: [58, 62],
    mano: [82, 64],
    gomito: 1,
    braccio2: -40,
    avambraccio2: -90,
  },
})

M('rematore-macchina', {
  tecnica: 'Petto appoggiato al cuscino: tira i gomiti indietro senza staccare il busto.',
  scena: 'macchina-petto',
  attrezzo: 'maniglia',
  a: { ...SEDUTO, tronco: 80, mano: [76, 58], gomito: 1 },
  b: { ...SEDUTO, tronco: 80, mano: [50, 60], gomito: 1 },
})

M('stacco', {
  tecnica: 'Bilanciere vicino alle gambe: spingi con i piedi e alzati, la schiena non si arrotonda.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  durata: 3,
  a: { bacino: [50, 76], tronco: 30, mano: [62, 90], caviglia: [58, 96], piede: 0 },
  b: { bacino: [52, 62], tronco: 88, mano: [58, 64], caviglia: [58, 96], piede: 0 },
})

M('stacco-rumeno', {
  tecnica: 'Gambe quasi tese: manda il bacino indietro e senti tirare dietro la coscia.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  durata: 3,
  a: { bacino: [52, 62], tronco: 88, mano: [58, 64], caviglia: [58, 96], piede: 0 },
  b: { bacino: [44, 64], tronco: 25, mano: [62, 82], caviglia: [56, 98], piede: 0 },
})

M('hyperextension', {
  tecnica: 'Bacino fermo sul cuscino: scendi col busto e risali fino alla linea del corpo.',
  scena: 'panca-45',
  attrezzo: 'nessuno',
  a: { bacino: [56, 66], tronco: 20, mano: [64, 52], gomito: -1, coscia: -160, tibia: -140, piede: -90 },
  b: { bacino: [56, 66], tronco: 68, mano: [50, 46], gomito: -1, coscia: -160, tibia: -140, piede: -90 },
})

M('face-pull', {
  tecnica: 'La corda arriva alla fronte con i gomiti alti: lavora la spalla dietro, non le braccia.',
  vista: 'fronte',
  scena: 'cavo-alto-fronte',
  attrezzo: 'cavo',
  ancora: [60, 12],
  a: { ...IN_PIEDI_FRONTE, mano: [74, 24], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [92, 26], gomito: -1 },
})

M('pullover-cavi', {
  tecnica: 'Braccia tese: spingi il cavo verso le cosce con un arco, il busto non si muove.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [104, 12],
  a: { ...IN_PIEDI, tronco: 80, mano: [86, 30], gomito: -1 },
  b: { ...IN_PIEDI, tronco: 80, mano: [64, 64], gomito: -1 },
})

// ============================================================ GAMBE

M('squat', {
  tecnica: 'Bilanciere sulle spalle: scendi come per sederti, ginocchia in linea coi piedi.',
  scena: 'rack',
  attrezzo: 'bilanciere',
  attrezzoSu: 'spalla',
  durata: 3,
  a: { bacino: [56, 62], tronco: 88, mano: [46, 34], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [50, 80], tronco: 70, mano: [42, 54], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('squat-frontale', {
  ...MOVIMENTI['squat'],
  id: 'squat-frontale',
  tecnica: 'Bilanciere davanti sulle spalle e gomiti alti: il busto resta piu dritto.',
  attrezzoOffset: [7, -2],
  a: { bacino: [56, 62], tronco: 88, mano: [66, 40], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [52, 80], tronco: 78, mano: [64, 58], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('leg-press', {
  tecnica: 'Schiena aderente allo schienale: spingi con tutta la pianta, non stendere di scatto.',
  scena: 'leg-press',
  attrezzo: 'piastra',
  attrezzoSu: 'caviglia',
  a: { bacino: [46, 78], tronco: 192, mano: [40, 92], gomito: -1, caviglia: [66, 52], ginocchio: -1 },
  b: { bacino: [46, 78], tronco: 192, mano: [40, 92], gomito: -1, caviglia: [82, 40], ginocchio: -1 },
})

M('affondi', {
  tecnica: 'Passo lungo: scendi in verticale finche il ginocchio dietro sfiora terra.',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 3,
  a: {
    bacino: [52, 64],
    tronco: 88,
    mano: [54, 68],
    caviglia: [68, 97],
    caviglia2: [40, 97],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
  b: {
    bacino: [52, 78],
    tronco: 88,
    mano: [54, 82],
    caviglia: [68, 97],
    caviglia2: [40, 97],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
})

M('bulgari', {
  tecnica: 'Piede dietro sulla panca: quasi tutto il peso sta sulla gamba davanti.',
  scena: 'panca-bassa',
  attrezzo: 'manubrio',
  durata: 3,
  a: {
    bacino: [54, 64],
    tronco: 85,
    mano: [56, 68],
    caviglia: [66, 97],
    caviglia2: [34, 84],
    ginocchio2: -1,
    piede: 0,
    piede2: -60,
  },
  b: {
    bacino: [54, 78],
    tronco: 82,
    mano: [56, 82],
    caviglia: [66, 97],
    caviglia2: [34, 84],
    ginocchio2: -1,
    piede: 0,
    piede2: -60,
  },
})

M('goblet', {
  tecnica: 'Manubrio al petto come un calice: ti tiene il busto dritto mentre scendi.',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 3,
  a: { bacino: [56, 62], tronco: 88, mano: [62, 44], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [52, 80], tronco: 76, mano: [62, 60], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('leg-extension', {
  tecnica: 'Solo la tibia si muove: stendi fino a bloccare il ginocchio e trattieni un istante.',
  scena: 'macchina-gambe',
  attrezzo: 'rullo',
  attrezzoSu: 'caviglia',
  a: { ...SEDUTO, mano: [36, 84], gomito: -1 },
  b: { ...SEDUTO, tibia: -20, mano: [36, 84], gomito: -1 },
})

M('leg-curl-sdraiato', {
  tecnica: 'A pancia in giu, bacino fermo: porta i talloni verso il sedere.',
  scena: 'panca',
  attrezzo: 'rullo',
  attrezzoSu: 'caviglia',
  a: { bacino: [46, 74], tronco: 8, mano: [76, 82], gomito: -1, coscia: 180, tibia: 180, piede: 150 },
  b: { bacino: [46, 74], tronco: 8, mano: [76, 82], gomito: -1, coscia: 180, tibia: 105, piede: 80 },
})

M('leg-curl-seduto', {
  tecnica: 'Seduto, cuscinetto sopra le cosce: spingi i talloni sotto la seduta.',
  scena: 'macchina-gambe',
  attrezzo: 'rullo',
  attrezzoSu: 'caviglia',
  a: { ...SEDUTO, tibia: -30, mano: [36, 84], gomito: -1 },
  b: { ...SEDUTO, tibia: -100, mano: [36, 84], gomito: -1 },
})

M('calf-piedi', {
  tecnica: 'In punta di piedi il piu in alto possibile, poi scendi lento sotto il livello del gradino.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2,
  a: { bacino: [56, 64], tronco: 88, mano: [58, 68], coscia: -92, tibia: -88, piede: 0 },
  b: { bacino: [56, 58], tronco: 88, mano: [58, 62], coscia: -92, tibia: -88, piede: -35 },
})

M('calf-seduto', {
  tecnica: 'Ginocchia piegate a 90: sali sulle punte con un cuscinetto sulle cosce.',
  scena: 'macchina-gambe',
  attrezzo: 'nessuno',
  durata: 2,
  a: { ...SEDUTO, piede: 0, mano: [36, 84], gomito: -1 },
  b: { ...SEDUTO, tibia: -80, piede: -40, mano: [36, 84], gomito: -1 },
})

M('adduttori', {
  tecnica: 'Seduto: chiudi le ginocchia contro i cuscinetti, poi lascia riaprire piano.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'nessuno',
  a: { ...IN_PIEDI_FRONTE, caviglia: [76, 97], piede: 20 },
  b: { ...IN_PIEDI_FRONTE, caviglia: [61, 97], piede: 8 },
})

M('abduttori', {
  ...MOVIMENTI['adduttori'],
  id: 'abduttori',
  tecnica: 'Al contrario degli adduttori: spingi le ginocchia in fuori contro la resistenza.',
  a: { ...IN_PIEDI_FRONTE, caviglia: [61, 97], piede: 8 },
  b: { ...IN_PIEDI_FRONTE, caviglia: [76, 97], piede: 20 },
})

M('step-up', {
  tecnica: 'Sali spingendo col tallone della gamba sopra il rialzo, senza rimbalzare con quella sotto.',
  scena: 'gradino',
  attrezzo: 'manubrio',
  durata: 3,
  a: {
    bacino: [50, 66],
    tronco: 85,
    mano: [52, 70],
    caviglia: [70, 82],
    caviglia2: [44, 97],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
  b: {
    bacino: [62, 50],
    tronco: 88,
    mano: [64, 54],
    caviglia: [70, 82],
    caviglia2: [52, 88],
    ginocchio2: -1,
    piede: 0,
    piede2: -20,
  },
})

// ============================================================ SPALLE

M('lento-avanti', {
  tecnica: 'Dalle spalle sopra la testa: alla fine le braccia sono in linea con le orecchie.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'bilanciere',
  attrezzoSu: 'mani',
  a: { ...IN_PIEDI_FRONTE, mano: [76, 38], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [68, 8], gomito: -1 },
})

M('lento-manubri', {
  ...MOVIMENTI['lento-avanti'],
  id: 'lento-manubri',
  tecnica: 'Manubri all altezza delle orecchie: spingi in alto e leggermente verso il centro.',
  attrezzo: 'manubrio',
  attrezzoSu: 'polso',
  a: { ...IN_PIEDI_FRONTE, mano: [80, 36], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [70, 8], gomito: -1 },
})

M('alzate-laterali', {
  tecnica: 'Braccia quasi tese: sali fino alla linea delle spalle, non oltre. Guida col gomito.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...IN_PIEDI_FRONTE, mano: [68, 66], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [94, 36], gomito: -1 },
})

M('alzate-frontali', {
  tecnica: 'Alza davanti fino all altezza degli occhi, senza dondolare col busto.',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [58, 66] },
  b: { ...IN_PIEDI, mano: [84, 34] },
})

M('alzate-posteriori', {
  tecnica: 'Busto piegato in avanti: apri le braccia di lato stringendo le scapole.',
  scena: 'terra',
  attrezzo: 'manubrio',
  a: { ...PIEGATO, bacino: [58, 62], mano: [86, 80], gomito: -1 },
  b: { ...PIEGATO, bacino: [58, 62], mano: [69, 25], gomito: -1 },
})

M('tirate-mento', {
  tecnica: 'Il bilanciere sale lungo la pancia fino al petto, i gomiti restano sopra le mani.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'bilanciere',
  attrezzoSu: 'mani',
  a: { ...IN_PIEDI_FRONTE, mano: [62, 70], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [64, 40], gomito: -1 },
})

M('scrollate', {
  tecnica: 'Solo le spalle salgono verso le orecchie: le braccia restano tese, niente rotazioni.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 1.8,
  a: { ...IN_PIEDI_FRONTE, bacino: [56, 62], mano: [70, 68], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, bacino: [56, 57], mano: [70, 63], gomito: -1 },
})

// ============================================================ BICIPITI

M('curl-bilanciere', {
  tecnica: 'Gomiti attaccati ai fianchi: sale solo l avambraccio, il busto non si muove.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [60, 66], gomito: -1 },
  b: { ...IN_PIEDI, mano: [64, 40], gomito: -1 },
})

M('curl-manubri', {
  ...MOVIMENTI['curl-bilanciere'],
  id: 'curl-manubri',
  tecnica: 'Un braccio per volta: sali ruotando il palmo verso l alto, scendi lento.',
  attrezzo: 'manubrio',
  a: { ...IN_PIEDI, mano: [60, 66], gomito: -1, braccio2: -88, avambraccio2: -88 },
  b: { ...IN_PIEDI, mano: [64, 40], gomito: -1, braccio2: -88, avambraccio2: -88 },
})

M('curl-martello', {
  ...MOVIMENTI['curl-bilanciere'],
  id: 'curl-martello',
  tecnica: 'Palmi che si guardano per tutta la salita: lavora anche l avambraccio.',
  attrezzo: 'manubrio',
})

M('curl-scott', {
  tecnica: 'Ascelle sul leggio: le braccia non si staccano mai dal cuscino.',
  scena: 'panca-scott',
  attrezzo: 'bilanciere',
  durata: 2.4,
  a: { ...SEDUTO, tronco: 70, mano: [76, 62], gomito: -1 },
  b: { ...SEDUTO, tronco: 70, mano: [60, 42], gomito: -1 },
})

M('curl-concentrato', {
  tecnica: 'Seduto, gomito appoggiato all interno coscia: sale solo la mano.',
  scena: 'panca-bassa',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...SEDUTO, tronco: 60, mano: [64, 86], gomito: -1, braccio2: -50, avambraccio2: -10 },
  b: { ...SEDUTO, tronco: 60, mano: [58, 62], gomito: -1, braccio2: -50, avambraccio2: -10 },
})

M('curl-cavi', {
  tecnica: 'Il cavo tiene la tensione anche in basso: non lasciar cadere il peso.',
  scena: 'cavo-basso',
  attrezzo: 'cavo',
  ancora: [104, 92],
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [62, 68], gomito: -1 },
  b: { ...IN_PIEDI, mano: [66, 42], gomito: -1 },
})

M('curl-inclinata', {
  tecnica: 'Su panca inclinata le braccia restano dietro il corpo: il bicipite parte gia allungato.',
  scena: 'panca-inclinata',
  attrezzo: 'manubrio',
  durata: 2.6,
  a: { ...SUPINO_INCL, mano: [30, 84], gomito: -1 },
  b: { ...SUPINO_INCL, mano: [40, 56], gomito: -1 },
})

// ============================================================ TRICIPITI

M('push-down', {
  tecnica: 'Gomiti fermi al fianco: stendi in basso fino a braccia dritte, poi risali piano.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [98, 10],
  durata: 2.4,
  a: { ...IN_PIEDI, tronco: 85, mano: [64, 46], gomito: -1 },
  b: { ...IN_PIEDI, tronco: 85, mano: [64, 63], gomito: -1 },
})

M('french-press', {
  tecnica: 'Gomiti stretti e fermi: solo gli avambracci scendono dietro la testa.',
  scena: 'panca',
  attrezzo: 'bilanciere',
  durata: 2.4,
  a: { ...SUPINO, mano: [22, 62], gomito: 1 },
  b: { ...SUPINO, mano: [34, 46], gomito: 1 },
})

M('estensioni-testa', {
  tecnica: 'Braccia in alto, gomiti che puntano avanti: stendi tutto sopra la testa.',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [44, 34], gomito: -1 },
  b: { ...IN_PIEDI, mano: [58, 12], gomito: -1 },
})

M('dips-panca', {
  tecnica: 'Mani sulla panca dietro di te: scendi col bacino vicino alla panca.',
  scena: 'panca-dietro',
  attrezzo: 'nessuno',
  a: { bacino: [56, 92], tronco: 100, mano: [34, 80], gomito: 1, caviglia: [90, 98], piede: 60 },
  b: { bacino: [56, 84], tronco: 100, mano: [34, 80], gomito: 1, caviglia: [90, 98], piede: 60 },
})

M('kickback', {
  tecnica: 'Busto piegato e braccio fermo lungo il fianco: stendi indietro solo l avambraccio.',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...PIEGATO, bacino: [58, 62], mano: [78, 66], gomito: -1 },
  b: { ...PIEGATO, bacino: [58, 62], mano: [60, 56], gomito: -1 },
})

M('panca-stretta', {
  ...MOVIMENTI['panca-piana'],
  id: 'panca-stretta',
  tecnica: 'Mani larghe quanto le spalle e gomiti stretti al corpo: spinge il tricipite.',
  a: { ...SUPINO, mano: [36, 68], gomito: 1 },
  b: { ...SUPINO, mano: [35, 45], gomito: 1 },
})

// ============================================================ ADDOME

const A_TERRA = { bacino: [56, 88], tronco: 180, coscia: -20, tibia: -70, piede: 0 }

M('crunch', {
  tecnica: 'Stacca solo le spalle da terra arrotolando la pancia: la schiena bassa resta giu.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.2,
  a: { ...A_TERRA, tronco: 180, mano: [40, 78], gomito: -1 },
  b: { ...A_TERRA, tronco: 150, mano: [46, 62], gomito: -1 },
})

M('crunch-inverso', {
  tecnica: 'Spalle a terra: sono le ginocchia a salire verso il petto arrotolando il bacino.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.2,
  a: { ...A_TERRA, mano: [30, 92], gomito: -1 },
  b: { ...A_TERRA, coscia: 20, tibia: -30, mano: [30, 92], gomito: -1 },
})

M('crunch-cavi', {
  tecnica: 'In ginocchio sotto la carrucola: chiudi le costole verso il bacino, non tirare con le braccia.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [96, 10],
  durata: 2.4,
  a: { bacino: [52, 84], tronco: 80, mano: [60, 46], gomito: -1, coscia: -140, tibia: 175, piede: 130 },
  b: { bacino: [52, 84], tronco: 40, mano: [76, 60], gomito: -1, coscia: -140, tibia: 175, piede: 130 },
})

M('plank', {
  tecnica: 'Gomiti sotto le spalle, corpo in linea: si tiene la posizione, non si sale.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [56, 84], tronco: 155, mano: [31, 97], gomito: 1, coscia: -25, tibia: -25, piede: -10 },
  b: { bacino: [56, 81], tronco: 152, mano: [31, 97], gomito: 1, coscia: -22, tibia: -22, piede: -10 },
})

M('plank-laterale', {
  tecnica: 'Su un gomito e sul fianco del piede: il bacino non deve cedere verso il basso.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [56, 82], tronco: 158, mano: [32, 96], gomito: 1, coscia: -22, tibia: -22, piede: -10, braccio2: 90, avambraccio2: 90 },
  b: { bacino: [56, 79], tronco: 155, mano: [32, 96], gomito: 1, coscia: -19, tibia: -19, piede: -10, braccio2: 90, avambraccio2: 90 },
})

M('russian-twist', {
  tecnica: 'Seduto in equilibrio: ruota il busto portando le mani da un fianco all altro.',
  scena: 'terra',
  attrezzo: 'palla',
  durata: 2.2,
  a: { bacino: [50, 86], tronco: 60, mano: [72, 62], gomito: -1, coscia: -25, tibia: -110, piede: -20 },
  b: { bacino: [50, 86], tronco: 60, mano: [40, 66], gomito: -1, coscia: -25, tibia: -110, piede: -20 },
})

M('sit-up', {
  tecnica: 'Sali con tutto il busto fino a sederti, poi scendi controllando la discesa.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.6,
  a: { ...A_TERRA, coscia: -30, tibia: -110, mano: [40, 80], gomito: -1 },
  b: { bacino: [56, 88], tronco: 75, coscia: -30, tibia: -110, mano: [66, 76], gomito: -1 },
})

M('leg-raise', {
  tecnica: 'Schiena a terra: le gambe tese salgono fino alla verticale e scendono senza toccare.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.6,
  a: { ...A_TERRA, coscia: -2, tibia: -2, mano: [30, 92], gomito: -1 },
  b: { ...A_TERRA, coscia: 80, tibia: 85, mano: [30, 92], gomito: -1 },
})

M('leg-raise-sbarra', {
  tecnica: 'Appeso alla sbarra: alza le gambe senza dondolare, il bacino si arrotola in alto.',
  scena: 'sbarra-alta',
  attrezzo: 'nessuno',
  durata: 3,
  a: { bacino: [52, 73], tronco: 90, mano: [52, 18], gomito: 1, coscia: -90, tibia: -90, piede: -20 },
  b: { bacino: [52, 73], tronco: 90, mano: [52, 18], gomito: 1, coscia: 0, tibia: 0, piede: -60 },
})

M('mountain-climber', {
  tecnica: 'In posizione di plank porta un ginocchio al petto e cambia, veloce ma controllato.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.4,
  a: {
    bacino: [56, 83],
    tronco: 153,
    mano: [33, 100],
    gomito: 1,
    coscia: -27,
    tibia: -27,
    piede: -10,
    coscia2: 175,
    tibia2: -80,
    piede2: -10,
  },
  b: {
    bacino: [56, 83],
    tronco: 153,
    mano: [33, 100],
    gomito: 1,
    coscia2: -27,
    tibia2: -27,
    piede2: -10,
    coscia: 175,
    tibia: -80,
    piede: -10,
  },
})

M('ab-wheel', {
  tecnica: 'In ginocchio: rotola in avanti tenendo la pancia tirata, la schiena non si inarca.',
  scena: 'terra',
  attrezzo: 'ruota',
  durata: 3,
  a: { bacino: [52, 84], tronco: 72, mano: [62, 86], gomito: -1, coscia: -140, tibia: 175, piede: 130 },
  b: { bacino: [52, 84], tronco: 152, mano: [14, 94], gomito: 1, coscia: -140, tibia: 175, piede: 130 },
})

M('hollow', {
  tecnica: 'Schiena bassa incollata a terra: spalle e gambe sollevate, si tiene la posizione.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [56, 88], tronco: 168, coscia: 12, tibia: 12, mano: [24, 74], gomito: -1, piede: -30 },
  b: { bacino: [56, 88], tronco: 164, coscia: 16, tibia: 16, mano: [24, 71], gomito: -1, piede: -30 },
})

M('v-up', {
  tecnica: 'Gambe e busto salgono insieme a formare una V: le mani vanno verso i piedi.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.4,
  a: { ...A_TERRA, coscia: -2, tibia: -2, tronco: 178, mano: [20, 78], gomito: -1 },
  b: { bacino: [56, 88], tronco: 130, coscia: 45, tibia: 45, mano: [70, 60], gomito: -1, piede: -20 },
})

// ============================================================ CARDIO

const CORSA_A = {
  bacino: [56, 60],
  tronco: 82,
  mano: [70, 52],
  gomito: -1,
  braccio2: -140,
  avambraccio2: -60,
  coscia: -50,
  tibia: -95,
  piede: -10,
  coscia2: -130,
  tibia2: -60,
  piede2: 20,
}
const CORSA_B = {
  bacino: [56, 60],
  tronco: 82,
  mano: [44, 60],
  gomito: -1,
  braccio2: -30,
  avambraccio2: 20,
  coscia: -120,
  tibia: -70,
  piede: 10,
  coscia2: -55,
  tibia2: -100,
  piede2: -10,
}

M('corsa', {
  tecnica: 'Passo sotto il bacino e spalle rilassate: il tapis roulant scorre, tu resti al centro.',
  scena: 'tapis',
  attrezzo: 'nessuno',
  durata: 1,
  a: CORSA_A,
  b: CORSA_B,
})

M('camminata', {
  tecnica: 'In salita e senza tenersi alle maniglie: il lavoro sta tutto nelle gambe.',
  scena: 'tapis-salita',
  attrezzo: 'nessuno',
  durata: 1.8,
  a: {
    ...CORSA_A,
    tronco: 78,
    coscia: -60,
    tibia: -80,
    coscia2: -115,
    tibia2: -95,
    mano: [68, 58],
    braccio2: -120,
    avambraccio2: -80,
  },
  b: {
    ...CORSA_B,
    tronco: 78,
    coscia: -115,
    tibia: -95,
    coscia2: -60,
    tibia2: -80,
    mano: [48, 62],
    braccio2: -60,
    avambraccio2: -30,
  },
})

M('cyclette', {
  tecnica: 'Sella all altezza dell anca: la gamba resta appena piegata quando il pedale e in basso.',
  scena: 'cyclette',
  attrezzo: 'nessuno',
  durata: 1.2,
  a: {
    bacino: [44, 66],
    tronco: 70,
    mano: [76, 58],
    gomito: -1,
    caviglia: [72, 74],
    ginocchio: -1,
    caviglia2: [66, 92],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
  b: {
    bacino: [44, 66],
    tronco: 70,
    mano: [76, 58],
    gomito: -1,
    caviglia: [66, 92],
    ginocchio: -1,
    caviglia2: [72, 74],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
})

M('ellittica', {
  tecnica: 'I piedi non lasciano mai le pedane: spingi e tira anche con le braccia.',
  scena: 'ellittica',
  attrezzo: 'nessuno',
  durata: 1.6,
  a: {
    bacino: [54, 62],
    tronco: 86,
    mano: [76, 46],
    gomito: -1,
    braccio2: -150,
    avambraccio2: -150,
    caviglia: [76, 88],
    ginocchio: -1,
    caviglia2: [40, 96],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
  b: {
    bacino: [54, 62],
    tronco: 86,
    mano: [40, 56],
    gomito: -1,
    braccio2: -20,
    avambraccio2: -10,
    caviglia: [40, 96],
    ginocchio: -1,
    caviglia2: [76, 88],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
})

M('vogatore', {
  tecnica: 'Prima spingono le gambe, poi si apre il busto, per ultime tirano le braccia.',
  scena: 'vogatore',
  attrezzo: 'cavo',
  ancora: [108, 74],
  durata: 2.4,
  a: {
    bacino: [40, 78],
    tronco: 70,
    mano: [78, 70],
    gomito: -1,
    caviglia: [70, 84],
    ginocchio: -1,
    piede: 60,
  },
  b: {
    bacino: [58, 78],
    tronco: 110,
    mano: [58, 74],
    gomito: 1,
    caviglia: [70, 84],
    ginocchio: -1,
    piede: 60,
  },
})

M('corda', {
  tecnica: 'Piccoli saltelli sull avampiede: girano i polsi, non le braccia.',
  scena: 'terra',
  attrezzo: 'corda',
  durata: 0.9,
  a: { ...IN_PIEDI, bacino: [56, 62], mano: [70, 60], gomito: -1, caviglia: [57, 96], piede: -10 },
  b: { ...IN_PIEDI, bacino: [56, 54], mano: [70, 52], gomito: -1, caviglia: [57, 90], piede: -30 },
})

M('scalatore', {
  tecnica: 'Gradino dopo gradino, busto dritto: appoggia tutto il piede e non appenderti alle maniglie.',
  scena: 'scala',
  attrezzo: 'nessuno',
  durata: 1.6,
  a: {
    bacino: [50, 62],
    tronco: 86,
    mano: [72, 54],
    gomito: -1,
    caviglia: [62, 78],
    ginocchio: -1,
    caviglia2: [46, 96],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
  b: {
    bacino: [50, 62],
    tronco: 86,
    mano: [72, 54],
    gomito: -1,
    caviglia: [46, 96],
    ginocchio: -1,
    caviglia2: [62, 78],
    ginocchio2: -1,
    piede: 0,
    piede2: 0,
  },
})

// ------------------------------------------------- esercizio -> movimento

// Chiave = il nome ESATTO come sta in lib/eserciziLibreria (cosi' si rilegge
// e si corregge senza dover indovinare lo slug), valore = id del movimento.
const PER_NOME = {
  // petto
  'Panca piana bilanciere': 'panca-piana',
  'Panca piana manubri': 'panca-manubri',
  'Panca inclinata bilanciere': 'panca-inclinata',
  'Panca inclinata manubri': 'panca-inclinata-manubri',
  'Panca declinata bilanciere': 'panca-declinata',
  'Chest press macchina': 'chest-press',
  'Croci ai cavi': 'croci-cavi',
  'Croci ai cavi alti': 'croci-cavi-alti',
  'Croci ai cavi bassi': 'croci-cavi-bassi',
  'Croci su panca piana manubri': 'croci-panca',
  'Croci su panca inclinata manubri': 'croci-panca-inclinata',
  'Pectoral machine (pec deck)': 'pec-deck',
  'Spinte al multipower (Smith)': 'panca-piana',
  'Dips alle parallele (petto)': 'dips',
  'Piegamenti (push-up)': 'push-up',
  'Pullover con manubrio': 'pullover',
  // schiena
  'Trazioni presa prona': 'trazioni',
  'Trazioni presa supina (chin-up)': 'trazioni',
  'Trazioni presa neutra': 'trazioni',
  'Lat machine avanti': 'lat-machine',
  'Lat machine presa inversa': 'lat-machine',
  'Lat machine presa stretta': 'lat-machine',
  'Pulley basso (rematore al cavo)': 'pulley-basso',
  'Rematore bilanciere': 'rematore-bilanciere',
  'Rematore manubrio singolo': 'rematore-manubrio',
  'Rematore Pendlay': 'rematore-bilanciere',
  'Rematore T-bar': 'rematore-bilanciere',
  'Rematore alla macchina': 'rematore-macchina',
  'Pullover ai cavi': 'pullover-cavi',
  'Stacco da terra': 'stacco',
  'Stacco rumeno': 'stacco-rumeno',
  'Hyperextension (lombari)': 'hyperextension',
  // gambe
  'Squat bilanciere': 'squat',
  'Squat frontale': 'squat-frontale',
  'Hack squat': 'squat',
  'Leg press': 'leg-press',
  'Pressa 45°': 'leg-press',
  'Affondi con manubri': 'affondi',
  'Affondi bulgari (split squat)': 'bulgari',
  'Goblet squat': 'goblet',
  'Leg extension': 'leg-extension',
  'Leg curl sdraiato': 'leg-curl-sdraiato',
  'Leg curl seduto': 'leg-curl-seduto',
  'Stacco gambe tese': 'stacco-rumeno',
  'Calf raise in piedi': 'calf-piedi',
  'Calf raise seduto': 'calf-seduto',
  'Adductor machine': 'adduttori',
  'Abductor machine': 'abduttori',
  'Step up': 'step-up',
  'Stacco sumo': 'stacco',
  // spalle
  'Lento avanti bilanciere (military)': 'lento-avanti',
  'Lento avanti manubri': 'lento-manubri',
  'Arnold press': 'lento-manubri',
  'Shoulder press macchina': 'lento-manubri',
  'Alzate laterali manubri': 'alzate-laterali',
  'Alzate laterali ai cavi': 'alzate-laterali',
  'Alzate frontali manubri': 'alzate-frontali',
  'Alzate posteriori (rear delt)': 'alzate-posteriori',
  'Reverse pec deck (rear delt machine)': 'alzate-posteriori',
  'Tirate al mento (upright row)': 'tirate-mento',
  'Face pull': 'face-pull',
  'Scrollate bilanciere (shrug)': 'scrollate',
  'Scrollate manubri': 'scrollate',
  // bicipiti
  'Curl bilanciere': 'curl-bilanciere',
  'Curl bilanciere EZ': 'curl-bilanciere',
  'Curl manubri alternato': 'curl-manubri',
  'Curl manubri simultaneo': 'curl-martello',
  'Curl a martello (hammer)': 'curl-martello',
  'Curl concentrato': 'curl-concentrato',
  'Curl panca Scott (preacher)': 'curl-scott',
  'Curl ai cavi': 'curl-cavi',
  'Curl panca inclinata': 'curl-inclinata',
  'Curl Spider': 'curl-scott',
  'Curl inverso (reverse)': 'curl-bilanciere',
  // tricipiti
  'Push down ai cavi (corda)': 'push-down',
  'Push down ai cavi (barra)': 'push-down',
  'Push down presa inversa': 'push-down',
  'French press bilanciere EZ': 'french-press',
  'French press manubri': 'french-press',
  'Estensioni sopra la testa ai cavi': 'estensioni-testa',
  'Estensione manubrio singolo dietro la testa': 'estensioni-testa',
  'Dips alle parallele': 'dips',
  'Dips tra due panche': 'dips-panca',
  'Panca piana presa stretta': 'panca-stretta',
  'Kickback manubri': 'kickback',
  'Kickback ai cavi': 'kickback',
  // addome
  'Crunch a terra': 'crunch',
  'Crunch inverso': 'crunch-inverso',
  'Crunch ai cavi': 'crunch-cavi',
  Plank: 'plank',
  'Plank laterale': 'plank-laterale',
  'Russian twist': 'russian-twist',
  'Sit-up': 'sit-up',
  'Leg raise a terra': 'leg-raise',
  'Leg raise alla sbarra': 'leg-raise-sbarra',
  'Bicycle crunch': 'mountain-climber',
  'Mountain climber': 'mountain-climber',
  'Ab wheel (ruota)': 'ab-wheel',
  'Hollow hold': 'hollow',
  'V-up': 'v-up',
  // cardio
  'Tapis roulant (corsa)': 'corsa',
  'Camminata in salita': 'camminata',
  Cyclette: 'cyclette',
  Ellittica: 'ellittica',
  'Vogatore (rowing)': 'vogatore',
  'Corda per saltare': 'corda',
  'Stair climber (scalatore)': 'scalatore',
  'HIIT sprint': 'corsa',
  'Bici da spinning': 'cyclette',
}

// Indice per slug, cosi' il lookup regge anche i nomi scritti a mano dal PT.
const PER_SLUG = {}
for (const [nome, id] of Object.entries(PER_NOME)) PER_SLUG[slugEsercizio(nome)] = id

// Movimento di riserva per gruppo: se un esercizio non e' in elenco, mostriamo
// almeno un gesto della famiglia giusta.
const RISERVA = {
  petto: 'panca-piana',
  schiena: 'rematore-bilanciere',
  gambe: 'squat',
  spalle: 'lento-manubri',
  bicipiti: 'curl-bilanciere',
  tricipiti: 'push-down',
  addome: 'crunch',
  cardio: 'corsa',
}

/**
 * Il movimento da animare per un esercizio.
 * @param {string} nome    nome dell esercizio
 * @param {string} [gruppo] gruppo muscolare, per la riserva
 * @returns {object|null}
 */
export function movimentoDi(nome, gruppo) {
  const id = PER_SLUG[slugEsercizio(nome)]
  if (id && MOVIMENTI[id]) return MOVIMENTI[id]
  const rip = RISERVA[gruppo]
  return rip ? MOVIMENTI[rip] : null
}

/** Vero se l esercizio ha un movimento suo (non quello di riserva del gruppo). */
export function haMovimentoProprio(nome) {
  return !!PER_SLUG[slugEsercizio(nome)]
}
