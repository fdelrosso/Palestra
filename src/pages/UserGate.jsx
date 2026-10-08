import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { CODICE_MIN, RUOLI, codiceValido, generaCodicePt, normalizzaCodice } from '../lib/pt'
import {
  LIMITI,
  LIVELLI,
  MOVIMENTI,
  OBIETTIVI,
  SESSI,
  datiFisiciVuoti,
  datiMancanti,
  erroreCampo,
  kcalConsigliate,
  numeroValido,
} from '../lib/datiFisici'
import { errorePerParole } from '../lib/linguaggio'
import { CaselleConsenso } from '../components/Legale'
import Benvenuto from '../components/Benvenuto'
import { IconCheck } from '../components/icons'

// ---------------------------------------------------------------------------
// Schermata iniziale: BENVENUTO, poi "Accedi" o "Crea account".
//
// Non si cambia pagina: i form entrano nel hero del benvenuto al posto dei due
// tasti (components/Benvenuto, prop `pannello`). L'accesso è un form solo; la
// creazione chiede prima email, nome e password, poi il resto UNA DOMANDA ALLA
// VOLTA (PASSI_CREA), come un sondaggio. Le regole sono quelle di sempre: ogni
// passo controlla il suo pezzo, e `crea` in fondo li ricontrolla tutti.
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
// "sono un personal trainer"), un PT si crea il suo codice e un atleta può
// scrivere quello del PROPRIO PT. ⚠️ Quel codice qui non si può controllare:
// per chiederlo al database bisogna essere già entrati, e in questa schermata
// l'account non esiste ancora. Quindi si controlla solo la FORMA, e il
// controllo vero lo fa AccountContext appena la sessione c'è. Se il codice non
// risulta a nessuno, l'account resta valido e l'avviso viene raccolto dal menu
// del profilo (lib/pt: salvaAvvisoPt / prendiAvvisoPt).
//
// CONFERMA DELL'EMAIL. Se su Supabase la conferma e' accesa, "Crea account" non
// fa entrare: manda una mail con un link, e qui si passa a "Controlla la
// posta". Il link spesso si apre altrove (il browser del telefono invece
// dell'app installata), e la sessione nasce la'. Per questo la schermata
// d'attesa si tiene in memoria email e password — solo in memoria, e solo
// finche' e' aperta — e quando si torna qui riprova da sola ad entrare: appena
// l'email risulta confermata, si e' dentro. Nello stesso browser non serve
// nemmeno: la sessione arriva da sola dall'altra scheda.
// L'eliminazione di un profilo non sta qui: la si fa da dentro, dal menu del
// profilo, dove si è già entrati.
//
// DATI FISICI. Chi si allena dà anche sesso, età, peso, altezza, movimento e
// obiettivo. Non è burocrazia: le calorie bruciate in un allenamento dipendono
// da quanto pesi, e senza il peso l'app o non le dice o le inventa — prima le
// calcolava su 75 kg, cioè su una persona che non era chi la stava leggendo.
// Sono OBBLIGATORI per un atleta e facoltativi per un PT (che apre l'account
// per seguire altri, non per allenarsi), e si cambiano quando si vuole da
// "I miei dati" nel profilo.
//
// LIVELLO. Insieme ai dati si chiede da quanto ci si allena: principiante,
// intermedio o avanzato. È obbligatorio per un atleta come gli altri, ma per
// un motivo diverso — non serve a calcolare un numero, serve a decidere che
// esercizi l'app gli metterà davanti (lib/livello). Non ha un valore
// preselezionato apposta: sceglierlo noi vorrebbe dire dare a un principiante
// uno stacco da terra perché non ha risposto.
// ---------------------------------------------------------------------------

// I passi della creazione, in ordine. Il primo è il form delle credenziali,
// gli altri sono una domanda ciascuno.
const PASSI_CREA = [
  'credenziali',
  'ruolo',
  'codice',
  'sesso',
  'misure',
  'movimento',
  'obiettivo',
  'livello',
  'consensi',
]

