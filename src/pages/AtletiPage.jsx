import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import useAtleta, { useAndamenti } from '../hooks/useAtleta'
import SchedeDaConfermare from '../components/SchedeDaConfermare'
import BadgeAndamento from '../components/BadgeAndamento'
import { proposteMandate, ritiraProposta, salvaBozzaPerAtleta } from '../lib/proposteScheda'
import { leggiSchedeLavoro } from '../lib/schedeLavoro'
import { isPt } from '../lib/pt'
import { dataLunga } from '../lib/format'
import EsercizioCard from '../components/EsercizioCard'
import ListaAllenamenti from '../components/ListaAllenamenti'
import RichiesteLavoro from '../components/RichiesteLavoro'
import EsercizioAllegati from '../components/EsercizioAllegati'
import EsportaScheda from '../components/EsportaScheda'
import DietaPerAtleta from '../components/DietaPerAtleta'
import DiarioAtleta from '../components/DiarioAtleta'
import { IconBack, IconBed, IconChevron, IconPlus } from '../components/icons'
import Avatar from '../components/Avatar'

// ---------------------------------------------------------------------------
// Sezione "Atleti" (dentro Lavoro): chi segui, e per ognuno la scheda su cui sta
// lavorando adesso, quelle di prima e gli allenamenti che ha svolto.
//
// Un PT vede anche ciò che l'atleta ha marcato "solo al PT"; resta fuori solo
// quello che ha scelto di nascondere a tutti (lib/visibilita).
// ---------------------------------------------------------------------------

