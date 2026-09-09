import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { statoScheda } from '../lib/progression'
import { dietaAttiva } from '../lib/dieta'
import { analizzaStorico, gruppiConsigliati, oggiEAllenamento } from '../lib/consiglio'
import { gruppoDi } from '../lib/muscoli'
import { statisticheRecap } from '../lib/recap'
import { TIPO_CONDIVISIONE } from '../lib/condivisioni'
import CondividiConAmici from '../components/CondividiConAmici'
import { IconChevron, IconDumbbell, IconApple, IconShare } from '../components/icons'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import VisibilitaPicker from '../components/VisibilitaPicker'
import ProfiloMenu from '../components/ProfiloMenu'
import ModoPtSwitch from '../components/ModoPtSwitch'

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const GIORNI_SETT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Chiave "anno-mese-giorno" in orario locale (per raggruppare i completamenti).
function chiaveGiorno(anno, mese, giorno) {
  return `${anno}-${mese}-${giorno}`
}
function chiaveDaData(iso) {
  const d = new Date(iso)
  return chiaveGiorno(d.getFullYear(), d.getMonth(), d.getDate())
}

// Data lunga in italiano, con l'iniziale maiuscola. Es. "Lunedì 1 settembre 2026".
function dataLunga(iso) {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Raccoglie TUTTI i completamenti di TUTTE le schede, arricchiti coi nomi e
// raggruppati per giorno. Un completamento "dettagliato" (creato da una
// sessione) ha durata + esercizi; quello manuale no.
function raccogliCompletamenti(schede) {
  const perGiorno = new Map()
  for (const scheda of schede) {
    for (const c of scheda.completamenti || []) {
      if (!c.data) continue
      const giorno = scheda.giorni.find((g) => g.id === c.giornoId)
      const voce = {
        data: c.data,
        schedaId: c.schedaId || scheda.id,
        nomeScheda: c.nomeScheda || scheda.nome,
        nomeGiorno: c.nomeGiorno || giorno?.nome || 'Allenamento',
        settimana: c.settimana,
        durataSec: c.durataSec,
        esercizi: c.esercizi,
        nota: c.nota, // il commento scritto nel recap di fine allenamento
        // Numeri copiati dall'orologio a fine allenamento (se inseriti).
        calorieReali: c.calorieReali,
        fcMedia: c.fcMedia,
        fcMax: c.fcMax,
        // Chi lo vede: qui si può ancora cambiare idea (vedi il modale sotto).
        visibilita: c.visibilita,
        dettagliato: Array.isArray(c.esercizi) && c.esercizi.length > 0,
      }
      const k = chiaveDaData(c.data)
      if (!perGiorno.has(k)) perGiorno.set(k, [])
      perGiorno.get(k).push(voce)
    }
  }
  // Ordina i completamenti dello stesso giorno per orario.
  for (const arr of perGiorno.values()) {
    arr.sort((a, b) => new Date(a.data) - new Date(b.data))
  }
  return perGiorno
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
  const { schede, sessione, diete, aggiornaCompletamento } = useStore()
  const { utenteCorrente } = useAccount()
  const oggi = new Date()
  const [vista, setVista] = useState({ anno: oggi.getFullYear(), mese: oggi.getMonth() })
  const [giornoAperto, setGiornoAperto] = useState(null) // chiave giorno selezionato
  // Cosa si sta mandando a un amico: { tipo, titolo, sottotitolo, payload }.
  const [daCondividere, setDaCondividere] = useState(null)

  const perGiorno = useMemo(() => raccogliCompletamenti(schede), [schede])
  const celle = useMemo(() => celleMese(vista.anno, vista.mese), [vista])
  const chiaveOggi = chiaveGiorno(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())

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

  // Tocco sulla giornata di OGGI → apri l'allenamento consigliato:
  //  - se c'è una sessione in corso, riprendila;
  //  - altrimenti apri la scheda con un allenamento da fare (mostra il consigliato);
  //  - se non c'è nulla da consigliare, mostra il recap di oggi o l'elenco schede.
  const apriConsigliatoOggi = () => {
    if (sessione) return navigate(routes.allenamento())
    const conConsiglio = schede.find((s) => !s.libera && statoScheda(s).giornoCorrente)
    if (conConsiglio) return navigate(routes.scheda(conConsiglio.id))
    if (perGiorno.has(chiaveOggi)) return setGiornoAperto(chiaveOggi)
    navigate(routes.home())
  }

  // Card "Allenamento consigliato": se c'è una sessione in corso la riprende,
  // altrimenti apre il generatore di allenamento su misura. Sottotitolo = gruppi
  // consigliati (rotazione muscoli) in base allo storico.
  const subAllenamento = useMemo(() => {
    if (sessione) return 'Riprendi la sessione in corso'
    const analisi = analizzaStorico(schede)
    const labels = gruppiConsigliati(analisi, 2).map((g) => gruppoDi(g)?.label || g)
    return labels.length ? `Consiglio: ${labels.join(' + ')}` : 'Crea un allenamento su misura'
  }, [schede, sessione])
  const apriConsigliato = () => {
    if (sessione) return navigate(routes.allenamento())
    navigate(routes.consigliato())
  }

  // Card "Dieta consigliata" → "cosa mangiare oggi". Sottotitolo = piano del
  // giorno (allenamento/riposo) con le kcal, o invito a crearne una.
  const dietaOggi = useMemo(() => diete.find((d) => dietaAttiva(d)) || null, [diete])
  const subDieta = useMemo(() => {
    if (!dietaOggi) return 'Imposta la tua dieta'
    const info = oggiEAllenamento(schede)
    const piano = info.allenamento ? dietaOggi.allenamento : dietaOggi.riposo
    const tipo = !info.noto ? 'Oggi' : info.allenamento ? 'Allenamento' : 'Riposo'
    return `${tipo} · ${piano.kcal || '—'} kcal`
  }, [dietaOggi, schede])

  // Un allenamento svolto, nella forma che usano le liste (lib/storico): è
  // quella che chi lo riceve sa già leggere.
  const voceDaCompletamento = (c) => ({
    utenteId: utenteCorrente?.id || '',
    utenteNome: utenteCorrente?.nome || '',
    data: c.data,
    nomeScheda: c.nomeScheda,
    nomeGiorno: c.nomeGiorno,
    settimana: c.settimana,
    durataSec: c.durataSec,
    esercizi: c.esercizi,
    nota: c.nota,
    calorieReali: c.calorieReali,
    fcMedia: c.fcMedia,
    fcMax: c.fcMax,
    dettagliato: c.dettagliato,
  })

  const mandaAllenamento = (c) =>
    setDaCondividere({
      tipo: TIPO_CONDIVISIONE.ALLENAMENTO,
      titolo: c.nomeGiorno,
      sottotitolo: c.nomeScheda,
      payload: voceDaCompletamento(c),
    })

  // Del recap NON si manda l'immagine (1080×1350 in localStorage: no): si
  // mandano i numeri, e la card la ridisegna il telefono di chi guarda.
  const mandaRecap = (c) => {
    const riep = voceDaCompletamento(c)
    setDaCondividere({
      tipo: TIPO_CONDIVISIONE.RECAP,
      titolo: c.nomeGiorno,
      sottotitolo: c.nomeScheda,
      payload: {
        riep,
        stat: statisticheRecap(riep, { schede, diete, dati: utenteCorrente?.dati }),
        utente: utenteCorrente?.nome || '',
        commento: c.nota || '',
      },
    })
  }

  return (
    <div className="app">
      <div className="topbar">
        <ProfiloMenu />
        <h1>Calendario</h1>
      </div>

      {/* Per un PT questa è la metà "Personale" del profilo: l'altra è Lavoro. */}
      <ModoPtSwitch attivo="personale" />

      {/* Consigli di oggi: allenamento e dieta */}
      <div className="consiglio-grid">
        <button className="consiglio-card" onClick={apriConsigliato}>
          <span className="ico">
            <IconDumbbell width={22} height={22} />
          </span>
          <span className="grow">
            <span className="titolo">Allenamento consigliato</span>
            <span className="sub">{subAllenamento}</span>
          </span>
          <IconChevron className="faint" />
        </button>
        <button className="consiglio-card dieta" onClick={() => navigate(routes.dietaOggi())}>
          <span className="ico">
            <IconApple width={22} height={22} />
          </span>
          <span className="grow">
            <span className="titolo">Dieta consigliata</span>
            <span className="sub">{subDieta}</span>
          </span>
          <IconChevron className="faint" />
        </button>
      </div>

      {/* Navigazione mese */}
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
          <IconChevron style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button className="cal-mese" onClick={vaiaOggi} title="Vai a oggi">
          {MESI[vista.mese]} {vista.anno}
        </button>
        <button className="icon-btn" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
          <IconChevron />
        </button>
      </div>

      <div className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 10 }}>
        {nelMese === 0
          ? 'Nessun allenamento questo mese'
          : `${nelMese} ${nelMese === 1 ? 'allenamento' : 'allenamenti'} questo mese`}
      </div>

      {/* Intestazione giorni della settimana */}
      <div className="cal-grid cal-dow">
        {GIORNI_SETT.map((g) => (
          <div key={g} className="cal-dow-cell">{g}</div>
        ))}
      </div>

      {/* Griglia dei giorni */}
      <div className="cal-grid">
        {celle.map((giorno, i) => {
          if (!giorno) return <div key={i} className="cal-cell" />
          const k = chiaveGiorno(vista.anno, vista.mese, giorno)
          const fatto = perGiorno.has(k)
          const oggiFlag = k === chiaveOggi
          const cls = 'cal-day' + (fatto ? ' done' : '') + (oggiFlag ? ' today' : '')
          // Oggi è sempre toccabile: apre l'allenamento consigliato.
          if (oggiFlag) {
            return (
              <div key={i} className="cal-cell">
                <button className={cls} onClick={apriConsigliatoOggi} aria-label="Oggi: apri l'allenamento consigliato">
                  {giorno}
                </button>
              </div>
            )
          }
          if (fatto) {
            return (
              <div key={i} className="cal-cell">
                <button className={cls} onClick={() => setGiornoAperto(k)} aria-label={`${giorno}: allenamento svolto`}>
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

      {/* Legenda */}
      <div className="cal-legenda">
        <span className="cal-day done cal-day-mini">1</span>
        <span className="muted">Allenamento svolto — tocca per il recap</span>
      </div>
      <div className="cal-legenda" style={{ marginTop: 6 }}>
        <span className="cal-day today cal-day-mini">{oggi.getDate()}</span>
        <span className="muted">Oggi — tocca per l'allenamento consigliato</span>
      </div>

      {/* Recap del giorno selezionato */}
      {giornoAperto && (
        <div className="modal-backdrop" onClick={() => setGiornoAperto(null)}>
          <div className="modal" role="dialog" aria-label="Recap del giorno" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ marginBottom: 0 }}>{dataLunga(completamentiGiorno[0]?.data || new Date().toISOString())}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setGiornoAperto(null)}>Chiudi</button>
            </div>

            {completamentiGiorno.map((c, i) => (
              <div key={i} style={i > 0 ? { marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' } : undefined}>
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

                {/* Mandarlo a un amico: l'allenamento (le serie) o il recap
                    (la card di fine allenamento). Sono due cose diverse e si
                    guardano in modo diverso, quindi due tasti. */}
                <div className="row" style={{ gap: 8, marginTop: 12 }}>
                  <button className="btn btn-sm grow" onClick={() => mandaAllenamento(c)}>
                    <IconShare width={15} height={15} /> Manda l’allenamento
                  </button>
                  {c.dettagliato && (
                    <button className="btn btn-sm grow" onClick={() => mandaRecap(c)}>
                      <IconShare width={15} height={15} /> Manda il recap
                    </button>
                  )}
                </div>

                {/* Ci si può ripensare: la scelta fatta a fine allenamento non
                    è definitiva, e un allenamento pubblicato per sbaglio si
                    deve poter togliere. */}
                <div className="card" style={{ marginTop: 12 }}>
                  <VisibilitaPicker
                    valore={c.visibilita}
                    onChange={(v) => aggiornaCompletamento(c.schedaId, c.data, { visibilita: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {daCondividere && (
        <CondividiConAmici {...daCondividere} onChiudi={() => setDaCondividere(null)} />
      )}
    </div>
  )
}
