import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { MESI, RECAP_DEBUG, chiaveAvvisoMese, meseDaAnnunciareOra, recapDelMese } from '../lib/recapMese'
import { IconChevron, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Sulla Home, dal 1° al 7 del mese, fra la settimana e la card di oggi: "Il tuo
// recap di ottobre" (pages/RecapMesePage). Un tasto e non una finestra: quelle
// all'apertura sono già una catena (AvvisoMuscoli → AvvisoCanzone).
// Chiuso il recap, tornati qui, una finestra sola dice dove ritrovarlo (il
// Calendario); poi fino al mese dopo non c'è più niente. Lo stato vale su
// tutti i telefoni (preferenze.avvisi, una chiave per mese: '' → 'visto' → 'chiuso').
// ---------------------------------------------------------------------------

// In locale lo stato non si salva (si lavora anche sul database vero, e
// l'annuncio non va bruciato): vive qui finché non si ricarica la pagina.
const statoDebug = {}

/** Il tasto del recap, uguale sulla Home e nel Calendario. */
export function TastoRecapMese({ periodo, onClick, className = '' }) {
  return (
    <button type="button" className={`recap-home ${className}`} onClick={onClick}>
      <span className="recap-home-play" aria-hidden="true">
        <IconPlay width={14} height={14} />
      </span>
      <span className="recap-home-testo">
        Il tuo recap di <strong>{MESI[periodo.mese]}</strong>
      </span>
      <span className="recap-home-freccia" aria-hidden="true">
        <IconChevron width={18} height={18} />
      </span>
    </button>
  )
}

// `oggi` serve solo a provarla in un altro giorno (Task 8, Step 5): di base adesso.
export default function CardRecapMese({ oggi }) {
  const { schede, preferenze, aggiornaPreferenze } = useStore()
  const [, ridisegna] = useState(0)
  const periodo = meseDaAnnunciareOra(oggi)
  const chiave = periodo ? chiaveAvvisoMese(periodo) : ''
  const stato = RECAP_DEBUG ? statoDebug[chiave] : preferenze?.avvisi?.[chiave]
  const r = useMemo(
    () => (periodo && stato !== 'chiuso' ? recapDelMese([...raccogliCompletamenti(schede).values()].flat(), periodo) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- periodo cambia solo con oggi
    [schede, stato, oggi],
  )
  if (!r) return null

  const segna = (valore) => {
    if (RECAP_DEBUG) {
      statoDebug[chiave] = valore
      ridisegna((n) => n + 1)
    } else aggiornaPreferenze((p) => ({ avvisi: { ...p.avvisi, [chiave]: valore } }))
  }

  if (stato) {
    return (
      <div className="modal-backdrop al-centro">
        <div className="modal avviso-sottogruppi" role="dialog" aria-label="Dove ritrovare il recap">
          <h3>Lo ritrovi nel Calendario</h3>
          <p className="muted avviso-testo">
            Il recap di {r.nomeMese} non sparisce: nel <strong>Calendario</strong>, sopra al mese, puoi riguardarlo
            quando vuoi. Così per ogni mese passato.
          </p>
          <button className="btn btn-accent btn-block" onClick={() => segna('chiuso')}>
            Ho capito
          </button>
        </div>
      </div>
    )
  }

  return (
    <TastoRecapMese
      periodo={periodo}
      onClick={() => {
        segna('visto')
        navigate(routes.recapMese(periodo))
      }}
    />
  )
}
