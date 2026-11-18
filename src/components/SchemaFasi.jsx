import { useEffect, useRef, useState } from 'react'
import { faseVuota, formattaSecondi, leggiRecupero, normalizzaSchema, ripDiTipo, serieDellaFase, tipoRip } from '../lib/schema'
import { IconCheck, IconChevron, IconClose, IconPlus } from './icons'

// Serie, ripetizioni, carico e recupero di un esercizio, in NUMERI (lib/schema),
// con le FASI: "3×5 poi 2×2", ognuna con le sue serie, ripetizioni e il suo
// peso. Con una fase sola è una riga, più un tasto per aggiungerne.
//
// Le ripetizioni sono di un tipo: un numero, un intervallo (8-10), "max", un
// tempo (30") o una per serie (la piramide 12/10/8). Il carico idem: kg, due
// manubri, RM, %, RPE, RIR, o uno per serie (60/70/80kg).
//
// Si usa nell'editor della scheda (schema base, o un riquadro per settimana con
// `settimana`) e nei modali "Modifica" e "Aggiungi" durante l'allenamento.
// `onChange` riceve una patch dello schema: { fasi } o { recuperoSec }.

const TIPI_RIP = [
  { id: 'num', label: 'Reps' },
  { id: 'range', label: 'Da-a' },
  { id: 'max', label: 'Max' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'serie', label: 'Per serie' },
]

const TIPI_CARICO = [
  { id: '', label: '-' },
  { id: 'kg', label: 'kg' },
  { id: 'coppia', label: '2×kg' },
  { id: 'rm', label: 'RM' },
  { id: 'pct', label: '%' },
  { id: 'rpe', label: 'RPE' },
  { id: 'rir', label: 'RIR' },
  { id: 'serie', label: 'kg per serie' },
]

const RECUPERI = [30, 60, 90, 120, 180]


function tipoCarico(c) {
  if (!c) return ''
  if (Array.isArray(c)) return 'serie'
  if (c.tipo === 'kg' && c.coppia) return 'coppia'
  return c.tipo
}

