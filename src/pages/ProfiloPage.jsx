import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { goBack, navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { generaCodicePt, isPt, prendiAvvisoPt } from '../lib/pt'
import useModalitaPt from '../hooks/useModalitaPt'
import PtPannello from '../components/PtPannello'
import InputPassword from '../components/InputPassword'
import PersoneBloccate from '../components/PersoneBloccate'
import SceltaColori from '../components/SceltaColori'
import SegnalaProblema from '../components/SegnalaProblema'
import { CambiaFoto } from '../components/RitagliaFoto'
import { LinkLegali } from '../components/Legale'
import {
  IconChevron,
  IconClose,
  IconCoach,
  IconImage,
  IconLock,
  IconLogout,
  IconSegnala,
  IconTrash,
  IconUtente,
} from '../components/icons'

// ---------------------------------------------------------------------------
// Il Profilo: si apre dall'avatar in cima alla Home.
//
// Fino alla 39ª era un pannello a comparsa da sinistra, e i colori stavano in
// un ALTRO pannello, da destra. Adesso è una finestra sola con tutto quello che
// riguarda la persona e non l'allenamento: i dati, le foto del fisico, il PT,
// l'aspetto dell'app e l'account.
//
// È una FINESTRA DI VETRO che sale dal basso sopra la Home (App la monta sopra
// InizioPage): la Home si vede dietro, sfocata, e si capisce che il profilo è
// una cosa che si apre e si chiude, non un posto dove si va. Ha comunque il
// suo indirizzo (/profilo): il tasto indietro del telefono la chiude, e le
// voci (I miei dati, Foto) portano a pagine vere da cui si torna qui.
// Si chiude con la ✕, toccando fuori o con Esc.
//
// Il PT, da qui, si accende e si spegne soltanto:
//   - un atleta → sotto la testata "Attiva account PT": il profilo diventa PT
//                 con un codice generato (il codice si legge poi in Social →
//                 Profilo, sotto quello amico);
//   - un PT     → fra le voci dell'Account, in rosso come "Disconnetti",
//                 "Disattiva modalità PT": apre una conferma (non è istantanea),
//                 poi torna solo atleta e i suoi atleti vengono staccati.
// Fra modalità PT e atleta si passa dall'interruttore Personale | Lavoro in
// cima alla Home (components/ModoPtSwitch), non da qui.
//
// La voce "Personal trainer" non naviga: apre <PtPannello> (un modale), da dove
// si inserisce il codice del PROPRIO PT. C'è per tutti: anche un PT si allena
// e può farsi seguire.
//
// "I miei dati" è il posto dove si cambiano peso, età, altezza e obiettivo:
// sono sul PROFILO e non sulla dieta, perché servono anche alle calorie del
// recap. Chi cambia peso lo cambia una volta e vale ovunque.
//
// L'ELIMINAZIONE del profilo sta qui: da quando l'app non mostra l'elenco
// degli account, l'unico posto dove si può cancellare il proprio è da dentro.
// La password si chiede lo stesso — è l'azione più irreversibile dell'app.
// ---------------------------------------------------------------------------
const VOCI = [
  {
    id: 'dati',
    nome: 'I miei dati',
    descrizione: 'Peso, obiettivo e livello: da qui calorie, dieta e allenamenti',
    Icona: IconUtente,
    vai: () => navigate(routes.datiFisici()),
  },
  {
    id: 'foto',
    nome: 'Foto progressi',
    descrizione: 'Il check del fisico, e cosa ne vede il tuo personal trainer',
    Icona: IconImage,
    vai: () => navigate(routes.foto()),
  },
]

export default function ProfiloPage() {
  const account = useAccount()
  const {
    utenteCorrente,
    utenti,
    cambiaUtente,
    eliminaUtente,
    verificaPasswordAttuale,
    mioPt,
    diventaPt,
    smettiPt,
    mieiAtleti,
  } = account
  const { modoPt, passaA } = useModalitaPt()
  // Attivazione e disattivazione dell'account PT: '' | 'in-corso' | un errore.
  const [attivazione, setAttivazione] = useState('')
  // La foto del profilo: '' | 'carico' | un messaggio d'errore.
  const [statoFoto, setStatoFoto] = useState('')
  const [bloccate, setBloccate] = useState(false)
  const [segnala, setSegnala] = useState(false)
  const [pannelloPt, setPannelloPt] = useState(false)
  // L'avviso lasciato dalla registrazione quando il codice del PT non è andato
  // a buon fine (lib/pt). Si legge una volta sola, e apre il pannello dove il
  // codice si riscrive: dirlo senza dare il posto dove rimediare non servirebbe.
  const [avvisoPt, setAvvisoPt] = useState(null)
  const [eliminaAperto, setEliminaAperto] = useState(false)
  const [disattivaAperto, setDisattivaAperto] = useState(false)
  const [pwDelete, setPwDelete] = useState('')
  const [errDelete, setErrDelete] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const finestra = useRef(null)

  // Esc chiude, e il fuoco entra nella finestra (chi usa la tastiera ci si
  // ritrova dentro, non dietro sulla Home). La pagina sotto non scorre.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) goBack()
    }
    window.addEventListener('keydown', onKey)
    finestra.current?.focus()
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prima
    }
  }, [])

  // ⚠️ Sta in un effetto, e non in un valore iniziale, perché LEGGERE consuma:
  // farlo durante il render vorrebbe dire farlo due volte (React in sviluppo
  // rende due volte) e perdere l'avviso. Va bene che sia un setState in un
  // effetto — è esattamente un dato che arriva da fuori React.
  useEffect(() => {
    const a = prendiAvvisoPt()
    if (!a) return
    // oxlint-disable-next-line react/set-state-in-effect
    setAvvisoPt(a)
    setPannelloPt(true)
  }, [])

  if (!utenteCorrente) return null

  const nome = utenteCorrente.nome || '?'
  const sonoPt = isPt(utenteCorrente)
  const sottotitoloPt = mioPt
      ? `Ti segue ${mioPt.nome}`
      : 'Inserisci il codice del tuo PT'

  // Il codice è generato qui e si cambia poi dal pannello "I miei atleti". Se
  // il database lo trova già preso (è unico) se ne prova un altro.
  const attivaPt = async () => {
    const domanda = mioPt
      ? `Attivare l'account PT? Smetterai di farti seguire da ${mioPt.nome}: da PT non si ha un PT.`
      : "Attivare l'account PT? Riceverai un codice da dare ai tuoi atleti."
    if (!window.confirm(domanda)) return
    setAttivazione('in-corso')
    let esito = null
    for (let tentativo = 0; tentativo < 3; tentativo += 1) {
      esito = await diventaPt(generaCodicePt(nome, utenti))
      if (esito.ok || !/già usato/.test(esito.errore || '')) break
    }
    setAttivazione(esito?.ok ? '' : esito?.errore || "Non sono riuscito ad attivare l'account PT. Riprova.")
  }

  // Si arriva qui solo dal tasto della finestra di conferma.
  const disattivaPt = async () => {
    setAttivazione('in-corso')
    const esito = await smettiPt()
    if (esito.ok) {
      // Riattivandolo un giorno si riparte dall'app di sempre, non da Lavoro.
      passaA('atleta')
      setAttivazione('')
      setDisattivaAperto(false)
    } else {
      setAttivazione(esito.errore || 'Non sono riuscito a disattivare la modalità PT. Riprova.')
    }
  }

  // ⚠️ La password si ricontrolla contro SUPABASE, non contro un hash tenuto
  // qui: da quando gli account sono veri, la password non e' piu' un campo del
  // profilo. Controllarla in locale, oggi, vorrebbe dire non controllarla.
  const confermaElimina = async (e) => {
    e.preventDefault()
    if (eliminando) return
    setEliminando(true)
    setErrDelete('')
    const controllo = await verificaPasswordAttuale(pwDelete)
    if (!controllo.ok) {
      setEliminando(false)
      setErrDelete(controllo.errore || 'Password errata. Riprova.')
      setPwDelete('')
      return
    }
    // Elimina e torna alla schermata di benvenuto (utenteCorrente sparisce).
    // Se il server rifiuta o la rete cade, l'account resta: lo si dice invece
    // di chiudere il modale come se fosse andata.
    const esito = await eliminaUtente()
    if (!esito?.ok) {
      setEliminando(false)
      setErrDelete(esito?.errore || 'Non sono riuscito a eliminare il profilo. Riprova.')
    }
  }

  return (
    <div className="profilo-velo" onClick={goBack}>
      <div
        className="profilo-finestra"
        role="dialog"
        aria-modal="true"
        aria-label="Profilo"
        tabIndex={-1}
        ref={finestra}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profilo-maniglia" aria-hidden="true" />
        <div className="profilo-finestra-testa">
          <h1>Profilo</h1>
          <button className="icon-btn" onClick={goBack} aria-label="Chiudi il profilo">
            <IconClose />
          </button>
        </div>

        <div className="profilo-testa">
          <CambiaFoto onStato={setStatoFoto} />
          <div style={{ minWidth: 0 }}>
            <div className="profilo-nome">{nome}</div>
            {statoFoto && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                {statoFoto === 'carico' ? 'Carico la foto…' : statoFoto}
              </div>
            )}
            <div className="muted" style={{ fontSize: 13.5 }}>
              {sonoPt
                ? modoPt
                  ? 'Personal trainer · modalità PT'
                  : 'Personal trainer · modalità atleta'
                : mioPt
                  ? `Il tuo PT: ${mioPt.nome}`
                  : 'Atleta'}
            </div>
          </div>
        </div>

        {!sonoPt && (
          <>
            <button
              className="btn btn-accent btn-block"
              onClick={attivaPt}
              disabled={attivazione === 'in-corso'}
            >
              <IconCoach width={18} height={18} />
              {attivazione === 'in-corso' ? "Attivo l'account PT…" : 'Attiva account PT'}
            </button>
            {attivazione && attivazione !== 'in-corso' && <p className="form-error">{attivazione}</p>}
          </>
        )}

        <div className="section-title">Tu</div>
        <div className="stack" style={{ gap: 8 }}>
          {VOCI.map((v) => (
            <button key={v.id} className="menu-voce" onClick={v.vai}>
              <span className="menu-voce-icona" aria-hidden="true">
                <v.Icona width={20} height={20} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="menu-voce-nome">{v.nome}</span>
                <span className="menu-voce-desc">{v.descrizione}</span>
              </span>
              <IconChevron className="faint" />
            </button>
          ))}

          <button className="menu-voce" onClick={() => setPannelloPt(true)}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconCoach width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Personal trainer</span>
              <span className="menu-voce-desc">{sottotitoloPt}</span>
            </span>
            <IconChevron className="faint" />
          </button>
        </div>

        {/* Non e' una sezione dove andare: e' un'impostazione, quindi sta qui
            aperta e non dietro una voce con la freccia. */}
        <div className="section-title">Aspetto</div>
        <div className="card">
          <SceltaColori />
        </div>

        {/* La stessa finestra del tasto in testata (components/TestataApp): qui
            la cerca chi non l'ha visto lassu'. */}
        <div className="section-title">Aiuto</div>
        <div className="stack" style={{ gap: 8 }}>
          <button className="menu-voce" onClick={() => setSegnala(true)}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconSegnala width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Segnala un problema</span>
              <span className="menu-voce-desc">Qualcosa non va, o un'idea per migliorare l'app</span>
            </span>
            <IconChevron className="faint" />
          </button>
          {segnala && <SegnalaProblema onChiudi={() => setSegnala(false)} />}
        </div>

        <div className="section-title">Account</div>
        <div className="stack" style={{ gap: 8 }}>
          <button className="menu-voce" onClick={() => setBloccate(true)}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconLock width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Persone bloccate</span>
              <span className="menu-voce-desc">Chi hai bloccato, e dove sbloccarlo</span>
            </span>
            <IconChevron className="faint" />
          </button>
          {bloccate && <PersoneBloccate onChiudi={() => setBloccate(false)} />}
          <button className="menu-voce pericolo" onClick={cambiaUtente}>
            <span className="menu-voce-icona" aria-hidden="true">
              <IconLogout width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Disconnetti</span>
              <span className="menu-voce-desc">Esci dal profilo e torna al benvenuto</span>
            </span>
          </button>

          {sonoPt && (
            <button
              className="menu-voce pericolo"
              onClick={() => {
                setAttivazione('')
                setDisattivaAperto(true)
              }}
            >
              <span className="menu-voce-icona" aria-hidden="true">
                <IconCoach width={20} height={20} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="menu-voce-nome">Disattiva modalità PT</span>
                <span className="menu-voce-desc">Torni solo atleta: il codice PT non vale più</span>
              </span>
            </button>
          )}

          <button
            className="menu-voce pericolo"
            onClick={() => {
              setPwDelete('')
              setErrDelete(false)
              setEliminaAperto(true)
            }}
          >
            <span className="menu-voce-icona" aria-hidden="true">
              <IconTrash width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">Elimina profilo</span>
              <span className="menu-voce-desc">Cancella account e dati. Non si torna indietro</span>
            </span>
          </button>
        </div>

        <LinkLegali />

        {pannelloPt && (
          <PtPannello
            avviso={avvisoPt}
            onChiudi={() => {
              setPannelloPt(false)
              setAvvisoPt(null)
            }}
          />
        )}

        {disattivaAperto &&
          createPortal(
            <div className="modal-backdrop" onClick={() => setDisattivaAperto(false)}>
              <div
                className="modal"
                role="dialog"
                aria-label="Disattiva modalità PT"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginBottom: 4 }}>Disattivare la modalità PT?</h3>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  Torni solo atleta e il tuo codice PT{' '}
                  {utenteCorrente.codicePt && <strong>{utenteCorrente.codicePt}</strong>} non vale più.
                  {mieiAtleti.length > 0 &&
                    (mieiAtleti.length === 1
                      ? ` ${mieiAtleti[0].nome} non ti avrà più come PT.`
                      : ` I tuoi ${mieiAtleti.length} atleti non ti avranno più come PT.`)}{' '}
                  Le tue schede, i tuoi allenamenti e il tuo PT, se ne hai uno, restano come sono.
                </p>

                {attivazione && attivazione !== 'in-corso' && (
                  <p className="form-error" style={{ marginTop: 10 }}>{attivazione}</p>
                )}

                <div className="row" style={{ gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setDisattivaAperto(false)}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    disabled={attivazione === 'in-corso'}
                    onClick={disattivaPt}
                  >
                    {attivazione === 'in-corso' ? 'Disattivo…' : 'Disattiva modalità PT'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {eliminaAperto &&
          createPortal(
            <div className="modal-backdrop" onClick={() => setEliminaAperto(false)}>
              <div
                className="modal"
                role="dialog"
                aria-label="Elimina profilo"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginBottom: 4 }}>Eliminare il profilo {nome}?</h3>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  Spariscono schede, diete e preferenze di questo profilo. Gli allenamenti già svolti restano
                  nello Storico senza il tuo profilo. L’azione non è reversibile.
                </p>

                <form onSubmit={confermaElimina} style={{ marginTop: 12 }}>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor="pw-elimina">Password</label>
                    <InputPassword
                      id="pw-elimina"
                      autoFocus
                      value={pwDelete}
                      onChange={(e) => {
                        setPwDelete(e.target.value)
                        setErrDelete('')
                      }}
                      placeholder="Conferma con la tua password"
                      autoComplete="current-password"
                      autoCapitalize="none"
                    />
                  </div>

                  {errDelete && <p className="form-error">{errDelete}</p>}

                  <div className="row" style={{ gap: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEliminaAperto(false)}>
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                      disabled={eliminando || !pwDelete}
                    >
                      {eliminando ? 'Eliminazione…' : 'Elimina profilo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}
