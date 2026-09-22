import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import { VISIBILITA_FOTO, progressiDi, riprovaProgressiInSospeso } from '../lib/progressi'
import { CaricaProgressi, GrigliaProgressi } from '../components/GrigliaProgressi'
import { IconBack, IconCoach, IconLock } from '../components/icons'

// ---------------------------------------------------------------------------
// "Foto": il check fisico periodico di chi sta usando l'app.
//
// È la SUA sezione, anche quando è un personal trainer: un PT resta uno che si
// allena, e le sue foto stanno qui come quelle di tutti. Le foto degli atleti
// che segue sono un'altra sezione, dentro Lavoro (pages/FotoAtletiPage).
//
// ⚠️ Ogni scatto nasce PRIVATO e si apre al proprio PT uno per uno, col
// lucchetto sulla miniatura. Non c'è un interruttore unico "fai vedere tutto":
// è la stessa scelta del resto dell'app (chi non sceglie non pubblica, vedi
// src/lib/visibilita.js), e qui pesa di più che altrove — si può voler mostrare
// il check di marzo e non quello di agosto.
// ---------------------------------------------------------------------------

export default function FotoPage() {
  const { utenteCorrente, mioPt } = useAccount()
  const io = utenteCorrente?.id

  const [righe, setRighe] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [errore, setErrore] = useState('')

  const ricarica = useCallback(async () => {
    if (!io) return
    const esito = await progressiDi(io)
    setRighe(esito.righe)
    // ⚠️ Rete caduta e rifiuto del server sono cose opposte, e si dicono
    // diverse: con la rete giù quello che sta sul telefono si vede lo stesso.
    setErrore(esito.diRete ? '' : esito.errore)
    setCaricando(false)
  }, [io])

  useEffect(() => {
    ricarica()
    // Quello che non era partito ci riprova all'apertura della sezione.
    riprovaProgressiInSospeso()
      .then((rimasti) => rimasti === 0 && ricarica())
      .catch(() => {})
  }, [ricarica])

  const aperteAlPt = righe.filter((r) => r.visibilita === VISIBILITA_FOTO.PT).length

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Foto</h1>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Il check del fisico, una data alla volta. Le foto restano: servono a vedere come cambi.
      </p>

      <CaricaProgressi
        atletaId={io}
        caricatoDa={io}
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
                ? `${mioPt.nome} non vede nessuna di queste foto`
                : aperteAlPt === 1
                  ? `${mioPt.nome} vede 1 foto`
                  : `${mioPt.nome} vede ${aperteAlPt} foto`}
            </strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Ogni scatto parte privato. Tocca il lucchetto su una foto per mostrarla al tuo
              personal trainer, e toccalo di nuovo per richiuderla.
            </span>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
          <IconLock width={12} height={12} /> Le vedi solo tu. Se un giorno ti colleghi a un
          personal trainer, potrai mostrargliele una per una.
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
        ) : righe.length === 0 ? (
          <div className="empty">
            <div className="big">📸</div>
            <p>
              Ancora nessuna foto.
              <br />
              La prima è quella che rende utili tutte le altre: fai il check di oggi.
            </p>
          </div>
        ) : (
          <GrigliaProgressi
            righe={righe}
            puoiAprire
            puoEliminareRiga={() => true}
            onCambiata={(r) =>
              setRighe((tutte) => tutte.map((x) => (x.id === r.id ? r : x)))
            }
            onEliminata={(r) => setRighe((tutte) => tutte.filter((x) => x.id !== r.id))}
          />
        )}
      </div>
    </div>
  )
}
