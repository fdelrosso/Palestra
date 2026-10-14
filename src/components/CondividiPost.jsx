import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TIPO_CONDIVISIONE } from '../lib/condivisioni'
import { statisticheRecap } from '../lib/recap'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
import { routes } from '../lib/router'
import CondividiConAmici from './CondividiConAmici'
import { IconChevron, IconClose, IconComment, IconShare } from './icons'

// ---------------------------------------------------------------------------
// "Condividi" su un post del feed (components/PostSchermo): l'allenamento di
// un altro, mandato
//   - DENTRO l'app, a uno o più amici: arriva nella chat con loro come recap
//     (lib/scambi), la card ridisegnata dai numeri;
//   - FUORI dall'app (WhatsApp, Instagram…): un LINK al post (/post/<chiave>),
//     che apre l'app dritta su quel post — chi non ha ancora fatto l'accesso
//     ci arriva subito dopo (App.jsx, useProfiloDaLink). Sul telefono parte
//     il foglio di condivisione; sul computer il link si copia.
//
// ⚠️ Solo per gli allenamenti PUBBLICI: lo decide chi lo mostra (PostSchermo
// mette il tasto solo lì). Uno "solo al PT", che un PT vede nella linguetta
// Atleti, l'atleta l'ha dato a lui e a nessun altro: farlo girare sarebbe
// tradire quella scelta.
// ---------------------------------------------------------------------------

export default function CondividiPost({ voce, onChiudi }) {
  const [amici, setAmici] = useState(false)
  const [esito, setEsito] = useState('')
  const [inCorso, setInCorso] = useState(false)

  // Un allenamento con le serie va come recap (la card); uno segnato a mano,
  // senza serie, la card non ce l'ha e va com'è.
  const daMandare = voce.dettagliato
    ? {
        tipo: TIPO_CONDIVISIONE.RECAP,
        titolo: voce.nomeGiorno,
        sottotitolo: `di ${voce.utenteNome}`,
        payload: {
          riep: voce,
          stat: statisticheRecap(voce),
          utente: voce.utenteNome || '',
          commento: voce.nota || '',
          layout: voce.recap || null,
        },
      }
    : {
        tipo: TIPO_CONDIVISIONE.ALLENAMENTO,
        titolo: voce.nomeGiorno,
        sottotitolo: `di ${voce.utenteNome}`,
        payload: voce,
      }

  const link = `${window.location.origin}${routes.post(chiaveAllenamento(voce))}`
  const testo = `${voce.nomeGiorno} di ${voce.utenteNome} su Progetto Palestra 💪`

  const fuori = async () => {
    setInCorso(true)
    setEsito('')
    const telefono = window.matchMedia?.('(pointer: coarse)').matches
    try {
      if (telefono && navigator.share) {
        await navigator.share({ title: testo, text: testo, url: link })
      } else {
        await navigator.clipboard.writeText(`${testo}\n${link}`)
        setEsito('Link copiato: incollalo dove vuoi.')
      }
    } catch (err) {
      // Chiudere il foglio di condivisione non è un errore.
      if (err?.name !== 'AbortError') setEsito(`Copia questo link: ${link}`)
    }
    setInCorso(false)
  }

  if (amici) return <CondividiConAmici {...daMandare} onChiudi={onChiudi} />

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Condividi l’allenamento" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 2 }}>Condividi</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              {voce.nomeGiorno} di {voce.utenteNome}
            </div>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <button className="menu-voce" onClick={() => setAmici(true)}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconComment width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Manda a un amico</span>
              <span className="menu-voce-desc">Lo trova nella vostra chat</span>
            </span>
            <IconChevron className="faint" />
          </button>
          <button className="menu-voce" onClick={fuori} disabled={inCorso}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconShare width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Condividi il link</span>
              <span className="menu-voce-desc">WhatsApp, Instagram… chi lo tocca apre il post nell’app</span>
            </span>
            <IconChevron className="faint" />
          </button>
        </div>
        {esito && (
          <p className="muted" role="status" style={{ fontSize: 13, textAlign: 'center', marginTop: 10 }}>
            {esito}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
