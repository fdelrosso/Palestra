import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORI } from '../lib/session'
import { formatCarico, formatSerieRip } from '../lib/format'
import {
  caricoMassimoFatto,
  eserciziDeiGruppi,
  formattaMigliaia,
  gruppiAllenati,
  statisticheRecap,
  ultimaVolta,
} from '../lib/recap'
import { formattaNumero } from '../lib/carico'
import { formattaCarico, obiettivoSerie } from '../lib/schema'
import { normalizzaNome } from '../lib/eserciziLibreria'
import CorpoAllenato, { LegendaCalore } from './CorpoAllenato'
import CorpoZoom, { PastiglieGruppi } from './CorpoZoom'
import { acceso } from '../lib/recapLayout'
import { IconCatena, IconSearch } from './icons'

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']

// La durata come [valore, unità]: "52" min, "1:05" h, "45" s.
function durata(sec) {
  const m = Math.round(sec / 60)
  if (m < 1) return [Math.round(sec), 's']
  if (m < 60) return [m, 'min']
  return [`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, 'h']
}

// In fondo alla card dell'esercizio, una riga sola: il peso più alto di oggi
// contro quello dell'ultima volta (lib/recap, ultimaVolta) e, se è il più alto
// di sempre, "Record". Niente se non c'è niente da confrontare.
function Confronto({ oggi, prima, record }) {
  const pillola = record && (
    <span className="riep-record">Record · prima {formattaNumero(record.precedente)} kg</span>
  )
  if (!oggi || !prima) return pillola ? <div className="riep-confronto">{pillola}</div> : null
  const diff = Math.round((oggi.numero - prima.numero) * 100) / 100
  const [classe, testo] =
    diff > 0
      ? ['su', `▲ +${formattaNumero(diff)} kg dall’ultima volta`]
      : diff < 0
        ? ['giu', `▼ −${formattaNumero(-diff)} kg dall’ultima volta`]
        : ['pari', '= come l’ultima volta']
  return (
    <div className="riep-confronto">
      <span className={classe}>{testo}</span>
      {pillola}
    </div>
  )
}

// "Petto", "Petto e Tricipiti", "Petto, Spalle e Tricipiti".
function elencoNomi(nomi) {
  if (nomi.length < 2) return nomi[0] || ''
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}

// Corpo del riepilogo di un allenamento: tempo totale, il CORPO coi muscoli
// lavorati accesi di rosso, legenda sforzo e dettaglio degli esercizi con i
// pallini colorati per serie.
// È il "recap preciso" mostrato sia alla fine di un allenamento (WorkoutSession)
// sia cliccando un giorno cerchiato nel calendario. Componente di sola
// presentazione: la schermata che lo usa aggiunge topbar/azioni proprie.
//
// I GRUPPI SI SCELGONO: toccando una pastiglia ("Petto · 12") o un muscolo
// acceso sul corpo, sotto restano solo gli esercizi di quel gruppo; se ne
// possono scegliere più d'uno, e "Mostra tutti" torna all'elenco intero. La
// regola è quella delle pastiglie (lib/recap, eserciziDeiGruppi): le serie
// della pastiglia sono le serie degli esercizi che restano.
// `gruppiIniziali`: si apre già scelto — è il feed, dove si tocca un gruppo
// nella scheda di qualcuno. Allora si scende dritti agli esercizi: è quello
// che si voleva vedere, e il corpo sta sopra.
// "Ingrandisci" apre il corpo a tutto schermo (components/CorpoZoom), per
// prendere col dito anche i muscoli piccoli: la scelta è la stessa.
//
// In testa i NUMERI dell'allenamento, gli stessi della card (lib/recap,
// statisticheRecap): tempo, serie, esercizi, volume e quelli dell'orologio.
// Prima c'era solo il tempo (2026-10-21). `schede` = le schede di chi si è
// allenato: con quelle si riconoscono i RECORD, e ognuno sta sulla card del
// suo esercizio. Chi guarda l'allenamento di un altro non le ha: niente record.
export default function RiepilogoDettaglio({ riep, gruppiIniziali = [], schede = [] }) {
  const esercizi = riep.esercizi || []
  const stat = useMemo(() => statisticheRecap(riep, { schede }), [riep, schede])
  const recordDi = new Map(stat.record.map((r) => [r.esercizio, r]))
  // L'ultima volta di ogni esercizio, per il "+2,5 kg" (solo coi propri dati).
  const prima = useMemo(() => ultimaVolta(schede, riep.data), [schede, riep.data])
  // [valore, unità, cosa è]: l'unità piccola accanto al numero, così "5.536
  // kg" non va più a capo (2026-10-21).
  const numeri = [
    riep.durataSec != null && [...durata(riep.durataSec), 'Tempo'],
    stat.serieFatte > 0 && [stat.serieFatte, '', 'Serie'],
    stat.numEsercizi > 0 && [stat.numEsercizi, '', stat.numEsercizi === 1 ? 'Esercizio' : 'Esercizi'],
    stat.volume > 0 && [formattaMigliaia(stat.volume), 'kg', 'Volume'],
    stat.calorie != null && [stat.calorie, 'kcal', 'Calorie'],
    stat.fcMedia != null && [stat.fcMedia, 'bpm', 'Battito medio'],
    stat.fcMax != null && [stat.fcMax, 'bpm', 'Battito max'],
  ].filter(Boolean)
  // Dove è andato il lavoro di oggi: gli stessi conteggi delle pillole colorate
  // della card, così le due viste del recap non possono raccontarsi diverse.
  const gruppi = useMemo(() => gruppiAllenati(riep.esercizi), [riep.esercizi])
  // Due viste dei muscoli: i colori dei gruppi, o "Per intensità" (tre livelli
  // di blu, lib/corpoForme LIVELLI_CALORE). Si parte da quella scelta da chi si è allenato nel
  // suo recap (lib/recapLayout); chi guarda la cambia qui, solo per sé e solo
  // finché il recap è aperto.
  const [calore, setCalore] = useState(() => acceso(riep.recap, 'calore'))

  const [scelti, setScelti] = useState(gruppiIniziali)
  // Solo quelli che ci sono: un gruppo scelto che l'allenamento non ha (il
  // recap ricaricato con dati diversi) filtrerebbe via tutto senza dire perché.
  const attivi = scelti.filter((id) => gruppi.some((g) => g.id === id))
  const alterna = (id) =>
    setScelti((prima) => (prima.includes(id) ? prima.filter((x) => x !== id) : [...prima, id]))
  const visibili = eserciziDeiGruppi(esercizi, attivi)
  const nomiScelti = gruppi.filter((g) => attivi.includes(g.id)).map((g) => g.label)

  const elenco = useRef(null)

  const [zoom, setZoom] = useState(false)
  // Chiudendo lo zoom con dei gruppi scelti si va agli esercizi: è lì che si
  // vede cosa ha fatto la scelta.
  // ⚠️ Si scorre DOPO che lo zoom è sparito (l'effetto qui sotto), non nel
  // tocco su "Fatto": uno scorrimento morbido partito mentre lo strato sopra
  // si smonta il browser lo annulla, e si restava fermi sul corpo.
  const versoGliEsercizi = useRef(false)
  const chiudiZoom = () => {
    versoGliEsercizi.current = attivi.length > 0
    setZoom(false)
  }
  useEffect(() => {
    if (zoom || !versoGliEsercizi.current) return
    versoGliEsercizi.current = false
    elenco.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [zoom])

  const daUnGruppo = gruppiIniziali.length > 0
  useEffect(() => {
    if (daUnGruppo) elenco.current?.scrollIntoView({ block: 'start' })
  }, [daUnGruppo])

  return (
    <>
      {/* Niente riquadro: i numeri su una griglia piana, divisi da un filo. In
          un box con dentro altri box pesava troppo (2026-10-21). */}
      {numeri.length > 0 && (
        <div className="riep-testa">
          <div className="riep-testa-nome">
            {riep.nomeGiorno}
            {riep.settimana != null && ` · Settimana ${riep.settimana}`}
          </div>
          <div className="riep-numeri">
            {numeri.map(([valore, unita, label]) => (
              <div key={label} className="riep-numero">
                <span className="riep-numero-label">{label}</span>
                <span className="riep-numero-valore">
                  {valore}
                  {unita && <small>{unita}</small>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Il commento scritto nel recap di fine allenamento, subito sotto i
          numeri: è la cosa più personale. Torna a galla anche riaprendo
          l'allenamento dal calendario. */}
      {riep.nota && <div className="riep-nota">{riep.nota}</div>}

      {gruppi.length > 0 && (
        <div className="card corpo-card">
          {/* Il margine del titolo passa alla riga: dentro, il tasto si
              centrerebbe su titolo + margine e starebbe piu' in basso. */}
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div className="card-titolo" style={{ marginBottom: 0 }}>
              Muscoli allenati
            </div>
            <button
              type="button"
              className="chip chip-azione"
              onClick={() => setZoom(true)}
              aria-label="Ingrandisci il corpo per scegliere i muscoli"
            >
              <IconSearch width={14} height={14} />
              Ingrandisci
            </button>
          </div>
          <div className="segmented corpo-viste">
            {[
              [false, 'Colori dei gruppi'],
              [true, 'Per intensità'],
            ].map(([v, label]) => (
              <button
                key={label}
                type="button"
                className={'seg-btn' + (calore === v ? ' on' : '')}
                aria-pressed={calore === v}
                onClick={() => setCalore(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <CorpoAllenato gruppi={gruppi} selezionati={attivi} onGruppo={alterna} calore={calore} />
          {/* Nella vista "Per intensità" la legenda c'è sempre: senza, i tre
              colori non dicono niente a chi guarda. */}
          {calore && <LegendaCalore className="corpo-legenda" />}
          <PastiglieGruppi gruppi={gruppi} attivi={attivi} onAlterna={alterna} calore={calore} style={{ marginTop: 4 }} />
          {zoom && (
            <CorpoZoom gruppi={gruppi} attivi={attivi} onAlterna={alterna} onChiudi={chiudiZoom} calore={calore} />
          )}
        </div>
      )}

      <div className="section-title" ref={elenco} style={{ scrollMarginTop: 8 }}>
        {attivi.length ? `Esercizi di ${elencoNomi(nomiScelti)}` : 'Esercizi svolti'}
      </div>
      {attivi.length > 0 && (
        <div className="esercizi-filtro">
          <span className="muted">
            {visibili.length} di {esercizi.length} esercizi
          </span>
          <button type="button" className="chip chip-azione" onClick={() => setScelti([])}>
            Mostra tutti
          </button>
        </div>
      )}
      <div className="stack" style={{ gap: 10 }}>
        {visibili.map(({ esercizio: e, indice: i }) => {
          const fatti = e.sets.filter((s) => s.colore).length
          return (
            <div key={i} className="ex-card">
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div className="nome" style={{ fontSize: 15 }}>{e.nome}</div>
                <span className="badge">{fatti}/{e.sets.length} serie</span>
              </div>
              {/* Fatto in superserie col precedente: resta un esercizio a sé,
                  coi suoi pallini, ma si dice con chi andava. */}
              {i > 0 && e.insiemeAlPrecedente && (
                <div className="superserie-sub row" style={{ gap: 5, fontSize: 12.5, marginTop: 2 }}>
                  <IconCatena width={13} height={13} /> In superserie con {esercizi[i - 1].nome}
                </div>
              )}
              <div className="ex-scheme" style={{ marginTop: 10 }}>
                {formatSerieRip(e.schema) && <span className="chip">{formatSerieRip(e.schema)}</span>}
                {formatCarico(e.schema) && <span className="chip">{formatCarico(e.schema)}</span>}
              </div>
              {/* Ogni serie: il pallino del colore e sotto cosa si è fatto,
                  carico e ripetizioni (prima era una riga di testo a parte). */}
              <div className="set-dots riep-serie" style={{ marginTop: 10 }}>
                {e.sets.map((s, j) => {
                  const kg = s.kg != null ? formattaCarico({ tipo: 'kg', valore: s.kg, coppia: !!obiettivoSerie(e.schema, j).carico?.coppia }) : ''
                  return (
                    <div key={j} className="riep-serie-una">
                      <div className={'set-dot' + (s.colore ? ' ' + s.colore : '')}>{!s.colore ? '–' : ''}</div>
                      {s.colore && kg && <span>{kg}</span>}
                      {s.colore && s.rip != null && <span>×{formattaNumero(s.rip)}</span>}
                    </div>
                  )
                })}
              </div>
              <Confronto
                oggi={caricoMassimoFatto(e)}
                prima={prima.get(normalizzaNome(e.nome))}
                record={recordDi.get(e.nome)}
              />
            </div>
          )
        })}
      </div>

      {/* Cosa dicono i colori dei pallini: in fondo, chi usa l'app lo sa già. */}
      <div className="row" style={{ gap: 14, margin: '14px 2px 4px', fontSize: 13 }}>
        {ORDINE_COLORI.map((c) => (
          <span key={c} className="row" style={{ gap: 6 }}>
            <span className={'dot-mini ' + c} />
            <span className="muted">{COLORI[c].label}</span>
          </span>
        ))}
      </div>
    </>
  )
}
