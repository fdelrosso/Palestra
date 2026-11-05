import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import DietaTestata from '../components/DietaTestata'
import TastoConferma from '../components/TastoConferma'
import { oggiISO } from '../lib/dieta'
import {
  CAMPI_MISURE,
  andamento,
  campoMisura,
  conMisura,
  erroreMisura,
  misuraDel,
  numeroMisura,
  senzaMisura,
  testoGiorni,
  testoVariazione,
  ultimaMisura,
  valoreMisura,
  variazione,
} from '../lib/misure'
import { IconCheck, IconTrash } from '../components/icons'

// ---------------------------------------------------------------------------
// "Peso" nella sezione Dieta: ci si pesa (e se si vuole ci si misura), e si
// vede come va. È la domanda che una dieta si porta dietro: sta funzionando?
//
// In alto il modulo del giorno (oggi, o un altro giorno da correggere), poi
// il grafico del campo scelto con la variazione dell'ultimo mese, poi
// l'elenco delle voci. I dati stanno in lib/misure, il perché lì in testa.
//
// L'ultima pesata diventa anche il peso dei dati fisici: è quello con cui
// l'app conta calorie e macro, e non deve restare quello di tre mesi fa.
// ---------------------------------------------------------------------------

const CAMPO_PESO = 'peso'
const ALTRI_CAMPI = CAMPI_MISURE.filter((c) => c.id !== CAMPO_PESO)

