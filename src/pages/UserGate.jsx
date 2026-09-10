import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { CODICE_MIN, RUOLI, codiceValido, generaCodicePt, normalizzaCodice } from '../lib/pt'
import { LIMITI, datiFisiciVuoti, datiMancanti, numeroValido } from '../lib/datiFisici'
import DatiFisiciForm from '../components/DatiFisiciForm'
import { IconBack, IconCoach, IconPlus } from '../components/icons'

// ---------------------------------------------------------------------------
// Schermata iniziale: BENVENUTO, poi "Accedi" o "Crea account".
//
// Dalla fase 2b gli account sono VERI (Supabase Auth) e si entra con **email e
// password**. L'email non e' burocrazia: e' l'unica cosa che permette di
// recuperare l'accesso a chi dimentica la password. Finche' i dati stavano nel
// browser, chi restava fuori poteva svuotare il browser e ricominciare; adesso
// i suoi allenamenti sono sul server, e senza recupero li perderebbe davvero.
//
// Il NOME resta, ma cambia mestiere: prima era la chiave per entrare, adesso e'
// solo come ti chiami dentro l'app (e come ti vedranno gli amici).
//
// Chi sbaglia email e chi sbaglia password ricevono LO STESSO messaggio: dire
// "questa email non e' registrata" direbbe a un estraneo chi usa l'app.
//
// Il resto è come prima: creando un profilo si sceglie il RUOLO ("mi alleno" /
// "sono un personal trainer") e un PT si crea il suo codice. ⚠️ Il campo per
// inserire il codice del PROPRIO PT invece non c'è più, per ora: collegarsi a
// un personal trainer vuol dire scrivere sul suo profilo, e le regole del
// database — giustamente — non lasciano scrivere nella riga di un altro. Torna
// con le amicizie. L'eliminazione di un profilo non sta qui: la si fa da
// dentro, dal menu del profilo, dove si è già entrati.
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
  const { utenti, creaUtente, accedi, recuperaPassword } = useAccount()
  // 'benvenuto' | 'accedi' | 'crea' | 'recupero'
  const [schermata, setSchermata] = useState('benvenuto')

  // Accesso.
  const [emailLogin, setEmailLogin] = useState('')
  const [pwLogin, setPwLogin] = useState('')
  const [errLogin, setErrLogin] = useState('')
  const [verificando, setVerificando] = useState(false)

  // Password dimenticata.
  const [emailRecupero, setEmailRecupero] = useState('')
  const [esitoRecupero, setEsitoRecupero] = useState('')

  // Creazione.
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [pw, setPw] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [errCrea, setErrCrea] = useState('')
  const [creando, setCreando] = useState(false)
  const [ruolo, setRuolo] = useState('atleta')
  const [codiceMio, setCodiceMio] = useState('')
  const [dati, setDati] = useState(datiFisiciVuoti)

  const tornaAlBenvenuto = () => {
    setSchermata('benvenuto')
    setEmailLogin('')
    setPwLogin('')
    setErrLogin('')
    setEsitoRecupero('')
    setEmail('')
    setNome('')
    setPw('')
    setPwConf('')
    setErrCrea('')
    setRuolo('atleta')
    setCodiceMio('')
    setDati(datiFisiciVuoti())
  }

  // Passando a "sono un PT" si propone subito un codice (resta modificabile).
  const cambiaRuolo = (id) => {
    setRuolo(id)
    setErrCrea('')
    if (id === 'pt' && !codiceMio) setCodiceMio(generaCodicePt(nome, utenti))
  }

  // ⚠️ I nomi duplicati non si controllano piu' qui: `utenti` contiene al
  // massimo chi ha gia' fatto il login, quindi non sa niente degli altri. E va
  // bene cosi' — a distinguere le persone adesso e' l'email, che il database
  // garantisce unica. Due amici che si chiamano tutti e due "Marco" sono due
  // account diversi, e nessuno dei due deve cambiare nome per colpa dell'altro.

  const entra = async (e) => {
    e.preventDefault()
    if (verificando) return
    setVerificando(true)
    const esito = await accedi(emailLogin, pwLogin)
    setVerificando(false)
    if (esito.ok) return navigate(routes.calendario())
    setErrLogin(esito.errore || 'Email o password non corretti.')
    setPwLogin('')
  }

  const inviaRecupero = async (e) => {
    e.preventDefault()
    setEsitoRecupero('invio')
    const esito = await recuperaPassword(emailRecupero)
    // ⚠️ Si risponde la stessa cosa che l'email esista o no: il contrario
    // direbbe a chiunque quali indirizzi hanno un account qui.
    setEsitoRecupero(esito.ok ? 'fatto' : esito.errore || 'fatto')
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
    if (!email.trim()) return setErrCrea('Inserisci la tua email.')
    if (!pw) return setErrCrea('Inserisci una password.')
    if (pw.length < 6) return setErrCrea('La password deve avere almeno 6 caratteri.')
    if (pw !== pwConf) return setErrCrea('Le password non coincidono.')
    if (fuoriScala) return setErrCrea('Controlla età, peso e altezza.')
    if (datiMancantiCrea.length > 0)
      return setErrCrea(`Manca ${datiMancantiCrea.join(', ')}: servono per le calorie e la dieta.`)
    if (livelloMancante)
      return setErrCrea('Scegli il tuo livello: serve a proporti gli allenamenti giusti.')
    // ⚠️ Che il codice sia libero non lo puo' piu' dire l'app: non vede gli altri
    // profili. Lo garantisce il database (`codice_pt text unique`), che e' anche
    // l'unico posto dove quel controllo ha davvero senso — due PT su due
    // telefoni diversi non si sarebbero mai visti a vicenda. Qui resta solo la
    // forma del codice; se e' occupato, lo dice l'errore di ritorno.
    if (ruolo === 'pt' && !codiceValido(codiceMio)) {
      return setErrCrea(`Il codice PT deve avere almeno ${CODICE_MIN} caratteri.`)
    }
    setErrCrea('')
    setCreando(true)
    const esito = await creaUtente({
      email,
      password: pw,
      nome: n,
      ruolo,
      codicePt: codiceMio,
      dati,
    })
    setCreando(false)
    if (!esito.ok) return setErrCrea(esito.errore)
    navigate(routes.calendario())
  }

  const pwMismatch = pwConf.length > 0 && pw !== pwConf
  // Messaggio d'errore da mostrare sotto il form (priorità: submit → password).
  const messaggioErrore = errCrea || (pwMismatch ? 'Le password non coincidono.' : '')

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
            {schermata === 'accedi'
              ? 'Bentornato'
              : schermata === 'crea'
                ? 'Crea il tuo account'
                : schermata === 'recupero'
                  ? 'Password dimenticata'
                  : 'Benvenuto'}
          </h1>
          <p className="muted">
            {schermata === 'accedi'
              ? 'Entra con la tua email e la tua password.'
              : schermata === 'crea'
                ? 'I tuoi allenamenti ti seguono su tutti i tuoi dispositivi.'
                : schermata === 'recupero'
                  ? 'Capita. Te ne facciamo scegliere una nuova.'
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
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoFocus
                value={emailLogin}
                onChange={(e) => {
                  setEmailLogin(e.target.value)
                  setErrLogin('')
                }}
                placeholder="La tua email"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
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
              disabled={verificando || !emailLogin.trim() || !pwLogin}
            >
              {verificando ? 'Verifica…' : 'Entra'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block mt-8"
              onClick={() => {
                setEmailRecupero(emailLogin)
                setEsitoRecupero('')
                setSchermata('recupero')
              }}
            >
              Password dimenticata?
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

        {/* Password dimenticata */}
        {schermata === 'recupero' && (
          <form className="card mt-16" onSubmit={inviaRecupero}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="recupero-email">Email</label>
              <input
                id="recupero-email"
                className="input"
                type="email"
                autoFocus
                value={emailRecupero}
                onChange={(e) => {
                  setEmailRecupero(e.target.value)
                  setEsitoRecupero('')
                }}
                placeholder="L’email del tuo account"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
              />
            </div>

            {esitoRecupero === 'fatto' ? (
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 12px' }}>
                Se esiste un account con questa email, il link per rimettere la password è appena
                partito. Guarda anche nello spam.
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
                Ti mandiamo un link per sceglierne una nuova.
              </p>
            )}
            {esitoRecupero && esitoRecupero !== 'fatto' && esitoRecupero !== 'invio' && (
              <p className="form-error">{esitoRecupero}</p>
            )}

            <button
              type="submit"
              className="btn btn-accent btn-lg btn-block"
              disabled={!emailRecupero.trim() || esitoRecupero === 'invio'}
            >
              {esitoRecupero === 'invio' ? 'Invio…' : 'Mandami il link'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block mt-8"
              onClick={() => setSchermata('accedi')}
            >
              Torna all’accesso
            </button>
          </form>
        )}

        {/* Creazione */}
        {schermata === 'crea' && (
          <form className="card mt-16" onSubmit={crea}>
            <div className="field">
              <label htmlFor="email-utente">Email</label>
              <input
                id="email-utente"
                className="input"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrCrea('')
                }}
                placeholder="La tua email"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
              />
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                Serve per entrare e per rimettere la password se la dimentichi. Non la usiamo per
                altro.
              </p>
            </div>
            <div className="field">
              <label htmlFor="nome-utente">Nome</label>
              <input
                id="nome-utente"
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Come ti chiami?"
                maxLength={24}
                autoComplete="off"
              />
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
                È come ti vedranno i tuoi amici. Può ripetersi: a distinguervi è l’email.
              </p>
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
              /* ⚠️ Il campo "codice del tuo PT" è tolto per ora, e non è una
                 dimenticanza: collegarsi a un PT vuol dire scrivere sul suo
                 profilo, e le regole del database — giustamente — non lasciano
                 scrivere nella riga di un altro. Un campo che accetta il codice
                 e poi non collega niente sarebbe peggio di un campo assente.
                 Torna con le amicizie, nella prossima tappa. */
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px', lineHeight: 1.45 }}>
                Ti segue un personal trainer che usa l’app? Potrai collegarti a lui appena la
                funzione sarà pronta: l’account che crei adesso resta lo stesso.
              </p>
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
                !email.trim() ||
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
