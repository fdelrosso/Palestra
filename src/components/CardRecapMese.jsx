import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { chiaveAvvisoMese, durataLunga, meseDaAnnunciare, recapDelMese } from '../lib/recapMese'
import { IconChevron, IconClose } from './icons'

// ---------------------------------------------------------------------------
// Sulla Home, dal 1° al 7 del mese: "Il tuo ottobre è pronto" (pages/
// RecapMesePage). Una card e non una finestra: quelle all'apertura sono già
// una catena (AvvisoMuscoli → AvvisoCanzone). Apri e ✕ la tolgono per sempre,
// su tutti i telefoni (preferenze.avvisi, una chiave per mese).
// ---------------------------------------------------------------------------

// `oggi` serve solo a provarla in un altro giorno (Task 8, Step 5): di base adesso.
export default function CardRecapMese({ oggi }) {
  const { schede, preferenze, aggiornaPreferenze } = useStore()
  const periodo = meseDaAnnunciare(oggi)
  const chiave = periodo ? chiaveAvvisoMese(periodo) : ''
  const visto = !periodo || !!preferenze?.avvisi?.[chiave]
  const r = useMemo(
    () => (visto ? null : recapDelMese([...raccogliCompletamenti(schede).values()].flat(), meseDaAnnunciare(oggi))),
    [schede, visto, oggi],
  )
  if (!r) return null

  const segna = () => aggiornaPreferenze((p) => ({ avvisi: { ...p.avvisi, [chiave]: 'visto' } }))
  const apri = () => {
    segna()
    navigate(routes.recapMese(periodo))
  }
  const anteprima = [`${r.allenamenti} ${r.allenamenti === 1 ? 'allenamento' : 'allenamenti'}`, r.durataSec && durataLunga(r.durataSec)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="riquadro card-recap-mese">
      <button type="button" className="card-recap-mese-apri" onClick={apri}>
        <span className="grow">
          <strong>{`Il tuo ${r.nomeMese} è pronto`}</strong>
          <span className="card-recap-mese-sotto">{anteprima}</span>
        </span>
        <IconChevron />
      </button>
      <button type="button" className="btn btn-sm" aria-label="Non mostrarlo più" onClick={segna}>
        <IconClose width={15} height={15} />
      </button>
    </div>
  )
}
