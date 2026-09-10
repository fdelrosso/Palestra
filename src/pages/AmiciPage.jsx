import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import useCollettivo from '../hooks/useCollettivo'
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
    utenteCorrente,
    relazioni,
    amici,
    richiesteAmicizia,
    inviaRichiestaAmicizia,
    cercaPersona,
    amiciSuggeriti,
    rispondiRichiesta,
    annullaRichiesta,
    rimuoviAmico,
  } = useAccount()

  const [q, setQ] = useState('')
  const [aperto, setAperto] = useState(null) // amico di cui si guarda il profilo
  const [errore, setErrore] = useState('')
  const [risposta, setRisposta] = useState({ per: '', lista: [] })
  const [suggeriti, setSuggeriti] = useState([])
  const [codiceCopiato, setCodiceCopiato] = useState(false)

  const ql = q.trim()
  // "Sto cercando" non è uno stato da tenere allineato: è semplicemente il non
  // avere ancora la risposta per QUESTA chiave.
  const cercando = ql.length >= 3 && risposta.per !== ql
  const risultati = risposta.per === ql ? risposta.lista : []

  // ⚠️ LA RICERCA LA FA IL SERVER, e solo su CODICE o NOME ESATTO. Prima
  // filtrava la lista locale dei profili con `includes`: scrivere "mar" e
  // vedere tutti i Marco significava che chiunque si registrasse poteva
  // ricavarsi l'elenco di chi usa l'app, tre lettere alla volta. Adesso quella
  // lista in locale non esiste nemmeno — il database non la lascia leggere.
  useEffect(() => {
    if (ql.length < 3) return undefined
    let vivo = true
    // Mezzo secondo di pausa: si cerca quando uno ha finito di scrivere, non a
    // ogni lettera.
    const t = setTimeout(async () => {
      const trovati = await cercaPersona(ql)
      if (!vivo) return
      setRisposta({ per: ql, lista: trovati })
    }, 500)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [ql, cercaPersona])

  // I suggeriti si chiedono all'apertura e dopo ogni cambiamento nelle
  // amicizie: accettare qualcuno cambia chi ha senso proporre.
  useEffect(() => {
    let vivo = true
    amiciSuggeriti(8).then((lista) => {
      if (vivo) setSuggeriti(lista)
    })
    return () => {
      vivo = false
    }
  }, [amiciSuggeriti, relazioni])

  if (aperto) {
    return <ProfiloAmico amico={aperto} onIndietro={() => setAperto(null)} />
  }

  const chiedi = async (u) => {
    const esito = await inviaRichiestaAmicizia(u.id)
    setErrore(esito.ok ? '' : esito.errore)
    if (esito.ok) {
      // Chi ha appena ricevuto la richiesta non va più proposto né cercato.
      setSuggeriti((prev) => prev.filter((x) => x.id !== u.id))
      setRisposta((r) => ({ ...r, lista: r.lista.filter((x) => x.id !== u.id) }))
    }
  }

  const copiaCodice = async () => {
    try {
      await navigator.clipboard.writeText(utenteCorrente?.codiceAmico || '')
      setCodiceCopiato(true)
      setTimeout(() => setCodiceCopiato(false), 2000)
    } catch {
      // Su iOS senza gesto diretto la copia può essere negata: il codice resta
      // scritto a schermo, si seleziona a mano.
      setCodiceCopiato(false)
    }
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
        Mandale la richiesta: diventate amici quando accetta, e da lì vedi gli allenamenti che ha
        reso pubblici.
      </p>

      {/* Il proprio codice: è il modo che non richiede di sapere come si scrive
          il nome di uno, e l'unico che funziona con due omonimi. */}
      {utenteCorrente?.codiceAmico && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Il tuo codice</div>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
            <span className="codice-grande">{utenteCorrente.codiceAmico}</span>
            <button className="btn btn-sm nowrap" onClick={copiaCodice}>
              {codiceCopiato ? 'Copiato' : 'Copia'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
            Mandalo a chi vuoi che ti trovi. Senza, nessuno può cercarti se non sa il tuo nome
            esatto — ed è voluto.
          </p>
        </div>
      )}

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
          placeholder="Codice amico o nome esatto"
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

      {ql.length > 0 && ql.length < 3 && (
        <p className="muted" style={{ fontSize: 13, margin: '8px 2px' }}>
          Scrivi almeno tre caratteri.
        </p>
      )}

      {ql.length >= 3 && (
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {cercando ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>Cerco…</p>
          ) : risultati.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px', lineHeight: 1.45 }}>
              Nessuno con questo codice o con questo nome.{' '}
              <strong style={{ color: 'var(--text)' }}>Il nome va scritto per intero</strong>: la
              ricerca per pezzi non c’è, se no chiunque potrebbe ricavarsi l’elenco di tutti.
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

      {/* Amici suggeriti.
          ⚠️ Qui compaiono nomi che nessuno ha cercato, ed è il motivo per cui la
          funzione del database propone SOLO chi ha un legame reale: amici di
          amici, o atleti dello stesso PT. Proporre sconosciuti sarebbe la
          ricerca per pezzi rimessa in piedi da un'altra porta, e vanificherebbe
          la scelta di non essere sfogliabili. Il motivo si scrive sempre: un
          suggerimento senza il suo perché è solo un nome piovuto dal nulla. */}
      {suggeriti.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>Forse li conosci</div>
          <div className="stack" style={{ gap: 8 }}>
            {suggeriti.map((u) => (
              <div className="user-card" key={u.id} style={{ padding: 10 }}>
                <span className="user-avatar sm" aria-hidden="true">{iniziale(u.nome)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, display: 'block' }}>{u.nome}</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {u.amici_in_comune > 0
                      ? `${u.amici_in_comune} ${u.amici_in_comune === 1 ? 'amico' : 'amici'} in comune`
                      : u.motivo}
                  </span>
                </span>
                <button className="btn btn-accent btn-sm nowrap" onClick={() => chiedi(u)}>
                  Aggiungi
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
            Fatti mandare un codice amico, o cerca il nome esatto di qualcuno.
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
  // Quello che di lui il database lascia vedere: le sue cose pubbliche.
  const { dati } = useCollettivo()
  const allenamenti = useMemo(
    () => allenamentiDiUtente(amico, { collettivo: dati }),
    [amico, dati],
  )
  const schede = useMemo(() => schedeDiUtente(amico, { collettivo: dati }), [amico, dati])
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
