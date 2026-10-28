import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { luogoPalestra, palestraDaId, personeDellaPalestra } from '../lib/palestre'
import Avatar from '../components/Avatar'
import ChiVedePalestra from '../components/ChiVedePalestra'
import { IconBack, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// Una palestra (/palestra/:id): ci si arriva dalla pillola sotto il nome in un
// profilo (pages/UtentePage). Dove sta, chi ci si allena (lib/palestre,
// `persone_della_palestra`: solo chi la mostra a te) e, se è la tua, chi la
// vede (components/ChiVedePalestra). Se non è la tua: "È anche la mia".
// Una palestra da approvare la vede solo chi l'ha scelta: agli altri "non
// trovata", come una che non c'è.
// ---------------------------------------------------------------------------

const nomePersona = (p) => p.username || p.nome
const sottoPersona = (p) => (p.username ? p.nome : '')

export default function PalestraPage({ id }) {
  const { utenteCorrente, scegliPalestra } = useAccount()
  const ioId = utenteCorrente?.id || null
  const mia = utenteCorrente?.palestraId === id
  // { per, palestra, persone, errore }: tenute con l'id, come in UtentePage.
  const [stato, setStato] = useState({ per: null, palestra: null, persone: [], errore: '' })
  const [salvo, setSalvo] = useState(false)
  const [errore, setErrore] = useState('')

  // Si rilegge anche quando cambia la mia scelta: entro o esco dall'elenco.
  const mioStato = `${utenteCorrente?.palestraId}|${utenteCorrente?.chiVedePalestra}`
  useEffect(() => {
    let vivo = true
    Promise.all([palestraDaId(id), personeDellaPalestra(id)]).then(([palestra, r]) => {
      if (vivo) setStato({ per: id, palestra, persone: r.persone, errore: r.errore })
    })
    return () => {
      vivo = false
    }
  }, [id, mioStato])
  const caricato = stato.per === id
  const { palestra, persone } = stato

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
              <button className="btn btn-accent grow" onClick={eLaMia} disabled={salvo}>
                {salvo ? 'Salvo…' : 'È anche la mia'}
              </button>
            )}
          </div>
          {errore && <p className="form-error">{errore}</p>}

          {mia && (
            <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
              <ChiVedePalestra />
            </div>
          )}

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
                <button key={p.id} className="menu-voce" onClick={() => navigate(routes.utente(p.id))}>
                  <Avatar id={p.id} nome={p.nome} foto={p.foto || undefined} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="menu-voce-nome">
                      {nomePersona(p)}
                      {p.id === ioId && <span className="faint"> · tu</span>}
                    </span>
                    {sottoPersona(p) && <span className="menu-voce-desc">{sottoPersona(p)}</span>}
                  </span>
                  <IconChevron className="faint" />
                </button>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, margin: '12px 2px 0' }}>
            Ci sono solo quelli che la mostrano a te: ognuno sceglie chi vede la sua palestra.
          </p>
        </>
      )}
    </div>
  )
}
