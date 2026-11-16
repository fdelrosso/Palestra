import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useSchermoLargo from '../hooks/useSchermoLargo'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { filtraAtleti, isPt } from '../lib/pt'
import { dataLunga } from '../lib/format'
import { leggiSchedeLavoro, salvaSchedaLavoro } from '../lib/schedeLavoro'
import {
  BOZZA_LAVORO,
  propostaCompleta,
  proposteMandate,
  ritiraProposta,
  salvaBozzaPerAtleta,
} from '../lib/proposteScheda'
import { nuovaScheda } from '../data/model'
import { AnteprimaGiorni } from '../components/SchedeDalPt'
import ScegliAtleta from '../components/ScegliAtleta'
import Avatar from '../components/Avatar'
import CercaAtleta, { NessunAtleta } from '../components/CercaAtleta'
import { IconBack, IconChevron, IconClipboard, IconClose, IconPlus } from '../components/icons'

// ---------------------------------------------------------------------------
// Lavoro → "Schede di lavoro": le schede che il PT scrive per i suoi atleti.
//   - Da inviare: le schede di lavoro (lib/schedeLavoro), si scrivono, si
//     incollano, si mandano a un atleta (e da lì passano fra le inviate);
//   - Inviate: tutte le proposte mandate (lib/proposteScheda), con atleta e
//     stato; si riguardano, si rimandano a un altro, si copiano fra quelle da
//     inviare per ripartire da lì.
// Le schede con cui il PT si allena NON sono qui: stanno nella sua parte
// Personale.
// ---------------------------------------------------------------------------

const STATO_PROPOSTA = {
  attesa: ['badge-accent', 'In attesa'],
  accettata: ['badge-good', 'Salvata'],
  rifiutata: ['badge-danger', 'Rifiutata'],
  ritirata: ['', 'Ritirata'],
}

const giorniWorkout = (s) => (s?.giorni || []).filter((g) => g.tipo === 'workout').length

