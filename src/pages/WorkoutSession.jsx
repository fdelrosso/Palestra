import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { prossimoSet, totaliSessione, numeroSet, COLORI } from '../lib/session'
import { storicoCarichi, consiglioCarico } from '../lib/carico'
import { schemaPerSettimana } from '../data/model'
import { parseRecuperoSec, formatSec } from '../lib/parseRecupero'
import { formatSerieRip } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import { numeroPositivo } from '../lib/recap'
import { useRestTimer, useWakeLock } from '../hooks/useRestTimer'
import { navigate, routes } from '../lib/router'
import { IconCheck, IconClock, IconWeight, IconEdit } from '../components/icons'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import EsercizioAllegati from '../components/EsercizioAllegati'
import ConsiglioCarico from '../components/ConsiglioCarico'
import ModalePeso from '../components/ModalePeso'
import RecapCondivisibile from '../components/RecapCondivisibile'
import VisibilitaPicker from '../components/VisibilitaPicker'
import { visibilitaDi } from '../lib/visibilita'
import { useAccount } from '../store/AccountContext'

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']
const EMOJI = { verde: '🟢', giallo: '🟡', rosso: '🔴' }

// Adatta l'array dei set a un nuovo numero di serie mantenendo i colori esistenti.
function riconcilia(sets, n) {
  const out = sets.slice(0, n)
  while (out.length < n) out.push({ colore: null })
  return out
}

