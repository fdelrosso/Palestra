import { useMemo } from 'react'
import {
  dataLunga,
  durataLunga,
  etichettaIntensita,
  formattaMigliaia,
  mmss,
  statisticheRecap,
} from '../lib/recap'
import { normalizzaLayout } from '../lib/recapLayout'
import { fasiDi, formatCarico, formatSerieRip, formattaRip, haFasi } from '../lib/schema'
import CorpoAllenato from './CorpoAllenato'

// ---------------------------------------------------------------------------
// Il recap di un allenamento nel feed di Social, a tutto schermo.
//
// È la STESSA card che si condivide (lib/recapImmagine): stessi blocchi, nello
// stesso ordine scelto da chi si è allenato (`voce.recap`, lib/recapLayout),
// col suo commento e i numeri del suo orologio. Ma qui è fatta di elementi
// veri e non è un'immagine rimpicciolita: riempie lo schermo, il testo ha la
// misura dello schermo, e i gruppi muscolari si toccano.
//
// ⚠️ Quali blocchi compaiono lo decide la stessa regola di `pezziCard` in
// lib/recapImmagine: un blocco spento o senza dato non c'è (nemmeno lo
// spazio), le tessere vicine fanno una griglia, esercizi-serie-battito una
// riga, lo sforzo subito dopo i muscoli va sotto le loro pillole, e quello che
// viene DOPO gli esercizi si appoggia in fondo. Se cambia lì, va cambiato qui.
// ---------------------------------------------------------------------------

const haValore = (v) => !!v && v !== '-'

function pezzi(voce, stat) {
  const L = normalizzaLayout(voce.recap)
  const on = (id) => !L.nascosti.includes(id)
  const out = []
  const ultimo = () => out[out.length - 1]
  const tessera = (t) => {
    if (ultimo()?.tipo === 'griglia') ultimo().tessere.push(t)
    else out.push({ tipo: 'griglia', tessere: [t] })
  }
  const contorno = (parte) => {
    if (ultimo()?.tipo === 'contorno') ultimo().parti.push(parte)
    else out.push({ tipo: 'contorno', parti: [parte] })
  }

  for (const id of L.ordine) {
    // Il perno c'è anche con la lista spenta: quello che segue va in fondo.
    if (id === 'esercizi') out.push({ tipo: 'perno', esercizi: on('esercizi') && stat.esercizi.length > 0 })
    if (!on(id)) continue
    switch (id) {
      case 'data':
        if (voce.data) out.push({ tipo: 'data' })
        break
      case 'titolo':
        out.push({ tipo: 'titolo' })
        break
      case 'sottotitolo': {
        const testo = [
          voce.nomeScheda,
          voce.settimana != null ? `Settimana ${voce.settimana}` : null,
          stat.sforzo.tot > 0 ? etichettaIntensita(stat.intensita) : null,
        ]
          .filter(Boolean)
          .join(' · ')
        if (testo) out.push({ tipo: 'sottotitolo', testo })
        break
      }
      case 'durata':
        if (stat.durataSec > 0) {
          tessera({
            etichetta: 'Durata',
            valore: durataLunga(stat.durataSec),
            nota: stat.secPerSerie ? `~${mmss(stat.secPerSerie)} a serie` : '',
          })
        }
        break
      case 'volume':
        if (haValore(stat.volumeTesto)) tessera({ etichetta: 'Volume sollevato', valore: stat.volumeTesto, accento: true })
        break
      case 'pesoMax':
        if (haValore(stat.pesoMaxTesto)) {
          tessera({ etichetta: 'Peso massimo', valore: stat.pesoMaxTesto, nota: stat.pesoMax?.esercizio })
        }
        break
      case 'calorie':
        if (stat.calorie != null && stat.calorieMisurate) {
          tessera({ etichetta: 'Calorie bruciate', valore: `${formattaMigliaia(stat.calorie)} kcal` })
        }
        break
      case 'conteggi':
        if (stat.numEsercizi > 0) contorno({ t: `${stat.numEsercizi} esercizi` })
        if (stat.serieFatte > 0) contorno({ t: `${stat.serieFatte} serie` })
        break
      case 'battito':
        if (stat.fcMedia) contorno({ t: `♥ ${stat.fcMedia} bpm${stat.fcMax ? ` · max ${stat.fcMax}` : ''}`, rosso: true })
        break
      case 'corpo':
        if (stat.gruppi.length) out.push({ tipo: 'corpo', sforzo: false })
        break
      case 'sforzo':
        if (!stat.sforzo.tot) break
        if (ultimo()?.tipo === 'corpo' && !ultimo().sforzo) ultimo().sforzo = true
        else out.push({ tipo: 'sforzo' })
        break
      case 'record':
        if (stat.record.length) out.push({ tipo: 'record', record: stat.record.slice(0, 2) })
        break
      case 'commento': {
        const testo = String(voce.nota || '').trim()
        if (testo) out.push({ tipo: 'commento', testo })
        break
      }
    }
  }
  return { pezzi: out, L }
}

