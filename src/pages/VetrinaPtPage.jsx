import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { isPt } from '../lib/pt'
import { LIMITI, SPECIALIZZAZIONI, VETRINA_VUOTA, leggiVetrina, salvaVetrina } from '../lib/vetrinaPt'
import { luogoPalestra, mettiPalestraPt, palestreDiPt, togliPalestraPt } from '../lib/palestre'
import SceltaPalestra from '../components/SceltaPalestra'
import { IconBack, IconClose, IconPlus, IconStar } from '../components/icons'

// ---------------------------------------------------------------------------
// Lavoro → "Il tuo profilo da PT": la vetrina che vede chi apre la tua pagina
// (components/VetrinaPt su UtentePage). Tutto facoltativo.
// "Dove lavori" tiene insieme le palestre (lib/palestre, `palestre_pt`: si
// salvano subito, la stella è la principale) e la zona scritta a mano
// (`dove`, per chi lavora in un'area e non in palestre precise: con "Salva").
// ---------------------------------------------------------------------------

function DoveLavori({ io, dove, onDove }) {
  const [palestre, setPalestre] = useState(null)
  const [cerco, setCerco] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [errore, setErrore] = useState('')
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    let vivo = true
    palestreDiPt(io).then((r) => {
      if (!vivo) return
      setPalestre(r.palestre)
      if (!r.ok) setErrore(r.errore)
    })
    return () => {
      vivo = false
    }
  }, [io, giro])

  const fai = async (fn) => {
    setSalvo(true)
    setErrore('')
    const r = await fn()
    setSalvo(false)
    if (!r.ok) setErrore(r.errore || 'Non salvato. Riprova.')
    setGiro((g) => g + 1)
  }

  return (
    <>
      <div className="section-title">Dove lavori</div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.4 }}>
        Le palestre: la stella è quella dove lavori di solito, nelle altre puoi seguire qualcuno. Si salvano subito e ti trovano anche dalla pagina della palestra.
      </p>
      {!palestre ? (
        <p className="muted">Un attimo…</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {palestre.map((p) => (
            <div key={p.id} className="menu-voce">
              <button
                type="button"
                className="icon-btn"
                onClick={() => fai(() => mettiPalestraPt(p.id, !p.principale))}
                disabled={salvo}
                aria-pressed={p.principale}
                aria-label={p.principale ? `${p.nome}: principale` : `Rendi principale ${p.nome}`}
              >
                <IconStar width={18} height={18} style={{ color: p.principale ? 'var(--accent)' : undefined, fill: p.principale ? 'currentColor' : 'none' }} />
              </button>
              <button type="button" className="grow" style={{ minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit' }} onClick={() => navigate(routes.palestra(p.id))}>
                <span className="menu-voce-nome">{p.nome}</span>
                <span className="menu-voce-desc">{p.principale ? 'Principale' : luogoPalestra(p)}</span>
              </button>
              <button type="button" className="icon-btn" onClick={() => fai(() => togliPalestraPt(p.id))} disabled={salvo} aria-label={`Togli ${p.nome}`}>
                <IconClose width={16} height={16} />
              </button>
            </div>
          ))}
          {cerco ? (
            <SceltaPalestra
              valore={null}
              conNessuna={false}
              onChange={(id) => id && !palestre.some((p) => p.id === id) && fai(() => mettiPalestraPt(id))}
              onFatto={() => setCerco(false)}
            />
          ) : (
            <button type="button" className="btn btn-block" onClick={() => setCerco(true)} disabled={salvo}>
              <IconPlus width={16} height={16} /> Aggiungi una palestra
            </button>
          )}
        </div>
      )}
      {errore && <p className="form-error" style={{ marginTop: 10 }}>{errore}</p>}
      <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
        <label>Oppure una zona</label>
        <input
          className="input"
          value={dove}
          maxLength={LIMITI.dove}
          placeholder="Es. provincia di Pisa · a domicilio · anche online"
          onChange={(e) => onDove(e.target.value)}
        />
      </div>
    </>
  )
}

