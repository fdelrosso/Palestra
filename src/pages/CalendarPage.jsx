import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { anelloDi, chiaveGiorno, classeGiorno, cosaOggi, raccogliCompletamenti } from '../lib/oggi'
import { nomeGiornata, pianoScheda, schedaInCorso } from '../lib/pianoScheda'
import { IconChevron } from '../components/icons'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
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

// Il mese che si stava guardando: un allenamento si apre in una PAGINA sua
// (pages/AllenamentoSvoltoPage), e tornando indietro il calendario si rimonta
// da capo. Senza, da un allenamento di marzo si tornerebbe a ottobre.
let ultimaVista = null

// L'ora di fine, per scegliere fra due allenamenti dello stesso giorno.
const ora = (iso) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

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
  const { schede, sessione } = useStore()
  const oggi = new Date()
  const [vista, setVista] = useState(() => ultimaVista || { anno: oggi.getFullYear(), mese: oggi.getMonth() })
  useEffect(() => {
    ultimaVista = vista
  }, [vista])
  // Il giorno scelto, quando ci sono PIÙ allenamenti: si sceglie quale aprire.
  // Con uno solo si va dritti alla sua pagina (`apriGiorno`).
  const [giornoAperto, setGiornoAperto] = useState(null)

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

  // Toccare un giorno allenato: con un allenamento solo si apre la sua pagina
  // (lo stesso riepilogo di fine allenamento), con più d'uno si sceglie.
  // `sostituisci`: arrivati dalla home ("Vedi il recap", `?oggi`) il
  // calendario non resta in mezzo — indietro si torna alla home, e non qui
  // che rimanderebbe di nuovo all'allenamento.
  const apriGiorno = (k, { sostituisci = false } = {}) => {
    const arr = perGiorno.get(k) || []
    if (arr.length === 1) navigate(routes.svolto(chiaveAllenamento(arr[0])), { sostituisci })
    else if (arr.length > 1) setGiornoAperto(k)
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('oggi')) apriGiorno(chiaveOggi, { sostituisci: true })
    // Solo all'arrivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Il tocco su OGGI porta dove porta il riquadro grande della home: è la
  // stessa domanda (lib/oggi), e due risposte diverse confondono e basta.
  const vaiAOggi = () => {
    const o = cosaOggi({ schede, sessione, perGiorno, chiaveOggi })
    if (o.tipo === 'sessione') navigate(routes.allenamento())
    else if (o.tipo === 'fatto') apriGiorno(chiaveOggi)
    else if (o.tipo === 'scheda')
      navigate(o.giornoId ? routes.giornoScheda(o.schedaId, o.giornoId) : routes.scheda(o.schedaId))
    else if (o.tipo === 'finita') navigate(routes.home())
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
                    onClick={() => apriGiorno(k)}
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
                    : `${nomeGiornata(previsto)}${previsto.saltato ? ', saltato' : ''}`
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
            aria-label="Allenamenti del giorno"
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

            <div className="stack" style={{ gap: 10 }}>
              {completamentiGiorno.map((c) => (
                <button
                  key={chiaveAllenamento(c)}
                  className="menu-voce"
                  onClick={() => {
                    setGiornoAperto(null)
                    navigate(routes.svolto(chiaveAllenamento(c)))
                  }}
                >
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="menu-voce-nome">{c.nomeGiorno}</span>
                    <span className="menu-voce-desc">
                      {c.nomeScheda} · finito alle {ora(c.data)}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
