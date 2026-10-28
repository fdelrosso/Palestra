import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { annullaAttribuzione, attribuisciScheda, mieAttribuzioni } from '../lib/attribuzioniScheda'
import { IconCoach } from './icons'

// ---------------------------------------------------------------------------
// Nella pagina di una scheda (SchedaPage): di quale PT è.
//   - collegata (`daPt`): "Scheda di Filippo";
//   - richiesta aperta: "Aspetta che Filippo confermi", con Annulla;
//   - altrimenti, se hai un PT: "L'ha fatta il tuo PT? Collegala" → al PT
//     arriva la richiesta in Lavoro (lib/attribuzioniScheda).
// Se la scheda era nascosta a tutti diventa "solo al PT": collegarla serve
// proprio a fargliela seguire, e senza non la vedrebbe.
// ---------------------------------------------------------------------------

export default function CollegaAlPt({ scheda }) {
  const { utenteCorrente, mioPt } = useAccount()
  const { aggiornaScheda } = useStore()
  const [richiesta, setRichiesta] = useState(undefined)
  const [chiedi, setChiedi] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')
  const io = utenteCorrente?.id

  useEffect(() => {
    let vivo = true
    mieAttribuzioni(io).then((tutte) => {
      if (vivo) setRichiesta(tutte.find((a) => a.schedaId === scheda.id) || null)
    })
    return () => {
      vivo = false
    }
  }, [io, scheda.id])

  if (scheda.libera) return null

  if (scheda.daPt?.id) {
    // A parti (lib/schedaAParti): le settimane che mancano le sblocca il PT.
    const totali = scheda.daPt.settimaneTotali
    const mancano = totali ? totali - scheda.numeroSettimane : 0
    return (
      <div className="row muted" style={{ gap: 6, fontSize: 13, margin: '0 2px 10px', alignItems: 'flex-start' }}>
        <IconCoach width={15} height={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          {/* Il PT di adesso, o uno che non ti segue più: la scheda resta,
              e si sa di chi era. */}
          Scheda di {scheda.daPt.nome || 'un PT'}
          {mioPt?.id === scheda.daPt.id ? ', il tuo PT' : ', che ti seguiva'}
          {mancano > 0 &&
            ` · vedi ${scheda.numeroSettimane} settimane su ${totali}, le altre ${mancano} le sblocca il PT`}
        </span>
      </div>
    )
  }

  if (richiesta === undefined || !mioPt) return null

  if (richiesta?.stato === 'attesa') {
    const annulla = async () => {
      setOccupato(true)
      const r = await annullaAttribuzione(richiesta.id)
      setOccupato(false)
      if (!r.ok) return setErrore(r.errore)
      setRichiesta({ ...richiesta, stato: 'annullata' })
    }
    return (
      <div className="riquadro" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <IconCoach width={18} height={18} />
        <span className="grow">Aspetta che {mioPt.nome} confermi che questa scheda è sua.</span>
        <button className="btn btn-ghost btn-sm" onClick={annulla} disabled={occupato}>
          Annulla
        </button>
        {errore && <p className="form-error">{errore}</p>}
      </div>
    )
  }

  const manda = async () => {
    setOccupato(true)
    setErrore('')
    if (scheda.visibilita === 'nascosta') aggiornaScheda({ ...scheda, visibilita: 'solo-pt' })
    const r = await attribuisciScheda(scheda.id)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    setChiedi(false)
    setRichiesta({ id: r.id, schedaId: scheda.id, ptId: mioPt.id, stato: 'attesa' })
  }

  return (
    <>
      {richiesta?.stato === 'rifiutata' && (
        <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 4px' }}>
          {mioPt.nome} non l&apos;ha riconosciuta come sua.
        </p>
      )}
      <button className="btn btn-ghost btn-sm" style={{ margin: '0 0 10px', paddingLeft: 2 }} onClick={() => setChiedi(true)}>
        <IconCoach width={15} height={15} /> L&apos;ha fatta {mioPt.nome}? Collegala
      </button>
      {errore && !chiedi && <p className="form-error">{errore}</p>}

      {chiedi && (
        <div className="modal-backdrop" onClick={() => setChiedi(false)}>
          <div className="modal" role="dialog" aria-label="Collega la scheda al tuo PT" onClick={(e) => e.stopPropagation()}>
            <h3>«{scheda.nome}» è di {mioPt.nome}?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 12px' }}>
              A {mioPt.nome} arriva la richiesta: se conferma, la scheda risulta sua e la segue con te.
              La scheda resta tua, come i tuoi allenamenti.
            </p>
            {scheda.visibilita === 'nascosta' && (
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 12px' }}>
                Ora è nascosta a tutti: diventa visibile solo a te e al tuo PT, così la può vedere.
              </p>
            )}
            {errore && <p className="form-error">{errore}</p>}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn grow" onClick={() => setChiedi(false)}>
                Annulla
              </button>
              <button type="button" className="btn btn-accent grow" onClick={manda} disabled={occupato}>
                {occupato ? 'Invio…' : 'Manda la richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
