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
//   `tratti` = path da tracciare, con lo spessore che fa da volume
//              ({ d, w }): braccia e gambe sono segmenti spessi arrotondati,
//              disegnarne il contorno non aggiungerebbe niente.
// Gli assi sono quelli di un disegno tecnico: spalle y=46, vita y=74, anche
// y=101, ginocchia y=142, caviglie y=178.
//
// Fronte e retro condividono la stessa sagoma (visto da davanti o da dietro un
// corpo ha lo stesso contorno): cambiano i muscoli sopra e un dettaglio che
// dice da che parte stiamo guardando (gli occhi davanti, la colonna dietro).
// ---------------------------------------------------------------------------

export const CORPO_W = 100
export const CORPO_H = 200

const r3 = (n) => Math.round(n * 1000) / 1000

// Ellisse (anche ruotata) come path chiuso: due archi da mezzo giro.
// Gli archi SVG hanno gia' la rotazione dell'asse maggiore fra i parametri, per
// questo non serve un transform — che su canvas costerebbe un save/restore per
// ogni bicipite.
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

/** La sagoma: quello che c'e' sotto i muscoli, uguale nelle due viste. */
export const SAGOMA = {
  tratti: [
    // braccia
    { d: 'M30 46 L24 80', w: 13 },
    { d: 'M70 46 L76 80', w: 13 },
    { d: 'M24 80 L20 112', w: 9.5 },
    { d: 'M76 80 L80 112', w: 9.5 },
    // gambe
    { d: 'M41 101 L38 142', w: 18 },
    { d: 'M59 101 L62 142', w: 18 },
    { d: 'M38 142 L36 178', w: 12.5 },
    { d: 'M62 142 L64 178', w: 12.5 },
  ],
  pieni: [
    // mani e piedi
    ell(19, 120, 4.6, 6.2),
    ell(81, 120, 4.6, 6.2),
    'M31 175 h9 v8 q0 3 -3 3 h-9 q-3 0 -2.5 -3 z',
    'M69 175 h-9 v8 q0 3 3 3 h9 q3 0 2.5 -3 z',
    // tronco
    'M29 44 Q29 36 50 34 Q71 36 71 44 L67 66 Q64 74 65 82 L68 101 Q60 106 50 106 Q40 106 32 101 L35 82 Q36 74 33 66 Z',
    // collo e testa
    'M45.5 25 h9 v12 h-9 z',
    ell(50, 17, 10.2, 12.2),
    // il "tappo" del deltoide, che chiude il profilo delle spalle
    ell(30, 46, 9.4, 9.4),
    ell(70, 46, 9.4, 9.4),
  ],
}

/** Il dettaglio che distingue le due viste: il viso davanti, la colonna dietro. */
export const TRATTI_VISTA = {
  fronte: [
    { d: 'M45.4 15 h1.8 M52.8 15 h1.8', w: 1.8 },
    { d: 'M47 22 q3 1.8 6 0', w: 1.4 },
  ],
  dietro: [{ d: 'M50 43 L50 86', w: 1.5 }],
}

const vuoto = { pieni: [], tratti: [] }

/**
 * I muscoli di ogni gruppo, per vista. `null` = quel gruppo da quella parte non
 * si vede (i pettorali da dietro non ci sono). I `tratti` dell'addome sono i
 * solchi della tartaruga: si tracciano nel colore dello SFONDO, non del
 * muscolo, quindi chi disegna li tratta a parte (vedi `solchi`).
 */
export const MUSCOLI = {
  petto: {
    fronte: {
      pieni: [
        'M48 47 Q37 43 32.5 51 Q31.5 61 40 65 Q48 66 48 58 Z',
        'M52 47 Q63 43 67.5 51 Q68.5 61 60 65 Q52 66 52 58 Z',
      ],
      tratti: [],
    },
    dietro: null,
  },
  schiena: {
    fronte: null,
    dietro: {
      pieni: [
        // trapezio
        'M50 36 L36 44 Q42 57 50 60 Q58 57 64 44 Z',
        // dorsali: larghi sotto l'ascella, stretti in vita
        'M35 50 Q31 64 36 79 L50 88 L64 79 Q69 64 65 50 Q58 62 50 64 Q42 62 35 50 Z',
        // lombari
        'M42 84 h16 v13 q-8 4 -16 0 z',
      ],
      tratti: [],
    },
  },
  spalle: {
    fronte: { pieni: [ell(29.5, 46, 9.2, 9.8), ell(70.5, 46, 9.2, 9.8)], tratti: [] },
    dietro: { pieni: [ell(29.5, 46, 9.2, 9.8), ell(70.5, 46, 9.2, 9.8)], tratti: [] },
  },
  bicipiti: {
    fronte: { pieni: [ell(26.6, 61, 5.6, 11, 9), ell(73.4, 61, 5.6, 11, -9)], tratti: [] },
    dietro: null,
  },
  tricipiti: {
    fronte: null,
    dietro: { pieni: [ell(27.4, 64, 5.2, 12, 9), ell(72.6, 64, 5.2, 12, -9)], tratti: [] },
  },
  addome: {
    fronte: {
      pieni: ['M42 64 h16 v26 q0 6 -8 8 q-8 -2 -8 -8 z'],
      solchi: [
        { d: 'M50 65 L50 96', w: 1.3 },
        { d: 'M42.6 73 h14.8 M42.6 81 h14.8 M43.4 89 h13.2', w: 1.3 },
      ],
      tratti: [],
    },
    dietro: null,
  },
  gambe: {
    fronte: {
      pieni: [
        // quadricipiti
        ell(40, 120, 7.6, 20, 3),
        ell(60, 120, 7.6, 20, -3),
        // tibiali
        ell(36.8, 158, 5.6, 13),
        ell(63.2, 158, 5.6, 13),
      ],
      tratti: [],
    },
    dietro: {
      pieni: [
        // glutei
        ell(43.5, 99, 8.8, 8.6),
        ell(56.5, 99, 8.8, 8.6),
        // femorali
        ell(40, 125, 7.2, 17, 3),
        ell(60, 125, 7.2, 17, -3),
        // polpacci
        ell(36.8, 158, 6, 14),
        ell(63.2, 158, 6, 14),
      ],
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
export const CUORE_CENTRO = { x: 50, y: 66 }

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

export { vuoto as FORME_VUOTE }
