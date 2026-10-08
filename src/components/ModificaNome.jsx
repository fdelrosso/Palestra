import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { NOME_MAX, erroreNome, pulisciNome } from '../lib/social'
import { IconCheck } from './icons'

// ---------------------------------------------------------------------------
// Il nome: come ti vedono gli altri, e con cosa puoi entrare al posto
// dell'email. Sta in "I miei dati", sopra l'username.
//
// Stesso schema di ModificaUsername: il "è libero" si chiede mentre si scrive,
// ma a dire l'ultima parola è l'indice unico sul database.
//
// ⚠️ Due cose che l'username non ha:
//   - si entra col nome, quindi dopo averlo cambiato si entra col NUOVO: va
//     detto, se no al prossimo accesso quello vecchio sembra una password
//     sbagliata;
//   - l'unicità ignora maiuscole e spazi: "capocchia" → "Capocchia" è lo
//     stesso nome, ed è tuo. Chiedere al server direbbe "già preso" (da te).
// ---------------------------------------------------------------------------

export default function ModificaNome() {
  const { utenteCorrente, impostaNome, nomeDisponibile } = useAccount()
  const attuale = utenteCorrente?.nome || ''

  const [valore, setValore] = useState(attuale)
  // La risposta del server insieme al nome a cui si riferisce (vedi
  // ModificaUsername: senza, quella su "capo" si leggerebbe come su "capocchi").
  const [risposta, setRisposta] = useState(null) // { per, libero }
  const [errore, setErrore] = useState('')
  const [salvato, setSalvato] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const pulito = pulisciNome(valore)
  const cambiato = pulito !== attuale
  const sbagliato = erroreNome(pulito)
  const mio = pulito.toLowerCase() === attuale.toLowerCase()
  const verdetto = mio ? { per: pulito, libero: true } : risposta && risposta.per === pulito ? risposta : null
  const controllo = cambiato && !sbagliato && !verdetto

  useEffect(() => {
    if (!cambiato || sbagliato || mio) return
    const t = setTimeout(async () => {
      const esito = await nomeDisponibile(pulito)
      // Rete giù: si tace, e deciderà il salvataggio.
      if (esito.ok) setRisposta({ per: pulito, libero: esito.libero })
    }, 500)
    return () => clearTimeout(t)
  }, [pulito, cambiato, sbagliato, mio, nomeDisponibile])

  const salva = async () => {
    setErrore('')
    setSalvato(false)
    setSalvando(true)
    const esito = await impostaNome(pulito)
    setSalvando(false)
    if (esito.ok) {
      setSalvato(true)
      setRisposta(null)
      setValore(esito.nome)
    } else {
      setErrore(esito.errore)
    }
  }

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="card-titolo">Nome</div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
        È come ti vedono gli amici, e puoi usarlo per entrare al posto dell’email.
      </p>

      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          type="text"
          aria-label="Nome"
          value={valore}
          onChange={(e) => {
            setValore(e.target.value)
            setSalvato(false)
            setErrore('')
          }}
          placeholder="Come ti chiami?"
          maxLength={NOME_MAX}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn"
          disabled={!cambiato || !!sbagliato || controllo || verdetto?.libero === false || salvando}
          onClick={salva}
        >
          Salva
        </button>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        {errore ? (
          errore
        ) : salvato ? (
          <>
            <IconCheck width={12} height={12} /> Ora ti chiami {attuale}. Per entrare usa questo nome,
            o l’email.
          </>
        ) : !cambiato ? (
          'Dev’essere solo tuo: se qualcuno l’ha già preso, te lo diciamo.'
        ) : sbagliato ? (
          sbagliato
        ) : controllo ? (
          'Controllo…'
        ) : verdetto?.libero === false ? (
          `“${pulito}” è già di qualcun altro.`
        ) : (
          `“${pulito}” va bene. Dopo averlo salvato, per entrare userai questo.`
        )}
      </p>
    </div>
  )
}
