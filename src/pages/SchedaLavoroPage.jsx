import { useEffect, useState } from 'react'
import { goBack, routes } from '../lib/router'
import { leggiSchedaLavoro } from '../lib/schedeLavoro'
import { prendiBozzaPerAtleta, BOZZA_LAVORO } from '../lib/proposteScheda'
import { nuovaScheda } from '../data/model'
import EditorPage from './EditorPage'
import { IconBack } from '../components/icons'

// ---------------------------------------------------------------------------
// Una scheda di lavoro del PT nell'editor (/lavoro/schede/:id). `nuova`: da
// zero, o dalla bozza lasciata da chi porta qui (testo incollato, o una scheda
// già inviata copiata fra quelle da inviare). Le altre si caricano dal database.
// ---------------------------------------------------------------------------

export default function SchedaLavoroPage({ id }) {
  const nuova = id === 'nuova'
  const [stato, setStato] = useState(() => {
    if (!nuova) return { scheda: null, caricando: true }
    const bozza = prendiBozzaPerAtleta(BOZZA_LAVORO)
    return {
      scheda: bozza
        ? { ...structuredClone(bozza), id: nuovaScheda().id, completamenti: [], settimanaCorrente: 1 }
        : nuovaScheda({ nome: '', numeroSettimane: 5 }),
      caricando: false,
    }
  })

  useEffect(() => {
    if (nuova) return
    let vivo = true
    leggiSchedaLavoro(id).then((scheda) => vivo && setStato({ scheda, caricando: false }))
    return () => {
      vivo = false
    }
  }, [id, nuova])

  if (stato.scheda) return <EditorPage lavoro={{ scheda: stato.scheda, nuova }} />

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" aria-label="Indietro" onClick={() => goBack(routes.schedeLavoro())}>
          <IconBack />
        </button>
        <h1>Scheda di lavoro</h1>
      </div>
      <div className="empty">
        <p>{stato.caricando ? 'Un attimo…' : 'Questa scheda non c’è più.'}</p>
      </div>
    </div>
  )
}
