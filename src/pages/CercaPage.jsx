import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import ListaAllenamenti from '../components/ListaAllenamenti'
import { IconBack, IconChevron, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------
// Cerca: la quarta linguetta. Si trova una persona e si guarda il suo profilo.
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

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function CercaPage() {
  const { cercaUtenti, amici } = useAccount()
  const [chiave, setChiave] = useState('')
  const [esiti, setEsiti] = useState(null)
  const [cercando, setCercando] = useState(false)
  const [errore, setErrore] = useState('')
  const [aperto, setAperto] = useState(null)

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

  if (aperto) return <ProfiloPubblico persona={aperto} onIndietro={() => setAperto(null)} />

  return (
    <div className="app con-barra">
      <div className="topbar">
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
        intero — un username uno se lo sceglie per farsi trovare, il nome no.
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
              <button key={p.id} className="menu-voce" onClick={() => setAperto(p)}>
                <span className="menu-voce-icona" aria-hidden="true">
                  {iniziale(p.nome)}
                </span>
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

function ProfiloPubblico({ persona, onIndietro }) {
  const { dati } = useCollettivo()

  // ⚠️ Senza `comePt` e senza `tutti`: esce solo ciò che è pubblico. Sono le
  // stesse funzioni che usano Storico e Schede Generali, e il taglio vero l'ha
  // già fatto il server.
  const allenamenti = useMemo(
    () => allenamentiDiUtente(persona, { collettivo: dati }),
    [persona, dati],
  )
  const schede = useMemo(() => schedeDiUtente(persona, { collettivo: dati }), [persona, dati])

  return (
    <div className="app con-barra">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: 0 }}>{persona.nome}</h1>
          {persona.username && (
            <div className="muted" style={{ fontSize: 12.5 }}>@{persona.username}</div>
          )}
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 10 }}>
        Schede pubbliche{schede.length > 0 && ` · ${schede.length}`}
      </div>
      {schede.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          Nessuna scheda resa pubblica.
        </p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {schede.map((s) => (
            <div key={s.id} className="card">
              <strong style={{ fontSize: 14 }}>{s.nome || 'Scheda'}</strong>
              {s.obiettivo && <div className="muted" style={{ fontSize: 12.5 }}>{s.obiettivo}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 20 }}>
        Allenamenti pubblici{allenamenti.length > 0 && ` · ${allenamenti.length}`}
      </div>
      <ListaAllenamenti
        voci={allenamenti}
        mostraUtente={false}
        vuoto="Nessun allenamento reso pubblico."
      />

      {/* Le foto del check e le diete arrivano con la tappa successiva: oggi
          non esiste ancora un modo per renderle pubbliche. */}
    </div>
  )
}
