import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { TIPO_CONDIVISIONE, allenamentiDaMandare, schedeDaMandare } from '../lib/condivisioni'
import { dataOra } from '../lib/format'
import InviaMediaEffimero from './InviaMediaEffimero'
import {
  IconBack,
  IconCheck,
  IconChevron,
  IconClipboard,
  IconClose,
  IconDumbbell,
  IconImage,
} from './icons'

// ---------------------------------------------------------------------------
// "Manda" a UN amico, dalla pagina Amici (il suo profilo, la chat con lui):
// una scheda, un allenamento svolto, una foto o un video.
//
// È il rovescio di CondividiConAmici: lì si parte dalla cosa (la scheda
// aperta) e si sceglie a chi; qui si parte dalla persona e si sceglie cosa.
// Le due strade restano tutte e due, perché si pensa in tutti e due i modi.
//
// ⚠️ Foto e video non passano di qui: vanno negli effimeri, che scadono
// (InviaMediaEffimero) — questo modale si fa da parte e apre quello.
// ---------------------------------------------------------------------------

// Quanti allenamenti si mostrano prima di "Mostra altri": uno storico di un
// anno sono centinaia di righe, e quasi sempre si manda uno degli ultimi.
const PRIMI = 20

export default function MandaAdAmico({ amico, onChiudi }) {
  const { utenteCorrente, condividiConAmici } = useAccount()
  const { schede } = useStore()
  const [passo, setPasso] = useState('tipo') // tipo | scheda | allenamento | foto
  const [quanti, setQuanti] = useState(PRIMI)
  const [inCorso, setInCorso] = useState(false)
  const [esito, setEsito] = useState('')
  const [errore, setErrore] = useState('')

  const mieSchede = useMemo(() => schedeDaMandare(schede), [schede])
  const allenamenti = useMemo(
    () => allenamentiDaMandare(schede, utenteCorrente),
    [schede, utenteCorrente],
  )

  if (passo === 'foto') {
    return <InviaMediaEffimero amicoIniziale={amico.id} onChiudi={onChiudi} />
  }

  const manda = async (cosa) => {
    if (inCorso) return
    setInCorso(true)
    setErrore('')
    const r = await condividiConAmici([amico.id], cosa)
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore || 'Non è partito.')
    setEsito(`Mandato a ${amico.nome}.`)
    setTimeout(onChiudi, 1200)
  }

  const mandaScheda = (s) => {
    const workout = (s.giorni || []).filter((g) => g.tipo === 'workout').length
    manda({
      tipo: TIPO_CONDIVISIONE.SCHEDA,
      titolo: s.nome,
      sottotitolo: `${workout} allenamenti a settimana`,
      payload: s,
    })
  }

  const mandaAllenamento = (v) =>
    manda({
      tipo: TIPO_CONDIVISIONE.ALLENAMENTO,
      titolo: v.titolo,
      sottotitolo: v.sottotitolo,
      payload: v.payload,
    })

  const titolo =
    passo === 'scheda'
      ? 'Quale scheda?'
      : passo === 'allenamento'
        ? 'Quale allenamento?'
        : `Manda a ${amico.nome}`

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label={`Manda a ${amico.nome}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div className="row" style={{ gap: 6, minWidth: 0 }}>
            {passo !== 'tipo' && (
              <button className="icon-btn" aria-label="Indietro" onClick={() => setPasso('tipo')}>
                <IconBack />
              </button>
            )}
            <h3 style={{ marginBottom: 0 }}>{titolo}</h3>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        {esito ? (
          <p
            className="row"
            style={{ gap: 6, color: 'var(--good)', fontSize: 14, margin: '18px 2px' }}
          >
            <IconCheck width={18} height={18} /> {esito}
          </p>
        ) : (
          <div className="stack" style={{ gap: 8, marginTop: 14 }}>
            {passo === 'tipo' && (
              <>
                <VoceTipo
                  Icona={IconClipboard}
                  nome="Una scheda"
                  desc={`Una copia: se la cambi dopo, a ${amico.nome} resta com'era`}
                  onClick={() => setPasso('scheda')}
                />
                <VoceTipo
                  Icona={IconDumbbell}
                  nome="Un allenamento"
                  desc="Uno di quelli che hai fatto, con le serie"
                  onClick={() => setPasso('allenamento')}
                />
                <VoceTipo
                  Icona={IconImage}
                  nome="Una foto o un video"
                  desc="Si guarda una volta, e comunque sparisce dopo 24 ore"
                  onClick={() => setPasso('foto')}
                />
              </>
            )}

            {passo === 'scheda' &&
              (mieSchede.length === 0 ? (
                <p className="muted" style={{ fontSize: 13.5 }}>
                  Non hai ancora nessuna scheda.
                </p>
              ) : (
                mieSchede.map((s) => (
                  <VoceTipo
                    key={s.id}
                    Icona={IconClipboard}
                    nome={s.nome || 'Scheda'}
                    desc={`${(s.giorni || []).filter((g) => g.tipo === 'workout').length} allenamenti/sett. · ${s.numeroSettimane || 1} settimane`}
                    onClick={() => mandaScheda(s)}
                    disabled={inCorso}
                  />
                ))
              ))}

            {passo === 'allenamento' &&
              (allenamenti.length === 0 ? (
                <p className="muted" style={{ fontSize: 13.5 }}>
                  Non hai ancora finito nessun allenamento.
                </p>
              ) : (
                <>
                  {allenamenti.slice(0, quanti).map((v) => (
                    <VoceTipo
                      key={v.chiave}
                      Icona={IconDumbbell}
                      nome={v.titolo}
                      desc={[v.sottotitolo, dataOra(v.data)].filter(Boolean).join(' · ')}
                      onClick={() => mandaAllenamento(v)}
                      disabled={inCorso}
                    />
                  ))}
                  {allenamenti.length > quanti && (
                    <button
                      className="btn btn-ghost btn-block"
                      onClick={() => setQuanti((n) => n + PRIMI)}
                    >
                      Mostra altri
                    </button>
                  )}
                </>
              ))}

            {errore && <p className="form-error">{errore}</p>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function VoceTipo({ Icona, nome, desc, onClick, disabled = false }) {
  return (
    <button className="menu-voce" onClick={onClick} disabled={disabled}>
      <span className="menu-voce-icona" aria-hidden="true">
        <Icona width={20} height={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="menu-voce-nome">{nome}</span>
        <span className="menu-voce-desc">{desc}</span>
      </span>
      <IconChevron className="faint" />
    </button>
  )
}
