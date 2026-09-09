import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  FONTE,
  TIPO_GIORNATA,
  normalizzaGiornata,
  nuovaDieta,
} from '../lib/dieta'
import { parseDietaTesto } from '../lib/parserDieta'
import { testoDaPdf } from '../lib/pdfTesto'
import { IconBack, IconCheck, IconUpload } from '../components/icons'

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
// ---------------------------------------------------------------------------

const TIPI = [
  { id: TIPO_GIORNATA.ALLENAMENTO, label: 'Allenamento' },
  { id: TIPO_GIORNATA.RIPOSO, label: 'Riposo' },
  { id: TIPO_GIORNATA.QUALSIASI, label: 'Sempre' },
]

export default function DietaImportPage() {
  const { diete, aggiungiDieta, aggiornaDieta } = useStore()
  const [testo, setTesto] = useState('')
  const [giornate, setGiornate] = useState(null)
  const [avvisi, setAvvisi] = useState([])
  const [errore, setErrore] = useState('')
  const [leggendo, setLeggendo] = useState(false)
  const [destinazione, setDestinazione] = useState('nuova')
  const inputPdf = useRef(null)

  const leggiPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrore('')
    setLeggendo(true)
    const esito = await testoDaPdf(file)
    setLeggendo(false)
    if (esito.testo) setTesto(esito.testo)
    if (!esito.ok) {
      setErrore(esito.motivo)
      return
    }
    analizza(esito.testo)
  }

  const analizza = (t) => {
    const r = parseDietaTesto(t ?? testo)
    setGiornate(r.giornate)
    setAvvisi(r.avvisi)
    if (r.giornate.length === 0) setErrore('')
  }

  const cambiaGiornata = (id, patch) =>
    setGiornate((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const togliGiornata = (id) => setGiornate((prev) => prev.filter((g) => g.id !== id))

  // Le kcal/macro dei piani base: se una giornata importata li dichiara, li
  // usiamo anche come numeri della dieta (è quello che il foglio prescrive).
  const pianoDa = (lista, base) => {
    const conNumeri = lista.find((g) => g.kcal > 0 || g.proteine > 0)
    if (!conNumeri) return base
    return {
      kcal: conNumeri.kcal || base.kcal,
      proteine: conNumeri.proteine || base.proteine,
      carbo: conNumeri.carbo || base.carbo,
      grassi: conNumeri.grassi || base.grassi,
      pasti: base.pasti,
    }
  }

  const salva = () => {
    const pulite = giornate.map(normalizzaGiornata)
    const diAllenamento = pulite.filter(
      (g) => g.tipo === TIPO_GIORNATA.ALLENAMENTO || g.tipo === TIPO_GIORNATA.QUALSIASI,
    )
    const diRiposo = pulite.filter(
      (g) => g.tipo === TIPO_GIORNATA.RIPOSO || g.tipo === TIPO_GIORNATA.QUALSIASI,
    )

    if (destinazione === 'nuova') {
      const d = nuovaDieta({
        nome: 'Dieta del nutrizionista',
        fonte: FONTE.ESTERNA,
        fonteNota: 'Importata da PDF o testo',
        giornate: pulite,
      })
      d.allenamento = pianoDa(diAllenamento, d.allenamento)
      d.riposo = pianoDa(diRiposo, d.riposo)
      const salvata = aggiungiDieta(d)
      return navigate(routes.dietaEditor(salvata.id))
    }

    const esistente = diete.find((x) => x.id === destinazione)
    if (!esistente) return
    const aggiornata = {
      ...esistente,
      fonte: FONTE.ESTERNA,
      giornate: [...(esistente.giornate || []), ...pulite],
    }
    aggiornata.allenamento = pianoDa(diAllenamento, esistente.allenamento)
    aggiornata.riposo = pianoDa(diRiposo, esistente.riposo)
    aggiornaDieta(aggiornata)
    navigate(routes.dietaEditor(esistente.id))
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Importa una dieta</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>Da PDF o da testo incollato</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Carica il PDF del nutrizionista oppure incolla il testo del messaggio. L’app riconosce le
        giornate tipo e i pasti; quello che sbaglia lo correggi qui sotto.
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
          placeholder={'GIORNO DI ALLENAMENTO\nColazione: 150g yogurt greco, 60g avena, 1 banana\nPranzo: 100g riso, 180g pollo, verdure, 10g olio\n…'}
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
            Giornate trovate · {giornate.length}
          </div>

          <div className="stack" style={{ gap: 12 }}>
            {giornate.map((g) => (
              <div className="card" key={g.id}>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label htmlFor={`nome-${g.id}`}>Nome</label>
                  <input
                    id={`nome-${g.id}`}
                    className="input"
                    value={g.nome}
                    onChange={(e) => cambiaGiornata(g.id, { nome: e.target.value })}
                  />
                </div>

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
                </div>

                <div className="stack" style={{ gap: 8 }}>
                  {g.pasti.map((p) => (
                    <div key={p.id} className="card pasto-card" style={{ padding: 10 }}>
                      <div className="pasto-nome">{p.nome}</div>
                      <div className="pasto-testo">{p.testo}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-ghost btn-sm btn-block"
                  style={{ marginTop: 10 }}
                  onClick={() => togliGiornata(g.id)}
                >
                  Scarta questa giornata
                </button>
              </div>
            ))}
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="dest-dieta">Dove le metto</label>
            <select
              id="dest-dieta"
              className="select"
              value={destinazione}
              onChange={(e) => setDestinazione(e.target.value)}
            >
              <option value="nuova">In una dieta nuova</option>
              {diete.map((d) => (
                <option key={d.id} value={d.id}>
                  Aggiungi a «{d.nome || 'Dieta'}»
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-accent btn-lg btn-block" onClick={salva}>
            <IconCheck width={18} height={18} /> Salva le giornate tipo
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            Dopo il salvataggio si apre l’editor: lì puoi sistemare pasti, calorie e macro.
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
