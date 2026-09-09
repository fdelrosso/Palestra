import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import {
  CODICE_MIN,
  RUOLI,
  codiceInUso,
  codiceValido,
  generaCodicePt,
  normalizzaCodice,
  trovaPtDaCodice,
} from '../lib/pt'
import { LIMITI, datiFisiciVuoti, datiMancanti, numeroValido } from '../lib/datiFisici'
import DatiFisiciForm from '../components/DatiFisiciForm'
import { IconBack, IconCoach, IconPlus } from '../components/icons'

// ---------------------------------------------------------------------------
// Schermata iniziale: BENVENUTO, poi "Accedi" o "Crea account".
//
// Chi apre l'app NON deve vedere chi altro la usa su questo dispositivo: prima
// c'era l'elenco dei profili da toccare, ed era comodo ma raccontava a tutti
// quanti account ci sono e come si chiamano. Ora si entra scrivendo il proprio
// nome e la propria password, come ovunque.
//
// Conseguenza voluta: chi sbaglia nome e chi sbaglia password ricevono LO
// STESSO messaggio. Se dicessimo "questo nome non esiste" avremmo rimesso in
// piedi l'elenco, un tentativo alla volta.
//
// Il resto è come prima: creando un profilo si sceglie il RUOLO ("mi alleno" /
// "sono un personal trainer"), un PT si crea il suo codice, un atleta può
// inserire subito quello del proprio PT. L'eliminazione di un profilo non sta
// più qui — la si fa da dentro, dal menu del profilo, dove si è già entrati.
//
// DATI FISICI. Chi si allena dà anche sesso, età, peso, altezza, movimento e
// obiettivo. Non è burocrazia: le calorie bruciate in un allenamento dipendono
// da quanto pesi, e senza il peso l'app o non le dice o le inventa — prima le
// calcolava su 75 kg, cioè su una persona che non era chi la stava leggendo.
// Sono OBBLIGATORI per un atleta e facoltativi per un PT (che apre l'account
// per seguire altri, non per allenarsi), e si cambiano quando si vuole da
// "I miei dati" nel menu del profilo.
//
// LIVELLO. Insieme ai dati si chiede da quanto ci si allena: principiante,
// intermedio o avanzato. È obbligatorio per un atleta come gli altri, ma per
// un motivo diverso — non serve a calcolare un numero, serve a decidere che
// esercizi l'app gli metterà davanti (lib/livello). Non ha un valore
// preselezionato apposta: sceglierlo noi vorrebbe dire dare a un principiante
// uno stacco da terra perché non ha risposto.
// ---------------------------------------------------------------------------