export default function WorkoutSession() {
  const {
    schede,
    diete,
    aggiornaCompletamento,
    salvaAllenamento,
    sessione,
    aggiornaSessione,
    terminaSessione,
    annullaSessione,
    aggiornaSchemaEsercizio,
    aggiornaEsercizio,
    getScheda,
  } = useStore()
  // Come sono andati gli esercizi le volte scorse (pallini + carico): la
  // sessione in corso non è ancora nei completamenti, quindi non si "vede".
  const carichi = useMemo(() => storicoCarichi(schede), [schede])
  const { utenteCorrente } = useAccount()
  const [riep, setRiep] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [focusEi, setFocusEi] = useState(() => (sessione ? prossimoSet(sessione)?.ei ?? 0 : 0))
  // ⚠️ La serie selezionata è PER ESERCIZIO, non una sola per tutta la sessione.
  // Con le card affiancate ognuna mostra le proprie serie, e soprattutto:
  // andare a vedere un altro esercizio e tornare indietro non deve spostare il
  // segno di dove si era rimasti. Chiave = esercizioId; assente = "la prima non
  // ancora fatta", che è quello che serve la prima volta che si arriva.
  const [selPerEs, setSelPerEs] = useState({})
  // Quale esercizio ha il modale aperto (indice), null = nessuno.
  const [editing, setEditing] = useState(null)
  // Peso da cambiare: null = modale chiuso, altrimenti { i, valore } — l'indice
  // dell'esercizio e il valore di partenza (già quello consigliato se si arriva
  // dal riquadro del consiglio).
  const [peso, setPeso] = useState(null)
  const timer = useRestTimer()
  const sessioneRef = useRef(sessione)
  sessioneRef.current = sessione
  // La pista orizzontale delle card e l'anti-rimbalzo fra i due sensi di
  // sincronizzazione (indice → scroll, scroll → indice): senza, uno scorrimento
  // "morbido" verso l'esercizio 3 passa davanti al 2, che si prenderebbe il
  // fuoco e lo riporterebbe indietro.
  const pistaRef = useRef(null)
  const scrollDaCodice = useRef(0)

  useWakeLock(!riep && !!sessione)

  // Tempo totale.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Al cambio di esercizio si imposta il recupero di quell'esercizio. ⚠️ NON si
  // tocca più la serie selezionata: quella è di ogni esercizio e resta dov'era.
  // `imposta` di suo non disturba un recupero già partito (vedi useRestTimer).
  useEffect(() => {
    const ex = sessioneRef.current?.esercizi[focusEi]
    if (!ex) return
    timer.imposta(parseRecuperoSec(ex.schema.recupero) || 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEi])

  // Indice → scroll: porta in vista la card quando il fuoco cambia da FUORI
  // (‹ Prec / Succ ›, il tocco sul mini-elenco, l'avanzamento automatico a
  // serie finite). Se la card è già al suo posto non si fa niente, se no il
  // gesto dell'utente combatterebbe con questo effetto a ogni scorrimento.
  useEffect(() => {
    const pista = pistaRef.current
    const card = pista?.children[focusEi]
    if (!pista || !card) return
    const delta = card.getBoundingClientRect().left - pista.getBoundingClientRect().left
    if (Math.abs(delta) < 4) return
    // ⚠️ A pagina nascosta lo scorrimento "morbido" non parte proprio (il
    // browser sospende le animazioni): si salta di netto, se no si torna e la
    // card resta disallineata dall'esercizio che l'app crede di mostrare.
    const morbido = document.visibilityState === 'visible'
    scrollDaCodice.current = Date.now() + (morbido ? 600 : 100)
    pista.scrollTo({ left: pista.scrollLeft + delta, behavior: morbido ? 'smooth' : 'auto' })
  }, [focusEi])

  if (riep) {
    // Gli allenamenti "liberi" (consigliati) non hanno una pagina scheda propria
    // da mostrare: al termine si torna al calendario.
    const s = getScheda(riep.schedaId)
    const dest = s?.libera ? routes.calendario() : routes.scheda(riep.schedaId)
    // Solo gli allenamenti LIBERI si possono tenere o buttare: quelli di una
    // scheda vera stanno già nella scheda, e la domanda non avrebbe senso.
    const giornoLibero = s?.libera ? s.giorni.find((g) => g.id === riep.giornoId) || null : null
    return (
      <Riepilogo
        riep={riep}
        dest={dest}
        giornoLibero={giornoLibero}
        onSalvaAllenamento={(v) => salvaAllenamento(riep.schedaId, riep.giornoId, v)}
        schede={schede}
        diete={diete}
        dati={utenteCorrente?.dati}
        utente={utenteCorrente?.nome || ''}
        onSalvaCommento={(testo) => aggiornaCompletamento(riep.schedaId, riep.data, { nota: testo })}
        onSalvaOrologio={(patch) => aggiornaCompletamento(riep.schedaId, riep.data, patch)}
        onSalvaVisibilita={(v) => aggiornaCompletamento(riep.schedaId, riep.data, { visibilita: v })}
      />
    )
  }

  if (!sessione) {
    return (
      <div className="app">
        <div className="topbar">
          <h1>Allenamento</h1>
        </div>
        <div className="empty">
          <p>Nessun allenamento in corso.</p>
          <button className="btn btn-accent" onClick={() => navigate(routes.home())}>
            Torna alla home
          </button>
        </div>
      </div>
    )
  }

  const esercizi = sessione.esercizi
  const fi = Math.min(focusEi, esercizi.length - 1)
  // Esercizio "vivo" nella scheda (per commenti/media, che stanno sulla scheda
  // e non nello snapshot congelato della sessione).
  const schedaCorr = getScheda(sessione.schedaId)
  const giornoInScheda = schedaCorr?.giorni.find((g) => g.id === sessione.giornoId) || null
  const esInSchedaDi = (ex) =>
    giornoInScheda?.esercizi.find((e) => e.id === ex.esercizioId) || null
  // Dove si è rimasti su un esercizio: la scelta esplicita se c'è, se no la
  // prima serie non ancora fatta.
  const selDi = (ex) => {
    const scelta = selPerEs[ex.esercizioId]
    if (scelta != null) return Math.min(scelta, Math.max(0, ex.sets.length - 1))
    const prima = ex.sets.findIndex((x) => !x.colore)
    return prima === -1 ? Math.max(0, ex.sets.length - 1) : prima
  }
  const scegliSerie = (ex, j) => setSelPerEs((prev) => ({ ...prev, [ex.esercizioId]: j }))

  // Scroll → indice: la card più vicina al bordo sinistro della pista è quella
  // che si sta guardando. ⚠️ Si ignora mentre è in corso uno scorrimento
  // partito dal codice (vedi scrollDaCodice).
  const alloScroll = () => {
    const pista = pistaRef.current
    if (!pista || Date.now() < scrollDaCodice.current) return
    const sx = pista.getBoundingClientRect().left
    let vicino = 0
    let minimo = Infinity
    for (let i = 0; i < pista.children.length; i++) {
      const d = Math.abs(pista.children[i].getBoundingClientRect().left - sx)
      if (d < minimo) {
        minimo = d
        vicino = i
      }
    }
    if (vicino !== focusEi) setFocusEi(vicino)
  }
  // Dove tornare uscendo dalla sessione: la scheda, o il calendario se è un
  // allenamento "libero" (consigliato, senza pagina scheda visibile).
  const tornaDaSessione = schedaCorr?.libera ? routes.calendario() : routes.scheda(sessione.schedaId)
  const { tot, fatti } = totaliSessione(sessione)
  const overall = prossimoSet(sessione)
  const durataSec = Math.round((now - new Date(sessione.inizio).getTime()) / 1000)

  const completaSet = (idx, colore) => {
    const ex = esercizi[idx]
    const sel = selDi(ex)
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== idx ? e : { ...e, sets: e.sets.map((s, j) => (j !== sel ? s : { colore })) },
      ),
    }))
    const dopo = ex.sets.findIndex((s, j) => j > sel && !s.colore)
    if (dopo !== -1) {
      scegliSerie(ex, dopo)
      return
    }
    // Finito questo esercizio si passa al primo non ancora completo. ⚠️ Solo
    // in avanti, e solo qui: è l'unico punto in cui l'app decide da sola dove
    // guardare, e lo fa quando non c'è più niente da fare dov'eri.
    const nextEx = esercizi.findIndex((e, i) => i > idx && e.sets.some((s) => !s.colore))
    if (nextEx !== -1) setFocusEi(nextEx)
  }

  const annullaUltima = (idx) => {
    const ex = esercizi[idx]
    let last = -1
    for (let j = ex.sets.length - 1; j >= 0; j--) {
      if (ex.sets[j].colore) {
        last = j
        break
      }
    }
    if (last === -1) return
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== idx ? e : { ...e, sets: e.sets.map((s, j) => (j !== last ? s : { colore: null })) },
      ),
    }))
    scegliSerie(ex, last)
  }

  const applicaSchema = (idx, nuovo, perSempre) => {
    const ex = esercizi[idx]
    const nuovoNum = numeroSet({ ...ex.schema, ...nuovo })
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== idx ? e : { ...e, schema: { ...e.schema, ...nuovo }, sets: riconcilia(e.sets, nuovoNum) },
      ),
    }))
    if (perSempre) {
      aggiornaSchemaEsercizio(sessione.schedaId, sessione.giornoId, ex.esercizioId, sessione.settimana, nuovo)
    }
    // Meno serie di prima: la selezione di QUESTO esercizio non può restare
    // fuori dall'elenco. Quelle degli altri non c'entrano e non si toccano.
    setSelPerEs((prev) => ({
      ...prev,
      [ex.esercizioId]: Math.min(prev[ex.esercizioId] ?? 0, nuovoNum - 1),
    }))
    timer.imposta(parseRecuperoSec(nuovo.recupero) || 90)
    setEditing(null)
  }

  const termina = () => {
    const r = terminaSessione()
    setRiep(r)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button
          className="icon-btn"
          onClick={() => navigate(tornaDaSessione)}
          aria-label="Riduci"
        >
          <IconClock />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="timer-total">⏱ {formatSec(durataSec)}</div>
          <div className="faint" style={{ fontSize: 12 }}>
            {sessione.nomeGiorno} · Sett {sessione.settimana} · {fatti}/{tot} serie
          </div>
        </div>
        <button className="btn btn-sm btn-danger" onClick={termina}>
          Termina
        </button>
      </div>

      {/* Timer di recupero — manuale e indipendente */}
      <div className="card" style={{ textAlign: 'center', marginTop: 6 }}>
        <div className="faint" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
          RECUPERO · impostato {formatSec(timer.durata)}
        </div>
        <div
          className={'timer-big' + (timer.rimanente < 0 ? ' over' : '')}
          style={{ margin: '8px 0 12px' }}
        >
          {timer.rimanente < 0
            ? '+' + formatSec(Math.floor(-timer.rimanente))
            : formatSec(Math.ceil(timer.rimanente))}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => timer.aggiungi(-10)}>
            −10s
          </button>
          {timer.attivo ? (
            <button className="btn btn-sm" onClick={timer.pausa}>
              Pausa
            </button>
          ) : (
            <button className="btn btn-sm btn-accent" onClick={timer.avvia}>
              {timer.avviato ? 'Riprendi' : 'Start'}
            </button>
          )}
          <button className="btn btn-sm" onClick={() => timer.aggiungi(10)}>
            +10s
          </button>
          <button className="btn btn-sm" onClick={timer.reset}>
            Reset
          </button>
        </div>
      </div>

      {/* Navigazione esercizi: i tasti restano perché sono precisi (e
          funzionano da tastiera); il gesto naturale è scorrere la pista. */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <button className="btn btn-sm" disabled={fi === 0} onClick={() => setFocusEi(fi - 1)}>
          ‹ Prec
        </button>
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          Esercizio {fi + 1}/{esercizi.length}
        </span>
        <button
          className="btn btn-sm"
          disabled={fi === esercizi.length - 1}
          onClick={() => setFocusEi(fi + 1)}
        >
          Succ ›
        </button>
      </div>

      {/* La pista: una card per esercizio, in fila, si scorre di lato.
          ⚠️ Ci sono TUTTE, sempre montate: i pallini delle serie vivono nella
          sessione, quindi andare avanti a sbirciare e tornare indietro non
          perde niente — né i colori, né la serie a cui si era arrivati. */}
      <div className="pista-esercizi" ref={pistaRef} onScroll={alloScroll}>
        {esercizi.map((ex, i) => (
          <CardEsercizio
            key={ex.esercizioId}
            ex={ex}
            attiva={i === fi}
            sel={selDi(ex)}
            carichi={carichi}
            esInScheda={esInSchedaDi(ex)}
            schedaId={sessione.schedaId}
            onSerie={(j) => scegliSerie(ex, j)}
            onColore={(c) => completaSet(i, c)}
            onAnnullaUltima={() => annullaUltima(i)}
            onModifica={() => setEditing(i)}
            onPeso={(valore) => setPeso({ i, valore })}
            onAllegati={(upd) =>
              aggiornaEsercizio(sessione.schedaId, sessione.giornoId, esInSchedaDi(ex).id, {
                commenti: upd.commenti,
                media: upd.media,
              })
            }
          />
        ))}
      </div>

      {!overall && (
        <div className="hero" style={{ marginTop: 12, textAlign: 'center' }}>
          <div className="titolo">Tutte le serie fatte! 💪</div>
          <button className="btn btn-good btn-lg btn-block" style={{ marginTop: 16 }} onClick={termina}>
            <IconCheck width={20} height={20} />
            Termina e vedi riepilogo
          </button>
        </div>
      )}

      {/* Panoramica esercizi (tocca per andarci) */}
      <div className="section-title">Esercizi</div>
      <div className="stack" style={{ gap: 8 }}>
        {esercizi.map((e, i) => {
          const done = e.sets.every((s) => s.colore)
          const gr = gruppoDi(e.gruppo)
          return (
            <button
              key={e.esercizioId}
              className={
                'ex-mini' + (i === fi ? ' active' : done ? ' done' : '') + (gr ? ' has-gruppo' : '')
              }
              style={gr ? { '--g': gr.colore } : undefined}
              onClick={() => setFocusEi(i)}
            >
              <span className="nm">{e.nome}</span>
              <span className="dots-mini">
                {e.sets.map((s, j) => (
                  <span key={j} className={'dot-mini' + (s.colore ? ' ' + s.colore : '')} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <button
        className="btn btn-ghost btn-danger btn-block"
        style={{ marginTop: 20 }}
        onClick={() => {
          if (confirm('Annullare l’allenamento? I dati di questa sessione andranno persi.')) {
            annullaSessione()
            navigate(tornaDaSessione)
          }
        }}
      >
        Annulla allenamento
      </button>

      {/* ⚠️ I modali stanno FUORI dalla pista e sanno su quale esercizio
          lavorano (l'indice): dentro una card che si scorre di lato un modale
          si porterebbe dietro lo scorrimento. */}
      {editing !== null && esercizi[editing] && (
        <ModaleModifica
          nome={esercizi[editing].nome}
          schema={esercizi[editing].schema}
          settimana={sessione.settimana}
          onChiudi={() => setEditing(null)}
          onSalva={(nuovo, perSempre) => applicaSchema(editing, nuovo, perSempre)}
        />
      )}

      {peso !== null && esercizi[peso.i] && (
        <ModalePeso
          nome={esercizi[peso.i].nome}
          iniziale={peso.valore}
          caricoAttuale={esercizi[peso.i].schema.carico || ''}
          caricoScheda={(() => {
            const inScheda = esInSchedaDi(esercizi[peso.i])
            return inScheda ? schemaPerSettimana(inScheda, sessione.settimana).carico || '' : ''
          })()}
          settimana={sessione.settimana}
          // Negli allenamenti liberi la scheda è nascosta e usa e getta:
          // "per sempre" non avrebbe un posto dove valere.
          permettiPerSempre={!schedaCorr?.libera}
          suggerimento={consiglioCarico(esercizi[peso.i].nome, carichi)?.testo || ''}
          onChiudi={() => setPeso(null)}
          onSalva={(carico, perSempre) => {
            applicaSchema(peso.i, { carico }, perSempre)
            setPeso(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Card esercizio
// Una card per esercizio: nome, schema, consiglio sul carico, i pallini delle
// serie e i tre tasti dello sforzo. Sono tutte montate insieme nella pista
// orizzontale, quindi qui dentro non si tiene stato: quello che conta (i colori
// delle serie) sta nella sessione, e la serie selezionata la passa il genitore.
//
// ⚠️ Commenti e foto si montano SOLO sulla card attiva. Ogni miniatura va a
// prendersi il file (IndexedDB o Storage): montarle tutte vorrebbe dire, aprendo
// l'allenamento, scaricare i video di otto esercizi che magari non si guardano.
function CardEsercizio({
  ex,
  attiva,
  sel,
  carichi,
  esInScheda,
  schedaId,
  onSerie,
  onColore,
  onAnnullaUltima,
  onModifica,
  onPeso,
  onAllegati,
}) {
  const gruppo = gruppoDi(ex.gruppo)
  return (
    <div
      className={'card' + (gruppo ? ' has-gruppo' : '') + (attiva ? '' : ' non-attiva')}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
      // ⚠️ `inert` e non `aria-hidden`: le card vicine hanno dei tasti veri, e
      // durante lo scorrimento se ne intravede un pezzo. Inert le toglie
      // insieme dal tocco, dal tab e da chi legge lo schermo — aria-hidden da
      // solo lascerebbe dei tasti premibili ma invisibili a chi non vede.
      inert={!attiva}
    >
      <div className="ex-head">
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{ex.nome}</div>
          {gruppo && <span className="gruppo-tag">{gruppo.label}</span>}
          {ex.nota && <div className="ex-nota">{ex.nota}</div>}
        </div>
        <button className="icon-btn" onClick={onModifica} aria-label="Modifica esercizio">
          <IconEdit />
        </button>
      </div>

      <div className="ex-scheme" style={{ marginTop: 12 }}>
        {formatSerieRip(ex.schema) && <span className="serie-rip">{formatSerieRip(ex.schema)}</span>}
        {/* Il peso si cambia da qui: si sceglie poi se vale solo per oggi
            o anche in scheda (ModalePeso). */}
        <button
          className="chip chip-azione"
          onClick={() => onPeso(ex.schema.carico || '')}
          aria-label="Cambia il peso"
        >
          <IconWeight width={15} height={15} />
          {ex.schema.carico || 'Imposta peso'}
        </button>
        {ex.schema.recupero && (
          <span className="chip">
            <IconClock width={15} height={15} />
            {ex.schema.recupero}
          </span>
        )}
      </div>

      {/* Cosa dicono i pallini della volta scorsa (o come scegliere il peso). */}
      <ConsiglioCarico
        nome={ex.nome}
        carichi={carichi}
        caricoAttuale={ex.schema.carico || ''}
        guidaSeVuoto={!ex.schema.carico}
        onUsa={(carico) => onPeso(carico)}
      />

      <div className="section-title" style={{ margin: '16px 0 8px' }}>
        Serie {sel + 1} di {ex.sets.length}
      </div>
      <div className="set-dots">
        {ex.sets.map((s, j) => (
          <button
            key={j}
            className={'set-dot' + (s.colore ? ' ' + s.colore : j === sel ? ' current' : '')}
            onClick={() => onSerie(j)}
            aria-label={`Serie ${j + 1}`}
          >
            {s.colore ? <IconCheck width={15} height={15} /> : j + 1}
          </button>
        ))}
      </div>

      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        Com'è andata questa serie?
      </div>
      <div className="effort-buttons">
        {ORDINE_COLORI.map((c) => (
          <button key={c} className={'effort ' + c} onClick={() => onColore(c)}>
            <span className="em">{EMOJI[c]}</span>
            {COLORI[c].label}
          </button>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm btn-block"
        style={{ marginTop: 8 }}
        onClick={onAnnullaUltima}
      >
        ↶ Annulla ultima serie di questo esercizio
      </button>

      {attiva && esInScheda && (
        <EsercizioAllegati esercizio={esInScheda} schedaId={schedaId} onChange={onAllegati} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Modale modifica
function ModaleModifica({ nome, schema, settimana, onChiudi, onSalva }) {
  const [s, setS] = useState({
    serie: schema.serie || '',
    ripetizioni: schema.ripetizioni || '',
    carico: schema.carico || '',
    recupero: schema.recupero || '',
    nota: schema.nota || '',
  })
  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Modifica · {nome}</h3>
        <div className="grid-4" style={{ marginBottom: 10 }}>
          <input className="input" placeholder="Serie" value={s.serie} onChange={set('serie')} />
          <input className="input" placeholder="Rip." value={s.ripetizioni} onChange={set('ripetizioni')} />
          <input className="input" placeholder="Carico" value={s.carico} onChange={set('carico')} />
          <input className="input" placeholder="Recupero" value={s.recupero} onChange={set('recupero')} />
        </div>
        <input
          className="input"
          placeholder="Nota (facoltativa)"
          value={s.nota}
          onChange={set('nota')}
          style={{ marginBottom: 16 }}
        />

        <button className="btn btn-block btn-lg" onClick={() => onSalva(s, false)}>
          Salva solo per questa sessione
        </button>
        <button
          className="btn btn-accent btn-block btn-lg"
          style={{ marginTop: 8 }}
          onClick={() => onSalva(s, true)}
        >
          Salva per sempre (settimana {settimana})
        </button>
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Riepilogo
// Due viste dello stesso allenamento: la CARD da condividere (quella che si
// apre per prima, è il momento in cui uno ha voglia di raccontarlo) e il
// DETTAGLIO serie per serie di sempre.
function Riepilogo({
  riep,
  dest,
  giornoLibero,
  onSalvaAllenamento,
  schede,
  diete,
  dati,
  utente,
  onSalvaCommento,
  onSalvaOrologio,
  onSalvaVisibilita,
}) {
  const [vista, setVista] = useState('card')
  // Tenerlo o no (solo per gli allenamenti liberi). Si scrive subito, non al
  // "Fatto": chi chiude l'app senza toccare niente ha comunque scelto — di no.
  const [salvato, setSalvato] = useState(() => !!giornoLibero?.salvato)
  const [commento, setCommento] = useState(riep?.nota || '')
  // Chi lo vede. Nasce pubblico (vedi lib/visibilita) e si cambia qui: è il
  // momento in cui uno sa se quell'allenamento vuole farlo vedere o no.
  const [visibilita, setVisibilita] = useState(() => visibilitaDi(riep))
  // Calorie e battiti copiati dall'orologio: campi di testo finché si scrive,
  // numeri (o null) quando si salvano.
  const [orologio, setOrologio] = useState(() => ({
    calorieReali: riep?.calorieReali ?? '',
    fcMedia: riep?.fcMedia ?? '',
    fcMax: riep?.fcMax ?? '',
  }))
  const orologioIniziale = useRef(orologio)

  // Il commento finisce nella card e viene salvato sull'allenamento, così non
  // si perde uscendo. Debounce: non riscriviamo localStorage a ogni tasto.
  useEffect(() => {
    if (commento === (riep?.nota || '')) return
    const id = setTimeout(() => onSalvaCommento?.(commento), 500)
    return () => clearTimeout(id)
  }, [commento, riep, onSalvaCommento])

  const orologioNumeri = useMemo(
    () => ({
      calorieReali: numeroPositivo(orologio.calorieReali),
      fcMedia: numeroPositivo(orologio.fcMedia),
      fcMax: numeroPositivo(orologio.fcMax),
    }),
    [orologio],
  )

  // Stesso trattamento del commento. `setOrologio` crea sempre un oggetto
  // nuovo, quindi il confronto per identità basta a non salvare al montaggio.
  useEffect(() => {
    if (orologio === orologioIniziale.current) return
    const id = setTimeout(() => onSalvaOrologio?.(orologioNumeri), 500)
    return () => clearTimeout(id)
  }, [orologio, orologioNumeri, onSalvaOrologio])

  return (
    <div className="app">
      <div className="topbar">
        <h1>Riepilogo</h1>
      </div>

      <div className="row" style={{ gap: 8, margin: '4px 0 14px' }}>
        <button
          className={'btn grow' + (vista === 'card' ? ' btn-accent' : '')}
          onClick={() => setVista('card')}
          aria-pressed={vista === 'card'}
        >
          Card
        </button>
        <button
          className={'btn grow' + (vista === 'dettaglio' ? ' btn-accent' : '')}
          onClick={() => setVista('dettaglio')}
          aria-pressed={vista === 'dettaglio'}
        >
          Dettaglio
        </button>
      </div>

      {vista === 'card' ? (
        <RecapCondivisibile
          riep={riep}
          schede={schede}
          diete={diete}
          dati={dati}
          utente={utente}
          commento={commento}
          onCommento={setCommento}
          orologio={orologio}
          onOrologio={(patch) => setOrologio((prev) => ({ ...prev, ...patch }))}
        />
      ) : (
        // Il dettaglio vede subito quello che si sta scrivendo nella card.
        <RiepilogoDettaglio riep={{ ...riep, ...orologioNumeri, nota: commento }} />
      )}

      {/* L'allenamento costruito al volo: tenerlo o lasciarlo com'è. In
          calendario e nello storico ci resta in tutti e due i casi — l'unica
          differenza è se compare tra le cose che puoi rifare. */}
      {giornoLibero && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="kicker">Questo allenamento</div>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
            Puoi tenerlo tra i tuoi allenamenti, per ritrovarlo e rifarlo quando vuoi. In
            calendario e nello storico ci resta comunque.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button
              className={'btn grow' + (salvato ? ' btn-accent' : '')}
              aria-pressed={salvato}
              onClick={() => {
                setSalvato(true)
                onSalvaAllenamento?.(true)
              }}
            >
              Salvalo
            </button>
            <button
              className={'btn grow' + (!salvato ? ' btn-accent' : '')}
              aria-pressed={!salvato}
              onClick={() => {
                setSalvato(false)
                onSalvaAllenamento?.(false)
              }}
            >
              Solo per oggi
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <VisibilitaPicker
          valore={visibilita}
          onChange={(v) => {
            setVisibilita(v)
            onSalvaVisibilita?.(v)
          }}
        />
      </div>

      <button
        className="btn btn-block btn-lg"
        style={{ marginTop: 22 }}
        onClick={() => navigate(dest || routes.scheda(riep.schedaId))}
      >
        Fatto
      </button>
      <div style={{ height: 20 }} />
    </div>
  )
}
