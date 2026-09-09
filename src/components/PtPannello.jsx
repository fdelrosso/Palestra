import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { CODICE_MIN, codiceValido, generaCodicePt, isPt, normalizzaCodice } from '../lib/pt'
import { navigate, routes } from '../lib/router'
import RichiesteLavoro from './RichiesteLavoro'
import { IconCheck, IconClose, IconCoach } from './icons'

// ---------------------------------------------------------------------------
// Pannello "Personal trainer", aperto dal menu del profilo (in alto a sinistra).
// Mostra tre cose diverse a seconda di chi lo apre:
//   - un PT      → il suo codice, le richieste da accettare e chi lo sta seguendo;
//   - un atleta con PT → chi lo segue, da quando, e come toglierlo;
//   - un atleta che ha chiesto → l'attesa: il codice è giusto, tocca al PT;
//   - un atleta senza  → il campo per inserire il codice ricevuto dal suo PT
//                        (più la scorciatoia per attivare un account PT, utile
//                        ai profili creati prima di questa funzione).
// Le scritture passano tutte da AccountContext (associaPt / dissociaPt /
// diventaPt): qui non si tocca localStorage.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

function dataBreve(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PtPannello({ onChiudi }) {
  const {
    utenteCorrente,
    utenti,
    mioPt,
    mieiAtleti,
    associaPt,
    dissociaPt,
    diventaPt,
    richiesteLavoro,
    annullaRichiesta,
  } = useAccount()

  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState('')
  const [copiato, setCopiato] = useState(false)
  // Atleta che vuole attivare un account PT: mostra il campo del nuovo codice.
  const [attivaPt, setAttivaPt] = useState(false)
  const [codiceMio, setCodiceMio] = useState('')

  if (!utenteCorrente) return null
  const sonoPt = isPt(utenteCorrente)
  // Gli altri atleti del tuo PT (tu escluso): è da loro che arriva il segnale.
  const altriAtleti = mioPt ? utenti.filter((u) => u.ptId === mioPt.id && u.id !== utenteCorrente.id).length : 0

  const copiaCodice = async (testo) => {
    try {
      await navigator.clipboard.writeText(testo)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 1800)
    } catch {
      // Clipboard negata (o contesto non sicuro): il codice è comunque a schermo.
      setCopiato(false)
    }
  }

  // La richiesta mandata al PT e ancora senza risposta (ce n'è al massimo una).
  const inAttesa = richiesteLavoro.inviate[0] || null

  const submitAssocia = (e) => {
    e.preventDefault()
    const esito = associaPt(codice)
    if (esito.ok) {
      setCodice('')
      setErrore('')
    } else {
      setErrore(esito.errore)
    }
  }

  const submitAttiva = (e) => {
    e.preventDefault()
    const esito = diventaPt(codiceMio)
    if (esito.ok) {
      setAttivaPt(false)
      setErrore('')
    } else {
      setErrore(esito.errore)
    }
  }

  const staccati = () => {
    if (
      window.confirm(
        `Non farti più seguire da ${mioPt.nome}? I tuoi dati restano tuoi: cambiano solo i consigli.`,
      )
    ) {
      dissociaPt()
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label="Personal trainer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="row" style={{ gap: 10, minWidth: 0 }}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconCoach width={20} height={20} />
            </span>
            <h3 style={{ margin: 0 }}>{sonoPt ? 'I tuoi atleti' : 'Il tuo personal trainer'}</h3>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        {sonoPt ? (
          <>
            <div className="field" style={{ marginBottom: 4 }}>
              <label>Il tuo codice PT</label>
              <div className="codice-box">
                <span className="codice-valore">{utenteCorrente.codicePt || '—'}</span>
                <button
                  className="btn btn-ghost btn-sm nowrap"
                  onClick={() => copiaCodice(utenteCorrente.codicePt)}
                >
                  {copiato ? 'Copiato' : 'Copia'}
                </button>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
              Dallo ai tuoi atleti: chi lo inserisce ti manda una richiesta, e quando l'accetti i suoi
              allenamenti consigliati seguono quello che dai agli altri.
            </p>

            <RichiesteLavoro compatto />

            <div className="section-title" style={{ marginTop: 14 }}>
              {mieiAtleti.length === 0
                ? 'Nessun atleta, per ora'
                : `${mieiAtleti.length} atlet${mieiAtleti.length === 1 ? 'a' : 'i'}`}
            </div>
            {mieiAtleti.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                Appena qualcuno inserisce il tuo codice e tu accetti, lo vedi qui.
              </p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {mieiAtleti.map((a) => (
                  <div className="row" key={a.id} style={{ gap: 10 }}>
                    <span className="user-avatar sm" aria-hidden="true">
                      {iniziale(a.nome)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14.5 }}>
                      {a.nome}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {dataBreve(a.associatoIl)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-accent btn-block"
              style={{ marginTop: 14 }}
              onClick={() => {
                onChiudi?.()
                navigate(routes.lavoro())
              }}
            >
              Apri la sezione Lavoro
            </button>
          </>
        ) : mioPt ? (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <span className="user-avatar" aria-hidden="true">
                {iniziale(mioPt.nome)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{mioPt.nome}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {utenteCorrente.associatoIl
                    ? `Ti segue dal ${dataBreve(utenteCorrente.associatoIl)}`
                    : 'Il tuo personal trainer'}
                </div>
              </div>
              <span className="badge badge-good">
                <IconCheck width={13} height={13} />
                Collegato
              </span>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
              Gli allenamenti consigliati tengono conto di quello che {mioPt.nome} fa fare più spesso{' '}
              {altriAtleti > 0
                ? `agli altri ${altriAtleti} atlet${altriAtleti === 1 ? 'a' : 'i'} che segue`
                : 'nelle sue schede'}{' '}
              — esercizi e modo di scriverli.
            </p>
            <button className="btn btn-ghost btn-block" onClick={staccati}>
              Non farti più seguire
            </button>
          </>
        ) : inAttesa ? (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <span className="user-avatar" aria-hidden="true">
                {iniziale(inAttesa.utente.nome)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{inAttesa.utente.nome}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  Richiesta mandata il {dataBreve(inAttesa.rel.creataIl)}
                </div>
              </div>
              <span className="badge">In attesa</span>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
              Il codice è giusto: ora tocca a {inAttesa.utente.nome} accettare. Finché non lo fa non
              vede niente di tuo e i consigli restano quelli di sempre.
            </p>
            <button className="btn btn-ghost btn-block" onClick={() => annullaRichiesta(inAttesa.rel.id)}>
              Annulla la richiesta
            </button>
          </>
        ) : attivaPt ? (
          <form onSubmit={submitAttiva}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="pt-codice-mio">Scegli il tuo codice PT</label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  id="pt-codice-mio"
                  className="input codice-input"
                  autoFocus
                  value={codiceMio}
                  onChange={(e) => {
                    setCodiceMio(normalizzaCodice(e.target.value))
                    setErrore('')
                  }}
                  placeholder={`Almeno ${CODICE_MIN} caratteri`}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm nowrap"
                  onClick={() => setCodiceMio(generaCodicePt(utenteCorrente.nome, utenti))}
                >
                  Genera
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                Diventando PT il tuo profilo passa dalla parte di chi allena: potrai dare questo
                codice ai tuoi atleti.
              </p>
            </div>
            {errore && <p className="form-error">{errore}</p>}
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAttivaPt(false)}>
                Annulla
              </button>
              <button
                type="submit"
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={!codiceValido(codiceMio)}
              >
                Attiva account PT
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
              Se ti segue un personal trainer che usa l'app, inserisci il codice che ti ha dato: gli
              arriva una richiesta e, quando l'accetta, gli allenamenti consigliati assomigliano a
              quello che dà ai suoi atleti.
            </p>
            <form onSubmit={submitAssocia}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor="pt-codice">Codice PT</label>
                <input
                  id="pt-codice"
                  className="input codice-input"
                  autoFocus
                  value={codice}
                  onChange={(e) => {
                    setCodice(normalizzaCodice(e.target.value))
                    setErrore('')
                  }}
                  placeholder="es. MARCO7K"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
              {errore && <p className="form-error">{errore}</p>}
              <button
                type="submit"
                className="btn btn-accent btn-block"
                disabled={!codiceValido(codice)}
              >
                Manda la richiesta
              </button>
            </form>
            <button
              className="btn btn-ghost btn-sm btn-block mt-8"
              onClick={() => {
                setErrore('')
                setAttivaPt(true)
                setCodiceMio(generaCodicePt(utenteCorrente.nome, utenti))
              }}
            >
              Sei un personal trainer? Attiva l'account PT
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
