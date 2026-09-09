import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { isPt } from '../lib/pt'

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
// ---------------------------------------------------------------------------

export default function ModoPtSwitch({ attivo }) {
  const { utenteCorrente, richiesteLavoro } = useAccount()
  if (!isPt(utenteCorrente)) return null

  const daRispondere = richiesteLavoro.ricevute.length

  return (
    <div className="segmented" style={{ margin: '2px 0 14px' }}>
      <button
        className={'seg-btn' + (attivo === 'personale' ? ' on' : '')}
        onClick={() => navigate(routes.calendario())}
        aria-pressed={attivo === 'personale'}
      >
        Personale
      </button>
      <button
        className={'seg-btn' + (attivo === 'lavoro' ? ' on' : '')}
        onClick={() => navigate(routes.lavoro())}
        aria-pressed={attivo === 'lavoro'}
      >
        Lavoro
        {daRispondere > 0 && <span className="pallino-notifica">{daRispondere}</span>}
      </button>
    </div>
  )
}
