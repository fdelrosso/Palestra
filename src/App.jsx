import { StoreProvider } from './store/StoreContext'
import { AccountProvider, useAccount } from './store/AccountContext'
import { useEffect, useState } from 'react'
import { ROTTE_SOCIAL, navigate, useRoute } from './lib/router'
import useStatoModerazione from './hooks/useStatoModerazione'
import { AccountBloccato, AvvisiModerazione } from './components/Moderazione'
import HomePage from './pages/HomePage'
import SchedaPage from './pages/SchedaPage'
import EditorPage from './pages/EditorPage'
import NewSchedaPage from './pages/NewSchedaPage'
import NuovoAllenamentoPage from './pages/NuovoAllenamentoPage'
import ImportPage from './pages/ImportPage'
import WorkoutSession from './pages/WorkoutSession'
import CalendarPage from './pages/CalendarPage'
import StoricoPage from './pages/StoricoPage'
import SchedeGeneraliPage from './pages/SchedeGeneraliPage'
import DietaPage from './pages/DietaPage'
import DietaEditorPage from './pages/DietaEditorPage'
import DietaOggiPage from './pages/DietaOggiPage'
import DietaImportPage from './pages/DietaImportPage'
import DietaDaMacroPage from './pages/DietaDaMacroPage'
import DietaNuovaPage from './pages/DietaNuovaPage'
import DietaSchemaPage from './pages/DietaSchemaPage'
import PreferenzeCiboPage from './pages/PreferenzeCiboPage'
import ConsigliatoPage from './pages/ConsigliatoPage'
import EserciziPage from './pages/EserciziPage'
import AmiciPage from './pages/AmiciPage'
import UtentePage from './pages/UtentePage'
import SchedePrefattePage from './pages/SchedePrefattePage'
import LavoroPage from './pages/LavoroPage'
import AtletiPage from './pages/AtletiPage'
import FotoPage from './pages/FotoPage'
import FotoAtletiPage from './pages/FotoAtletiPage'
import FeedPage from './pages/FeedPage'
import ModerazionePage from './pages/ModerazionePage'
import CercaPage from './pages/CercaPage'
import ChatPage from './pages/ChatPage'
import DatiFisiciPage from './pages/DatiFisiciPage'
import InizioPage from './pages/InizioPage'
import ProfiloPage from './pages/ProfiloPage'
import MessaggiPage from './pages/MessaggiPage'
import AltroPage from './pages/AltroPage'
import UserGate from './pages/UserGate'
import Consensi from './pages/Consensi'
import ConfermaEmail from './pages/ConfermaEmail'
import NuovaPassword from './pages/NuovaPassword'
import BarraBasso from './components/BarraBasso'
import TestataApp from './components/TestataApp'
import BarraOffline from './components/BarraOffline'
import AggiornamentoApp from './components/AggiornamentoApp'
import logo from './assets/logo.png'

