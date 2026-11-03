import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { chiediAllungamento, ultimoAllungamento } from '../lib/proposteScheda'
import { IconPlus } from './icons'

// ---------------------------------------------------------------------------
// Per l'atleta, nella pagina di una scheda del suo PT: "Chiedi di
// allungarla" (2026-10-28, lib/proposteScheda → L'ALLUNGAMENTO), quando
// vuole, non solo alla scadenza. Il PT dice di quante settimane e scrive gli
// esercizi; la scheda sul telefono si aggiorna da sola (SchedeDalPt).
// Niente per una scheda senza fine, o di un PT che non lo segue più.
// ---------------------------------------------------------------------------

export default function AllungaScheda({ scheda }) {
  const { mioPt } = useAccount()
  const propostaId = scheda?.daPt?.propostaId || null
  const delMioPt = !!propostaId && mioPt?.id === scheda.daPt.id
  const [ultimo, setUltimo] = useState(undefined)
  const [chiedi, setChiedi] = useState(false)

  useEffect(() => {
    let vivo = true
    if (!delMioPt) return undefined
    ultimoAllungamento(propostaId).then((x) => vivo && setUltimo(x))
    return () => {
      vivo = false
    }
  }, [propostaId, delMioPt])

  if (!delMioPt || scheda.senzaFine || ultimo === undefined) return null
  const nomePt = mioPt.nome

  return (
    <div style={{ margin: '0 2px 12px' }}>
      {ultimo?.stato === 'attesa' ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Hai chiesto a {nomePt} di allungarla: aspetta la risposta.
        </p>
      ) : (
        <>
          {ultimo?.stato === 'accettata' && (
            <p className="muted" style={{ fontSize: 13, margin: '0 0 4px' }}>
              {nomePt} l&apos;ha allungata
              {ultimo.settimaneAggiunte ? ` di ${ultimo.settimaneAggiunte} settiman${ultimo.settimaneAggiunte === 1 ? 'a' : 'e'}` : ''}.
              {ultimo.risposta && <span style={{ display: 'block' }}>«{ultimo.risposta}»</span>}
            </p>
          )}
          {ultimo?.stato === 'rifiutata' && (
            <p className="muted" style={{ fontSize: 13, margin: '0 0 4px' }}>
              {nomePt} non l&apos;ha allungata.
              {ultimo.risposta && <span style={{ display: 'block' }}>«{ultimo.risposta}»</span>}
            </p>
          )}
          <button type="button" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }} onClick={() => setChiedi(true)}>
            <IconPlus width={15} height={15} /> Chiedi a {nomePt} di allungarla
          </button>
        </>
      )}

      {chiedi && (
        <ChiediAllungamento
          scheda={scheda}
          propostaId={propostaId}
          nomePt={nomePt}
          onChiudi={() => setChiedi(false)}
          onMandata={(a) => {
            setChiedi(false)
            setUltimo(a)
          }}
        />
      )}
    </div>
  )
}

function ChiediAllungamento({ scheda, propostaId, nomePt, onChiudi, onMandata }) {
  const [nota, setNota] = useState('')
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')
  const manda = async () => {
    setOccupato(true)
    setErrore('')
    const r = await chiediAllungamento(propostaId, nota)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    onMandata(r.allungamento)
  }
  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Chiedi di allungare la scheda" onClick={(e) => e.stopPropagation()}>
        <h3>Allungare «{scheda.nome}»?</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 12px' }}>
          A {nomePt} arriva la richiesta: se accetta, decide di quante settimane e quali esercizi fare.
          La scheda si aggiorna da sola, e gli allenamenti fatti restano.
        </p>
        <div className="field">
          <label>Messaggio per {nomePt} (facoltativo)</label>
          <textarea
            className="textarea"
            value={nota}
            maxLength={500}
            placeholder="Es. Mi trovo bene, la porterei avanti un altro mese."
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
