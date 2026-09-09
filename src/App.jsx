import { StoreProvider } from './store/StoreContext'
import { AccountProvider, useAccount } from './store/AccountContext'
import { useRoute } from './lib/router'
import HomePage from './pages/HomePage'
import SchedaPage from './pages/SchedaPage'
import EditorPage from './pages/EditorPage'
import NewSchedaPage from './pages/NewSchedaPage'
import ImportPage from './pages/ImportPage'
import WorkoutSession from './pages/WorkoutSession'
import CalendarPage from './pages/CalendarPage'
import StoricoPage from './pages/StoricoPage'
import SchedeGeneraliPage from './pages/SchedeGeneraliPage'
import DietaPage from './pages/DietaPage'
import DietaEditorPage from './pages/DietaEditorPage'
import DietaOggiPage from './pages/DietaOggiPage'
import DietaImportPage from './pages/DietaImportPage'
import PreferenzeCiboPage from './pages/PreferenzeCiboPage'
import CondivisiPage from './pages/CondivisiPage'
import ConsigliatoPage from './pages/ConsigliatoPage'
import EserciziPage from './pages/EserciziPage'
import AmiciPage from './pages/AmiciPage'
import SchedePrefattePage from './pages/SchedePrefattePage'
import LavoroPage from './pages/LavoroPage'
import AtletiPage from './pages/AtletiPage'
import DatiFisiciPage from './pages/DatiFisiciPage'
import UserGate from './pages/UserGate'
import MenuLaterale from './components/MenuLaterale'

function pagina(route) {
  switch (route.name) {
    case 'scheda':
      return <SchedaPage id={route.id} />
    case 'editor':
      return <EditorPage id={route.id} />
    case 'nuova':
      return <NewSchedaPage />
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
      return <DietaOggiPage />
    case 'dieta-editor':
      return <DietaEditorPage id={route.id} />
    case 'dieta-importa':
      return <DietaImportPage />
    case 'dieta-preferenze':
      return <PreferenzeCiboPage />
    case 'condivisi':
      return <CondivisiPage />
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
    case 'schede-prefatte':
      return <SchedePrefattePage />
    case 'lavoro':
      return <LavoroPage />
    case 'atleti':
      return <AtletiPage />
    case 'home':
      return <HomePage />
    case 'calendario':
    default:
      return <CalendarPage />
  }
}

function AppShell() {
  const route = useRoute()
  // Il calendario è la pagina iniziale: qui il menu laterale DEVE esserci (è
  // l'unico modo per raggiungere "Le mie schede" e le altre sezioni). Resta
  // nascosto durante l'allenamento (per non distrarre) e nelle pagine di
  // dettaglio raggiunte dal menu (storico, schede generali), che hanno il "back".
  const senzaMenu = [
    'allenamento', 'storico', 'schede-generali', 'dieta', 'dieta-editor',
    'dieta-oggi', 'dieta-importa', 'dieta-preferenze', 'consigliato', 'esercizi',
    'esercizi-gruppo', 'amici', 'atleti', 'schede-prefatte', 'condivisi', 'dati',
  ]
  const mostraMenu = !senzaMenu.includes(route.name)
  return (
    <>
      {pagina(route)}
      {mostraMenu && <MenuLaterale />}
    </>
  )
}

function Root() {
  const { utenteCorrente } = useAccount()

  // Nessun profilo scelto: mostra la schermata "Chi sei?".
  if (!utenteCorrente) return <UserGate />

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
    </AccountProvider>
  )
}
