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
// Riferimenti verticali (gli stessi di prima, cosi' niente altro si sposta):
//   testa 3..30 · collo 28..38 · spalle 42 · linea del capezzolo 55 · vita 79
//   · anche 96 · inguine 105 · ginocchia 142 · caviglie 179 · pianta 190
// L'asse di simmetria e' x = 50: la meta' sinistra si specchia con 100 - x.
//
// Fronte e retro condividono la stessa sagoma (visto da davanti o da dietro un
// corpo ha lo stesso contorno): cambiano i muscoli sopra e un dettaglio che
// dice da che parte stiamo guardando (i lineamenti davanti, la colonna dietro).
// ---------------------------------------------------------------------------

export const CORPO_W = 100
export const CORPO_H = 200

const r3 = (n) => Math.round(n * 1000) / 1000

// Ellisse (anche ruotata) come path chiuso: due archi da mezzo giro.
// Gli archi SVG hanno gia' la rotazione dell'asse maggiore fra i parametri, per
// questo non serve un transform — che su canvas costerebbe un save/restore per
// ogni muscolo.
function ell(cx, cy, rx, ry, rot = 0) {
  const rad = (rot * Math.PI) / 180
  const dx = rx * Math.cos(rad)
  const dy = rx * Math.sin(rad)
  const x1 = r3(cx - dx)
  const y1 = r3(cy - dy)
  const x2 = r3(cx + dx)
  const y2 = r3(cy + dy)
  return `M${x1} ${y1}A${rx} ${ry} ${rot} 1 1 ${x2} ${y2}A${rx} ${ry} ${rot} 1 1 ${x1} ${y1}Z`
}

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

/** Lo stesso per i tratti, che non sono stringhe ma { d, w }. */
const paioT = (t) => [t, { ...t, d: specchia(t.d) }]

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

// Mano: ovale appena piu' lungo che largo.
const MANO = ell(30.6, 108.4, 4.1, 6.4, 5)

// Gamba sinistra: coscia piena, ginocchio, ventre del polpaccio, caviglia sottile.
const GAMBA =
  'M35.6 97.4 ' +
  'C33.6 104 32.8 112 33.4 120 ' + // vasto laterale
  'C33.9 127 35 133.6 36.4 140 ' + // ginocchio
  'C37.6 145.4 39 151 39.8 156.6 ' + // polpaccio
  'C40.4 161 40.8 165.6 41 170 ' +
  'C41.1 173.4 41.1 176.6 41 179.2 ' + // caviglia
  'L45.8 179.2 ' +
  'C45.9 176.6 46 173.4 46.2 170 ' +
  'C46.4 165.6 46.6 161 47 156.6 ' +
  'C47.4 151 48 145.4 48.4 140 ' +
  'C48.8 133.6 49 127 49.1 120 ' +
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
  pieni: [TESTA, COLLO, TRONCO, ...paio(BRACCIO), ...paio(MANO), ...paio(GAMBA), ...paio(PIEDE)],
}

/** Il dettaglio che distingue le due viste: le clavicole davanti, la colonna dietro. */
export const TRATTI_VISTA = {
  fronte: [
    { d: 'M50 37.4 C46 38.4 42.2 40.2 38.8 42.6', w: 1.1 },
    { d: 'M50 37.4 C54 38.4 57.8 40.2 61.2 42.6', w: 1.1 },
  ],
  dietro: [
    { d: 'M50 37.6 L50 96', w: 1.4 },
    { d: 'M50 97 L50 106.4', w: 1.2 },
  ],
}

const vuoto = { pieni: [], tratti: [] }

/**
 * I muscoli di ogni gruppo, per vista. `null` = quel gruppo da quella parte non
 * si vede (i pettorali da dietro non ci sono).
 */
