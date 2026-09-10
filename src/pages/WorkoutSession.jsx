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
  const [selSi, setSelSi] = useState(0)
  const [editing, setEditing] = useState(false)
  // Peso da cambiare: null = modale chiuso, altrimenti il valore di partenza
  // (già quello consigliato se si arriva dal riquadro del consiglio).
  const [pesoIniziale, setPesoIniziale] = useState(null)
  const timer = useRestTimer()
  const sessioneRef = useRef(sessione)
  sessioneRef.current = sessione

  useWakeLock(!riep && !!sessione)

  // Tempo totale.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Al cambio di esercizio: seleziona la prima serie da fare e imposta il recupero della scheda.
  useEffect(() => {
    const ex = sessioneRef.current?.esercizi[focusEi]
    if (!ex) return
    const first = ex.sets.findIndex((s) => !s.colore)
    setSelSi(first === -1 ? Math.max(0, ex.sets.length - 1) : first)
    timer.imposta(parseRecuperoSec(ex.schema.recupero) || 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEi])

  if (riep) {
    // Gli allenamenti "liberi" (consigliati) non hanno una pagina scheda propria
    // da mostrare: al termine si torna al calendario.
    const s = getScheda(riep.schedaId)
    const dest = s?.libera ? routes.calendario() : routes.scheda(riep.schedaId)
    return (
      <Riepilogo
        riep={riep}
        dest={dest}
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
  const focusEx = esercizi[fi]
  // Esercizio "vivo" nella scheda (per commenti/media, che stanno sulla scheda
  // e non nello snapshot congelato della sessione).
  const schedaCorr = getScheda(sessione.schedaId)
  // Dove tornare uscendo dalla sessione: la scheda, o il calendario se è un
  // allenamento "libero" (consigliato, senza pagina scheda visibile).
  const tornaDaSessione = schedaCorr?.libera ? routes.calendario() : routes.scheda(sessione.schedaId)
  const esInScheda =
    schedaCorr?.giorni
      .find((g) => g.id === sessione.giornoId)
      ?.esercizi.find((e) => e.id === focusEx.esercizioId) || null
  const { tot, fatti } = totaliSessione(sessione)
  const overall = prossimoSet(sessione)
  const durataSec = Math.round((now - new Date(sessione.inizio).getTime()) / 1000)

  const completaSet = (colore) => {
    const ex = esercizi[fi]
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== fi ? e : { ...e, sets: e.sets.map((s, j) => (j !== selSi ? s : { colore })) },
      ),
    }))
    const dopo = ex.sets.findIndex((s, j) => j > selSi && !s.colore)
    if (dopo !== -1) {
      setSelSi(dopo)
      return
    }
    const nextEx = esercizi.findIndex((e, i) => i > fi && e.sets.some((s) => !s.colore))
    if (nextEx !== -1) setFocusEi(nextEx)
  }

  const annullaUltima = () => {
    const ex = esercizi[fi]
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
        i !== fi ? e : { ...e, sets: e.sets.map((s, j) => (j !== last ? s : { colore: null })) },
      ),
    }))
    setSelSi(last)
  }

  const applicaSchema = (nuovo, perSempre) => {
    const ex = esercizi[fi]
    const nuovoNum = numeroSet({ ...ex.schema, ...nuovo })
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== fi ? e : { ...e, schema: { ...e.schema, ...nuovo }, sets: riconcilia(e.sets, nuovoNum) },
      ),
    }))
    if (perSempre) {
      aggiornaSchemaEsercizio(sessione.schedaId, sessione.giornoId, ex.esercizioId, sessione.settimana, nuovo)
    }
    setSelSi((s) => Math.min(s, nuovoNum - 1))
    timer.imposta(parseRecuperoSec(nuovo.recupero) || 90)
    setEditing(false)
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

      {/* Navigazione esercizi */}
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

      {/* Esercizio focalizzato */}
      <div
        className={'card' + (gruppoDi(focusEx.gruppo) ? ' has-gruppo' : '')}
        style={
          gruppoDi(focusEx.gruppo)
            ? { marginTop: 10, '--g': gruppoDi(focusEx.gruppo).colore }
            : { marginTop: 10 }
        }
      >
        <div className="ex-head">
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{focusEx.nome}</div>
            {gruppoDi(focusEx.gruppo) && (
              <span className="gruppo-tag">{gruppoDi(focusEx.gruppo).label}</span>
            )}
            {focusEx.nota && <div className="ex-nota">{focusEx.nota}</div>}
          </div>
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Modifica esercizio">
            <IconEdit />
          </button>
        </div>

        <div className="ex-scheme" style={{ marginTop: 12 }}>
          {formatSerieRip(focusEx.schema) && <span className="serie-rip">{formatSerieRip(focusEx.schema)}</span>}
          {/* Il peso si cambia da qui: si sceglie poi se vale solo per oggi
              o anche in scheda (ModalePeso). */}
          <button
            className="chip chip-azione"
            onClick={() => setPesoIniziale(focusEx.schema.carico || '')}
            aria-label="Cambia il peso"
          >
            <IconWeight width={15} height={15} />
            {focusEx.schema.carico || 'Imposta peso'}
          </button>
          {focusEx.schema.recupero && (
            <span className="chip">
              <IconClock width={15} height={15} />
              {focusEx.schema.recupero}
            </span>
          )}
        </div>

        {/* Cosa dicono i pallini della volta scorsa (o come scegliere il peso). */}
        <ConsiglioCarico
          nome={focusEx.nome}
          carichi={carichi}
          caricoAttuale={focusEx.schema.carico || ''}
          guidaSeVuoto={!focusEx.schema.carico}
          onUsa={(carico) => setPesoIniziale(carico)}
        />

        <div className="section-title" style={{ margin: '16px 0 8px' }}>
          Serie {selSi + 1} di {focusEx.sets.length}
        </div>
        <div className="set-dots">
          {focusEx.sets.map((s, j) => (
            <button
              key={j}
              className={'set-dot' + (s.colore ? ' ' + s.colore : j === selSi ? ' current' : '')}
              onClick={() => setSelSi(j)}
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
            <button key={c} className={'effort ' + c} onClick={() => completaSet(c)}>
              <span className="em">{EMOJI[c]}</span>
              {COLORI[c].label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={annullaUltima}>
          ↶ Annulla ultima serie di questo esercizio
        </button>

        {esInScheda && (
          <EsercizioAllegati
            esercizio={esInScheda}
            schedaId={sessione.schedaId}
            onChange={(upd) =>
              aggiornaEsercizio(sessione.schedaId, sessione.giornoId, esInScheda.id, {
                commenti: upd.commenti,
                media: upd.media,
              })
            }
          />
        )}
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

      {editing && (
        <ModaleModifica
          nome={focusEx.nome}
          schema={focusEx.schema}
          settimana={sessione.settimana}
          onChiudi={() => setEditing(false)}
          onSalva={applicaSchema}
        />
      )}

      {pesoIniziale !== null && (
        <ModalePeso
          nome={focusEx.nome}
          iniziale={pesoIniziale}
          caricoAttuale={focusEx.schema.carico || ''}
          caricoScheda={
            esInScheda ? schemaPerSettimana(esInScheda, sessione.settimana).carico || '' : ''
          }
          settimana={sessione.settimana}
          // Negli allenamenti liberi la scheda è nascosta e usa e getta:
          // "per sempre" non avrebbe un posto dove valere.
          permettiPerSempre={!schedaCorr?.libera}
          suggerimento={consiglioCarico(focusEx.nome, carichi)?.testo || ''}
          onChiudi={() => setPesoIniziale(null)}
          onSalva={(carico, perSempre) => {
            applicaSchema({ carico }, perSempre)
            setPesoIniziale(null)
          }}
        />
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
  schede,
  diete,
  dati,
  utente,
  onSalvaCommento,
  onSalvaOrologio,
  onSalvaVisibilita,
}) {
  const [vista, setVista] = useState('card')
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
