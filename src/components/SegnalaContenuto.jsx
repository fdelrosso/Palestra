import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DETTAGLIO_MAX, MOTIVI, erroreSegnalazione, segnala } from '../lib/segnalazioni'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// "Segnala" un commento o una foto del Feed: si sceglie il MOTIVO (obbligatorio)
// e si può aggiungere due righe — obbligatorie con "Altro", perché "altro" da
// solo non dice niente a chi deve decidere. Dopo l'invio la cosa sparisce per
// chi l'ha segnalata (`onFatto`), e un moderatore la guarda (lib/segnalazioni).
// È un portal sul body: si apre anche da dentro il modale dei commenti.
// ---------------------------------------------------------------------------

/**
 * @param {{ tipo:'commento'|'foto'|'utente', oggetto:string, ioId:string, cosa:string,
 *   onChiudi:()=>void, onFatto:()=>void }} props
 *   `cosa`: come chiamarla nel titolo ("il commento di Marco", "questa foto").
 */
export default function SegnalaContenuto({ tipo, oggetto, ioId, cosa, onChiudi, onFatto }) {
  const [motivo, setMotivo] = useState('')
  const [dettaglio, setDettaglio] = useState('')
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [mandata, setMandata] = useState(false)

  const manda = async (e) => {
    e?.preventDefault()
    if (inCorso) return
    const sbagliato = erroreSegnalazione(motivo, dettaglio)
    if (sbagliato) return setErrore(sbagliato)
    setInCorso(true)
    setErrore('')
    const esito = await segnala({ tipo, oggetto, ioId, motivo, dettaglio })
    setInCorso(false)
    if (!esito.ok) return setErrore(esito.errore)
    setMandata(true)
  }

  const chiudi = () => (mandata ? onFatto() : onChiudi())

  return createPortal(
    <div className="modal-backdrop" onClick={chiudi} style={{ zIndex: 1200 }}>
      <div
        className="modal"
        role="dialog"
        aria-label="Segnala"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ marginBottom: 0 }}>{mandata ? 'Segnalazione inviata' : `Segnala ${cosa}`}</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={chiudi}>
            <IconClose />
          </button>
        </div>

        {mandata ? (
          <>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '10px 0 16px' }}>
              Grazie. Da adesso non la vedi più, e la guarderà un moderatore: se non va bene la
              toglie per tutti. Chi l’ha pubblicata non sa chi l’ha segnalata.
            </p>
            <button className="btn btn-block" onClick={onFatto}>
              Fatto
            </button>
          </>
        ) : (
          <form onSubmit={manda}>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
              Perché? Rimane anonimo: chi l’ha pubblicata non sa chi l’ha segnalata.
            </p>
            <div className="segnala-motivi" role="radiogroup" aria-label="Motivo">
              {MOTIVI.map((m) => (
                <label key={m.id} className={'segnala-motivo' + (motivo === m.id ? ' scelto' : '')}>
                  <input
                    type="radio"
                    name="motivo"
                    value={m.id}
                    checked={motivo === m.id}
                    onChange={() => {
                      setMotivo(m.id)
                      setErrore('')
                    }}
                  />
                  <span>
                    <span className="segnala-motivo-nome">{m.label}</span>
                    <span className="segnala-motivo-desc">{m.descrizione}</span>
                  </span>
                </label>
              ))}
            </div>
            <textarea
              className="textarea"
              style={{ marginTop: 10 }}
              rows={3}
              maxLength={DETTAGLIO_MAX}
              value={dettaglio}
              placeholder={motivo === 'altro' ? 'Che cosa non va? (obbligatorio)' : 'Vuoi aggiungere qualcosa? (facoltativo)'}
              onChange={(e) => setDettaglio(e.target.value)}
              aria-label="Dettagli della segnalazione"
            />
            {errore && <p className="form-error" style={{ margin: '8px 2px 0' }}>{errore}</p>}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn btn-danger-pieno" disabled={!motivo || inCorso} style={{ flex: 1 }}>
                {inCorso ? 'Invio…' : 'Invia segnalazione'}
              </button>
              <button type="button" className="btn" onClick={onChiudi}>
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
