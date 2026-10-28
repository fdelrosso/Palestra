import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { anelloDi, chiaveGiorno, classeGiorno, cosaOggi, raccogliCompletamenti } from '../lib/oggi'
import {
  chiaveData,
  conPausa,
  giornataDelCalendario,
  nomeGiornata,
  numeroGiorno,
  pianoScheda,
  schedaAttivaOra,
  schedaInCorso,
  senzaPausa,
  storicoProgramma,
} from '../lib/pianoScheda'
import { IconChevron } from '../components/icons'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
import AllenamentoTestata from '../components/AllenamentoTestata'
import GiornoProgramma from '../components/GiornoProgramma'
import { MESI as MESI_MINUSCOLI, RECAP_MESE_VISIBILE, celleDelMese, meseFinito } from '../lib/recapMese'

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

// "giovedì 18 ottobre", da un numeroGiorno.
const dataGiorno = (n) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(n * 86400000 + 43200000))

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

export default function CalendarPage() {
  const { schede, sessione, aggiornaScheda } = useStore()
  const { utenteCorrente } = useAccount()
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
  const celle = useMemo(() => celleDelMese(vista.anno, vista.mese), [vista])
  const chiaveOggi = chiaveGiorno(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())

  // La scheda che si sta seguendo e il suo programma (lib/pianoScheda): cosa
  // tocca nei prossimi giorni, allenamento o riposo, e cosa si è saltato.
  // `chiaveOggi` fra le dipendenze: a mezzanotte il programma va rifatto.
  const inCorso = useMemo(() => {
    const x = schedaInCorso(schede)
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    return x ? { ...x, piano: pianoScheda(x.scheda, new Date(a, m, g, 12)) } : null
  }, [schede, chiaveOggi])
  // I giorni passati della scheda attiva (saltato, in ritardo, pausa): si
  // ricostruiscono dagli allenamenti, così non spariscono riallenandosi.
  const attiva = useMemo(() => schedaAttivaOra(schede), [schede])
  const storico = useMemo(() => {
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    return storicoProgramma(attiva, new Date(a, m, g, 12))
  }, [attiva, chiaveOggi])
  const [pausaAperta, setPausaAperta] = useState(false)

  // Il legame toccato: un giorno in ritardo o anticipato e quello in cui lo si
  // è fatto davvero, accesi tutti e due, con la frase sotto la griglia.
  // { da, a: numeroGiorno, testo } | null
  const [legame, setLegame] = useState(null)

  const cambiaMese = (delta) => {
    setGiornoAperto(null)
    setLegame(null)
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

        {/* Il recap del mese (pages/RecapMesePage): per un mese finito con
            almeno un allenamento; in locale anche per quello in corso. */}
        {RECAP_MESE_VISIBILE && nelMese > 0 && (meseFinito(vista) || import.meta.env.DEV) && (
          <button className="cal-recap" onClick={() => navigate(routes.recapMese(vista))}>
            {`Recap di ${MESI_MINUSCOLI[vista.mese]}`}
            <IconChevron width={16} height={16} />
          </button>
        )}

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
            const data = new Date(vista.anno, vista.mese, giorno)
            const n = numeroGiorno(data)
            // Come appare (lib/pianoScheda, la stessa della settimana in Home):
            // `previsto` è il programma, che si tocca; `mancato` la storia.
            const giornata = fatto ? null : giornataDelCalendario(data, inCorso?.piano, storico, oggi)
            const previsto = !fatto && inCorso?.piano?.previsto(data) ? giornata : null
            const mancato = !fatto && !previsto && passato ? storico.get(n) : null
            const acceso = legame && (legame.da === n || legame.a === n) ? ' collegato' : ''
            const cls = classeGiorno({ fatto, oggi: oggiFlag, previsto: giornata, passato }) + acceso
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
            if (mancato) {
              const cosa =
                mancato.stato === 'pausa'
                  ? 'in pausa'
                  : mancato.stato === 'anticipato'
                    ? 'libero, allenamento anticipato'
                    : `${nomeGiornata(mancato.giornata)}, ${
                        { ritardo: 'fatto in ritardo', recuperabile: 'da recuperare entro domenica' }[mancato.stato] || 'saltato'
                      }`
              if (mancato.fattoIl) {
                const testo =
                  mancato.stato === 'ritardo'
                    ? `${nomeGiornata(mancato.giornata)}: in programma ${dataGiorno(n)}, fatto ${dataGiorno(mancato.fattoIl)}`
                    : `Libero ${dataGiorno(n)}: l’allenamento l’hai anticipato a ${dataGiorno(mancato.fattoIl)}`
                return (
                  <div key={i} className="cal-cell">
                    <button
                      className={cls}
                      onClick={() => setLegame(legame?.da === n ? null : { da: n, a: mancato.fattoIl, testo })}
                      aria-label={`${giorno}: ${cosa}`}
                      aria-pressed={legame?.da === n}
                    >
                      {giorno}
                    </button>
                  </div>
                )
              }
              return (
                <div key={i} className="cal-cell">
                  <div className={cls} aria-label={`${giorno}: ${cosa}`}>{giorno}</div>
                </div>
              )
            }
            if (previsto) {
              const cosa =
                previsto.tipo === 'rest'
                  ? 'riposo'
                  : previsto.tipo === 'pausa'
                    ? 'in pausa'
                    : previsto.tipo === 'esterno'
                    ? previsto.nome
                    : `${nomeGiornata(previsto)}${previsto.recuperabile ? ', da recuperare entro domenica' : previsto.saltato ? ', saltato' : ''}`
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

        {legame && (
          <p className="cal-legame" role="status">
            {legame.testo}
          </p>
        )}

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
              <span>
                <span className="cal-day recuperabile cal-day-mini" aria-hidden="true" />
                Da recuperare
              </span>
              <span>
                <span className="cal-day ritardo cal-day-mini" aria-hidden="true" />
                Spostato: toccalo
              </span>
              <span>
                <span className="cal-day pausa cal-day-mini" aria-hidden="true" />
                Pausa
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

      {/* Le pause (vacanza, malattia): non sono saltati, il programma si ferma. */}
      {attiva && (
        <button className="menu-voce" style={{ marginTop: 20 }} onClick={() => setPausaAperta(true)}>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="menu-voce-nome">Segna una pausa</span>
            <span className="menu-voce-desc">
              {attiva.pause?.length
                ? `${attiva.pause.length} ${attiva.pause.length === 1 ? 'pausa' : 'pause'} con «${attiva.nome}»`
                : 'Vacanza o malattia: quei giorni non contano come saltati'}
            </span>
          </span>
          <IconChevron className="faint" />
        </button>
      )}
      {pausaAperta && attiva && (
        <Pause
          scheda={attiva}
          onSalva={(s) => aggiornaScheda(s)}
          onChiudi={() => setPausaAperta(false)}
        />
      )}

      {/* L'elenco dei propri: sta nel profilo di Social (UtentePage), privati
          compresi col lucchetto. Quelli degli altri si guardano nel feed. */}
      <button
        className="menu-voce"
        style={{ marginTop: 20 }}
        onClick={() => utenteCorrente?.id && navigate(routes.utente(utenteCorrente.id))}
      >
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="menu-voce-nome">I tuoi allenamenti</span>
          <span className="menu-voce-desc">Nel tuo profilo, anche quelli privati</span>
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

// Le pause della scheda: quelle che ci sono (si tolgono) e una nuova, dal-al.
function Pause({ scheda, onSalva, onChiudi }) {
  const oggi = chiaveData(new Date())
  const [dal, setDal] = useState(oggi)
  const [al, setAl] = useState(oggi)
  const breve = (k) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(`${k}T12:00`))
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Pause" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>Pause</h3>
          <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          In pausa il programma si ferma: niente saltati, e al ritorno si riprende da dove eri.
        </p>
        <div className="stack" style={{ gap: 8 }}>
          {(scheda.pause || []).map((p, i) => (
            <div key={`${p.dal}-${p.al}-${i}`} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span>
                {p.dal === p.al ? breve(p.dal) : `Dal ${breve(p.dal)} al ${breve(p.al)}`}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => onSalva(senzaPausa(scheda, i))}>
                Togli
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 8 }}>
            <label className="grow">
              <span className="muted" style={{ fontSize: 12 }}>Dal</span>
              <input className="input" type="date" value={dal} onChange={(e) => setDal(e.target.value)} />
            </label>
            <label className="grow">
              <span className="muted" style={{ fontSize: 12 }}>Al</span>
              <input className="input" type="date" value={al} onChange={(e) => setAl(e.target.value)} />
            </label>
          </div>
          <button
            className="btn btn-accent btn-block"
            disabled={!dal || !al}
            onClick={() => onSalva(conPausa(scheda, `${dal}T12:00`, `${al}T12:00`))}
          >
            Aggiungi la pausa
          </button>
        </div>
      </div>
    </div>
  )
}
