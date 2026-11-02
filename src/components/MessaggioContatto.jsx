import { useState } from 'react'
import { createPortal } from 'react-dom'

// ---------------------------------------------------------------------------
// Il testo libero del contatto fra atleta e PT (lib/contattiPt): niente frasi
// fisse, chi contatta o risponde scrive quello che vuole. `onInvia(testo)`
// torna { ok, errore }; andata bene, a chiudere ci pensa chi la apre.
// ---------------------------------------------------------------------------

export default function MessaggioContatto({ titolo, testoInvio = 'Invia', onInvia, onChiudi }) {
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')

  const invia = async (e) => {
    e.preventDefault()
    if (invio || !testo.trim()) return
    setInvio(true)
    const esito = await onInvia(testo)
    setInvio(false)
    if (!esito.ok) setErrore(esito.errore)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <form className="modal stack" style={{ gap: 10 }} onSubmit={invia} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 2 }}>{titolo}</h3>
        <textarea
          className="textarea"
          autoFocus
          rows={4}
          maxLength={4000}
          value={testo}
          placeholder="Scrivi il tuo messaggio…"
          onChange={(e) => {
            setTesto(e.target.value)
            setErrore('')
          }}
        />
        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onChiudi}>
            Annulla
          </button>
          <button type="submit" className="btn btn-accent" style={{ flex: 1 }} disabled={invio || !testo.trim()}>
            {invio ? 'Invio…' : testoInvio}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
