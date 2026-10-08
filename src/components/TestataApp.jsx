import { useEffect } from 'react'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { ceAvvisoPt } from '../lib/pt'
import logo from '../assets/logo.png'
import Avatar from './Avatar'

// ---------------------------------------------------------------------------
// La testata dell'app: logo, il nome e l'avatar del profilo. Sta in cima a
// tutte le pagine (la monta AppShell in App.jsx), tranne l'allenamento, dove
// non c'è nemmeno la barra in basso: lì lo schermo è della sessione.
//
// Il nome è scritto come un marchio: "Progetto" pieno, "Palestra" con un
// gradiente blu, attaccati. Per chi legge lo schermo è "Progetto Palestra".
//
// L'avatar apre il profilo (la finestra di vetro, pages/ProfiloPage): prima
// stava solo nella Home, adesso si raggiunge da ovunque. Il pallino dice che il
// collegamento col PT messo in registrazione non è andato (lib/pt).
//
// ⚠️ È appiccicata in alto, e le testate delle pagine (.topbar) si
// appiccicano SOTTO di lei (index.css, --testata-alta): due cose ferme in cima
// che si coprissero a vicenda farebbero sparire il titolo della pagina.
// ---------------------------------------------------------------------------

export default function TestataApp() {
  const { utenteCorrente } = useAccount()
  const nome = utenteCorrente?.nome || ''
  const avvisoPt = ceAvvisoPt()

  // Come la barra in basso (BarraBasso): una classe sul body dice al CSS che
  // la testata c'è, e le testate delle pagine si spostano sotto di lei.
  useEffect(() => {
    document.body.classList.add('ha-testata')
    return () => document.body.classList.remove('ha-testata')
  }, [])

  return (
    <header className="testata-app">
      {/* Tre colonne: logo a sinistra, nome al CENTRO dello schermo (non dello
          spazio che avanza), avatar a destra. Logo e nome portano alla Home. */}
      <button className="testata-logo" onClick={() => navigate(routes.inizio())} aria-label="Vai alla Home">
        <img src={logo} alt="" />
      </button>
      <button className="testata-nome" onClick={() => navigate(routes.inizio())} aria-label="Progetto Palestra, vai alla Home">
        Progetto<span>Palestra</span>
      </button>
      <button className="profilo-btn" onClick={() => navigate(routes.profilo())} aria-label={`Profilo di ${nome}`}>
        <Avatar nome={nome} foto={utenteCorrente?.foto || ''} taglia="" />
        {avvisoPt && <span className="pallino-notifica handle" aria-hidden="true" />}
      </button>
    </header>
  )
}