export default function AtletiPage({ id = null }) {
  const { utenteCorrente, mieiAtleti } = useAccount()
  // A che punto è ognuno: chi ha qualcosa da guardare (fermo, scheda finita,
  // senza scheda) va in cima, e il titolo dice quanti sono.
  const andamenti = useAndamenti(mieiAtleti)
  const daGuardare = andamenti.filter((r) => r.andamento.avvisi.length > 0).length

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

  if (id) {
    const atleta = mieiAtleti.find((a) => a.id === id)
    if (atleta) return <DettaglioAtleta atleta={atleta} onIndietro={() => goBack(routes.atleti())} />
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => goBack(routes.atleti())} aria-label="Indietro"><IconBack /></button>
          <h1>Atleti</h1>
        </div>
        <div className="empty">
          <div className="big">🤝</div>
          <p>Questa persona non è fra i tuoi atleti.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
        <h1>Atleti</h1>
      </div>

      <RichiesteLavoro />
      <SchedeDaConfermare />

      <div className="section-title" style={{ marginTop: 16 }}>
        {mieiAtleti.length === 0
          ? 'Chi segui'
          : `Chi segui · ${mieiAtleti.length}` + (daGuardare > 0 ? ` · ${daGuardare} da guardare` : ' · tutto in ordine')}
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
          {andamenti.map(({ atleta: a }) => (
            <SchedaAtletaCard key={a.id} atleta={a} onApri={() => navigate(routes.atleta(a.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

// Riga di un atleta: nome, scheda corrente e a che punto è.
function SchedaAtletaCard({ atleta, onApri }) {
  const { andamento } = useAtleta(atleta)
  const { corrente } = andamento

  return (
    <button className="storico-card" onClick={onApri}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <Avatar id={atleta.id} nome={atleta.nome} taglia="" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{atleta.nome}</div>
            <div className="muted nowrap" style={{ fontSize: 12.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {corrente
                ? corrente.nome +
                  (corrente.senzaFine ? '' : ` · settimana ${corrente.settimanaCorrente || 1} di ${corrente.numeroSettimane}`)
                : 'Nessuna scheda condivisa'}
            </div>
          </div>
        </div>
        <IconChevron className="faint" />
      </div>
      <BadgeAndamento andamento={andamento} />
    </button>
  )
}

// --------------------------------------------------------------------------
// Un atleta: a che punto è, la scheda nuova da mandargli, quelle già mandate,
// scheda corrente, schede passate, allenamenti svolti.
// --------------------------------------------------------------------------
function DettaglioAtleta({ atleta, onIndietro }) {
  const { rimuoviAtleta, utenteCorrente } = useAccount()
  const { schede, allenamenti, andamento } = useAtleta(atleta)
  const [scegliPartenza, setScegliPartenza] = useState(false)
  const [mandate, setMandate] = useState([])
  const [erroreRitiro, setErroreRitiro] = useState('')

  useEffect(() => {
    let vivo = true
    proposteMandate(utenteCorrente?.id).then((tutte) => {
      if (vivo) setMandate(tutte.filter((p) => p.atletaId === atleta.id))
    })
    return () => {
      vivo = false
    }
  }, [utenteCorrente?.id, atleta.id])

  const ritira = async (p) => {
    setErroreRitiro('')
    const r = await ritiraProposta(p.id)
    if (!r.ok) return setErroreRitiro(r.errore)
    setMandate((tutte) => tutte.map((x) => (x.id === p.id ? { ...x, stato: 'ritirata' } : x)))
  }

  const [tab, setTab] = useState('allenamenti')
  const [schedaAperta, setSchedaAperta] = useState(null)

  // Quella su cui lavora adesso (l'attiva, se la vedi); le altre sono storia.
  const corrente = andamento.corrente
  const passate = schede.filter((s) => s !== corrente && !s.libera)

  if (schedaAperta) {
    return (
      <DettaglioScheda
        scheda={schedaAperta}
        atleta={atleta}
        allenamenti={allenamenti}
        onIndietro={() => setSchedaAperta(null)}
      />
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro"><IconBack /></button>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <Avatar id={atleta.id} nome={atleta.nome} />
          <h1 style={{ fontSize: 18 }}>{atleta.nome}</h1>
        </div>
      </div>

      <BadgeAndamento andamento={andamento} style={{ marginTop: 2 }} />

      <button className="btn btn-accent btn-block" style={{ margin: '14px 0 6px' }} onClick={() => setScegliPartenza(true)}>
        <IconPlus width={18} height={18} /> Nuova scheda per {atleta.nome}
      </button>

      {mandate.length > 0 && (
        <ProposteMandate proposte={mandate} nome={atleta.nome} onRitira={ritira} errore={erroreRitiro} />
      )}

      {scegliPartenza && <SceltaPartenza atleta={atleta} onChiudi={() => setScegliPartenza(false)} />}

      {/* La dieta: un piano intero o solo i macro (components/DietaPerAtleta). */}
      <div style={{ height: 8 }} />
      <DietaPerAtleta atleta={atleta} />

      <div style={{ height: 14 }} />

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
        <button
          className={'seg-btn' + (tab === 'dieta' ? ' on' : '')}
          onClick={() => setTab('dieta')}
          aria-pressed={tab === 'dieta'}
        >
          Dieta
        </button>
      </div>

      {/* Cosa mangia, se lo lascia vedere (components/DiarioAtleta). */}
      {tab === 'dieta' ? (
        <DiarioAtleta atleta={atleta} />
      ) : tab === 'allenamenti' ? (
        <ListaAllenamenti
          voci={allenamenti}
          mostraUtente={false}
          mostraVisibilita
          vuoto={`${atleta.nome} non ha ancora registrato allenamenti.`}
        />
      ) : !corrente && passate.length === 0 ? (
        <div className="empty">
          <div className="big">📋</div>
          <p>{atleta.nome} non ha ancora nessuna scheda che tu possa vedere.</p>
        </div>
      ) : (
        <>
          {corrente && (
            <>
              <div className="section-title">Scheda corrente</div>
              <CardScheda scheda={corrente} corrente onApri={() => setSchedaAperta(corrente)} />
            </>
          )}

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

// --------------------------------------------------------------------------
// Da dove parte la scheda nuova: da zero, incollata, o da una delle tue.
// --------------------------------------------------------------------------
function SceltaPartenza({ atleta, onChiudi }) {
  const { utenteCorrente } = useAccount()
  // Le schede di lavoro, non quelle con cui il PT si allena (lib/schedeLavoro).
  const [mie, setMie] = useState([])
  useEffect(() => {
    let vivo = true
    leggiSchedeLavoro(utenteCorrente?.id).then((r) => vivo && setMie(r.schede))
    return () => {
      vivo = false
    }
  }, [utenteCorrente?.id])
  const vai = (bozza, daLavoroId = null) => {
    salvaBozzaPerAtleta(atleta.id, bozza, daLavoroId)
    navigate(routes.schedaPerAtleta(atleta.id))
  }
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={`Nuova scheda per ${atleta.nome}`} onClick={(e) => e.stopPropagation()}>
        <h3>Nuova scheda per {atleta.nome}</h3>
        <div className="stack" style={{ gap: 8 }}>
          <button type="button" className="btn btn-block" onClick={() => vai(null)}>
            Da zero
          </button>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              salvaBozzaPerAtleta(atleta.id, null)
              navigate(routes.importaPerAtleta(atleta.id))
            }}
          >
            Importa da foto, PDF, Excel o testo
          </button>
        </div>
        {mie.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 16 }}>Dalle tue schede da inviare</div>
            <div className="stack" style={{ gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {mie.map((s) => (
                <button key={s.id} type="button" className="menu-voce" onClick={() => vai(s, s.id)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="menu-voce-nome">{s.nome}</span>
                    <span className="menu-voce-desc">
                      {s.giorni.filter((g) => g.tipo === 'workout').length} giorni ·{' '}
                      {s.senzaFine ? 'senza fine' : `${s.numeroSettimane} settimane`}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, margin: '8px 2px 0' }}>
              Mandata, passa fra le inviate in «Schede di lavoro».
            </p>
          </>
        )}
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}

const STATO_PROPOSTA = {
  attesa: ['badge-accent', 'In attesa'],
  accettata: ['badge-good', 'Salvata'],
  rifiutata: ['badge-danger', 'Rifiutata'],
  ritirata: ['', 'Ritirata'],
}

// Le schede mandate a questo atleta, con lo stato; quelle in attesa si ritirano.
function ProposteMandate({ proposte, nome, onRitira, errore }) {
  const [tutte, setTutte] = useState(false)
  const visibili = tutte ? proposte : proposte.slice(0, 3)
  return (
    <>
      <div className="section-title" style={{ marginTop: 14 }}>Schede mandate a {nome}</div>
      {errore && <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 8 }}>{errore}</div>}
      <div className="stack" style={{ gap: 6 }}>
        {visibili.map((p) => {
          const [classe, testo] = STATO_PROPOSTA[p.stato] || ['', p.stato]
          return (
            <div key={p.id} className="card row" style={{ gap: 10, padding: '10px 12px', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>Mandata il {dataLunga(p.creataIl)}</div>
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <span className={'badge ' + classe}>{testo}</span>
                {p.stato === 'attesa' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRitira(p)}>
                    Ritira
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {proposte.length > 3 && !tutte && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setTutte(true)}>
          Vedi tutte ({proposte.length})
        </button>
      )}
    </>
  )
}

// Una scheda dell'atleta nell'elenco.
function CardScheda({ scheda, corrente = false, onApri }) {
  const { utenteCorrente } = useAccount()
  const tua = !!scheda.daPt?.id && scheda.daPt.id === utenteCorrente?.id
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
        {tua && <span className="badge badge-accent">Tua</span>}
        <span className="badge badge-accent">
          Settimana {scheda.settimanaCorrente}
          {scheda.senzaFine ? ' · senza fine' : ` di ${scheda.numeroSettimane}`}
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
function DettaglioScheda({ scheda, atleta, allenamenti = [], onIndietro }) {
  const settimana = scheda.settimanaCorrente || 1
  // ⚠️ Le schede degli altri arrivano SENZA completamenti (lib/collettivo): i
  // risultati in Excel si fanno con gli allenamenti che il PT può vedere —
  // pubblici e "solo PT", mai i nascosti — rimessi dentro la loro scheda.
  const conRisultati = useMemo(
    () => ({ ...scheda, completamenti: allenamenti.filter((a) => a.schedaId === scheda.id) }),
    [scheda, allenamenti],
  )
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro"><IconBack /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{scheda.nome}</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {atleta.nome} · settimana {settimana}
            {scheda.senzaFine ? '' : ` di ${scheda.numeroSettimane}`}
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

            {/* Le stesse card che vede lui (components/EsercizioCard): il
                cardio a tempo in una riga. */}
            {g.tipo === 'workout' && (
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {g.esercizi.map((e) => (
                  <div key={e.id}>
                    <EsercizioCard esercizio={e} settimana={settimana} />
                    {e.variaPerSettimana && <div className="ex-dati-nota">varia per settimana</div>}
                    <EsercizioAllegati esercizio={e} readOnly />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Qui si vede una settimana sola; il file le porta tutte, col nome
          dell'atleta dentro e nel nome del file. I risultati: come gli sta
          andando, coi pesi e i pallini di ogni settimana. */}
      <div className="stack" style={{ marginTop: 20, gap: 8 }}>
        <EsportaScheda scheda={conRisultati} atleta={atleta.nome} risultati />
        <EsportaScheda scheda={scheda} atleta={atleta.nome} />
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}
