import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { leggiConversazioni } from '../lib/chat'
import { quandoBreve } from '../lib/format'

// ---------------------------------------------------------------------------
// L'elenco delle conversazioni, in cima alla pagina Amici.
//
// Mostra solo le chat GIÀ cominciate, dalla più recente. Per cominciarne una
// si passa dalla lista degli amici (il tasto in alto a destra): un elenco che
// mostra anche le chat vuote sarebbe lungo quanto la lista degli amici e non
// direbbe niente.
//
// Compatto apposta, come l'elenco dei messaggi di un telefono: un riquadro
// solo con le righe separate da un filo, due righe di testo per chat (chi e
// quando; l'ultimo messaggio e i non letti), e solo le prime LIMITE — le
// altre dietro "Vedi tutte". Prima era una card grande per chat, e tre chat
// spingevano tutto il resto della pagina fuori dallo schermo.
//
// ⚠️ L'ultimo messaggio e il conto dei non letti li calcola il database
// (`conversazioni()`): farlo qui vorrebbe dire scaricare tutti i messaggi di
// tutte le chat per mostrarne una riga ciascuna.
// ---------------------------------------------------------------------------

const LIMITE = 4

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

/** @param {{quandoVuoto?: import('react').ReactNode}} props  cosa dire se non ci sono chat */
export default function ElencoChat({ quandoVuoto = null }) {
  const { utenti, amici } = useAccount()
  const [righe, setRighe] = useState([])
  const [caricato, setCaricato] = useState(false)
  const [tutte, setTutte] = useState(false)

  const carica = useCallback(async () => {
    const esito = await leggiConversazioni()
    setRighe(esito.righe)
    setCaricato(true)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!caricato) return null

  const nonLettiTot = righe.reduce((n, c) => n + (Number(c.non_letti) || 0), 0)
  const visibili = tutte ? righe : righe.slice(0, LIMITE)

  const nomeDi = (id) => {
    const p = (utenti || []).find((u) => u.id === id) || (amici || []).find((a) => a.id === id)
    return p?.nome || 'Qualcuno'
  }

  return (
    <>
      <div className="section-title">
        Messaggi{nonLettiTot > 0 ? ` · ${nonLettiTot} da leggere` : ''}
      </div>
      {righe.length === 0 ? (
        quandoVuoto
      ) : (
        <div className="chat-lista">
          {visibili.map((c) => {
            const nome = nomeDi(c.altro_id)
            const nonLetti = Number(c.non_letti) || 0
            return (
              <button
                key={c.altro_id}
                className={'chat-lista-riga' + (nonLetti > 0 ? ' da-leggere' : '')}
                onClick={() => navigate(routes.chat(c.altro_id))}
              >
                <span className="user-avatar sm" aria-hidden="true">
                  {iniziale(nome)}
                </span>
                <span className="chat-lista-testo">
                  <span className="chat-lista-su">
                    <span className="chat-lista-nome">{nome}</span>
                    <span className="chat-lista-ora">{quandoBreve(c.creato_il)}</span>
                  </span>
                  <span className="chat-lista-giu">
                    <span className="chat-lista-anteprima">
                      {/* "Tu:" davanti al proprio, se no non si capisce chi ha
                          scritto l'ultima cosa e ogni riga sembra un messaggio
                          ricevuto. */}
                      {c.da_me ? 'Tu: ' : ''}
                      {c.testo}
                    </span>
                    {nonLetti > 0 && (
                      <span className="pallino-notifica" aria-label={`${nonLetti} da leggere`}>
                        {nonLetti}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            )
          })}
          {righe.length > LIMITE && (
            <button className="chat-lista-altre" onClick={() => setTutte((t) => !t)}>
              {tutte ? 'Mostra meno' : `Vedi tutte (${righe.length})`}
            </button>
          )}
        </div>
      )}
    </>
  )
}
