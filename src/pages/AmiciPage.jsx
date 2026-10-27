import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { isPt } from '../lib/pt'
import UtentePage from './UtentePage'
import { IconBack, IconClose, IconCoach, IconComment, IconSearch, IconWhatsApp } from '../components/icons'
import Avatar from '../components/Avatar'

// ---------------------------------------------------------------------------
// Profilo, la voce a sinistra nella barra di Social (/amici): il proprio
// profilo COME LO VEDONO GLI ALTRI (la stessa UtentePage), con in piu' la card
// "Il tuo codice". Prima qui c'erano il codice, la ricerca e "Forse li
// conosci": ricerca e suggeriti stanno in Cerca.
//
// Le richieste d'amicizia da accettare restano qui: aspettano te e non
// avrebbero un altro posto. Quello che gli amici ti mandano sta invece nella
// chat con ciascuno (lib/scambi). Sotto il codice amico, per un PT, c'e' anche il codice PT: e'
// l'altra cosa che si da' a qualcuno perche' ti trovi. Compaiono solo quando ci sono. La lista degli amici si apre
// toccando il numero degli amici nel profilo.
// ---------------------------------------------------------------------------

export default function AmiciPage() {
  const { utenteCorrente, amici, richiesteAmicizia, rispondiRichiesta, annullaRichiesta } = useAccount()
  const [vista, setVista] = useState('profilo')

  if (vista === 'amici') {
    return (
      <ListaAmici
        amici={amici}
        inviate={richiesteAmicizia.inviate}
        onAnnulla={annullaRichiesta}
        onApri={(u) => navigate(routes.utente(u.id))}
        onIndietro={() => setVista('profilo')}
        onAggiungi={() => navigate(routes.cerca())}
      />
    )
  }

  if (!utenteCorrente?.id) return null

  // Il proprio profilo su WhatsApp: il link apre la propria pagina
  // (/utente/:id), da cui l'altro manda la richiesta d'amicizia. Chi non ha
  // ancora l'app passa prima dalla registrazione: il profilo lo riapre
  // App.jsx (useProfiloDaLink). Il codice va nel messaggio lo stesso,
  // per chi preferisce cercarlo in Cerca.
  const mandaSuWhatsApp = () => {
    const link = `${window.location.origin}${routes.utente(utenteCorrente.id)}`
    const righe = [`Aggiungimi su Progetto Palestra 💪`, link]
    if (utenteCorrente.codiceAmico) righe.push('', `Oppure cerca il mio codice: ${utenteCorrente.codiceAmico}`)
    const testo = righe.join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, '_blank', 'noopener')
  }

  // Il codice PT su WhatsApp, per chi si vuole far seguire: il link apre il
  // profilo, il codice si scrive in Profilo → Personal trainer.
  const mandaCodicePt = () => {
    const link = `${window.location.origin}${routes.utente(utenteCorrente.id)}`
    const testo = [
      `Sono il tuo PT su Progetto Palestra 💪`,
      `Il mio codice PT è ${utenteCorrente.codicePt}: inseriscilo in Profilo → Personal trainer.`,
      link,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, '_blank', 'noopener')
  }

  const inCima = (
    <>
      {utenteCorrente.codiceAmico && (
        <div className="card" style={{ marginBottom: 12, padding: '10px 12px' }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Il tuo codice</div>
              <span className="codice-grande">{utenteCorrente.codiceAmico}</span>
            </div>
            <button
              className="codice-whatsapp"
              onClick={mandaSuWhatsApp}
              aria-label="Manda il tuo profilo su WhatsApp"
              title="Manda il tuo profilo su WhatsApp"
            >
              <IconWhatsApp width={22} height={22} />
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
            Chi ha il tuo codice ti trova in Cerca e ti chiede l'amicizia. Senza, nessuno può
            cercarti se non sa il tuo nome esatto.
          </p>
        </div>
      )}

      {isPt(utenteCorrente) && utenteCorrente.codicePt && (
        <div className="card" style={{ marginBottom: 12, padding: '10px 12px' }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Il tuo codice PT</div>
              <span className="codice-grande">{utenteCorrente.codicePt}</span>
            </div>
            <button
              className="codice-whatsapp"
              onClick={mandaCodicePt}
              aria-label="Manda il tuo codice PT su WhatsApp"
              title="Manda il tuo codice PT su WhatsApp"
            >
              <IconWhatsApp width={22} height={22} />
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
            Dallo ai tuoi atleti: chi lo inserisce ti manda una richiesta, e la accetti in Lavoro.
          </p>
        </div>
      )}

      {richiesteAmicizia.ricevute.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 8 }}>
            Richieste ricevute · {richiesteAmicizia.ricevute.length}
          </div>
          <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
            {richiesteAmicizia.ricevute.map(({ rel, utente }) => (
              <div className="card" key={rel.id} style={{ padding: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <button className="apri-utente grow" onClick={() => navigate(routes.utente(utente.id))}>
                    <Avatar id={utente.id} nome={utente.nome} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 700, display: 'block' }}>{utente.nome}</span>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        Ti ha chiesto l’amicizia
                      </span>
                    </span>
                  </button>
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
    </>
  )

  // Da una notifica (pages/NotifichePage): /amici?post=<chiave>&apri=commento.
  const q = new URLSearchParams(window.location.search)
  const postIniziale = q.get('post') ? { chiave: q.get('post'), apri: q.get('apri') || '' } : null

  return (
    <UtentePage
      key={postIniziale?.chiave || 'profilo'}
      id={utenteCorrente.id}
      incorporata
      inCima={inCima}
      onApriAmici={() => setVista('amici')}
      postIniziale={postIniziale}
    />
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
                    <Avatar id={u.id} nome={u.nome} />
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
                <button className="apri-utente grow" onClick={() => navigate(routes.utente(utente.id))}>
                  <Avatar id={utente.id} nome={utente.nome} />
                  <span className="chat-lista-nome">{utente.nome}</span>
                </button>
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

