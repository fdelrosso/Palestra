import { useState } from 'react'
import { formatSec } from '../lib/parseRecupero'
import { dataLunga, dataOra } from '../lib/format'
import { VISIBILITA, visibilitaDi } from '../lib/visibilita'
import RiepilogoDettaglio from './RiepilogoDettaglio'
import { IconClock, IconCoach, IconLock } from './icons'

// ---------------------------------------------------------------------------
// Lista di allenamenti svolti + recap in bottom-sheet al tocco.
//
// È la stessa vista in quattro posti — Storico Allenamenti, gli allenamenti di
// un amico, quelli dei propri atleti (Lavoro) e quelli del singolo atleta —
// quindi sta qui una volta sola. `mostraUtente` serve dove le voci sono di
// persone diverse (Storico, Lavoro); nelle pagine di UNA persona sola il nome
// è già nel titolo e ripeterlo su ogni card è rumore.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

// Badge di visibilità: compare solo quando NON è pubblico, così sui propri
// allenamenti si vede a colpo d'occhio cosa si è deciso di non mostrare.
function BadgeVisibilita({ voce }) {
  const v = visibilitaDi(voce)
  if (v === VISIBILITA.SOLO_PT) {
    return (
      <span className="badge" title="Lo vede solo il tuo PT">
        <IconCoach width={12} height={12} />
        Solo PT
      </span>
    )
  }
  if (v === VISIBILITA.NASCOSTA) {
    return (
      <span className="badge" title="Non lo vede nessuno">
        <IconLock width={12} height={12} />
        Nascosto
      </span>
    )
  }
  return null
}

export default function ListaAllenamenti({ voci, mostraUtente = true, mostraVisibilita = false, vuoto }) {
  const [aperto, setAperto] = useState(null)

  if (!voci || voci.length === 0) {
    return (
      <div className="empty">
        <div className="big">🗒️</div>
        <p>{vuoto || 'Ancora nessun allenamento.'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="stack" style={{ marginTop: 2 }}>
        {voci.map((v, i) => (
          <button key={`${v.utenteId}-${v.data}-${i}`} className="storico-card" onClick={() => setAperto(v)}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                {mostraUtente && (
                  <span className="user-avatar sm" aria-hidden="true">
                    {iniziale(v.utenteNome)}
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  {mostraUtente && (
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{v.utenteNome}</div>
                  )}
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>
                    {dataOra(v.data)}
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 6, flex: '0 0 auto' }}>
                {mostraVisibilita && <BadgeVisibilita voce={v} />}
                {v.durataSec != null && (
                  <span className="badge">
                    <IconClock width={13} height={13} /> {formatSec(v.durataSec)}
                  </span>
                )}
              </div>
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />

            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{v.nomeGiorno}</div>
                <div
                  className="muted nowrap"
                  style={{ fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {v.nomeScheda}
                </div>
              </div>
              {v.settimana != null && <span className="badge badge-accent">Sett. {v.settimana}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Recap dell'allenamento selezionato */}
      {aperto && (
        <div className="modal-backdrop" onClick={() => setAperto(null)}>
          <div
            className="modal"
            role="dialog"
            aria-label="Recap allenamento"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}
            >
              <div style={{ minWidth: 0 }}>
                <h3 style={{ marginBottom: 2 }}>{aperto.utenteNome}</h3>
                <div className="muted" style={{ fontSize: 13 }}>{dataLunga(aperto.data)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAperto(null)}>
                Chiudi
              </button>
            </div>

            <div className="cal-recap-scheda" style={{ marginTop: 10 }}>{aperto.nomeScheda}</div>
            {aperto.dettagliato ? (
              <RiepilogoDettaglio riep={aperto} />
            ) : (
              <div className="card">
                <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{aperto.nomeGiorno}</div>
                  {aperto.settimana != null && (
                    <span className="badge">Settimana {aperto.settimana}</span>
                  )}
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.4 }}>
                  Segnato come completato manualmente — nessun dettaglio delle serie registrato.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
