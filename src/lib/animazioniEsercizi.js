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
// questo i circa 240 esercizi della libreria si appoggiano a una settantina di
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

// ================================================= AGGIUNTI (2026-10-14)
//
// Movimenti per gli esercizi che prima prendevano quello di un altro gesto o
// la riserva del gruppo: hip thrust e ponti, i quadrupedi, gli esercizi a
// terra dell'addome, il cardio a corpo libero e le varianti che si muovono in
// modo diverso (stacco sumo, rack pull, rematore inverso...). La tecnica
// scritta qui e' quella del MOVIMENTO; quella di ogni esercizio sta in
// lib/descrizioniEsercizi.

// --- petto

M('floor-press', {
  tecnica: 'Sdraiato a terra: il gomito tocca il pavimento e da li si spinge su.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { bacino: [64, 93], tronco: 180, mano: [40, 80], gomito: 1, caviglia: [86, 97], piede: 0 },
  b: { bacino: [64, 93], tronco: 180, mano: [38, 64], gomito: 1, caviglia: [86, 97], piede: 0 },
})

M('svend-press', {
  tecnica: 'Disco stretto fra i palmi davanti al petto: spingi in avanti senza mollare la presa.',
  scena: 'terra',
  attrezzo: 'palla',
  a: { ...IN_PIEDI, mano: [66, 48], gomito: -1 },
  b: { ...IN_PIEDI, mano: [86, 48], gomito: -1 },
})

M('landmine-press', {
  tecnica: 'Bilanciere fissato a terra: spingi la punta in alto e in avanti, come un pugno lento.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { bacino: [54, 62], tronco: 84, mano: [64, 42], gomito: -1, caviglia: [66, 97], caviglia2: [44, 97], piede: 0, piede2: 0 },
  b: { bacino: [54, 62], tronco: 80, mano: [86, 22], gomito: -1, caviglia: [66, 97], caviglia2: [44, 97], piede: 0, piede2: 0 },
})

M('push-up-declinato', {
  tecnica: 'Piedi sul rialzo, mani a terra: il corpo resta una tavola mentre il petto scende.',
  scena: 'gradino',
  attrezzo: 'nessuno',
  a: { bacino: [62, 75], tronco: 173, mano: [33, 100], gomito: 1, coscia: -7, tibia: -7, piede: -60 },
  b: { bacino: [62, 85], tronco: 190, mano: [33, 100], gomito: 1, coscia: 10, tibia: 10, piede: -60 },
})

M('push-up-inclinato', {
  tecnica: 'Mani sulla panca, corpo dritto: piu e alto l appoggio, piu e facile.',
  scena: 'panca-bassa',
  attrezzo: 'nessuno',
  a: { bacino: [65, 75], tronco: 138, mano: [44, 84], gomito: 1, caviglia: [93, 98], piede: -40 },
  b: { bacino: [65, 84], tronco: 152, mano: [44, 84], gomito: 1, caviglia: [93, 98], piede: -40 },
})

M('push-up-largo', {
  ...MOVIMENTI['push-up'],
  id: 'push-up-largo',
  tecnica: 'Mani piu larghe delle spalle: il petto lavora di piu, i tricipiti meno.',
  a: { ...MOVIMENTI['push-up'].a, mano: [27, 100] },
  b: { ...MOVIMENTI['push-up'].b, mano: [27, 100] },
})

// --- schiena

M('rematore-pendlay', {
  tecnica: 'Busto parallelo a terra: il bilanciere parte da fermo dal pavimento a ogni ripetizione.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { bacino: [56, 66], tronco: 8, mano: [84, 92], gomito: 1, caviglia: [60, 96], piede: 0 },
  b: { bacino: [56, 66], tronco: 8, mano: [78, 70], gomito: 1, caviglia: [60, 96], piede: 0 },
})

M('rematore-yates', {
  tecnica: 'Busto piu alto, presa supina: il bilanciere sale verso la pancia, gomiti stretti.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { bacino: [56, 64], tronco: 52, mano: [74, 82], gomito: 1, caviglia: [60, 96], piede: 0 },
  b: { bacino: [56, 64], tronco: 52, mano: [66, 66], gomito: 1, caviglia: [60, 96], piede: 0 },
})

M('rematore-panca-inclinata', {
  tecnica: 'Petto appoggiato alla panca inclinata: le braccia tirano senza aiuto della schiena.',
  scena: 'panca-inclinata',
  attrezzo: 'manubrio',
  a: { bacino: [54, 72], tronco: 150, mano: [33, 90], gomito: 1, caviglia: [72, 98], piede: 0 },
  b: { bacino: [54, 72], tronco: 150, mano: [42, 72], gomito: 1, caviglia: [72, 98], piede: 0 },
})

M('seal-row', {
  tecnica: 'Sdraiato a pancia in giu su una panca alta: tiri il bilanciere fino a toccare la panca.',
  scena: 'panca',
  attrezzo: 'bilanciere',
  a: { bacino: [64, 74], tronco: 180, mano: [40, 98], gomito: 1, coscia: -4, tibia: -4, piede: -80 },
  b: { bacino: [64, 74], tronco: 180, mano: [46, 82], gomito: 1, coscia: -4, tibia: -4, piede: -80 },
})

M('rematore-inverso', {
  tecnica: 'Sotto una sbarra bassa, corpo dritto: tira il petto alla sbarra come un piegamento al contrario.',
  scena: 'parallele',
  attrezzo: 'nessuno',
  a: { bacino: [77, 92], tronco: 167, mano: [52, 60], gomito: -1, caviglia: [110, 98], piede: 70 },
  b: { bacino: [71, 81], tronco: 150, mano: [52, 60], gomito: -1, caviglia: [110, 98], piede: 70 },
})

