import { useEffect, useState } from 'react'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { scriviTema, temaAttuale } from '../lib/tema'
import {
  IconMenu,
  IconClose,
  IconChevron,
  IconLibrary,
  IconBolt,
  IconGrid,
  IconClipboard,
  IconLuna,
  IconSole,
} from './icons'

// Menu laterale delle "funzionalità secondarie".
// Un piccolo handle a 3 linee sul bordo destro apre un pannello (drawer) che fa
// da legenda con le sezioni dell'app. Qui stanno solo le funzionalità
// trasversali: il profilo e le sue sezioni personali ("Schede e allenamenti", "Dieta",
// "Condivisi", "Disconnetti") sono nel bottone del profilo in alto a sinistra
// (ProfiloMenu).
// ⚠️ "Condivisi" stava anche qui, in doppio: due porte per la stessa pagina, e
// due pallini rossi per le stesse cose da guardare. È roba che arriva a TE, non
// una funzionalità trasversale, quindi resta solo nel menu del profilo — dove il
// pallino sull'avatar la conta già.
// ⚠️ "Amici" e "Storico Allenamenti" NON stanno più qui: dal 2026-09-23 sono
// due linguette della barra in basso (components/BarraBasso). Rimetterle
// vorrebbe dire due porte per la stessa cosa, che è esattamente lo sbaglio
// raccontato qui sopra per "Condivisi".
// Per aggiungerne altre basta inserire una voce in VOCI.
const VOCI = [
  {
    id: 'consigliato',
    nome: 'Allenamento consigliato',
    descrizione: 'Un allenamento su misura in base ai tuoi allenamenti',
    emoji: '⚡',
    Icona: IconBolt,
    vai: () => navigate(routes.consigliato()),
  },
  {
    id: 'schede-prefatte',
    nome: 'Schede prefatte',
    descrizione: 'Programmi già pronti per obiettivo, giorni e durata',
    emoji: '📋',
    Icona: IconClipboard,
    vai: () => navigate(routes.schedePrefatte()),
  },
  {
    id: 'esercizi',
    nome: 'Esercizi',
    descrizione: 'Tutte le varianti di esercizio per gruppo muscolare',
    emoji: '🧩',
    Icona: IconGrid,
    vai: () => navigate(routes.esercizi()),
  },
  {
    id: 'schede-generali',
    nome: 'Schede Generali',
    descrizione: 'Schede di tutti gli utenti, cerca per esercizio e filtra',
    emoji: '📚',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
  // Prossime funzionalità qui...
]

export default function MenuLaterale() {
  const [aperto, setAperto] = useState(false)
  // Il tema vero sta sull'<html> (lib/tema.js): qui se ne tiene una copia solo
  // per ridisegnare l'interruttore, e si legge quando serve invece di
  // inizializzarla a un valore fisso — chi ha il telefono scuro deve trovare
  // l'interruttore gia' acceso.
  const [tema, setTema] = useState(temaAttuale)
  const account = useAccount()
  // Quante cose aspettano una risposta, in tutto: serve al pallino sull'handle,
  // che è l'unica cosa visibile a menu chiuso.
  const daFareTotale = VOCI.reduce((n, v) => n + (v.daFare ? v.daFare(account) : 0), 0)

  // Chiude con ESC.
  useEffect(() => {
    if (!aperto) return
    const onKey = (e) => e.key === 'Escape' && setAperto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto])

  const apriVoce = (voce) => {
    setAperto(false)
    voce.vai()
  }

  const cambiaTema = () => {
    const nuovo = tema === 'scuro' ? 'chiaro' : 'scuro'
    scriviTema(nuovo)
    setTema(nuovo)
  }

  return (
    <>
      <button
        className="menu-handle"
        aria-label="Apri menu funzionalità"
        aria-expanded={aperto}
        onClick={() => setAperto(true)}
      >
        <IconMenu width={18} height={18} />
        {daFareTotale > 0 && <span className="pallino-notifica handle" aria-hidden="true" />}
      </button>

      {aperto && (
        <div className="drawer-backdrop" onClick={() => setAperto(false)}>
          <div
            className="drawer"
            role="dialog"
            aria-label="Funzionalità"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <div className="drawer-title">Funzionalità</div>
                <div className="drawer-sub">Strumenti extra</div>
              </div>
              <button className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
                <IconClose />
              </button>
            </div>

            <div className="stack" style={{ gap: 10, marginTop: 6 }}>
              {VOCI.map((v) => (
                <button key={v.id} className="menu-voce" onClick={() => apriVoce(v)}>
                  <span className="menu-voce-icona" aria-hidden="true">
                    {v.Icona ? <v.Icona width={20} height={20} /> : v.emoji}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="menu-voce-nome">{v.nome}</span>
                    <span className="menu-voce-desc">{v.descrizione}</span>
                  </span>
                  {v.daFare && v.daFare(account) > 0 && (
                    <span className="pallino-notifica">{v.daFare(account)}</span>
                  )}
                  <IconChevron className="faint" />
                </button>
              ))}
            </div>

            {/* Non e' una sezione dove andare: e' un'impostazione, quindi una
                riga con l'interruttore e non una voce con la freccia. */}
            <div className="menu-tema">
              <span className="menu-voce-icona" aria-hidden="true">
                {tema === 'scuro' ? <IconLuna width={20} height={20} /> : <IconSole width={20} height={20} />}
              </span>
              <span className="menu-tema-testo">
                <span className="menu-voce-nome">Tema scuro</span>
                <span className="menu-voce-desc">
                  {tema === 'scuro' ? 'Fondo nero' : 'Fondo bianco'}
                </span>
              </span>
              <button
                className={'switch' + (tema === 'scuro' ? ' on' : '')}
                onClick={cambiaTema}
                role="switch"
                aria-checked={tema === 'scuro'}
                aria-label="Tema scuro"
              >
                <span className="knob" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
