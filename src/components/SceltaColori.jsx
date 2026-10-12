import { useState } from 'react'
import { MODI, modoAttuale, scriviModo } from '../lib/tema'

// ---------------------------------------------------------------------------
// L'aspetto, nella pagina Profilo: sfondo nero (il default) o bianco. Il
// colore dell'app e' sempre il celeste. Si applica al tocco, senza "Salva".
// ---------------------------------------------------------------------------

export default function SceltaColori() {
  const [modo, setModo] = useState(modoAttuale)

  const cambia = (nuovo) => {
    scriviModo(nuovo)
    setModo(nuovo)
  }

  return (
    <div className="segmented" role="radiogroup" aria-label="Sfondo">
      {MODI.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={modo === m.id}
          className={'seg-btn' + (modo === m.id ? ' on' : '')}
          onClick={() => cambia(m.id)}
        >
          {m.nome}
        </button>
      ))}
    </div>
  )
}
