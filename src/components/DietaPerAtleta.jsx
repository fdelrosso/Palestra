import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { OBIETTIVI, conKcal, labelObiettivo } from '../lib/dieta'
import { dataLunga } from '../lib/format'
import { proponiDieta, proposteDietaMandate, ritiraPropostaDieta } from '../lib/proposteDieta'
import { MODI, dietaDaMacro } from '../lib/dietaDalPt'
import { IconPlus } from './icons'

// ---------------------------------------------------------------------------
// Il PT e la dieta di un suo atleta (pages/AtletiPage, dettaglio atleta): il
// tasto "Nuova dieta per …", il modulo per mandarla e quelle già mandate.
//
// Due modi (lib/proposteDieta):
//   - IL PIANO: una delle diete del PT, preparate nella sua sezione Dieta
//     come si prepara la propria (dal PDF, dai macro, a mano). Parte tutta,
//     pasti, giornate tipo e schema compresi;
//   - SOLO I MACRO: calorie e macro dei giorni di allenamento e di riposo,
//     scritti qui. I piatti li propone l'app all'atleta.
// ---------------------------------------------------------------------------

const STATO = {
  attesa: ['badge-accent', 'In attesa'],
  accettata: ['badge-good', 'Salvata'],
  rifiutata: ['badge-danger', 'Rifiutata'],
  ritirata: ['', 'Ritirata'],
}

const MACRO = [
  ['proteine', 'Proteine'],
  ['carbo', 'Carbo'],
  ['grassi', 'Grassi'],
]

const vuoti = { proteine: '', carbo: '', grassi: '' }

function CampiMacro({ titolo, valori, onCambia }) {
  const kcal = conKcal({ kcal: 0, ...Object.fromEntries(MACRO.map(([k]) => [k, Number(valori[k]) || 0])) })
  return (
    <div className="field">
      <label>
        {titolo} {kcal > 0 && <span className="faint">· {kcal} kcal</span>}
      </label>
      <div className="grid-3">
        {MACRO.map(([k, lab]) => (
          <input
            key={k}
            className="input"
            type="text"
            inputMode="numeric"
            placeholder={`${lab} (g)`}
            aria-label={`${lab} in grammi, ${titolo.toLowerCase()}`}
            value={valori[k]}
            onChange={(e) => onCambia({ ...valori, [k]: e.target.value })}
          />
        ))}
      </div>
    </div>
  )
}

