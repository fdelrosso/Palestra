import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import { isPt } from '../lib/pt'
import { conteggioProgressi, progressiDi, riprovaProgressiInSospeso } from '../lib/progressi'
import { CaricaProgressi, GrigliaProgressi } from '../components/GrigliaProgressi'
import { IconBack, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// "Foto Atleti" (dentro Lavoro): una cartella per atleta.
//
// ⚠️ Qui dentro si vede SOLO ciò che l'atleta ha aperto al suo PT, scatto per
// scatto. Non è un filtro scritto in questa pagina: è la regola sulla tabella
// `progressi` (supabase/schema.sql). Se un giorno comparisse dell'altro, il
// posto da guardare è quello, non questo file.
//
// Il PT può AGGIUNGERE scatti nella cartella di un suo atleta — il check in
// palestra spesso lo fa lui col suo telefono — e quelli nascono già visibili a
// lui, perché ce li ha in mano. Ma il padrone resta l'atleta: può nasconderli e
// può cancellarli. Il PT può disfare solo quello che ha caricato lui, e solo
// perché uno scatto sbagliato va tolto subito.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function FotoAtletiPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [aperto, setAperto] = useState(null)
  const [conti, setConti] = useState({})

  const ids = (mieiAtleti || []).map((a) => a.id).join(',')
  useEffect(() => {
    if (!ids) return
    conteggioProgressi(ids.split(',')).then(setConti).catch(() => {})
  }, [ids])

  if (!isPt(utenteCorrente)) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <h1>Foto Atleti</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>Questa sezione è per i personal trainer.</p>
        </div>
      </div>
    )
  }

  if (aperto) {
    return <CartellaAtleta atleta={aperto} onIndietro={() => setAperto(null)} />
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Foto Atleti</h1>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Una cartella per atleta. Dentro c'è quello che ognuno ha scelto di mostrarti: il resto
        resta suo.
      </p>

      {(mieiAtleti || []).length === 0 ? (
        <div className="empty">
          <div className="big">🤝</div>
          <p>
            Ancora nessun atleta.
            <br />
            Dai il tuo codice PT a chi segui: quando lo inserisce ti arriva la richiesta.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {mieiAtleti.map((a) => {
            const n = conti[a.id] || 0
            return (
              <button key={a.id} className="menu-voce" onClick={() => setAperto(a)}>
                <span className="menu-voce-icona" aria-hidden="true">
                  {iniziale(a.nome)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="menu-voce-nome">{a.nome}</span>
                  <span className="menu-voce-desc">
                    {n === 0 ? 'Niente da vedere, per ora' : n === 1 ? '1 scatto' : `${n} scatti`}
                  </span>
                </span>
                <IconChevron className="faint" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CartellaAtleta({ atleta, onIndietro }) {
  const { utenteCorrente } = useAccount()
  const io = utenteCorrente?.id

  const [righe, setRighe] = useState([])
  const [caricando, setCaricando] = useState(true)

  const ricarica = useCallback(async () => {
    const esito = await progressiDi(atleta.id)
    setRighe(esito.righe)
    setCaricando(false)
  }, [atleta.id])

  useEffect(() => {
    ricarica()
    riprovaProgressiInSospeso()
      .then((rimasti) => rimasti === 0 && ricarica())
      .catch(() => {})
  }, [ricarica])

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>{atleta.nome}</h1>
      </div>

      <CaricaProgressi
        atletaId={atleta.id}
        caricatoDa={io}
        onCaricati={(nuove) => setRighe((r) => [...nuove, ...r])}
      />
      <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
        Quello che carichi qui finisce nel check di {atleta.nome} ed è suo: può nasconderlo o
        cancellarlo quando vuole.
      </p>

      <div style={{ marginTop: 18 }}>
        {caricando ? (
          <p className="muted">Un attimo…</p>
        ) : righe.length === 0 ? (
          <div className="empty">
            <div className="big">🔒</div>
            <p>
              {atleta.nome} non ti ha mostrato nessuna foto.
              <br />
              Le foto del check partono private: è lui a decidere quali aprirti.
            </p>
          </div>
        ) : (
          <GrigliaProgressi
            righe={righe}
            puoiAprire={false}
            // ⚠️ Solo i propri: sugli scatti dell'atleta il pulsante non c'è, e
            // il database lo rifiuterebbe comunque.
            puoEliminareRiga={(r) => r.caricato_da === io}
            onEliminata={(r) => setRighe((tutte) => tutte.filter((x) => x.id !== r.id))}
          />
        )}
      </div>
    </div>
  )
}
