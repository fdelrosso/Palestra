import { useAccount } from '../store/AccountContext'
import { isPt } from '../lib/pt'

// ---------------------------------------------------------------------------
// Le richieste di lavoro che un PT deve accettare: qualcuno ha inserito il suo
// codice e aspetta. Finché non accetta, quella persona non è un suo atleta e
// lui non ne vede nulla.
//
// Sta in un componente perché compare in due punti — nel pannello del profilo
// (dove il PT va a riprendersi il codice) e nella sezione Lavoro — e deve
// comportarsi allo stesso modo in entrambi.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function RichiesteLavoro({ compatto = false }) {
  const { utenteCorrente, richiesteLavoro, rispondiRichiesta } = useAccount()
  if (!isPt(utenteCorrente)) return null

  const ricevute = richiesteLavoro.ricevute
  if (ricevute.length === 0) return null

  return (
    <>
      <div className="section-title" style={{ marginTop: compatto ? 14 : 4 }}>
        Richieste di lavoro · {ricevute.length}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {ricevute.map(({ rel, utente }) => (
          <div className="card" key={rel.id} style={{ padding: 12 }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="user-avatar sm" aria-hidden="true">{iniziale(utente.nome)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{utente.nome}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  Ha inserito il tuo codice: vuole che lo segua tu
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => rispondiRichiesta(rel.id, false)}>
                Rifiuta
              </button>
              <button
                className="btn btn-accent btn-sm"
                style={{ flex: 1 }}
                onClick={() => rispondiRichiesta(rel.id, true)}
              >
                Accetta
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
