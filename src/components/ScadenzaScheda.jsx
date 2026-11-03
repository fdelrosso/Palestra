import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { chiediRinnovo, scadenzaDellaScheda } from '../lib/proposteScheda'
import { dataScadenza, quandoScade, statoScadenza } from '../lib/scadenza'
import { IconCalendar } from './icons'

// ---------------------------------------------------------------------------
// Per l'atleta: fino a quando vale una scheda mandata dal PT (2026-10-28,
// lib/proposteScheda → scadenzaDellaScheda). La scadenza la mette il PT.
//   - prima: "Scade il 25 novembre · tra 12 giorni";
//   - da quel giorno: è scaduta, e si chiede il rinnovo al PT, con un
//     messaggio se si vuole. Lui accetta (e la data si sposta) o dice no.
// In SchedaPage sempre; in Home (SchedeDalPt) solo la scheda attiva, e solo
// se è scaduta (`soloSeScaduta`). Senza scadenza non mostra niente.
// ---------------------------------------------------------------------------

export default function ScadenzaScheda({ scheda, soloSeScaduta = false }) {
  const { mioPt } = useAccount()
  const propostaId = scheda?.daPt?.propostaId || null
  const [info, setInfo] = useState(null)
  const [chiedi, setChiedi] = useState(false)

  useEffect(() => {
    let vivo = true
    if (!propostaId) return undefined
    scadenzaDellaScheda(propostaId).then((x) => vivo && setInfo(x))
    return () => {
      vivo = false
    }
  }, [propostaId])

  const stato = statoScadenza(info?.scadeIl)
  if (!info || !stato || (soloSeScaduta && !stato.scaduta)) return null

  const nomePt = mioPt?.id === info.ptId ? mioPt.nome : scheda.daPt?.nome || 'il tuo PT'
  const rinnovo = info.rinnovo

  if (!stato.scaduta) {
    const rinnovata = rinnovo?.stato === 'accettata'
    return (
      <div className="row muted" style={{ gap: 6, fontSize: 13, margin: '-4px 2px 10px' }}>
        <IconCalendar width={15} height={15} />
        <span>
          {rinnovata ? `Rinnovata da ${nomePt}: scade` : 'Scade'} il {dataScadenza(info.scadeIl)} ·{' '}
          {quandoScade(info.scadeIl)}
        </span>
      </div>
    )
  }

  return (
    <div className="riquadro" style={{ marginBottom: 12, borderColor: 'var(--accent)' }}>
      <div style={{ fontWeight: 700 }}>
        {soloSeScaduta ? `«${scheda.nome}» è scaduta` : 'Questa scheda è scaduta'}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        L&apos;ha mandata {nomePt} e valeva fino al {dataScadenza(info.scadeIl)}.
      </div>

      {mioPt?.id !== info.ptId ? (
        // Un PT che non ti segue più: il rinnovo non si chiede (lo dice
        // anche il database, `chiedi_rinnovo`).
        <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 6 }}>
          {nomePt} non ti segue più: questa scheda non si può rinnovare.
        </div>
      ) : rinnovo?.stato === 'attesa' ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 6 }}>
          Hai chiesto il rinnovo: aspetta la risposta di {nomePt}.
        </div>
      ) : (
        <>
          {rinnovo?.stato === 'rifiutata' && (
            <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 6 }}>
              {nomePt} non l&apos;ha rinnovata.
              {rinnovo.risposta && <span style={{ display: 'block', marginTop: 2 }}>«{rinnovo.risposta}»</span>}
            </div>
          )}
          <button type="button" className="btn btn-accent btn-sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={() => setChiedi(true)}>
            {rinnovo?.stato === 'rifiutata' ? 'Chiedi di nuovo' : `Chiedi il rinnovo a ${nomePt}`}
          </button>
        </>
      )}

      {chiedi && (
        <ChiediRinnovo
          scheda={scheda}
          propostaId={propostaId}
          nomePt={nomePt}
          onChiudi={() => setChiedi(false)}
          onMandata={(r) => {
            setChiedi(false)
            setInfo((x) => ({ ...x, rinnovo: r }))
          }}
        />
      )}
    </div>
  )
}

function ChiediRinnovo({ scheda, propostaId, nomePt, onChiudi, onMandata }) {
  const [nota, setNota] = useState('')
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')
  const manda = async () => {
    setOccupato(true)
    setErrore('')
    const r = await chiediRinnovo(propostaId, nota)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    onMandata(r.rinnovo)
  }
  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Chiedi il rinnovo" onClick={(e) => e.stopPropagation()}>
        <h3>Rinnovare «{scheda.nome}»?</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 12px' }}>
          A {nomePt} arriva la richiesta: se accetta, sceglie fino a quando vale.
        </p>
        <div className="field">
          <label>Messaggio per {nomePt} (facoltativo)</label>
          <textarea
            className="textarea"
            value={nota}
            maxLength={500}
            placeholder="Es. Mi trovo bene, la terrei ancora un mese."
            onChange={(e) => setNota(e.target.value)}
          />
        </div>
        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn grow" onClick={onChiudi}>
            Annulla
          </button>
          <button type="button" className="btn btn-accent grow" onClick={manda} disabled={occupato}>
            {occupato ? 'Invio…' : 'Manda la richiesta'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
