import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import { isPt } from '../lib/pt'
import {
  CATEGORIA,
  categoriaDi,
  conteggioCommenti,
  conteggioProgressi,
  progressiDi,
  riprovaProgressiInSospeso,
} from '../lib/progressi'
import { CaricaProgressi, DettaglioProgresso, GrigliaProgressi } from '../components/GrigliaProgressi'
import { IconBack, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// "Check e video atleti" (dentro Lavoro, prima "Foto Atleti"): una cartella
// per atleta, con le linguette Check fisico ed Esecuzioni come la sezione
// dell'atleta (pages/FotoPage). Toccando uno scatto si apre coi commenti: il
// PT corregge, l'atleta risponde, e a ognuno arriva la notifica dell'altro.
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
  // `?atleta=<id>&apri=<scatto>`: dalle notifiche, dritti allo scatto.
  const q = new URLSearchParams(window.location.search)
  const [apertoId, setApertoId] = useState(() => q.get('atleta'))
  const [scattoDaAprire] = useState(() => q.get('apri'))
  const aperto = (mieiAtleti || []).find((a) => a.id === apertoId) || null
  const setAperto = (a) => setApertoId(a?.id || null)
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
          <h1>Check e video atleti</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>Questa sezione è per i personal trainer.</p>
        </div>
      </div>
    )
  }

  if (aperto) {
    return <CartellaAtleta atleta={aperto} apri={scattoDaAprire} onIndietro={() => setAperto(null)} />
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Check e video atleti</h1>
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
                    {n === 0 ? 'Niente da vedere, per ora' : n === 1 ? '1 foto o video' : `${n} foto e video`}
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

const LINGUETTE = [
  { id: CATEGORIA.CHECK, nome: 'Check fisico' },
  { id: CATEGORIA.ESECUZIONE, nome: 'Esecuzioni' },
]

function CartellaAtleta({ atleta, apri, onIndietro }) {
  const { utenteCorrente } = useAccount()
  const io = utenteCorrente?.id

  const [righe, setRighe] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [linguetta, setLinguetta] = useState(CATEGORIA.CHECK)
  const [aperto, setAperto] = useState(null)
  const [commenti, setCommenti] = useState({})

  const ricarica = useCallback(async () => {
    const esito = await progressiDi(atleta.id)
    setRighe(esito.righe)
    setCaricando(false)
    setCommenti(await conteggioCommenti(esito.righe.map((r) => r.id)))
    // Dalla notifica: quello scatto, nella sua linguetta.
    const riga = apri && esito.righe.find((r) => r.id === apri)
    if (riga) {
      setLinguetta(categoriaDi(riga))
      setAperto(riga)
    }
  }, [atleta.id, apri])

  useEffect(() => {
    ricarica()
    riprovaProgressiInSospeso()
      .then((rimasti) => rimasti === 0 && ricarica())
      .catch(() => {})
  }, [ricarica])

  const esecuzioni = linguetta === CATEGORIA.ESECUZIONE
  const visibili = righe.filter((r) => categoriaDi(r) === linguetta)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>{atleta.nome}</h1>
      </div>

      <div className="segmented" style={{ margin: '0 0 12px' }}>
        {LINGUETTE.map((l) => (
          <button
            key={l.id}
            className={'seg-btn' + (linguetta === l.id ? ' on' : '')}
            aria-pressed={linguetta === l.id}
            onClick={() => setLinguetta(l.id)}
          >
            {l.nome}
          </button>
        ))}
      </div>

      <CaricaProgressi
        key={linguetta}
        atletaId={atleta.id}
        caricatoDa={io}
        categoria={linguetta}
        onCaricati={(nuove) => setRighe((r) => [...nuove, ...r])}
      />
      <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
        Quello che carichi qui finisce nella cartella di {atleta.nome} ed è suo: può nasconderlo o
        cancellarlo quando vuole. Tocca una foto o un video per commentarlo.
      </p>

      <div style={{ marginTop: 18 }}>
        {caricando ? (
          <p className="muted">Un attimo…</p>
        ) : visibili.length === 0 ? (
          <div className="empty">
            <div className="big">🔒</div>
            <p>
              {esecuzioni
                ? `${atleta.nome} non ti ha mandato nessun video.`
                : `${atleta.nome} non ti ha mostrato nessuna foto.`}
              <br />
              Partono private: è lui a decidere quali mandarti.
            </p>
          </div>
        ) : (
          <GrigliaProgressi
            righe={visibili}
            puoiAprire={false}
            // ⚠️ Solo i propri: sugli scatti dell'atleta il pulsante non c'è, e
            // il database lo rifiuterebbe comunque.
            puoEliminareRiga={(r) => r.caricato_da === io}
            commenti={commenti}
            onApri={setAperto}
            onEliminata={(r) => setRighe((tutte) => tutte.filter((x) => x.id !== r.id))}
          />
        )}
      </div>

      {aperto && (
        <DettaglioProgresso
          riga={aperto}
          ioId={io}
          puoiAprire={false}
          nomeAltro={atleta.nome}
          nomeDi={(id) => (id === atleta.id ? atleta.nome : '')}
          onChiudi={() => setAperto(null)}
          onCommenti={(id, n) => setCommenti((c) => (c[id] === n ? c : { ...c, [id]: n }))}
        />
      )}
    </div>
  )
}