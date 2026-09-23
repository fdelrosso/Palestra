import { useEffect } from 'react'
import { navigate, routes, useRoute } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useMessaggiNonLetti from '../hooks/useMessaggiNonLetti'
import { IconAbbraccio, IconCasa, IconDumbbell, IconSearch } from './icons'

// ---------------------------------------------------------------------------
// La barra in basso: quattro destinazioni sempre raggiungibili.
//
// È il cambio di struttura dell'app: prima le sezioni stavano dietro un menu a
// tendina sul bordo destro, e per arrivarci bisognava sapere che c'era. Adesso
// le quattro cose che si fanno tutti i giorni sono lì, sempre.
//
// ⚠️ SOLO QUATTRO, e non cinque o sei. Su un telefono una barra in fondo si usa
// col pollice: oltre le quattro le aree diventano più strette del polpastrello
// e si sbaglia linguetta. Tutto il resto resta nel menu laterale e nel menu del
// profilo, che non spariscono.
//
// ⚠️ Niente etichette sotto le icone, come su Instagram: con quattro icone
// arcinote le parole sarebbero rumore. L'`aria-label` però c'è su ognuna — chi
// naviga con lo screen reader non vede la forma, sente il nome.
//
// Il pallino sulla linguetta Amici conta le richieste da accettare: prima stava
// sulla voce del menu laterale, e togliendo quella voce sarebbe sparito.
// ---------------------------------------------------------------------------

// A quale linguetta appartiene ogni pagina. Le pagine di dettaglio raggiunte da
// una sezione tengono accesa la linguetta da cui si arriva: se si spegnesse,
// scendendo di un livello sembrerebbe di essere usciti dall'app.
const LINGUETTE = [
  {
    id: 'home',
    nome: 'Home',
    Icona: IconCasa,
    vai: () => navigate(routes.calendario()),
    rotte: ['calendario', 'home', 'scheda', 'editor', 'nuova', 'nuovo-allenamento', 'importa'],
  },
  {
    id: 'feed',
    nome: 'Allenamenti',
    Icona: IconDumbbell,
    vai: () => navigate(routes.feed()),
    rotte: ['feed'],
  },
  {
    id: 'amici',
    nome: 'Amici',
    Icona: IconAbbraccio,
    vai: () => navigate(routes.amici()),
    rotte: ['amici', 'condivisi', 'chat'],
    // Le richieste da accettare PIU' i messaggi non letti: sono due cose da
    // guardare e stanno tutte e due dietro questa linguetta.
    daFare: (acc, nonLetti) => acc.richiesteAmicizia.ricevute.length + nonLetti,
  },
  {
    id: 'cerca',
    nome: 'Cerca',
    Icona: IconSearch,
    vai: () => navigate(routes.cerca()),
    rotte: ['cerca', 'profilo'],
  },
]

export default function BarraBasso() {
  const route = useRoute()
  const account = useAccount()
  const nonLetti = useMessaggiNonLetti(account.utenteCorrente?.id, route.name)

  // ⚠️ La barra è `position: fixed`, quindi non occupa spazio: senza questo,
  // l'ultima riga di ogni pagina finisce SOTTO la barra e non si raggiunge.
  // Sta qui e non su ogni pagina perché così vale automaticamente anche per le
  // pagine che verranno, e sparisce da sola dove la barra non c'è.
  useEffect(() => {
    document.body.classList.add('ha-barra')
    return () => document.body.classList.remove('ha-barra')
  }, [])

  return (
    <nav className="barra-basso" aria-label="Sezioni principali">
      {LINGUETTE.map((l) => {
        const attiva = l.rotte.includes(route.name)
        const daFare = l.daFare ? l.daFare(account, nonLetti) : 0
        return (
          <button
            key={l.id}
            className={'barra-voce' + (attiva ? ' on' : '')}
            onClick={l.vai}
            aria-label={l.nome}
            aria-current={attiva ? 'page' : undefined}
          >
            <span className="barra-icona">
              <l.Icona width={23} height={23} />
              {daFare > 0 && <span className="pallino-notifica barra" aria-hidden="true" />}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
