import { useMemo } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import useCollettivo from '../hooks/useCollettivo'
import { isPt } from '../lib/pt'
import ListaAllenamenti from '../components/ListaAllenamenti'
import RichiesteLavoro from '../components/RichiesteLavoro'
import { IconAmici, IconChevron } from '../components/icons'
import ModoPtSwitch from '../components/ModoPtSwitch'

// ---------------------------------------------------------------------------
// "Lavoro": la parte del profilo di un PT che riguarda gli altri.
//
// In cima le richieste di lavoro da accettare, poi la porta per la sezione
// Atleti, poi l'elenco degli allenamenti svolti da TUTTI i propri atleti, dal
// più recente, ognuno col nome di chi l'ha fatto. Un PT vede anche quelli che
// l'atleta ha marcato "solo al PT" (lib/visibilita): sono per lui.
//
// L'altra metà del profilo — "Personale" — è l'app di sempre: un PT si allena
// come chiunque altro. Si passa da una all'altra con <ModoPtSwitch>.
// ---------------------------------------------------------------------------

export default function LavoroPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  // Gli allenamenti dei propri atleti: anche i "solo al PT", che il database
  // manda a lui e a nessun altro.
  const { dati } = useCollettivo()

  // Un profilo che non è un PT qui non ha niente da fare.
  const sonoPt = isPt(utenteCorrente)

  const allenamenti = useMemo(() => {
    if (!sonoPt) return []
    return mieiAtleti
      .flatMap((a) => allenamentiDiUtente(a, { collettivo: dati, comePt: true }))
      .sort((x, y) => new Date(y.data) - new Date(x.data))
  }, [mieiAtleti, sonoPt, dati])

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
            Puoi attivare un account PT dal menu del profilo.
          </p>
        </div>
        <button className="btn btn-block" onClick={() => navigate(routes.calendario())}>
          Torna al calendario
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

      <div className="section-title" style={{ marginTop: 20 }}>
        Allenamenti dei tuoi atleti
        {allenamenti.length > 0 && ` · ${allenamenti.length}`}
      </div>
      <ListaAllenamenti
        voci={allenamenti}
        vuoto={
          mieiAtleti.length === 0
            ? 'Nessun atleta, per ora. Dai il tuo codice PT a chi segui.'
            : 'I tuoi atleti non hanno ancora registrato allenamenti.'
        }
      />
    </div>
  )
}
