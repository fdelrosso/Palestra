import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import Avatar from '../components/Avatar'
import PalestreCerca from '../components/PalestreCerca'
import { usePrimaVolta } from '../components/GuidaBreve'
import { IconChevron, IconClose, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------
// Cerca: la lente in cima a Social. Si trova una persona e si guarda il suo
// profilo, o (linguetta Palestre, components/PalestreCerca) la propria palestra.
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
// I consigli d'amicizia: quanti in vista, e da quanti si pescano (il tetto
// di amici_suggeriti nel database).
const SUGGERITI_VISTA = 8
const SUGGERITI_ELENCO = 50
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

// Come si riconosce una persona in Cerca (2026-10-27): in grassetto il suo
// username (senza la @, chiesto così), che è unico e se l'è scelto per farsi
// trovare, e sotto il nome,
// che due persone possono avere uguale. Chi non ha ancora un username resta
// col nome. Vale per risultati, recenti e "Forse li conosci" (lo username lo
// dà `amici_suggeriti_con_username`, lib/social).
const primaRiga = (p) => p.username || p.nome
const nomeSotto = (p) => (p.username ? p.nome : '')

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

export default function CercaPage() {
  // La guida della palestra (lib/guide, 'palestre') la prima volta in Cerca.
  usePrimaVolta('palestre')
  // "?sezione=palestre" (routes.cercaPalestre) la apre sulle palestre.
  const [sezione, setSezione] = useState(() =>
    new URLSearchParams(window.location.search).get('sezione') === 'palestre' ? 'palestre' : 'persone',
  )
  return (
    <div className="app con-barra">
      <div className="topbar">
        <h1>Cerca</h1>
      </div>
      <div className="segmented cerca-linguette" role="tablist" aria-label="Cosa cercare">
        {[
          ['persone', 'Persone'],
          ['palestre', 'Palestre'],
        ].map(([id, nome]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sezione === id}
            className={'seg-btn' + (sezione === id ? ' on' : '')}
            onClick={() => setSezione(id)}
          >
            {nome}
          </button>
        ))}
      </div>
      {sezione === 'persone' ? <CercaPersone /> : <PalestreCerca />}
    </div>
  )
}

