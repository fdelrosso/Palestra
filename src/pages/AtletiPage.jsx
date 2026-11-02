import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import useAtleta, { useAndamenti } from '../hooks/useAtleta'
import SchedeDaConfermare from '../components/SchedeDaConfermare'
import RinnoviDaDecidere from '../components/RinnoviDaDecidere'
import AllungamentiDaDecidere from '../components/AllungamentiDaDecidere'
import AllegatiProposta from '../components/AllegatiProposta'
import BadgeAndamento from '../components/BadgeAndamento'
import { preparaModifica, proposteMandate, ritiraProposta, salvaBozzaPerAtleta, sbloccaSettimane } from '../lib/proposteScheda'
import { progressiSulla } from '../lib/cambiScheda'
import { formattaNumero } from '../lib/carico'
import { dataScadenza, domani, giornoIso, piuGiorni, scadenzaValida, statoScadenza } from '../lib/scadenza'
import { leggiSchedeLavoro } from '../lib/schedeLavoro'
import { isPt } from '../lib/pt'
import { dataLunga, periodoInParole } from '../lib/format'
import { leggiExAtleta, leggiExAtleti, togliExAtleta } from '../lib/exAtleti'
import { proposteDietaMandate } from '../lib/proposteDieta'
import { nomeGiornata, storicoProgramma } from '../lib/pianoScheda'
import EsercizioCard from '../components/EsercizioCard'
import ListaAllenamenti from '../components/ListaAllenamenti'
import RichiesteLavoro from '../components/RichiesteLavoro'
import EsercizioAllegati from '../components/EsercizioAllegati'
import EsportaScheda from '../components/EsportaScheda'
import DietaPerAtleta from '../components/DietaPerAtleta'
import DiarioAtleta from '../components/DiarioAtleta'
import FoglioScelte from '../components/FoglioScelte'
import { IconApple, IconBack, IconBed, IconChevron, IconClipboard, IconPlus } from '../components/icons'
import Avatar from '../components/Avatar'

// ---------------------------------------------------------------------------
// Sezione "Atleti" (dentro Lavoro): chi segui, e per ognuno la scheda su cui sta
// lavorando adesso, quelle di prima e gli allenamenti che ha svolto.
//
// Un PT vede anche ciò che l'atleta ha marcato "solo al PT"; resta fuori solo
// quello che ha scelto di nascondere a tutti (lib/visibilita).
// ---------------------------------------------------------------------------

// La linguetta aperta, ritrovata tornando indietro da un ex atleta.
let linguettaAtleti = 'attivi'

