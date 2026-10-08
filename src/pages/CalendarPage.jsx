import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import {
  anelloDi,
  chiaveDaData,
  chiaveGiorno,
  classeGiorno,
  cosaOggi,
  raccogliCompletamenti,
} from '../lib/oggi'
import { pianoScheda, schedaInCorso } from '../lib/pianoScheda'
import { IconChevron } from '../components/icons'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import AzioniAllenamento from '../components/AzioniAllenamento'
import { chiaveAllenamento, eliminaFotoDiAllenamento, spostaFotoAllenamento } from '../lib/fotoAllenamento'
import { spostaInterazioni } from '../lib/interazioni'
import AllenamentoTestata from '../components/AllenamentoTestata'
import GiornoProgramma from '../components/GiornoProgramma'

const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]
const GIORNI_SETT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Data lunga in italiano, con l'iniziale maiuscola. Es. "Lunedì 1 settembre 2026".
function dataLunga(iso) {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Celle del mese (settimana che parte da lunedì); null = cella vuota.
function celleMese(anno, mese) {
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate()
  const primoDow = new Date(anno, mese, 1).getDay() // 0=Dom..6=Sab
  const offset = (primoDow + 6) % 7 // quanti vuoti prima (lunedì-first)
  const celle = []
  for (let i = 0; i < offset; i++) celle.push(null)
  for (let g = 1; g <= giorniNelMese; g++) celle.push(g)
  while (celle.length % 7 !== 0) celle.push(null)
  return celle
}

export default function CalendarPage() {
  const { schede, sessione, aggiornaCompletamento, eliminaCompletamento } = useStore()
  const { utenteCorrente } = useAccount()
  const oggi = new Date()
  const [vista, setVista] = useState({ anno: oggi.getFullYear(), mese: oggi.getMonth() })
  // Chiave del giorno selezionato. `?oggi` nell'indirizzo = arrivati dalla
  // home toccando l'allenamento già fatto oggi: si apre subito il suo recap.
  const [giornoAperto, setGiornoAperto] = useState(() =>
    new URLSearchParams(window.location.search).has('oggi')
      ? chiaveGiorno(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
      : null,
  )

  // Il giorno del programma aperto dal calendario (una Date): il riquadro
  // ricalcola da sé cosa c'è, così dopo averlo cambiato si vede subito.
  const [previstoAperto, setPrevistoAperto] = useState(null)
  const perGiorno = useMemo(() => raccogliCompletamenti(schede), [schede])
  const celle = useMemo(() => celleMese(vista.anno, vista.mese), [vista])
  const chiaveOggi = chiaveGiorno(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())

  // La scheda che si sta seguendo e il suo programma (lib/pianoScheda): cosa
  // tocca nei prossimi giorni, allenamento o riposo, e cosa si è saltato.
  // `chiaveOggi` fra le dipendenze: a mezzanotte il programma va rifatto.
  const inCorso = useMemo(() => {
    const x = schedaInCorso(schede)
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    return x ? { ...x, piano: pianoScheda(x.scheda, new Date(a, m, g, 12)) } : null
  }, [schede, chiaveOggi])

  const cambiaMese = (delta) => {
    setGiornoAperto(null)
    setVista((v) => {
      const d = new Date(v.anno, v.mese + delta, 1)
      return { anno: d.getFullYear(), mese: d.getMonth() }
    })
  }
  const vaiaOggi = () => {
    setGiornoAperto(null)
    setVista({ anno: oggi.getFullYear(), mese: oggi.getMonth() })
  }

  // Quanti allenamenti nel mese visualizzato.
  const nelMese = useMemo(() => {
    let n = 0
    for (const [k, arr] of perGiorno) {
      const [a, m] = k.split('-').map(Number)
      if (a === vista.anno && m === vista.mese) n += arr.length
    }
    return n
  }, [perGiorno, vista])

  const completamentiGiorno = giornoAperto ? perGiorno.get(giornoAperto) || [] : []

  // Correggere un allenamento già svolto (il caso tipico: «Termina» premuto il
  // giorno dopo, e l'allenamento risulta di 16 ore fatto oggi).
  // ⚠️ Se cambia la DATA cambia anche l'identità dell'allenamento: le foto del
  // feed ci sono attaccate con quella chiave e vanno spostate con lui — e così
  // i mi piace e i commenti (lib/interazioni) — e il
  // recap aperto lo segue sul giorno nuovo — se no si chiuderebbe vuoto e
  // sembrerebbe che l'allenamento sia sparito.
  const salvaModifica = (c, patch, cambiaData) => {
    aggiornaCompletamento(c.schedaId, c.data, patch)
    if (!cambiaData) return
    const vecchia = chiaveAllenamento(c)
    const nuova = chiaveAllenamento({ schedaId: c.schedaId, data: patch.data })
    spostaFotoAllenamento(utenteCorrente?.id, vecchia, nuova)
    spostaInterazioni(vecchia, nuova)
    const d = new Date(patch.data)
    setVista({ anno: d.getFullYear(), mese: d.getMonth() })
    setGiornoAperto(chiaveDaData(patch.data))
  }
  const dataOccupata = (schedaId) => (data) =>
    (schede.find((s) => s.id === schedaId)?.completamenti || []).some((x) => x.data === data)

  // Il tocco su OGGI porta dove porta il riquadro grande della home: è la
  // stessa domanda (lib/oggi), e due risposte diverse confondono e basta.
  const vaiAOggi = () => {
    const o = cosaOggi({ schede, sessione, perGiorno, chiaveOggi })
    if (o.tipo === 'sessione') navigate(routes.allenamento())
    else if (o.tipo === 'fatto') setGiornoAperto(chiaveOggi)
    else if (o.tipo === 'scheda')
      navigate(o.giornoId ? routes.giornoScheda(o.schedaId, o.giornoId) : routes.scheda(o.schedaId))
    else navigate(routes.consigliato())
  }
  // Toccando OGGI, con un programma e niente di fatto né in corso, si apre il
  // giorno del programma invece di andare dritti: è l'unico modo di CAMBIARE
  // cosa fare oggi.
  const oggiDalProgramma = !sessione && !perGiorno.get(chiaveOggi)?.length && !!inCorso?.piano?.oggi


  return (
    <div className="app">
      <AllenamentoTestata attiva="storico" />

      {/* IL MESE, tutto in una card: in testa il mese e quanti allenamenti, poi
          la griglia, e dietro il numero del mese grande e tenue. Un giorno
          allenato e' un ANELLO coi colori dei muscoli lavorati (anelloDi); oggi
          ha un anello del colore dell'app; grigio = passato, piu' tenue = deve
          ancora venire. */}
      <section className="cal-card">
        <span className="cal-filigrana" aria-hidden="true">
          {vista.mese + 1}
        </span>
        <div className="cal-nav">
          <button className="cal-mese" onClick={vaiaOggi} title="Vai a oggi">
            <span className="cal-mese-nome">{MESI[vista.mese]}</span>
            <span className="cal-mese-anno">{vista.anno}</span>
            <span className="cal-mese-conto">
              {nelMese === 0
                ? 'Nessun allenamento'
                : `${nelMese} ${nelMese === 1 ? 'allenamento' : 'allenamenti'}`}
            </span>
          </button>
          <button className="cal-freccia" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
            <IconChevron style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button className="cal-freccia" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
            <IconChevron />
          </button>
        </div>

        {/* Intestazione giorni della settimana: l'iniziale basta. */}
        <div className="cal-grid cal-dow">
          {GIORNI_SETT.map((g) => (
            <div key={g} className="cal-dow-cell" aria-label={g}>
              {g.charAt(0)}
            </div>
          ))}
        </div>

        {/* Griglia dei giorni */}
        <div className="cal-grid">
          {celle.map((giorno, i) => {
            if (!giorno) return <div key={i} className="cal-cell" />
            const k = chiaveGiorno(vista.anno, vista.mese, giorno)
            const fatto = perGiorno.has(k)
            const oggiFlag = k === chiaveOggi
            const passato =
              new Date(vista.anno, vista.mese, giorno) <
              new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
            // Il programma della scheda: da oggi in poi cosa tocca, prima di
            // oggi gli allenamenti saltati. Un giorno fatto resta "fatto".
            const previsto =
              !fatto && inCorso?.piano ? inCorso.piano.previsto(new Date(vista.anno, vista.mese, giorno)) : null
            const cls = classeGiorno({ fatto, oggi: oggiFlag, previsto, passato })
            // Oggi è sempre toccabile (vedi vaiAOggi). Con un programma per
            // oggi si apre il giorno del programma (`oggiDalProgramma`).
            if (oggiFlag) {
              return (
                <div key={i} className="cal-cell">
                  <button
                    className={cls}
                    onClick={oggiDalProgramma ? () => setPrevistoAperto(new Date()) : vaiAOggi}
                    aria-label="Oggi: apri l'allenamento di oggi"
                  >
                    {giorno}
                  </button>
                </div>
              )
            }
            if (fatto) {
              return (
                <div key={i} className="cal-cell">
                  <button
                    className={cls}
                    style={{ '--anello': anelloDi(perGiorno.get(k)) }}
                    onClick={() => setGiornoAperto(k)}
                    aria-label={`${giorno}: allenamento svolto`}
                  >
                    {giorno}
                  </button>
                </div>
              )
            }
            if (previsto) {
              const cosa =
                previsto.tipo === 'rest'
                  ? 'riposo'
                  : previsto.tipo === 'esterno'
                    ? previsto.nome
                    : `${previsto.giorno.nome}${previsto.saltato ? ', saltato' : ''}`
              return (
                <div key={i} className="cal-cell">
                  <button
                    className={cls}
                    onClick={() => setPrevistoAperto(new Date(vista.anno, vista.mese, giorno))}
                    aria-label={`${giorno}: ${cosa}`}
                  >
                    {giorno}
                  </button>
                </div>
              )
            }
            return (
              <div key={i} className="cal-cell">
                <div className={cls}>{giorno}</div>
              </div>
            )
          })}
        </div>

        {/* Legenda, in una riga */}
        <div className="cal-legenda">
          <span>
            <span className="cal-day done cal-day-mini" aria-hidden="true" />
            Allenamento: i colori sono i muscoli
          </span>
          <span>
            <span className="cal-day today cal-day-mini" aria-hidden="true" />
            Oggi
          </span>
          {inCorso?.piano && (
            <>
              <span>
                <span className="cal-day previsto cal-day-mini" aria-hidden="true" />
                In programma con «{inCorso.scheda.nome}»
              </span>
              <span>
                <span className="cal-day riposo cal-day-mini" aria-hidden="true" />
                Riposo
              </span>
              <span>
                <span className="cal-day saltato cal-day-mini" aria-hidden="true" />
                Saltato
              </span>
            </>
          )}
        </div>
      </section>

      {/* Un giorno del programma: cosa tocca (dritti all'allenamento), e da
          oggi in poi si può cambiare. */}
      {previstoAperto && inCorso?.piano && (
        <GiornoProgramma
          data={previstoAperto}
          scheda={inCorso.scheda}
          piano={inCorso.piano}
          onChiudi={() => setPrevistoAperto(null)}
        />
      )}

      {/* L'elenco, coi propri e con quelli pubblici degli altri. */}
      <button className="menu-voce" style={{ marginTop: 20 }} onClick={() => navigate(routes.storico())}>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="menu-voce-nome">Tutti gli allenamenti</span>
          <span className="menu-voce-desc">In elenco: i tuoi e quelli pubblici degli altri</span>
        </span>
        <IconChevron className="faint" />
      </button>

      {/* Recap del giorno selezionato */}
      {giornoAperto && (
        <div className="modal-backdrop" onClick={() => setGiornoAperto(null)}>
          <div
            className="modal"
            role="dialog"
            aria-label="Recap del giorno"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}
            >
              <h3 style={{ marginBottom: 0 }}>
                {dataLunga(completamentiGiorno[0]?.data || new Date().toISOString())}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setGiornoAperto(null)}>
                Chiudi
              </button>
            </div>

            {completamentiGiorno.map((c, i) => (
              <div
                key={i}
                style={
                  i > 0 ? { marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' } : undefined
                }
              >
                <div className="cal-recap-scheda">{c.nomeScheda}</div>
                {c.dettagliato ? (
                  <RiepilogoDettaglio riep={c} />
                ) : (
                  <div className="card">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{c.nomeGiorno}</div>
                      {c.settimana != null && <span className="badge">Settimana {c.settimana}</span>}
                    </div>
                    <p className="muted" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.4 }}>
                      Segnato come completato manualmente — nessun dettaglio delle serie registrato.
                    </p>
                  </div>
                )}

                <AzioniAllenamento
                  c={c}
                  occupata={dataOccupata(c.schedaId)}
                  onSalvaModifica={(patch, cambiaData) => salvaModifica(c, patch, cambiaData)}
                  onElimina={() => {
                    eliminaCompletamento(c.data, c.schedaId)
                    eliminaFotoDiAllenamento(chiaveAllenamento(c))
                    setGiornoAperto(null)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
