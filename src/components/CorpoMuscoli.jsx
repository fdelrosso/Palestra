import { SAGOMA, TRATTI_VISTA, CUORE, CUORE_CENTRO, formeGruppo } from '../lib/corpoForme'

// ---------------------------------------------------------------------------
// Disegno del corpo umano con UN gruppo muscolare evidenziato.
//
// Serve nella sezione "Esercizi": ogni gruppo muscolare (lib/muscoli) si
// presenta con la sagoma di un corpo in cui quel gruppo e' acceso col colore
// del gruppo stesso, cosi' si capisce a colpo d'occhio DOVE si lavora senza
// dover leggere l'etichetta.
//
// Perche' un SVG scritto a mano e non delle immagini:
//   - l'app e' una PWA che deve funzionare offline e stare in un piano
//     gratuito: un SVG di poche centinaia di byte non pesa niente, non va
//     scaricato e non ha licenze da rispettare;
//   - il colore lo prende dal gruppo (CSS var `--g`), quindi resta coerente coi
//     pallini colorati usati ovunque nell'app;
//   - si adatta a tema chiaro e scuro perche' la sagoma usa currentColor.
//
// Le FORME (sagoma e muscoli) non stanno piu' qui ma in lib/corpoForme: le
// usano anche il corpo del recap (CorpoAllenato) e la card su canvas
// (lib/recapImmagine), e devono restare lo stesso disegno.
// ---------------------------------------------------------------------------

// Un elenco di path da tracciare (braccia, gambe, solchi): lo spessore fa da
// volume, cosi' non serve disegnare i contorni.
export function Tratti({ lista, className }) {
  return (
    <g className={className} fill="none" strokeLinecap="round">
      {lista.map((t, i) => (
        <path key={i} d={t.d} strokeWidth={t.w} />
      ))}
    </g>
  )
}

/** La sagoma nuda: quello che sta sotto i muscoli. */
export function Sagoma({ className = 'corpo-base' }) {
  return (
    <g className={className}>
      <Tratti lista={SAGOMA.tratti} />
      {SAGOMA.pieni.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  )
}

/** I muscoli di un gruppo in una vista (niente se da quella parte non si vedono). */
export function Muscoli({ gruppo, vista, className = 'corpo-muscoli' }) {
  const forme = formeGruppo(gruppo, vista)
  if (!forme) return null
  return (
    <>
      <g className={className}>
        {forme.pieni.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {/* I solchi della tartaruga: tratteggiati nel colore dello sfondo, non
          del muscolo, altrimenti sparirebbero dentro il pieno. */}
      {forme.solchi && <Tratti lista={forme.solchi} className="corpo-solchi" />}
    </>
  )
}

// Cardio non e' un muscolo: si accende tutto il corpo (lavora tutto) e si
// aggiunge un cuore che batte.
function Cuore() {
  return (
    <g className="corpo-cuore" transform={`translate(${CUORE_CENTRO.x} ${CUORE_CENTRO.y})`}>
      <path d={CUORE}>
        <animateTransform
          attributeName="transform"
          type="scale"
          values="1;1.18;1;1.1;1"
          keyTimes="0;0.11;0.3;0.42;1"
          dur="1.1s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  )
}

/**
 * Corpo umano con un gruppo muscolare evidenziato.
 * @param {object} p
 * @param {string} p.gruppo      id del gruppo (lib/muscoli)
 * @param {string} [p.colore]    colore di evidenziazione (default: la var --g)
 * @param {'fronte'|'dietro'} [p.vista]
 * @param {number} [p.altezza]   altezza in px
 */
export default function CorpoMuscoli({ gruppo, colore, vista = 'fronte', altezza = 96, className = '' }) {
  const tutto = gruppo === 'cardio'
  return (
    <svg
      className={`corpo-svg${tutto ? ' corpo-tutto' : ''}${className ? ' ' + className : ''}`}
      viewBox="0 0 100 200"
      height={altezza}
      style={colore ? { '--g': colore } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <Sagoma />
      <Tratti lista={TRATTI_VISTA[vista] || TRATTI_VISTA.fronte} className="corpo-tratti" />
      <Muscoli gruppo={gruppo} vista={vista} />
      {tutto && <Cuore />}
    </svg>
  )
}