function dataLeggibile(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function dataBreve(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// Il modulo parte dai valori di quel giorno, se ci sono.
function moduloDa(voce) {
  const out = {}
  for (const c of CAMPI_MISURE) out[c.id] = voce?.[c.id] != null ? numeroMisura(voce[c.id]) : ''
  return out
}

// Il grafico: una linea sui giorni in cui c'è il valore. Le date sull'asse
// sono distanziate per quanto passa davvero fra una pesata e l'altra, non
// una a pari distanza: due pesate a un giorno e una dopo un mese non sono
// tre passi uguali.
function Grafico({ punti, unita }) {
  if (punti.length < 2) {
    return (
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
        {punti.length === 0
          ? 'Ancora nessun valore: il grafico parte dalla seconda volta.'
          : 'Un valore solo: il grafico parte dalla seconda volta.'}
      </p>
    )
  }
  const L = 320
  const H = 150
  const m = { s: 36, d: 10, a: 12, b: 24 }
  const t = punti.map((p) => Date.parse(`${p.data}T12:00:00`))
  const v = punti.map((p) => p.valore)
  const t0 = Math.min(...t)
  const t1 = Math.max(...t)
  let v0 = Math.min(...v)
  let v1 = Math.max(...v)
  // Un margine sopra e sotto, e mai una scala più stretta di 1: con valori
  // quasi uguali la linea non deve sembrare un crollo.
  const pad = Math.max((v1 - v0) * 0.15, 0.5)
  v0 -= pad
  v1 += pad
  const x = (ti) => m.s + ((ti - t0) / (t1 - t0 || 1)) * (L - m.s - m.d)
  const y = (vi) => m.a + (1 - (vi - v0) / (v1 - v0)) * (H - m.a - m.b)
  const linea = punti.map((p, i) => `${i ? 'L' : 'M'}${x(t[i]).toFixed(1)},${y(p.valore).toFixed(1)}`).join(' ')
  const tacche = [v1 - pad, (v0 + v1) / 2, v0 + pad]
  const ultimo = punti.length - 1
  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      width="100%"
      role="img"
      aria-label={`Andamento dal ${dataBreve(punti[0].data)} al ${dataBreve(punti[ultimo].data)}: da ${numeroMisura(punti[0].valore)} a ${numeroMisura(punti[ultimo].valore)} ${unita}`}
      style={{ display: 'block', marginTop: 8, overflow: 'visible' }}
    >
      {tacche.map((tv, i) => (
        <g key={i}>
          <line x1={m.s} x2={L - m.d} y1={y(tv)} y2={y(tv)} stroke="var(--border-strong)" strokeWidth="1" />
          <text x={m.s - 6} y={y(tv) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)">
            {numeroMisura(tv)}
          </text>
        </g>
      ))}
      <path d={linea} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      {punti.map((p, i) => (
        <circle key={p.data} cx={x(t[i])} cy={y(p.valore)} r={i === ultimo ? 4 : 2.75} fill="var(--accent)" />
      ))}
      <text x={m.s} y={H - 6} fontSize="10" fill="var(--faint)">
        {dataBreve(punti[0].data)}
      </text>
      <text x={L - m.d} y={H - 6} fontSize="10" fill="var(--faint)" textAnchor="end">
        {dataBreve(punti[ultimo].data)}
      </text>
    </svg>
  )
}

export default function DietaPesoPage() {
  const { preferenze, aggiornaPreferenze } = useStore()
  const { utenteCorrente, aggiornaDatiFisici } = useAccount()
  const misure = useMemo(() => preferenze.misure || [], [preferenze.misure])
  const oggi = oggiISO()

  const [data, setData] = useState(oggi)
  const [modulo, setModulo] = useState(() => moduloDa(misuraDel(misure, oggi)))
  const [altreAperte, setAltreAperte] = useState(() => ALTRI_CAMPI.some((c) => misuraDel(misure, oggi)?.[c.id] != null))
  const [campo, setCampo] = useState(CAMPO_PESO)
  const [salvato, setSalvato] = useState(false)

  // I campi che hanno almeno un valore: solo quelli si possono guardare.
  const campiConDati = useMemo(() => CAMPI_MISURE.filter((c) => andamento(misure, c.id).length > 0), [misure])
  const campoVisto = campiConDati.some((c) => c.id === campo) ? campo : campiConDati[0]?.id || CAMPO_PESO
  const info = campoMisura(campoVisto)
  const punti = useMemo(() => andamento(misure, campoVisto), [misure, campoVisto])
  const ultimo = ultimaMisura(misure, campoVisto)
  const varia = variazione(misure, campoVisto, 30)

  const errori = CAMPI_MISURE.map((c) => erroreMisura(c.id, modulo[c.id])).filter(Boolean)
  const qualcosa = CAMPI_MISURE.some((c) => valoreMisura(c.id, modulo[c.id]) != null)
  const esistente = misuraDel(misure, data)

  const cambiaData = (d) => {
    if (!d || d > oggi) return
    setData(d)
    const voce = misuraDel(misure, d)
    setModulo(moduloDa(voce))
    if (ALTRI_CAMPI.some((c) => voce?.[c.id] != null)) setAltreAperte(true)
    setSalvato(false)
  }

  const scrivi = (id, valore) => {
    setModulo((prev) => ({ ...prev, [id]: valore }))
    setSalvato(false)
  }

  const salva = () => {
    if (!qualcosa || errori.length) return
    const voce = { data }
    for (const c of CAMPI_MISURE) voce[c.id] = modulo[c.id]
    const nuove = conMisura(misure, voce)
    aggiornaPreferenze((prev) => ({ misure: conMisura(prev.misure, voce) }))
    // Se è la pesata più recente, è il peso di adesso: lo usano le calorie.
    const peso = valoreMisura(CAMPO_PESO, modulo.peso)
    const piuRecente = ultimaMisura(nuove, CAMPO_PESO)
    if (peso != null && piuRecente?.data === data && utenteCorrente?.dati?.peso !== peso) {
      aggiornaDatiFisici({ peso })
    }
    setSalvato(true)
  }

  const elimina = (d) => {
    aggiornaPreferenze((prev) => ({ misure: senzaMisura(prev.misure, d) }))
    if (d === data) {
      setModulo(moduloDa(null))
      setSalvato(false)
    }
  }

  const campoInput = (c) => (
    <div className="field" key={c.id} style={{ marginBottom: 0 }}>
      <label htmlFor={`misura-${c.id}`}>
        {c.label} ({c.unita})
      </label>
      <input
        id={`misura-${c.id}`}
        className="input"
        inputMode="decimal"
        value={modulo[c.id]}
        placeholder={c.id === CAMPO_PESO ? 'Es. 78,4' : ''}
        onChange={(e) => scrivi(c.id, e.target.value)}
      />
      {erroreMisura(c.id, modulo[c.id]) && <p className="form-error">{erroreMisura(c.id, modulo[c.id])}</p>}
    </div>
  )

  const voci = [...misure].reverse()

  return (
    <div className="app">
      <DietaTestata attiva="peso" />

      {/* ---- Il modulo del giorno ---- */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="misura-data">Giorno</label>
            <input id="misura-data" className="input" type="date" value={data} max={oggi} onChange={(e) => cambiaData(e.target.value)} />
          </div>
          {campoInput(campoMisura(CAMPO_PESO))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-block"
          style={{ marginTop: 12 }}
          onClick={() => setAltreAperte((a) => !a)}
          aria-expanded={altreAperte}
        >
          {altreAperte ? 'Nascondi le misure' : 'Aggiungi le misure (vita, fianchi…)'}
        </button>
        {altreAperte && (
          <div className="grid-2" style={{ marginTop: 12, rowGap: 12 }}>
            {ALTRI_CAMPI.map(campoInput)}
          </div>
        )}

        <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={salva} disabled={!qualcosa || errori.length > 0}>
          {salvato ? (
            <>
              <IconCheck width={16} height={16} /> Salvato
            </>
          ) : esistente ? (
            'Aggiorna'
          ) : (
            'Salva'
          )}
        </button>
        {salvato && valoreMisura(CAMPO_PESO, modulo.peso) != null && ultimaMisura(misure, CAMPO_PESO)?.data === data && (
          <p className="muted" style={{ fontSize: 12, margin: '8px 0 0', lineHeight: 1.4 }}>
            È anche il peso con cui l’app conta le calorie.
          </p>
        )}
      </div>

      {/* ---- Come va ---- */}
      <div className="section-title">Come va</div>
      <div className="card" style={{ marginBottom: 14 }}>
        {campiConDati.length > 1 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {campiConDati.map((c) => (
              <button
                key={c.id}
                type="button"
                className={'chip chip-scelta' + (c.id === campoVisto ? ' on' : '')}
                aria-pressed={c.id === campoVisto}
                onClick={() => setCampo(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {ultimo ? (
          <div className="row" style={{ gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 26 }}>
              {numeroMisura(ultimo.valore)} <span style={{ fontSize: 15, fontWeight: 600 }}>{info.unita}</span>
            </strong>
            {varia && (
              <span className="muted" style={{ fontSize: 13.5 }}>
                {testoVariazione(varia.differenza, info.unita)} {testoGiorni(varia.giorni)}
              </span>
            )}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Scrivi il peso qui sopra: da qui in poi vedi come cambia.
          </p>
        )}
        {ultimo && <Grafico punti={punti} unita={info.unita} />}
      </div>

      {/* ---- Le voci ---- */}
      {voci.length > 0 && (
        <>
          <div className="section-title">Tutte le volte · {voci.length}</div>
          <div className="card" style={{ padding: 0, marginBottom: 14 }}>
            {voci.map((v) => (
              <div key={v.data} className="misura-riga">
                <button type="button" className="misura-riga-testo" onClick={() => cambiaData(v.data)}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{dataLeggibile(v.data)}</span>
                  <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {CAMPI_MISURE.filter((c) => v[c.id] != null)
                      .map((c) => `${c.label} ${numeroMisura(v[c.id])} ${c.unita}`)
                      .join(' · ')}
                  </span>
                </button>
                <TastoConferma
                  etichetta={<IconTrash width={15} height={15} role="img" aria-hidden={false} aria-label={`Togli le misure del ${dataBreve(v.data)}`} />}
                  domanda={`Togliere le misure del ${dataBreve(v.data)}?`}
                  si="Sì, togli"
                  onConferma={() => elimina(v.data)}
                  className="icon-btn btn-danger"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
