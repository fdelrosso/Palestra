import { FiguraCorpo } from './CorpoAllenato'

// ---------------------------------------------------------------------------
// Il corpo con UN gruppo muscolare evidenziato.
//
// Serve nella sezione "Esercizi": ogni gruppo muscolare (lib/muscoli) si
// presenta con la figura in cui quel gruppo e' acceso col colore del gruppo
// stesso, cosi' si capisce a colpo d'occhio DOVE si lavora senza dover leggere
// l'etichetta.
//
// Il disegno sono le immagini di lib/corpoImmagini (la figura e una maschera
// per gruppo), le stesse del recap e delle card: un corpo solo in tutta l'app.
// ---------------------------------------------------------------------------

/**
 * Corpo umano con un gruppo muscolare evidenziato.
 * @param {object} p
 * @param {string} p.gruppo      id del gruppo (lib/muscoli)
 * @param {'fronte'|'dietro'} [p.vista]
 * @param {number} [p.altezza]   altezza in px
 */
export default function CorpoMuscoli({ gruppo, vista = 'fronte', altezza = 96, className = '' }) {
  // Cardio non e' un muscolo: si accende tutto il corpo (lavora tutto) e c'e'
  // il cuore che batte.
  const tutto = gruppo === 'cardio'
  return (
    <FiguraCorpo
      vista={vista}
      quote={{ [gruppo]: 1 }}
      altezza={altezza}
      tutto={tutto}
      className={className}
    />
  )
}
