import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import Avatar from '../components/Avatar'
import { IconChevron, IconClose, IconSearch } from '../components/icons'

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

// Le ultime persone aperte dalla ricerca, come nelle app social: restano SOLO
// su questo telefono (localStorage, una lista per account) e non arrivano mai
// al database — sono affari di chi cerca. Si tengono nome e username di quel
// momento: se poi cambiano, la riga si aggiorna alla prossima apertura.
const RECENTI_MAX = 8
const chiaveRecenti = (io) => `cerca-recenti:v1:${io || 'anonimo'}`

function leggiRecenti(io) {
  try {
    const lista = JSON.parse(localStorage.getItem(chiaveRecenti(io)) || '[]')
    return Array.isArray(lista) ? lista.filter((p) => p?.id) : []
  } catch {
    return []
  }
}

function scriviRecenti(io, lista) {
  try {
    localStorage.setItem(chiaveRecenti(io), JSON.stringify(lista))
  } catch {
    /* niente storage (navigazione privata): restano finché la pagina è aperta */
  }
}

// "Amici in comune: Marco", "…: Marco e Luca", "…: Marco, Luca e altri 3".
// I nomi sono al massimo tre (amici_in_comune); se sono di più se ne dicono
// due e il resto si conta.
function testoInComune({ quanti, amici }) {
  const nomi = amici.map((a) => a.nome.split(' ')[0]).filter(Boolean)
  const titolo = quanti === 1 ? 'Amico in comune' : 'Amici in comune'
  if (nomi.length === 0) return `${quanti} ${quanti === 1 ? 'amico' : 'amici'} in comune`
  if (quanti === 1) return `${titolo}: ${nomi[0]}`
  if (quanti === 2 && nomi.length >= 2) return `${titolo}: ${nomi[0]} e ${nomi[1]}`
  if (quanti === 3 && nomi.length >= 3) return `${titolo}: ${nomi[0]}, ${nomi[1]} e ${nomi[2]}`
  const altri = quanti - 2
  return `${titolo}: ${nomi.slice(0, 2).join(', ')} e ${altri === 1 ? 'un altro' : `altri ${altri}`}`
}

// Si cerca mentre si scrive, con una piccola pausa (non a ogni lettera). A
// casella vuota: le ricerche recenti, o un'illustrazione se non ce ne sono.
// Le persone da proporre ("Forse li conosci") stanno in Amici, non qui.
export default function CercaPage() {
  const { cercaUtenti, amici, utenteCorrente } = useAccount()
  const io = utenteCorrente?.id
  const [chiave, setChiave] = useState('')
  const [recenti, setRecenti] = useState(() => leggiRecenti(io))
  // La risposta e la chiave a cui risponde: "sto cercando" è non averla
  // ancora per QUESTA chiave, non uno stato da tenere allineato.
  const [risposta, setRisposta] = useState({ per: '', ok: true, trovati: [], errore: '' })

  const q = chiave.trim()
  const cercando = q.length >= 2 && risposta.per !== q
  const esito = risposta.per === q ? risposta : null

  useEffect(() => {
    if (q.length < 2) return undefined
    let vivo = true
    const t = setTimeout(async () => {
      const r = await cercaUtenti(q)
      if (vivo) setRisposta({ per: q, ...r })
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [q, cercaUtenti])

  const aggiornaRecenti = (lista) => {
    setRecenti(lista)
    scriviRecenti(io, lista)
  }
  // Aprire una persona la mette in cima ai recenti (anche aprendola da lì).
  const apri = (p) => {
    const voce = { id: p.id, nome: p.nome, username: p.username || '' }
    aggiornaRecenti([voce, ...recenti.filter((r) => r.id !== p.id)].slice(0, RECENTI_MAX))
    navigate(routes.utente(p.id))
  }

  const persona = (p, sotto, inComune = null) => (
    <button key={p.id} className="menu-voce" onClick={() => apri(p)}>
      <Avatar id={p.id} nome={p.nome} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="menu-voce-nome">{p.nome}</span>
        {sotto && <span className="menu-voce-desc">{sotto}</span>}
        {inComune && (
          <span className="cerca-comune">
            <span className="cerca-comune-facce" aria-hidden="true">
              {inComune.amici.map((a) => (
                <Avatar key={a.id} id={a.id} nome={a.nome} />
              ))}
            </span>
            <span className="cerca-comune-testo">{testoInComune(inComune)}</span>
          </span>
        )}
      </span>
      <IconChevron className="faint" />
    </button>
  )

  return (
    <div className="app con-barra">
      <div className="topbar">
        <h1>Cerca</h1>
      </div>

      <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
        <IconSearch width={17} height={17} className="faint" />
        <input
          // "text" e non "search": la ✕ del browser si aggiungerebbe alla
          // nostra. Il tasto "cerca" sulla tastiera del telefono resta.
          type="text"
          enterKeyHint="search"
          className="search-input"
          value={chiave}
          placeholder="@username, nome esatto o codice"
          onChange={(e) => setChiave(e.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          aria-label="Cerca una persona"
        />
        {chiave && (
          <button type="button" className="icon-btn" aria-label="Pulisci" onClick={() => setChiave('')}>
            <IconClose width={16} height={16} />
          </button>
        )}
      </form>

      {q.length < 2 &&
        (recenti.length > 0 ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="section-title" style={{ marginTop: 20 }}>Recenti</div>
              <button type="button" className="btn-link cerca-cancella" onClick={() => aggiornaRecenti([])}>
                Cancella tutto
              </button>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {recenti.map((p) => (
                <div key={p.id} className="cerca-recente">
                  <button className="menu-voce" onClick={() => apri(p)}>
                    <Avatar id={p.id} nome={p.nome} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="menu-voce-nome">{p.nome}</span>
                      {p.username && <span className="menu-voce-desc">@{p.username}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn cerca-togli"
                    aria-label={`Togli ${p.nome} dai recenti`}
                    onClick={() => aggiornaRecenti(recenti.filter((r) => r.id !== p.id))}
                  >
                    <IconClose width={15} height={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="cerca-vuota">
            <div className="cerca-vuota-cerchio" aria-hidden="true">
              <IconSearch width={38} height={38} />
            </div>
            <p className="cerca-vuota-titolo">Trova amici, atleti e personal trainer</p>
          </div>
        ))}

      {q.length >= 2 && (
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {cercando ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>Cerco…</p>
          ) : !esito.ok ? (
            // ⚠️ "Non c'è nessuno" e "non sono riuscito a chiedere" sono cose
            // opposte: con la rete caduta non si manda a correggere l'username.
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
              {esito.errore || 'Ricerca non riuscita. Riprova.'}
            </p>
          ) : esito.trovati.length === 0 ? (
            <div className="empty">
              <div className="big">🔍</div>
              <p>Nessuno con «{q}».</p>
            </div>
          ) : (
            esito.trovati.map((p) => {
              const amico = amici?.some((a) => a.id === p.id)
              return persona(
                p,
                [p.username ? `@${p.username}` : '', amico ? 'siete amici' : ''].filter(Boolean).join(' · '),
                // Gli amici in comune servono a riconoscere chi ancora non è
                // amico; di un amico si sa già chi è.
                !amico && p.inComune?.quanti > 0 ? p.inComune : null,
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
