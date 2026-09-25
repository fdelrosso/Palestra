import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import {
  ascoltaConversazione,
  eliminaMessaggio,
  inviaMessaggio,
  leggiMessaggi,
  nascondiMessaggio,
  segnaLetti,
  testoValido,
} from '../lib/chat'
import { dataOra } from '../lib/format'
import MandaAdAmico from '../components/MandaAdAmico'
import { IconBack, IconPlus, IconTrash } from '../components/icons'

// ---------------------------------------------------------------------------
// Una conversazione. Solo testo: le foto e i video fra amici sono gli effimeri,
// che scadono — vedi il commento in testa a src/lib/chat.js.
//
// ⚠️ I messaggi nuovi arrivano in TEMPO REALE (Supabase Realtime). Se il canale
// non si apre — rete ballerina, pagina lasciata aperta per ore — la chat
// continua a funzionare: si vedono riaprendo. Quello che NON si fa è fingere
// che sia partito qualcosa che non è partito: un messaggio compare solo dopo
// che il server l'ha accettato.
//
// ⚠️ Cancellare chiede SEMPRE conferma, dentro la pagina e non con `confirm()`
// (che dove non compare risponde "no" da solo). La domanda dice quale dei due:
// "per me" (all'altro resta) si può su ogni messaggio, "per tutti" solo sui
// propri — lo decide il database.
// ---------------------------------------------------------------------------

