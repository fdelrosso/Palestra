import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { IconCheck } from '../components/icons'
import logo from '../assets/logo.png'

// ---------------------------------------------------------------------------
// La schermata di chi arriva dal link della mail "Password dimenticata".
//
// Il link lo usa AccountContext (lib/linkEmail) prima ancora di chiedere la
// sessione: se e' buono, a questo punto si e' GIA' dentro — e' cosi' che
// Supabase fa il recupero: il link vale come login, e da dentro si cambia la
// password (`updateUser`). Per questo questa schermata sta davanti all'app
// finche' la password nuova non e' scelta: altrimenti chi apre il link si
// ritroverebbe nel calendario senza sapere che doveva fare qualcosa.
//
// ⚠️ La sessione nasce nel browser che ha aperto il link, che non e' per forza
// quello dove si usa l'app (sul telefono la mail apre il browser, non l'app
// installata). La' si entrera' con la password nuova: la nota in fondo lo dice.
// ---------------------------------------------------------------------------

const MIN = 6

export default function NuovaPassword() {
  const { daLink, chiudiLink, cambiaPassword } = useAccount()
  const stato = daLink?.stato

  const [pw, setPw] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [errore, setErrore] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fatto, setFatto] = useState(false)

  const salva = async (e) => {
    e.preventDefault()
    if (salvando) return
    if (pw.length < MIN) return setErrore(`La password deve avere almeno ${MIN} caratteri.`)
    if (pw !== pwConf) return setErrore('Le password non coincidono.')
    setErrore('')
    setSalvando(true)
    const esito = await cambiaPassword(pw)
    setSalvando(false)
    if (!esito.ok) return setErrore(esito.errore)
    setPw('')
    setPwConf('')
    setFatto(true)
  }

  const entra = () => {
    chiudiLink()
    navigate(routes.calendario())
  }

  const chiedineUnAltro = () => {
    chiudiLink()
    navigate(routes.passwordDimenticata())
  }

  const pwMismatch = pwConf.length > 0 && pw !== pwConf
  const messaggio = errore || (pwMismatch ? 'Le password non coincidono.' : '')

  return (
    <div className="app">
      <div className="gate">
        <div className="gate-aurora" aria-hidden="true">
          <span />
          <span />
        </div>

        <div className="gate-head">
          <div className="gate-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          {stato === 'in-corso' && <p className="muted">Un attimo…</p>}
          {stato === 'ok' && !fatto && (
            <>
              <h1>Nuova password</h1>
              <p className="muted">Scegline una che non usi altrove.</p>
            </>
          )}
          {stato === 'ok' && fatto && (
            <>
              <h1 className="row" style={{ justifyContent: 'center', gap: 8 }}>
                <IconCheck width={26} height={26} style={{ color: 'var(--accent)' }} />
                Password cambiata
              </h1>
              <p className="muted">Da adesso si entra con quella nuova, su tutti i dispositivi.</p>
            </>
          )}
          {stato === 'errore' && (
            <>
              <h1>Link non valido</h1>
              <p className="muted">{daLink.errore}</p>
            </>
          )}
        </div>

        {stato === 'ok' && !fatto && (
          <form className="card mt-16" onSubmit={salva}>
            <div className="field">
              <label htmlFor="nuova-pw">Nuova password</label>
              <input
                id="nuova-pw"
                className="input"
                type="password"
                autoFocus
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value)
                  setErrore('')
                }}
                placeholder={`Almeno ${MIN} caratteri`}
                autoComplete="new-password"
                autoCapitalize="none"
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="nuova-pw-conf">Conferma password</label>
              <input
                id="nuova-pw-conf"
                className="input"
                type="password"
                value={pwConf}
                onChange={(e) => {
                  setPwConf(e.target.value)
                  setErrore('')
                }}
                placeholder="Ripeti la password"
                autoComplete="new-password"
                autoCapitalize="none"
              />
            </div>

            {messaggio && <p className="form-error">{messaggio}</p>}

            <button
              type="submit"
              className="btn btn-accent btn-lg btn-block"
              disabled={salvando || !pw || pw !== pwConf}
            >
              {salvando ? 'Salvataggio…' : 'Salva la nuova password'}
            </button>
          </form>
        )}

        {stato === 'ok' && fatto && (
          <>
            <button className="btn btn-accent btn-lg btn-block mt-16" onClick={entra}>
              Entra
            </button>
            <p className="muted gate-nota">
              Usi l’app installata sul telefono? Torna lì ed entra con la password nuova.
            </p>
          </>
        )}

        {stato === 'errore' && (
          <>
            <button className="btn btn-accent btn-lg btn-block mt-16" onClick={chiedineUnAltro}>
              Chiedi un link nuovo
            </button>
            <p className="muted gate-nota">
              Il link per cambiare la password vale una volta sola e per poco tempo. Se l’hai
              chiesto più volte, vale solo l’ultimo arrivato.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
