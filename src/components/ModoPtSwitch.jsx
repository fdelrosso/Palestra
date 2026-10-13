import { routes, vaiASezione } from '../lib/router'
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
  const { richiesteLavoro } = useAccount()
  const { sonoPt, passaA } = useModalitaPt()
  if (!sonoPt) return null

  const daRispondere = richiesteLavoro.ricevute.length

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
