import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import ElencoChat from '../components/ElencoChat'
import { goBack, navigate, routes } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import useCollettivo from '../hooks/useCollettivo'
import { statoAmicizia } from '../lib/relazioni'
import { isPt } from '../lib/pt'
import { dataLunga } from '../lib/format'
import ListaAllenamenti from '../components/ListaAllenamenti'
import MandaAdAmico from '../components/MandaAdAmico'
import Scambiati from '../components/Scambiati'
import TastoConferma from '../components/TastoConferma'
import {
  IconAmici,
  IconBack,
  IconCheck,
  IconClose,
  IconCoach,
  IconComment,
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
  // 'home' = chat, richieste e ricerca; 'amici' = la lista degli amici, che
  // si apre dal tasto in alto a destra.
  const [vista, setVista] = useState('home')
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

  // ⚠️ Il profilo si apre SOPRA la vista in cui si era: tornando indietro si
  // ritrova la lista degli amici, se si veniva da li'.
  if (aperto) {
    return (
      <ProfiloAmico
        amico={aperto}
        onIndietro={() => setAperto(null)}
        onRimuovi={() => {
          rimuoviAmico(aperto.id)
          setAperto(null)
        }}
      />
    )
  }

  if (vista === 'amici') {
    return (
      <ListaAmici
        amici={amici}
        inviate={richiesteAmicizia.inviate}
        onAnnulla={annullaRichiesta}
        onApri={setAperto}
        onIndietro={() => setVista('home')}
        onAggiungi={() => setVista('home')}
      />
    )
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
        {/* La lista degli amici sta dietro questo tasto: in mezzo alla pagina,
            sotto chat, richieste e ricerca, era lunga quanto gli amici e
            spingeva in fondo tutto il resto. Il numero dice cosa c'e' dietro.
            Le richieste da accettare invece restano qui sotto, in vista:
            aspettano una risposta. */}
        <button
          className="amici-btn"
          onClick={() => setVista('amici')}
          aria-label={`I tuoi amici: ${amici.length}`}
        >
          <IconAmici width={18} height={18} />
          {amici.length}
        </button>
      </div>

      {/* Il proprio codice: è il modo che non richiede di sapere come si scrive
          il nome di uno, e l'unico che funziona con due omonimi. Sta in CIMA e
          su una riga sola: in mezzo alla pagina, fra le chat e la ricerca,
          spezzava la lettura. */}
      {utenteCorrente?.codiceAmico && (
        <div className="card" style={{ marginBottom: 12, padding: '10px 12px' }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Il tuo codice</div>
              <span className="codice-grande">{utenteCorrente.codiceAmico}</span>
            </div>
            <button className="btn btn-sm nowrap" onClick={copiaCodice}>
              {codiceCopiato ? 'Copiato' : 'Copia'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
            Mandalo a chi vuoi che ti trovi. Senza, nessuno può cercarti se non sa il tuo nome
            esatto — ed è voluto.
          </p>
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

      {/* Le conversazioni gia' cominciate: e' la cosa per cui si torna in
          questa pagina piu' spesso. */}
      <ElencoChat
        quandoVuoto={
          <p className="muted" style={{ fontSize: 13, margin: '0 2px', lineHeight: 1.45 }}>
            {amici.length === 0
              ? 'Qui compaiono le chat con i tuoi amici. Aggiungine uno qui sotto.'
              : 'Nessuna chat per ora. Apri i tuoi amici in alto a destra e scrivi a qualcuno.'}
          </p>
        }
      />

      {/* Quello che gli amici ti hanno mandato e quello che hai mandato tu:
          prima era la pagina "Condivisi", nel menu del profilo. Qui sta vicino
          alle persone da cui arriva. Tace finche' non c'e' niente. */}
      <Scambiati />

      {/* Trovare gente nuova: la ricerca e i suggeriti, in fondo. Si usa
          all'inizio e poi di rado, quindi non sta sopra alle chat. */}
      <div className="section-title" style={{ marginTop: 22 }}>Aggiungi amici</div>
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

    </div>
  )
}

// --------------------------------------------------------------------------
// La lista degli amici, dietro il tasto in alto a destra. Toccare un amico ne
// apre il profilo (allenamenti, schede, "Manda"); il fumetto a destra porta
// dritto alla chat, che e' quasi sempre il motivo per cui lo si cerca.
// Toglierlo dagli amici sta nel suo profilo, con la conferma: qui una X a
// portata di pollice su ogni riga era un amico perso per un tocco storto.
// --------------------------------------------------------------------------
function ListaAmici({ amici, inviate, onAnnulla, onApri, onIndietro, onAggiungi }) {
  const [filtro, setFiltro] = useState('')
  const f = filtro.trim().toLowerCase()
  // Filtrare per pezzi QUI va bene: sono i propri amici, gia' tutti a schermo.
  // La ricerca per pezzi vietata e' quella su tutti gli utenti dell'app.
  const ordinati = useMemo(
    () => [...amici].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it')),
    [amici],
  )
  const visibili = f
    ? ordinati.filter(
        (u) =>
          (u.nome || '').toLowerCase().includes(f) || (u.username || '').toLowerCase().includes(f),
      )
    : ordinati

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>{amici.length === 0 ? 'I tuoi amici' : `I tuoi amici · ${amici.length}`}</h1>
      </div>

      {amici.length === 0 ? (
        <div className="empty">
          <div className="big">👋</div>
          <p>
            Ancora nessun amico.
            <br />
            Fatti mandare un codice amico, o cerca il nome esatto di qualcuno.
          </p>
          <button className="btn btn-accent" style={{ marginTop: 14 }} onClick={onAggiungi}>
            Aggiungi amici
          </button>
        </div>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
            Tocca un amico per vedere i suoi allenamenti pubblici e mandargli qualcosa.
          </p>
          {amici.length > 6 && (
            <div className="search-box" style={{ marginBottom: 12 }}>
              <IconSearch width={17} height={17} className="faint" />
              <input
                className="search-input"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Cerca fra i tuoi amici"
                autoCapitalize="none"
                autoComplete="off"
              />
              {filtro && (
                <button className="icon-btn" aria-label="Pulisci" onClick={() => setFiltro('')}>
                  <IconClose width={16} height={16} />
                </button>
              )}
            </div>
          )}
          {visibili.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
              Nessun amico con questo nome.
            </p>
          ) : (
            <div className="chat-lista">
              {visibili.map((u) => (
                <div className="amico-riga" key={u.id}>
                  <button className="chat-lista-riga" onClick={() => onApri(u)}>
                    <span className="user-avatar sm" aria-hidden="true">
                      {iniziale(u.nome)}
                    </span>
                    <span className="chat-lista-testo">
                      <span className="chat-lista-su">
                        <span className="chat-lista-nome">{u.nome}</span>
                        {isPt(u) && (
                          <span className="badge badge-accent">
                            <IconCoach width={12} height={12} /> PT
                          </span>
                        )}
                      </span>
                      {u.username && (
                        <span className="chat-lista-giu">
                          <span className="chat-lista-anteprima">@{u.username}</span>
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Scrivi a ${u.nome}`}
                    onClick={() => navigate(routes.chat(u.id))}
                  >
                    <IconComment width={19} height={19} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Richieste che aspettano una risposta: sono amici "in arrivo", e
          stanno qui insieme a quelli che ci sono gia'. */}
      {inviate.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>
            In attesa di risposta · {inviate.length}
          </div>
          <div className="chat-lista">
            {inviate.map(({ rel, utente }) => (
              <div className="amico-riga" key={rel.id} style={{ padding: '6px 0 6px 12px' }}>
                <span className="user-avatar sm" aria-hidden="true">
                  {iniziale(utente.nome)}
                </span>
                <span className="chat-lista-nome" style={{ marginLeft: 7 }}>
                  {utente.nome}
                </span>
                <button className="btn btn-ghost btn-sm nowrap" onClick={() => onAnnulla(rel.id)}>
                  Annulla
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Il profilo di un amico: i suoi allenamenti pubblici e le sue schede
// pubbliche. Quello che ha tenuto per sé qui non c'è e non si vede che c'è.
// --------------------------------------------------------------------------
function ProfiloAmico({ amico, onIndietro, onRimuovi }) {
  // Quello che di lui il database lascia vedere: le sue cose pubbliche.
  const { dati } = useCollettivo()
  const allenamenti = useMemo(
    () => allenamentiDiUtente(amico, { collettivo: dati }),
    [amico, dati],
  )
  const schede = useMemo(() => schedeDiUtente(amico, { collettivo: dati }), [amico, dati])
  const [tab, setTab] = useState('allenamenti')
  const [manda, setManda] = useState(false)

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

      {/* Scrivergli e mandargli qualcosa: una scheda, un allenamento, una
          foto o un video (MandaAdAmico). Le schede e i recap si mandano anche
          dai posti dove stanno (scheda, calendario, fine allenamento).
          ⚠️ Scrivere e mandare sono due porte diverse apposta: il messaggio
          RESTA, la foto scade dopo 24 ore (lib/effimeri). Un unico pulsante
          farebbe credere che finiscano nello stesso posto. */}
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button className="btn grow" onClick={() => navigate(routes.chat(amico.id))}>
          <IconComment width={16} height={16} /> Scrivi
        </button>
        <button className="btn btn-accent grow" onClick={() => setManda(true)}>
          <IconShare width={16} height={16} /> Manda
        </button>
      </div>
      {manda && <MandaAdAmico amico={amico} onChiudi={() => setManda(false)} />}

      <Scambiati amicoId={amico.id} nomeAmico={amico.nome} />
      <div style={{ height: 14 }} />

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

      {/* Toglierlo dagli amici: qui e non nella lista, e con la conferma
          dentro la pagina (non `confirm()`, che dove non compare risponde
          "no" da solo e il tasto sembra morto). */}
      <TastoConferma
        etichetta="Togli dagli amici"
        domanda={`Togliere ${amico.nome} dagli amici? Non potrete più scrivervi né mandarvi niente.`}
        si="Sì, togli"
        onConferma={onRimuovi}
        style={{ marginTop: 24 }}
      />
    </div>
  )
}
