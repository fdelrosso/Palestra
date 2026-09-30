import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { esci, goBack, routes } from '../lib/router'
import { PASTI_BASE, labelPasto } from '../lib/pastiBase'
import {
  CATEGORIE,
  GIORNI_SETTIMANA,
  casellaDi,
  categoriaDi,
  giornoSettimana,
  labelCategoria,
  normalizzaSchema,
  schemaDaPagine,
} from '../lib/schemaDieta'
import { testoDaPdf } from '../lib/pdfTesto'
import { IconBack, IconPlus, IconTrash, IconUpload } from '../components/icons'

// ---------------------------------------------------------------------------
// Lo schema settimanale di una dieta (lib/schemaDieta): per ogni giorno e
// pasto, che tipo di piatto fare. "Dieta giornaliera" lo legge e propone per
// primo il pasto che rispetta lo schema del giorno.
//
// Due modi di riempirlo: dal PDF del nutrizionista (la tabella coi giorni in
// colonna) o a mano, casella per casella. In cima la settimana intera in una
// griglia, per vederla a colpo d'occhio; sotto, il giorno scelto, pasto per
// pasto.
//
// Si salva col tasto in alto, come l'editor della dieta: un PDF letto male
// non deve finire nella dieta prima che lo si sia guardato.
// ---------------------------------------------------------------------------

// Le colonne della griglia: i pasti che lo schema usa davvero (quasi sempre
// pranzo e cena), o quei due se è vuoto.
function colonneDi(schema) {
  const usati = new Set(schema.map((c) => c.pasto))
  const colonne = PASTI_BASE.filter((p) => usati.has(p.id))
  return colonne.length ? colonne : PASTI_BASE.filter((p) => p.id === 'pranzo' || p.id === 'cena')
}

