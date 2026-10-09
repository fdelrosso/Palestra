import { useEffect } from 'react'
import { routes, useRoute, vaiASezione } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useMessaggiNonLetti from '../hooks/useMessaggiNonLetti'
import { IconaSezione } from './icons'

// ---------------------------------------------------------------------------
// La barra in basso: l'UNICO menu dell'app.
//
// Fino alla 39ª le strade erano tre — questa barra, un menu a tendina sul
// bordo destro e il pannello del profilo — e una cosa si trovava solo sapendo
// in quale dei tre stava. Adesso ogni pagina appartiene a UNA sezione, e la
// sezione si apre da qui:
//
//   Allenamento · Dieta · Home · Social · Altro
//
// Home al centro: è dove si torna, e il centro è il posto più comodo per il pollice.
//
// Il profilo (dati, foto, PT, colori, account) si apre dall'avatar in Home.
// "Altro" raccoglie quello che non ha una sezione sua: oggi la libreria
// degli esercizi e le raccolte di schede.
//
// ⚠️ CINQUE, e non di più. Prima erano quattro per lasciare al pollice celle
// larghe: con cinque, sui 375px di un iPhone piccolo, ogni cella resta sopra i
// 64px, ancora ben più larga di un polpastrello (vedi .barra-voce, 48px).
// Una sesta no.
//
// La sezione accesa esce dalla barra dentro un cerchio, col suo nome sotto;
// le altre sono solo l'icona (index.css, "barra in basso"). L'`aria-label` c'è
// su ognuna — chi naviga con lo screen reader non vede la forma, sente il nome.
// ---------------------------------------------------------------------------

// A quale linguetta appartiene ogni pagina. Le pagine di dettaglio tengono
// accesa la linguetta da cui si arriva: se si spegnesse, scendendo di un
// livello sembrerebbe di essere usciti dall'app.
const LINGUETTE = [
  {
    id: 'allenamento',
    nome: 'Allenamento',
    vai: () => vaiASezione(routes.home()),
    rotte: [
      'home', 'calendario', 'storico', 'scheda', 'editor', 'nuova', 'nuovo-allenamento',
      'importa', 'consigliato',
    ],
  },
  {
    id: 'dieta',
    nome: 'Dieta',
    vai: () => vaiASezione(routes.dietaOggi()),
    rotte: [
      'dieta', 'dieta-oggi', 'dieta-crea', 'dieta-schema', 'dieta-editor', 'dieta-importa',
      'dieta-macro', 'dieta-preferenze',
    ],
  },
  {
    id: 'inizio',
    nome: 'Home',
    vai: () => vaiASezione(routes.inizio()),
    rotte: ['inizio', 'profilo', 'dati', 'foto', 'lavoro', 'atleti', 'foto-atleti'],
  },
  {
    id: 'social',
    nome: 'Social',
    vai: () => vaiASezione(routes.feed()),
    rotte: ['feed', 'amici', 'chat', 'messaggi', 'cerca'],
    // Le richieste da accettare, i messaggi non letti e quello che gli amici
    // ti hanno mandato (schede, allenamenti, foto): stanno tutti in Social.
    daFare: (acc, nonLetti) =>
      acc.richiesteAmicizia.ricevute.length +
      nonLetti +
      acc.condivisioni.daVedere +
      acc.effimeri.ricevuti.length,
  },
  {
    id: 'altro',
    nome: 'Altro',
    vai: () => vaiASezione(routes.altro()),
    rotte: ['altro', 'esercizi', 'esercizi-gruppo', 'schede-prefatte', 'schede-generali'],
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

  const indice = LINGUETTE.findIndex((l) => l.rotte.includes(route.name))

  return (
    <nav className="barra-basso" aria-label="Sezioni principali">
      {/* Il cerchio della sezione accesa: uno solo, che scivola. Su una pagina
          che non è di nessuna sezione non c'è. */}
      {indice !== -1 && <span className="barra-goccia" style={{ '--i': indice }} aria-hidden="true" />}
      {LINGUETTE.map((l) => {
        const attiva = l.rotte.includes(route.name)
        const daFare = l.daFare ? l.daFare(account, nonLetti) : 0
        return (
          <button
            key={l.id}
            className={'barra-voce' + (attiva ? ' on' : '')}
            onClick={l.vai}
            aria-label={daFare > 0 ? `${l.nome}, ${daFare} da vedere` : l.nome}
            aria-current={attiva ? 'page' : undefined}
          >
            <span className="barra-icona">
              <IconaSezione sezione={l.id} piena={attiva} width={25} height={25} aria-hidden="true" />
              {daFare > 0 && (
                <span className="pallino-notifica barra-conta" aria-hidden="true">
                  {daFare > 99 ? '99+' : daFare}
                </span>
              )}
            </span>
            <span className="barra-etichetta" aria-hidden="true">
              {l.nome}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
