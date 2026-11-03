import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import { gruppiAllenati } from '../lib/recap'
import { storicoCarichi } from '../lib/carico'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import { propostaCompleta, rispondiProposta, schedaDaProposta } from '../lib/proposteScheda'
import CorpoAllenato from '../components/CorpoAllenato'
import EserciziGiorno from '../components/EserciziGiorno'
import { IconBack, IconBed, IconChevron, IconDumbbell } from '../components/icons'

// ---------------------------------------------------------------------------
// La scheda appena arrivata dal PT (/scheda-arrivata/:id), non ancora salvata:
// si guarda come una scheda propria (pages/SchedaPage), con le settimane, i
// giorni divisi e, toccandoli, i loro esercizi. In sola lettura: qui si decide
// solo se tenerla.
// ---------------------------------------------------------------------------

export default function SchedaArrivataPage({ id }) {
  const { mioPt } = useAccount()
  const { schede, getScheda, aggiungiScheda } = useStore()
  // undefined = la sta leggendo; null = non c'è, o è già stata decisa.
  const [proposta, setProposta] = useState(undefined)
  const [settimana, setSettimana] = useState(1)
  const [giornoId, setGiornoId] = useState(null)
  const [occupata, setOccupata] = useState(false)
  const [errore, setErrore] = useState('')
  const carichi = useMemo(() => storicoCarichi(schede), [schede])

  useEffect(() => {
    let vivo = true
    propostaCompleta(id).then((p) => {
      if (vivo) setProposta(p?.dati && p.stato === 'attesa' ? p : null)
    })
    return () => {
      vivo = false
    }
  }, [id])

  const nomePt = mioPt?.id === proposta?.ptId ? mioPt.nome : 'Il tuo PT'
  const scheda = useMemo(() => (proposta ? schedaDaProposta(proposta, nomePt) : null), [proposta, nomePt])

  if (!scheda) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <h1>Scheda</h1>
        </div>
        <p className="muted">{proposta === undefined ? 'Un attimo…' : 'Questa scheda non è più da decidere.'}</p>
      </div>
    )
  }

  const rispondi = async (accetto) => {
    setErrore('')
    setOccupata(true)
    const r = await rispondiProposta(proposta.id, accetto)
    setOccupata(false)
    if (!r.ok) return setErrore(r.errore)
    if (!accetto) return goBack()
    if (!getScheda(scheda.id)) aggiungiScheda(scheda, { attiva: false })
    navigate(routes.scheda(scheda.id), { sostituisci: true })
  }

  const giornoAperto = scheda.giorni.find((g) => g.id === giornoId && g.tipo === 'workout')
  if (giornoAperto) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setGiornoId(null)} aria-label="Indietro">
            <IconBack />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17 }}>{giornoAperto.nome}</h1>
            <div className="muted" style={{ fontSize: 12.5 }}>
              Settimana {settimana} · {giornoAperto.esercizi.length} esercizi
            </div>
          </div>
        </div>
        <EserciziGiorno giorno={giornoAperto} settimana={settimana} carichi={carichi} />
      </div>
    )
  }

  // Il colore del giorno e la legenda, come nella scheda.
  const gruppoPrincipale = (g) => {
    const conta = new Map()
    for (const e of g.esercizi) {
      const gr = gruppoDi(e.gruppo)
      if (gr) conta.set(gr.id, { gr, n: (conta.get(gr.id)?.n || 0) + 1 })
    }
    return [...conta.values()].sort((a, b) => b.n - a.n)[0]?.gr || null
  }
  const gruppiUsati = GRUPPI.filter((gr) =>
    scheda.giorni.some((g) => g.tipo === 'workout' && g.esercizi.some((e) => e.gruppo === gr.id)),
  )

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>{scheda.nome}</h1>
      </div>

      <p className="muted" style={{ fontSize: 13.5, margin: '2px 2px 10px', lineHeight: 1.4 }}>
        Da {nomePt}
        {proposta.settimaneTotali
          ? ` · ${proposta.settimaneTotali} settimane, per ora vedi le prime ${scheda.numeroSettimane}`
          : ''}
      </p>
      {proposta.nota && (
        <p style={{ fontSize: 14, lineHeight: 1.45, margin: '0 2px 12px', whiteSpace: 'pre-wrap' }}>«{proposta.nota}»</p>
      )}

      {!scheda.senzaFine && (
        <div className="weekbar">
          {Array.from({ length: scheda.numeroSettimane }, (_, i) => i + 1).map((w) => (
            <button key={w} className={'pill' + (w === settimana ? ' active' : '')} onClick={() => setSettimana(w)}>
              Sett {w}
            </button>
          ))}
        </div>
      )}

      <div className="section-title">Giorni · settimana {settimana}</div>
      {gruppiUsati.length > 0 && (
        <ul className="corpo-legenda" aria-label="Colori dei gruppi muscolari">
          {gruppiUsati.map((gr) => (
            <li key={gr.id} style={{ '--g': gr.colore }}>
              {gr.label}
            </li>
          ))}
        </ul>
      )}
      <div className="stack giorni-elenco">
        {scheda.giorni.map((g) => {
          if (g.tipo === 'rest') {
            return (
              <div key={g.id} className="day-row rest">
                <div className="day-dot">
                  <IconBed width={18} height={18} />
                </div>
                <div className="grow">
                  <div className="titolo">{g.nota ? `Rest · ${g.nota}` : 'Rest'}</div>
                  <div className="sub">Riposo</div>
                </div>
              </div>
            )
          }
          const gruppo = gruppoPrincipale(g)
          return (
            <button key={g.id} className="day-row" onClick={() => setGiornoId(g.id)}>
              <div className={'day-dot' + (gruppo ? ' tinto' : '')} style={gruppo ? { '--g': gruppo.colore } : undefined}>
                <IconDumbbell width={18} height={18} />
              </div>
              <div className="grow">
                <div className="titolo">{g.nome}</div>
                <div className="day-row-bottom">
                  <span className="sub">{g.esercizi.length} esercizi</span>
                </div>
              </div>
              {gruppo && <CorpoAllenato className="giorni-corpo" gruppi={gruppiAllenati(g.esercizi, () => 1)} altezza={46} />}
              <IconChevron className="faint" />
            </button>
          )
        })}
      </div>

      {errore && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginTop: 12 }}>
          {errore}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn-accent grow" onClick={() => rispondi(true)} disabled={occupata}>
          Salva fra le mie
        </button>
        <button type="button" className="btn grow" onClick={() => rispondi(false)} disabled={occupata}>
          Rifiuta
        </button>
      </div>
    </div>
  )
}
