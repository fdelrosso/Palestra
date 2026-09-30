import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { esci, goBack, routes } from '../lib/router'
import {
  FONTE,
  TIPO_GIORNATA,
  coerenzaMacro,
  conPastiBase,
  normalizzaGiornata,
  nuovaDieta,
} from '../lib/dieta'
import { parseDietaTesto } from '../lib/parserDieta'
import { testoDaPdf } from '../lib/pdfTesto'
import { GIORNI_SETTIMANA, labelCategoria, schemaDaPagine } from '../lib/schemaDieta'
import { labelPasto } from '../lib/pastiBase'
import { IconBack, IconCalendar, IconCheck, IconUpload } from '../components/icons'

// ---------------------------------------------------------------------------
// Importare la dieta del nutrizionista: da un PDF o da un testo incollato.
//
// Stessa filosofia dell'import delle schede dal messaggio del PT: si riconosce
// quello che si può, lo si mostra subito e lo si corregge a mano. Non si
// pretende di indovinare tutto — si pretende di non far riscrivere tutto.
//
// Il PDF si legge senza librerie (lib/pdfTesto) e non sempre riesce: quando non
// riesce lo si dice, e resta la strada del copia-incolla, che funziona sempre.
// Per questo il campo di testo è sempre lì, non nascosto dietro un errore.
//
// Due PDF diversi arrivano qui:
//   - il PIANO (i cinque pasti, ognuno con le sue alternative) → diventa i
//     pasti della dieta nuova, o giornate tipo di una dieta che c'è già;
//   - lo SCHEMA SETTIMANALE (la tabella lunedì…domenica) → non sono pasti: va
//     nello schema di una dieta (lib/schemaDieta). Se lo si carica qui lo si
//     riconosce e lo si manda al posto giusto, invece di farne una giornata
//     tipo con dentro sette pranzi.
// ---------------------------------------------------------------------------

const TIPI = [
  { id: TIPO_GIORNATA.ALLENAMENTO, label: 'Allenamento' },
  { id: TIPO_GIORNATA.RIPOSO, label: 'Riposo' },
  { id: TIPO_GIORNATA.QUALSIASI, label: 'Sempre' },
]

const MACRO = [
  { k: 'proteine', label: 'Proteine (g)' },
  { k: 'carbo', label: 'Carbo (g)' },
  { k: 'grassi', label: 'Grassi (g)' },
]

// I pasti di un piano base: i cinque sempre (lib/pastiBase), con quelli
// importati al loro posto. Gli id restano quelli dell'import.
const pastiPiano = (giornata) => conPastiBase(giornata?.pasti || [])

// Fatto l'import questa pagina non serve più: si va avanti AL SUO POSTO (o si
// torna all'editor da cui si era venuti), così la freccia non riapre il modulo.
const lascia = (dove) => esci({ salta: (r) => r.name === 'dieta-importa', poi: dove })