export default function UserGate() {
  const { utenti, creaUtente, accedi } = useAccount()
  // 'benvenuto' | 'accedi' | 'crea'
  const [schermata, setSchermata] = useState('benvenuto')

  // Accesso.
  const [nomeLogin, setNomeLogin] = useState('')
  const [pwLogin, setPwLogin] = useState('')
  const [errLogin, setErrLogin] = useState('')
  const [verificando, setVerificando] = useState(false)

  // Creazione.
  const [nome, setNome] = useState('')
  const [pw, setPw] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [errCrea, setErrCrea] = useState('')
  const [creando, setCreando] = useState(false)
  const [ruolo, setRuolo] = useState('atleta')
  const [codiceMio, setCodiceMio] = useState('')
  const [codicePt, setCodicePt] = useState('')
  const [dati, setDati] = useState(datiFisiciVuoti)

  const tornaAlBenvenuto = () => {
    setSchermata('benvenuto')
    setNomeLogin('')
    setPwLogin('')
    setErrLogin('')
    setNome('')
    setPw('')
    setPwConf('')
    setErrCrea('')
    setRuolo('atleta')
    setCodiceMio('')
    setCodicePt('')
    setDati(datiFisiciVuoti())
  }

  // Passando a "sono un PT" si propone subito un codice (resta modificabile).
  const cambiaRuolo = (id) => {
    setRuolo(id)
    setErrCrea('')
    if (id === 'pt' && !codiceMio) setCodiceMio(generaCodicePt(nome, utenti))
  }

  // Un nome è già in uso se un altro profilo ha lo stesso nome (senza distinguere
  // maiuscole/minuscole e spazi ai bordi).
  const nomeGiaUsato = (n) =>
    utenti.some((u) => (u.nome || '').trim().toLowerCase() === n.trim().toLowerCase())

  const trovaPerNome = (n) =>
    utenti.find((u) => (u.nome || '').trim().toLowerCase() === n.trim().toLowerCase()) || null

  const entra = async (e) => {
    e.preventDefault()
    if (verificando) return
    const u = trovaPerNome(nomeLogin)
    setVerificando(true)
    // Anche col nome sbagliato si passa di qui: stesso messaggio, stessa attesa.
    const ok = u ? await accedi(u.id, pwLogin) : false
    setVerificando(false)
    if (ok) return navigate(routes.calendario())
    setErrLogin('Nome o password non corretti.')
    setPwLogin('')
  }

  // Età, peso e altezza fuori scala fermano tutti (è quasi sempre l'altezza
  // scritta in metri); i campi VUOTI fermano solo un atleta, per cui quei
  // numeri sono il motivo per cui l'app sa dire qualcosa.
  const fuoriScala = ['eta', 'peso', 'altezza'].some(
    (k) => String(dati[k] ?? '').trim() && numeroValido(dati[k], LIMITI[k]) == null,
  )
  const datiMancantiCrea = ruolo === 'pt' ? [] : datiMancanti(dati)
  // Il livello si chiede a parte: non serve a calcolare niente (non entra nel
  // metabolismo, quindi non sta in datiMancanti) ma decide che allenamenti
  // l'app proporrà, e sceglierlo al posto suo sarebbe deciderlo noi.
  const livelloMancante = ruolo !== 'pt' && !dati.livello

  const crea = async (e) => {
    e.preventDefault()
    if (creando) return
    const n = nome.trim()
    if (!n) return setErrCrea('Inserisci un nome.')
    if (nomeGiaUsato(n)) return setErrCrea('Nome non valido')
    if (!pw) return setErrCrea('Inserisci una password.')
    if (pw !== pwConf) return setErrCrea('Le password non coincidono.')
    if (fuoriScala) return setErrCrea('Controlla età, peso e altezza.')
    if (datiMancantiCrea.length > 0)
      return setErrCrea(`Manca ${datiMancantiCrea.join(', ')}: servono per le calorie e la dieta.`)
    if (livelloMancante)
      return setErrCrea('Scegli il tuo livello: serve a proporti gli allenamenti giusti.')
    if (ruolo === 'pt') {
      if (!codiceValido(codiceMio))
        return setErrCrea(`Il codice PT deve avere almeno ${CODICE_MIN} caratteri.`)
      if (codiceInUso(codiceMio, utenti))
        return setErrCrea('Codice PT già usato. Scegline un altro.')
    } else if (codicePt.trim() && !trovaPtDaCodice(codicePt, utenti)) {
      return setErrCrea('Codice PT non riconosciuto. Lascialo vuoto e inseriscilo dopo.')
    }
    setErrCrea('')
    setCreando(true)
    await creaUtente(n, pw, { ruolo, codicePt: codiceMio, codiceInserito: codicePt, dati })
    setCreando(false)
    navigate(routes.calendario())
  }

  const pwMismatch = pwConf.length > 0 && pw !== pwConf
  const nomeDuplicato = nome.trim() !== '' && nomeGiaUsato(nome)
  // Messaggio d'errore da mostrare sotto il form (priorità: submit → nome → password).
  const messaggioErrore =
    errCrea || (nomeDuplicato ? 'Nome non valido' : pwMismatch ? 'Le password non coincidono.' : '')

  return (
    <div className="app">
      <div className="gate">
        {schermata !== 'benvenuto' && (
          <button className="btn btn-ghost btn-sm gate-indietro" onClick={tornaAlBenvenuto}>
            <IconBack width={16} height={16} /> Indietro
          </button>
        )}

        <div className="gate-head">
          <div className="gate-emoji">🏋️</div>
          <h1>
            {schermata === 'accedi' ? 'Bentornato' : schermata === 'crea' ? 'Crea il tuo account' : 'Benvenuto'}
          </h1>
          <p className="muted">
            {schermata === 'accedi'
              ? 'Entra con il tuo nome utente e la tua password.'
              : schermata === 'crea'
                ? 'Scegli un nome e una password: le schede e gli allenamenti saranno solo tuoi.'
                : 'Le tue schede, i tuoi allenamenti e la tua dieta, in un posto solo.'}
          </p>
        </div>

        {/* Benvenuto: due strade, nessun elenco di account. */}
        {schermata === 'benvenuto' && (
          <>
            <button
              className="btn btn-accent btn-lg btn-block mt-16"
              onClick={() => setSchermata('accedi')}
            >
              Accedi
            </button>
            <button
              className="btn btn-lg btn-block mt-8"
              onClick={() => setSchermata('crea')}
            >
              <IconPlus width={18} height={18} />
              Crea un account
            </button>
            <p className="muted gate-nota">
              Ogni account è protetto da password. Chi usa l’app su questo dispositivo non vede i
              tuoi dati, né sa che il tuo profilo esiste.
            </p>
          </>
        )}

        {/* Accesso */}
        {schermata === 'accedi' && (
          <form className="card mt-16" onSubmit={entra}>
            <div className="field">
              <label htmlFor="login-nome">Nome utente</label>
              <input
                id="login-nome"
                className="input"
                autoFocus
                value={nomeLogin}
                onChange={(e) => {
                  setNomeLogin(e.target.value)
                  setErrLogin('')
                }}
                placeholder="Il nome con cui ti sei registrato"
                maxLength={24}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="login-pw">Password</label>
              <input
                id="login-pw"
                className="input"
                type="password"
                value={pwLogin}
                onChange={(e) => {
                  setPwLogin(e.target.value)
                  setErrLogin('')
                }}
                placeholder="La tua password"
                autoComplete="current-password"
                autoCapitalize="none"
              />
            </div>

            {errLogin && <p className="form-error">{errLogin}</p>}

            <button
              type="submit"
              className="btn btn-accent btn-lg btn-block"
              disabled={verificando || !nomeLogin.trim() || !pwLogin}
            >
              {verificando ? 'Verifica…' : 'Entra'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block mt-8"
              onClick={() => {
                setSchermata('crea')
                setErrLogin('')
              }}
            >
              Non hai un account? Creane uno
            </button>
          </form>
        )}

        {/* Creazione */}
        {schermata === 'crea' && (
          <form className="card mt-16" onSubmit={crea}>
            <div className="field">
              <label htmlFor="nome-utente">Nome</label>
              <input
                id="nome-utente"
                className="input"
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Come ti chiami?"
                maxLength={24}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="pw-utente">Password</label>
              <input
                id="pw-utente"
                className="input"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Scegli una password"
                autoComplete="new-password"
                autoCapitalize="none"
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="pw-conf">Conferma password</label>
              <input
                id="pw-conf"
                className="input"
                type="password"
                value={pwConf}
                onChange={(e) => setPwConf(e.target.value)}
                placeholder="Ripeti la password"
                autoComplete="new-password"
                autoCapitalize="none"
              />
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label>Come usi l'app</label>
              <div className="segmented">
                {RUOLI.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={'seg-btn' + (ruolo === r.id ? ' on' : '')}
                    onClick={() => cambiaRuolo(r.id)}
                    aria-pressed={ruolo === r.id}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                {RUOLI.find((r) => r.id === ruolo)?.descrizione}
              </p>
            </div>

            {ruolo === 'pt' ? (
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor="codice-mio">Il tuo codice PT</label>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    id="codice-mio"
                    className="input codice-input"
                    value={codiceMio}
                    onChange={(e) => setCodiceMio(normalizzaCodice(e.target.value))}
                    placeholder="es. MARCO7K"
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm nowrap"
                    onClick={() => setCodiceMio(generaCodicePt(nome, utenti))}
                  >
                    Genera
                  </button>
                </div>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                  È il codice che darai ai tuoi atleti: inserendolo si collegano a te. Lo ritrovi
                  sempre nel menu del profilo.
                </p>
              </div>
            ) : (
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor="codice-pt">Codice del tuo PT (facoltativo)</label>
                <input
                  id="codice-pt"
                  className="input codice-input"
                  value={codicePt}
                  onChange={(e) => setCodicePt(normalizzaCodice(e.target.value))}
                  placeholder="Se ne hai uno"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                  Se ti segue un personal trainer che usa l'app, il suo codice fa sì che i consigli
                  assomiglino a quello che dà ai suoi atleti. Puoi inserirlo anche dopo, dal menu del
                  profilo.
                </p>
              </div>
            )}

            {/* I tuoi dati: servono alle calorie del recap e alla dieta
                consigliata. Il riquadro col conto fa vedere subito a cosa. */}
            <div className="field" style={{ marginBottom: 10 }}>
              <label>I tuoi dati{ruolo === 'pt' ? ' (facoltativi)' : ''}</label>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px', lineHeight: 1.45 }}>
                {ruolo === 'pt'
                  ? 'Se ti alleni anche tu, con questi l’app stima le calorie dei tuoi allenamenti e la tua dieta, e sa che allenamenti proporti.'
                  : 'Servono a stimare le calorie che bruci allenandoti, a calcolare la dieta consigliata e a proporti allenamenti alla tua portata. Li cambi quando vuoi dal tuo profilo.'}
              </p>
              <DatiFisiciForm
                valori={dati}
                onChange={(patch) => {
                  setDati((d) => ({ ...d, ...patch }))
                  setErrCrea('')
                }}
              />
            </div>

            {messaggioErrore && <p className="form-error">{messaggioErrore}</p>}

            <button
              type="submit"
              className="btn btn-accent btn-lg btn-block"
              disabled={
                creando ||
                !nome.trim() ||
                nomeDuplicato ||
                !pw ||
                pw !== pwConf ||
                fuoriScala ||
                datiMancantiCrea.length > 0 ||
                livelloMancante ||
                (ruolo === 'pt' && !codiceValido(codiceMio))
              }
            >
              {creando ? 'Creazione…' : 'Crea account'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block mt-8"
              onClick={() => {
                setSchermata('accedi')
                setErrCrea('')
              }}
            >
              Hai già un account? Accedi
            </button>
          </form>
        )}

        {schermata === 'crea' && ruolo === 'pt' && (
          <p className="muted gate-nota">
            <IconCoach width={13} height={13} /> Da personal trainer vedrai le schede e gli
            allenamenti degli atleti che si collegano al tuo codice.
          </p>
        )}
      </div>
    </div>
  )
}