function pagina(route) {
  switch (route.name) {
    case 'scheda':
      return <SchedaPage key={`${route.id}/${route.giorno || ''}`} id={route.id} giorno={route.giorno} />
    case 'editor':
      return <EditorPage id={route.id} />
    case 'nuova':
      return <NewSchedaPage />
    case 'nuovo-allenamento':
      return <NuovoAllenamentoPage />
    case 'importa':
      return <ImportPage />
    case 'allenamento':
      return <WorkoutSession />
    case 'storico':
      return <StoricoPage />
    case 'schede-generali':
      return <SchedeGeneraliPage />
    case 'dieta':
      return <DietaPage />
    case 'dieta-oggi':
      return <DietaOggiPage pastoId={route.pasto} />
    case 'dieta-crea':
      return <DietaNuovaPage />
    case 'dieta-schema':
      return <DietaSchemaPage id={route.id} />
    case 'dieta-editor':
      return <DietaEditorPage id={route.id} />
    case 'dieta-importa':
      return <DietaImportPage />
    case 'dieta-macro':
      return <DietaDaMacroPage />
    case 'dieta-preferenze':
      return <PreferenzeCiboPage />
    case 'dati':
      return <DatiFisiciPage />
    case 'consigliato':
      return <ConsigliatoPage />
    case 'esercizi':
      return <EserciziPage />
    case 'esercizi-gruppo':
      return <EserciziPage gruppo={route.gruppo} />
    case 'amici':
      return <AmiciPage />
    case 'feed':
      return <FeedPage />
    case 'segnalazioni':
      return <ModerazionePage />
    case 'cerca':
      return <CercaPage />
    case 'chat':
      return <ChatPage id={route.id} />
    case 'utente':
      return <UtentePage key={route.id} id={route.id} />
    case 'schede-prefatte':
      return <SchedePrefattePage />
    case 'lavoro':
      return <LavoroPage />
    case 'atleti':
      return <AtletiPage />
    case 'foto':
      return <FotoPage />
    case 'foto-atleti':
      return <FotoAtletiPage />
    case 'home':
      return <HomePage />
    case 'calendario':
      return <CalendarPage />
    case 'profilo':
      // Il profilo è una finestra che galleggia SOPRA la Home (da dove si
      // apre, toccando l'avatar): la Home resta lì dietro, sfocata.
      return (
        <>
          <InizioPage />
          <ProfiloPage />
        </>
      )
    case 'messaggi':
      return <MessaggiPage />
    case 'altro':
      return <AltroPage />
    case 'inizio':
    default:
      return <InizioPage />
  }
}

// Un profilo arrivato da un link (Amici → WhatsApp, /utente/:id). Chi ha già
// l'app ci finisce dritto; chi no passa da registrazione e conferma della
// mail, e il link della mail riporta alla radice: il profilo si ricorda
// all'apertura della pagina e si apre appena si è dentro (una volta sola,
// entro una settimana).
const CHIAVE_PROFILO = 'profilo-da-link:v1'
const SETTIMANA = 7 * 24 * 60 * 60 * 1000
if (typeof window !== 'undefined' && /^\/utente\/[^/]+\/?$/.test(window.location.pathname)) {
  try {
    localStorage.setItem(CHIAVE_PROFILO, JSON.stringify({ path: window.location.pathname, il: Date.now() }))
  } catch {
    /* niente storage: chi ha già l'app ci arriva comunque dal link */
  }
}

function useProfiloDaLink() {
  useEffect(() => {
    try {
      const salvato = JSON.parse(localStorage.getItem(CHIAVE_PROFILO) || 'null')
      localStorage.removeItem(CHIAVE_PROFILO)
      const fresco = salvato?.path && Date.now() - salvato.il < SETTIMANA
      if (fresco && window.location.pathname !== salvato.path) navigate(salvato.path)
    } catch {
      /* niente storage, niente profilo da riaprire */
    }
  }, [])
}

// Entrare in Social e uscirne è cambiare mondo (anche la barra in basso cambia
// voci): la pagina arriva di lato, da destra entrando e da sinistra tornando
// a Home. `n` cresce a ogni passaggio e fa ripartire l'animazione. Calcolato
// durante il render, non in un effetto: con l'effetto il primo fotogramma
// della pagina nuova si vedrebbe fermo, prima che l'animazione parta.
// ⚠️ Alla pagina dopo `verso` torna null: se no la classe resterebbe e
// animerebbe ogni cambio di pagina, non solo l'entrata e l'uscita da Social.
function usePassaggioSocial(nome) {
  const inSocial = ROTTE_SOCIAL.includes(nome)
  const [stato, setStato] = useState({ nome, inSocial, verso: null, n: 0 })
  if (stato.nome === nome) return stato
  const nuovo =
    stato.inSocial === inSocial
      ? { ...stato, nome, verso: null }
      : { nome, inSocial, verso: inSocial ? 'entra' : 'esce', n: stato.n + 1 }
  setStato(nuovo)
  return nuovo
}