export const MUSCOLI = {
  // ---------------------------------------------------------------- petto
  petto: {
    fronte: {
      // Gran pettorale: ventaglio dallo sterno alla spalla, bordo inferiore
      // netto — e' quello che si vede su un corpo allenato.
      pieni: paio(
        'M49 42.8 C45 41.2 40.6 41.4 37.4 43.6 ' +
          'C35.2 45.2 34.4 48.2 35.2 51.6 C36 55.2 38.4 58.2 41.6 59.7 ' +
          'C44.6 61 47.6 60.4 48.5 58.2 C48.9 57.1 49.1 55.2 49.1 53.2 Z',
      ),
      // Il capo clavicolare, la fetta alta del pettorale.
      solchi: paioT({ d: 'M48 48.2 C44.4 46.4 40.2 45.9 36.4 47', w: 0.85 }),
      tratti: [],
    },
    dietro: null,
  },

  // --------------------------------------------------------------- schiena
  schiena: {
    fronte: null,
    dietro: {
      pieni: [
        // Trapezio: rombo dal collo alle spalle e giu' fra le scapole.
        'M50 35.6 C45.6 36.4 41 38.4 37 41.6 C35.4 42.8 35.6 44.8 37.4 46 ' +
          'C41.2 48.8 44.4 53.2 46.8 58.4 C47.8 60.8 48.8 62 50 62 ' +
          'C51.2 62 52.2 60.8 53.2 58.4 C55.6 53.2 58.8 48.8 62.6 46 ' +
          'C64.4 44.8 64.6 42.8 63 41.6 C59 38.4 54.4 36.4 50 35.6 Z',
        // Gran dorsale: larghissimo sotto l'ascella, a punta sul bacino.
        ...paio(
          'M35.6 50.2 C33.2 56.2 32.6 63.6 33.8 70.6 ' +
            'C34.6 75.8 36.6 79.6 39.6 81.8 L48.4 87.4 ' +
            'C49.3 88 49.9 87.4 49.5 86 C47 78.4 44.2 69.4 41.8 61.2 ' +
            'C40.2 55.6 38 51.6 35.6 50.2 Z',
        ),
        // Erettori spinali: le due colonne ai lati della spina, in basso.
        ...paio(
          'M45.6 84.4 C43 85.6 41.8 88.4 42.4 92 C42.9 95.2 44.9 96.9 47.3 96.3 ' +
            'C48.8 95.9 49.4 94.4 49.4 92 L49.4 85.6 C49.4 84.5 47.6 83.7 45.6 84.4 Z',
        ),
      ],
      // Il bordo inferiore del trapezio, che lo stacca dai dorsali.
      solchi: paioT({ d: 'M50 62 C48.5 62 47.2 60.8 46.2 58.8', w: 0.8 }),
      tratti: [],
    },
  },

  // ---------------------------------------------------------------- spalle
  spalle: (() => {
    // Il deltoide e' la stessa cupola vista dai due lati: si scrive una volta.
    const cupola = paio(
      'M35.4 40.2 C30 41.4 26 44.6 24.2 49.8 ' +
        'C22.8 54 23.4 58.2 25.8 60.4 C28.4 62.4 31.4 61.4 33.2 58.2 ' +
        'C34.4 55.8 35.2 52 35.6 47.6 C35.8 44.2 35.8 41.8 35.4 40.2 Z',
    )
    // Le tre teste: e' quello che rende un deltoide un deltoide.
    const teste = [
      ...paioT({ d: 'M34 41.6 C31.4 46 30.2 51.6 30.4 57.6', w: 0.85 }),
      ...paioT({ d: 'M25.4 47.4 C28.6 49 31.8 49.8 35.4 49.6', w: 0.85 }),
    ]
    return {
      fronte: { pieni: cupola, solchi: teste, tratti: [] },
      dietro: { pieni: cupola, solchi: teste, tratti: [] },
    }
  })(),

  // ------------------------------------------------------------- bicipiti
  bicipiti: {
    fronte: {
      pieni: [
        // Il ventre del bicipite: gonfio in alto, a punta sul gomito.
        ...paio(
          'M32.4 53.4 C29.2 55.2 27 59.6 26.4 65 ' +
            'C25.8 70.4 26.8 75 29 76.8 C30.8 78.2 32.2 76.6 32.4 72.6 ' +
            'C32.8 66.4 32.9 59 32.4 53.4 Z',
        ),
        // I flessori dell'avambraccio: senza, il braccio finisce a meta'.
        ...paio(
          'M31 81.2 C28.4 83.6 27.2 88 28 92.6 C28.6 96 30 97.6 31.4 96.6 ' +
            'C32.6 95.6 33 92 32.6 87.4 C32.4 84.4 31.8 82.4 31 81.2 Z',
        ),
      ],
      // Il solco fra capo lungo e capo breve.
      solchi: paioT({ d: 'M30.4 57.6 C29.2 62.4 29 68.2 29.8 74', w: 0.8 }),
      tratti: [],
    },
    dietro: null,
  },

  // ------------------------------------------------------------ tricipiti
  tricipiti: {
    fronte: null,
    dietro: {
      pieni: [
        // Il ferro di cavallo: capo lungo e laterale, a punta sul gomito.
        ...paio(
          'M32.6 52.6 C29 54.4 26.2 59.2 25.2 65.4 ' +
            'C24.4 71 25.4 75.6 27.8 77.4 C29.8 78.8 31.4 77 32 72.6 ' +
            'C32.8 66 33 58.8 32.6 52.6 Z',
        ),
        ...paio(
          'M31 81.2 C28.4 83.6 27.2 88 28 92.6 C28.6 96 30 97.6 31.4 96.6 ' +
            'C32.6 95.6 33 92 32.6 87.4 C32.4 84.4 31.8 82.4 31 81.2 Z',
        ),
      ],
      solchi: paioT({ d: 'M29.8 56.4 C28 61.8 27.4 68.4 28.4 74.8', w: 0.8 }),
      tratti: [],
    },
  },

  // --------------------------------------------------------------- addome
  addome: {
    fronte: {
      // ⚠️ Sei quadretti SEPARATI invece di un rettangolo con sopra dei solchi:
      // quando il gruppo si accende di rosso, i vuoti fra i quadretti restano
      // del colore del corpo e la tartaruga si legge davvero.
      pieni: [
        ...paio('M49.2 64.4 L44 64.4 Q42.7 64.4 42.7 65.8 L42.7 70.6 Q42.7 72 44 72 L49.2 72 Z'),
        ...paio('M49.2 73.2 L43.8 73.2 Q42.5 73.2 42.5 74.6 L42.5 79.4 Q42.5 80.8 43.8 80.8 L49.2 80.8 Z'),
        ...paio('M49.2 82 L44 82 Q42.7 82 42.7 83.4 L42.7 88.2 Q42.7 89.6 44 89.6 L49.2 89.6 Z'),
        // La parte bassa, che si stringe a V verso l'inguine.
        ...paio('M49.2 90.8 L44.4 90.8 Q43.1 90.8 43 92.2 Q42.8 96.6 44.6 99.4 Q46.1 101.7 49.2 102.3 Z'),
        // Gli obliqui: le due lame ai fianchi.
        ...paio(
          'M41.8 66 C39.2 68 37.8 72.2 37.6 77.8 C37.5 83 38.8 87.6 41 90.2 ' +
            'C42.2 91.4 42.8 90.8 42.6 88.8 C41.8 81.4 41.6 73.6 41.8 66 Z',
        ),
      ],
      // La linea alba: il solco centrale che divide le due file.
      solchi: [{ d: 'M50 64.2 L50 96', w: 1.1 }],
      tratti: [],
    },
    dietro: null,
  },

  // ---------------------------------------------------------------- gambe
  gambe: {
    fronte: {
      pieni: [
        // Vasto laterale: la bombatura esterna della coscia.
        ...paio(
          'M35.8 102.4 C33.8 108.6 33.2 116.6 34.2 124.4 ' +
            'C34.8 129.4 36.2 132.6 38 132 C39.4 131.4 39.8 127.8 39.2 121.4 ' +
            'C38.5 113.4 37.2 106.4 35.8 102.4 Z',
        ),
        // Retto femorale: la fascia centrale che scende dritta.
        ...paio(
          'M43.4 102.6 C41.6 108.6 40.8 117 41.4 124.8 ' +
            'C41.8 130.2 42.8 133.2 44.2 132.8 C45.4 132.4 45.8 128.8 45.6 123 ' +
            'C45.3 114.4 44.6 106.8 43.4 102.6 Z',
        ),
        // Vasto mediale: la goccia sopra il ginocchio, dalla parte interna.
        ...paio(
          'M46.6 123 C44.6 125.4 43.8 129.6 44.8 133 C45.6 135.8 47 136.8 48.2 135.2 ' +
            'C49.2 133.8 49.2 129 48.2 125.6 C47.8 123.8 47.2 122.8 46.6 123 Z',
        ),
        // Tibiale anteriore: il muscolo davanti allo stinco.
        ...paio(
          'M42 147 C40.2 151.6 39.6 158.2 40.2 164 C40.6 167.8 41.5 169.6 42.6 168.6 ' +
            'C43.5 167.6 43.7 163 43.5 157.2 C43.3 151.8 42.7 148.4 42 147 Z',
        ),
      ],
      solchi: paioT({ d: 'M40.6 105 C39.9 112 39.9 119.2 40.6 126.2', w: 0.85 }),
      tratti: [],
    },
    dietro: {
      pieni: [
        // Grande gluteo: la massa del bacino, divisa a meta' dal solco centrale.
        ...paio(
          'M36.6 90.6 C33.8 92.8 32.8 97.4 33.8 101.4 C34.8 105.2 37.6 107.2 41.6 106.6 ' +
            'C45 106 47.6 103.8 48.6 100.4 C49 98.8 49 96.8 48.4 94.8 ' +
            'C47.4 91.6 45.2 89.4 41.8 89.2 C39.8 89.1 37.8 89.6 36.6 90.6 Z',
        ),
        // Femorali: bicipite femorale fuori, semitendinoso dentro.
        ...paio(
          'M36.4 108.6 C34.4 114.4 33.8 122 34.8 129.2 C35.4 133.8 36.8 136.6 38.4 136 ' +
            'C39.7 135.4 40.1 132 39.5 126 C38.7 118.2 37.6 112.2 36.4 108.6 Z',
        ),
        ...paio(
          'M44.8 108.8 C42.9 114.6 42.3 122.2 42.8 129.4 C43.2 134.2 44.1 137 45.4 136.6 ' +
            'C46.6 136.2 47 132.8 46.8 126.8 C46.5 118.8 45.8 112.4 44.8 108.8 Z',
        ),
        // Polpaccio: i due capi del gemello. E' la forma che si riconosce da dietro.
        ...paio(
          'M38.8 146.6 C36.8 151 36.1 157.2 36.9 162.4 C37.5 166.2 38.8 168.1 40.1 167.1 ' +
            'C41.2 166.2 41.6 162.1 41.2 156.4 C40.8 151.2 39.8 147.5 38.8 146.6 Z',
        ),
        ...paio(
          'M45.4 146.2 C43.7 150.6 43.1 156.8 43.9 162 C44.5 165.8 45.6 167.7 46.8 166.7 ' +
            'C47.8 165.8 48 161.8 47.6 156.2 C47.2 151 46.4 147.1 45.4 146.2 Z',
        ),
      ],
      solchi: paioT({ d: 'M42.4 148 C41.6 153.4 41.6 159.6 42.4 164.6', w: 0.85 }),
      tratti: [],
    },
  },

  // Il cardio non e' un muscolo: chi disegna accende tutta la sagoma e ci mette
  // un cuore (vedi CUORE). Qui non ha forme proprie.
  cardio: { fronte: null, dietro: null },
}

