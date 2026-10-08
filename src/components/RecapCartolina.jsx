import { useEffect, useState } from 'react'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import RecapPost from './RecapPost'

// ---------------------------------------------------------------------------
// Un allenamento nella lista dello Storico ("I miei") col recap del feed di
// Social (components/RecapPost): stessi blocchi, stesso ordine, stessa foto
// di sfondo velata. Non è a tutto schermo: è una card alta quasi quanto il
// recap nel feed, e toccarla apre il recap per esteso.
//
// ⚠️ Come il post del feed è SEMPRE scura, anche col tema chiaro.
// ---------------------------------------------------------------------------

export default function RecapCartolina({ voce, foto = [], badge, onApri }) {
  const primaFoto = foto.find((f) => f.tipo !== 'video')
  const idFoto = primaFoto?.id
  const percorsoFoto = primaFoto?.percorso
  const [sfondo, setSfondo] = useState(null)
  useEffect(() => {
    if (!idFoto) return undefined
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id: idFoto, percorso: percorsoFoto })
      .then((f) => {
        revoca = f.revoca
        if (vivo && f.url) setSfondo(f.url)
      })
      .catch(() => {})
    return () => {
      vivo = false
      revoca()
    }
  }, [idFoto, percorsoFoto])

  // Un div e non un <button>: dentro ci sono le pillole dei gruppi, che sono
  // già bottoni.
  return (
    <div
      className="recap-cartolina"
      role="button"
      tabIndex={0}
      onClick={onApri}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onApri())}
    >
      {idFoto && sfondo && <img className="post-sfondo" src={sfondo} alt="" draggable={false} />}
      {badge && <div className="recap-cartolina-badge">{badge}</div>}
      <div className="recap-cartolina-contenuto">
        <RecapPost voce={voce} onGruppo={onApri} />
      </div>
    </div>
  )
}
