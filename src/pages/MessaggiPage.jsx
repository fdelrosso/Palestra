import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import ElencoChat from '../components/ElencoChat'
import Avatar from '../components/Avatar'
import { IconBack, IconClose, IconPlus, IconSearch } from '../components/icons'

// I messaggi: si aprono dalla busta in cima a Social. Tutte le conversazioni
// già cominciate; per cominciarne una c'è il "+" in alto, che apre la lista
// degli amici (si scrive solo agli amici: lo dice anche il database).
export default function MessaggiPage() {
  const { amici } = useAccount()
  const [nuovo, setNuovo] = useState(false)

  if (nuovo) return <NuovoMessaggio amici={amici} onIndietro={() => setNuovo(false)} />

  return (
    <div className="app">
      <div className="topbar">
        <h1>Messaggi</h1>
        {amici.length > 0 && (
          <button className="icon-btn" onClick={() => setNuovo(true)} aria-label="Nuovo messaggio" title="Nuovo messaggio">
            <IconPlus />
          </button>
        )}
      </div>
      <ElencoChat
        quandoVuoto={
          <p className="muted" style={{ fontSize: 13.5, margin: '0 2px', lineHeight: 1.45 }}>
            {amici.length === 0
              ? 'Qui compaiono le chat con i tuoi amici. Aggiungine uno dall’icona delle persone in Social.'
              : 'Nessuna chat per ora. Tocca il “+” in alto e scrivi a un amico.'}
          </p>
        }
      />
    </div>
  )
}

// --------------------------------------------------------------------------
// A chi scrivere: i propri amici in ordine di nome, con la ricerca in cima
// (filtrare per pezzi qui va bene: sono gia' tutti a schermo). Il tocco apre
// la chat, anche se con quella persona non ci si era mai scritti.
// --------------------------------------------------------------------------
function NuovoMessaggio({ amici, onIndietro }) {
  const [filtro, setFiltro] = useState('')
  const f = filtro.trim().toLowerCase()
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
        <h1>Nuovo messaggio</h1>
      </div>

      <div className="search-box" style={{ marginBottom: 12 }}>
        <IconSearch width={17} height={17} className="faint" />
        <input
          className="search-input"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="A chi vuoi scrivere?"
          autoCapitalize="none"
          autoComplete="off"
          autoFocus
        />
        {filtro && (
          <button className="icon-btn" aria-label="Pulisci" onClick={() => setFiltro('')}>
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>

      {visibili.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
          Nessun amico con questo nome.
        </p>
      ) : (
        <div className="chat-lista">
          {visibili.map((u) => (
            <button key={u.id} className="chat-lista-riga" onClick={() => navigate(routes.chat(u.id))}>
              <Avatar id={u.id} nome={u.nome} />
              <span className="chat-lista-testo">
                <span className="chat-lista-su">
                  <span className="chat-lista-nome">{u.nome}</span>
                </span>
                {u.username && (
                  <span className="chat-lista-giu">
                    <span className="chat-lista-anteprima">@{u.username}</span>
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
