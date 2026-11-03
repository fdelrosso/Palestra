import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import {
  CATEGORIA,
  VISIBILITA_FOTO,
  categoriaDi,
  conteggioCommenti,
  progressiDi,
  riprovaProgressiInSospeso,
} from '../lib/progressi'
import { CaricaProgressi, DettaglioProgresso, GrigliaProgressi } from '../components/GrigliaProgressi'
import { IconBack, IconCoach, IconLock } from '../components/icons'

// ---------------------------------------------------------------------------
// "Check e video" (prima "Foto"): due linguette.
//   · Check fisico — il check periodico del corpo, una data alla volta;
//   · Esecuzioni   — il video (o la foto) di un esercizio, da far correggere
//                    al proprio PT.
//
// È la SUA sezione, anche quando è un personal trainer che si allena: le cose
// degli atleti che segue sono un'altra sezione, dentro Lavoro
// (pages/FotoAtletiPage).
//
// ⚠️ Ogni scatto nasce PRIVATO e si apre al proprio PT uno per uno, col
// lucchetto sulla miniatura o dal dettaglio ("Manda a …"). Aprirlo è anche
// mandarlo: al PT arriva la notifica, e sotto lo scatto ci si scrive avanti e
// indietro (components/GrigliaProgressi, DettaglioProgresso). Non c'è un
// interruttore unico "fai vedere tutto": si può voler mostrare il check di
// marzo e non quello di agosto.
//
// `?apri=<id>` apre subito quello scatto: ci si arriva dalle notifiche.
// ---------------------------------------------------------------------------

const LINGUETTE = [
  { id: CATEGORIA.CHECK, nome: 'Check fisico' },
  { id: CATEGORIA.ESECUZIONE, nome: 'Esecuzioni' },
]

export default function FotoPage() {
  const { utenteCorrente, mioPt } = useAccount()
  const io = utenteCorrente?.id

  const [righe, setRighe] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [errore, setErrore] = useState('')
  const [linguetta, setLinguetta] = useState(() =>
    new URLSearchParams(window.location.search).get('cat') === CATEGORIA.ESECUZIONE
      ? CATEGORIA.ESECUZIONE
      : CATEGORIA.CHECK,
  )
  const [aperto, setAperto] = useState(null)
  const [commenti, setCommenti] = useState({})

  const ricarica = useCallback(async () => {
    if (!io) return
    const esito = await progressiDi(io)
    setRighe(esito.righe)
    // ⚠️ Rete caduta e rifiuto del server sono cose opposte, e si dicono
    // diverse: con la rete giù quello che sta sul telefono si vede lo stesso.
    setErrore(esito.diRete ? '' : esito.errore)
    setCaricando(false)
    setCommenti(await conteggioCommenti(esito.righe.map((r) => r.id)))
    // Dalla notifica: quello scatto, nella sua linguetta.
    const daAprire = new URLSearchParams(window.location.search).get('apri')
    const riga = daAprire && esito.righe.find((r) => r.id === daAprire)
    if (riga) {
      setLinguetta(categoriaDi(riga))
      setAperto(riga)
    }
  }, [io])

  useEffect(() => {
    ricarica()
    // Quello che non era partito ci riprova all'apertura della sezione.
    riprovaProgressiInSospeso()
      .then((rimasti) => rimasti === 0 && ricarica())
      .catch(() => {})
  }, [ricarica])

  const esecuzioni = linguetta === CATEGORIA.ESECUZIONE
  const visibili = righe.filter((r) => categoriaDi(r) === linguetta)
  const aperteAlPt = visibili.filter((r) => r.visibilita === VISIBILITA_FOTO.PT).length

  const cambiata = (r) => {
    setRighe((tutte) => tutte.map((x) => (x.id === r.id ? r : x)))
    setAperto((a) => (a && a.id === r.id ? r : a))
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Check e video</h1>
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

      <p className="muted" style={{ marginTop: 0 }}>
        {esecuzioni
          ? 'Il video di un esercizio: mandalo al tuo PT e ti dice cosa correggere.'
          : 'Il check del fisico, una data alla volta. Le foto restano: servono a vedere come cambi.'}
      </p>

      <CaricaProgressi
        key={linguetta}
        atletaId={io}
        caricatoDa={io}
        categoria={linguetta}
        onCaricati={(nuove) => setRighe((r) => [...nuove, ...r])}
      />

      {mioPt ? (
        <div className="card row" style={{ gap: 10, alignItems: 'flex-start', marginTop: 12 }}>
          <span className="faint" aria-hidden="true">
            <IconCoach width={18} height={18} />
          </span>
          <div className="stack" style={{ gap: 2 }}>
            <strong style={{ fontSize: 13.5 }}>
              {aperteAlPt === 0
                ? `${mioPt.nome} non vede nessun${esecuzioni ? ' video' : 'a foto'}`
                : `${mioPt.nome} vede ${aperteAlPt} ${esecuzioni ? 'video' : 'foto'}`}
            </strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Tutto parte privato. Tocca il lucchetto per mandarlo al tuo personal trainer (gli
              arriva una notifica), e toccalo di nuovo per richiuderlo. Aprendolo potete
              commentarlo insieme.
            </span>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
          <IconLock width={12} height={12} /> Li vedi solo tu. Se un giorno ti colleghi a un
          personal trainer, potrai mandarglieli uno per uno.
        </p>
      )}

      {errore && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          {errore}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        {caricando ? (
          <p className="muted">Un attimo…</p>
        ) : visibili.length === 0 ? (
          <div className="empty">
            <div className="big">{esecuzioni ? '🎥' : '📸'}</div>
            <p>
              {esecuzioni ? (
                <>
                  Ancora nessun video.
                  <br />
                  Riprenditi durante una serie e fallo vedere al tuo PT.
                </>
              ) : (
                <>
                  Ancora nessuna foto.
                  <br />
                  La prima è quella che rende utili tutte le altre: fai il check di oggi.
                </>
              )}
            </p>
          </div>
        ) : (
          <GrigliaProgressi
            righe={visibili}
            puoiAprire
            puoEliminareRiga={() => true}
            commenti={commenti}
            onApri={setAperto}
            onCambiata={cambiata}
            onEliminata={(r) => setRighe((tutte) => tutte.filter((x) => x.id !== r.id))}
          />
        )}
      </div>

      {aperto && (
        <DettaglioProgresso
          riga={aperto}
          ioId={io}
          puoiAprire
          nomeAltro={mioPt?.nome || ''}
          nomeDi={(id) => (id === mioPt?.id ? mioPt.nome : '')}
          onChiudi={() => setAperto(null)}
          onCambiata={cambiata}
          onCommenti={(id, n) => setCommenti((c) => (c[id] === n ? c : { ...c, [id]: n }))}
        />
      )}
    </div>
  )
}
