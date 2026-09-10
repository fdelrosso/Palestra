import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import useCollettivo from '../hooks/useCollettivo'
import { isPt } from '../lib/pt'
import { schemaPerSettimana } from '../data/model'
import { formatSerieRip, dataLunga } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import ListaAllenamenti from '../components/ListaAllenamenti'
import RichiesteLavoro from '../components/RichiesteLavoro'
import EsercizioAllegati from '../components/EsercizioAllegati'
import { IconBack, IconBed, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// Sezione "Atleti" (dentro Lavoro): chi segui, e per ognuno la scheda su cui sta
// lavorando adesso, quelle di prima e gli allenamenti che ha svolto.
//
// Un PT vede anche ciò che l'atleta ha marcato "solo al PT"; resta fuori solo
// quello che ha scelto di nascondere a tutti (lib/visibilita).
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function AtletiPage() {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [aperto, setAperto] = useState(null)

  if (!isPt(utenteCorrente)) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
          <h1>Atleti</h1>
        </div>
        <div className="empty">
          <div className="big">💼</div>
          <p>Questa sezione è per i personal trainer.</p>
        </div>
      </div>
    )
  }

  if (aperto) return <DettaglioAtleta atleta={aperto} onIndietro={() => setAperto(null)} />

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
        <h1>Atleti</h1>
      </div>

      <RichiesteLavoro />

      <div className="section-title" style={{ marginTop: 16 }}>
        {mieiAtleti.length === 0 ? 'Chi segui' : `Chi segui · ${mieiAtleti.length}`}
      </div>

      {mieiAtleti.length === 0 ? (
        <div className="empty">
          <div className="big">🤝</div>
          <p>
            Ancora nessun atleta.
            <br />
            Dai il tuo codice PT a chi segui: quando lo inserisce ti arriva la richiesta.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {mieiAtleti.map((a) => (
            <SchedaAtletaCard key={a.id} atleta={a} onApri={() => setAperto(a)} />
          ))}
        </div>
      )}
    </div>
  )
}

