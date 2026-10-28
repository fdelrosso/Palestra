import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { isPt, isSoloPt } from '../lib/pt'
import { useAppuntamentiDaDecidere } from '../lib/appuntamenti'
import RichiesteLavoro from '../components/RichiesteLavoro'
import SchedeDaConfermare from '../components/SchedeDaConfermare'
import RinnoviDaDecidere from '../components/RinnoviDaDecidere'
import AllungamentiDaDecidere from '../components/AllungamentiDaDecidere'
import { IconAmici, IconApple, IconCalendar, IconChevron, IconClipboard, IconImage } from '../components/icons'
import ModoPtSwitch from '../components/ModoPtSwitch'
import CardAppAndroid from '../components/CardAppAndroid'
import CardAppIphone from '../components/CardAppIphone'
import AgendaPt from '../components/AgendaPt'
import { dataDiOggi, saluto } from '../lib/saluto'

// ---------------------------------------------------------------------------
// "Lavoro": la parte del profilo di un PT che riguarda gli altri, ed è la sua
// Home in modalità PT (sempre, per un solo PT).
//
// In cima il saluto con la data, come sulla Home di chi si allena, e
// l'agenda (components/AgendaPt: per pianificare, non per registrare
// allenamenti). Poi le richieste di lavoro da accettare e le porte per Atleti (dove
// c'è anche a che punto è ognuno), le Schede di lavoro e Check e video atleti, spaziate
// come le caselle di Altro. La vetrina di PT si scrive dalla propria pagina
// (components/VetrinaPt).
// Gli allenamenti dei propri atleti NON sono più qui: stanno nel feed
// di Social, nella linguetta "Atleti" (pages/FeedPage), anche quelli "solo al
// PT".
//
// L'altra metà del profilo — "Personale" — è l'app di sempre, per il PT che si
// allena anche lui. Si passa da una all'altra con <ModoPtSwitch>, che a un
// solo PT non compare.
// ---------------------------------------------------------------------------

export default function LavoroPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const daDecidere = useAppuntamentiDaDecidere(utenteCorrente?.id, 'pt')

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

  const nome = utenteCorrente?.nome || ''
  const soloPt = isSoloPt(utenteCorrente)

  return (
    <div className="app">
      {/* La testa della Home di chi si allena (InizioPage): è la Home del PT. */}
      <header className="inizio-testa">
        <div style={{ minWidth: 0 }}>
          <div className="inizio-data">{dataDiOggi()}</div>
          <h1 className="inizio-saluto">
            {saluto()}
            {nome ? `, ${nome.split(' ')[0]}` : ''}
          </h1>
        </div>
      </header>

      <ModoPtSwitch attivo="lavoro" />
      {/* L'app sul telefono anche per il PT, come sulla Home (InizioPage). */}
      <CardAppAndroid />
      <CardAppIphone />

      <RichiesteLavoro />
      <SchedeDaConfermare />
      <RinnoviDaDecidere />
      <AllungamentiDaDecidere />

      <AgendaPt />

      <div className="stack" style={{ gap: 8, marginTop: 18 }}>
        {/* Porta verso la sezione Atleti. Un solo PT ce l'ha nella barra in
            basso (components/BarraBasso), qui non serve. */}
        {!soloPt && (
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
        )}

        {/* Gli appuntamenti chiesti dagli atleti (pages/AppuntamentiPage) */}
        <button className="menu-voce" onClick={() => navigate(routes.appuntamenti())}>
          <span className="menu-voce-icona" aria-hidden="true">
            <IconCalendar width={20} height={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="menu-voce-nome">Appuntamenti</span>
            <span className="menu-voce-desc">Le richieste dei tuoi atleti: scegli un orario o proponine altri</span>
          </span>
          {daDecidere > 0 && <span className="pallino-notifica">{daDecidere}</span>}
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

        {/* Un solo PT non ha la sezione Dieta: le diete da mandare agli
            atleti (components/DietaPerAtleta) le prepara da qui. */}
        {soloPt && (
          <button className="menu-voce" onClick={() => navigate(routes.dieta())}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconApple width={20} height={20} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="menu-voce-nome">Diete da mandare</span>
              <span className="menu-voce-desc">Dal PDF, dai macro o a mano: poi le mandi dalla pagina dell’atleta</span>
            </span>
            <IconChevron className="faint" />
          </button>
        )}

        {/* Porta verso check e video dei propri atleti */}
        <button className="menu-voce" onClick={() => navigate(routes.fotoAtleti())}>
          <span className="menu-voce-icona" aria-hidden="true">
            <IconImage width={20} height={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="menu-voce-nome">Check e video atleti</span>
            <span className="menu-voce-desc">
              Il check del fisico e le esecuzioni da correggere, una cartella per atleta
            </span>
          </span>
          <IconChevron className="faint" />
        </button>
      </div>
    </div>
  )
}