function AppShell() {
  const route = useRoute()
  const passaggio = usePassaggioSocial(route.name)
  useProfiloDaLink()
  const { utenteCorrente } = useAccount()
  const ioId = utenteCorrente?.id || null
  // Account bloccato dalla moderazione (Termini, punto 7): al posto dell'app
  // la sua schermata, da cui si chiede lo sblocco. Gli avvisi dei moderatori
  // (cosa è stato tolto e perché) compaiono sopra a tutto, in tutti e due i casi.
  const moderazione = useStatoModerazione(ioId)
  // La barra in basso c'è dappertutto TRANNE durante l'allenamento: lì
  // toglierla è il punto. Si tiene il telefono in mano fra una serie e
  // l'altra, e una linguetta a portata di pollice vorrebbe dire uscire dalla
  // sessione per sbaglio — che è la cosa più fastidiosa che l'app possa fare.
  const senzaBarra = ['allenamento']
  const mostraBarra = !senzaBarra.includes(route.name)
  if (moderazione.accountBloccato) {
    return (
      <>
        <AccountBloccato ioId={ioId} />
        <AvvisiModerazione ioId={ioId} />
      </>
    )
  }
  return (
    <>
      <BarraOffline />
      {mostraBarra && <TestataApp />}
      {/* `display: contents`: l'involucro non ha una scatola sua, così le
          pagine `position: fixed` (il feed) restano a tutto schermo. */}
      <div key={passaggio.n} className={'vista' + (passaggio.verso ? ` vista-${passaggio.verso}` : '')}>
        {pagina(route)}
      </div>
      {mostraBarra && <BarraBasso passaggio={passaggio} />}
      <AvvisiModerazione ioId={ioId} />
    </>
  )
}

// Il momento tra l'apertura dell'app e la risposta di Supabase su chi sei.
// Volutamente spoglia: dura una frazione di secondo con la rete, e chi la vede
// più a lungo sta già capendo da solo che la rete non c'è.
function Avvio() {
  return (
    <div className="app">
      <div className="gate">
        <div className="gate-head">
          <div className="gate-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <p className="muted">Un attimo…</p>
        </div>
      </div>
    </div>
  )
}

function Root() {
  const { utenteCorrente, caricandoSessione, daLink, inAccoglienza, consensiDaDare } = useAccount()

  // Arrivati dal link di una mail: prima di tutto la sua schermata, anche se
  // la sessione adesso c'e' (il link la crea). Dal recupero password si sceglie
  // quella nuova; dalla conferma si dice com'e' andata.
  if (daLink?.scopo === 'recupero') return <NuovaPassword />
  if (daLink) return <ConfermaEmail />

  // ⚠️ Dalla fase 2b la sessione si chiede a Supabase, e la risposta non è
  // immediata. In quell'attesa NON si mostra il "Benvenuto": chi è già dentro
  // lo vedrebbe lampeggiare a ogni apertura dell'app, e per un attimo
  // penserebbe di essere stato buttato fuori. Meglio una schermata muta.
  if (caricandoSessione) return <Avvio />

  // Primo accesso di un account nuovo: si aspetta che la scheda d'esempio sia
  // nel database (vedi `accogli` in AccountContext), dura un attimo.
  if (inAccoglienza) return <Avvio />

  // Nessuna sessione: si entra (o ci si registra).
  if (!utenteCorrente) return <UserGate />

  // Account di prima dei consensi (o testi cambiati): prima quelli, poi l'app.
  if (consensiDaDare) return <Consensi />

  // Il `key` sull'utente forza il remount dello store al cambio profilo,
  // così le schede/allenamenti si ricaricano dai dati di quell'utente.
  return (
    <StoreProvider key={utenteCorrente.id} userId={utenteCorrente.id}>
      <AppShell />
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AccountProvider>
      <Root />
      {/* Fuori da Root apposta: la versione nuova va segnalata anche a chi è
          fermo sul "Benvenuto" o sta aspettando la risposta di Supabase. */}
      <AggiornamentoApp />
    </AccountProvider>
  )
}
