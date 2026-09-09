import {
  CUORE,
  CUORE_CENTRO,
  TRATTI_VISTA,
  formeGruppo,
  gruppiDellaVista,
  rossoMuscolo,
} from '../lib/corpoForme'
import { Muscoli, Sagoma, Tratti } from './CorpoMuscoli'

// ---------------------------------------------------------------------------
// Il corpo del RECAP: due sagome (davanti e dietro) con tutta la muscolatura
// disegnata e i gruppi allenati oggi accesi di rosso.
//
// A cosa serve: un elenco di nomi ("Petto · 12, Tricipiti · 6") dice quanto hai
// fatto ma non DOVE. La figura lo dice in un colpo d'occhio, e a distanza di
// giorni fa vedere subito se si sta lavorando sempre la stessa metà del corpo.
//
// Differenze da <CorpoMuscoli> (la sagoma della sezione Esercizi):
//   - lì si accende UN gruppo col colore di quel gruppo, per riconoscerlo;
//     qui se ne accendono N, tutti dello stesso rosso, perché la domanda non è
//     "che gruppo è" ma "quanto l'ho lavorato";
//   - gli altri muscoli non spariscono: restano disegnati in trasparenza, così
//     il rosso si legge come "questo sì, quello no" e non come un corpo a pezzi;
//   - due viste sempre, non solo quella dove il gruppo si vede: un allenamento
//     tocca quasi sempre tutte e due le facce.
//
// L'intensità del rosso è la QUOTA di serie del gruppo sul gruppo più lavorato
// della giornata: è una proporzione interna all'allenamento, non un giudizio.
//
// Il cardio non è un muscolo (lib/corpoForme non ha forme per lui): quando c'è
// si accende il cuore in mezzo al petto.
// ---------------------------------------------------------------------------

const ETICHETTA = { fronte: 'Davanti', dietro: 'Dietro' }

function Vista({ vista, quote, altezza }) {
  const gruppi = gruppiDellaVista(vista)
  return (
    <div className="corpo-vista">
      <svg
        className="corpo-svg"
        viewBox="0 0 100 200"
        height={altezza}
        aria-hidden="true"
        focusable="false"
      >
        <Sagoma />
        <Tratti lista={TRATTI_VISTA[vista]} className="corpo-tratti" />

        {/* Tutta la muscolatura, spenta: è il "sotto" su cui il rosso risalta. */}
        <g className="corpo-riposo">
          {gruppi.map((id) => (
            <g key={id}>
              {formeGruppo(id, vista).pieni.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          ))}
        </g>

        {/* I gruppi allenati oggi. */}
        {gruppi
          .filter((id) => quote[id] != null)
          .map((id) => (
            <g key={id} style={{ fill: rossoMuscolo(quote[id]) }}>
              <Muscoli gruppo={id} vista={vista} className="" />
            </g>
          ))}

        {quote.cardio != null && (
          <g
            className="corpo-cuore-recap"
            transform={`translate(${CUORE_CENTRO.x} ${CUORE_CENTRO.y})`}
            style={{ fill: rossoMuscolo(quote.cardio) }}
          >
            <path d={CUORE} />
          </g>
        )}
      </svg>
      <span className="corpo-vista-label">{ETICHETTA[vista]}</span>
    </div>
  )
}

/**
 * @param {object} p
 * @param {{id:string, serie:number}[]} p.gruppi  i gruppi allenati (lib/recap)
 * @param {number} [p.altezza]  altezza di ogni sagoma, in px
 */
export default function CorpoAllenato({ gruppi = [], altezza = 172, className = '' }) {
  if (gruppi.length === 0) return null
  // Quota di ogni gruppo sul più lavorato della giornata. Con serie tutte a
  // zero (allenamento segnato ma non svolto) il massimo è 0: allora si accende
  // tutto pieno, perché il gruppo è stato comunque toccato.
  const max = Math.max(...gruppi.map((g) => g.serie || 0))
  const quote = {}
  for (const g of gruppi) quote[g.id] = max > 0 ? (g.serie || 0) / max : 1

  return (
    <div className={'corpo-allenato' + (className ? ' ' + className : '')}>
      <Vista vista="fronte" quote={quote} altezza={altezza} />
      <Vista vista="dietro" quote={quote} altezza={altezza} />
    </div>
  )
}