function CasellaEditor({ giorno, pasto, casella, onChange }) {
  const c = casella || { giorno, pasto, categoria: '', testo: '', esempi: [] }
  const set = (patch) => onChange({ ...c, ...patch })
  const esempi = c.esempi || []
  return (
    <div className="dieta-pasto">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <div className="pasto-nome">{labelPasto(pasto)}</div>
        <select
          className="select"
          style={{ width: 'auto', minWidth: 150 }}
          value={c.categoria}
          aria-label={`Che cosa a ${labelPasto(pasto).toLowerCase()}`}
          onChange={(e) => {
            // Cambiata la categoria, testo ed esempi che parlano di un'altra
            // non valgono più: "Pesce" sopra "1 porzione di uova" confonde e
            // basta. Quello che non nomina niente di preciso resta.
            const categoria = e.target.value
            const diAltra = (t) => {
              const k = categoriaDi(t)
              return Boolean(k) && k !== categoria
            }
            set({ categoria, testo: diAltra(c.testo) ? '' : c.testo, esempi: esempi.filter((x) => !diAltra(x)) })
          }}
        >
          <option value="">Come da piano</option>
          {CATEGORIE.map((k) => (
            <option key={k.id} value={k.id}>{k.label}</option>
          ))}
        </select>
      </div>
      {(c.categoria || c.testo || esempi.length > 0) && (
        <>
          <textarea
            className="textarea"
            value={c.testo}
            placeholder="Com'è composto (facoltativo): es. 1 porzione di legumi + pasta o pane + verdura"
            onChange={(e) => set({ testo: e.target.value })}
            style={{ marginTop: 8, minHeight: 52 }}
          />
          {esempi.map((es, i) => (
            <div key={i} className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className="pasto-opzione-tag" style={{ alignSelf: 'center' }}>es.</span>
              <input
                className="input grow"
                value={es}
                aria-label={`Esempio ${i + 1}`}
                onChange={(e) => set({ esempi: esempi.map((x, k) => (k === i ? e.target.value : x)) })}
              />
              <button
                className="icon-btn btn-danger"
                type="button"
                aria-label={`Togli l'esempio ${i + 1}`}
                onClick={() => set({ esempi: esempi.filter((_, k) => k !== i) })}
              >
                <IconTrash width={15} height={15} />
              </button>
            </div>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            style={{ marginTop: 6 }}
            onClick={() => set({ esempi: [...esempi, ''] })}
          >
            <IconPlus width={14} height={14} /> Esempio di piatto
          </button>
        </>
      )}
    </div>
  )
}

export default function DietaSchemaPage({ id }) {
  const { getDieta, aggiornaDieta } = useStore()
  const dieta = useMemo(() => (id ? getDieta(id) : null), [id, getDieta])
  // Lo stato tiene anche le caselle a metà (esempi vuoti appena aggiunti):
  // si ripulisce solo al salvataggio.
  const [schema, setSchema] = useState(() => dieta?.schema || [])
  const [giorno, setGiorno] = useState(giornoSettimana())
  const [leggendo, setLeggendo] = useState(false)
  const [messaggio, setMessaggio] = useState('')
  const [errore, setErrore] = useState('')
  const inputPdf = useRef(null)

  if (!dieta) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <h1 style={{ fontSize: 17 }}>Schema settimanale</h1>
        </div>
        <p className="muted">Questa dieta non c’è più.</p>
      </div>
    )
  }

  const cambia = (casella) =>
    setSchema((s) => {
      const altre = s.filter((c) => !(c.giorno === casella.giorno && c.pasto === casella.pasto))
      return [...altre, casella]
    })

  const leggiPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrore('')
    setMessaggio('')
    setLeggendo(true)
    const esito = await testoDaPdf(file)
    setLeggendo(false)
    if (!esito.ok) {
      setErrore(esito.motivo)
      return
    }
    const r = schemaDaPagine(esito.pagine)
    if (!r.trovato) {
      setErrore(
        'In questo PDF non trovo una tabella coi giorni della settimana. Se è il piano con i pasti, si carica da «Nuova dieta» → «Dal PDF del nutrizionista».',
      )
      return
    }
    setSchema(r.caselle)
    setMessaggio(`Letto: ${r.caselle.length} caselle. Controlla qui sotto e salva.`)
  }

  const salva = () => {
    const pulito = normalizzaSchema(
      schema.map((c) => ({ ...c, esempi: (c.esempi || []).filter((x) => String(x).trim()) })),
    )
    aggiornaDieta({ ...dieta, schema: pulito })
    // Indietro all'editor che c'era, non un editor in più in cronologia.
    esci({ salta: (r) => r.name === 'dieta-schema', poi: routes.dietaEditor(dieta.id) })
  }

  const svuota = () => {
    if (window.confirm('Togliere tutto lo schema settimanale? I pasti della dieta restano.')) setSchema([])
  }

  const pulito = normalizzaSchema(schema)
  const colonne = colonneDi(pulito)
  const righe = { gridTemplateColumns: `44px repeat(${colonne.length}, minmax(0, 1fr))` }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Schema settimanale</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>{dieta.nome || 'Dieta'}</div>
        </div>
        <button className="btn btn-accent btn-sm" onClick={salva}>
          Salva
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.45 }}>
        Per ogni giorno, che tipo di piatto fare: «lunedì a pranzo legumi, a cena carne bianca». In
        «Dieta giornaliera» ti propongo per primo il pasto che rispetta lo schema di oggi; le altre
        alternative restano, in fondo.
      </p>

      <button className="btn btn-block" onClick={() => inputPdf.current?.click()} disabled={leggendo}>
        <IconUpload width={17} height={17} />
        {leggendo ? 'Leggo il PDF…' : 'Leggilo dal PDF del nutrizionista'}
      </button>
      <input ref={inputPdf} type="file" accept="application/pdf,.pdf" hidden onChange={leggiPdf} />
      {errore && <p className="form-error" style={{ marginTop: 8 }}>{errore}</p>}
      {messaggio && <div className="vis-hint" style={{ marginTop: 8 }}>{messaggio}</div>}

      {/* ---- La settimana a colpo d'occhio ---- */}
      <div className="schema-griglia" role="table" aria-label="Schema della settimana" style={{ marginTop: 16 }}>
        <div className="schema-riga schema-testa" role="row" style={righe}>
          <span role="columnheader" />
          {colonne.map((p) => (
            <span key={p.id} role="columnheader">{p.label}</span>
          ))}
        </div>
        {GIORNI_SETTIMANA.map((g) => (
          <div
            key={g.id}
            role="row"
            className={'schema-riga' + (g.id === giorno ? ' on' : '')}
            style={righe}
          >
            <button className="schema-giorno" role="rowheader" onClick={() => setGiorno(g.id)}>
              {g.breve}
            </button>
            {colonne.map((p) => {
              const c = casellaDi(pulito, g.id, p.id)
              return (
                <button
                  key={p.id}
                  role="cell"
                  className={'schema-cella' + (c?.categoria ? ` cat-${c.categoria}` : '')}
                  onClick={() => setGiorno(g.id)}
                >
                  {c ? labelCategoria(c.categoria, true) || 'Scritto' : '—'}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ---- Il giorno scelto ---- */}
      <div className="gruppo-chips" style={{ marginTop: 16 }} role="tablist" aria-label="Giorno">
        {GIORNI_SETTIMANA.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={g.id === giorno}
            className={'chip' + (g.id === giorno ? ' chip-match' : '')}
            onClick={() => setGiorno(g.id)}
          >
            {g.breve}
          </button>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 12 }}>{GIORNI_SETTIMANA[giorno].nome}</div>
      <div className="card dieta-piano">
        <div className="stack" style={{ gap: 10 }}>
          {PASTI_BASE.map((p) => (
            <CasellaEditor
              key={`${giorno}-${p.id}`}
              giorno={giorno}
              pasto={p.id}
              casella={schema.find((c) => c.giorno === giorno && c.pasto === p.id) || null}
              onChange={cambia}
            />
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
          «Come da piano» vuol dire che quel pasto non ha vincoli: vale quello che c’è nella dieta.
        </p>
      </div>

      {pulito.length > 0 && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={svuota}>
          <IconTrash width={16} height={16} /> Togli tutto lo schema
        </button>
      )}
    </div>
  )
}
