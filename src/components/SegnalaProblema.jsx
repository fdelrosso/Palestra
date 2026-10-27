import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAccount } from '../store/AccountContext'

// ---------------------------------------------------------------------------
// "Segnala un problema": la finestra che si apre dal tasto accanto all'avatar
// nella testata (TestataApp), quindi da ogni sezione dell'app. Chi la usa
// scrive un errore, un bug o una miglioria, e il messaggio arriva per mail a
// info@progettopalestra.it (la funzione di Vercel in api/segnala.js).
//
// ⚠️ Va in un portale sul body: la testata è appiccicata in alto con un suo
// z-index, e una finestra dentro di lei resterebbe sotto alla pagina.
// ⚠️ In locale (npm run dev) /api non esiste: l'invio funziona solo online.
// ---------------------------------------------------------------------------

const TIPI = [
  { id: 'bug', nome: 'Errore / bug' },
  { id: 'miglioria', nome: 'Miglioria' },
  { id: 'altro', nome: 'Altro' },
]
const MAX_CARATTERI = 3000

// Manda il messaggio a api/segnala (la mail a info@). La usa anche la domanda
// di fine allenamento (components/FeedbackAllenamento). `pagina`: dove si era,
// di base l'indirizzo di adesso. Se non va, lancia un errore da far leggere.
export async function inviaSegnalazione({ tipo, testo, nome = '', pagina = window.location.pathname }) {
  let r
  let risposta
  try {
    const { data } = await supabase.auth.getSession()
    r = await fetch('/api/segnala', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ tipo, testo: testo.trim(), pagina, nome }),
    })
    risposta = await r.json().catch(() => ({}))
  } catch (err) {
    throw new Error(err.message === 'Failed to fetch' ? 'Sei offline? Riprova appena hai rete' : err.message)
  }
  // Anche `ok` nella risposta: una pagina HTML al posto della funzione
  // (in locale, o una rotta sbagliata) non deve sembrare un invio riuscito.
  if (!r.ok || !risposta.ok) throw new Error(risposta.errore || 'Invio non riuscito, riprova più tardi')
}

export default function SegnalaProblema({ onChiudi }) {
  const { utenteCorrente } = useAccount()
  const [tipo, setTipo] = useState('bug')
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState('scrivo') // scrivo | invio | inviato
  const [errore, setErrore] = useState('')
  const casella = useRef(null)

  useEffect(() => {
    casella.current?.focus()
    const esc = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  const pronto = testo.trim().length >= 5 && stato === 'scrivo'

  const invia = async (e) => {
    e.preventDefault()
    if (!pronto) return
    setStato('invio')
    setErrore('')
    try {
      await inviaSegnalazione({ tipo, testo, nome: utenteCorrente?.nome || '' })
      setStato('inviato')
    } catch (err) {
      setErrore(err.message)
      setStato('scrivo')
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal segnala"
        role="dialog"
        aria-label="Segnala un problema"
        onClick={(e) => e.stopPropagation()}
      >
        {stato === 'inviato' ? (
          <>
            <h3>Grazie!</h3>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 14px' }}>
              Il messaggio è arrivato. Se serve, ti rispondiamo all'email del tuo account.
            </p>
            <button type="button" className="btn btn-accent" style={{ width: '100%' }} onClick={onChiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <form onSubmit={invia}>
            <h3>Segnala un problema</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '-4px 0 12px' }}>
              Hai trovato un errore, qualcosa che non torna o un'idea per migliorare l'app? Scrivilo
              qui: arriva a info@progettopalestra.it.
            </p>
            <div className="segmented" style={{ marginBottom: 10 }} role="radiogroup" aria-label="Di cosa si tratta">
              {TIPI.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t.id}
                  className={`seg-btn${tipo === t.id ? ' on' : ''}`}
                  onClick={() => setTipo(t.id)}
                >
                  {t.nome}
                </button>
              ))}
            </div>
            <textarea
              ref={casella}
              className="textarea"
              rows={6}
              maxLength={MAX_CARATTERI}
              placeholder={
                tipo === 'miglioria'
                  ? 'Cosa ti piacerebbe trovare, o cambiare?'
                  : 'Cosa è successo? Dove eri e cosa stavi facendo?'
              }
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              aria-label="Il tuo messaggio"
            />
            {errore && (
              <p className="segnala-errore" role="alert">
                {errore}
              </p>
            )}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button type="button" className="btn grow" onClick={onChiudi}>
                Annulla
              </button>
              <button type="submit" className="btn btn-accent grow" disabled={!pronto}>
                {stato === 'invio' ? 'Invio…' : 'Invia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