export default function VetrinaPtPage() {
  const { utenteCorrente } = useAccount()
  const io = utenteCorrente?.id
  const [v, setV] = useState(null)
  const [altra, setAltra] = useState('')
  const [stato, setStato] = useState({ salvo: false, errore: '', fatto: false })

  useEffect(() => {
    let vivo = true
    leggiVetrina(io).then((letta) => vivo && setV(letta || VETRINA_VUOTA))
    return () => {
      vivo = false
    }
  }, [io])

  if (!isPt(utenteCorrente)) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => goBack(routes.lavoro())} aria-label="Indietro"><IconBack /></button>
          <h1>Profilo da PT</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>Questa sezione è per i personal trainer.</p>
        </div>
      </div>
    )
  }

  const patch = (p) => {
    setV((x) => ({ ...x, ...p }))
    setStato((s) => ({ ...s, fatto: false }))
  }
  const scelte = v?.specializzazioni || []
  const pieno = scelte.length >= LIMITI.specializzazioni
  // Sullo stato di adesso, non su quello del disegno: due tocchi di fila non
  // devono pestarsi.
  const cambiaScelte = (fn) => {
    setV((x) => ({ ...x, specializzazioni: fn(x.specializzazioni) }))
    setStato((s) => ({ ...s, fatto: false }))
  }
  const alterna = (s) =>
    cambiaScelte((sc) =>
      sc.includes(s) ? sc.filter((x) => x !== s) : sc.length >= LIMITI.specializzazioni ? sc : [...sc, s],
    )
  const aggiungiAltra = () => {
    const t = altra.trim().slice(0, LIMITI.specializzazione)
    if (!t || pieno) return
    cambiaScelte((sc) =>
      sc.some((x) => x.toLowerCase() === t.toLowerCase()) || sc.length >= LIMITI.specializzazioni ? sc : [...sc, t],
    )
    setAltra('')
  }
  const extra = scelte.filter((s) => !SPECIALIZZAZIONI.includes(s))

  const salva = async () => {
    setStato({ salvo: true, errore: '', fatto: false })
    const r = await salvaVetrina(io, v)
    setStato({ salvo: false, errore: r.errore, fatto: r.ok })
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack(routes.lavoro())} aria-label="Indietro"><IconBack /></button>
        <h1>Profilo da PT</h1>
        <button className="btn btn-accent btn-sm" onClick={salva} disabled={!v || stato.salvo}>
          {stato.salvo ? 'Salvo…' : 'Salva'}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.45 }}>
        Lo vede chiunque apra la tua pagina, sopra «Contatta il PT». Tutto facoltativo.
      </p>

      {!v ? (
        <div className="empty"><p>Un attimo…</p></div>
      ) : (
        <>
          <DoveLavori io={io} dove={v.dove} onDove={(dove) => patch({ dove })} />

          <div className="section-title" style={{ marginTop: 16 }}>Chi sei</div>
          <div className="card">
            <div className="field">
              <label>Presentazione</label>
              <textarea
                className="textarea"
                rows={5}
                value={v.bio}
                maxLength={LIMITI.bio}
                placeholder="Es. Laureato in scienze motorie, seguo atleti da 8 anni. Lavoro soprattutto su forza e ricomposizione corporea."
                onChange={(e) => patch({ bio: e.target.value })}
              />
              <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{v.bio.length}/{LIMITI.bio}</div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tariffe</label>
              <textarea
                className="textarea"
                rows={3}
                value={v.tariffe}
                maxLength={LIMITI.tariffe}
                placeholder="Es. 40€ a seduta · scheda mensile con controllo settimanale 60€"
                onChange={(e) => patch({ tariffe: e.target.value })}
              />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>
            Specializzazioni · {scelte.length}/{LIMITI.specializzazioni}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {[...SPECIALIZZAZIONI, ...extra].map((s) => {
              const on = scelte.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  className={'giorno-chip' + (on ? ' on' : '')}
                  style={{ width: 'auto', padding: '0 12px' }}
                  aria-pressed={on}
                  disabled={!on && pieno}
                  onClick={() => alterna(s)}
                >
                  {s}
                  {on && !SPECIALIZZAZIONI.includes(s) && <IconClose width={12} height={12} style={{ marginLeft: 4 }} />}
                </button>
              )
            })}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <input
              className="input grow"
              value={altra}
              maxLength={LIMITI.specializzazione}
              placeholder="Un'altra…"
              onChange={(e) => setAltra(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aggiungiAltra()}
              disabled={pieno}
            />
            <button type="button" className="btn" onClick={aggiungiAltra} disabled={pieno || !altra.trim()} aria-label="Aggiungi specializzazione">
              <IconPlus width={18} height={18} />
            </button>
          </div>

          {stato.errore && <p className="form-error" style={{ marginTop: 14 }}>{stato.errore}</p>}
          {stato.fatto && (
            <div className="riquadro" style={{ marginTop: 14 }}>
              <span className="grow">Salvato.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(routes.utente(io))}>
                Guarda la tua pagina
              </button>
            </div>
          )}
          <div style={{ height: 16 }} />
        </>
      )}
    </div>
  )
}