// Un numero da un <input>: null se vuoto o non è un numero.
const numDa = (v, intero = false) => {
  const t = String(v ?? '').replace(',', '.').trim()
  if (!t) return null
  const n = intero ? parseInt(t, 10) : parseFloat(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const testo = (n) => (n == null ? '' : String(n).replace('.', ','))

// Lungo `n`: allunga ripetendo l'ultimo, taglia il resto.
const lungo = (arr, n, vuoto = null) =>
  Array.from({ length: Math.max(1, n) }, (_, i) => (i < arr.length ? arr[i] : arr.length ? arr[arr.length - 1] : vuoto))

// Mentre si scrive il campo mostra il testo com'è: se mostrasse il numero
// letto, "42," tornerebbe subito "42" e la virgola non si potrebbe scrivere.
export function NumInput({ value, onChange, label, intero = false, style, placeholder }) {
  const [bozza, setBozza] = useState(null)
  return (
    <input
      className="input num-input"
      inputMode={intero ? 'numeric' : 'decimal'}
      placeholder={placeholder ?? label}
      aria-label={label}
      value={bozza ?? testo(value)}
      onChange={(e) => {
        setBozza(e.target.value)
        onChange(numDa(e.target.value, intero))
      }}
      onBlur={() => setBozza(null)}
      style={style}
    />
  )
}

function Scelta({ value, onChange, opzioni, label }) {
  return (
    <select className="input select-tipo" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {opzioni.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function RipEditor({ fase, onPatch, dove = '' }) {
  const tipo = tipoRip(fase.rip)
  const n = serieDellaFase(fase) || 1
  const cambiaTipo = (t) => onPatch({ rip: ripDiTipo(fase, t) })
  return (
    <div className={'rip-editor tipo-' + tipo}>
      <Scelta label={`Tipo di ripetizioni${dove}`} value={tipo} onChange={cambiaTipo} opzioni={TIPI_RIP} />
      {tipo === 'num' && (
        <NumInput intero label={`Ripetizioni${dove}`} placeholder="Reps" value={fase.rip} onChange={(v) => onPatch({ rip: v })} />
      )}
      {/* Da-a: i due numeri in un riquadro come i contatori, col trattino in mezzo. */}
      {tipo === 'range' && (
        <div className="range-box">
          <NumInput intero label={`Ripetizioni minime${dove}`} placeholder="da" value={fase.rip.min} onChange={(v) => onPatch({ rip: { ...fase.rip, min: v } })} />
          <span className="range-trattino" aria-hidden="true">–</span>
          <NumInput intero label={`Ripetizioni massime${dove}`} placeholder="a" value={fase.rip.max} onChange={(v) => onPatch({ rip: { ...fase.rip, max: v } })} />
        </div>
      )}
      {tipo === 'tempo' && (
        <NumInput intero label={`Secondi${dove}`} placeholder="sec" value={fase.rip.sec} onChange={(v) => onPatch({ rip: { sec: v } })} />
      )}
      {tipo === 'serie' && (
        <div className="per-serie">
          {lungo(fase.rip, n).map((r, j) => (
            <label key={j} className="serie-tassello">
              <span>{j + 1}ª</span>
              <NumInput
                intero
                label={`Ripetizioni della serie ${j + 1}${dove}`}
                placeholder="–"
                value={typeof r === 'number' ? r : null}
                onChange={(v) => onPatch({ rip: lungo(fase.rip, n).map((x, i) => (i === j ? v : x)) })}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// Nel foglio dell'esercizio (`foglio`): il carico è un contatore come serie e
// ripetizioni, in kg di base; sotto, una tendina (nostra, non il <select> del
// sistema) per cambiare tipo o togliere il carico. Senza carico, scrivere un
// numero o toccare + vuol dire kg. La tendina sta accanto all'etichetta
// "Carico", che quindi la scrive questo componente.
const VOCI_CARICO = [
  { id: 'kg', label: 'kg', sotto: 'il peso' },
  { id: 'coppia', label: '2×kg', sotto: 'due manubri' },
  { id: 'rpe', label: 'RPE', sotto: 'quanto è dura, da 1 a 10' },
  { id: 'rir', label: 'RIR', sotto: 'ripetizioni in riserva' },
  { id: 'pct', label: '%', sotto: 'del massimale' },
  { id: 'rm', label: 'RM', sotto: 'il peso per N ripetizioni' },
  { id: 'serie', label: 'kg per serie', sotto: 'un peso per ogni serie' },
  { id: '', label: 'Nessun carico', sotto: 'corpo libero' },
]

function TendinaCarico({ tipo, onScegli, label }) {
  const [aperta, setAperta] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!aperta) return
    const fuori = (e) => !ref.current?.contains(e.target) && setAperta(false)
    const esc = (e) => e.key === 'Escape' && setAperta(false)
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', esc)
    }
  }, [aperta])
  // Senza carico si legge "kg": è quello che diventa scrivendo un numero.
  const attuale = VOCI_CARICO.find((v) => v.id === (tipo || 'kg'))
  return (
    <div className="tendina-carico" ref={ref}>
      <button
        type="button"
        className="tendina-carico-tasto"
        aria-haspopup="menu"
        aria-expanded={aperta}
        aria-label={`${label}: ${attuale.label}`}
        onClick={() => setAperta((a) => !a)}
      >
        {attuale.label}
        <IconChevron width={14} height={14} style={{ transform: aperta ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
      </button>
      {aperta && (
        <div className="tendina-carico-menu" role="menu" aria-label={label}>
          {VOCI_CARICO.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitemradio"
              aria-checked={tipo === v.id}
              className={'tendina-carico-voce' + (tipo === v.id ? ' on' : '')}
              onClick={() => {
                if (v.id !== tipo) onScegli(v.id)
                setAperta(false)
              }}
            >
              <span>
                {v.label}
                <small>{v.sotto}</small>
              </span>
              {tipo === v.id && <IconCheck width={16} height={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
const PASSO_CARICO = { kg: 2.5, coppia: 1, rpe: 0.5, rir: 1, pct: 5, rm: 1 }

export function CaricoEditor({ fase, onPatch, dove = '', foglio = false }) {
  const tipo = tipoCarico(fase.carico)
  const n = serieDellaFase(fase) || 1
  const valore = Array.isArray(fase.carico) ? fase.carico[0]?.valore ?? null : fase.carico?.valore ?? null
  const cambiaTipo = (t) => {
    if (!t) onPatch({ carico: null })
    else if (t === 'serie') onPatch({ carico: lungo([], n, { tipo: 'kg', valore: valore ?? 20 }) })
    else if (t === 'coppia') onPatch({ carico: { tipo: 'kg', valore: valore ?? 10, coppia: true } })
    else onPatch({ carico: { tipo: t, valore: valore ?? (t === 'rpe' ? 8 : t === 'rir' ? 2 : t === 'pct' ? 70 : t === 'rm' ? 10 : 20) } })
  }
  // Svuotato il numero il tipo resta: si sta scrivendo il peso nuovo.
  const conValore = (v) => ({ ...fase.carico, valore: v })
  if (foglio) {
    const passo = PASSO_CARICO[tipo] ?? 2.5
    const scrivi = (v) =>
      onPatch({ carico: v == null && !tipo ? null : tipo ? conValore(v) : { tipo: 'kg', valore: v } })
    const cambia = (d) => {
      if (valore == null) return scrivi(tipo ? (d > 0 ? passo : 0) : 20)
      scrivi(Math.max(0, Math.round((valore + d * passo) * 100) / 100))
    }
    return (
      <>
        {/* L'etichetta la mette lui: la tendina del tipo le sta accanto. */}
        <span className="foglio-label foglio-label-carico">
          Carico
          <TendinaCarico tipo={tipo} onScegli={cambiaTipo} label={`Tipo di carico${dove}`} />
        </span>
        {tipo === 'serie' ? (
          <div className="per-serie">
            {lungo(fase.carico, n).map((c, j) => (
              <label key={j} className="serie-tassello">
                <span>{j + 1}ª</span>
                <NumInput
                  label={`Kg della serie ${j + 1}${dove}`}
                  placeholder="–"
                  value={c?.valore ?? null}
                  onChange={(v) =>
                    onPatch({
                      carico: lungo(fase.carico, n).map((x, i) => (i === j ? (v == null ? null : { tipo: 'kg', valore: v }) : x)),
                    })
                  }
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="contatore">
            <button type="button" className="btn" onClick={() => cambia(-1)} aria-label={`Carico: meno${dove}`}>
              −
            </button>
            <NumInput label={`Carico${dove}`} placeholder="–" value={valore} onChange={scrivi} />
            <button type="button" className="btn" onClick={() => cambia(1)} aria-label={`Carico: più${dove}`}>
              +
            </button>
          </div>
        )}
      </>
    )
  }
  return (
    <div className="carico-editor">
      <Scelta label={`Tipo di carico${dove}`} value={tipo} onChange={cambiaTipo} opzioni={TIPI_CARICO} />
      {tipo && tipo !== 'serie' && (
        <NumInput label={`Carico${dove}`} placeholder="Carico" value={valore} onChange={(v) => onPatch({ carico: conValore(v) })} />
      )}
      {tipo === 'serie' && (
        <div className="per-serie">
          {lungo(fase.carico, n).map((c, j) => (
            <label key={j} className="serie-tassello">
              <span>{j + 1}ª</span>
              <NumInput
                label={`Kg della serie ${j + 1}${dove}`}
                placeholder="–"
                value={c?.valore ?? null}
                onChange={(v) =>
                  onPatch({
                    carico: lungo(fase.carico, n).map((x, i) => (i === j ? (v == null ? null : { tipo: 'kg', valore: v }) : x)),
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Il recupero: i preimpostati più comuni in un tocco, e un campo per tutto il
 * resto ("75", "1'15", "1,15min" — si legge come lo scriverebbe un PT).
 */
export function RecuperoEditor({ sec, onChange, compatto = false }) {
  const [bozza, setBozza] = useState(null)
  const scritto = bozza ?? formattaSecondi(sec)
  const conferma = () => {
    if (bozza == null) return
    const t = bozza.trim()
    if (!t) onChange(null)
    else {
      const s = /^\d+$/.test(t) ? parseInt(t, 10) : leggiRecupero(t)
      if (s != null) onChange(s)
    }
    setBozza(null)
  }
  return (
    <div className={'recupero-editor' + (compatto ? ' compatto' : '')}>
      {!compatto && <span className="recupero-label">Recupero</span>}
      <div className="recupero-chips" role="group" aria-label="Recupero">
        {RECUPERI.map((r) => (
          <button
            key={r}
            type="button"
            className={'chip chip-scelta' + (sec === r ? ' on' : '')}
            aria-pressed={sec === r}
            onClick={() => onChange(sec === r ? null : r)}
          >
            {formattaSecondi(r)}
          </button>
        ))}
        <input
          className="input recupero-input"
          placeholder="altro"
          aria-label="Recupero, in secondi o come 1'30"
          value={scritto}
          onChange={(e) => setBozza(e.target.value)}
          onBlur={conferma}
          onKeyDown={(e) => e.key === 'Enter' && conferma()}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Contatore
// Un numero grande con − e +, che si può anche scrivere. Vuoto, il primo
// tocco mette `partenza`.
// "Per lato" (Fase.perLato, "3×10 per lato"): vale per le ripetizioni (o il
// tempo), un interruttore piccolo sotto la loro etichetta.
export function PerLato({ fase, onFasi }) {
  return (
    <label className="per-lato-toggle">
      <button
        type="button"
        className={'switch switch-sm' + (fase.perLato ? ' on' : '')}
        role="switch"
        aria-checked={!!fase.perLato}
        onClick={() => {
          // Tolto e non `false`: lo schema resta come l'avrebbe scritto il parser.
          const { perLato: _, ...resto } = fase
          onFasi([fase.perLato ? resto : { ...resto, perLato: true }])
        }}
      >
        <span className="knob" />
      </button>
      per lato
    </label>
  )
}

// Un tempo come serie e ripetizioni: − valore +, a `passo` secondi, e il
// valore si scrive anche ("1'30", "12:00"; un numero secco è in minuti con
// `minuti`, se no in secondi); sotto i più comuni (`proposte`), in un tocco.
export function ContatoreTempo({ sec, onChange, passo, proposte, minuti = false, label, partenza = 60 }) {
  const [bozza, setBozza] = useState(null)
  const conferma = () => {
    if (bozza == null) return
    const t = bozza.trim().replace(':', "'")
    if (!t) onChange(null)
    else {
      const v = /^\d+$/.test(t) ? parseInt(t, 10) * (minuti ? 60 : 1) : leggiRecupero(t)
      if (v != null) onChange(v || null)
    }
    setBozza(null)
  }
  const cambia = (d) => {
    if (sec == null) return onChange(partenza)
    const v = sec + d * passo
    onChange(v <= 0 ? null : Math.min(minuti ? 6 * 3600 : 600, v))
  }
  return (
    <>
      <div className="contatore">
        <button type="button" className="btn" onClick={() => cambia(-1)} aria-label={`${label}: meno`}>
          −
        </button>
        <input
          className="input num-input recupero-num"
          placeholder="–"
          aria-label={`${label}, ${minuti ? 'in minuti' : 'in secondi'} o come 1'30`}
          value={bozza ?? formattaSecondi(sec)}
          onChange={(e) => setBozza(e.target.value)}
          onBlur={conferma}
          onKeyDown={(e) => e.key === 'Enter' && conferma()}
        />
        <button type="button" className="btn" onClick={() => cambia(1)} aria-label={`${label}: più`}>
          +
        </button>
      </div>
      <div className="tipi-rip suggerimenti-recupero" role="group" aria-label={`${label}: i più comuni`}>
        {proposte.map((r) => (
          <button
            key={r}
            type="button"
            className={'chip chip-scelta' + (sec === r ? ' on' : '')}
            aria-pressed={sec === r}
            onClick={() => onChange(r)}
          >
            {formattaSecondi(r)}
          </button>
        ))}
      </div>
    </>
  )
}

// Il recupero: a passi di 15".
const RECUPERI_FOGLIO = [30, 60, 90, 105, 120]
export function RecuperoContatore({ sec, onChange }) {
  return <ContatoreTempo sec={sec} onChange={onChange} passo={15} proposte={RECUPERI_FOGLIO} label="Recupero" />
}

export function Contatore({ label, valore, onChange, max = 999, partenza }) {
  const cambia = (d) => onChange(Math.min(max, Math.max(1, valore == null ? partenza : valore + d)))
  return (
    <div className="contatore">
      <button type="button" className="btn" onClick={() => cambia(-1)} aria-label={`${label}: una in meno`}>
        −
      </button>
      <NumInput
        intero
        label={label}
        placeholder="–"
        value={valore}
        onChange={(v) => onChange(v == null ? null : Math.min(max, v))}
      />
      <button type="button" className="btn" onClick={() => cambia(1)} aria-label={`${label}: una in più`}>
        +
      </button>
    </div>
  )
}


// I tipi di ripetizioni come chip sotto il contatore (il numero secco è il
// caso di tutti i giorni; qui c'è anche il tempo, che nel foglio è "Misura").
const TIPI_RIP_CHIP = [
  ['num', 'Numero'],
  ['range', 'Da-a'],
  ['max', 'Max'],
  ['tempo', 'Tempo'],
  ['serie', 'Una per serie'],
]

export default function SchemaFasi({ schema, onChange, settimana = null }) {
  const s = normalizzaSchema(schema)
  const fasi = s.fasi
  const piu = fasi.length > 1
  const dove = (k) => (piu ? `, fase ${k + 1}` : '') + (settimana != null ? `, settimana ${settimana}` : '')

  const scriviFasi = (nuove) => onChange({ fasi: nuove })
  const patchFase = (k, p) => scriviFasi(fasi.map((f, i) => (i === k ? { ...f, ...p } : f)))
  const aggiungi = () => {
    const ultima = fasi[fasi.length - 1]
    scriviFasi([...fasi, faseVuota({ rip: Array.isArray(ultima?.rip) ? null : ultima?.rip ?? null })])
  }
  const togli = (k) => scriviFasi(fasi.filter((_, i) => i !== k))

  // Come il foglio dell'esercizio: una riga per cosa, coi contatori a destra
  // e i chip sotto, al posto dei campi e dei menu in fila.
  return (
    <div className={'stack foglio-numeri schema-editor' + (settimana != null ? ' per-settimana' : '')}>
      {settimana != null && <div className="schema-settimana">Settimana {settimana}</div>}
      {fasi.map((f, k) => {
        const tipo = tipoRip(f.rip)
        return (
          <div key={k} className="stack fase-blocco">
            {piu && (
              <div className="fase-testa">
                <span>{k === 0 ? 'Fase 1' : `Poi, fase ${k + 1}`}</span>
                <button type="button" className="icon-btn" onClick={() => togli(k)} aria-label={`Togli la fase ${k + 1}`}>
                  <IconClose width={16} height={16} />
                </button>
              </div>
            )}
            <div className="foglio-riga">
              <span className="foglio-label">Serie</span>
              <Contatore
                label={`Serie${dove(k)}`}
                valore={f.serie}
                max={30}
                partenza={3}
                onChange={(v) => patchFase(k, { serie: v })}
              />
            </div>
            <div className="foglio-riga">
              <span className="foglio-label foglio-label-con">
                {tipo === 'tempo' ? 'Durata' : 'Ripetizioni'}
                <PerLato fase={f} onFasi={([nuova]) => scriviFasi(fasi.map((x, i) => (i === k ? nuova : x)))} />
              </span>
              {tipo === 'num' ? (
                <Contatore label={`Ripetizioni${dove(k)}`} valore={f.rip} partenza={10} onChange={(v) => patchFase(k, { rip: v })} />
              ) : tipo === 'tempo' ? (
                <ContatoreTempo
                  sec={f.rip?.sec ?? null}
                  onChange={(v) => patchFase(k, { rip: { sec: v } })}
                  passo={5}
                  partenza={30}
                  proposte={[20, 30, 45, 60, 90]}
                  label={`Durata${dove(k)}`}
                />
              ) : (
                <RipEditor fase={f} dove={dove(k)} onPatch={(p) => patchFase(k, p)} />
              )}
            </div>
            <div className="tipi-rip" role="group" aria-label={`Tipo di ripetizioni${dove(k)}`}>
              {TIPI_RIP_CHIP.map(([t, nome]) => (
                <button
                  key={t}
                  type="button"
                  className={'chip chip-scelta' + (tipo === t ? ' on' : '')}
                  aria-pressed={tipo === t}
                  onClick={() => tipo !== t && patchFase(k, { rip: ripDiTipo(f, t) })}
                >
                  {nome}
                </button>
              ))}
            </div>
            <div className="foglio-riga">
              <CaricoEditor foglio fase={f} dove={dove(k)} onPatch={(p) => patchFase(k, p)} />
            </div>
          </div>
        )
      })}
      <button type="button" className="btn btn-ghost btn-sm schema-altra-fase" onClick={aggiungi}>
        <IconPlus width={14} height={14} />
        {piu ? 'Poi un’altra fase' : 'Poi un’altra fase (es. 3×5 poi 2×2)'}
      </button>
      <div className="foglio-riga">
        <span className="foglio-label">Recupero</span>
        <RecuperoContatore sec={s.recuperoSec} onChange={(sec) => onChange({ recuperoSec: sec })} />
      </div>
    </div>
  )
}
