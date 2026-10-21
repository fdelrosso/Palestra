import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { isPt } from '../lib/pt'
import RichiesteLavoro from '../components/RichiesteLavoro'
import SchedeDaConfermare from '../components/SchedeDaConfermare'
import { IconAmici, IconChevron, IconClipboard, IconImage } from '../components/icons'
import ModoPtSwitch from '../components/ModoPtSwitch'
import CardAppAndroid from '../components/CardAppAndroid'
import CardAppIphone from '../components/CardAppIphone'

// ---------------------------------------------------------------------------
// "Lavoro": la parte del profilo di un PT che riguarda gli altri.
//
// In cima le richieste di lavoro da accettare, poi le porte per Atleti (dove
// c'è anche a che punto è ognuno), le Schede di lavoro e Foto Atleti, spaziate
// come le caselle di Altro. La vetrina di PT si scrive dalla propria pagina
// (components/VetrinaPt).
// Gli allenamenti dei propri atleti NON sono più qui: stanno nel feed
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
      {/* L'app sul telefono anche per il PT, come sulla Home (InizioPage). */}
      <CardAppAndroid />
      <CardAppIphone />

      <RichiesteLavoro />
      <SchedeDaConfermare />

      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        {/* Porta verso la sezione Atleti */}
        <button className="menu-voce" onClick={() => navigate(routes.atleti())}>
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

        {/* Le schede scritte per gli atleti: da inviare e inviate */}
        <button className="menu-voce" onClick={() => navigate(routes.schedeLavoro())}>
          <span className="menu-voce-icona" aria-hidden="true">
            <IconClipboard width={20} height={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="menu-voce-nome">Schede di lavoro</span>
            <span className="menu-voce-desc">Quelle da mandare ai tuoi atleti e quelle già mandate</span>
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
    </div>
  )
}