// Si cerca mentre si scrive, con una piccola pausa (non a ogni lettera). A
// casella vuota: le ricerche recenti, o un'illustrazione se non ce ne sono.
// Sotto, sempre a casella vuota, le persone da proporre ("Forse li conosci"),
// con "Aggiungi" a portata di dito.
function CercaPersone() {
  const { cercaUtenti, amici, utenteCorrente, relazioni, amiciSuggeriti, inviaRichiestaAmicizia } = useAccount()
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

  // I suggeriti si chiedono all'apertura e dopo ogni cambiamento nelle
  // amicizie: accettare qualcuno cambia chi ha senso proporre.
  // ⚠️ Qui compaiono nomi che nessuno ha cercato. La funzione del database
  // propone prima chi ha un legame reale (amici di amici, atleti dello stesso
  // PT), poi un elenco corto e fisso di chi ha tanti amici, infine 30 iscritti
  // a caso ma sempre gli stessi per chi guarda: mai tutti gli iscritti, che
  // sarebbe la ricerca per pezzi rimessa in piedi da un'altra porta. Il motivo
  // si scrive sempre.
  //
  // Se ne mostrano SUGGERITI_VISTA alla volta, presi da un elenco più lungo
  // (il massimo che dà il database). "Altri consigli" passa ai successivi mai
  // mostrati in questa visita; finiti quelli, il tasto si spegne.
  const [suggeriti, setSuggeriti] = useState([])
  const [altriSuggeriti, setAltriSuggeriti] = useState(false)
  const [cambioSuggeriti, setCambioSuggeriti] = useState(false)
  const visti = useRef(new Set())
  // Chi è in vista adesso: si scrive qui insieme a `visti`, così due
  // caricamenti di fila (StrictMode) si danno ragione invece di saltare avanti.
  const inVista = useRef(new Set())
  const [erroreAggiungi, setErroreAggiungi] = useState('')

  // `avanti`: si buttano quelli in vista e si prendono i successivi. Senza,
  // si tengono quelli in vista ancora proponibili e si completa la pagina.
  const caricaSuggeriti = useCallback(
    async (avanti) => {
      const lista = await amiciSuggeriti(SUGGERITI_ELENCO)
      const tenuti = lista.filter((u) => inVista.current.has(u.id))
      const nuovi = lista
        .filter((u) => !visti.current.has(u.id))
        .slice(0, SUGGERITI_VISTA - (avanti ? 0 : tenuti.length))
      for (const u of nuovi) visti.current.add(u.id)
      const mostrati = avanti && nuovi.length > 0 ? nuovi : [...tenuti, ...nuovi]
      inVista.current = new Set(mostrati.map((u) => u.id))
      return { mostrati, altri: lista.some((u) => !visti.current.has(u.id)) }
    },
    [amiciSuggeriti],
  )

  useEffect(() => {
    let vivo = true
    caricaSuggeriti(false).then((r) => {
      if (!vivo) return
      setSuggeriti(r.mostrati)
      setAltriSuggeriti(r.altri)
    })
    return () => {
      vivo = false
    }
  }, [caricaSuggeriti, relazioni])

  const altriConsigli = async () => {
    setCambioSuggeriti(true)
    const r = await caricaSuggeriti(true)
    setSuggeriti(r.mostrati)
    setAltriSuggeriti(r.altri)
    setErroreAggiungi('')
    setCambioSuggeriti(false)
  }

  const aggiungi = async (u) => {
    const r = await inviaRichiestaAmicizia(u.id)
    setErroreAggiungi(r.ok ? '' : r.errore)
    // Chi ha appena ricevuto la richiesta non va più proposto.
    if (r.ok) setSuggeriti((prev) => prev.filter((x) => x.id !== u.id))
  }

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
        <span className="menu-voce-nome">{primaRiga(p)}</span>
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
    <>
      <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
        <IconSearch width={17} height={17} className="faint" />
        <input
          // "text" e non "search": la ✕ del browser si aggiungerebbe alla
          // nostra. Il tasto "cerca" sulla tastiera del telefono resta.
          type="text"
          enterKeyHint="search"
          className="search-input"
          value={chiave}
          placeholder="@username o nome esatto"
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
                      <span className="menu-voce-nome">{primaRiga(p)}</span>
                      {nomeSotto(p) && <span className="menu-voce-desc">{nomeSotto(p)}</span>}
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

      {q.length < 2 && suggeriti.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="section-title" style={{ marginTop: 20 }}>Forse li conosci</div>
            <button
              type="button"
              className="btn-link cerca-cancella"
              onClick={altriConsigli}
              disabled={!altriSuggeriti || cambioSuggeriti}
              title={altriSuggeriti ? undefined : 'Per ora non ce ne sono altri'}
            >
              {cambioSuggeriti ? 'Cerco…' : altriSuggeriti ? 'Altri consigli' : 'Nessun altro'}
            </button>
          </div>
          {erroreAggiungi && <p className="form-error" style={{ marginBottom: 8 }}>{erroreAggiungi}</p>}
          <div className="stack" style={{ gap: 8 }}>
            {suggeriti.map((u) => (
              <div className="user-card" key={u.id} style={{ padding: 10 }}>
                <button className="apri-utente grow" onClick={() => apri(u)}>
                  <Avatar id={u.id} nome={u.nome} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 700, display: 'block' }}>{primaRiga(u)}</span>
                    {nomeSotto(u) && (
                      <span className="muted" style={{ fontSize: 13, display: 'block' }}>
                        {nomeSotto(u)}
                      </span>
                    )}
                    <span className="faint" style={{ fontSize: 12 }}>
                      {u.amici_in_comune > 0
                        ? `${u.amici_in_comune} ${u.amici_in_comune === 1 ? 'amico' : 'amici'} in comune`
                        : u.motivo}
                    </span>
                  </span>
                </button>
                <button className="btn btn-accent btn-sm nowrap" onClick={() => aggiungi(u)}>
                  Aggiungi
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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
                [nomeSotto(p), amico ? 'siete amici' : ''].filter(Boolean).join(' · '),
                // Gli amici in comune servono a riconoscere chi ancora non è
                // amico; di un amico si sa già chi è.
                !amico && p.inComune?.quanti > 0 ? p.inComune : null,
              )
            })
          )}
        </div>
      )}
    </>
  )
}
