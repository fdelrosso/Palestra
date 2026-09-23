import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { normalizzaUsername, usernameBenFormato } from '../lib/social'
import { IconCheck } from './icons'

// ---------------------------------------------------------------------------
// L'username: la maniglia con cui gli altri ti trovano.
//
// Sta dentro "I miei dati" perché è un dato del profilo come il peso — e come
// quello, è uno solo e vale ovunque.
//
// ⚠️ Perché esiste, visto che c'è già il nome: il nome si cerca solo scritto
// per intero, e deve restare così, se no chiunque può ricavarsi l'elenco degli
// iscritti provando le lettere. L'username invece si cerca a pezzi, perché uno
// se lo sceglie apposta per farsi trovare. Vedi il commento in testa a
// src/pages/CercaPage.jsx.
//
// ⚠️ Il "è libero" si chiede mentre si scrive, ma NON è la garanzia: fra il
// controllo e il salvataggio qualcun altro può prenderlo. A dire l'ultima
// parola è l'indice unico sul database, e l'errore che torna si mostra.
// ---------------------------------------------------------------------------

export default function ModificaUsername() {
  const { utenteCorrente, impostaUsername, usernameDisponibile } = useAccount()
  const attuale = utenteCorrente?.username || ''

  const [valore, setValore] = useState(attuale)
  // ⚠️ La risposta del server si tiene INSIEME all'username a cui si riferisce.
  // Senza, la risposta su "fili" arriva mentre si è già scritto "filippo" e si
  // legge come se parlasse di quello: è il modo classico per dire "occupato" a
  // chi aveva scritto un username libero.
  const [risposta, setRisposta] = useState(null) // { per, libero }
  const [errore, setErrore] = useState('')
  const [salvato, setSalvato] = useState(false)

  const pulito = normalizzaUsername(valore)
  const cambiato = pulito !== attuale
  const formaOk = usernameBenFormato(pulito)
  // Lo stato si DEDUCE, non si scrive: niente da tenere allineato, e quando
  // cambia una lettera il verdetto vecchio smette da solo di valere.
  const verdetto = risposta && risposta.per === pulito ? risposta : null
  const controllo = cambiato && formaOk && !verdetto

  // Si chiede al server mezzo secondo dopo l'ultima lettera: una richiesta per
  // ogni tasto sarebbe una raffica, e la risposta della prima arriverebbe dopo
  // quella dell'ultima.
  useEffect(() => {
    if (!cambiato || !formaOk) return
    const t = setTimeout(async () => {
      const esito = await usernameDisponibile(pulito)
      // Rete giù: non si dice "occupato", che manderebbe a cambiare un username
      // che era libero. Si tace, e deciderà il salvataggio.
      if (esito.ok) setRisposta({ per: pulito, libero: esito.libero })
    }, 500)
    return () => clearTimeout(t)
  }, [pulito, cambiato, formaOk, usernameDisponibile])

  const salva = async () => {
    setErrore('')
    setSalvato(false)
    const esito = await impostaUsername(pulito)
    if (esito.ok) {
      setSalvato(true)
      setRisposta(null)
    } else {
      setErrore(esito.errore)
    }
  }

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="card-titolo">Username</div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
        È così che ti trovano nella sezione Cerca. Si può cercare anche a pezzi.
      </p>

      <div className="row" style={{ gap: 8 }}>
        <span className="chip chip-nota" aria-hidden="true">@</span>
        <input
          type="text"
          value={valore}
          onChange={(e) => {
            setValore(e.target.value)
            setSalvato(false)
            setErrore('')
          }}
          placeholder="filippo"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn"
          disabled={!cambiato || !formaOk || controllo || verdetto?.libero === false}
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
            <IconCheck width={12} height={12} /> Ora sei @{attuale}.
          </>
        ) : !cambiato ? (
          'Da 3 a 20 caratteri: lettere minuscole, numeri e underscore.'
        ) : !formaOk ? (
          'Da 3 a 20 caratteri: lettere minuscole, numeri e underscore.'
        ) : controllo ? (
          `Controllo…`
        ) : verdetto?.libero === false ? (
          `@${pulito} è già di qualcun altro.`
        ) : verdetto?.libero ? (
          `@${pulito} è libero.`
        ) : (
          `Diventerai @${pulito}.`
        )}
      </p>
    </div>
  )
}