export default function DietaImportPage() {
  const { diete, aggiungiDieta, aggiornaDieta } = useStore()
  const [testo, setTesto] = useState('')
  const [giornate, setGiornate] = useState(null)
  const [note, setNote] = useState('')
  const [avvisi, setAvvisi] = useState([])
  const [errore, setErrore] = useState('')
  const [leggendo, setLeggendo] = useState(false)
  const [destinazione, setDestinazione] = useState('nuova')
  const [schema, setSchema] = useState(null)
  const [dietaSchema, setDietaSchema] = useState(diete[0]?.id || '')
  const [nome, setNome] = useState('')
  const [numeri, setNumeri] = useState({ kcal: '', proteine: '', carbo: '', grassi: '' })
  const inputPdf = useRef(null)

  const leggiPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrore('')
    setSchema(null)
    setLeggendo(true)
    const esito = await testoDaPdf(file)
    setLeggendo(false)
    if (esito.testo) setTesto(esito.testo)
    if (!esito.ok) {
      setErrore(esito.motivo)
      return
    }
    // Prima la tabella: se il PDF è uno schema settimanale, non è un piano.
    const tabella = schemaDaPagine(esito.pagine)
    if (tabella.trovato) {
      setSchema(tabella.caselle)
      setGiornate(null)
      setAvvisi([])
      return
    }
    analizza(esito.testo)
  }

  const analizza = (t) => {
    const r = parseDietaTesto(t ?? testo)
    setSchema(null)
    setGiornate(r.giornate)
    setNote(r.note)
    setAvvisi(r.avvisi)
    if (r.giornate.length === 0) setErrore('')
  }

  const cambiaGiornata = (id, patch) =>
    setGiornate((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const togliGiornata = (id) => setGiornate((prev) => prev.filter((g) => g.id !== id))

  // I numeri scritti qui (facoltativi) o, se non ce ne sono, quelli che il
  // foglio dichiara in una delle giornate. Scritti solo i macro, le calorie si
  // contano (4/4/9).
  const numeriScritti = {
    kcal: Number(numeri.kcal) || 0,
    proteine: Number(numeri.proteine) || 0,
    carbo: Number(numeri.carbo) || 0,
    grassi: Number(numeri.grassi) || 0,
  }
  const haMacro = numeriScritti.proteine > 0 || numeriScritti.carbo > 0 || numeriScritti.grassi > 0
  const kcalCalcolate = !numeriScritti.kcal && haMacro ? coerenzaMacro(numeriScritti).kcalDaMacro : 0

  const pianoDa = (giornata, lista) => {
    const conNumeri = numeriScritti.kcal > 0 || haMacro ? numeriScritti : lista.find((g) => g.kcal > 0 || g.proteine > 0)
    return {
      kcal: conNumeri?.kcal || 0,
      proteine: conNumeri?.proteine || 0,
      carbo: conNumeri?.carbo || 0,
      grassi: conNumeri?.grassi || 0,
      pasti: pastiPiano(giornata),
    }
  }

  const salva = () => {
    const pulite = giornate.map(normalizzaGiornata)

    if (destinazione === 'nuova') {
      // La prima giornata di allenamento e la prima di riposo diventano i due
      // piani base; se il foglio non distingue (quasi sempre), la stessa
      // giornata vale per tutti e due. Le altre restano giornate tipo.
      const allen = pulite.find((g) => g.tipo === TIPO_GIORNATA.ALLENAMENTO)
      const riposo = pulite.find((g) => g.tipo === TIPO_GIORNATA.RIPOSO)
      const sempre = pulite.find((g) => g.tipo === TIPO_GIORNATA.QUALSIASI)
      const baseAllen = allen || sempre || riposo
      const baseRiposo = riposo || sempre || allen
      const usate = new Set([baseAllen?.id, baseRiposo?.id])
      const d = nuovaDieta({
        nome: nome.trim() || 'Dieta del nutrizionista',
        fonte: FONTE.ESTERNA,
        fonteNota: 'Importata da PDF o testo',
        allenamento: pianoDa(baseAllen, pulite.filter((g) => g.tipo !== TIPO_GIORNATA.RIPOSO)),
        riposo: pianoDa(baseRiposo, pulite.filter((g) => g.tipo !== TIPO_GIORNATA.ALLENAMENTO)),
        giornate: pulite.filter((g) => !usate.has(g.id)),
        note,
      })
      const salvata = aggiungiDieta(d)
      return lascia(routes.dietaEditor(salvata.id))
    }

    const esistente = diete.find((x) => x.id === destinazione)
    if (!esistente) return
    const aggiornata = {
      ...esistente,
      fonte: FONTE.ESTERNA,
      giornate: [...(esistente.giornate || []), ...pulite],
      note: [esistente.note, note].filter(Boolean).join('\n\n'),
    }
    aggiornaDieta(aggiornata)
    lascia(routes.dietaEditor(esistente.id))
  }

  const salvaSchema = () => {
    const d = diete.find((x) => x.id === dietaSchema)
    if (!d) return
    aggiornaDieta({ ...d, schema })
    lascia(routes.dietaSchema(d.id))
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Dieta dal nutrizionista</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>Da PDF o da testo incollato</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Carica il PDF del nutrizionista oppure incolla il testo del messaggio. L’app riconosce i
        cinque pasti (colazione, spuntino, pranzo, merenda, cena) e le loro alternative; quello che
        sbaglia lo correggi qui sotto.
      </p>

      <button
        className="btn btn-block"
        onClick={() => inputPdf.current?.click()}
        disabled={leggendo}
      >
        <IconUpload width={17} height={17} />
        {leggendo ? 'Leggo il PDF…' : 'Scegli un PDF'}
      </button>
      <input ref={inputPdf} type="file" accept="application/pdf,.pdf" hidden onChange={leggiPdf} />

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="dieta-testo">Oppure incolla qui il testo</label>
        <textarea
          id="dieta-testo"
          className="textarea"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={'Colazione\n150g yogurt greco, 60g avena, 1 banana\nIn alternativa:\n• …\nPranzo: 100g riso, 180g pollo, verdure, 10g olio\n…'}
          style={{ minHeight: 180 }}
        />
      </div>

      {errore && <p className="form-error">{errore}</p>}

      <button
        className="btn btn-accent btn-block"
        onClick={() => analizza()}
        disabled={!testo.trim()}
      >
        Leggi il testo
      </button>

      {/* ---- Era uno schema settimanale ---- */}
      {schema && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-titolo">
            <IconCalendar width={15} height={15} /> Questo è uno schema settimanale
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 0 }}>
            Non contiene i pasti della dieta ma dice quale fare ogni giorno: {schema.length} caselle,
            per esempio {GIORNI_SETTIMANA[schema[0].giorno].nome.toLowerCase()} a{' '}
            {labelPasto(schema[0].pasto).toLowerCase()}{' '}
            {labelCategoria(schema[0].categoria).toLowerCase() || '«' + schema[0].testo.split('\n')[0] + '»'}.
          </p>
          {diete.length > 0 ? (
            <>
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor="schema-dieta">Aggiungilo alla dieta</label>
                <select
                  id="schema-dieta"
                  className="select"
                  value={dietaSchema}
                  onChange={(e) => setDietaSchema(e.target.value)}
                >
                  {diete.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome || 'Dieta'}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-accent btn-block" onClick={salvaSchema} disabled={!dietaSchema}>
                <IconCheck width={17} height={17} /> Usa questo schema
              </button>
            </>
          ) : (
            <p className="form-error" style={{ margin: 0 }}>
              Prima crea la dieta, caricando qui il PDF del piano alimentare. Poi aggiungi lo schema da
              «Schema settimanale».
            </p>
          )}
        </div>
      )}

      {avvisi.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-titolo">Da controllare</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {avvisi.map((a, i) => (
              <li key={i} className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {giornate && giornate.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 18 }}>
            {giornate.length === 1 ? 'Pasti trovati' : `Giornate trovate · ${giornate.length}`}
          </div>

          <div className="stack" style={{ gap: 12 }}>
            {giornate.map((g) => (
              <div className="card" key={g.id}>
                {giornate.length > 1 && (
                  <div className="field" style={{ marginBottom: 8 }}>
                    <label htmlFor={`nome-${g.id}`}>Nome</label>
                    <input
                      id={`nome-${g.id}`}
                      className="input"
                      value={g.nome}
                      onChange={(e) => cambiaGiornata(g.id, { nome: e.target.value })}
                    />
                  </div>
                )}

                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Quando vale</label>
                  <div className="segmented">
                    {TIPI.map((t) => (
                      <button
                        key={t.id}
                        className={'seg-btn' + (g.tipo === t.id ? ' on' : '')}
                        onClick={() => cambiaGiornata(g.id, { tipo: t.id })}
                        aria-pressed={g.tipo === t.id}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {g.kcal > 0 && <span className="badge badge-accent">{g.kcal} kcal</span>}
                  {g.proteine > 0 && <span className="badge">P {g.proteine}g</span>}
                  {g.carbo > 0 && <span className="badge">C {g.carbo}g</span>}
                  {g.grassi > 0 && <span className="badge">G {g.grassi}g</span>}
                  <span className="badge">{g.pasti.length} pasti</span>
                  {g.pasti.some((p) => p.opzioni?.length > 0) && (
                    <span className="badge badge-good">
                      {g.pasti.reduce((n, p) => n + (p.opzioni?.length || 0), 0)} alternative
                    </span>
                  )}
                </div>

                <div className="stack" style={{ gap: 8 }}>
                  {g.pasti.map((p) => (
                    <div key={p.id} className="card pasto-card" style={{ padding: 10 }}>
                      <div className="pasto-nome">{p.nome}</div>
                      <div className="pasto-testo">{p.testo}</div>
                      {/* Gli "oppure…" del nutrizionista: si vedono qui perché
                          se non si vedono uno crede che l'import li abbia
                          persi, e riscrive a mano quello che c'è già. */}
                      {p.opzioni?.map((o, i) => (
                        <div key={i} className="pasto-opzione">
                          <span className="pasto-opzione-tag">oppure</span> {o}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {giornate.length > 1 && (
                  <button
                    className="btn btn-ghost btn-sm btn-block"
                    style={{ marginTop: 10 }}
                    onClick={() => togliGiornata(g.id)}
                  >
                    Scarta questa giornata
                  </button>
                )}
              </div>
            ))}
          </div>

          {note && (
            <details className="card" style={{ marginTop: 12 }}>
              <summary className="card-titolo" style={{ cursor: 'pointer', marginBottom: 0 }}>
                Indicazioni del nutrizionista
              </summary>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '8px 0 0' }}>
                Quello che nel foglio non è un pasto (porzioni dei secondi, sostituzioni, consigli):
                lo tengo nella dieta, da rileggere quando serve.
              </p>
              <div className="note-dieta">{note}</div>
            </details>
          )}

          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="dest-dieta">Dove li metto</label>
            <select
              id="dest-dieta"
              className="select"
              value={destinazione}
              onChange={(e) => setDestinazione(e.target.value)}
            >
              <option value="nuova">In una dieta nuova</option>
              {diete.map((d) => (
                <option key={d.id} value={d.id}>
                  Come giornate tipo di «{d.nome || 'Dieta'}»
                </option>
              ))}
            </select>
          </div>

          {destinazione === 'nuova' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="field">
                <label htmlFor="import-nome">Nome della dieta</label>
                <input
                  id="import-nome"
                  className="input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Dieta del nutrizionista"
                  maxLength={40}
                />
              </div>
              <div className="card-titolo" style={{ marginBottom: 4 }}>Calorie e macro (facoltativi)</div>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 0 }}>
                Se il nutrizionista te li ha dati, scrivili: servono al conto di «Dieta giornaliera».
                Bastano i macro, le calorie le calcolo io.
              </p>
              <div className="dieta-macro-grid">
                <label className="dieta-macro">
                  <span>kcal</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={numeri.kcal}
                    placeholder={kcalCalcolate ? String(kcalCalcolate) : ''}
                    onChange={(e) => setNumeri((n) => ({ ...n, kcal: e.target.value }))}
                  />
                </label>
                {MACRO.map((m) => (
                  <label key={m.k} className="dieta-macro">
                    <span>{m.label}</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={numeri[m.k]}
                      onChange={(e) => setNumeri((n) => ({ ...n, [m.k]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              {kcalCalcolate > 0 && (
                <div className="vis-hint">Calcolate dai macro: {kcalCalcolate} kcal.</div>
              )}
            </div>
          )}

          <button className="btn btn-accent btn-lg btn-block" onClick={salva}>
            <IconCheck width={18} height={18} /> {destinazione === 'nuova' ? 'Crea la dieta' : 'Aggiungi alla dieta'}
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            Dopo il salvataggio si apre la dieta: lì puoi sistemare i pasti e aggiungere lo schema
            settimanale.
          </p>
        </>
      )}

      {giornate && giornate.length === 0 && (
        <div className="empty" style={{ marginTop: 16 }}>
          <div className="big">🤔</div>
          <p>
            Non ho riconosciuto nessun pasto.
            <br />
            Servono righe tipo «Colazione: …», «Pranzo: …».
          </p>
        </div>
      )}
    </div>
  )
}
