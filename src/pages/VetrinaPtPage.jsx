import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { isPt } from '../lib/pt'
import { LIMITI, SPECIALIZZAZIONI, VETRINA_VUOTA, leggiVetrina, salvaVetrina } from '../lib/vetrinaPt'
import { IconBack, IconClose, IconPlus } from '../components/icons'

// ---------------------------------------------------------------------------
// Lavoro → "Il tuo profilo da PT": la vetrina che vede chi apre la tua pagina
// (components/VetrinaPt su UtentePage). Tutto facoltativo.
// ---------------------------------------------------------------------------

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
            <div className="field">
              <label>Dove lavori</label>
              <input
                className="input"
                value={v.dove}
                maxLength={LIMITI.dove}
                placeholder="Es. Pisa, palestra Fit Center · anche online"
                onChange={(e) => patch({ dove: e.target.value })}
              />
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
