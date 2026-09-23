import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { leggiConversazioni } from '../lib/chat'
import { dataOra } from '../lib/format'
import { IconChevron } from './icons'

// ---------------------------------------------------------------------------
// L'elenco delle conversazioni, in cima alla pagina Amici.
//
// Mostra solo le chat GIÀ cominciate. Per cominciarne una si passa dal profilo
// dell'amico, dove c'è "Scrivi": un elenco che mostra anche le chat vuote
// sarebbe lungo quanto la lista degli amici e non direbbe niente.
//
// ⚠️ L'ultimo messaggio e il conto dei non letti li calcola il database
// (`conversazioni()`): farlo qui vorrebbe dire scaricare tutti i messaggi di
// tutte le chat per mostrarne una riga ciascuna.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function ElencoChat() {
  const { utenti, amici } = useAccount()
  const [righe, setRighe] = useState([])
  const [caricato, setCaricato] = useState(false)

  const carica = useCallback(async () => {
    const esito = await leggiConversazioni()
    setRighe(esito.righe)
    setCaricato(true)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  // Niente conversazioni: non si mostra un vuoto con un titolo sopra, si tace.
  if (!caricato || righe.length === 0) return null

  const nomeDi = (id) => {
    const p = (utenti || []).find((u) => u.id === id) || (amici || []).find((a) => a.id === id)
    return p?.nome || 'Qualcuno'
  }

  return (
    <>
      <div className="section-title">Messaggi</div>
      <div className="stack" style={{ gap: 8 }}>
        {righe.map((c) => (
          <button
            key={c.altro_id}
            className="menu-voce"
            onClick={() => navigate(routes.chat(c.altro_id))}
          >
            <span className="menu-voce-icona" aria-hidden="true">{iniziale(nomeDi(c.altro_id))}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="menu-voce-nome">{nomeDi(c.altro_id)}</span>
              <span className="menu-voce-desc">
                {/* "Tu:" davanti al proprio, se no non si capisce chi ha
                    scritto l'ultima cosa e ogni riga sembra un messaggio
                    ricevuto. */}
                {c.da_me ? 'Tu: ' : ''}
                {c.testo}
              </span>
            </span>
            <span className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
              <span className="faint" style={{ fontSize: 11 }}>{dataOra(c.creato_il)}</span>
              {Number(c.non_letti) > 0 && (
                <span className="pallino-notifica">{c.non_letti}</span>
              )}
            </span>
            <IconChevron className="faint" />
          </button>
        ))}
      </div>
    </>
  )
}
