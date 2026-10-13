import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { codiceValido, normalizzaCodice } from '../lib/pt'
import { IconCheck, IconClose, IconCoach } from './icons'
import Avatar from './Avatar'

// ---------------------------------------------------------------------------
// Pannello "Personal trainer", aperto dal menu del profilo: il PROPRIO PT.
// È lo stesso per tutti, anche per un PT, che si allena e può farsi seguire:
//   - con un PT       → chi lo segue, da quando, e come toglierlo;
//   - che ha chiesto  → l'attesa: il codice è giusto, tocca al PT;
//   - senza           → il campo per inserire il codice ricevuto dal suo PT.
// Il lato PT (codice, atleti, richieste) sta in Lavoro e in Social → Profilo;
// attivarlo e disattivarlo, nel Profilo. Le scritture passano da
// AccountContext (associaPt / dissociaPt).
// ---------------------------------------------------------------------------

function dataBreve(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PtPannello({ onChiudi, avviso = null }) {
  const {
    utenteCorrente,
    utenti,
    mioPt,
    associaPt,
    dissociaPt,
    richiesteLavoro,
    annullaRichiesta,
  } = useAccount()

  // ⚠️ `avviso` arriva dalla registrazione: il codice del PT scritto lì non è
  // stato riconosciuto (o non si è potuto controllare). Si riparte da quel
  // codice già scritto — chi ha sbagliato una lettera la corregge, non lo
  // riscrive da capo.
  const [codice, setCodice] = useState(avviso?.codice || '')
  const [errore, setErrore] = useState(avviso?.testo || '')

  if (!utenteCorrente) return null
  // Gli altri atleti del tuo PT (tu escluso): è da loro che arriva il segnale.
  const altriAtleti = mioPt ? utenti.filter((u) => u.ptId === mioPt.id && u.id !== utenteCorrente.id).length : 0

  // La richiesta mandata al PT e ancora senza risposta (ce n'è al massimo una).
  const inAttesa = richiesteLavoro.inviate[0] || null

  const submitAssocia = async (e) => {
    e.preventDefault()
    const esito = await associaPt(codice)
    if (esito.ok) {
      setCodice('')
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
            <h3 style={{ margin: 0 }}>Il tuo personal trainer</h3>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        {mioPt ? (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <Avatar id={mioPt.id} nome={mioPt.nome} taglia="" />
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
                : 'nelle sue schede'}
              : esercizi e modo di scriverli.
            </p>
            <button className="btn btn-ghost btn-block" onClick={staccati}>
              Non farti più seguire
            </button>
          </>
        ) : inAttesa ? (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <Avatar id={inAttesa.utente.id} nome={inAttesa.utente.nome} taglia="" />
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
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
