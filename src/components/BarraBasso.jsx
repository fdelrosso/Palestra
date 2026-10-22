import { useEffect } from 'react'
import { ROTTE_SOCIAL, navigate, routes, useRoute, vaiASezione } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useMessaggiNonLetti from '../hooks/useMessaggiNonLetti'
import useNotificheNuove from '../hooks/useNotificheNuove'
import { IconBusta, IconUtente, IconSearch, IconaSezione } from './icons'

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
    rotte: ['inizio', 'profilo', 'dati', 'foto', 'lavoro', 'atleti', 'foto-atleti', 'scheda-per-atleta', 'importa-per-atleta', 'vetrina-pt', 'schede-lavoro', 'scheda-lavoro', 'importa-lavoro'],
  },
  {
    id: 'social',
    nome: 'Social',
    vai: () => vaiASezione(routes.feed()),
    rotte: ROTTE_SOCIAL,
    // Le richieste da accettare, i messaggi non letti e quello che gli amici
    // ti hanno mandato (schede, allenamenti, foto): stanno tutti in Social.
    daFare: (acc, nonLetti, notifiche) =>
      acc.richiesteAmicizia.ricevute.length +
      nonLetti +
      notifiche +
      acc.condivisioni.daVedere +
      acc.effimeri.daVedere,
  },
  {
    id: 'altro',
    nome: 'Altro',
    vai: () => vaiASezione(routes.altro()),
    rotte: ['altro', 'guida', 'esercizi', 'esercizi-gruppo', 'schede-prefatte', 'schede-generali'],
  },
]

// DENTRO Social la barra cambia: le sue parti (profilo, messaggi, cerca)
// diventano voci, e Social (il feed) sta al centro. Home a sinistra è l'uscita.
// Prima amici, messaggi e cerca erano tre icone in alto a destra nel feed,
// lontane dal pollice e assenti nelle altre pagine di Social.
// ⚠️ Fra le voci di Social si va SOSTITUENDO la pagina (come fra sezioni):
// indietro esce da Social invece di ripercorrere ogni linguetta toccata.
const vaiInSocial = (path) => navigate(path, { sostituisci: true })
const LINGUETTE_SOCIAL = [
  { id: 'inizio', nome: 'Home', vai: () => vaiASezione(routes.inizio()), rotte: [] },
  {
    // Il proprio profilo come lo vedono gli altri, col codice amico e le
    // richieste da accettare (pages/AmiciPage). La rotta resta /amici.
    id: 'amici',
    nome: 'Profilo',
    Icona: IconUtente,
    vai: () => vaiInSocial(routes.amici()),
    rotte: ['amici', 'notifiche'],
    // Le richieste da accettare e i mi piace / commenti nuovi sui propri
    // allenamenti (il cuoricino, lib/notifiche).
    daFare: (acc, nonLetti, notifiche) => acc.richiesteAmicizia.ricevute.length + notifiche,
  },
  { id: 'social', nome: 'Social', vai: () => vaiInSocial(routes.feed()), rotte: ['feed', 'post'] },
  {
    id: 'messaggi',
    nome: 'Messaggi',
    Icona: IconBusta,
    vai: () => vaiInSocial(routes.messaggi()),
    rotte: ['messaggi', 'chat'],
    // Le schede, gli allenamenti e le foto ricevuti stanno nella chat con
    // chi li ha mandati (lib/scambi): contano qui, come i messaggi.
    daFare: (acc, nonLetti) => nonLetti + acc.condivisioni.daVedere + acc.effimeri.daVedere,
  },
  { id: 'cerca', nome: 'Cerca', Icona: IconSearch, vai: () => vaiInSocial(routes.cerca()), rotte: ['cerca'] },
]

export default function BarraBasso({ passaggio = null }) {
  const route = useRoute()
  const account = useAccount()
  const nonLetti = useMessaggiNonLetti(account.utenteCorrente?.id, route.name)
  const notifiche = useNotificheNuove(account.utenteCorrente?.id, route.name)

  // ⚠️ La barra è `position: fixed`, quindi non occupa spazio: senza questo,
  // l'ultima riga di ogni pagina finisce SOTTO la barra e non si raggiunge.
  // Sta qui e non su ogni pagina perché così vale automaticamente anche per le
  // pagine che verranno, e sparisce da sola dove la barra non c'è.
  useEffect(() => {
    document.body.classList.add('ha-barra')
    return () => document.body.classList.remove('ha-barra')
  }, [])

  const inSocial = ROTTE_SOCIAL.includes(route.name)
  const voci = inSocial ? LINGUETTE_SOCIAL : LINGUETTE
  const indice = voci.findIndex((l) => l.rotte.includes(route.name))

  return (
    <nav className={'barra-basso' + (passaggio?.verso ? ' cambia' : '')} aria-label="Sezioni principali">
      {/* Il cerchio della sezione accesa: uno solo, che scivola. Su una pagina
          che non è di nessuna sezione non c'è. */}
      {indice !== -1 && <span className="barra-goccia" style={{ '--i': indice }} aria-hidden="true" />}
      {voci.map((l, n) => {
        const attiva = l.rotte.includes(route.name)
        const daFare = l.daFare ? l.daFare(account, nonLetti, notifiche) : 0
        return (
          // Entrando in Social o uscendone le voci cambiano: la chiave col
          // numero del passaggio le fa rinascere, e rinascendo entrano una
          // dopo l'altra (--n, index.css). Il cerchio invece resta e scivola.
          <button
            key={`${passaggio?.n ?? 0}-${l.id}`}
            className={'barra-voce' + (attiva ? ' on' : '')}
            data-sezione={l.id}
            style={{ '--n': n }}
            onClick={l.vai}
            aria-label={daFare > 0 ? `${l.nome}, ${daFare} da vedere` : l.nome}
            aria-current={attiva ? 'page' : undefined}
          >
            <span className="barra-icona">
              {l.Icona ? (
                <l.Icona width={25} height={25} aria-hidden="true" />
              ) : (
                <IconaSezione sezione={l.id} piena={attiva} width={25} height={25} aria-hidden="true" />
              )}
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
