import { useEffect, useState } from 'react'
import { routes, vaiASezione } from '../lib/router'
import { useAppuntamentiDaDecidere } from '../lib/appuntamenti'
import { allungamentiDaDecidere, rinnoviDaDecidere } from '../lib/proposteScheda'
import { useAccount } from '../store/AccountContext'
import useModalitaPt from '../hooks/useModalitaPt'

// ---------------------------------------------------------------------------
// Le due macrosezioni del profilo di un personal trainer.
//
//   Personale — l'app di sempre: le SUE schede, i SUOI allenamenti, la dieta.
//               Un PT resta uno che si allena.
//   Lavoro    — gli altri: gli atleti che segue, le loro schede e i loro
//               allenamenti.
//
// Compare solo a chi è un PT: per tutti gli altri non esiste un "lavoro", e un
// interruttore con un lato solo sarebbe rumore. Il pallino sulla linguetta
// Lavoro segnala le richieste da accettare.
//
// Muove la stessa modalità del tasto nel Profilo (hooks/useModalitaPt): in
// modalità PT la Home È Lavoro, quindi entrambi i lati portano alla Home.
// ---------------------------------------------------------------------------

export default function ModoPtSwitch({ attivo }) {
  const { richiesteLavoro, utenteCorrente } = useAccount()
  const { sonoPt, soloPt, passaA } = useModalitaPt()
  // Dal lato Personale si vede anche cosa aspetta in Lavoro: appuntamenti
  // dove tocca a lui da PT, rinnovi e allungamenti da decidere (2026-10-28).
  const io = sonoPt && !soloPt ? utenteCorrente?.id : null
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
  // Un solo PT non ha il lato Personale: l'interruttore avrebbe un lato solo.
  if (!sonoPt || soloPt) return null

  const daRispondere = richiesteLavoro.ricevute.length + appuntamenti + rinnovi

  return (
    <div className="segmented" style={{ margin: '2px 0 14px' }}>
      <button
        className={'seg-btn' + (attivo === 'personale' ? ' on' : '')}
        onClick={() => {
          passaA('atleta')
          vaiASezione(routes.inizio())
        }}
        aria-pressed={attivo === 'personale'}
      >
        Personale
      </button>
      <button
        className={'seg-btn' + (attivo === 'lavoro' ? ' on' : '')}
        onClick={() => {
          passaA('pt')
          vaiASezione(routes.inizio())
        }}
        aria-pressed={attivo === 'lavoro'}
      >
        Lavoro
        {daRispondere > 0 && <span className="pallino-notifica">{daRispondere}</span>}
      </button>
    </div>
  )
}
