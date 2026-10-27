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
import { IconBack, IconCalendar, IconCheck } from '../components/icons'
import { rimpicciolisciImmagine } from '../lib/media'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Importare la dieta del nutrizionista: da una foto, da un PDF o da un testo
// incollato.
//
// Stessa filosofia, e ora anche la stessa strada, dell'import delle schede dal
// messaggio del PT (ImportPage): prima un'AI (api/riscrivi-dieta) riscrive la
// dieta nel formato di lib/formatoDieta, poi il parser la legge, la si mostra
// subito e la si corregge a mano. Senza rete o senza AI (npm run dev senza
// chiave) il PDF e il testo vanno al parser così come sono, come prima; una
// foto senza AI non si legge.
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

// Come ImportPage: il PDF passa intero, la foto rimpicciolita (2000px bastano a
// leggere il testo, e Vercel non accetta richieste sopra i 4,5MB).
const PDF_MAX_MB = 3
// Un PDF di cui si legge il testo va all'AI come TESTO (una chiamata sola, e
// meno errori); come file solo se il testo non c'è (le scansioni).
const TESTO_BASTA = 200

function inDataUrl(blob) {
  return new Promise((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.onerror = () => ko(r.error)
    r.readAsDataURL(blob)
  })
}

async function riscriviDietaConAi(testo, file) {
  const corpo = { testo }
  if (file) {
    const blob = file.type === 'application/pdf' ? file : await rimpicciolisciImmagine(file, { lato: 2000, qualita: 0.85 })
    corpo.file = await inDataUrl(blob)
  }
  const { data } = await supabase.auth.getSession()
  const r = await fetch('/api/riscrivi-dieta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify(corpo),
  })
  const risposta = await r.json().catch(() => ({}))
  if (!r.ok || !risposta.ok) throw new Error(risposta.errore || 'Lettura non riuscita, riprova più tardi')
  return risposta.testo
}

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
  // La foto o il PDF scelto, e il testo che il PDF ha dato qui (se l'ha dato).
  const [file, setFile] = useState(null)
  const testoDelPdf = useRef('')

  const scegliFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErrore('')
    setSchema(null)
    testoDelPdf.current = ''
    if (f.type === 'application/pdf') {
      if (f.size > PDF_MAX_MB * 1024 * 1024) {
        return setErrore(`Il PDF è troppo pesante (massimo ${PDF_MAX_MB}MB): prova con una foto delle pagine`)
      }
      setLeggendo(true)
      const esito = await testoDaPdf(f)
      setLeggendo(false)
      // Prima la tabella: se il PDF è uno schema settimanale, non è un piano,
      // e non serve l'AI.
      if (esito.ok) {
        const tabella = schemaDaPagine(esito.pagine)
        if (tabella.trovato) {
          setSchema(tabella.caselle)
          setGiornate(null)
          setAvvisi([])
          setFile(null)
          return
        }
        testoDelPdf.current = esito.testo || ''
      }
    }
    setGiornate(null)
    setFile(f)
  }

  // Prima l'AI, poi il parser. Se l'AI non c'è (offline, npm run dev senza
  // chiave) il PDF letto e il testo incollato vanno al parser da soli.
  const leggi = async () => {
    if (!testo.trim() && !file) return
    setLeggendo(true)
    setErrore('')
    const pdfLetto = file?.type === 'application/pdf' && testoDelPdf.current.length >= TESTO_BASTA
    const daMandare = pdfLetto ? [testo, testoDelPdf.current].filter((t) => t.trim()).join('\n\n') : testo
    try {
      const riscritto = await riscriviDietaConAi(daMandare, pdfLetto ? null : file)
      setTesto(riscritto)
      setFile(null)
      setLeggendo(false)
      analizza(riscritto)
    } catch (e) {
      setLeggendo(false)
      const senzaAi = pdfLetto ? testoDelPdf.current : file ? '' : testo
      if (!senzaAi.trim()) {
        return setErrore(e.message === 'Failed to fetch' ? 'Sei offline? Riprova appena hai rete' : e.message)
      }
      console.warn('riscrivi-dieta: uso il parser da solo', e)
      if (pdfLetto) {
        setTesto(senzaAi)
        setFile(null)
      }
      analizza(senzaAi)
    }
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
        fonteNota: 'Importata da foto, PDF o testo',
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
          <div className="muted" style={{ fontSize: 12.5 }}>Da foto, PDF o testo incollato</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Da una foto, un PDF o un testo: la legge un’AI (Mistral) e la riscrive nel formato dell’app,
        con i pasti, le alternative e i giorni di allenamento e di riposo. Qui sotto controlli tu che
        sia giusta e correggi quello che sbaglia.
      </p>

      <div className="field">
        {/* Foto e PDF prima del testo: è come arriva quasi sempre la dieta. */}
        <label className="choice-card import-file">
          <span className="choice-emoji">📷</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>
              {file ? 'Cambia file' : 'Scegli una foto o un PDF'}
            </span>
            <span className="muted" style={{ display: 'block', fontSize: 13.5, overflowWrap: 'anywhere' }}>
              {file ? file.name : `La foto del foglio, uno screenshot o il PDF del nutrizionista (PDF fino a ${PDF_MAX_MB}MB)`}
            </span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
            hidden
            onChange={scegliFile}
          />
        </label>
        {file && (
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setFile(null)}>
            Togli il file
          </button>
        )}
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="dieta-testo">Oppure incolla qui il testo, scritto come ti è arrivato</label>
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
        onClick={leggi}
        disabled={leggendo || (!testo.trim() && !file)}
      >
        {leggendo ? 'Leggo la dieta…' : 'Leggi la dieta'}
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
