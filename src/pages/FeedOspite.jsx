import { useEffect, useState } from 'react'
import PostSchermo from '../components/PostSchermo'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
import { chiediAccount } from '../lib/ospite'
import { leggiFeedOspite } from '../lib/feedOspite'

// Il feed vero per l'ospite (lib/ospite): i post pubblici degli account
// pubblici, in sola lettura. Mi piace, commenti, condividere, aprire il
// recap → "Crea un account" (components/Ospite, FoglioAccount).

const chiedi = () => chiediAccount('feed')

export default function FeedOspite() {
  const [stato, setStato] = useState({ caricando: true, ok: true, post: [], ancora: false, dopo: null })

  const leggi = (dopo, prima = []) => {
    setStato((s) => ({ ...s, caricando: true }))
    leggiFeedOspite(dopo).then((r) => setStato({ caricando: false, ok: r.ok, post: [...prima, ...r.post], ancora: r.ancora, dopo: r.dopo }))
  }

  useEffect(() => {
    let vivo = true
    leggiFeedOspite(null).then((r) => vivo && setStato({ caricando: false, ok: r.ok, post: r.post, ancora: r.ancora, dopo: r.dopo }))
    return () => {
      vivo = false
    }
  }, [])

  if (stato.post.length === 0) {
    return (
      <div className="feed-schermo">
        <div className="post-schermo post-vuoto">
          {stato.caricando ? <p>Un attimo…</p> : <p>{stato.ok ? 'Nessun allenamento pubblico, per ora.' : 'Non sono riuscito a caricare il feed.'}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="feed-schermo">
      {stato.post.map((p) => (
        <PostSchermo
          key={`${p.voce.utenteId}-${chiaveAllenamento(p.voce)}`}
          voce={p.voce}
          foto={p.foto}
          interazioni={p.interazioni}
          onApri={chiedi}
          onMiPiace={chiedi}
          onApriMiPiace={chiedi}
          onApriCommenti={chiedi}
          onCondividi={chiedi}
        />
      ))}
      <div className="feed-fondo">
        {stato.caricando ? (
          <p className="muted">Un attimo…</p>
        ) : stato.ancora ? (
          <button type="button" className="btn btn-ghost" onClick={() => leggi(stato.dopo, stato.post)}>
            Altri allenamenti
          </button>
        ) : null}
      </div>
    </div>
  )
}
