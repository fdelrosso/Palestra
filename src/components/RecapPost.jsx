import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  dataLunga,
  durataLunga,
  orarioAllenamento,
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
//
// ⚠️ UNICA DIFFERENZA DALLA CARD (54ª): i numeri (durata, volume, peso
// massimo, calorie) qui non sono riquadri in due colonne ma una STRISCIA, una
// riga sola divisa da righe sottili. In due colonne, con tre numeri, il terzo
// prendeva una riga intera per un dato corto: spazio buttato, e il recap si
// rimpicciolisce per ogni riga in più. Con quattro numeri le etichette si
// accorciano ("Max", "Kcal") e la durata perde il "min".
//
// ⚠️ SEMPRE TUTTO, SEMPRE UGUALE. Fino alla 53ª quello che non ci stava si
// tagliava: il commento a tre righe, gli esercizi in più spariti, e in fondo
// (commento, firma) quello che restava fuori dallo schermo; sui telefoni bassi
// sparivano anche le note piccole. Così un recap con poco si vedeva intero e
// uno con tanto no. Adesso il recap si dispone alla sua altezza naturale e, se
// non ci sta, si RIMPICCIOLISCE tutto insieme quanto basta (`adatta`): stessa
// disposizione per tutti, niente di tagliato. Più roba = scritte più piccole.
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
            // "1 h 10 min" non sta in un quarto di riga: "1 h 10" si capisce.
            valoreCorto: durataLunga(stat.durataSec).replace(/(h \d+) min$/, '$1'),
            nota: stat.secPerSerie ? `~${mmss(stat.secPerSerie)} a serie` : '',
            notaCorta: stat.secPerSerie ? `~${mmss(stat.secPerSerie)}/serie` : '',
          })
        }
        break
      case 'volume':
        if (haValore(stat.volumeTesto)) tessera({ etichetta: 'Volume', valore: stat.volumeTesto, accento: true })
        break
      case 'pesoMax':
        if (haValore(stat.pesoMaxTesto)) {
          tessera({
            etichetta: 'Peso max',
            corta: 'Max',
            valore: stat.pesoMaxTesto,
            nota: stat.pesoMax?.esercizio,
          })
        }
        break
      case 'calorie':
        if (stat.calorie != null && stat.calorieMisurate) {
          tessera({
            etichetta: 'Calorie',
            corta: 'Kcal',
            valore: `${formattaMigliaia(stat.calorie)} kcal`,
            valoreCorto: formattaMigliaia(stat.calorie),
          })
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
      <span className="rp-etichetta">Esercizi</span>
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

  // Rimpicciolire per farci stare tutto. ⚠️ Con `scale` il recap si stringe
  // anche in larghezza: per riempire comunque la riga si allarga prima di 1/s,
  // e siccome più largo vuol dire meno righe a capo (quindi più basso) si
  // rifà il conto un paio di volte finché non si ferma. Stili scritti a mano e
  // non uno stato: è misura e disegno, non dati, e un render in più per ogni
  // post del feed sarebbe solo uno sfarfallio.
  const scatola = useRef(null)
  const dentro = useRef(null)
  useLayoutEffect(() => {
    const box = scatola.current
    const el = dentro.current
    if (!box || !el) return undefined
    let ultimo = ''
    const adatta = () => {
      const H = box.clientHeight
      if (!H) return
      let s = 1
      for (let i = 0; i < 5; i++) {
        el.style.width = `${100 / s}%`
        const nuovo = Math.min(1, H / el.offsetHeight)
        const fermo = Math.abs(nuovo - s) < 0.002
        s = nuovo
        if (fermo) break
      }
      el.style.width = `${100 / s}%`
      s = Math.min(s, H / el.offsetHeight)
      const t = s < 0.999 ? `scale(${s})` : ''
      if (t !== ultimo) el.style.transform = ultimo = t
    }
    adatta()
    // Lo spazio cambia (rotazione, barra del browser) e il contenuto anche (le
    // immagini del corpo arrivano dopo): si rifà il conto, una volta per giro.
    let giro = 0
    const oss = new ResizeObserver(() => {
      cancelAnimationFrame(giro)
      giro = requestAnimationFrame(adatta)
    })
    oss.observe(box)
    oss.observe(el)
    return () => {
      oss.disconnect()
      cancelAnimationFrame(giro)
    }
  }, [lista, voce])

  // In fondo, su una riga: la data a sinistra e serie e durata a destra.
  // ⚠️ Niente più "ProgettoPalestra1.0" (54ª): nel feed si sa già dove si è,
  // la firma serve alla card che esce dall'app. La data va in quella riga
  // solo se è l'ULTIMO blocco (com'è di base): chi l'ha messa altrove la
  // ritrova dove l'ha messa.
  const dataInFondo = lista[lista.length - 1]?.tipo === 'data'
  // La data, e accanto l'orario dell'allenamento se l'opzione è accesa (lo è
  // di base) e se c'è una durata da cui ricavare l'inizio.
  const orario = on('orario') ? orarioAllenamento(voce.data, voce.durataSec) : ''
  const testoData = [dataLunga(voce.data), orario].filter(Boolean).join(' · ')
  const blocchi = dataInFondo ? lista.slice(0, -1) : lista
  const numeriFirma = on('firma')
    ? [
        stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null,
        stat.durataSec > 0 ? durataLunga(stat.durataSec) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const blocco = (p, i) => {
    switch (p.tipo) {
      case 'data':
        return <div key={i} className="rp-data">{testoData}</div>
      case 'titolo':
        return <h2 key={i} className="rp-titolo">{voce.nomeGiorno || 'Allenamento'}</h2>
      case 'sottotitolo':
        return <div key={i} className="rp-sottotitolo">{p.testo}</div>
      case 'griglia': {
        // La striscia: tutti i numeri su una riga. Da quattro in su, fitta.
        const fitta = p.tessere.length >= 4
        return (
          <div key={i} className={'rp-striscia' + (fitta ? ' fitta' : '')}>
            {p.tessere.map((t) => (
              <div key={t.etichetta} className="rp-cella">
                <span className="rp-etichetta">{(fitta && t.corta) || t.etichetta}</span>
                <span className={'rp-valore' + (t.accento ? ' accento' : '')}>
                  {(fitta && t.valoreCorto) || t.valore}
                </span>
                {t.nota && <span className="rp-piccolo">{(fitta && t.notaCorta) || t.nota}</span>}
              </div>
            ))}
          </div>
        )
      }
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
    <div className="rp" ref={scatola}>
      <div className="rp-dentro" ref={dentro}>
        {blocchi.map(blocco)}
        {(dataInFondo || numeriFirma) && (
          <div className="rp-firma">
            <span className="rp-firma-data">{dataInFondo ? testoData : ''}</span>
            <span>{numeriFirma}</span>
          </div>
        )}
      </div>
    </div>
  )
}