// Il cuore del cardio, disegnato attorno all'origine e non in posizione: cosi'
// il battito e' una `scale` attorno al suo centro sia in SVG (dentro un <g>
// traslato) sia su canvas (translate + scale), senza due path diversi.
export const CUORE =
  'M0 -6 q-4.6 -6.4 -9.2 -2.4 q-4 3.6 0 8.6 L0 8.4 L9.2 0.2 q4 -5 0 -8.6 q-4.6 -4 -9.2 2.4 Z'
// ⚠️ Alzato da y=66 a y=53 con la sagoma nuova: 66 era il centro del vecchio
// tronco, adesso e' l'ombelico. Il cuore sta in mezzo al petto.
export const CUORE_CENTRO = { x: 50, y: 53 }

// Il rosso dei muscoli allenati nel recap. Il colore è UNO — quello che
// l'utente ha chiesto — e cambia solo di intensità: il gruppo su cui è andato
// il lavoro di oggi è pieno, quello sfiorato con due serie è slavato. La
// funzione sta qui perché il corpo del recap si disegna in due modi (SVG nella
// pagina, canvas nella card) e i due devono venire dello stesso colore.
export const ROSSO_MUSCOLO = [235, 60, 55]

/** @param {number} quota 0..1 = quanto pesa questo gruppo sull'allenamento */
export function rossoMuscolo(quota) {
  const q = Math.max(0, Math.min(1, Number(quota) || 0))
  const [r, g, b] = ROSSO_MUSCOLO
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