export default function ChatPage({ id }) {
  const { utenteCorrente, utenti, amici } = useAccount()
  const ioId = utenteCorrente?.id || null

  const [righe, setRighe] = useState([])
  const [testo, setTesto] = useState('')
  const [caricato, setCaricato] = useState(false)
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  // Il messaggio di cui si sta chiedendo "per me o per tutti?".
  const [daCancellare, setDaCancellare] = useState(null)
  // Il "+" accanto al campo: mandargli una scheda, un allenamento, una foto.
  const [manda, setManda] = useState(false)
  const fondo = useRef(null)

  const altro =
    (utenti || []).find((u) => u.id === id) || (amici || []).find((a) => a.id === id) || null
  const sonoAmici = (amici || []).some((a) => a.id === id)

  const carica = useCallback(async () => {
    const esito = await leggiMessaggi(ioId, id)
    setRighe(esito.righe)
    setCaricato(true)
    if (esito.righe.length > 0) segnaLetti(ioId, id)
  }, [ioId, id])

  useEffect(() => {
    carica()
  }, [carica])

  // Il tempo reale. ⚠️ Lo `stop` va chiamato: un canale lasciato aperto
  // continua a ricevere finché la pagina vive.
  useEffect(() => {
    if (!ioId || !id) return
    const stop = ascoltaConversazione(ioId, id, {
      onNuovo: (m) => {
        // ⚠️ Sull'id, non sul testo: due messaggi identici mandati due volte
        // sono due messaggi, e uno dei due non deve sparire.
        setRighe((r) => (r.some((x) => x.id === m.id) ? r : [...r, m]))
        if (m.a_id === ioId) segnaLetti(ioId, id)
      },
      onTolto: (idTolto) => setRighe((r) => r.filter((x) => x.id !== idTolto)),
    })
    return stop
  }, [ioId, id])

  // Si resta in fondo, dove sta il messaggio nuovo.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
  }, [righe.length])

  const invia = async (e) => {
    e?.preventDefault()
    if (!testoValido(testo) || inCorso) return
    setInCorso(true)
    setErrore('')
    const esito = await inviaMessaggio({ daId: ioId, aId: id, testo })
    if (esito.ok) {
      setTesto('')
      setRighe((r) => (r.some((x) => x.id === esito.riga.id) ? r : [...r, esito.riga]))
    } else {
      setErrore(esito.errore)
    }
    setInCorso(false)
  }

  const cancella = async (m, perTutti) => {
    setDaCancellare(null)
    setErrore('')
    const esito = perTutti ? await eliminaMessaggio(m.id) : await nascondiMessaggio(m)
    if (esito.ok) setRighe((r) => r.filter((x) => x.id !== m.id))
    else setErrore(esito.errore)
  }

  return (
    <div className="app chat-app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: 0 }}>{altro?.nome || 'Chat'}</h1>
          {altro?.username && (
            <div className="muted" style={{ fontSize: 12 }}>@{altro.username}</div>
          )}
        </div>
      </div>

      <div className="chat-righe">
        {!caricato ? (
          <p className="muted">Un attimo…</p>
        ) : righe.length === 0 ? (
          <div className="empty">
            <div className="big">💬</div>
            <p>
              Ancora niente.
              <br />
              {sonoAmici
                ? 'Scrivi la prima cosa.'
                : 'Puoi scrivere solo alle persone con cui sei amico.'}
            </p>
          </div>
        ) : (
          righe.map((m) => {
            const mio = m.da_id === ioId
            return (
              <div key={m.id} className={'chat-bolla' + (mio ? ' mia' : '')}>
                <div className="chat-testo">{m.testo}</div>
                <div className="chat-ora">
                  {dataOra(m.creato_il)}
                  <button
                    className="chat-cancella"
                    onClick={() => setDaCancellare(m)}
                    aria-label="Elimina messaggio"
                    title="Elimina messaggio"
                  >
                    <IconTrash width={12} height={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}
        <div ref={fondo} />
      </div>

      {errore && (
        <p className="muted" style={{ fontSize: 12.5, padding: '0 2px' }}>
          {errore}
        </p>
      )}

      <form className="chat-barra" onSubmit={invia}>
        {/* ⚠️ Quello che parte da qui NON diventa un messaggio: la scheda e
            l'allenamento finiscono fra i "Ricevuti" di Amici, la foto negli
            effimeri che scadono. Il "+" sta qui perche' e' qui che viene in
            mente di mandare qualcosa. */}
        <button
          type="button"
          className="icon-btn"
          aria-label="Manda una scheda, un allenamento o una foto"
          onClick={() => setManda(true)}
          disabled={!sonoAmici}
        >
          <IconPlus />
        </button>
        <input
          type="text"
          value={testo}
          placeholder={sonoAmici ? 'Scrivi…' : 'Dovete essere amici per scrivervi'}
          onChange={(e) => setTesto(e.target.value)}
          disabled={!sonoAmici}
        />
        <button type="submit" className="btn" disabled={!testoValido(testo) || inCorso || !sonoAmici}>
          Invia
        </button>
      </form>

      {manda && (
        <MandaAdAmico
          amico={{ id, nome: altro?.nome || 'questo amico' }}
          onChiudi={() => setManda(false)}
        />
      )}

      {daCancellare && (
        <ConfermaCancella
          mio={daCancellare.da_id === ioId}
          nomeAltro={altro?.nome}
          onPerMe={() => cancella(daCancellare, false)}
          onPerTutti={() => cancella(daCancellare, true)}
          onAnnulla={() => setDaCancellare(null)}
        />
      )}
    </div>
  )
}

// La domanda prima di cancellare. "Per tutti" c'è solo sui propri messaggi:
// su quelli ricevuti il database non lo permetterebbe, e un tasto che poi
// fallisce è peggio di un tasto che non c'è.
function ConfermaCancella({ mio, nomeAltro, onPerMe, onPerTutti, onAnnulla }) {
  const altro = nomeAltro || "l'altro"
  return createPortal(
    <div className="modal-backdrop" onClick={onAnnulla}>
      <div
        className="modal"
        role="dialog"
        aria-label="Eliminare il messaggio?"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 4 }}>Eliminare il messaggio?</h3>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
          {mio
            ? `"Per me" lo toglie solo a te: ${altro} continua a vederlo. "Per tutti" lo toglie anche a ${altro}.`
            : `Lo toglie solo a te: ${altro} continua a vederlo.`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mio && (
            <button type="button" className="btn btn-danger-pieno btn-block" onClick={onPerTutti}>
              Elimina per tutti
            </button>
          )}
          <button type="button" className="btn btn-danger-pieno btn-block" onClick={onPerMe}>
            Elimina per me
          </button>
          <button type="button" className="btn btn-block" onClick={onAnnulla} autoFocus>
            Annulla
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
