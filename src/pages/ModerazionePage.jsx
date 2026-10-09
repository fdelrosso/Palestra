import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import { quandoBreve } from '../lib/format'
import { urlFotoCommento } from '../lib/interazioni'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import {
  MOTIVI,
  conseguenza,
  decidi,
  motivoDi,
  motivoPrincipale,
  personeSanzionate,
  respingiSblocco,
  riassuntoMotivi,
  sblocca,
  segnalazioniAperte,
  sonoModeratore,
} from '../lib/segnalazioni'
import { IconBack } from '../components/icons'

// ---------------------------------------------------------------------------
// "Segnalazioni": la pagina del MODERATORE (Termini, punto 7). Due liste.
//
// DA DECIDERE — una voce per ogni commento o foto segnalati (tre persone che
// segnalano la stessa cosa sono una decisione sola), dalle più segnalate. Si
// vede il contenuto com'è adesso, chi l'ha pubblicato, i motivi e le righe di
// chi ha segnalato (non CHI: non serve a decidere), se è già nascosto (tre
// persone diverse) e quante cose dell'autore sono già state tolte.
//   "Togli" chiede il motivo (proposto quello più segnalato: finisce
//   nell'avviso all'autore) e dice cosa succede all'autore — avviso, blocco
//   della pubblicazione o dell'account. "Va bene così" lascia il contenuto.
//
// PERSONE BLOCCATE — chi ha la pubblicazione o l'account bloccati, con la
// richiesta di sblocco se l'ha mandata: si sblocca o si respinge, e la
// persona riceve un avviso in tutti e due i casi.
//
// Il database fa le stesse verifiche: chi non è moderatore e arriva qui da un
// indirizzo scritto a mano vede solo un avviso.
// ---------------------------------------------------------------------------

function Contenuto({ voce }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)

  useEffect(() => {
    // La foto profilo è già un indirizzo pubblico: niente da scaricare.
    if (!voce.percorso || !voce.esiste || voce.tipo === 'utente') return
    let vivo = true
    let revoca = () => {}
    const fonte =
      voce.tipo === 'commento'
        ? urlFotoCommento(voce.percorso).then((u) => ({ url: u, revoca: () => {} }))
        : fonteFotoAllenamento({ id: voce.oggetto, percorso: voce.percorso })
    fonte
      .then((f) => {
        if (!vivo) return f.revoca()
        revoca = f.revoca
        if (f.url) setUrl(f.url)
        else setMancante(true)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      revoca()
    }
  }, [voce])

  if (!voce.esiste) {
    return <div className="moderazione-testo muted">Non c’è più: l’ha già tolto chi l’ha pubblicato.</div>
  }
  if (voce.tipo === 'utente') {
    return (
      <>
        <div className="moderazione-testo">{voce.testo}</div>
        {voce.percorso ? (
          <div className="moderazione-media">
            <img src={voce.percorso} alt="Foto profilo segnalata" />
          </div>
        ) : (
          <div className="moderazione-testo muted">Nessuna foto profilo.</div>
        )}
      </>
    )
  }
  return (
    <>
      {voce.testo && <div className="moderazione-testo">{voce.testo}</div>}
      {voce.percorso && (
        <div className="moderazione-media">
          {mancante ? (
            <span className="muted" style={{ padding: 20, fontSize: 13 }}>
              Non si riesce ad aprire.
            </span>
          ) : !url ? (
            <div className="media-loading" style={{ width: '100%', height: 160 }} />
          ) : voce.media === 'video' ? (
            <video src={url} controls playsInline />
          ) : (
            <img src={url} alt="Contenuto segnalato" />
          )}
        </div>
      )}
    </>
  )
}

