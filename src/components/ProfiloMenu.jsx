import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { isPt, prendiAvvisoPt } from '../lib/pt'
import PtPannello from './PtPannello'
import {
  IconApple,
  IconChevron,
  IconClose,
  IconCoach,
  IconDumbbell,
  IconLogout,
  IconShare,
  IconTrash,
  IconUtente,
} from './icons'

// Bottone del profilo, in alto a sinistra nella topbar della pagina iniziale.
// Mostra l'utente attivo; toccandolo si apre un pannello da sinistra con le
// sezioni personali ("Le mie schede", "Dieta", "Condivisi", "Personal trainer")
// e i tasti per disconnettersi ed eliminare il profilo. Le funzionalità
// trasversali restano nel menu laterale destro (MenuLaterale).
//
// La voce "Personal trainer" non naviga: apre <PtPannello> (un modale), da dove
// un atleta inserisce il codice del suo PT e un PT rilegge il proprio.
//
// La prima voce, "I miei dati", è il posto dove si cambiano peso, età, altezza
// e obiettivo: sono sul PROFILO e non sulla dieta, perché servono anche alle
// calorie del recap. Chi cambia peso lo cambia una volta e vale ovunque.
//
// L'ELIMINAZIONE del profilo sta qui, e non più nella schermata "Chi sei?":
// da quando l'app non mostra l'elenco degli account, l'unico posto dove si può
// cancellare il proprio è da dentro, dopo essere entrati. La password si chiede
// lo stesso — è l'azione più irreversibile dell'app.
const VOCI = [
  {
    id: 'dati',
    nome: 'I miei dati',
    descrizione: 'Peso, obiettivo e livello: da qui calorie, dieta e allenamenti',
    Icona: IconUtente,
    vai: () => navigate(routes.datiFisici()),
  },
  {
    id: 'home',
    nome: 'Le mie schede',
    descrizione: 'Le schede del tuo profilo, con nuova scheda',
    Icona: IconDumbbell,
    vai: () => navigate(routes.home()),
  },
  {
    id: 'dieta',
    nome: 'Dieta',
    descrizione: 'Dieta settimanale: giorni di allenamento e di riposo',
    Icona: IconApple,
    vai: () => navigate(routes.dieta()),
  },
  {
    id: 'condivisi',
    nome: 'Condivisi',
    descrizione: 'Quello che gli amici ti mandano: schede, recap, foto',
    Icona: IconShare,
    vai: () => navigate(routes.condivisi()),
    daFare: (acc) => acc.condivisioni.daVedere + acc.effimeri.ricevuti.length,
  },
]

export default function ProfiloMenu() {
  const account = useAccount()
  const { utenteCorrente, cambiaUtente, eliminaUtente, verificaPasswordAttuale, mioPt } = account
  const [aperto, setAperto] = useState(false)
  const [pannelloPt, setPannelloPt] = useState(false)
  // L'avviso lasciato dalla registrazione quando il codice del PT non è andato
  // a buon fine (lib/pt). Si legge una volta sola, e apre il pannello dove il
  // codice si riscrive: dirlo senza dare il posto dove rimediare non servirebbe.
  const [avvisoPt, setAvvisoPt] = useState(null)
  const [eliminaAperto, setEliminaAperto] = useState(false)
  const [pwDelete, setPwDelete] = useState('')
  const [errDelete, setErrDelete] = useState('')
  const [eliminando, setEliminando] = useState(false)

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

  // Chiude con ESC.
  useEffect(() => {
    if (!aperto) return
    const onKey = (e) => e.key === 'Escape' && setAperto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto])

  if (!utenteCorrente) return null

  const nome = utenteCorrente.nome || '?'
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?'
  const sonoPt = isPt(utenteCorrente)
  const sottotitoloPt = sonoPt
    ? 'Il tuo codice PT e chi ti segue'
    : mioPt
      ? `Ti segue ${mioPt.nome}`
      : 'Inserisci il codice del tuo PT'

  const apriVoce = (voce) => {
    setAperto(false)
    voce.vai()
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

  // Il pallino sull'avatar: le cose che aspettano una risposta o uno sguardo.
  const daFareTotale = VOCI.reduce((n, v) => n + (v.daFare ? v.daFare(account) : 0), 0)

  return (
    <>
      <button
        className="profilo-btn"
        aria-label={`Profilo di ${nome}`}
        aria-expanded={aperto}
        onClick={() => setAperto(true)}
      >
        <span className="user-avatar sm" aria-hidden="true">
          {iniziale}
        </span>
        {daFareTotale > 0 && <span className="pallino-notifica handle" aria-hidden="true" />}
      </button>

      {aperto && createPortal(
        <div className="drawer-backdrop sinistra" onClick={() => setAperto(false)}>
          <div
            className="drawer sinistra"
            role="dialog"
            aria-label="Profilo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="drawer-title">{nome}</div>
                <div className="drawer-sub">
                  {sonoPt ? 'Personal trainer' : mioPt ? `Il tuo PT: ${mioPt.nome}` : 'Il tuo profilo'}
                </div>
              </div>
              <button className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
                <IconClose />
              </button>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              {VOCI.map((v) => (
                <button key={v.id} className="menu-voce" onClick={() => apriVoce(v)}>
                  <span className="menu-voce-icona" aria-hidden="true">
                    <v.Icona width={20} height={20} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="menu-voce-nome">{v.nome}</span>
                    <span className="menu-voce-desc">{v.descrizione}</span>
                  </span>
                  {v.daFare && v.daFare(account) > 0 && (
                    <span className="pallino-notifica">{v.daFare(account)}</span>
                  )}
                  <IconChevron className="faint" />
                </button>
              ))}

              <button
                className="menu-voce"
                onClick={() => {
                  setAperto(false)
                  setPannelloPt(true)
                }}
              >
                <span className="menu-voce-icona" aria-hidden="true">
                  <IconCoach width={20} height={20} />
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="menu-voce-nome">
                    {sonoPt ? 'I miei atleti' : 'Personal trainer'}
                  </span>
                  <span className="menu-voce-desc">{sottotitoloPt}</span>
                </span>
                <IconChevron className="faint" />
              </button>

              <button
                className="menu-voce pericolo"
                onClick={() => {
                  setAperto(false)
                  cambiaUtente()
                }}
              >
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
                  setAperto(false)
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
          </div>
        </div>,
        document.body,
      )}

      {pannelloPt && (
        <PtPannello
          avviso={avvisoPt}
          onChiudi={() => {
            setPannelloPt(false)
            setAvvisoPt(null)
          }}
        />
      )}

      {eliminaAperto && createPortal(
        <div className="modal-backdrop" onClick={() => setEliminaAperto(false)}>
          <div
            className="modal"
            role="dialog"
            aria-label="Elimina profilo"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 4 }}>Eliminare il profilo {nome}?</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
              Spariscono schede, diete e preferenze di questo profilo. Gli allenamenti già svolti
              restano nello Storico senza il tuo profilo. L’azione non è reversibile.
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
    </>
  )
}
