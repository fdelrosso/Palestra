import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { statoScheda } from '../lib/progression'
import { navigate, routes } from '../lib/router'
import { dataLunga } from '../lib/format'
import EsercizioCard from '../components/EsercizioCard'
import { IconArchivio, IconBed, IconCalendar, IconCheck, IconChevron, IconDumbbell, IconEdit, IconPlus } from '../components/icons'
import AllenamentoTestata from '../components/AllenamentoTestata'
import SchedeDalPt from '../components/SchedeDalPt'
import StradeInizio from '../components/StradeInizio'
import TastoConferma from '../components/TastoConferma'
import { schedaAttiva } from '../data/model'
import { chiaveData, conModifica, nomeGiornata, pianoScheda, schedaAttivaOra } from '../lib/pianoScheda'

function SchedaCard({ scheda, attiva = false }) {
  const stato = statoScheda(scheda)
  const perc = stato.totaliSettimana
    ? Math.round((stato.fattiSettimana / stato.totaliSettimana) * 100)
    : 0
  const prossimo = stato.schedaCompletata
    ? 'Scheda completata 🎉'
    : stato.giornoCorrente
      ? `Prossimo: ${stato.giornoCorrente.nome}`
      : 'Settimana completata: avanza di settimana'

  const testa = (
    <>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="nome">{scheda.nome}</div>
          {attiva && (
            <span className="badge badge-good" style={{ marginTop: 6 }}>
              <IconCheck width={13} height={13} /> Attiva
            </span>
          )}
          <div className="meta">
            <span className="badge badge-accent">
              Settimana {stato.settimana}
              {scheda.senzaFine ? '' : `/${scheda.numeroSettimane}`}
            </span>
            <span className="nowrap">
              {stato.fattiSettimana}/{stato.totaliSettimana} allenamenti
            </span>
          </div>
        </div>
        <IconChevron className="faint" />
      </div>

      <div className="progress" style={{ marginTop: 14 }}>
        <div
          className={'progress-fill' + (perc === 100 ? ' full' : '')}
          style={{ width: perc + '%' }}
        />
      </div>
      <div className="meta" style={{ marginTop: 10 }}>
        {prossimo}
      </div>
    </>
  )
  if (!attiva) {
    return (
      <button className="scheda-card" onClick={() => navigate(routes.scheda(scheda.id))}>
        {testa}
      </button>
    )
  }
  // La scheda attiva è già aperta: i suoi giorni sotto, come nella sua pagina
  // (SchedaPage, .day-row), e un tocco porta al giorno (2026-10-23).
  return (
    <div className="scheda-card">
      <button type="button" className="dieta-card-apri" onClick={() => navigate(routes.scheda(scheda.id))}>
        {testa}
      </button>
      <div className="stack giorni-elenco scheda-card-giorni">
        {scheda.giorni.map((g) => {
          if (g.tipo === 'rest') {
            return (
              <div key={g.id} className="day-row rest">
                <div className="day-dot">
                  <IconBed width={18} height={18} />
                </div>
                <div className="grow">
                  <div className="titolo">{g.nota ? `Rest · ${g.nota}` : 'Rest'}</div>
                  <div className="sub">Riposo</div>
                </div>
              </div>
            )
          }
          const done = stato.giro.has(g.id)
          const ora = stato.giornoCorrente?.id === g.id
          return (
            <button
              key={g.id}
              className={'day-row' + (ora ? ' current' : '')}
              onClick={() => navigate(routes.giornoScheda(scheda.id, g.id))}
            >
              <div className={'day-dot' + (done ? ' done' : ora ? ' current' : '')}>
                {done ? <IconCheck width={18} height={18} /> : <IconDumbbell width={18} height={18} />}
              </div>
              <div className="grow">
                <div className="titolo">{g.nome}</div>
                <div className="sub">
                  {done ? 'Completato' : ora ? 'Da fare oggi' : `${g.esercizi.length} esercizi`}
                </div>
              </div>
              <IconChevron className="faint" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Un allenamento TENUTO: un giorno della scheda-contenitore `libera` che
// l'utente ha scelto di salvare nel riepilogo (Giorno.salvato). Non è una
// scheda — non ha settimane né progressione — ma ne ha la stessa card (nome,
// badge, freccia): si apre per vedere cosa c'era dentro, e da lì si avvia, si
// modifica (NuovoAllenamentoPage con l'id), si mette in un giorno (MettiInGiorno)
// o si toglie.
// Toglierlo lo leva solo da qui (`salvato: false`): le volte in cui è stato
// fatto restano nello Storico.
function AllenamentoCard({ giorno, schedaId, ultima, onRipeti, onElimina }) {
  const [aperto, setAperto] = useState(false)
  const [inGiorno, setInGiorno] = useState(false)
  const n = giorno.esercizi.length
  return (
    <div className="scheda-card">
      <button
        type="button"
        className="dieta-card-apri"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
      >
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow" style={{ flex: 1, minWidth: 0 }}>
            <div className="nome">{giorno.nome || 'Allenamento'}</div>
            <div className="meta">
              <span className="badge badge-accent nowrap">
                {n} {n === 1 ? 'esercizio' : 'esercizi'}
              </span>
              {/* Quello che non si sa non si mostra: se non risulta mai svolto,
                  non si scrive una data finta né un trattino. */}
              {ultima && <span className="nowrap">Ultima volta: {dataLunga(ultima)}</span>}
            </div>
          </div>
          <IconChevron
            className="faint"
            style={{ transform: aperto ? 'rotate(90deg)' : undefined, flexShrink: 0, transition: 'transform .2s' }}
          />
        </div>
      </button>

      {aperto && (
        <>
          <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            {giorno.esercizi.map((e) => (
              <EsercizioCard key={e.id} esercizio={e} settimana={1} />
            ))}
          </div>
          <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={onRipeti}>
            Avvia allenamento
          </button>
          <div className="allenamento-card-tasti">
            <button className="btn btn-sm" onClick={() => navigate(routes.modificaAllenamento(giorno.id))}>
              <IconEdit width={15} height={15} aria-hidden="true" /> Modifica
            </button>
            <button className="btn btn-sm" onClick={() => setInGiorno(true)} aria-label="Mettilo in un giorno del calendario">
              <IconCalendar width={15} height={15} aria-hidden="true" /> Calendario
            </button>
          </div>
          <TastoConferma
            etichetta="Elimina allenamento"
            domanda={`Togliere "${giorno.nome || 'Allenamento'}" dagli allenamenti salvati? Le volte che l'hai fatto restano nello Storico.`}
            si="Sì, elimina"
            onConferma={onElimina}
            style={{ marginTop: 8 }}
          />
        </>
      )}
      {inGiorno && <MettiInGiorno giorno={giorno} schedaId={schedaId} onChiudi={() => setInGiorno(false)} />}
    </div>
  )
}

// Un allenamento salvato in un giorno del calendario: AL POSTO di quello che
// la scheda attiva aveva in programma quel giorno, come "Cambia" nel
// calendario (components/GiornoProgramma, Scheda.programma). Quel giorno la
// Home propone lui (pages/InizioPage). Senza una scheda attiva non c'è un
// programma in cui metterlo, e lo si dice.
function MettiInGiorno({ giorno, schedaId, onChiudi }) {
  const { schede, aggiornaScheda } = useStore()
  const attiva = schedaAttivaOra(schede)
  const piano = useMemo(() => pianoScheda(attiva), [attiva])
  const [chiave, setChiave] = useState(() => chiaveData(new Date()))
  const [a, m, g] = chiave.split('-').map(Number)
  const data = chiave ? new Date(a, m - 1, g, 12) : null
  const previsto = data && piano ? piano.previsto(data) : null
  const prima =
    previsto?.tipo === 'workout'
      ? `Al posto di ${nomeGiornata(previsto)}.`
      : previsto?.tipo === 'esterno'
        ? `Al posto di ${previsto.nome}.`
        : previsto?.tipo === 'rest'
          ? 'Quel giorno era riposo.'
          : 'Quel giorno non c’era niente in programma.'
  const metti = () => {
    aggiornaScheda(conModifica(attiva, data, { tipo: 'allenamento', schedaId, giornoId: giorno.id, nome: giorno.nome || 'Allenamento' }))
    onChiudi()
  }
  return (
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Mettilo in un giorno" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <h3 style={{ margin: '6px 0 4px' }}>Mettilo in un giorno</h3>
        {!attiva ? (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
            Serve una scheda attiva: è il suo calendario che dice cosa fare ogni giorno. Senza, avvialo quando vuoi da qui.
          </p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13.5, margin: '0 0 12px', lineHeight: 1.45 }}>
              «{giorno.nome || 'Allenamento'}» nel calendario di {attiva.nome}.
            </p>
            <input
              className="input"
              type="date"
              value={chiave}
              min={chiaveData(new Date())}
              onChange={(e) => setChiave(e.target.value)}
              aria-label="Giorno"
            />
            {data && <p style={{ fontSize: 14, margin: '10px 2px 14px' }}>{prima}</p>}
            <button className="btn btn-accent btn-block btn-lg" disabled={!data} onClick={metti}>
              Mettilo nel calendario
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          {attiva ? 'Annulla' : 'Chiudi'}
        </button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { schede, sessione, iniziaAllenamentoLibero, salvaAllenamento } = useStore()
  const [menu, setMenu] = useState(false)
  // La scheda-contenitore degli allenamenti liberi/consigliati non va in elenco:
  // non è un programma, e i suoi giorni si mostrano a parte qui sotto.
  // La scheda attiva (lib/pianoScheda) in cima, col ✓: è quella della Home.
  const attivaId = schedaAttivaOra(schede)?.id
  const mieSchede = schede.filter(schedaAttiva).sort((a, b) => (b.id === attivaId) - (a.id === attivaId))
  // Le archiviate: in fondo, chiuse finché non si aprono. Si riaprono da qui
  // e si ripristinano dalla loro pagina.
  const archiviate = schede.filter((s) => !s.libera && s.archiviata)
  const [vediArchiviate, setVediArchiviate] = useState(false)

  // Gli allenamenti tenuti, dal più recente. La data è quella dell'ultima volta
  // che quel giorno è stato svolto: sta nei completamenti del contenitore.
  const allenamenti = useMemo(() => {
    const contenitore = schede.find((s) => s.libera)
    if (!contenitore) return []
    const schedaId = contenitore.id
    const ultimaDi = (giornoId) => {
      const date = (contenitore.completamenti || [])
        .filter((c) => c.giornoId === giornoId && c.data)
        .map((c) => c.data)
      return date.length ? date.sort().at(-1) : null
    }
    return contenitore.giorni
      .filter((g) => g.salvato)
      .map((g) => ({ giorno: g, schedaId, ultima: ultimaDi(g.id) }))
      .sort((a, b) => (b.ultima || '').localeCompare(a.ultima || ''))
  }, [schede])

  // Rifare un allenamento tenuto = avviarne uno NUOVO con gli stessi esercizi.
  // ⚠️ Non si riusa lo stesso giorno: terminaSessione sostituisce il
  // completamento con la stessa coppia settimana+giornoId, e rifarlo
  // cancellerebbe la volta prima dallo storico.
  const rifai = (giorno) => {
    iniziaAllenamentoLibero({
      nome: giorno.nome,
      esercizi: giorno.esercizi,
      riscaldamento: giorno.riscaldamento,
      stretching: giorno.stretching,
    })
    navigate(routes.allenamento())
  }

  return (
    <div className="app">
      <AllenamentoTestata attiva="programmi" aperto={menu} setAperto={setMenu} />
      <SchedeDalPt />

      {sessione && (
        <button
          className="hero"
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
          onClick={() => navigate(routes.allenamento())}
        >
          <div className="kicker">Allenamento in corso</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{sessione.nomeGiorno}</span>
            <span className="badge badge-accent">Riprendi ›</span>
          </div>
        </button>
      )}

      {mieSchede.length === 0 && allenamenti.length === 0 ? (
        // Le stesse strade della Home (components/StradeInizio): prima qui c'era
        // solo "Ancora niente qui, tocca il +".
        <StradeInizio kicker="Per cominciare" titolo="Da dove parti?" />
      ) : (
        <>
          {/* Le SCHEDE sono i programmi: settimane, giorni, progressione. */}
          {mieSchede.length > 0 && (
            <>
              <div className="section-title">Schede</div>
              <div className="stack">
                {mieSchede.map((s) => (
                  <SchedaCard key={s.id} scheda={s} attiva={s.id === attivaId} />
                ))}
              </div>
            </>
          )}

          {/* Un allenamento singolo, scritto adesso (NuovoAllenamentoPage): il
              "+" in testata c'è, ma è nascosto in un menù. Con uno in corso no:
              lì si riprende. */}
          {!sessione && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-accent" onClick={() => navigate(routes.nuovoAllenamento())}>
                <IconPlus width={16} height={16} /> Nuovo allenamento
              </button>
            </div>
          )}

          {/* Gli ALLENAMENTI sono i singoli, tenuti a fine sessione. */}
          {allenamenti.length > 0 && (
            <>
              <div className="section-title">Allenamenti</div>
              <div className="stack">
                {allenamenti.map(({ giorno, schedaId, ultima }) => (
                  <AllenamentoCard
                    key={giorno.id}
                    giorno={giorno}
                    schedaId={schedaId}
                    ultima={ultima}
                    onRipeti={() => rifai(giorno)}
                    onElimina={() => salvaAllenamento(schedaId, giorno.id, false)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {archiviate.length > 0 && (
        <>
          <button
            type="button"
            className="section-title sezione-apribile"
            onClick={() => setVediArchiviate((v) => !v)}
            aria-expanded={vediArchiviate}
          >
            <IconArchivio width={17} height={17} className="faint" />
            <span className="grow">Archiviate</span>
            <span className="badge">{archiviate.length}</span>
            <IconChevron
              width={18}
              height={18}
              className="faint"
              style={{ transform: `rotate(${vediArchiviate ? -90 : 90}deg)` }}
            />
          </button>
          {vediArchiviate && (
            <div className="stack">
              {archiviate.map((s) => (
                <SchedaCard key={s.id} scheda={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
