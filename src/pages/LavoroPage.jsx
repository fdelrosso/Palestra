import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { isPt } from '../lib/pt'
import RichiesteLavoro from '../components/RichiesteLavoro'
import { IconAmici, IconChevron, IconImage } from '../components/icons'
import ModoPtSwitch from '../components/ModoPtSwitch'

// ---------------------------------------------------------------------------
// "Lavoro": la parte del profilo di un PT che riguarda gli altri.
//
// In cima le richieste di lavoro da accettare, poi le porte per Atleti e Foto
// Atleti. Gli allenamenti dei propri atleti NON sono più qui: stanno nel feed
// di Social, nella linguetta "Atleti" (pages/FeedPage), anche quelli "solo al
// PT".
//
// L'altra metà del profilo — "Personale" — è l'app di sempre: un PT si allena
// come chiunque altro. Si passa da una all'altra con <ModoPtSwitch>.
// ---------------------------------------------------------------------------

export default function LavoroPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()

  // Un profilo che non è un PT qui non ha niente da fare.
  const sonoPt = isPt(utenteCorrente)

  if (!sonoPt) {
    return (
      <div className="app">
        <div className="topbar">
          <h1>Lavoro</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>
            Questa sezione è per i personal trainer.
            <br />
            Puoi attivare un account PT dal tuo profilo.
          </p>
        </div>
        <button className="btn btn-block" onClick={() => navigate(routes.inizio())}>
          Torna alla home
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1>Lavoro</h1>
      </div>

      <ModoPtSwitch attivo="lavoro" />

      <RichiesteLavoro />

      {/* Porta verso la sezione Atleti */}
      <button className="menu-voce" style={{ marginTop: 4 }} onClick={() => navigate(routes.atleti())}>
        <span className="menu-voce-icona" aria-hidden="true">
          <IconAmici width={20} height={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="menu-voce-nome">Atleti</span>
          <span className="menu-voce-desc">
            {mieiAtleti.length === 0
              ? 'Ancora nessuno: dai il tuo codice PT'
              : `${mieiAtleti.length} person${mieiAtleti.length === 1 ? 'a' : 'e'}, con schede e allenamenti`}
          </span>
        </span>
        <IconChevron className="faint" />
      </button>

      {/* Porta verso le foto del check dei propri atleti */}
      <button className="menu-voce" onClick={() => navigate(routes.fotoAtleti())}>
        <span className="menu-voce-icona" aria-hidden="true">
          <IconImage width={20} height={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="menu-voce-nome">Foto Atleti</span>
          <span className="menu-voce-desc">
            Una cartella per atleta, con quello che ognuno ha scelto di mostrarti
          </span>
        </span>
        <IconChevron className="faint" />
      </button>
    </div>
  )
}