// Una domanda a scelta: le voci sono schede da toccare, con la descrizione
// sotto il nome ("Sedentario (ufficio…)" diventa nome + descrizione).
function Scelte({ voci, scelta, onScegli }) {
  return (
    <div className="benv-scelte" role="radiogroup">
      {voci.map((v) => {
        const [nome, tra] = v.label.split(' (')
        const desc = v.descrizione || (tra ? tra.replace(/\)$/, '') : '')
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={scelta === v.id}
            className={'benv-scelta' + (scelta === v.id ? ' on' : '')}
            onClick={() => onScegli(v.id)}
          >
            <span className="grow">
              <strong>{nome}</strong>
              {desc && <small>{desc}</small>}
            </span>
            <span className="benv-scelta-segno" aria-hidden="true">
              {scelta === v.id && <IconCheck width={14} height={14} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Campo({ id, label, aiuto, errore, unita, ...input }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {unita ? (
        <div className={'input-unita' + (errore ? ' sbagliato' : '')}>
          <input id={id} className="input" aria-invalid={!!errore} {...input} />
          <span aria-hidden="true">{unita}</span>
        </div>
      ) : (
        <input id={id} className="input" {...input} />
      )}
      {errore && <p className="form-error benv-errore-campo">{errore}</p>}
      {aiuto && <p className="benv-aiuto">{aiuto}</p>}
    </div>
  )
}

export default function UserGate() {
  const { utenti, creaUtente, accedi, recuperaPassword, rimandaConferma } = useAccount()
  // 'benvenuto' | 'accedi' | 'crea' | 'recupero' | 'attesa'
  // Si parte da "Password dimenticata" quando ci manda qui un link scaduto
  // (NuovaPassword, ConfermaEmail: "Chiedi un link nuovo").
  const [schermata, setSchermata] = useState(() =>
    window.location.pathname === routes.passwordDimenticata() ? 'recupero' : 'benvenuto',
  )

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
  // Il codice del PROPRIO PT: facoltativo, e solo per chi si allena.
  const [codiceDelMioPt, setCodiceDelMioPt] = useState('')
  const [dati, setDati] = useState(datiFisiciVuoti)
  // Termini e dati sulla salute (lib/consensi): tutti e due, o niente account.
  const [okTermini, setOkTermini] = useState(false)
  const [okSalute, setOkSalute] = useState(false)

  // A che domanda è arrivata la creazione (indice in PASSI_CREA).
  const [passo, setPasso] = useState(0)

  // In attesa della conferma dell'email (vedi in cima).
  const [emailAttesa, setEmailAttesa] = useState('')
  const pwAttesa = useRef('')
  // '' | 'controllo' | 'invio' | 'rimandata' | un messaggio d'errore
  const [esitoAttesa, setEsitoAttesa] = useState('')

  const tornaAlBenvenuto = () => {
    setSchermata('benvenuto')
    setPasso(0)
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
    setCodiceDelMioPt('')
    setOkTermini(false)
    setOkSalute(false)
    setDati(datiFisiciVuoti())
    setEmailAttesa('')
    pwAttesa.current = ''
    setEsitoAttesa('')
  }

  const vaiInAttesa = (indirizzo, password) => {
    setEmailAttesa(indirizzo)
    pwAttesa.current = password
    setEsitoAttesa('')
    setPw('')
    setPwConf('')
    setPwLogin('')
    setSchermata('attesa')
  }

  // Prova a entrare con le credenziali tenute da parte. `silenzioso`: quando
  // parte da solo (si e' tornati sull'app) e l'email non e' ancora confermata,
  // non c'e' niente da dire — si sta aspettando proprio quello.
  const provaEntrare = async (silenzioso) => {
    if (!pwAttesa.current) return
    if (!silenzioso) setEsitoAttesa('controllo')
    const esito = await accedi(emailAttesa, pwAttesa.current)
    if (esito.ok) return navigate(routes.inizio())
    if (silenzioso && esito.daConfermare) return
    setEsitoAttesa(
      esito.daConfermare
        ? 'L’email non risulta ancora confermata: apri il link che ti abbiamo mandato.'
        : esito.errore,
    )
  }

  // Si riprova quando la persona torna su questa pagina (dall'app della
  // posta, da un'altra scheda). Non a intervalli fissi: Supabase conta i
  // tentativi di accesso, e ne bastano pochi a farsi dire "troppi tentativi".
  const provaEntrareRef = useRef(provaEntrare)
  useEffect(() => {
    provaEntrareRef.current = provaEntrare
  })
  useEffect(() => {
    if (schermata !== 'attesa') return undefined
    let ultimo = 0
    const alRitorno = () => {
      if (document.visibilityState !== 'visible') return
      const ora = Date.now()
      if (ora - ultimo < 5000) return
      ultimo = ora
      provaEntrareRef.current(true)
    }
    document.addEventListener('visibilitychange', alRitorno)
    window.addEventListener('focus', alRitorno)
    return () => {
      document.removeEventListener('visibilitychange', alRitorno)
      window.removeEventListener('focus', alRitorno)
    }
  }, [schermata])

  const rimanda = async () => {
    setEsitoAttesa('invio')
    const esito = await rimandaConferma(emailAttesa)
    setEsitoAttesa(esito.ok ? 'rimandata' : esito.errore)
  }

  // Passando a "sono un PT" si propone subito un codice (resta modificabile).
  const cambiaRuolo = (id) => {
    setRuolo(id)
    setErrCrea('')
    if (id === 'pt' && !codiceMio) setCodiceMio(generaCodicePt(nome, utenti))
  }

  // ⚠️ Il nome e' UNICO (dal 2026-09-18), perche' ci si entra: "Marco" deve
  // voler dire una persona sola. Che sia libero non lo puo' sapere questa
  // pagina — `utenti` contiene al massimo chi ha gia' fatto il login — quindi
  // lo chiede creaUtente al database (`nome_disponibile`), e l'indice
  // `profili_nome_unico` lo garantisce anche se due si registrano insieme.
  // Maiuscole e spazi ai lati non contano: "marco" e "Marco" sono lo stesso.

  const entra = async (e) => {
    e.preventDefault()
    if (verificando) return
    setVerificando(true)
    const esito = await accedi(emailLogin, pwLogin)
    setVerificando(false)
    if (esito.ok) return navigate(routes.inizio())
    // Password giusta ma email mai confermata: si passa all'attesa, dove si
    // puo' farsi rimandare il link (quello vecchio magari e' scaduto).
    if (esito.daConfermare) return vaiInAttesa(esito.email, pwLogin)
    setErrLogin(esito.errore || 'Email, nome o password non corretti.')
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

  // Il primo passo della creazione: senza queste non si va alle domande.
  const erroreCredenziali = () => {
    const n = nome.trim()
    if (!n) return 'Inserisci un nome.'
    // Nella schermata di accesso, quello che ha la forma di un'email si prova
    // come email: un nome con la chiocciola non servirebbe a entrare.
    if (n.includes('@')) return 'Il nome non può contenere la @.'
    if (errorePerParole(n) || n.includes('*')) return 'Questo nome non si può usare.'
    if (!email.trim()) return 'Inserisci la tua email.'
    if (!pw) return 'Inserisci una password.'
    if (pw.length < 6) return 'La password deve avere almeno 6 caratteri.'
    if (pw !== pwConf) return 'Le password non coincidono.'
    return ''
  }

  const crea = async (e) => {
    e.preventDefault()
    if (creando) return
    const n = nome.trim()
    const errore = erroreCredenziali()
    if (errore) return setErrCrea(errore)
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
    // Del codice del proprio PT qui si può controllare solo la forma: chiedere
    // al database "di chi è" richiede una sessione, che ancora non c'è.
    if (ruolo !== 'pt' && codiceDelMioPt && !codiceValido(codiceDelMioPt)) {
      return setErrCrea(`Il codice del tuo PT deve avere almeno ${CODICE_MIN} caratteri.`)
    }
    if (!okTermini || !okSalute) {
      return setErrCrea('Per creare l’account servono tutti e due i consensi.')
    }
    setErrCrea('')
    setCreando(true)
    const esito = await creaUtente({
      email,
      password: pw,
      nome: n,
      ruolo,
      codicePt: codiceMio,
      codiceDelMioPt,
      dati,
    })
    setCreando(false)
    if (!esito.ok) return setErrCrea(esito.errore)
    // Il codice del PT, se c'era, lo usa AccountContext al primo accesso: un
    // eventuale problema lo mostra il profilo, col codice gia' scritto.
    if (esito.daConfermare) return vaiInAttesa(email.trim(), pw)
    navigate(routes.inizio())
  }

  const pwMismatch = pwConf.length > 0 && pw !== pwConf
  const atleta = ruolo !== 'pt'

  const avanti = () => {
    setErrCrea('')
    setPasso((p) => Math.min(p + 1, PASSI_CREA.length - 1))
  }
  const indietroCrea = () => {
    setErrCrea('')
    if (passo === 0) tornaAlBenvenuto()
    else setPasso((p) => p - 1)
  }
  // Nelle domande a scelta il tocco basta: si vede la spunta e si passa
  // alla domanda dopo. ⚠️ Solo se si è ancora sullo stesso passo: due tocchi
  // veloci non devono saltarne una.
  const scegliEAvanti = (fai) => {
    fai()
    const da = passo
    setTimeout(() => setPasso((p) => (p === da ? p + 1 : p)), 240)
  }
  const cambiaDati = (patch) => {
    setDati((d) => ({ ...d, ...patch }))
    setErrCrea('')
  }

  // Ogni domanda: titolo, perché la chiediamo, i campi, se si può andare
  // avanti (il controllo vero lo fa il submit, in fondo) e — per un PT, a cui i dati fisici non servono — cosa svuota
  // "Salta".
  const domanda = () => {
    switch (PASSI_CREA[passo]) {
      case 'credenziali':
        return {
          titolo: 'Crea il tuo account',
          testo: 'I tuoi allenamenti ti seguono su tutti i tuoi dispositivi.',
          pronto: !!(email.trim() && nome.trim() && pw && pwConf) && !pwMismatch,
          corpo: (
            <>
              <Campo
                id="email-utente"
                label="Email"
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
                aiuto="Serve per entrare e per rimettere la password se la dimentichi. Non la usiamo per altro."
              />
              <Campo
                id="nome-utente"
                label="Nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  setErrCrea('')
                }}
                placeholder="Come ti chiami?"
                maxLength={24}
                autoComplete="off"
                aiuto="È come ti vedranno i tuoi amici, e puoi usarlo per entrare al posto dell’email. Dev’essere solo tuo."
              />
              <Campo
                id="pw-utente"
                label="Password"
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value)
                  setErrCrea('')
                }}
                placeholder="Almeno 6 caratteri"
                autoComplete="new-password"
                autoCapitalize="none"
              />
              <Campo
                id="pw-conf"
                label="Conferma password"
                type="password"
                value={pwConf}
                onChange={(e) => {
                  setPwConf(e.target.value)
                  setErrCrea('')
                }}
                placeholder="Ripeti la password"
                autoComplete="new-password"
                autoCapitalize="none"
                errore={pwMismatch ? 'Le password non coincidono.' : ''}
              />
            </>
          ),
        }
      case 'ruolo':
        return {
          titolo: 'Come userai l’app?',
          testo: 'Puoi allenarti anche da PT: cambia solo cosa vedi in più.',
          pronto: true,
          corpo: (
            <Scelte
              voci={RUOLI}
              scelta={ruolo}
              onScegli={(id) => scegliEAvanti(() => cambiaRuolo(id))}
            />
          ),
        }
      case 'codice':
        return atleta
          ? {
              titolo: 'Ti segue un personal trainer?',
              testo:
                'Se usa l’app, scrivi il codice che ti ha dato: gli arriva una richiesta, e quando l’accetta gli allenamenti consigliati assomigliano ai suoi. Puoi farlo anche dopo, dal profilo.',
              pronto: !codiceDelMioPt || codiceValido(codiceDelMioPt),
              salta: () => setCodiceDelMioPt(''),
              corpo: (
                <Campo
                  id="codice-pt"
                  label="Codice del tuo PT"
                  className="input codice-input"
                  autoFocus
                  value={codiceDelMioPt}
                  onChange={(e) => {
                    setCodiceDelMioPt(normalizzaCodice(e.target.value))
                    setErrCrea('')
                  }}
                  placeholder="es. MARCO7K"
                  autoComplete="off"
                  autoCapitalize="characters"
                  errore={
                    codiceDelMioPt && !codiceValido(codiceDelMioPt)
                      ? `Almeno ${CODICE_MIN} caratteri.`
                      : ''
                  }
                />
              ),
            }
          : {
              titolo: 'Il tuo codice PT',
              testo:
                'È il codice che darai ai tuoi atleti: inserendolo si collegano a te. Lo ritrovi sempre nel tuo profilo.',
              pronto: codiceValido(codiceMio),
              corpo: (
                <div className="field">
                  <label htmlFor="codice-mio">Codice</label>
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      id="codice-mio"
                      className="input codice-input"
                      autoFocus
                      value={codiceMio}
                      onChange={(e) => setCodiceMio(normalizzaCodice(e.target.value))}
                      placeholder="es. MARCO7K"
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                    <button
                      type="button"
                      className="btn nowrap"
                      onClick={() => setCodiceMio(generaCodicePt(nome, utenti))}
                    >
                      Genera
                    </button>
                  </div>
                </div>
              ),
            }
      case 'sesso':
        return {
          titolo: 'Uomo o donna?',
          testo: atleta
            ? 'Serve a stimare il tuo metabolismo: da qui partono calorie e dieta.'
            : 'Facoltativo per un PT: serve solo se ti alleni anche tu.',
          pronto: !atleta || !!dati.sesso,
          salta: atleta ? null : () => cambiaDati({ sesso: '' }),
          corpo: (
            <Scelte
              voci={SESSI}
              scelta={dati.sesso}
              onScegli={(id) => scegliEAvanti(() => cambiaDati({ sesso: id }))}
            />
          ),
        }
      case 'misure': {
        const errori = Object.fromEntries(
          ['eta', 'peso', 'altezza'].map((k) => [k, erroreCampo(dati[k], k)]),
        )
        return {
          titolo: 'Età, peso e altezza',
          testo:
            'Le calorie che bruci allenandoti dipendono da quanto pesi. Li cambi quando vuoi dal profilo.',
          pronto: !fuoriScala && (!atleta || datiMancanti(dati).length === 0),
          salta: atleta ? null : () => cambiaDati({ eta: '', peso: '', altezza: '' }),
          corpo: (
            <div className="benv-misure">
              {[
                ['eta', 'Età', '24'],
                ['peso', 'Peso', '78'],
                ['altezza', 'Altezza', '180'],
              ].map(([k, label, esempio], i) => (
                <Campo
                  key={k}
                  id={'df-' + k}
                  label={label}
                  unita={LIMITI[k].unita}
                  autoFocus={i === 0}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={esempio}
                  value={dati[k]}
                  onChange={(e) => cambiaDati({ [k]: e.target.value })}
                  errore={errori[k]}
                />
              ))}
            </div>
          ),
        }
      }
      case 'movimento':
        return {
          titolo: 'Quanto ti muovi durante il giorno?',
          testo: 'Allenamenti esclusi: quelli li contiamo a parte.',
          pronto: true,
          corpo: (
            <Scelte
              voci={MOVIMENTI}
              scelta={dati.movimento}
              onScegli={(id) => scegliEAvanti(() => cambiaDati({ movimento: id }))}
            />
          ),
        }
      case 'obiettivo': {
        const kcal = kcalConsigliate(dati)
        return {
          titolo: 'Perché ti alleni?',
          testo:
            kcal != null
              ? `Per te sono circa ${kcal} kcal al giorno: una stima, non un consiglio medico.`
              : 'Da qui la dieta consigliata decide quanto mangiare.',
          pronto: true,
          corpo: (
            <Scelte
              voci={OBIETTIVI}
              scelta={dati.obiettivo}
              onScegli={(id) => scegliEAvanti(() => cambiaDati({ obiettivo: id }))}
            />
          ),
        }
      }
      case 'livello':
        return {
          titolo: 'Da quanto ti alleni?',
          testo:
            'Decide quali esercizi ti proponiamo e con quante serie. Puoi cambiarlo quando vuoi.',
          pronto: !livelloMancante,
          salta: atleta ? null : () => cambiaDati({ livello: '' }),
          corpo: (
            <Scelte
              voci={LIVELLI}
              scelta={dati.livello}
              onScegli={(id) => scegliEAvanti(() => cambiaDati({ livello: id }))}
            />
          ),
        }
      default:
        return {
          titolo: 'Ultima cosa',
          testo: 'Servono tutti e due per creare l’account.',
          pronto: okTermini && okSalute && !creando,
          bottone: creando ? 'Creazione…' : 'Crea account',
          corpo: (
            <CaselleConsenso
              termini={okTermini}
              salute={okSalute}
              onTermini={(v) => {
                setOkTermini(v)
                setErrCrea('')
              }}
              onSalute={(v) => {
                setOkSalute(v)
                setErrCrea('')
              }}
            />
          ),
        }
    }
  }

  let pannello = null

  if (schermata === 'accedi') {
    pannello = (
      <form key="accedi" className="benv-pannello" onSubmit={entra}>
        <h2 className="benv-domanda">Bentornato</h2>
        <Campo
          id="login-email"
          label="Email o nome utente"
          /* ⚠️ `type="text"`, non "email": un nome non è un indirizzo, e il
             campo "email" lo rifiuterebbe prima ancora di provarci. */
          type="text"
          autoFocus
          value={emailLogin}
          onChange={(e) => {
            setEmailLogin(e.target.value)
            setErrLogin('')
          }}
          placeholder="La tua email o il tuo nome"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Campo
          id="login-pw"
          label="Password"
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
        {errLogin && <p className="form-error">{errLogin}</p>}
        <button
          type="submit"
          className="btn btn-accent btn-lg btn-block"
          disabled={verificando || !emailLogin.trim() || !pwLogin}
        >
          {verificando ? 'Verifica…' : 'Entra'}
        </button>
        <div className="benv-link-riga">
          <button
            type="button"
            className="benv-link"
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
            className="benv-link"
            onClick={() => {
              setSchermata('crea')
              setPasso(0)
              setErrLogin('')
            }}
          >
            Crea un account
          </button>
        </div>
        <button type="button" className="benv-link" onClick={tornaAlBenvenuto}>
          Indietro
        </button>
      </form>
    )
  }

  if (schermata === 'recupero') {
    pannello = (
      <form key="recupero" className="benv-pannello" onSubmit={inviaRecupero}>
        <h2 className="benv-domanda">Password dimenticata</h2>
        <p className="benv-perche">
          {esitoRecupero === 'fatto'
            ? 'Se esiste un account con questa email, il link per rimettere la password è appena partito. Guarda anche nello spam.'
            : 'Capita. Ti mandiamo un link per sceglierne una nuova.'}
        </p>
        <Campo
          id="recupero-email"
          label="Email"
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
        <button type="button" className="benv-link" onClick={() => setSchermata('accedi')}>
          Torna all’accesso
        </button>
      </form>
    )
  }

  if (schermata === 'attesa') {
    pannello = (
      <div key="attesa" className="benv-pannello">
        <h2 className="benv-domanda">Controlla la posta</h2>
        <p className="benv-perche">
          Ti abbiamo mandato un link a <strong>{emailAttesa}</strong>. Aprilo per confermare che
          l’indirizzo è tuo: quando torni qui ti facciamo entrare in automatico. Non la trovi?
          Guarda anche nello spam.
        </p>
        {esitoAttesa === 'rimandata' && (
          <p className="benv-perche">
            Fatto: ti abbiamo mandato un link nuovo. Quello di prima non vale più.
          </p>
        )}
        {esitoAttesa && !['controllo', 'invio', 'rimandata'].includes(esitoAttesa) && (
          <p className="form-error">{esitoAttesa}</p>
        )}
        <button
          type="button"
          className="btn btn-accent btn-lg btn-block"
          disabled={esitoAttesa === 'controllo'}
          onClick={() => provaEntrare(false)}
        >
          {esitoAttesa === 'controllo' ? 'Controllo…' : 'Ho confermato, entra'}
        </button>
        <button
          type="button"
          className="benv-link"
          disabled={esitoAttesa === 'invio'}
          onClick={rimanda}
        >
          {esitoAttesa === 'invio' ? 'Invio…' : 'Non è arrivata? Rimandamela'}
        </button>
        <button type="button" className="benv-link" onClick={tornaAlBenvenuto}>
          Torna alla home
        </button>
      </div>
    )
  }

  if (schermata === 'crea') {
    const d = domanda()
    pannello = (
      <div className="benv-pannello">
        {/* La barra non si rimonta a ogni passo: così si allunga, non salta. */}
        <div
          className="benv-progresso"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={PASSI_CREA.length}
          aria-valuenow={passo + 1}
          aria-label={`Passo ${passo + 1} di ${PASSI_CREA.length}`}
        >
          <span style={{ width: ((passo + 1) / PASSI_CREA.length) * 100 + '%' }} />
        </div>
        {/* La `key` fa rientrare in scena ogni domanda (index.css, .benv-passo). */}
        <form
          key={PASSI_CREA[passo]}
          className="benv-passo"
          onSubmit={(e) => {
            if (PASSI_CREA[passo] === 'consensi') return crea(e)
            e.preventDefault()
            if (!d.pronto) return
            const errore = PASSI_CREA[passo] === 'credenziali' ? erroreCredenziali() : ''
            if (errore) setErrCrea(errore)
            else avanti()
          }}
        >
          <h2 className="benv-domanda">{d.titolo}</h2>
          <p className="benv-perche">{d.testo}</p>
          {d.corpo}
          {errCrea && <p className="form-error">{errCrea}</p>}
          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!d.pronto}>
            {d.bottone || 'Continua'}
          </button>
          {d.salta && (
            <button
              type="button"
              className="btn btn-lg btn-block"
              onClick={() => {
                d.salta()
                avanti()
              }}
            >
              Salta
            </button>
          )}
          <div className="benv-link-riga">
            <button type="button" className="benv-link" onClick={indietroCrea}>
              Indietro
            </button>
            {passo === 0 && (
              <button
                type="button"
                className="benv-link"
                onClick={() => {
                  setSchermata('accedi')
                  setErrCrea('')
                }}
              >
                Hai già un account?
              </button>
            )}
          </div>
        </form>
      </div>
    )
  }

  return (
    <Benvenuto
      pannello={pannello}
      onAccedi={() => setSchermata('accedi')}
      onCrea={() => {
        setPasso(0)
        setSchermata('crea')
      }}
    />
  )
}