M('superman', {
  tecnica: 'A pancia in giu: solleva insieme braccia, petto e gambe, poi torna giu piano.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.6,
  a: { bacino: [62, 94], tronco: 180, braccio: 180, avambraccio: 180, coscia: 0, tibia: 0, piede: -80 },
  b: { bacino: [62, 94], tronco: 166, braccio: 160, avambraccio: 160, coscia: 12, tibia: 12, piede: -70 },
})

M('good-morning', {
  tecnica: 'Bilanciere sulle spalle e ginocchia appena flesse: piega il busto in avanti a schiena piatta.',
  scena: 'rack',
  attrezzo: 'bilanciere',
  attrezzoSu: 'spalla',
  durata: 3,
  a: { bacino: [56, 62], tronco: 88, mano: [46, 34], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [48, 64], tronco: 22, mano: [64, 48], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('rack-pull', {
  tecnica: 'Il bilanciere parte dai supporti all altezza delle ginocchia: solo la parte alta dello stacco.',
  scena: 'rack',
  attrezzo: 'bilanciere',
  durata: 2.6,
  a: { bacino: [50, 66], tronco: 55, mano: [62, 78], caviglia: [58, 96], piede: 0 },
  b: { bacino: [52, 62], tronco: 88, mano: [58, 64], caviglia: [58, 96], piede: 0 },
})

M('stacco-trap-bar', {
  tecnica: 'Dentro la trap bar, maniglie ai fianchi: busto piu dritto e ginocchia piu piegate dello stacco.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  durata: 3,
  a: { bacino: [50, 80], tronco: 50, mano: [58, 88], caviglia: [58, 96], piede: 0 },
  b: { bacino: [52, 62], tronco: 88, mano: [56, 66], caviglia: [58, 96], piede: 0 },
})

M('stacco-sumo', {
  tecnica: 'Piedi molto larghi e punte in fuori: le mani prendono il bilanciere dentro le ginocchia.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'bilanciere',
  attrezzoSu: 'mani',
  durata: 3,
  a: { ...IN_PIEDI_FRONTE, bacino: [56, 80], tronco: 90, mano: [64, 88], gomito: -1, caviglia: [80, 97], piede: 30 },
  b: { ...IN_PIEDI_FRONTE, bacino: [56, 62], tronco: 90, mano: [64, 68], gomito: -1, caviglia: [80, 97], piede: 30 },
})

// --- gambe

M('box-squat', {
  ...MOVIMENTI['squat'],
  id: 'box-squat',
  tecnica: 'Scendi fino a sederti sul box senza rilassarti, poi riparti spingendo coi talloni.',
  scena: 'panca-bassa',
  b: { bacino: [46, 80], tronco: 66, mano: [38, 54], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('sissy-squat', {
  tecnica: 'Sulle punte, ginocchia che vanno avanti e busto che va indietro: il corpo resta una linea.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3,
  a: { bacino: [56, 62], tronco: 92, mano: [72, 56], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [48, 76], tronco: 116, mano: [72, 56], gomito: -1, caviglia: [60, 95], ginocchio: -1, piede: -35 },
})

M('pistol', {
  tecnica: 'Su una gamba sola, l altra tesa in avanti: scendi controllato fino in fondo.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3.2,
  a: { bacino: [56, 62], tronco: 88, mano: [74, 50], gomito: -1, caviglia: [58, 96], piede: 0, coscia2: -60, tibia2: -60, piede2: 0 },
  b: { bacino: [50, 82], tronco: 60, mano: [86, 56], gomito: -1, caviglia: [58, 96], piede: 0, coscia2: -4, tibia2: -4, piede2: 20 },
})

M('wall-sit', {
  tecnica: 'Schiena al muro e cosce parallele a terra: si resta fermi, come seduti su una sedia che non c e.',
  scena: 'rack',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [30, 78], tronco: 90, mano: [42, 64], gomito: -1, caviglia: [49, 97], piede: 0 },
  b: { bacino: [30, 77], tronco: 90, mano: [42, 63], gomito: -1, caviglia: [49, 97], piede: 0 },
})

M('leg-curl-piedi', {
  tecnica: 'In piedi alla macchina, una gamba alla volta: porta il tallone verso il gluteo.',
  scena: 'terra',
  attrezzo: 'rullo',
  attrezzoSu: 'caviglia',
  a: { ...IN_PIEDI, tronco: 84, mano: [74, 52], gomito: -1, caviglia: null, coscia: -96, tibia: -96, piede: -10, caviglia2: [57, 97], piede2: 0 },
  b: { ...IN_PIEDI, tronco: 84, mano: [74, 52], gomito: -1, caviglia: null, coscia: -102, tibia: 175, piede: 120, caviglia2: [57, 97], piede2: 0 },
})

M('nordic', {
  tecnica: 'In ginocchio, caviglie bloccate: scendi in avanti col corpo dritto, frenando coi femorali.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [60, 77], tronco: 90, mano: [66, 60], gomito: -1, coscia: -90, tibia: 180, piede: -90 },
  b: { bacino: [74.6, 83.8], tronco: 40, mano: [94, 80], gomito: -1, coscia: -140, tibia: 180, piede: -90 },
})

M('affondi-laterali', {
  tecnica: 'Passo largo di lato: scendi sulla gamba che piega, l altra resta tesa.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 3,
  a: { ...IN_PIEDI_FRONTE, bacino: [56, 62], mano: [62, 50], gomito: -1, caviglia: [66, 97], caviglia2: [46, 97], piede: 10, piede2: 170 },
  b: { ...IN_PIEDI_FRONTE, bacino: [66, 76], mano: [72, 62], gomito: -1, caviglia: [88, 97], caviglia2: [36, 97], piede: 10, piede2: 170 },
})

M('adduzioni-cavi', {
  tecnica: 'Cavo alla caviglia: porta la gamba davanti all altra, il busto resta fermo.',
  vista: 'fronte',
  scena: 'cavo-basso',
  attrezzo: 'cavo',
  attrezzoSu: 'caviglia',
  ancora: [110, 94],
  a: { ...IN_PIEDI_FRONTE, mano: [70, 66], gomito: -1, caviglia: [78, 97], caviglia2: [48, 97], piede: 20, piede2: 170 },
  b: { ...IN_PIEDI_FRONTE, mano: [70, 66], gomito: -1, caviglia: [58, 97], caviglia2: [48, 97], piede: 10, piede2: 170 },
})

// --- glutei

const PONTE_PIEDI = { caviglia: [84, 97], piede: 0 }

M('hip-thrust', {
  tecnica: 'Scapole sulla panca, bilanciere sul bacino: spingi i fianchi in alto e stringi i glutei.',
  scena: 'panca-bassa',
  attrezzo: 'bilanciere',
  durata: 2.6,
  a: { bacino: [64, 92], tronco: 145, mano: [64, 90], gomito: -1, ...PONTE_PIEDI },
  b: { bacino: [74, 80], tronco: 178, mano: [74, 78], gomito: -1, ...PONTE_PIEDI },
})

M('hip-thrust-mono', {
  ...MOVIMENTI['hip-thrust'],
  id: 'hip-thrust-mono',
  tecnica: 'Come l hip thrust, ma spinge una gamba sola: l altra resta sollevata.',
  attrezzo: 'nessuno',
  a: { ...MOVIMENTI['hip-thrust'].a, mano: [54, 84], coscia2: 50, tibia2: 50, piede2: 0 },
  b: { ...MOVIMENTI['hip-thrust'].b, mano: [60, 74], coscia2: 25, tibia2: 25, piede2: 0 },
})

M('ponte-glutei', {
  tecnica: 'Spalle a terra, piedi vicini al sedere: alza il bacino fino alla linea ginocchia-spalle.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.4,
  a: { bacino: [64, 94], tronco: 180, mano: [56, 98], gomito: -1, caviglia: [84, 97], piede: 0 },
  b: { bacino: [68, 82], tronco: 205, mano: [56, 98], gomito: -1, caviglia: [84, 97], piede: 0 },
})

M('ponte-glutei-mono', {
  ...MOVIMENTI['ponte-glutei'],
  id: 'ponte-glutei-mono',
  tecnica: 'Ponte su una gamba sola, l altra tesa: il bacino non deve inclinarsi di lato.',
  a: { ...MOVIMENTI['ponte-glutei'].a, coscia2: 30, tibia2: 30, piede2: 0 },
  b: { ...MOVIMENTI['ponte-glutei'].b, coscia2: 8, tibia2: 8, piede2: 0 },
})

M('kickback-glutei', {
  tecnica: 'Cavo alla caviglia, busto fermo: spingi la gamba indietro col gluteo, senza inarcare la schiena.',
  scena: 'cavo-basso',
  attrezzo: 'cavo',
  attrezzoSu: 'caviglia',
  ancora: [104, 94],
  a: { bacino: [56, 62], tronco: 78, mano: [80, 46], gomito: -1, coscia: -92, tibia: -92, piede: 0, caviglia2: [58, 97], piede2: 0 },
  b: { bacino: [56, 62], tronco: 72, mano: [80, 46], gomito: -1, coscia: -132, tibia: -122, piede: -50, caviglia2: [58, 97], piede2: 0 },
})

// A quattro zampe, testa a sinistra: mani sotto le spalle, ginocchia sotto il bacino.
const QUADRUPEDE = {
  bacino: [70, 76],
  tronco: 180,
  mano: [44, 98],
  gomito: 1,
  coscia: -90,
  tibia: 0,
  piede: 0,
  coscia2: -90,
  tibia2: 0,
  piede2: 0,
}

M('donkey-kick', {
  tecnica: 'A quattro zampe, ginocchio piegato a 90: spingi la pianta del piede verso il soffitto.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.2,
  a: QUADRUPEDE,
  b: { ...QUADRUPEDE, coscia: 15, tibia: 105, piede: 15 },
})

M('fire-hydrant', {
  tecnica: 'A quattro zampe: apri il ginocchio piegato di lato, senza ruotare il bacino.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.2,
  a: QUADRUPEDE,
  b: { ...QUADRUPEDE, coscia: -55, tibia: 20, piede: 20 },
})

M('reverse-hyper', {
  tecnica: 'Busto sulla panca, gambe libere: alzale tese fino alla linea del corpo.',
  scena: 'panca',
  attrezzo: 'nessuno',
  durata: 2.4,
  a: { bacino: [76, 74], tronco: 180, mano: [44, 84], gomito: 1, coscia: -40, tibia: -55, piede: -140 },
  b: { bacino: [76, 74], tronco: 180, mano: [44, 84], gomito: 1, coscia: 6, tibia: 6, piede: -84 },
})

M('pull-through', {
  tecnica: 'Spalle alla carrucola, corda fra le gambe: spingi i fianchi avanti finche sei dritto.',
  scena: 'cavo-basso',
  attrezzo: 'cavo',
  ancora: [12, 94],
  durata: 2.6,
  a: { bacino: [46, 66], tronco: 25, mano: [52, 90], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [54, 62], tronco: 90, mano: [60, 70], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('sumo-squat', {
  tecnica: 'Piedi larghi e punte in fuori, manubrio fra le gambe: scendi con le ginocchia aperte.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 3,
  a: { ...IN_PIEDI_FRONTE, bacino: [56, 62], mano: [60, 72], gomito: -1, caviglia: [76, 97], piede: 30 },
  b: { ...IN_PIEDI_FRONTE, bacino: [56, 78], mano: [60, 88], gomito: -1, caviglia: [76, 97], piede: 30 },
})

// --- polpacci

M('calf-bilanciere', {
  tecnica: 'Bilanciere sulle spalle: sali sulle punte tenendo le ginocchia ferme.',
  scena: 'rack',
  attrezzo: 'bilanciere',
  attrezzoSu: 'spalla',
  durata: 2,
  a: { bacino: [56, 64], tronco: 88, mano: [46, 36], gomito: -1, coscia: -92, tibia: -88, piede: 0 },
  b: { bacino: [56, 58], tronco: 88, mano: [46, 30], gomito: -1, coscia: -92, tibia: -88, piede: -35 },
})

M('calf-step', {
  tecnica: 'Avampiede sul bordo del gradino: il tallone scende sotto e poi sali piu in alto che puoi.',
  scena: 'gradino',
  attrezzo: 'manubrio',
  durata: 2,
  a: { bacino: [68, 43], tronco: 88, mano: [70, 47], gomito: -1, coscia: -92, tibia: -88, piede: 15 },
  b: { bacino: [68, 37], tronco: 88, mano: [70, 41], gomito: -1, coscia: -92, tibia: -88, piede: -35 },
})

M('calf-mono', {
  tecnica: 'Su un piede solo, l altro sollevato dietro: una mano al muro solo per l equilibrio.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2,
  a: { bacino: [56, 64], tronco: 88, mano: [76, 50], gomito: -1, coscia: -92, tibia: -88, piede: 0, coscia2: -96, tibia2: 150, piede2: 160 },
  b: { bacino: [56, 58], tronco: 88, mano: [76, 44], gomito: -1, coscia: -92, tibia: -88, piede: -35, coscia2: -96, tibia2: 150, piede2: 160 },
})

M('donkey-calf', {
  tecnica: 'Busto piegato in avanti e appoggiato: le gambe restano tese mentre sali sulle punte.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2,
  a: { bacino: [52, 64], tronco: 15, mano: [80, 68], gomito: 1, coscia: -92, tibia: -88, piede: 0 },
  b: { bacino: [52, 58], tronco: 15, mano: [80, 62], gomito: 1, coscia: -92, tibia: -88, piede: -35 },
})

M('calf-leg-press', {
  tecnica: 'Gambe tese alla pressa, solo gli avampiedi sulla pedana: spingi di caviglia.',
  scena: 'leg-press',
  attrezzo: 'nessuno',
  durata: 2,
  a: { bacino: [54, 76], tronco: 192, mano: [46, 90], gomito: -1, coscia: 40, tibia: 40, piede: 80 },
  b: { bacino: [54, 76], tronco: 192, mano: [46, 90], gomito: -1, coscia: 40, tibia: 40, piede: 35 },
})

M('saltelli-punte', {
  tecnica: 'Piccoli rimbalzi elastici sugli avampiedi, talloni che non toccano terra.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 0.8,
  a: { ...IN_PIEDI, bacino: [56, 62], mano: [62, 64], gomito: -1, caviglia: [57, 96], piede: -10 },
  b: { ...IN_PIEDI, bacino: [56, 55], mano: [62, 57], gomito: -1, caviglia: [57, 90], piede: -40 },
})

M('tibialis', {
  tecnica: 'Schiena al muro, talloni a terra: alza le punte dei piedi verso gli stinchi.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.8,
  a: { bacino: [52, 62], tronco: 94, mano: [56, 66], gomito: -1, caviglia: [62, 96], piede: 0 },
  b: { bacino: [52, 62], tronco: 94, mano: [56, 66], gomito: -1, caviglia: [62, 96], piede: 40 },
})

// --- spalle

M('push-press', {
  tecnica: 'Piccolo piegamento di gambe e spinta: le gambe avviano, le braccia finiscono sopra la testa.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'bilanciere',
  attrezzoSu: 'mani',
  durata: 2,
  a: { ...IN_PIEDI_FRONTE, bacino: [56, 67], mano: [76, 43], gomito: -1, caviglia: [62, 97] },
  b: { ...IN_PIEDI_FRONTE, bacino: [56, 61], mano: [68, 7], gomito: -1, caviglia: [61, 97] },
})

M('z-press', {
  tecnica: 'Seduto a terra a gambe tese: spingi sopra la testa senza appoggiare la schiena.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  a: { bacino: [44, 94], tronco: 90, mano: [52, 66], gomito: -1, coscia: 0, tibia: 0, piede: 80 },
  b: { bacino: [44, 94], tronco: 90, mano: [48, 40], gomito: -1, coscia: 0, tibia: 0, piede: 80 },
})

M('y-raise', {
  tecnica: 'Braccia tese che salgono in diagonale a formare una Y, pollici verso l alto.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...IN_PIEDI_FRONTE, mano: [66, 66], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, mano: [88, 14], gomito: -1 },
})

M('rotazioni-esterne', {
  tecnica: 'Gomito incollato al fianco e piegato a 90: ruota l avambraccio verso l esterno.',
  vista: 'fronte',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  cavoSolo: true,
  ancora: [10, 62],
  durata: 2.2,
  a: { ...IN_PIEDI_FRONTE, mano: null, braccio: -90, avambraccio: 175, braccio2: -90, avambraccio2: -90 },
  b: { ...IN_PIEDI_FRONTE, mano: null, braccio: -90, avambraccio: 5, braccio2: -90, avambraccio2: -90 },
})

// --- bicipiti

M('curl-drag', {
  tecnica: 'Il bilanciere sale strisciando sul corpo: i gomiti vanno indietro, non avanti.',
  scena: 'terra',
  attrezzo: 'bilanciere',
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [60, 66], gomito: -1 },
  b: { ...IN_PIEDI, mano: [61, 44], gomito: 1 },
})

M('curl-spider', {
  tecnica: 'Petto sulla panca inclinata, braccia che pendono dritte: sale solo l avambraccio.',
  scena: 'panca-inclinata',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { bacino: [54, 72], tronco: 150, mano: [32, 90], gomito: 1, caviglia: [72, 98], piede: 0 },
  b: { bacino: [54, 72], tronco: 150, mano: [22, 70], gomito: 1, caviglia: [72, 98], piede: 0 },
})

M('curl-bayesian', {
  tecnica: 'Di spalle al cavo basso, braccio dietro il corpo: il bicipite lavora gia allungato.',
  scena: 'cavo-basso',
  attrezzo: 'cavo',
  ancora: [12, 92],
  durata: 2.4,
  a: { ...IN_PIEDI, mano: [44, 66], gomito: -1, caviglia: [62, 97], caviglia2: [48, 97] },
  b: { ...IN_PIEDI, mano: [54, 42], gomito: -1, caviglia: [62, 97], caviglia2: [48, 97] },
})

// --- tricipiti

M('french-press-declinata', {
  tecnica: 'Su panca declinata i gomiti restano fermi: il bilanciere scende dietro la testa.',
  scena: 'panca-declinata',
  attrezzo: 'bilanciere',
  durata: 2.4,
  a: { ...SUPINO_DECL, mano: [26, 70], gomito: 1 },
  b: { ...SUPINO_DECL, mano: [38, 50], gomito: 1 },
})

// --- addome

M('bicycle-crunch', {
  tecnica: 'Mani dietro la testa: gomito verso il ginocchio opposto, mentre l altra gamba si stende.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.6,
  a: { bacino: [58, 92], tronco: 160, mano: [26, 80], gomito: 1, coscia: 60, tibia: -15, piede: -10, coscia2: 8, tibia2: 8, piede2: 0 },
  b: { bacino: [58, 92], tronco: 160, mano: [26, 80], gomito: 1, coscia: 8, tibia: 8, piede: 0, coscia2: 60, tibia2: -15, piede2: -10 },
})

const SUPINO_TERRA = { bacino: [60, 94], tronco: 180 }

M('dead-bug', {
  tecnica: 'Schiena incollata a terra: stendi un braccio e la gamba opposta, poi cambia lato.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.6,
  a: { ...SUPINO_TERRA, braccio: 90, avambraccio: 90, braccio2: 172, avambraccio2: 172, coscia: 90, tibia: 0, piede: 90, coscia2: 8, tibia2: 8, piede2: 80 },
  b: { ...SUPINO_TERRA, braccio: 172, avambraccio: 172, braccio2: 90, avambraccio2: 90, coscia: 8, tibia: 8, piede: 80, coscia2: 90, tibia2: 0, piede2: 90 },
})

M('bird-dog', {
  tecnica: 'A quattro zampe: allunga un braccio avanti e la gamba opposta dietro, bacino fermo.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 2.6,
  a: { ...QUADRUPEDE, mano2: [44, 98], gomito2: 1 },
  b: { ...QUADRUPEDE, mano: null, braccio: 180, avambraccio: 180, mano2: [44, 98], gomito2: 1, coscia: 0, tibia: 0, piede: -80 },
})

M('pallof-press', {
  tecnica: 'Di fianco al cavo: spingi le mani avanti dal petto e non lasciarti ruotare.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [10, 50],
  durata: 2.6,
  a: { ...IN_PIEDI, mano: [64, 50], gomito: -1, caviglia: [64, 97], caviglia2: [50, 97] },
  b: { ...IN_PIEDI, mano: [86, 48], gomito: -1, caviglia: [64, 97], caviglia2: [50, 97] },
})

M('woodchopper', {
  tecnica: 'Dal cavo alto, le mani scendono in diagonale davanti al corpo ruotando il busto.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [10, 14],
  durata: 2.4,
  a: { ...IN_PIEDI, tronco: 96, mano: [42, 20], gomito: -1, caviglia: [66, 97], caviglia2: [48, 97] },
  b: { ...IN_PIEDI, tronco: 80, mano: [80, 76], gomito: -1, caviglia: [66, 97], caviglia2: [48, 97] },
})

M('toes-to-bar', {
  ...MOVIMENTI['leg-raise-sbarra'],
  id: 'toes-to-bar',
  tecnica: 'Appeso alla sbarra: porta le punte dei piedi a toccarla, senza slancio.',
  b: { bacino: [54, 70], tronco: 104, mano: [52, 18], gomito: 1, coscia: 72, tibia: 72, piede: 40 },
})

M('knee-raise', {
  ...MOVIMENTI['leg-raise-sbarra'],
  id: 'knee-raise',
  tecnica: 'Appeso alla sbarra: porta le ginocchia al petto arrotolando il bacino.',
  b: { bacino: [52, 72], tronco: 92, mano: [52, 18], gomito: 1, coscia: 20, tibia: -85, piede: -40 },
})

M('captain-chair', {
  tecnica: 'Avambracci sui cuscinetti e schiena allo schienale: alza le ginocchia verso il petto.',
  scena: 'parallele',
  attrezzo: 'nessuno',
  durata: 2.4,
  a: { bacino: [54, 70], tronco: 92, braccio: -95, avambraccio: 0, coscia: -92, tibia: -92, piede: -10 },
  b: { bacino: [54, 70], tronco: 92, braccio: -95, avambraccio: 0, coscia: 15, tibia: -80, piede: -40 },
})

M('dragon-flag', {
  tecnica: 'Spalle sulla panca, mani dietro la testa: il corpo sale e scende rigido come un asse.',
  scena: 'panca',
  attrezzo: 'nessuno',
  durata: 3.2,
  a: { bacino: [40, 74], tronco: 180, mano: [8, 80], gomito: 1, coscia: 0, tibia: 0, piede: 80 },
  b: { bacino: [34, 57], tronco: 220, mano: [8, 80], gomito: 1, coscia: 40, tibia: 40, piede: 120 },
})

M('flutter-kick', {
  tecnica: 'Sdraiato, gambe tese poco sopra terra: piccoli calci alternati, schiena giu.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1,
  a: { ...SUPINO_TERRA, mano: [54, 98], gomito: -1, coscia: 18, tibia: 18, piede: 80, coscia2: 4, tibia2: 4, piede2: 80 },
  b: { ...SUPINO_TERRA, mano: [54, 98], gomito: -1, coscia: 4, tibia: 4, piede: 80, coscia2: 18, tibia2: 18, piede2: 80 },
})

M('side-bend', {
  tecnica: 'Manubrio in una mano: il busto si piega di lato e risale, senza ruotare.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'manubrio',
  durata: 2.4,
  a: { ...IN_PIEDI_FRONTE, tronco: 102, braccio: -90, avambraccio: -90 },
  b: { ...IN_PIEDI_FRONTE, tronco: 80, braccio: -90, avambraccio: -90 },
})

M('l-sit', {
  tecnica: 'Braccia tese sulle parallele: gambe tese avanti, parallele a terra, e si tiene.',
  scena: 'parallele',
  attrezzo: 'nessuno',
  durata: 3.4,
  a: { bacino: [52, 57], tronco: 90, mano: [52, 60], gomito: 1, coscia: 0, tibia: 0, piede: 80 },
  b: { bacino: [52, 56], tronco: 90, mano: [52, 60], gomito: 1, coscia: 3, tibia: 3, piede: 80 },
})

M('shoulder-tap', {
  tecnica: 'In plank a braccia tese: tocca la spalla opposta con una mano, il bacino non oscilla.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.6,
  a: { bacino: [56, 83], tronco: 153, mano: [33, 100], gomito: 1, mano2: [33, 100], gomito2: 1, coscia: -27, tibia: -27, piede: -10 },
  b: { bacino: [56, 83], tronco: 153, mano: [33, 100], gomito: 1, mano2: [38, 72], gomito2: -1, coscia: -27, tibia: -27, piede: -10 },
})

// --- cardio

M('burpees', {
  tecnica: 'Dalle mani a terra salti indietro in plank, torni coi piedi e salti in alto.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.8,
  a: { bacino: [56, 58], tronco: 88, mano: [64, 6], gomito: -1, caviglia: [57, 94], piede: -20 },
  b: { bacino: [58, 83], tronco: 27, mano: [81, 100], gomito: -1, coscia: -153, tibia: -153, piede: -100 },
})

M('jumping-jack', {
  tecnica: 'Salta aprendo gambe e braccia insieme, poi richiudi: ritmo costante.',
  vista: 'fronte',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1,
  a: { ...IN_PIEDI_FRONTE, mano: [66, 68], gomito: -1 },
  b: { ...IN_PIEDI_FRONTE, bacino: [56, 59], mano: [72, 6], gomito: -1, caviglia: [76, 96], piede: 20 },
})

M('box-jump', {
  tecnica: 'Braccia indietro e piccolo piegamento: salta sul box e atterra morbido, ginocchia piegate.',
  scena: 'gradino',
  attrezzo: 'nessuno',
  durata: 1.8,
  a: { bacino: [44, 78], tronco: 60, mano: [34, 74], gomito: -1, caviglia: [48, 96], piede: 0 },
  b: { bacino: [74, 46], tronco: 88, mano: [86, 40], gomito: -1, caviglia: [76, 80], piede: 0 },
})

M('kettlebell-swing', {
  tecnica: 'La spinta e dei fianchi, non delle braccia: il kettlebell sale fino al petto e ricade.',
  scena: 'terra',
  attrezzo: 'palla',
  durata: 1.6,
  a: { bacino: [48, 66], tronco: 30, mano: [54, 88], gomito: -1, caviglia: [60, 96], piede: 0 },
  b: { bacino: [54, 62], tronco: 90, mano: [84, 38], gomito: -1, caviglia: [60, 96], piede: 0 },
})

M('battle-rope', {
  tecnica: 'Mezzo squat, busto fermo: le braccia alzano e sbattono le corde in onde alternate.',
  scena: 'terra',
  attrezzo: 'cavo',
  ancora: [116, 92],
  durata: 0.8,
  a: { bacino: [50, 72], tronco: 78, mano: [80, 46], gomito: -1, mano2: [78, 70], gomito2: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [50, 72], tronco: 78, mano: [78, 70], gomito: -1, mano2: [80, 46], gomito2: -1, caviglia: [58, 96], piede: 0 },
})

M('sled-push', {
  tecnica: 'Busto inclinato e braccia tese sui pali: passi corti e potenti, spinta dagli avampiedi.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.2,
  a: { bacino: [50, 66], tronco: 40, mano: [86, 56], gomito: -1, coscia: -45, tibia: -110, piede: -10, coscia2: -130, tibia2: -128, piede2: -40 },
  b: { bacino: [50, 66], tronco: 40, mano: [86, 56], gomito: -1, coscia: -130, tibia: -128, piede: -40, coscia2: -45, tibia2: -110, piede2: -10 },
})

M('nuoto', {
  tecnica: 'Corpo lungo e allineato: una bracciata per lato mentre le gambe battono piccole.',
  scena: 'terra',
  attrezzo: 'nessuno',
  durata: 1.6,
  a: { bacino: [64, 70], tronco: 180, braccio: 180, avambraccio: 180, braccio2: 70, avambraccio2: 160, coscia: 4, tibia: 4, piede: 0, coscia2: -4, tibia2: -4, piede2: 0 },
  b: { bacino: [64, 70], tronco: 180, braccio: 70, avambraccio: 160, braccio2: 180, avambraccio2: 180, coscia: -4, tibia: -4, piede: 0, coscia2: 4, tibia2: 4, piede2: 0 },
})

M('air-bike', {
  ...MOVIMENTI['cyclette'],
  id: 'air-bike',
  tecnica: 'Gambe e braccia insieme: mentre una gamba spinge, il braccio opposto tira.',
  a: { ...MOVIMENTI['cyclette'].a, mano: [84, 52], mano2: [70, 58], gomito2: -1 },
  b: { ...MOVIMENTI['cyclette'].b, mano: [70, 58], mano2: [84, 52], gomito2: -1 },
})

M('ski-erg', {
  tecnica: 'Dalle braccia in alto tiri giu le maniglie piegando i fianchi, come una spinta con le racchette.',
  scena: 'cavo-alto',
  attrezzo: 'cavo',
  ancora: [96, 12],
  durata: 1.6,
  a: { bacino: [54, 62], tronco: 88, mano: [72, 20], gomito: -1, caviglia: [58, 96], piede: 0 },
  b: { bacino: [50, 66], tronco: 45, mano: [66, 80], gomito: -1, caviglia: [58, 96], piede: 0 },
})

M('camminata-veloce', {
  ...MOVIMENTI['camminata'],
  id: 'camminata-veloce',
  tecnica: 'Passo svelto e braccia che accompagnano: si appoggia sempre prima il tallone.',
  scena: 'tapis',
  durata: 1.3,
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
  'Rematore Pendlay': 'rematore-pendlay',
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
  'Stacco sumo': 'stacco-sumo',
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
  'Curl Spider': 'curl-spider',
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
  'Bicycle crunch': 'bicycle-crunch',
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
  Nuoto: 'nuoto',
  'Spinta della slitta (sled push)': 'sled-push',
  'Battle rope': 'battle-rope',
  'Kettlebell swing': 'kettlebell-swing',
  'Box jump': 'box-jump',
  'Jumping jack': 'jumping-jack',
  Burpees: 'burpees',
  'L-sit': 'l-sit',
  'Side bend con manubrio': 'side-bend',
  'Woodchopper ai cavi': 'woodchopper',
  'Pallof press (anti-rotazione)': 'pallof-press',
  'Bird dog': 'bird-dog',
  'Rotazioni esterne ai cavi (cuffia)': 'rotazioni-esterne',
  'Y-raise': 'y-raise',
  'Tibialis raise (tibiali)': 'tibialis',
  'Saltelli sulle punte': 'saltelli-punte',
  'Donkey calf raise': 'donkey-calf',
  'Calf raise monopodalico': 'calf-mono',
  'Calf raise al multipower': 'calf-bilanciere',
  'Calf raise alla leg press': 'calf-leg-press',
  'Affondi incrociati (curtsy lunge)': 'affondi',
  'Sumo squat con manubrio': 'sumo-squat',
  'Cable pull through': 'pull-through',
  'Reverse hyperextension': 'reverse-hyper',
  'Fire hydrant': 'fire-hydrant',
  'Donkey kick (slanci a quattro zampe)': 'donkey-kick',
  'Clamshell (conchiglia)': 'abduttori',
  'Abduzioni con elastico': 'abduttori',
  'Glute machine (slanci indietro)': 'kickback-glutei',
  'Kickback ai cavi (glutei)': 'kickback-glutei',
  'Glute bridge monopodalico': 'ponte-glutei-mono',
  'Frog pump': 'ponte-glutei',
  'Glute bridge (ponte glutei)': 'ponte-glutei',
  'Hip thrust monopodalico': 'hip-thrust-mono',
  'Hip thrust al multipower': 'hip-thrust',
  'Hip thrust alla macchina': 'hip-thrust',
  'Hip thrust bilanciere': 'hip-thrust',
  'Affondi laterali': 'affondi-laterali',
  'Nordic curl (femorali)': 'nordic',
  'Leg curl in piedi': 'leg-curl-piedi',
  'Wall sit (sedia al muro)': 'wall-sit',
  'Pistol squat': 'pistol',
  'Sissy squat': 'sissy-squat',
  'Superman (lombari a terra)': 'superman',
  'Rematore inverso (inverted row)': 'rematore-inverso',
  'Seal row': 'seal-row',
  'Landmine press': 'landmine-press',
  'Svend press (con disco)': 'svend-press',
  // petto (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Panca declinata manubri': 'panca-declinata',
  'Panca inclinata al multipower': 'panca-inclinata',
  'Panca piana con fermo (paused)': 'panca-piana',
  'Floor press bilanciere': 'floor-press',
  'Chest press inclinata macchina': 'chest-press',
  'Hammer strength chest press': 'chest-press',
  'Croci ai cavi su panca inclinata': 'croci-panca-inclinata',
  'Piegamenti piedi rialzati (decline push-up)': 'push-up-declinato',
  'Piegamenti mani rialzate (incline push-up)': 'push-up-inclinato',
  'Piegamenti presa larga': 'push-up-largo',
  // schiena (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Trazioni zavorrate': 'trazioni',
  'Trazioni assistite (macchina)': 'trazioni',
  'Lat machine presa neutra': 'lat-machine',
  'Lat machine monolaterale': 'lat-machine',
  'Pulley basso presa larga': 'pulley-basso',
  'Rematore Yates (presa supina)': 'rematore-yates',
  'Rematore al multipower': 'rematore-bilanciere',
  'Rematore manubri su panca inclinata (chest supported)': 'rematore-panca-inclinata',
  'Rematore Meadows (landmine)': 'rematore-manubrio',
  'Good morning': 'good-morning',
  'Rack pull': 'rack-pull',
  'Stacco con trap bar': 'stacco-trap-bar',
  // gambe (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Squat al multipower': 'squat',
  'Squat con fermo (pause squat)': 'squat',
  'Box squat': 'box-squat',
  'Pendulum squat': 'squat',
  'Belt squat': 'squat',
  'Zercher squat': 'squat-frontale',
  'Leg press monopodalica': 'leg-press',
  'Affondi in camminata (walking lunge)': 'affondi',
  'Affondi indietro (reverse lunge)': 'affondi',
  'Affondi con bilanciere': 'affondi',
  'Leg extension monopodalica': 'leg-extension',
  'Adduzioni ai cavi': 'adduzioni-cavi',
  // glutei (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Abduzioni ai cavi': 'abduttori',
  'Abduzioni da seduto con elastico': 'abduttori',
  // polpacci (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Calf raise con manubri': 'calf-step',
  'Calf raise allo step (gradino)': 'calf-step',
  'Calf raise alla hack squat': 'calf-bilanciere',
  // spalle (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Lento dietro (behind the neck)': 'lento-avanti',
  'Lento avanti al multipower': 'lento-avanti',
  'Push press': 'push-press',
  'Z press (seduto a terra)': 'z-press',
  'Alzate laterali alla macchina': 'alzate-laterali',
  'Alzate laterali inclinate (lean away)': 'alzate-laterali',
  'Alzate frontali bilanciere': 'alzate-frontali',
  'Alzate frontali con disco': 'alzate-frontali',
  'Alzate frontali ai cavi': 'alzate-frontali',
  'Alzate posteriori ai cavi': 'alzate-posteriori',
  'Alzate posteriori su panca inclinata': 'alzate-posteriori',
  'Scrollate al multipower': 'scrollate',
  'Scrollate ai cavi': 'scrollate',
  // bicipiti (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Curl bilanciere presa larga': 'curl-bilanciere',
  'Curl bilanciere presa stretta': 'curl-bilanciere',
  'Curl 21': 'curl-bilanciere',
  'Curl Drag': 'curl-drag',
  'Curl Zottman': 'curl-manubri',
  'Curl a martello alternato': 'curl-martello',
  'Curl a martello ai cavi (corda)': 'curl-cavi',
  'Curl Bayesian (cavo dietro)': 'curl-bayesian',
  'Curl concentrato ai cavi': 'curl-concentrato',
  'Curl alla macchina': 'curl-scott',
  'Curl panca Scott manubrio singolo': 'curl-scott',
  // tricipiti (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Push down monolaterale ai cavi': 'push-down',
  'Skull crusher su panca declinata': 'french-press-declinata',
  'Tate press': 'french-press',
  'JM press': 'panca-stretta',
  'Panca presa stretta al multipower': 'panca-stretta',
  'Estensioni sopra la testa con bilanciere EZ': 'estensioni-testa',
  'Tricipiti alla macchina (dip machine)': 'dips',
  'Dips alla macchina assistita': 'dips',
  'Piegamenti presa stretta (diamond push-up)': 'push-up',
  // addome (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Crunch alla macchina': 'crunch-cavi',
  'Crunch su fitball': 'crunch',
  'Crunch obliqui': 'crunch',
  'Plank con tocco spalle (shoulder tap)': 'shoulder-tap',
  'Dead bug': 'dead-bug',
  'Toes to bar': 'toes-to-bar',
  'Ginocchia al petto alla sbarra (knee raise)': 'knee-raise',
  'Leg raise alla captain chair': 'captain-chair',
  'Dragon flag': 'dragon-flag',
  'Sforbiciate (flutter kick)': 'flutter-kick',
  // cardio (aggiunti il 2026-10-14: stesso gesto di uno che c'era)
  'Camminata veloce': 'camminata-veloce',
  'Air bike (assault bike)': 'air-bike',
  'Ski erg': 'ski-erg',
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
  glutei: 'abduttori',
  polpacci: 'calf-piedi',
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
