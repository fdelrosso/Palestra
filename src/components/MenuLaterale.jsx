import { useEffect, useState } from 'react'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import {
  IconMenu,
  IconClose,
  IconChevron,
  IconClock,
  IconLibrary,
  IconBolt,
  IconGrid,
  IconAmici,
  IconClipboard,
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
    id: 'amici',
    nome: 'Amici',
    descrizione: 'Le persone con cui hai stretto amicizia e i loro allenamenti',
    emoji: '👋',
    Icona: IconAmici,
    vai: () => navigate(routes.amici()),
    // Le richieste di amicizia da accettare: il pallino sulla voce del menu.
    daFare: (acc) => acc.richiesteAmicizia.ricevute.length,
  },
  {
    id: 'storico',
    nome: 'Storico Allenamenti',
    descrizione: 'Allenamenti di tutti gli utenti, per prendere spunto',
    emoji: '🗒️',
    Icona: IconClock,
    vai: () => navigate(routes.storico()),
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
          </div>
        </div>
      )}
    </>
  )
}