export default function AtletiPage({ id = null, ex = false }) {
  const { utenteCorrente, mieiAtleti } = useAccount()
  const [linguetta, setLinguetta] = useState(linguettaAtleti)
  const [exAtleti, setExAtleti] = useState(null)
  useEffect(() => {
    let vivo = true
    if (id || !isPt(utenteCorrente)) return undefined
    leggiExAtleti().then((r) => vivo && setExAtleti(r))
    return () => {
      vivo = false
    }
  }, [id, utenteCorrente])
  const scegli = (l) => {
    linguettaAtleti = l
    setLinguetta(l)
  }
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

  if (id && ex) return <DettaglioExAtleta id={id} onIndietro={() => goBack(routes.atleti())} />

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

      <div className="segmented" style={{ margin: '12px 0 4px' }}>
        <button
          className={'seg-btn' + (linguetta === 'attivi' ? ' on' : '')}
          onClick={() => scegli('attivi')}
          aria-pressed={linguetta === 'attivi'}
        >
          Atleti attivi · {mieiAtleti.length}
        </button>
        <button
          className={'seg-btn' + (linguetta === 'ex' ? ' on' : '')}
          onClick={() => scegli('ex')}
          aria-pressed={linguetta === 'ex'}
        >
          Ex atleti{exAtleti ? ` · ${exAtleti.length}` : ''}
        </button>
      </div>

      {linguetta === 'attivi' && mieiAtleti.length > 0 && (
        <div className="section-title" style={{ marginTop: 16 }}>
          {daGuardare > 0 ? `${daGuardare} da guardare` : 'Tutto in ordine'}
        </div>
      )}

      {linguetta === 'ex' ? (
        <ListaExAtleti ex={exAtleti} />
      ) : mieiAtleti.length === 0 ? (
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

// Chi seguivi: da quando a quando, e toccandolo quello che ha fatto in quel tempo.
function ListaExAtleti({ ex }) {
  if (!ex) return <p className="muted" style={{ marginTop: 14 }}>Un attimo…</p>
  if (ex.length === 0) {
    return (
      <div className="empty">
        <div className="big">🗂️</div>
        <p>
          Nessun ex atleta.
          <br />
          Quando smetti di seguire qualcuno, qui ritrovi schede, diete e allenamenti del periodo insieme.
        </p>
      </div>
    )
  }
  return (
    <div className="stack" style={{ gap: 8, marginTop: 12 }}>
      {ex.map((a) => (
        <button key={a.id} className="storico-card" onClick={() => navigate(routes.exAtleta(a.id))}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div className="row" style={{ gap: 10, minWidth: 0 }}>
              <Avatar id={a.id} nome={a.nome} taglia="" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5 }}>{a.nome}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>{periodoInParole(a.dal, a.al)}</div>
              </div>
            </div>
            <IconChevron className="faint" />
          </div>
        </button>
      ))}
    </div>
  )
}

// Un ex atleta: in sola lettura, solo il periodo in cui lo seguivi.
function DettaglioExAtleta({ id, onIndietro }) {
  const { utenteCorrente } = useAccount()
  const [atleta, setAtleta] = useState(undefined)
  const [dati, setDati] = useState(null)
  const [diete, setDiete] = useState([])
  const [tab, setTab] = useState('allenamenti')
  const [schedaAperta, setSchedaAperta] = useState(null)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    let vivo = true
    leggiExAtleti().then(async (tutti) => {
      const a = tutti.find((x) => x.id === id) || null
      const letti = a ? await leggiExAtleta(a) : null
      if (!vivo) return
      setAtleta(a)
      setDati(letti)
    })
    proposteDietaMandate(utenteCorrente?.id).then((r) => {
      if (vivo) setDiete(r.filter((p) => p.atletaId === id && p.stato === 'accettata'))
    })
    return () => {
      vivo = false
    }
  }, [id, utenteCorrente?.id])

  const togli = async () => {
    if (!window.confirm(`Togliere ${atleta.nome} dagli ex atleti? Non vedrai più schede, diete e allenamenti di quel periodo.`)) return
    const esito = await togliExAtleta(id)
    if (esito.ok) onIndietro()
    else setErrore(esito.errore)
  }

  if (schedaAperta) {
    return (
      <DettaglioScheda
        scheda={schedaAperta}
        atleta={atleta}
        allenamenti={dati.allenamenti}
        soloLettura
        onIndietro={() => setSchedaAperta(null)}
      />
    )
  }

  const testa = (
    <div className="topbar">
      <button className="icon-btn" onClick={onIndietro} aria-label="Indietro"><IconBack /></button>
      {atleta ? (
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <Avatar id={atleta.id} nome={atleta.nome} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18 }}>{atleta.nome}</h1>
            <div className="muted" style={{ fontSize: 12.5 }}>{periodoInParole(atleta.dal, atleta.al)}</div>
          </div>
        </div>
      ) : (
        <h1>Ex atleti</h1>
      )}
    </div>
  )
  if (atleta === undefined) return <div className="app">{testa}<p className="muted">Un attimo…</p></div>
  if (!atleta || !dati) {
    return (
      <div className="app">
        {testa}
        <div className="empty">
          <div className="big">🗂️</div>
          <p>{atleta ? 'Non riesco a leggere i suoi dati adesso. Riprova fra poco.' : 'Questa persona non è fra i tuoi ex atleti.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {testa}
      <div className="segmented" style={{ margin: '4px 0 14px' }}>
        <button className={'seg-btn' + (tab === 'allenamenti' ? ' on' : '')} onClick={() => setTab('allenamenti')} aria-pressed={tab === 'allenamenti'}>
          Allenamenti · {dati.allenamenti.length}
        </button>
        <button className={'seg-btn' + (tab === 'schede' ? ' on' : '')} onClick={() => setTab('schede')} aria-pressed={tab === 'schede'}>
          Schede · {dati.schede.length}
        </button>
        <button className={'seg-btn' + (tab === 'dieta' ? ' on' : '')} onClick={() => setTab('dieta')} aria-pressed={tab === 'dieta'}>
          Dieta
        </button>
      </div>

      {tab === 'dieta' ? (
        <>
          {diete.length > 0 && (
            <>
              <div className="section-title">Diete mandate · {diete.length}</div>
              <div className="stack" style={{ gap: 6, marginBottom: 14 }}>
                {diete.map((d) => (
                  <div key={d.id} className="card" style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.nome}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>Mandata il {dataLunga(d.creataIl)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <DiarioAtleta atleta={atleta} giorniEx={dati.diario} inizio={giornoIso(new Date(atleta.al))} />
        </>
      ) : tab === 'allenamenti' ? (
        <ListaAllenamenti
          voci={dati.allenamenti}
          mostraUtente={false}
          mostraVisibilita
          vuoto={`Nel periodo insieme ${atleta.nome} non ha allenamenti che puoi vedere.`}
        />
      ) : dati.schede.length === 0 ? (
        <div className="empty">
          <div className="big">📋</div>
          <p>Nel periodo insieme {atleta.nome} non ha schede che tu possa vedere.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {dati.schede.map((s) => (
            <CardScheda key={s.id} scheda={s} onApri={() => setSchedaAperta(s)} />
          ))}
        </div>
      )}

      {errore && <p className="form-error">{errore}</p>}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 24 }} onClick={togli}>
        Togli {atleta.nome} dagli ex atleti
      </button>
      <div style={{ height: 16 }} />
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
  const [menu, setMenu] = useState(false)
  const [scegliPartenza, setScegliPartenza] = useState(false)
  const [scegliDieta, setScegliDieta] = useState(false)
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
        {/* Il "+": la porta per tutto quello che nasce per questo atleta, come
            nelle sezioni Allenamento e Dieta. */}
        <button
          className="icon-btn icon-btn-pieno"
          style={{ marginLeft: 'auto', flexShrink: 0 }}
          onClick={() => setMenu(true)}
          aria-label={`Nuova scheda o dieta per ${atleta.nome}`}
          aria-expanded={menu}
        >
          <IconPlus />
        </button>
      </div>

      <BadgeAndamento andamento={andamento} style={{ marginTop: 2 }} />

      {menu && (
        <FoglioScelte
          titolo={`Per ${atleta.nome}`}
          scelte={[
            {
              id: 'scheda',
              nome: 'Nuova scheda',
              desc: 'Da zero, importata o da una delle tue schede da inviare',
              Icona: IconClipboard,
              vai: () => setScegliPartenza(true),
            },
            {
              id: 'dieta',
              nome: 'Nuova dieta',
              desc: 'Una delle tue diete o solo i macro',
              Icona: IconApple,
              vai: () => setScegliDieta(true),
            },
          ]}
          onChiudi={() => setMenu(false)}
        />
      )}

      {/* Le schede scadute di cui chiede il rinnovo (lib/proposteScheda). */}
      <RinnoviDaDecidere
        atletaId={atleta.id}
        onDeciso={(r, esito) =>
          esito.accetto &&
          setMandate((tutte) => tutte.map((x) => (x.id === r.propostaId ? { ...x, scadeIl: esito.scadenza } : x)))
        }
      />
      {/* Le schede che chiede di allungare: "Allunga" riapre l'editor. */}
      <AllungamentiDaDecidere atletaId={atleta.id} />

      {mandate.length > 0 && (
        <ProposteMandate
          proposte={mandate}
          nome={atleta.nome}
          onRitira={ritira}
          errore={erroreRitiro}
          onSbloccata={(id, fino, scadeIl) =>
            setMandate((tutte) =>
              tutte.map((x) => (x.id === id ? { ...x, settimaneVisibili: fino, scadeIl: scadeIl || x.scadeIl } : x)),
            )
          }
        />
      )}

      {scegliPartenza && <SceltaPartenza atleta={atleta} onChiudi={() => setScegliPartenza(false)} />}

      {/* La dieta: un piano intero o solo i macro (components/DietaPerAtleta). */}
      <DietaPerAtleta atleta={atleta} aperto={scegliDieta} setAperto={setScegliDieta} />

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
          vuoto={`Da quando segui ${atleta.nome} non ci sono ancora allenamenti che puoi vedere.`}
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
          if (window.confirm(`Smettere di seguire ${atleta.nome}? Quello che ha fatto finora resta fra gli ex atleti.`)) {
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
function ProposteMandate({ proposte, nome, onRitira, errore, onSbloccata }) {
  const [tutte, setTutte] = useState(false)
  const [erroreModifica, setErroreModifica] = useState('')
  const [sblocca, setSblocca] = useState(null)
  const [allegati, setAllegati] = useState(null)
  const visibili = tutte ? proposte : proposte.slice(0, 3)
  return (
    <>
      <div className="section-title" style={{ marginTop: 14 }}>Schede mandate a {nome}</div>
      {errore && <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 8 }}>{errore}</div>}
      <div className="stack" style={{ gap: 6 }}>
        {visibili.map((p) => {
          const [classe, testo] = STATO_PROPOSTA[p.stato] || ['', p.stato]
          const viva = p.stato === 'attesa' || p.stato === 'accettata'
          const scad = viva ? statoScadenza(p.scadeIl) : null
          const aParti = viva && p.settimaneTotali && p.settimaneVisibili < p.settimaneTotali
          return (
            <div key={p.id} className="card row" style={{ gap: 10, padding: '10px 12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>Mandata il {dataLunga(p.creataIl)}</div>
                {scad && (
                  <div className="muted" style={{ fontSize: 12.5, color: scad.scaduta ? 'var(--danger)' : undefined }}>
                    {scad.scaduta ? 'Scaduta' : 'Scade'} il {dataScadenza(p.scadeIl)}
                  </div>
                )}
                {p.settimaneTotali && viva && (
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {nome} vede {p.settimaneVisibili} settimane su {p.settimaneTotali}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <span className={'badge ' + classe}>{testo}</span>
                {p.stato === 'attesa' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRitira(p)}>
                    Ritira
                  </button>
                )}
              </div>
              {aParti && (
                <button type="button" className="btn btn-sm btn-accent btn-block" onClick={() => setSblocca(p)}>
                  Sblocca altre settimane
                </button>
              )}
              {/* Video, foto e consigli sugli esercizi, anche dopo l'invio
                  (components/AllegatiProposta). */}
              {viva && (
                <div className="row" style={{ gap: 6, width: '100%' }}>
                  <ModificaScheda proposta={p} onErrore={setErroreModifica} />
                  <button type="button" className="btn btn-sm grow" onClick={() => setAllegati(p)}>
                    Video e consigli
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {erroreModifica && <p className="form-error">{erroreModifica}</p>}
      {allegati && <AllegatiProposta proposta={allegati} nome={nome} onChiudi={() => setAllegati(null)} />}
      {sblocca && (
        <SbloccaSettimane
          proposta={sblocca}
          nome={nome}
          onChiudi={() => setSblocca(null)}
          onFatto={(fino, scadeIl) => {
            onSbloccata(sblocca.id, fino, scadeIl)
            setSblocca(null)
          }}
        />
      )}
      {proposte.length > 3 && !tutte && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setTutte(true)}>
          Vedi tutte ({proposte.length})
        </button>
      )}
    </>
  )
}

// Sblocca altre settimane di una scheda a parti (lib/schedaAParti): fino a
// quale (proposta: un'altra parte come la prima) e, se si vuole, la scadenza
// nuova insieme — il mese pagato.
function SbloccaSettimane({ proposta: p, nome, onChiudi, onFatto }) {
  const passo = p.settimanePasso || 4
  const [fino, setFino] = useState(Math.min(p.settimaneTotali, p.settimaneVisibili + passo))
  const [spostaScadenza, setSpostaScadenza] = useState(!!p.scadeIl)
  const [scadeIl, setScadeIl] = useState(() => piuGiorni(giornoIso(), passo * 7))
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')
  const scelte = Array.from({ length: p.settimaneTotali - p.settimaneVisibili }, (_, i) => p.settimaneVisibili + i + 1)

  const sblocca = async () => {
    const scadenza = spostaScadenza ? scadeIl : null
    if (scadenza && !scadenzaValida(scadenza)) return setErrore('La scadenza va messa da domani in poi.')
    setOccupato(true)
    setErrore('')
    const r = await sbloccaSettimane(p.id, fino, scadenza)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    onFatto(fino, scadenza)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Sblocca altre settimane" onClick={(e) => e.stopPropagation()}>
        <h3>«{p.nome}»: sblocca altre settimane</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 12px' }}>
          Ora {nome} vede le settimane 1–{p.settimaneVisibili} di {p.settimaneTotali}.
        </p>
        <div className="field">
          <label htmlFor="sblocca-fino">Fino alla settimana</label>
          <select id="sblocca-fino" className="input" value={fino} onChange={(e) => setFino(Number(e.target.value))}>
            {scelte.map((n) => (
              <option key={n} value={n}>
                {n}
                {n === p.settimaneTotali ? ' (tutta)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={spostaScadenza} onChange={(e) => setSpostaScadenza(e.target.checked)} />
            Sposta anche la scadenza
          </label>
          {spostaScadenza && (
            <input
              type="date"
              className="input"
              style={{ marginTop: 8 }}
              aria-label="Nuova scadenza"
              min={domani()}
              value={scadeIl}
              onChange={(e) => setScadeIl(e.target.value)}
            />
          )}
        </div>
        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn grow" onClick={onChiudi}>
            Annulla
          </button>
          <button type="button" className="btn btn-accent grow" onClick={sblocca} disabled={occupato}>
            {occupato ? 'Un attimo…' : 'Sblocca'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
function DettaglioScheda({ scheda, atleta, allenamenti = [], soloLettura = false, onIndietro }) {
  const { utenteCorrente } = useAccount()
  const settimana = scheda.settimanaCorrente || 1
  const [erroreModifica, setErroreModifica] = useState('')
  // Mandata da te (lib/proposteScheda): la puoi cambiare quando vuoi.
  const tuaDaCambiare = !soloLettura && !!scheda.daPt?.propostaId && scheda.daPt.id === utenteCorrente?.id
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

      {tuaDaCambiare && (
        <div className="row" style={{ marginBottom: 12 }}>
          <ModificaScheda
            proposta={{ id: scheda.daPt.propostaId, atletaId: atleta.id }}
            onErrore={setErroreModifica}
            accento
          />
        </div>
      )}
      {erroreModifica && <p className="form-error">{erroreModifica}</p>}

      <ProgressiScheda scheda={scheda} allenamenti={allenamenti} nome={atleta.nome} />

      {/* Di un ex atleta si vedono solo gli allenamenti insieme: il resto
          sembrerebbe saltato. */}
      {!soloLettura && <Mancati scheda={conRisultati} />}

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

// "Modifica la scheda": la riapre nell'editor com'è adesso, e da lì si
// rimanda (lib/proposteScheda → LA MODIFICA; all'atleta la notifica con cosa
// è cambiato).
function ModificaScheda({ proposta, onErrore, accento = false }) {
  const [occupato, setOccupato] = useState(false)
  const apri = async () => {
    onErrore('')
    setOccupato(true)
    const r = await preparaModifica(proposta)
    setOccupato(false)
    if (!r.ok) return onErrore(r.errore)
    navigate(routes.schedaPerAtleta(proposta.atletaId))
  }
  return (
    <button type="button" className={'btn btn-sm grow' + (accento ? ' btn-accent' : '')} onClick={apri} disabled={occupato}>
      {occupato ? 'Un attimo…' : 'Modifica la scheda'}
    </button>
  )
}

// Come sta andando su questa scheda (lib/cambiScheda → progressiSulla): gli
// allenamenti fatti che puoi vedere e, per esercizio, il carico della prima e
// dell'ultima volta. I pesi sono quelli scritti chiudendo le serie.
function ProgressiScheda({ scheda, allenamenti, nome }) {
  const p = useMemo(() => progressiSulla(scheda, allenamenti), [scheda, allenamenti])
  const kg = (n) => (n == null ? '–' : `${formattaNumero(n)} kg`)
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 800, fontSize: 15.5 }}>Progressi</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        {p.volte === 0
          ? `${nome} non ha ancora fatto allenamenti che tu possa vedere su questa scheda.`
          : `${p.volte} allenament${p.volte === 1 ? 'o' : 'i'} · l’ultimo ${dataLunga(p.ultimo)}`}
      </div>
      {p.volte > 0 && (
        <div className="stack" style={{ gap: 6, marginTop: 10 }}>
          {p.esercizi.map((e) => {
            const su = e.primoKg != null && e.ultimoKg != null ? e.ultimoKg - e.primoKg : null
            return (
              <div key={e.nome} className="row" style={{ justifyContent: 'space-between', gap: 8, fontSize: 13.5 }}>
                <span style={{ minWidth: 0 }}>
                  <strong>{e.nome}</strong>
                  <span className="muted"> · {e.volte ? `${e.volte} volt${e.volte === 1 ? 'a' : 'e'}` : 'mai fatto'}</span>
                </span>
                {e.volte > 0 && (
                  <span style={{ flexShrink: 0, textAlign: 'right' }}>
                    {e.primoKg === e.ultimoKg ? kg(e.ultimoKg) : `${kg(e.primoKg)} → ${kg(e.ultimoKg)}`}
                    {su != null && su !== 0 && (
                      <span style={{ color: su > 0 ? 'var(--good)' : 'var(--danger)', marginLeft: 6 }}>
                        {su > 0 ? '+' : ''}
                        {formattaNumero(su)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// I giorni saltati, in ritardo e di pausa della scheda (lib/pianoScheda,
// storicoProgramma), i più recenti in cima. ⚠️ Con gli allenamenti che il PT
// vede: uno nascosto a tutti qui sembra saltato.
function Mancati({ scheda }) {
  const voci = useMemo(() => [...storicoProgramma(scheda)].sort((a, b) => b[0] - a[0]), [scheda])
  if (!voci.length) return null
  const quando = (n) =>
    new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(n * 86400000))
  const conta = (stato) => voci.filter(([, x]) => x.stato === stato).length
  return (
    <details className="card" style={{ marginBottom: 14 }}>
      <summary style={{ fontWeight: 700, cursor: 'pointer' }}>
        Saltati {conta('saltato')} · in ritardo {conta('ritardo')} · pausa {conta('pausa')}
      </summary>
      <div className="stack" style={{ gap: 4, marginTop: 8, fontSize: 13.5 }}>
        {voci.slice(0, 30).map(([n, x]) => (
          <div key={n} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span>{quando(n)}</span>
            <span className={x.stato === 'pausa' ? 'faint' : 'muted'}>
              {x.stato === 'pausa'
                ? 'Pausa'
                : x.stato === 'anticipato'
                  ? 'Libero · anticipato'
                  : `${nomeGiornata(x.giornata)} · ${
                    { ritardo: 'in ritardo', recuperabile: 'da recuperare' }[x.stato] || 'saltato'
                  }`}
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}
