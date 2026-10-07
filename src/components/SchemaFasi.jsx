import { useState } from 'react'
import { faseVuota, formattaSecondi, leggiRecupero, normalizzaSchema, serieDellaFase } from '../lib/schema'
import { IconClose, IconPlus } from './icons'

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
  { id: 'num', label: 'Rip.' },
  { id: 'range', label: 'Da-a' },
  { id: 'max', label: 'Max' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'serie', label: 'Per serie' },
]

const TIPI_CARICO = [
  { id: '', label: '—' },
  { id: 'kg', label: 'kg' },
  { id: 'coppia', label: '2×kg' },
  { id: 'rm', label: 'RM' },
  { id: 'pct', label: '%' },
  { id: 'rpe', label: 'RPE' },
  { id: 'rir', label: 'RIR' },
  { id: 'serie', label: 'kg per serie' },
]

const RECUPERI = [30, 60, 90, 120, 180]

function tipoRip(rip) {
  if (rip == null || typeof rip === 'number') return 'num'
  if (Array.isArray(rip)) return 'serie'
  if (rip === 'max') return 'max'
  if (rip.sec != null) return 'tempo'
  return 'range'
}

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

function NumInput({ value, onChange, label, intero = false, style, placeholder }) {
  return (
    <input
      className="input num-input"
      inputMode={intero ? 'numeric' : 'decimal'}
      placeholder={placeholder ?? label}
      aria-label={label}
      value={testo(value)}
      onChange={(e) => onChange(numDa(e.target.value, intero))}
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

function RipEditor({ fase, onPatch, dove }) {
  const tipo = tipoRip(fase.rip)
  const n = serieDellaFase(fase) || 1
  const cambiaTipo = (t) => {
    const primo = typeof fase.rip === 'number' ? fase.rip : fase.rip?.min ?? (Array.isArray(fase.rip) ? fase.rip[0] : null)
    const base = typeof primo === 'number' ? primo : null
    if (t === 'num') onPatch({ rip: base })
    else if (t === 'range') onPatch({ rip: { min: base ?? 8, max: (base ?? 8) + 2 } })
    else if (t === 'max') onPatch({ rip: 'max' })
    else if (t === 'tempo') onPatch({ rip: { sec: 30 } })
    else onPatch({ rip: lungo([], n, base ?? 10) })
  }
  return (
    <div className="rip-editor">
      <Scelta label={`Tipo di ripetizioni${dove}`} value={tipo} onChange={cambiaTipo} opzioni={TIPI_RIP} />
      {tipo === 'num' && (
        <NumInput intero label={`Ripetizioni${dove}`} placeholder="Rip." value={fase.rip} onChange={(v) => onPatch({ rip: v })} />
      )}
      {tipo === 'range' && (
        <>
          <NumInput intero label={`Ripetizioni minime${dove}`} placeholder="da" value={fase.rip.min} onChange={(v) => onPatch({ rip: { ...fase.rip, min: v ?? 0 } })} />
          <NumInput intero label={`Ripetizioni massime${dove}`} placeholder="a" value={fase.rip.max} onChange={(v) => onPatch({ rip: { ...fase.rip, max: v ?? 0 } })} />
        </>
      )}
      {tipo === 'tempo' && (
        <NumInput intero label={`Secondi${dove}`} placeholder="sec" value={fase.rip.sec} onChange={(v) => onPatch({ rip: { sec: v ?? 0 } })} />
      )}
      {tipo === 'serie' && (
        <div className="per-serie">
          {lungo(fase.rip, n).map((r, j) => (
            <NumInput
              key={j}
              intero
              label={`Ripetizioni della serie ${j + 1}${dove}`}
              placeholder={String(j + 1)}
              value={typeof r === 'number' ? r : null}
              onChange={(v) => onPatch({ rip: lungo(fase.rip, n).map((x, i) => (i === j ? v ?? 0 : x)) })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CaricoEditor({ fase, onPatch, dove }) {
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
  return (
    <div className="carico-editor">
      <Scelta label={`Tipo di carico${dove}`} value={tipo} onChange={cambiaTipo} opzioni={TIPI_CARICO} />
      {tipo && tipo !== 'serie' && (
        <NumInput label={`Carico${dove}`} placeholder="Carico" value={valore} onChange={(v) => onPatch({ carico: conValore(v) })} />
      )}
      {tipo === 'serie' && (
        <div className="per-serie">
          {lungo(fase.carico, n).map((c, j) => (
            <NumInput
              key={j}
              label={`Kg della serie ${j + 1}${dove}`}
              placeholder={String(j + 1)}
              value={c?.valore ?? null}
              onChange={(v) =>
                onPatch({
                  carico: lungo(fase.carico, n).map((x, i) => (i === j ? (v == null ? null : { tipo: 'kg', valore: v }) : x)),
                })
              }
            />
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

  return (
    <div className={'schema-editor' + (settimana != null ? ' per-settimana' : '')}>
      {settimana != null && <div className="schema-settimana">Settimana {settimana}</div>}
      {fasi.map((f, k) => (
        <div key={k}>
          {k > 0 && <div className="fase-poi">poi</div>}
          <div className="fase-editor">
            <NumInput
              intero
              label={`Serie${dove(k)}`}
              placeholder="Serie"
              value={f.serie}
              onChange={(v) => patchFase(k, { serie: v ? Math.min(30, v) : null })}
              style={{ width: 64 }}
            />
            <span className="fase-per" aria-hidden="true">×</span>
            <RipEditor fase={f} dove={dove(k)} onPatch={(p) => patchFase(k, p)} />
            <CaricoEditor fase={f} dove={dove(k)} onPatch={(p) => patchFase(k, p)} />
            <label className="per-lato">
              <input
                type="checkbox"
                checked={!!f.perLato}
                onChange={(e) => {
                  // Tolto e non `false`: lo schema resta come l'avrebbe scritto il parser.
                  const { perLato: _, ...resto } = f
                  scriviFasi(fasi.map((x, i) => (i === k ? (e.target.checked ? { ...resto, perLato: true } : resto) : x)))
                }}
              />
              per lato
            </label>
            {piu && (
              <button type="button" className="icon-btn" onClick={() => togli(k)} aria-label={`Togli la fase ${k + 1}`}>
                <IconClose width={16} height={16} />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={aggiungi}>
        <IconPlus width={14} height={14} />
        {piu ? 'Poi un’altra fase' : 'Poi un’altra fase (es. 3×5 poi 2×2)'}
      </button>
      <RecuperoEditor sec={s.recuperoSec} onChange={(sec) => onChange({ recuperoSec: sec })} compatto={settimana != null} />
    </div>
  )
}
