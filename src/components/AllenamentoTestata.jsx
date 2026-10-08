import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { navigate, routes } from '../lib/router'
import TestataSezione from './TestataSezione'
import {
  IconBolt,
  IconChevron,
  IconClipboard,
  IconClose,
  IconEdit,
  IconLibrary,
  IconPlus,
  IconUpload,
} from './icons'

// ---------------------------------------------------------------------------
// La testata della sezione Allenamento: "Programmi | Storico" e il "+".
//
// Il "+" è la porta per TUTTO quello che fa nascere un allenamento o una
// scheda. Prima queste strade erano sparse in tre posti (il "+" del
// calendario, "Nuova scheda" in fondo alle schede, tre voci del menu
// laterale): chi voleva cominciare doveva sapere da dove.
// ---------------------------------------------------------------------------

const SCELTE = [
  {
    id: 'libero',
    nome: 'Allenamento libero',
    desc: 'Scrivi adesso cosa fai e parti. Non è una scheda.',
    Icona: IconEdit,
    vai: () => navigate(routes.nuovoAllenamento()),
  },
  {
    id: 'consigliato',
    nome: 'Allenamento consigliato',
    desc: 'Su misura, in base a cosa hai allenato di recente.',
    Icona: IconBolt,
    vai: () => navigate(routes.consigliato()),
  },
  {
    id: 'nuova',
    nome: 'Nuova scheda',
    desc: 'Un programma a settimane: a mano o incollato da testo.',
    Icona: IconUpload,
    vai: () => navigate(routes.nuova()),
  },
  {
    id: 'prefatte',
    nome: 'Schede prefatte',
    desc: 'Programmi già pronti per obiettivo, giorni e durata.',
    Icona: IconClipboard,
    vai: () => navigate(routes.schedePrefatte()),
  },
  {
    id: 'generali',
    nome: 'Schede generali',
    desc: 'Le schede degli altri utenti: cerca e copia.',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
]

const SCHEDE_ALLENAMENTO = [
  { id: 'programmi', nome: 'Programmi', vai: routes.home() },
  { id: 'storico', nome: 'Storico', vai: routes.calendario() },
]

export default function AllenamentoTestata({ attiva }) {
  const [aperto, setAperto] = useState(false)

  useEffect(() => {
    if (!aperto) return
    const onKey = (e) => e.key === 'Escape' && setAperto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto])

  return (
    <>
      <TestataSezione titolo="Allenamento" schede={SCHEDE_ALLENAMENTO} attiva={attiva}>
        <button
          className="icon-btn icon-btn-pieno"
          onClick={() => setAperto(true)}
          aria-label="Nuovo allenamento o scheda"
          aria-expanded={aperto}
        >
          <IconPlus />
        </button>
      </TestataSezione>

      {aperto &&
        createPortal(
          <div className="foglio-backdrop" onClick={() => setAperto(false)}>
            <div
              className="foglio"
              role="dialog"
              aria-label="Cosa vuoi fare"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="foglio-maniglia" aria-hidden="true" />
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <h3>Cosa vuoi fare?</h3>
                <button className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {SCELTE.map((s) => (
                  <button
                    key={s.id}
                    className="menu-voce"
                    onClick={() => {
                      setAperto(false)
                      s.vai()
                    }}
                  >
                    <span className="menu-voce-icona" aria-hidden="true">
                      <s.Icona width={20} height={20} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">{s.nome}</span>
                      <span className="menu-voce-desc">{s.desc}</span>
                    </span>
                    <IconChevron className="faint" />
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
