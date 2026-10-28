import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { CHIAVE_FEEDBACK, deveChiedereFeedback } from '../lib/feedbackAllenamento'
import { inviaSegnalazione } from './SegnalaProblema'

// ---------------------------------------------------------------------------
// "È andato tutto bene?": dopo aver salvato un allenamento (l'ultimo passo,
// "Chi può vederlo?", components/Riepilogo) compare da sola una casella per
// dirci com'è andata. Il messaggio arriva per mail come "Segnala un problema"
// (components/SegnalaProblema → api/segnala.js), col tipo `feedback`.
//
// QUANDO: lo decide lib/feedbackAllenamento (la prima volta subito, poi una
// volta a settimana al massimo). Si segna appena compare, non quando si
// invia: chi la chiude con "Non ora" non se la ritrova al prossimo.
//
// Sta in App e non nel riepilogo: dopo la scelta l'allenamento si chiude
// e si torna alla scheda o alla Home, e la domanda compare lì, sopra la
// pagina in cui si arriva. Il riepilogo la chiede con `chiediFeedback()`.
// ---------------------------------------------------------------------------

const EVENTO = 'palestra:feedback-allenamento'
const MAX_CARATTERI = 3000
// Il tempo di uscire dall'allenamento: la finestra arriva sulla pagina nuova,
// non sopra quella che sta sparendo.
const RITARDO_MS = 700

// Per vederla in locale senza toccare le preferenze (che sono quelle vere, sul
// database di tutti): con `npm run dev`, `?feedback` nell'indirizzo la apre
// subito, e "Invia" non manda niente ma fa vedere il grazie. Online
// `import.meta.env.DEV` è falso e il parametro non fa nulla.
const PROVA = import.meta.env.DEV && new URLSearchParams(window.location.search).has('feedback')

// Dal riepilogo, salvato l'allenamento. `nome`: quello del giorno, per la mail.
export function chiediFeedback(nome = '') {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { nome } }))
}

export default function FeedbackAllenamento() {
  const { preferenze, aggiornaPreferenze, statoCloud } = useStore()
  const { utenteCorrente } = useAccount()
  const [aperta, setAperta] = useState(() => (PROVA ? { nome: 'prova in locale' } : null)) // null | { nome }
  // Le preferenze lette nel momento dell'evento, non quelle di quando ci si
  // è messi in ascolto.
  const stato = useRef({})
  useEffect(() => {
    stato.current = { avvisi: preferenze?.avvisi, statoCloud, aggiornaPreferenze }
  }, [preferenze, statoCloud, aggiornaPreferenze])

  useEffect(() => {
    let timer = null
    const chiedi = (e) => {
      const { avvisi, statoCloud: cloud, aggiornaPreferenze: aggiorna } = stato.current
      // Con le preferenze non ancora arrivate dal cloud non si sa se l'ha già vista.
      if (cloud === 'caricamento' || !deveChiedereFeedback(avvisi?.[CHIAVE_FEEDBACK])) return
      aggiorna((p) => ({ avvisi: { ...p.avvisi, [CHIAVE_FEEDBACK]: new Date().toISOString() } }))
      const nome = typeof e.detail?.nome === 'string' ? e.detail.nome : ''
      clearTimeout(timer)
      timer = setTimeout(() => setAperta({ nome }), RITARDO_MS)
    }
    window.addEventListener(EVENTO, chiedi)
    return () => {
      window.removeEventListener(EVENTO, chiedi)
      clearTimeout(timer)
    }
  }, [])

  if (!aperta) return null
  return <Finestra nomeAllenamento={aperta.nome} nome={utenteCorrente?.nome || ''} onChiudi={() => setAperta(null)} />
}

function Finestra({ nomeAllenamento, nome, onChiudi }) {
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState('scrivo') // scrivo | invio | inviato
  const [errore, setErrore] = useState('')

  useEffect(() => {
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
      if (PROVA) {
        setStato('inviato')
        return
      }
      await inviaSegnalazione({
        tipo: 'feedback',
        testo,
        nome,
        pagina: `fine allenamento${nomeAllenamento ? ` · ${nomeAllenamento}` : ''}`,
      })
      setStato('inviato')
    } catch (err) {
      setErrore(err.message)
      setStato('scrivo')
    }
  }

  // Niente chiusura toccando fuori: è comparsa da sola, e un tocco distratto
  // mentre si scrive la farebbe sparire. Si chiude con "Non ora" o Esc.
  return createPortal(
    <div className="modal-backdrop al-centro">
      <div className="modal segnala feedback-allenamento" role="dialog" aria-label="È andato tutto bene?">
        {stato === 'inviato' ? (
          <>
            <h3>Grazie mille per il tuo feedback</h3>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 14px' }}>
              Ci aiuterà a migliorare l’app. Se necessario, risponderemo tramite email.
            </p>
            <button type="button" className="btn btn-accent" style={{ width: '100%' }} onClick={onChiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <form onSubmit={invia}>
            <h3>È andato tutto bene?</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '-4px 0 12px' }}>
              Hai dei feedback da darci? Qualcosa che non ha funzionato, che ti è mancato o che ti è
              piaciuto: scrivilo qui, lo leggiamo noi.
            </p>
            <textarea
              className="textarea"
              rows={5}
              maxLength={MAX_CARATTERI}
              placeholder="Com’è andata con l’app oggi?"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              aria-label="Il tuo feedback"
            />
            {errore && (
              <p className="segnala-errore" role="alert">
                {errore}
              </p>
            )}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button type="button" className="btn grow" onClick={onChiudi}>
                Non ora
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
