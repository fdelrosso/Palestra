import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { voceStorico } from '../lib/storico'
import PostSchermo from '../components/PostSchermo'
import UserGate from './UserGate'

// ---------------------------------------------------------------------------
// Un post aperto da un link (/post/<chiave>) da chi NON ha fatto l'accesso.
//
// Si vede QUEL post e basta: il recap, chi l'ha fatto, quanti mi piace e
// commenti (`post_pubblico` in supabase/schema.sql, l'unica cosa che il
// database lascia leggere senza account, e solo se è pubblico). Tutto il
// resto — mettere mi piace, leggere i commenti, aprire il profilo, guardare
// altri allenamenti — chiede di entrare: "Entra" apre la solita schermata
// d'ingresso, e dopo l'accesso l'app riporta a questo post (App.jsx,
// useProfiloDaLink).
//
// ⚠️ Niente foto: il bucket delle foto resta chiuso a chi non ha un account.
// ---------------------------------------------------------------------------

export default function PostOspite({ chiave }) {
  const [stato, setStato] = useState({ caricato: false, voce: null, interazioni: null })
  const [entra, setEntra] = useState(false)

  useEffect(() => {
    let vivo = true
    supabase.rpc('post_pubblico', { chiave }).then(({ data, error }) => {
      if (!vivo) return
      const r = !error && data?.[0]
      if (!r) return setStato({ caricato: true, voce: null, interazioni: null })
      setStato({
        caricato: true,
        voce: voceStorico({ utenteId: r.user_id, utenteNome: r.nome || '', schedaId: r.scheda_id, completamento: r.dati }),
        interazioni: { miPiace: Number(r.mi_piace) || 0, mio: false, commenti: Number(r.commenti) || 0, ultimo: null },
      })
    })
    return () => {
      vivo = false
    }
  }, [chiave])

  if (entra) return <UserGate />

  const chiediAccesso = () => setEntra(true)

  return (
    <div className="feed-schermo post-ospite">
      {!stato.caricato ? (
        <div className="post-schermo post-vuoto">
          <p>Un attimo…</p>
        </div>
      ) : !stato.voce ? (
        <div className="post-schermo post-vuoto">
          <div className="big">🗒️</div>
          <p>Questo allenamento non c’è più, o non è pubblico.</p>
        </div>
      ) : (
        <PostSchermo
          voce={stato.voce}
          interazioni={stato.interazioni}
          onMiPiace={chiediAccesso}
          onApriMiPiace={chiediAccesso}
          onApriCommenti={chiediAccesso}
        />
      )}

      <div className="post-ospite-invito">
        <p>
          <strong>Progetto Palestra</strong>
          <br />
          Entra per mettere mi piace, commentare e vedere altri allenamenti.
        </p>
        <button className="btn btn-accent" onClick={chiediAccesso}>
          Entra
        </button>
      </div>
    </div>
  )
}
