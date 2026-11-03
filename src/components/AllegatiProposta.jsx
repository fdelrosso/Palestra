import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { aggiornaAllegatiProposta, propostaCompleta } from '../lib/proposteScheda'
import EsercizioAllegati from './EsercizioAllegati'

// ---------------------------------------------------------------------------
// Per il PT, dalla pagina dell'atleta: video, foto e consigli sugli esercizi
// di una scheda GIÀ MANDATA (2026-10-28, lib/proposteScheda → GLI ALLEGATI
// DEL PT). Un esercizio per riga, con i suoi allegati; ogni cambio va subito
// sulla scheda dell'atleta, e se l'ha già salvata gli arriva la notifica
// (quale esercizio, in quale giorno). Quelli messi scrivendo la scheda sono
// già qui.
// ---------------------------------------------------------------------------

export default function AllegatiProposta({ proposta, nome, onChiudi }) {
  const { utenteCorrente } = useAccount()
  const [scheda, setScheda] = useState(null)
  const [errore, setErrore] = useState('')
  const [aperto, setAperto] = useState(null)

  useEffect(() => {
    let vivo = true
    propostaCompleta(proposta.id).then((p) => {
      if (!vivo) return
      if (!p?.dati) setErrore('La scheda non si trova: ricarica.')
      else setScheda(p.dati)
    })
    return () => {
      vivo = false
    }
  }, [proposta.id])

  const cambia = async (giornoId, esercizio) => {
    setErrore('')
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) =>
        g.id !== giornoId ? g : { ...g, esercizi: g.esercizi.map((e) => (e.id === esercizio.id ? esercizio : e)) },
      ),
    }))
    const r = await aggiornaAllegatiProposta(proposta.id, giornoId, esercizio, utenteCorrente?.id)
    if (!r.ok) setErrore(r.errore)
  }

  const giorni = (scheda?.giorni || []).filter((g) => g.tipo === 'workout' && g.esercizi?.length)
  const quanti = (e) => (e.media?.length || 0) + (e.commenti?.length || 0)

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Video e consigli" onClick={(e) => e.stopPropagation()}>
        <h3>«{proposta.nome}»: video e consigli</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 12px' }}>
          Allega a un esercizio un video (fino a 30″) o una foto, o scrivi un consiglio: {nome} li trova
          sull&apos;esercizio{proposta.stato === 'accettata' ? ', e gli arriva una notifica' : ''}.
        </p>
        {errore && <p className="form-error">{errore}</p>}
        {!scheda && !errore ? (
          <p className="muted">Un attimo…</p>
        ) : (
          <div className="stack" style={{ gap: 12, maxHeight: '55dvh', overflowY: 'auto' }}>
            {giorni.map((g) => (
              <div key={g.id}>
                <div className="section-title" style={{ margin: '0 0 6px' }}>{g.nome || 'Giorno'}</div>
                <div className="stack" style={{ gap: 6 }}>
                  {g.esercizi.map((e) => {
                    const chiave = `${g.id}/${e.id}`
                    return (
                      <div key={e.id} className="card" style={{ padding: '8px 12px' }}>
                        <button
                          type="button"
                          className="row"
                          style={{ width: '100%', justifyContent: 'space-between', background: 'none', border: 0, padding: 0, color: 'inherit', textAlign: 'left' }}
                          onClick={() => setAperto(aperto === chiave ? null : chiave)}
                          aria-expanded={aperto === chiave}
                        >
                          <strong style={{ fontSize: 14.5 }}>{e.nome || 'Esercizio'}</strong>
                          <span className="muted" style={{ fontSize: 12.5 }}>
                            {quanti(e) ? `${quanti(e)} allegat${quanti(e) === 1 ? 'o' : 'i'}` : 'Allega'}
                          </span>
                        </button>
                        {aperto === chiave && (
                          <div style={{ marginTop: 8 }}>
                            <EsercizioAllegati
                              esercizio={e}
                              visibilitaMedia="pubblica"
                              onVisibilitaMedia={() => {}}
                              placeholderCommento={`Un consiglio per ${nome} su questo esercizio…`}
                              onChange={(upd) => cambia(g.id, upd)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-block" style={{ marginTop: 12 }} onClick={onChiudi}>
          Fatto
        </button>
      </div>
    </div>,
    document.body,
  )
}
