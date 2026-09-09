import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import { statoAmicizia } from '../lib/relazioni'
import { isPt } from '../lib/pt'
import { dataLunga } from '../lib/format'
import ListaAllenamenti from '../components/ListaAllenamenti'
import InviaMediaEffimero from '../components/InviaMediaEffimero'
import {
  IconAmici,
  IconBack,
  IconCheck,
  IconChevron,
  IconClose,
  IconCoach,
  IconImage,
  IconSearch,
  IconShare,
} from '../components/icons'

// ---------------------------------------------------------------------------
// Amici: cerca una persona per NOME UTENTE e mandale la richiesta; lei deve
// accettare. Toccando un amico si vedono gli allenamenti che ha reso pubblici
// (e le schede pubbliche): quello che ha tenuto per sé non compare, né si
// capisce che esiste.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function AmiciPage() {
  const {
    utenti,
    utenteCorrente,
    relazioni,
    amici,
    richiesteAmicizia,
    inviaRichiestaAmicizia,
    rispondiRichiesta,
    annullaRichiesta,
    rimuoviAmico,
  } = useAccount()

  const [q, setQ] = useState('')
  const [aperto, setAperto] = useState(null) // amico di cui si guarda il profilo
  const [errore, setErrore] = useState('')

  const ql = q.trim().toLowerCase()
  // Ricerca per nome utente: solo con almeno un carattere, per non buttare
  // addosso l'elenco di tutti appena si apre la pagina.
  const risultati = useMemo(() => {
    if (!ql) return []
    return utenti
      .filter((u) => u.id !== utenteCorrente?.id && (u.nome || '').toLowerCase().includes(ql))
      .slice(0, 12)
  }, [utenti, utenteCorrente?.id, ql])

  if (aperto) {
    return <ProfiloAmico amico={aperto} onIndietro={() => setAperto(null)} />
  }

  const chiedi = (u) => {
    const esito = inviaRichiestaAmicizia(u.id)
    setErrore(esito.ok ? '' : esito.errore)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Amici</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        Cerca una persona per nome e mandale la richiesta: diventate amici quando accetta. Degli amici
        vedi gli allenamenti che hanno reso pubblici.
      </p>

      {/* Ricerca per nome utente */}
      <div className="search-box">
        <IconSearch width={17} height={17} className="faint" />
        <input
          className="search-input"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setErrore('')
          }}
          placeholder="Cerca per nome utente"
          autoCapitalize="none"
          autoComplete="off"
        />
        {q && (
          <button className="icon-btn" aria-label="Pulisci" onClick={() => setQ('')}>
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>
      {errore && <p className="form-error" style={{ marginTop: 8 }}>{errore}</p>}

      {ql && (
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {risultati.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
              Nessun utente con questo nome.
            </p>
          ) : (
            risultati.map((u) => {
              const stato = statoAmicizia(relazioni, utenteCorrente.id, u.id)
              return (
                <div className="user-card" key={u.id} style={{ padding: 10 }}>
                  <span className="user-avatar sm" aria-hidden="true">{iniziale(u.nome)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>
                    {u.nome}
                    {isPt(u) && <span className="badge badge-accent" style={{ marginLeft: 8 }}>PT</span>}
                  </span>
                  {stato === 'amici' ? (
                    <span className="badge badge-good">
                      <IconCheck width={13} height={13} /> Amici
                    </span>
                  ) : stato === 'inviata' ? (
                    <span className="badge">In attesa</span>
                  ) : stato === 'ricevuta' ? (
                    <span className="badge badge-accent">Ti ha scritto</span>
                  ) : (
                    <button className="btn btn-accent btn-sm nowrap" onClick={() => chiedi(u)}>
                      Aggiungi
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Richieste da accettare */}
      {richiesteAmicizia.ricevute.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>
            Richieste ricevute · {richiesteAmicizia.ricevute.length}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {richiesteAmicizia.ricevute.map(({ rel, utente }) => (
              <div className="card" key={rel.id} style={{ padding: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="user-avatar sm" aria-hidden="true">{iniziale(utente.nome)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{utente.nome}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      Vuole diventare tuo amico
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
      )}

      {/* Richieste che aspettano una risposta */}
      {richiesteAmicizia.inviate.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>Richieste inviate</div>
          <div className="stack" style={{ gap: 8 }}>
            {richiesteAmicizia.inviate.map(({ rel, utente }) => (
              <div className="user-card" key={rel.id} style={{ padding: 10 }}>
                <span className="user-avatar sm" aria-hidden="true">{iniziale(utente.nome)}</span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{utente.nome}</span>
                <button className="btn btn-ghost btn-sm nowrap" onClick={() => annullaRichiesta(rel.id)}>
                  Annulla
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Gli amici */}
      <div className="section-title" style={{ marginTop: 20 }}>
        {amici.length === 0 ? 'I tuoi amici' : `I tuoi amici · ${amici.length}`}
      </div>
      {amici.length === 0 ? (
        <div className="empty">
          <div className="big">👋</div>
          <p>
            Ancora nessun amico.
            <br />
            Cerca qualcuno qui sopra e mandagli la richiesta.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {amici.map((u) => (
            <div className="user-card" key={u.id}>
              <button className="user-card-main" onClick={() => setAperto(u)}>
                <span className="user-avatar" aria-hidden="true">{iniziale(u.nome)}</span>
                <span className="user-nome">{u.nome}</span>
                {isPt(u) && (
                  <span className="badge badge-accent">
                    <IconCoach width={13} height={13} /> PT
                  </span>
                )}
                <IconChevron className="faint" />
              </button>
              <button
                className="icon-btn"
                aria-label={`Togli ${u.nome} dagli amici`}
                onClick={() => {
                  if (window.confirm(`Togliere ${u.nome} dagli amici?`)) rimuoviAmico(u.id)
                }}
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Il profilo di un amico: i suoi allenamenti pubblici e le sue schede
// pubbliche. Quello che ha tenuto per sé qui non c'è e non si vede che c'è.
// --------------------------------------------------------------------------
function ProfiloAmico({ amico, onIndietro }) {
  const allenamenti = useMemo(() => allenamentiDiUtente(amico), [amico])
  const schede = useMemo(() => schedeDiUtente(amico), [amico])
  const [tab, setTab] = useState('allenamenti')
  const [inviaMedia, setInviaMedia] = useState(false)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="user-avatar sm" aria-hidden="true">{iniziale(amico.nome)}</span>
          <h1 style={{ fontSize: 18 }}>{amico.nome}</h1>
        </div>
      </div>

      {/* Mandargli qualcosa: la foto/video momentanea parte da qui, le schede
          e i recap dai posti dove stanno (scheda, calendario, fine allenamento). */}
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button className="btn grow" onClick={() => setInviaMedia(true)}>
          <IconImage width={16} height={16} /> Manda foto o video
        </button>
        <button className="btn grow" onClick={() => navigate(routes.condivisi())}>
          <IconShare width={16} height={16} /> Condivisi
        </button>
      </div>
      {inviaMedia && (
        <InviaMediaEffimero amicoIniziale={amico.id} onChiudi={() => setInviaMedia(false)} />
      )}

      <div className="segmented" style={{ margin: '4px 0 14px' }}>
        <button
          className={'seg-btn' + (tab === 'allenamenti' ? ' on' : '')}
          onClick={() => setTab('allenamenti')}
          aria-pressed={tab === 'allenamenti'}
        >
          Allenamenti · {allenamenti.length}
        </button>
        <button
          className={'seg-btn' + (tab === 'schede' ? ' on' : '')}
          onClick={() => setTab('schede')}
          aria-pressed={tab === 'schede'}
        >
          Schede · {schede.length}
        </button>
      </div>

      {tab === 'allenamenti' ? (
        <ListaAllenamenti
          voci={allenamenti}
          mostraUtente={false}
          vuoto={`${amico.nome} non ha ancora reso pubblico nessun allenamento.`}
        />
      ) : schede.length === 0 ? (
        <div className="empty">
          <div className="big">📚</div>
          <p>{amico.nome} non ha ancora reso pubblica nessuna scheda.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {schede.map((s) => (
            <div className="card" key={s.id}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.nome}</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Creata il {dataLunga(s.creataIl)}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-accent">
                  {s.giorni.filter((g) => g.tipo === 'workout').length} allenamenti/sett.
                </span>
                <span className="badge">{s.numeroSettimane} settimane</span>
              </div>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12.5, margin: '2px 2px', lineHeight: 1.4 }}>
            <IconAmici width={13} height={13} /> Per vedere gli esercizi di una scheda apri Schede
            Generali dal menu: lì ci sono tutte quelle pubbliche, con la ricerca.
          </p>
        </div>
      )}
    </div>
  )
}
