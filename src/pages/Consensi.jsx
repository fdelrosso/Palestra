import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { CaselleConsenso } from '../components/Legale'
import logo from '../assets/logo.png'

// Chi aveva l'account da prima dei consensi, o ha accettato testi poi cambiati
// nella sostanza, li da' qui: una volta, prima di entrare (vedi lib/consensi e
// Root in App.jsx). Non si salta, perche' senza il consenso sui dati sulla
// salute l'app non li puo' trattare: l'alternativa e' uscire.
//
// ⚠️ Serve la rete: il consenso si salva nell'account, non sul telefono. Chi
// apre l'app senza rete se lo sente dire dall'errore, e lo da' alla prossima.
export default function Consensi() {
  const { utenteCorrente, daiConsensi, cambiaUtente } = useAccount()
  const [termini, setTermini] = useState(false)
  const [salute, setSalute] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')

  const conferma = async (e) => {
    e.preventDefault()
    if (invio || !termini || !salute) return
    setInvio(true)
    setErrore('')
    const esito = await daiConsensi()
    // Se va, questa pagina sparisce da sola (Root non la mostra piu').
    if (!esito.ok) {
      setInvio(false)
      setErrore(esito.errore)
    }
  }

  return (
    <div className="app">
      <div className="gate">
        <div className="gate-head">
          <div className="gate-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <h1>Privacy e termini</h1>
          <p className="muted">
            {utenteCorrente?.nome ? `${utenteCorrente.nome}, prima` : 'Prima'} di continuare servono
            due conferme. Te le chiediamo una volta, e di nuovo solo se i testi cambiano nella
            sostanza.
          </p>
        </div>

        <form className="card mt-16" onSubmit={conferma}>
          <CaselleConsenso
            termini={termini}
            salute={salute}
            onTermini={(v) => {
              setTermini(v)
              setErrore('')
            }}
            onSalute={(v) => {
              setSalute(v)
              setErrore('')
            }}
          />
          {errore && <p className="form-error">{errore}</p>}
          <button
            type="submit"
            className="btn btn-accent btn-lg btn-block"
            disabled={invio || !termini || !salute}
          >
            {invio ? 'Un attimo…' : 'Continua'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-block mt-8" onClick={cambiaUtente}>
            Esci
          </button>
        </form>

        <p className="muted gate-nota">
          Se non vuoi accettare puoi uscire. Per cancellare l’account e tutti i tuoi dati scrivi a{' '}
          <a href="mailto:info@progettopalestra.it">info@progettopalestra.it</a>.
        </p>
      </div>
    </div>
  )
}
