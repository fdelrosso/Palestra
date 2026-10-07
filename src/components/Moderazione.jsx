import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { avvisiDaLeggere, chiediSblocco, segnaAvvisiLetti } from '../lib/segnalazioni'
import useStatoModerazione, { aggiornaStatoModerazione } from '../hooks/useStatoModerazione'
import { quandoBreve } from '../lib/format'
import { useAccount } from '../store/AccountContext'
import logo from '../assets/logo.png'

// ---------------------------------------------------------------------------
// Quello che vede chi è stato toccato dalla MODERAZIONE (Termini, punto 7;
// lib/segnalazioni):
//   - <AvvisiModerazione>: gli avvisi dei moderatori non ancora letti (un
//     contenuto tolto, con cosa era e perché; uno sblocco; una richiesta non
//     accolta), in un riquadro all'apertura dell'app. "Ho capito" li segna letti;
//   - <BloccoPubblicazione>: il riquadro al posto di quello che non si può
//     più fare (commentare, pubblicare foto), con la richiesta di sblocco;
//   - <AccountBloccato>: la schermata al posto dell'app intera;
//   - <ChiediSblocco>: la richiesta, usata dagli ultimi due.
// ---------------------------------------------------------------------------

/** La richiesta di sblocco: due righe facoltative e un tasto. */
export function ChiediSblocco({ tipo, giaChiesta }) {
  const [messaggio, setMessaggio] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState('')

  if (giaChiesta) {
    return (
      <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
        Richiesta di sblocco inviata: un moderatore la guarderà e ti arriverà un avviso con la
        risposta.
      </p>
    )
  }

  const manda = async (e) => {
    e.preventDefault()
    if (inCorso) return
    setInCorso(true)
    setErrore('')
    const esito = await chiediSblocco(tipo, messaggio)
    setInCorso(false)
    if (!esito.ok) return setErrore(esito.errore)
    aggiornaStatoModerazione()
  }

  return (
    <form onSubmit={manda} style={{ marginTop: 10 }}>
      <textarea
        className="textarea"
        rows={3}
        maxLength={1000}
        value={messaggio}
        placeholder="Vuoi dire qualcosa al moderatore? (facoltativo)"
        onChange={(e) => setMessaggio(e.target.value)}
        aria-label="Messaggio per il moderatore"
      />
      {errore && <p className="form-error" style={{ margin: '6px 2px 0' }}>{errore}</p>}
      <button type="submit" className="btn btn-block" style={{ marginTop: 8 }} disabled={inCorso}>
        {inCorso ? 'Invio…' : 'Chiedi lo sblocco'}
      </button>
    </form>
  )
}

/** Al posto di quello che non si può fare con la pubblicazione bloccata. */
export function BloccoPubblicazione({ ioId, compatto = false }) {
  const stato = useStatoModerazione(ioId)
  const [aperto, setAperto] = useState(false)
  if (!stato.pubblicazioneBloccata) return null
  return (
    <div className="card blocco-moderazione">
      <strong style={{ fontSize: 14 }}>Non puoi pubblicare nel Feed</strong>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', lineHeight: 1.45 }}>
        Ti sono stati tolti {stato.tolti} contenuti contrari alle regole della community: commenti,
        foto e allenamenti pubblici sono bloccati. Puoi continuare ad allenarti e a usare il resto
        dell’app.
      </p>
      {compatto && !aperto && !stato.richiestaPubblicazione ? (
        <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setAperto(true)}>
          Chiedi lo sblocco
        </button>
      ) : (
        <ChiediSblocco tipo="pubblicazione" giaChiesta={stato.richiestaPubblicazione} />
      )}
    </div>
  )
}

/** Gli avvisi non letti, in un riquadro che si chiude con "Ho capito". */
export function AvvisiModerazione({ ioId }) {
  const [avvisi, setAvvisi] = useState([])

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const leggi = () => avvisiDaLeggere().then((a) => vivo && setAvvisi(a))
    leggi()
    const torna = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', torna)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', torna)
    }
  }, [ioId])

  if (avvisi.length === 0) return null

  const capito = async () => {
    const ids = avvisi.map((a) => a.id)
    setAvvisi([])
    await segnaAvvisiLetti(ids)
    aggiornaStatoModerazione()
  }

  return createPortal(
    <div className="modal-backdrop" style={{ zIndex: 1300, alignItems: 'center' }}>
      <div className="modal" role="alertdialog" aria-label="Avvisi dei moderatori">
        <h3 style={{ marginBottom: 4 }}>{avvisi.length === 1 ? avvisi[0].titolo : 'Avvisi dai moderatori'}</h3>
        <div className="stack" style={{ gap: 10, margin: '8px 0 16px' }}>
          {avvisi.map((a) => (
            <div key={a.id}>
              {avvisi.length > 1 && <strong style={{ fontSize: 14 }}>{a.titolo}</strong>}
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: '2px 0 0' }}>{a.testo}</p>
              <span className="faint" style={{ fontSize: 12 }}>{quandoBreve(a.creataIl)}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
          Le regole sono nei{' '}
          <a href="/termini" target="_blank" rel="noreferrer">
            Termini di servizio
          </a>
          , punto 7.
        </p>
        <button className="btn btn-block" onClick={capito}>
          Ho capito
        </button>
      </div>
    </div>,
    document.body,
  )
}

/** Al posto dell'app intera, con l'account bloccato. */
export function AccountBloccato({ ioId }) {
  const stato = useStatoModerazione(ioId)
  const { cambiaUtente } = useAccount()
  return (
    <div className="app">
      <div className="gate">
        <div className="gate-head">
          <div className="gate-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <h1 style={{ fontSize: 22, margin: '8px 0 4px' }}>Account bloccato</h1>
        </div>
        <div className="card">
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Ti sono stati tolti {stato.tolti} contenuti contrari alle regole della community, e
            come dicono i{' '}
            <a href="/termini" target="_blank" rel="noreferrer">
              Termini di servizio
            </a>{' '}
            (punto 7) l’account è bloccato. Le tue schede e i tuoi dati restano dove sono.
          </p>
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Se pensi che sia un errore, o vuoi spiegare, chiedi lo sblocco: decide un moderatore.
          </p>
          <ChiediSblocco tipo="account" giaChiesta={stato.richiestaAccount} />
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => cambiaUtente()}>
          Esci
        </button>
        {/* Il diritto di cancellare i propri dati resta anche da bloccati. */}
        <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', margin: '10px 0 0' }}>
          Per eliminare l’account e i tuoi dati scrivi a{' '}
          <a href="mailto:info@progettopalestra.it">info@progettopalestra.it</a>.
        </p>
      </div>
    </div>
  )
}