function BarraSforzo({ sforzo }) {
  const voci = [
    sforzo.verde && `${sforzo.verde} facili`,
    sforzo.giallo && `${sforzo.giallo} medie`,
    sforzo.rosso && `${sforzo.rosso} dure`,
  ].filter(Boolean)
  return (
    <div className="rp-sforzo">
      <div className="rp-sforzo-barra">
        {['verde', 'giallo', 'rosso'].map((c) =>
          sforzo[c] ? <span key={c} className={c} style={{ flex: sforzo[c] }} /> : null,
        )}
      </div>
      <span className="rp-piccolo">{voci.join(' · ')}</span>
    </div>
  )
}

function Esercizi({ esercizi, pallini, schema }) {
  return (
    <div className="rp-esercizi">
      {/* L'etichetta "Esercizi" la scrive il CSS sulla prima riga: se non ci
          sta nemmeno quella, sparisce con lei invece di restare da sola. */}
      <ul aria-label="Esercizi">
        {esercizi.map((e, i) => {
          const f0 = fasiDi(e.schema)[0]
          const destra = schema
            ? [
                haFasi(e.schema)
                  ? formatSerieRip(e.schema)
                  : e.serie
                    ? `${e.serie}×${formattaRip(f0?.rip, f0?.perLato) || '-'}`
                    : null,
                formatCarico(e.schema) || null,
              ]
                .filter(Boolean)
                .join(' · ')
            : ''
          return (
            <li key={i}>
              <span className="rp-es-nome">{e.nome}</span>
              {pallini && (
                <span className="rp-pallini" aria-hidden="true">
                  {(e.colori?.colori || []).map((c, k) => (
                    <span key={k} className={c || ''} />
                  ))}
                </span>
              )}
              {destra && <span className="rp-es-schema">{destra}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function RecapPost({ voce, onGruppo }) {
  const stat = useMemo(() => statisticheRecap(voce), [voce])
  const { pezzi: lista, L } = useMemo(() => pezzi(voce, stat), [voce, stat])
  const on = (id) => !L.nascosti.includes(id)

  const blocco = (p, i) => {
    switch (p.tipo) {
      case 'data':
        return <div key={i} className="rp-data">{dataLunga(voce.data)}</div>
      case 'titolo':
        return <h2 key={i} className="rp-titolo">{voce.nomeGiorno || 'Allenamento'}</h2>
      case 'sottotitolo':
        return <div key={i} className="rp-sottotitolo">{p.testo}</div>
      case 'griglia':
        return (
          <div key={i} className="rp-griglia">
            {p.tessere.map((t) => (
              <div key={t.etichetta} className="rp-tessera">
                <span className="rp-etichetta">{t.etichetta}</span>
                <span className={'rp-valore' + (t.accento ? ' accento' : '')}>{t.valore}</span>
                {t.nota && <span className="rp-piccolo">{t.nota}</span>}
              </div>
            ))}
          </div>
        )
      case 'contorno':
        return (
          <div key={i} className="rp-contorno">
            {p.parti.map((x) => (
              <span key={x.t} className={x.rosso ? 'rosso' : ''}>
                {x.t}
              </span>
            ))}
          </div>
        )
      case 'corpo':
        return (
          <div key={i} className="rp-corpo">
            <div className="rp-corpo-figura">
              <CorpoAllenato gruppi={stat.gruppi} onGruppo={onGruppo} />
            </div>
            <div className="rp-corpo-destra">
              <span className="rp-etichetta">Muscoli allenati</span>
              <div className="gruppo-chips">
                {stat.gruppi.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="gruppo-chip on"
                    style={{ '--g': g.colore }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onGruppo?.(g.id)
                    }}
                  >
                    {g.label} · {g.serie}
                  </button>
                ))}
              </div>
              {p.sforzo && <BarraSforzo sforzo={stat.sforzo} />}
            </div>
          </div>
        )
      case 'sforzo':
        return (
          <div key={i}>
            <span className="rp-etichetta">Sforzo</span>
            <BarraSforzo sforzo={stat.sforzo} />
          </div>
        )
      case 'record':
        return (
          <div key={i} className="rp-record">
            {p.record.map((r) => (
              <div key={r.esercizio}>
                🏆 Record · {r.esercizio} {r.carico}
              </div>
            ))}
          </div>
        )
      case 'commento':
        return <p key={i} className="rp-commento">{p.testo}</p>
      case 'perno':
        // Prende lo spazio che avanza: quello che viene dopo va in fondo.
        return p.esercizi ? (
          <Esercizi key={i} esercizi={stat.esercizi} pallini={on('pallini')} schema={on('schemaEsercizi')} />
        ) : (
          <div key={i} className="rp-spazio" />
        )
      default:
        return null
    }
  }

  return (
    <div className="rp">
      {lista.map(blocco)}
      {on('firma') && (
        <div className="rp-firma">
          <span>ProgettoPalestra1.0</span>
          <span>
            {[
              stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null,
              stat.durataSec > 0 ? durataLunga(stat.durataSec) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      )}
    </div>
  )
}