export default function SchedeLavoroPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const io = utenteCorrente?.id
  const [tab, setTab] = useState('da-inviare')
  const [bozze, setBozze] = useState(null)
  const [inviate, setInviate] = useState(null)
  const [errore, setErrore] = useState('')
  // La scheda (bozza o proposta completa) da mandare: apre la scelta dell'atleta.
  const [daMandare, setDaMandare] = useState(null)
  // Inviate: una cartella per atleta (come Check e video), e la ricerca.
  const [cartella, setCartella] = useState(null)
  const [cerca, setCerca] = useState('')

  const rileggi = useCallback(() => {
    leggiSchedeLavoro(io).then((r) => {
      setBozze(r.schede)
      if (!r.ok) setErrore(r.errore)
    })
    proposteMandate(io).then(setInviate)
  }, [io])

  useEffect(() => {
    rileggi()
  }, [rileggi])

  if (!isPt(utenteCorrente)) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => goBack(routes.lavoro())} aria-label="Indietro"><IconBack /></button>
          <h1>Schede di lavoro</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>Questa sezione è per i personal trainer.</p>
        </div>
      </div>
    )
  }

  // Chi la svolgeva: un atleta che segui, o uno che non segui più (il nome
  // salvato all'invio, lib/proposteScheda → atletaNome).
  const nomeAtleta = (p) => {
    const ora = mieiAtleti.find((a) => a.id === p.atletaId)
    if (ora) return ora.nome
    return p.atletaNome ? `${p.atletaNome}, ex atleta` : 'un ex atleta'
  }

  // Le inviate per atleta, dall'ultimo a cui si è mandato qualcosa (arrivano
  // già dalla più recente).
  const perAtleta = []
  for (const p of inviate || []) {
    let g = perAtleta.find((x) => x.atletaId === p.atletaId)
    if (!g) perAtleta.push((g = { atletaId: p.atletaId, nome: nomeAtleta(p), proposte: [] }))
    g.proposte.push(p)
  }
  const aperta = perAtleta.find((g) => g.atletaId === cartella) || null
  const trovati = filtraAtleti(perAtleta, cerca, (g) => g.nome)

  const nuova = () => {
    salvaBozzaPerAtleta(BOZZA_LAVORO, null)
    navigate(routes.schedaLavoro('nuova'))
  }

  const copiaFraDaInviare = async (scheda) => {
    setErrore('')
    const r = await salvaSchedaLavoro(io, { ...scheda, id: nuovaScheda().id })
    if (!r.ok) return setErrore(r.errore)
    rileggi()
    setTab('da-inviare')
  }

  const ritira = async (p) => {
    setErrore('')
    const r = await ritiraProposta(p.id)
    if (!r.ok) return setErrore(r.errore)
    setInviate((tutte) => tutte.map((x) => (x.id === p.id ? { ...x, stato: 'ritirata' } : x)))
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack(routes.lavoro())} aria-label="Indietro"><IconBack /></button>
        <h1>Schede di lavoro</h1>
      </div>

      <div className="segmented" style={{ margin: '4px 0 14px' }}>
        <button
          className={'seg-btn' + (tab === 'da-inviare' ? ' on' : '')}
          onClick={() => setTab('da-inviare')}
          aria-pressed={tab === 'da-inviare'}
        >
          Da inviare{bozze ? ` · ${bozze.length}` : ''}
        </button>
        <button
          className={'seg-btn' + (tab === 'inviate' ? ' on' : '')}
          onClick={() => setTab('inviate')}
          aria-pressed={tab === 'inviate'}
        >
          Inviate{inviate ? ` · ${inviate.length}` : ''}
        </button>
      </div>

      {errore && <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>{errore}</div>}

      {tab === 'da-inviare' ? (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button className="btn btn-accent grow" onClick={nuova}>
              <IconPlus width={18} height={18} /> Nuova scheda
            </button>
            <button className="btn grow" onClick={() => navigate(routes.importaLavoro())}>
              <IconClipboard width={18} height={18} /> Importa
            </button>
          </div>
          {bozze === null ? (
            <div className="empty"><p>Un attimo…</p></div>
          ) : bozze.length === 0 ? (
            <div className="empty">
              <div className="big">📋</div>
              <p>
                Nessuna scheda da inviare.
                <br />
                Scrivine una qui, o direttamente dalla pagina di un atleta.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {bozze.map((s) => (
                <div key={s.id} className="storico-card" style={{ cursor: 'default' }}>
                  <button
                    type="button"
                    className="row"
                    style={{ justifyContent: 'space-between', gap: 10, width: '100%', background: 'none', border: 0, padding: 0, color: 'inherit', textAlign: 'left' }}
                    onClick={() => navigate(routes.schedaLavoro(s.id))}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.nome || 'Scheda senza nome'}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {giorniWorkout(s)} giorni · {s.senzaFine ? 'senza fine' : `${s.numeroSettimane} settimane`}
                      </div>
                    </div>
                    <IconChevron className="faint" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-block"
                    style={{ marginTop: 10 }}
                    onClick={() => setDaMandare({ scheda: s, daLavoroId: s.id })}
                    disabled={mieiAtleti.length === 0}
                  >
                    Invia a un atleta
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : inviate === null ? (
        <div className="empty"><p>Un attimo…</p></div>
      ) : inviate.length === 0 ? (
        <div className="empty">
          <div className="big">📨</div>
          <p>Non hai ancora mandato schede ai tuoi atleti.</p>
        </div>
      ) : aperta ? (
        <>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => setCartella(null)}>
            <IconBack width={16} height={16} /> Tutti gli atleti
          </button>
          <div className="section-title" style={{ marginTop: 0 }}>A {aperta.nome}</div>
          <div className="stack" style={{ gap: 8 }}>
            {aperta.proposte.map((p) => (
              <Inviata
                key={p.id}
                proposta={p}
                atleta={aperta.nome}
                onRitira={() => ritira(p)}
                onRimanda={(scheda) => setDaMandare({ scheda, daLavoroId: null })}
                onCopia={copiaFraDaInviare}
                puoiMandare={mieiAtleti.length > 0}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {perAtleta.length > 1 && <CercaAtleta valore={cerca} onCambia={setCerca} />}
          {trovati.length === 0 && <NessunAtleta testo={cerca} />}
          <div className="stack" style={{ gap: 8 }}>
            {trovati.map((g) => {
              const inAttesa = g.proposte.filter((p) => p.stato === 'attesa').length
              const n = g.proposte.length
              return (
                <button key={g.atletaId} type="button" className="menu-voce" onClick={() => setCartella(g.atletaId)}>
                  <Avatar id={g.atletaId} nome={g.nome} taglia="" />
                  <span style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <span className="menu-voce-nome">{g.nome}</span>
                    <span className="menu-voce-desc">
                      {n === 1 ? '1 scheda' : `${n} schede`}
                      {inAttesa > 0 ? ` · ${inAttesa} in attesa` : ''} · l’ultima il {dataLunga(g.proposte[0].creataIl)}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              )
            })}
          </div>
        </>
      )}

      {daMandare && (
        <ScegliAtleta
          atleti={mieiAtleti}
          titolo={`Mandare «${daMandare.scheda.nome || 'Scheda senza nome'}» a…`}
          nota="Prima di partire si apre la scheda: puoi ritoccarla per lui e scrivergli un messaggio."
          onChiudi={() => setDaMandare(null)}
          onScelto={(a) => {
            salvaBozzaPerAtleta(a.id, daMandare.scheda, daMandare.daLavoroId)
            navigate(routes.schedaPerAtleta(a.id))
          }}
        />
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}

// Una scheda inviata: si apre per riguardarla (la scheda si chiede solo ora).
// Sullo schermo largo le inviate stanno in griglia: aperta dentro la card
// allungava quella accanto, quindi lì si apre in una finestra (come gli
// allenamenti salvati, pages/HomePage).
function Inviata({ proposta: p, atleta, onRitira, onRimanda, onCopia, puoiMandare }) {
  const [aperta, setAperta] = useState(false)
  const [completa, setCompleta] = useState(null)
  const largo = useSchermoLargo()
  const [classe, testo] = STATO_PROPOSTA[p.stato] || ['', p.stato]

  const apri = async () => {
    setAperta((v) => !v)
    if (!completa) setCompleta(await propostaCompleta(p.id))
  }
  const scheda = completa?.dati ? { ...completa.dati, nome: completa.dati.nome || p.nome } : null

  const contenuto = (
    <div style={{ marginTop: 10 }}>
      {p.nota && <p className="muted" style={{ fontSize: 13, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>«{p.nota}»</p>}
      {!completa ? (
        <p className="muted" style={{ fontSize: 13 }}>Un attimo…</p>
      ) : (
        <>
          <AnteprimaGiorni scheda={scheda} />
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {p.stato === 'attesa' && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={onRitira}>Ritira</button>
            )}
            <button type="button" className="btn btn-sm grow" onClick={() => onCopia(scheda)}>
              Copia fra quelle da inviare
            </button>
            <button
              type="button"
              className="btn btn-sm btn-accent grow"
              onClick={() => {
                // Si apre la scelta dell'atleta: la finestra non deve starle sopra.
                setAperta(false)
                onRimanda(scheda)
              }}
              disabled={!puoiMandare}
            >
              Manda a un atleta
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="storico-card" style={{ cursor: 'default' }}>
      <button
        type="button"
        className="row"
        style={{ justifyContent: 'space-between', gap: 10, width: '100%', background: 'none', border: 0, padding: 0, color: 'inherit', textAlign: 'left' }}
        onClick={apri}
        aria-expanded={aperta}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p.nome}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            A {atleta} · {dataLunga(p.creataIl)}
          </div>
        </div>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          <span className={'badge ' + classe}>{testo}</span>
          <IconChevron className="faint" style={{ transform: aperta && !largo ? 'rotate(90deg)' : undefined }} />
        </div>
      </button>

      {aperta && !largo && contenuto}
      {aperta &&
        largo &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setAperta(false)}>
            <div className="modal" role="dialog" aria-label={p.nome} onClick={(e) => e.stopPropagation()}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{p.nome}</h3>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    A {atleta} · {dataLunga(p.creataIl)}
                  </div>
                </div>
                <button type="button" className="icon-btn" aria-label="Chiudi" onClick={() => setAperta(false)}>
                  <IconClose width={18} height={18} />
                </button>
              </div>
              {contenuto}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