function MandaDieta({ atleta, onChiudi, onMandata }) {
  const { diete } = useStore()
  const [modo, setModo] = useState(diete.length ? 'piano' : 'macro')
  const [scelta, setScelta] = useState(diete[0]?.id || '')
  const [nome, setNome] = useState('')
  const [obiettivo, setObiettivo] = useState('mantenimento')
  const [allenamento, setAllenamento] = useState(vuoti)
  const [riposo, setRiposo] = useState(vuoti)
  const [nota, setNota] = useState('')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  const manda = async () => {
    setErrore('')
    let dieta
    if (modo === 'piano') {
      dieta = diete.find((d) => d.id === scelta)
      if (!dieta) return setErrore('Scegli quale dieta mandare.')
    } else {
      dieta = dietaDaMacro({ nome: nome.trim() || `Dieta ${labelObiettivo(obiettivo)}`, obiettivo, allenamento, riposo })
      if (!conKcal(dieta.allenamento) || !conKcal(dieta.riposo)) {
        return setErrore('Scrivi i macro dei giorni di allenamento e di riposo.')
      }
    }
    setInvio(true)
    const r = await proponiDieta(atleta.id, dieta, modo, nota)
    setInvio(false)
    if (!r.ok) return setErrore(r.errore)
    onMandata()
  }

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={`Nuova dieta per ${atleta.nome}`} onClick={(e) => e.stopPropagation()}>
        <h3>Nuova dieta per {atleta.nome}</h3>

        <div className="segmented" style={{ margin: '10px 0 12px' }}>
          {Object.entries(MODI).map(([k, label]) => (
            <button key={k} type="button" className={'seg-btn' + (modo === k ? ' on' : '')} aria-pressed={modo === k} onClick={() => setModo(k)}>
              {label}
            </button>
          ))}
        </div>

        {modo === 'piano' ? (
          diete.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
              Non hai ancora una dieta da mandare. Preparala fra le tue diete (dal PDF, dai macro
              o a mano), poi torna qui.
            </p>
          ) : (
            <div className="stack" style={{ gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {diete.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={'menu-voce' + (scelta === d.id ? ' menu-voce-scelta' : '')}
                  aria-pressed={scelta === d.id}
                  onClick={() => setScelta(d.id)}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="menu-voce-nome">{d.nome || 'Dieta'}</span>
                    <span className="menu-voce-desc">
                      {labelObiettivo(d.obiettivo)} · {conKcal(d.allenamento) || '-'} / {conKcal(d.riposo) || '-'} kcal
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="field">
              <label htmlFor="pt-dieta-nome">Nome</label>
              <input id="pt-dieta-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Definizione autunno" maxLength={40} />
            </div>
            <div className="field">
              <label htmlFor="pt-dieta-obiettivo">Obiettivo</label>
              <select id="pt-dieta-obiettivo" className="select" value={obiettivo} onChange={(e) => setObiettivo(e.target.value)}>
                {OBIETTIVI.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <CampiMacro titolo="Giorni di allenamento" valori={allenamento} onCambia={setAllenamento} />
            <CampiMacro titolo="Giorni di riposo" valori={riposo} onCambia={setRiposo} />
          </>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="pt-dieta-nota">Una nota per {atleta.nome} (facoltativa)</label>
          <textarea id="pt-dieta-nota" className="textarea" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={1000} style={{ minHeight: 60 }} />
        </div>

        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn grow" onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="button"
            className="btn btn-accent grow"
            onClick={manda}
            disabled={invio || (modo === 'piano' && diete.length === 0)}
          >
            {invio ? 'Mando…' : 'Manda'}
          </button>
        </div>
        {modo === 'piano' && diete.length === 0 && (
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate(routes.dieta())}>
            Vai alle tue diete
          </button>
        )}
      </div>
    </div>
  )
}

export default function DietaPerAtleta({ atleta }) {
  const { utenteCorrente } = useAccount()
  const [aperto, setAperto] = useState(false)
  const [mandate, setMandate] = useState([])
  const [errore, setErrore] = useState('')
  const [tutte, setTutte] = useState(false)

  const rileggi = () =>
    proposteDietaMandate(utenteCorrente?.id).then((r) => setMandate(r.filter((p) => p.atletaId === atleta.id)))
  useEffect(() => {
    let vivo = true
    proposteDietaMandate(utenteCorrente?.id).then((r) => vivo && setMandate(r.filter((p) => p.atletaId === atleta.id)))
    return () => {
      vivo = false
    }
  }, [utenteCorrente?.id, atleta.id])

  const ritira = async (p) => {
    setErrore('')
    const r = await ritiraPropostaDieta(p.id)
    if (!r.ok) return setErrore(r.errore)
    setMandate((x) => x.map((y) => (y.id === p.id ? { ...y, stato: 'ritirata' } : y)))
  }

  const visibili = tutte ? mandate : mandate.slice(0, 3)
  return (
    <>
      <button className="btn btn-block" style={{ margin: '0 0 6px' }} onClick={() => setAperto(true)}>
        <IconPlus width={18} height={18} /> Nuova dieta per {atleta.nome}
      </button>

      {mandate.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 14 }}>Diete mandate a {atleta.nome}</div>
          {errore && <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 8 }}>{errore}</div>}
          <div className="stack" style={{ gap: 6 }}>
            {visibili.map((p) => {
              const [classe, testo] = STATO[p.stato] || ['', p.stato]
              return (
                <div key={p.id} className="card row" style={{ gap: 10, padding: '10px 12px', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {MODI[p.modo] || MODI.piano} · mandata il {dataLunga(p.creataIl)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                    <span className={'badge ' + classe}>{testo}</span>
                    {p.stato === 'attesa' && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => ritira(p)}>
                        Ritira
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {mandate.length > 3 && !tutte && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setTutte(true)}>
              Vedi tutte ({mandate.length})
            </button>
          )}
        </>
      )}

      {aperto && (
        <MandaDieta
          atleta={atleta}
          onChiudi={() => setAperto(false)}
          onMandata={() => {
            setAperto(false)
            rileggi()
          }}
        />
      )}
    </>
  )
}
