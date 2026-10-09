import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import Avatar from '../components/Avatar'
import { contattoCon, rispondiContatto } from '../lib/contattiPt'
import { profiloPubblico } from '../lib/social'
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
  const { utenteCorrente, utenti, amici, mioPt, confermaPt } = useAccount()
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

  // Chi non è amico né collegato (un PT appena contattato, un atleta che ti
  // ha contattato) non sta fra `utenti`: il nome si chiede a `profilo_pubblico`.
  const [daFuori, setDaFuori] = useState(null)
  const conosciuto =
    (utenti || []).find((u) => u.id === id) || (amici || []).find((a) => a.id === id) || null
  const altro = conosciuto || (daFuori?.id === id ? daFuori : null)
  useEffect(() => {
    if (conosciuto || !id) return undefined
    let vivo = true
    profiloPubblico(id).then((e) => vivo && e.profilo && setDaFuori(e.profilo))
    return () => {
      vivo = false
    }
  }, [conosciuto, id])
  const sonoAmici = (amici || []).some((a) => a.id === id)

  // "Contatta il PT" (lib/contattiPt): con un contatto si scrive anche senza
  // essere amici, e in cima compaiono i tasti per lo stato in cui è.
  const [contatto, setContatto] = useState(null)
  const [erroreContatto, setErroreContatto] = useState('')
  const leggiContatto = useCallback(() => {
    contattoCon(ioId, id).then(setContatto)
  }, [ioId, id])
  useEffect(() => {
    leggiContatto()
  }, [leggiContatto])
  const puoScrivere = sonoAmici || !!contatto
  const rispondi = async (fai) => {
    setErroreContatto('')
    const esito = await fai()
    if (!esito.ok) setErroreContatto(esito.errore)
    leggiContatto()
  }

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
        // Le mosse del contatto col PT arrivano come messaggi: lo stato
        // potrebbe essere cambiato.
        leggiContatto()
      },
      onTolto: (idTolto) => setRighe((r) => r.filter((x) => x.id !== idTolto)),
    })
    return stop
  }, [ioId, id, leggiContatto])

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
        <button className="apri-utente" onClick={() => navigate(routes.utente(id))} aria-label={`Profilo di ${altro?.nome || ''}`}>
          <Avatar id={id} nome={altro?.nome} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: 0 }}>{altro?.nome || 'Chat'}</h1>
          {altro?.username && (
            <div className="muted" style={{ fontSize: 12 }}>@{altro.username}</div>
          )}
        </div>
      </div>

      {contatto && (
        <BannerContatto
          contatto={contatto}
          ioId={ioId}
          nome={altro?.nome || ''}
          mioPt={mioPt}
          errore={erroreContatto}
          onPrendo={(si) => rispondi(() => rispondiContatto(id, si))}
          onConferma={(si) => rispondi(() => confermaPt(id, si))}
        />
      )}

      <div className="chat-righe">
        {!caricato ? (
          <p className="muted">Un attimo…</p>
        ) : righe.length === 0 ? (
          <div className="empty">
            <div className="big">💬</div>
            <p>
              Ancora niente.
              <br />
              {puoScrivere
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
          className="input"
          value={testo}
          placeholder={puoScrivere ? 'Scrivi…' : 'Dovete essere amici per scrivervi'}
          onChange={(e) => setTesto(e.target.value)}
          disabled={!puoScrivere}
        />
        <button type="submit" className="btn" disabled={!testoValido(testo) || inCorso || !puoScrivere}>
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

// In cima alla chat, quando c'è un "Contatta il PT" fra i due: cosa è
// successo e, se tocca a me, i tasti. ⚠️ Conferma SEMPRE l'atleta, anche se
// non ha un PT: è lui a scegliere chi lo segue.
function BannerContatto({ contatto, ioId, nome, mioPt, errore, onPrendo, onConferma }) {
  const sonoIlPt = contatto.ptId === ioId
  const { stato } = contatto
  const altroPt = mioPt && mioPt.id !== contatto.ptId ? mioPt : null
  let testo = ''
  let tasti = null
  if (sonoIlPt && stato === 'attesa') {
    testo = `${nome} vorrebbe che lo seguissi come personal trainer.`
    tasti = (
      <>
        <button className="btn btn-accent grow" onClick={() => onPrendo(true)}>Prendo l’incarico</button>
        <button className="btn grow" onClick={() => onPrendo(false)}>Rifiuta</button>
      </>
    )
  } else if (sonoIlPt && stato === 'proposta') {
    testo = `Hai preso l’incarico: aspetta che ${nome} confermi.`
  } else if (!sonoIlPt && stato === 'attesa') {
    testo = `Hai contattato ${nome}: aspetta che risponda.`
  } else if (!sonoIlPt && stato === 'proposta') {
    testo = altroPt
      ? `${nome} può seguirti. Adesso ti segue ${altroPt.nome}: vuoi cambiare?`
      : `${nome} può seguirti come personal trainer.`
    tasti = (
      <>
        <button className="btn btn-accent grow" onClick={() => onConferma(true)}>
          {altroPt ? `Passa a ${nome}` : 'Accetta'}
        </button>
        <button className="btn grow" onClick={() => onConferma(false)}>
          {altroPt ? `Resta con ${altroPt.nome}` : 'No, grazie'}
        </button>
      </>
    )
  } else if (stato === 'accettato') {
    testo = sonoIlPt ? `Segui ${nome}.` : `${nome} è il tuo personal trainer.`
  }
  if (!testo) return null
  return (
    <div className="card chat-contatto">
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{testo}</p>
      {tasti && <div className="row" style={{ gap: 8, marginTop: 10 }}>{tasti}</div>}
      {errore && <p className="form-error" style={{ marginTop: 8 }}>{errore}</p>}
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