function VoceDaDecidere({ voce, occupata, onDecidi }) {
  // Il motivo da scrivere nell'avviso: null = non si sta ancora togliendo.
  const [motivo, setMotivo] = useState(null)
  const cosa =
    voce.tipo === 'utente' ? 'Profilo' : voce.tipo === 'commento' ? 'Commento' : voce.media === 'video' ? 'Video' : 'Foto'
  // Di una persona si può togliere solo la foto profilo (decidi_segnalazione):
  // senza foto resta "Va bene così", e il resto glielo si dice in chat.
  const siTogli = voce.esiste && (voce.tipo !== 'utente' || !!voce.percorso)
  return (
    <div className="card moderazione-voce">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14.5 }}>
          {cosa} di {voce.autoreNome}
        </strong>
        <span className={'badge' + (voce.nascosto ? ' badge-danger' : '')}>
          {voce.persone === 1 ? '1 persona' : `${voce.persone} persone`}
          {voce.nascosto ? ' · nascosto' : ''}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        {riassuntoMotivi(voce.motivi)} · prima segnalazione: {quandoBreve(voce.prima)}
      </div>
      {voce.toltiPrima > 0 && (
        <div className="form-error" style={{ fontSize: 12.5, marginTop: 4 }}>
          A {voce.autoreNome}{' '}
          {voce.toltiPrima === 1 ? 'è già stato tolto 1 contenuto' : `sono già stati tolti ${voce.toltiPrima} contenuti`}.
        </div>
      )}

      <Contenuto voce={voce} />

      {voce.dettagli.length > 0 && (
        <ul className="muted" style={{ fontSize: 13, margin: '8px 0 0', paddingLeft: 18 }}>
          {voce.dettagli.map((d, i) => (
            <li key={i}>“{d}”</li>
          ))}
        </ul>
      )}

      {motivo ? (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
            Perché lo togli? Lo leggerà {voce.autoreNome}
          </div>
          <div className="gruppo-chips">
            {MOTIVI.map((m) => (
              <button
                key={m.id}
                type="button"
                className={'chip chip-azione' + (motivo === m.id ? ' acceso' : '')}
                aria-pressed={motivo === m.id}
                onClick={() => setMotivo(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="form-error" style={{ fontSize: 13, margin: '8px 0 0' }}>
            {conseguenza(voce.toltiPrima)}
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-danger-pieno"
              style={{ flex: 1 }}
              disabled={occupata}
              onClick={() => onDecidi(voce, 'rimossa', motivo)}
            >
              {voce.tipo === 'utente' ? 'Togli la foto' : 'Togli'} ({motivoDi(motivo)?.label.toLowerCase()})
            </button>
            <button className="btn" disabled={occupata} onClick={() => setMotivo(null)}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        // Già tolto da chi l'aveva pubblicato: si archivia e basta, senza
        // contarlo come "tolto" a quella persona.
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          {siTogli && (
            <button
              className="btn btn-danger-pieno"
              style={{ flex: 1 }}
              disabled={occupata}
              onClick={() => setMotivo(motivoPrincipale(voce.motivi))}
            >
              Togli…
            </button>
          )}
          <button className="btn" style={{ flex: 1 }} disabled={occupata} onClick={() => onDecidi(voce, 'respinta')}>
            {voce.esiste ? 'Va bene così' : 'Archivia'}
          </button>
        </div>
      )}
    </div>
  )
}

function PersonaBloccata({ persona, occupata, onSblocca, onRespingi }) {
  const { nome, tolti, pubblicazioneBloccata, accountBloccato, richiesta } = persona
  return (
    <div className="card moderazione-voce">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14.5 }}>{nome}</strong>
        <span className="badge badge-danger">
          {accountBloccato ? 'Account bloccato' : pubblicazioneBloccata ? 'Pubblicazione bloccata' : 'Libero'}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        {tolti === 1 ? '1 contenuto tolto' : `${tolti} contenuti tolti`}
      </div>
      {richiesta && (
        <div className="moderazione-testo">
          <strong style={{ fontSize: 13 }}>
            Chiede lo sblocco {richiesta.tipo === 'account' ? 'dell’account' : 'della pubblicazione'} ·{' '}
            {quandoBreve(richiesta.il)}
          </strong>
          {richiesta.messaggio && <div style={{ marginTop: 4 }}>{richiesta.messaggio}</div>}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {accountBloccato && (
          <button className="btn" style={{ flex: 1 }} disabled={occupata} onClick={() => onSblocca(persona, 'account')}>
            Sblocca l’account
          </button>
        )}
        {pubblicazioneBloccata && (
          <button
            className="btn"
            style={{ flex: 1 }}
            disabled={occupata}
            onClick={() => onSblocca(persona, accountBloccato ? 'tutto' : 'pubblicazione')}
          >
            {accountBloccato ? 'Sblocca tutto' : 'Sblocca la pubblicazione'}
          </button>
        )}
        {richiesta && (
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={occupata} onClick={() => onRespingi(persona)}>
            Respingi la richiesta
          </button>
        )}
      </div>
      {accountBloccato && pubblicazioneBloccata && (
        <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
          “Sblocca l’account” lascia bloccata la pubblicazione nel Feed.
        </p>
      )}
    </div>
  )
}

export default function ModerazionePage() {
  const { utenteCorrente } = useAccount()
  const ioId = utenteCorrente?.id || null
  const [moderatore, setModeratore] = useState(null) // null = sta chiedendo
  const [voci, setVoci] = useState(null)
  const [persone, setPersone] = useState([])
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState('') // la voce su cui si sta decidendo

  const carica = useCallback(async () => {
    const [esito, sanzionate] = await Promise.all([segnalazioniAperte(), personeSanzionate()])
    setVoci(esito.voci)
    setPersone(sanzionate.persone)
    setErrore(esito.ok ? sanzionate.errore : esito.errore)
  }, [])

  useEffect(() => {
    let vivo = true
    sonoModeratore(ioId).then((si) => {
      if (!vivo) return
      setModeratore(si)
      if (si) carica()
    })
    return () => {
      vivo = false
    }
  }, [ioId, carica])

  // Ogni decisione: si chiama il database e si rilegge tutto (una rimozione
  // può bloccare qualcuno, e allora compare nella seconda lista).
  const esegui = async (chiave, azione) => {
    setInCorso(chiave)
    setErrore('')
    const r = await azione()
    if (!r.ok) setErrore(r.errore)
    await carica()
    setInCorso('')
  }

  return (
    <div className="app con-barra">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Segnalazioni</h1>
      </div>

      {moderatore === null ? (
        <p className="muted">Un attimo…</p>
      ) : !moderatore ? (
        <div className="empty">
          <div className="big">🛡️</div>
          <p>Questa pagina è solo per i moderatori.</p>
        </div>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
            Commenti e foto del Feed segnalati, dai più segnalati. Con tre persone diverse sono già
            nascosti a tutti. “Togli” li cancella e avvisa chi li ha pubblicati; al terzo contenuto
            tolto si blocca la pubblicazione, al quarto l’account.
          </p>
          {errore && <p className="form-error">{errore}</p>}

          <div className="section-title">Da decidere</div>
          {voci === null ? (
            <p className="muted">Un attimo…</p>
          ) : voci.length === 0 ? (
            <div className="empty">
              <div className="big">✅</div>
              <p>Nessuna segnalazione da guardare.</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {voci.map((v) => {
                const chiave = `${v.tipo}:${v.oggetto}`
                return (
                  <VoceDaDecidere
                    key={chiave}
                    voce={v}
                    occupata={inCorso === chiave}
                    onDecidi={(voce, esito, motivo) => esegui(chiave, () => decidi(voce, esito, motivo))}
                  />
                )
              })}
            </div>
          )}

          {persone.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 22 }}>
                Persone bloccate
              </div>
              <div className="stack" style={{ gap: 12 }}>
                {persone.map((p) => (
                  <PersonaBloccata
                    key={p.userId}
                    persona={p}
                    occupata={inCorso === p.userId}
                    onSblocca={(persona, cosa) => esegui(persona.userId, () => sblocca(persona.userId, cosa))}
                    onRespingi={(persona) => esegui(persona.userId, () => respingiSblocco(persona.richiesta.id))}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