// Riga di un atleta: nome + a che punto è (scheda corrente e ultimo allenamento).
function SchedaAtletaCard({ atleta, onApri }) {
  const { dati } = useCollettivo()
  const schede = useMemo(
    () => schedeDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const allenamenti = useMemo(
    () => allenamentiDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const corrente = schede[0]

  return (
    <button className="storico-card" onClick={onApri}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="user-avatar" aria-hidden="true">{iniziale(atleta.nome)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{atleta.nome}</div>
            <div className="muted nowrap" style={{ fontSize: 12.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {corrente ? corrente.nome : 'Nessuna scheda condivisa'}
            </div>
          </div>
        </div>
        <IconChevron className="faint" />
      </div>
      <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <span className="badge badge-accent">
          {allenamenti.length} allenament{allenamenti.length === 1 ? 'o' : 'i'}
        </span>
        <span className="badge">
          {schede.length} sched{schede.length === 1 ? 'a' : 'e'}
        </span>
      </div>
    </button>
  )
}

// --------------------------------------------------------------------------
// Un atleta: scheda corrente, schede passate, allenamenti svolti.
// --------------------------------------------------------------------------
function DettaglioAtleta({ atleta, onIndietro }) {
  const { rimuoviAtleta } = useAccount()
  const { dati } = useCollettivo()
  const schede = useMemo(
    () => schedeDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const allenamenti = useMemo(
    () => allenamentiDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const [tab, setTab] = useState('allenamenti')
  const [schedaAperta, setSchedaAperta] = useState(null)

  // La più recente è quella su cui sta lavorando adesso; le altre sono storia.
  const [corrente, ...passate] = schede

  if (schedaAperta) {
    return <DettaglioScheda scheda={schedaAperta} atleta={atleta} onIndietro={() => setSchedaAperta(null)} />
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro"><IconBack /></button>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="user-avatar sm" aria-hidden="true">{iniziale(atleta.nome)}</span>
          <h1 style={{ fontSize: 18 }}>{atleta.nome}</h1>
        </div>
      </div>

      <div className="segmented" style={{ margin: '4px 0 14px' }}>
        <button
          className={'seg-btn' + (tab === 'allenamenti' ? ' on' : '')}
          onClick={() => setTab('allenamenti')}
          aria-pressed={tab === 'allenamenti'}
        >
          Allenamenti · {allenamenti.length}
        </button>
        <button
          className={'seg-btn' + (tab === 'schede' ? ' on' : '')}
          onClick={() => setTab('schede')}
          aria-pressed={tab === 'schede'}
        >
          Schede · {schede.length}
        </button>
      </div>

      {tab === 'allenamenti' ? (
        <ListaAllenamenti
          voci={allenamenti}
          mostraUtente={false}
          mostraVisibilita
          vuoto={`${atleta.nome} non ha ancora registrato allenamenti.`}
        />
      ) : schede.length === 0 ? (
        <div className="empty">
          <div className="big">📋</div>
          <p>{atleta.nome} non ha ancora nessuna scheda che tu possa vedere.</p>
        </div>
      ) : (
        <>
          <div className="section-title">Scheda corrente</div>
          <CardScheda scheda={corrente} corrente onApri={() => setSchedaAperta(corrente)} />

          {passate.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 18 }}>
                Schede passate · {passate.length}
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {passate.map((s) => (
                  <CardScheda key={s.id} scheda={s} onApri={() => setSchedaAperta(s)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 24 }}
        onClick={() => {
          if (window.confirm(`Smettere di seguire ${atleta.nome}? Non vedrai più i suoi allenamenti.`)) {
            rimuoviAtleta(atleta.id)
            onIndietro()
          }
        }}
      >
        Non seguire più {atleta.nome}
      </button>
      <div style={{ height: 16 }} />
    </div>
  )
}

function CardScheda({ scheda, corrente = false, onApri }) {
  const giorniWorkout = scheda.giorni.filter((g) => g.tipo === 'workout')
  return (
    <button className="storico-card" onClick={onApri}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{scheda.nome}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            Creata il {dataLunga(scheda.creataIl)}
          </div>
        </div>
        <IconChevron className="faint" />
      </div>
      <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {corrente && <span className="badge badge-good">In corso</span>}
        <span className="badge badge-accent">
          Settimana {scheda.settimanaCorrente} di {scheda.numeroSettimane}
        </span>
        <span className="badge">
          {giorniWorkout.length} allenament{giorniWorkout.length === 1 ? 'o' : 'i'}/sett.
        </span>
      </div>
    </button>
  )
}

// La scheda di un atleta in sola lettura: gli stessi giorni/esercizi che vede
// lui, con lo schema della settimana su cui è adesso.
function DettaglioScheda({ scheda, atleta, onIndietro }) {
  const settimana = scheda.settimanaCorrente || 1
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro"><IconBack /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{scheda.nome}</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {atleta.nome} · settimana {settimana} di {scheda.numeroSettimane}
          </div>
        </div>
      </div>

      {scheda.nota && (
        <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
          {scheda.nota}
        </p>
      )}

      <div className="stack" style={{ gap: 14 }}>
        {scheda.giorni.map((g) => (
          <div className="card" key={g.id}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{g.nome || 'Giorno'}</div>
              {g.tipo === 'rest' && (
                <span className="badge">
                  <IconBed width={13} height={13} /> Rest
                </span>
              )}
            </div>
            {g.nota && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{g.nota}</div>
            )}

            {g.tipo === 'workout' && (
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {g.esercizi.map((e) => {
                  const schema = schemaPerSettimana(e, settimana)
                  const gr = gruppoDi(e.gruppo)
                  return (
                    <div key={e.id} className="ex-card" style={gr ? { '--g': gr.colore } : undefined}>
                      <div className="ex-head">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{e.nome}</div>
                          {e.nota && <div className="ex-nota">{e.nota}</div>}
                        </div>
                        <div className="serie-rip">{formatSerieRip(schema)}</div>
                      </div>
                      <div className="ex-scheme">
                        {schema.carico && <span className="chip">{schema.carico}</span>}
                        {schema.recupero && <span className="chip">rec {schema.recupero}</span>}
                        {e.variaPerSettimana && <span className="chip chip-nota">varia per settimana</span>}
                      </div>
                      <EsercizioAllegati esercizio={e} readOnly />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}
