import { useEffect, useState } from 'react'
import { routes, vaiASezione } from '../lib/router'
import { useAppuntamentiDaDecidere } from '../lib/appuntamenti'
import { allungamentiDaDecidere, rinnoviDaDecidere } from '../lib/proposteScheda'
import { useAccount } from '../store/AccountContext'
import useModalitaPt from '../hooks/useModalitaPt'
import { IconCoach, IconDumbbell } from './icons'

// ---------------------------------------------------------------------------
// Atleta | PT, in alto a destra nel Profilo di chi è "Tutti e due": l'app
// diventa quella di un solo atleta o di un solo PT (hooks/useModalitaPt) e si
// riparte dalla sua Home. Da Atleta il pallino su PT dice cosa aspetta dal
// lato lavoro: richieste, appuntamenti, rinnovi e allungamenti da decidere.
// ---------------------------------------------------------------------------

export default function ModoPtSwitch() {
  const { richiesteLavoro, utenteVero } = useAccount()
  const { modoPt, dueRuoli, passaA } = useModalitaPt()
  const io = dueRuoli ? utenteVero?.id : null
  const appuntamenti = useAppuntamentiDaDecidere(io, 'pt')
  const [rinnovi, setRinnovi] = useState(0)
  useEffect(() => {
    let vivo = true
    if (io)
      Promise.all([rinnoviDaDecidere(io), allungamentiDaDecidere(io)]).then(
        ([r, a]) => vivo && setRinnovi(r.length + a.length),
      )
    return () => {
      vivo = false
    }
  }, [io])
  if (!dueRuoli) return null

  const daRispondere = richiesteLavoro.ricevute.length + appuntamenti + rinnovi
  const vai = (m) => {
    if ((m === 'pt') === modoPt) return
    passaA(m)
    vaiASezione(routes.inizio())
  }

  return (
    <div className="segmented modo-profilo" role="radiogroup" aria-label="Modalità dell’app">
      <button
        type="button"
        role="radio"
        className={'seg-btn' + (modoPt ? '' : ' on')}
        aria-checked={!modoPt}
        onClick={() => vai('atleta')}
      >
        <IconDumbbell width={15} height={15} /> Atleta
      </button>
      <button
        type="button"
        role="radio"
        className={'seg-btn' + (modoPt ? ' on' : '')}
        aria-checked={modoPt}
        onClick={() => vai('pt')}
      >
        <IconCoach width={15} height={15} /> PT
        {!modoPt && daRispondere > 0 && <span className="pallino-notifica">{daRispondere}</span>}
      </button>
    </div>
  )
}
