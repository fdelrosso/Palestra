import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { luogoPalestra, mettiPalestraPt, palestraDaId, personeDellaPalestra, ptDellaPalestra, togliPalestraPt } from '../lib/palestre'
import { isPt, isSoloPt } from '../lib/pt'
import Avatar from '../components/Avatar'
import ChiVedePalestra from '../components/ChiVedePalestra'
import { IconBack, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// Una palestra (/palestra/:id): ci si arriva dalla pillola sotto il nome in un
// profilo (pages/UtentePage). Dove sta, chi ci si allena (lib/palestre,
// `persone_della_palestra`: solo chi la mostra a te) e, se è la tua, chi la
// vede (components/ChiVedePalestra). Se non è la tua: "È anche la mia".
// Linguetta "PT": i personal trainer che ci lavorano (`pt_della_palestra`,
// pubblici), chi di solito e chi ci segue anche; un PT da qui dice "Lavoro qui".
// Una palestra da approvare la vede solo chi l'ha scelta: agli altri "non
// trovata", come una che non c'è.
// ---------------------------------------------------------------------------

const nomePersona = (p) => p.username || p.nome
const sottoPersona = (p) => (p.username ? p.nome : '')

function RigaPersona({ p, ioId, sotto, come }) {
  return (
    <button className="menu-voce" onClick={() => navigate(routes.utente(p.id, come))}>
      <Avatar id={p.id} nome={p.nome} foto={p.foto || undefined} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="menu-voce-nome">
          {nomePersona(p)}
          {p.id === ioId && <span className="faint"> · tu</span>}
        </span>
        {sotto && <span className="menu-voce-desc">{sotto}</span>}
      </span>
      <IconChevron className="faint" />
    </button>
  )
}

export default function PalestraPage({ id }) {
  const { utenteCorrente, scegliPalestra } = useAccount()
  const ioId = utenteCorrente?.id || null
  const mia = utenteCorrente?.palestraId === id
  const sonoPt = isPt(utenteCorrente)
  const soloPt = isSoloPt(utenteCorrente)
  const [linguetta, setLinguetta] = useState(soloPt ? 'pt' : 'persone')
  // { per, palestra, persone, pt, errore }: tenute con l'id, come in UtentePage.
  const [stato, setStato] = useState({ per: null, palestra: null, persone: [], pt: [], errore: '', errorePt: '' })
  const [salvo, setSalvo] = useState(false)
  const [errore, setErrore] = useState('')
  // Si rilegge dopo "Lavoro qui" e simili.
  const [giro, setGiro] = useState(0)

  // Si rilegge anche quando cambia la mia scelta: entro o esco dall'elenco.
  const mioStato = `${utenteCorrente?.palestraId}|${utenteCorrente?.chiVedePalestra}`
  useEffect(() => {
    let vivo = true
    Promise.all([palestraDaId(id), personeDellaPalestra(id), ptDellaPalestra(id)]).then(([palestra, r, t]) => {
      if (vivo) setStato({ per: id, palestra, persone: r.persone, pt: t.persone, errore: r.errore, errorePt: t.errore })
    })
    return () => {
      vivo = false
    }
  }, [id, mioStato, giro])
  const caricato = stato.per === id
  const { palestra, persone, pt } = stato
  const io = pt.find((p) => p.id === ioId)

  const lavoro = async (fn) => {
    setSalvo(true)
    setErrore('')
    const r = await fn()
    setSalvo(false)
    if (!r.ok) setErrore(r.errore || 'Non salvato. Riprova.')
    else setGiro((g) => g + 1)
  }

  const eLaMia = async () => {
    setSalvo(true)
    setErrore('')
    const r = await scegliPalestra(id)
    setSalvo(false)
    if (!r.ok) setErrore(r.errore || 'Palestra non salvata. Riprova.')
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>{palestra?.nome || 'Palestra'}</h1>
      </div>

      {!caricato ? (
        <p className="muted">Un attimo…</p>
      ) : !palestra ? (
        <div className="empty">
          <div className="big">🏋️</div>
          <p>Palestra non trovata.</p>
        </div>
      ) : (
        <>
          {luogoPalestra(palestra) && <p className="muted" style={{ margin: '0 2px 12px' }}>{luogoPalestra(palestra)}</p>}
          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            <button className="btn grow" onClick={() => navigate(routes.cercaPalestre(id))}>
              Sulla mappa
            </button>
            {mia ? (
              <button className="btn grow" onClick={() => navigate(routes.cercaPalestre())}>
                Cambia palestra
              </button>
            ) : (
              !soloPt && (
                <button className="btn btn-accent grow" onClick={eLaMia} disabled={salvo}>
                  {salvo ? 'Salvo…' : 'È anche la mia'}
                </button>
              )
            )}
          </div>
          {errore && <p className="form-error">{errore}</p>}

          {mia && (
            <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
              <ChiVedePalestra />
            </div>
          )}

          <div className="segmented" role="tablist" aria-label="Chi" style={{ marginBottom: 12 }}>
            {[
              ['persone', 'Si allenano'],
              ['pt', 'PT'],
            ].map(([k, nome]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={linguetta === k}
                className={'seg-btn' + (linguetta === k ? ' on' : '')}
                onClick={() => setLinguetta(k)}
              >
                {nome}
              </button>
            ))}
          </div>

          {linguetta === 'persone' ? (
            <>
              <div className="section-title">
                {persone.length === 1 ? 'Ci si allena 1 persona' : `Ci si allenano ${persone.length} persone`}
              </div>
              {stato.errore ? (
                <p className="muted">{stato.errore}</p>
              ) : persone.length === 0 ? (
                <p className="muted" style={{ fontSize: 13.5 }}>Nessuno, per ora.</p>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {persone.map((p) => (
                    <RigaPersona key={p.id} p={p} ioId={ioId} sotto={sottoPersona(p)} come="atleta" />
                  ))}
                </div>
              )}
              <p className="muted" style={{ fontSize: 12, margin: '12px 2px 0' }}>
                Ci sono solo quelli che la mostrano a te: ognuno sceglie chi vede la sua palestra.
              </p>
            </>
          ) : (
            <>
              {sonoPt && (
                <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                  {!io ? (
                    <button className="btn btn-accent grow" onClick={() => lavoro(() => mettiPalestraPt(id))} disabled={salvo}>
                      {salvo ? 'Salvo…' : 'Lavoro qui'}
                    </button>
                  ) : (
                    <>
                      <button className="btn grow" onClick={() => lavoro(() => mettiPalestraPt(id, !io.principale))} disabled={salvo}>
                        {io.principale ? 'Non è la principale' : 'È la mia principale'}
                      </button>
                      <button className="btn btn-ghost grow" onClick={() => lavoro(() => togliPalestraPt(id))} disabled={salvo}>
                        Non lavoro qui
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="section-title">
                {pt.length === 1 ? 'Ci lavora 1 PT' : `Ci lavorano ${pt.length} PT`}
              </div>
              {stato.errorePt ? (
                <p className="muted">{stato.errorePt}</p>
              ) : pt.length === 0 ? (
                <p className="muted" style={{ fontSize: 13.5 }}>Nessuno, per ora.</p>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {pt.map((p) => (
                    <RigaPersona
                      come="pt"
                      key={p.id}
                      p={p}
                      ioId={ioId}
                      sotto={[sottoPersona(p), p.principale ? 'Ci lavora di solito' : 'Segue anche qui'].filter(Boolean).join(' · ')}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
