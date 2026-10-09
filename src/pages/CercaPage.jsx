import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import Avatar from '../components/Avatar'
import { IconBack, IconChevron, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------
// Cerca: la lente in cima a Social. Si trova una persona e si guarda il suo profilo.
//
// ⚠️ COSA SI VEDE DI UN ALTRO LO DECIDE IL DATABASE, non questa pagina. Gli
// allenamenti e le schede che compaiono qui sono quelli che quella persona ha
// reso PUBBLICI: arrivano da `allenamenti_visibili()` e `schede_visibili()`, che
// filtrano sul server. Se qui si togliesse ogni controllo non uscirebbe niente
// di nuovo — e questa è la proprietà che si vuole.
//
// ⚠️ SI CERCA A PEZZI SOLO L'USERNAME. Il nome vuole ancora la scrittura
// esatta, e non è una dimenticanza: un username è una maniglia pubblica — uno
// se lo sceglie per farsi trovare e può cambiarlo — mentre il nome è come ti
// chiami. Cercare per pezzi di nome lascerebbe a chiunque l'elenco completo
// degli iscritti provando le lettere, ed è la ragione per cui `cerca_persona`
// lo vietava. Il taglio vero lo fa `cerca_utenti` in supabase/schema.sql.
// ---------------------------------------------------------------------------

export default function CercaPage() {
  const { cercaUtenti, amici } = useAccount()
  const [chiave, setChiave] = useState('')
  const [esiti, setEsiti] = useState(null)
  const [cercando, setCercando] = useState(false)
  const [errore, setErrore] = useState('')

  const cerca = async (e) => {
    e?.preventDefault()
    const q = chiave.trim()
    if (q.length < 2) {
      setErrore('Servono almeno due lettere.')
      setEsiti(null)
      return
    }
    setCercando(true)
    setErrore('')
    const esito = await cercaUtenti(q)
    // ⚠️ "Non c'è nessuno" e "non sono riuscito a chiedere" sono cose opposte:
    // mandare a correggere un username scritto giusto, perché la rete è caduta,
    // è il modo migliore per far smettere di cercare.
    if (!esito.ok) {
      setErrore(esito.errore || 'Ricerca non riuscita. Riprova.')
      setEsiti(null)
    } else {
      setEsiti(esito.trovati)
    }
    setCercando(false)
  }

  return (
    <div className="app con-barra">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Cerca</h1>
      </div>

      <form onSubmit={cerca} className="row" style={{ gap: 8 }}>
        <input
          type="search"
          value={chiave}
          placeholder="@username, nome esatto o codice"
          onChange={(e) => setChiave(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn" disabled={cercando}>
          <IconSearch width={16} height={16} />
          {cercando ? 'Cerco…' : 'Cerca'}
        </button>
      </form>

      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        L'username si cerca anche a pezzi: «fil» trova «filippo». Il nome invece va scritto per
        intero: un username uno se lo sceglie per farsi trovare, il nome no.
      </p>

      {errore && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          {errore}
        </p>
      )}

      {esiti !== null && (
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {esiti.length === 0 ? (
            <div className="empty">
              <div className="big">🔍</div>
              <p>
                Nessuno con «{chiave.trim()}».
                <br />
                Prova con l'username, o fatti dare il codice amico.
              </p>
            </div>
          ) : (
            esiti.map((p) => (
              <button key={p.id} className="menu-voce" onClick={() => navigate(routes.utente(p.id))}>
                <Avatar id={p.id} nome={p.nome} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="menu-voce-nome">{p.nome}</span>
                  <span className="menu-voce-desc">
                    {p.username ? `@${p.username}` : ''}
                    {amici?.some((a) => a.id === p.id) && ' · siete amici'}
                  </span>
                </span>
                <IconChevron className="faint" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
