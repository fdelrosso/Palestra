import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { goBack, navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { isPt, prendiAvvisoPt } from '../lib/pt'
import PtPannello from '../components/PtPannello'
import PersoneBloccate from '../components/PersoneBloccate'
import SceltaColori from '../components/SceltaColori'
import { LinkLegali } from '../components/Legale'
import {
  IconChevron,
  IconClose,
  IconCoach,
  IconImage,
  IconLock,
  IconLogout,
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
// La voce "Personal trainer" non naviga: apre <PtPannello> (un modale), da dove
// un atleta inserisce il codice del suo PT e un PT rilegge il proprio.
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
  const { utenteCorrente, cambiaUtente, eliminaUtente, verificaPasswordAttuale, mioPt, impostaFoto } = account
  // La foto del profilo: '' | 'carico' | un messaggio d'errore.
  const [statoFoto, setStatoFoto] = useState('')
  const [bloccate, setBloccate] = useState(false)
  const [pannelloPt, setPannelloPt] = useState(false)
  // L'avviso lasciato dalla registrazione quando il codice del PT non è andato
  // a buon fine (lib/pt). Si legge una volta sola, e apre il pannello dove il
  // codice si riscrive: dirlo senza dare il posto dove rimediare non servirebbe.
  const [avvisoPt, setAvvisoPt] = useState(null)
  const [eliminaAperto, setEliminaAperto] = useState(false)
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
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?'
  const sonoPt = isPt(utenteCorrente)
  const sottotitoloPt = sonoPt
    ? 'Il tuo codice PT e chi ti segue'
    : mioPt
      ? `Ti segue ${mioPt.nome}`
      : 'Inserisci il codice del tuo PT'

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
          <label className="user-avatar lg avatar-cambia" aria-label="Cambia la foto del profilo">
            {utenteCorrente.foto ? <img src={utenteCorrente.foto} alt="" /> : iniziale}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={statoFoto === 'carico'}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setStatoFoto('carico')
                const esito = await impostaFoto(file)
                setStatoFoto(esito.ok ? '' : esito.errore)
              }}
            />
          </label>
          <div style={{ minWidth: 0 }}>
            <div className="profilo-nome">{nome}</div>
            {statoFoto && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                {statoFoto === 'carico' ? 'Carico la foto…' : statoFoto}
              </div>
            )}
            <div className="muted" style={{ fontSize: 13.5 }}>
              {sonoPt ? 'Personal trainer' : mioPt ? `Il tuo PT: ${mioPt.nome}` : 'Atleta'}
            </div>
          </div>
        </div>

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
              <span className="menu-voce-nome">{sonoPt ? 'I miei atleti' : 'Personal trainer'}</span>
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
                    <input
                      id="pw-elimina"
                      className="input"
                      type="password"
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
