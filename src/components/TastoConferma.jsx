import { useState } from 'react'

// Un tasto per un gesto senza ritorno (cancellare un allenamento, annullare
// quello in corso) che chiede conferma DENTRO la pagina: al primo tocco il
// tasto diventa la domanda, con "Sì" e "No" lì dove c'era.
//
// ⚠️ Perché non `confirm()`: la finestra del browser è l'unico pezzo di questi
// tasti che non dipende dall'app ma dal telefono, e dove non compare
// (app installata su iPhone, browser dentro altre app) `confirm()` risponde
// "no" da solo, senza far vedere niente — il tasto sembra morto. È successo
// proprio con "Cancella questo allenamento" e "Annulla allenamento".
export default function TastoConferma({
  etichetta,
  domanda,
  si = 'Sì, cancella',
  no = 'No',
  onConferma,
  className = 'btn btn-ghost btn-danger btn-block',
  style,
}) {
  const [chiede, setChiede] = useState(false)

  if (!chiede) {
    return (
      <button type="button" className={className} style={style} onClick={() => setChiede(true)}>
        {etichetta}
      </button>
    )
  }
  return (
    <div className="conferma" role="group" aria-label={domanda} style={style}>
      <p className="conferma-domanda">{domanda}</p>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm grow" onClick={() => setChiede(false)} autoFocus>
          {no}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger-pieno grow"
          onClick={() => {
            setChiede(false)
            onConferma()
          }}
        >
          {si}
        </button>
      </div>
    </div>
  )
}
