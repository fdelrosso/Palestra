import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { IconCheck } from '../components/icons'
import logo from '../assets/logo.png'

// ---------------------------------------------------------------------------
// La schermata di chi arriva dal link della mail di conferma.
//
// Il link lo legge AccountContext (lib/linkEmail) prima ancora di chiedere
// la sessione; qui si dice soltanto com'e' andata. Se e' andata bene la
// sessione c'e' gia', e "Entra" porta dentro.
//
// ⚠️ Il link si apre spesso in un posto diverso da dove ci si e' registrati:
// il browser del telefono invece dell'app installata, il browser interno di
// Gmail. La sessione nasce QUI, non la'. Per questo la nota in fondo: chi torna
// nell'app dove aspettava "Controlla la posta" viene fatto entrare da quella
// schermata (UserGate), che si ricorda email e password finche' e' aperta.
//
// ⚠️ Link "scaduto o gia' usato" non vuol dire per forza "non confermato":
// certi programmi di posta aprono i link da soli per controllarli, e cosi' la
// conferma avviene prima del clic. Per questo si dice di provare ad accedere.
//
// ⚠️ Qui finiscono anche i link scaduti di cui non si sa lo scopo: Supabase,
// quando un link non vale, spesso non dice se era una conferma o un recupero
// password (vedi lib/linkEmail). Per quelli si offrono tutte e due le strade.
// ---------------------------------------------------------------------------

export default function ConfermaEmail() {
  const { daLink, chiudiLink } = useAccount()
  const stato = daLink?.stato
  // Un errore senza scopo: poteva essere anche il link della password.
  const scopoIgnoto = !daLink?.scopo

  const entra = () => {
    chiudiLink()
    navigate(routes.calendario())
  }

  const passwordDimenticata = () => {
    chiudiLink()
    navigate(routes.passwordDimenticata())
  }

  return (
    <div className="app">
      <div className="gate">
        <div className="gate-aurora" aria-hidden="true">
          <span />
          <span />
        </div>

        <div className="gate-head">
          <div className="gate-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          {stato === 'in-corso' && <p className="muted">Sto confermando la tua email…</p>}
          {stato === 'ok' && (
            <>
              <h1 className="row" style={{ justifyContent: 'center', gap: 8 }}>
                <IconCheck width={26} height={26} style={{ color: 'var(--accent)' }} />
                Email confermata
              </h1>
              <p className="muted">Il tuo account è pronto: puoi iniziare ad allenarti.</p>
            </>
          )}
          {stato === 'errore' && (
            <>
              <h1>Link non valido</h1>
              <p className="muted">{daLink.errore}</p>
            </>
          )}
        </div>

        {stato === 'ok' && (
          <>
            <button className="btn btn-accent btn-lg btn-block mt-16" onClick={entra}>
              Entra
            </button>
            <p className="muted gate-nota">
              Hai creato l’account dall’app installata sul telefono? Puoi anche tornare lì: ti fa
              entrare da sola.
            </p>
          </>
        )}

        {stato === 'errore' && (
          <>
            <button className="btn btn-accent btn-lg btn-block mt-16" onClick={entra}>
              Vai all’accesso
            </button>
            {scopoIgnoto && (
              <button className="btn btn-lg btn-block mt-8" onClick={passwordDimenticata}>
                Password dimenticata?
              </button>
            )}
            <p className="muted gate-nota">
              {scopoIgnoto
                ? 'Se era il link per confermare l’email e l’avevi già confermata, accedi pure; altrimenti, provando ad accedere ti proponiamo un link nuovo. Se era il link per cambiare la password, chiedine un altro.'
                : 'Se avevi già confermato, accedi pure con email (o nome) e password. Altrimenti, provando ad accedere ti proponiamo di mandarti un link nuovo.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
