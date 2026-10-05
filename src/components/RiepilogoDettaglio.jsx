import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORI, testoSerieFatte } from '../lib/session'
import { formatSec } from '../lib/parseRecupero'
import { formatCarico, formatSerieRip } from '../lib/format'
import { eserciziDeiGruppi, gruppiAllenati, numeroPositivo } from '../lib/recap'
import CorpoAllenato from './CorpoAllenato'
import CorpoZoom, { PastiglieGruppi } from './CorpoZoom'
import { IconCatena, IconSearch } from './icons'

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']

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
export default function RiepilogoDettaglio({ riep, gruppiIniziali = [] }) {
  const conteggio = (esercizio, colore) => esercizio.sets.filter((s) => s.colore === colore).length
  const esercizi = riep.esercizi || []
  // Numeri copiati dall'orologio a fine allenamento (facoltativi).
  const kcal = numeroPositivo(riep.calorieReali)
  const fcMedia = numeroPositivo(riep.fcMedia)
  const fcMax = numeroPositivo(riep.fcMax)
  // Dove è andato il lavoro di oggi: gli stessi conteggi delle pillole colorate
  // della card, così le due viste del recap non possono raccontarsi diverse.
  const gruppi = useMemo(() => gruppiAllenati(riep.esercizi), [riep.esercizi])

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
      {riep.durataSec != null && (
        <div className="hero" style={{ textAlign: 'center' }}>
          <div className="kicker">
            {riep.nomeGiorno} · Settimana {riep.settimana}
          </div>
          <div className="titolo" style={{ fontSize: 30 }}>{formatSec(riep.durataSec)}</div>
          <div className="muted" style={{ marginTop: 4 }}>tempo totale</div>
        </div>
      )}

      {gruppi.length > 0 && (
        <div className="card corpo-card">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <div className="card-titolo">Muscoli allenati</div>
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
          <CorpoAllenato gruppi={gruppi} selezionati={attivi} onGruppo={alterna} />
          <PastiglieGruppi gruppi={gruppi} attivi={attivi} onAlterna={alterna} style={{ marginTop: 4 }} />
          {zoom && <CorpoZoom gruppi={gruppi} attivi={attivi} onAlterna={alterna} onChiudi={chiudiZoom} />}
        </div>
      )}

      {(kcal || fcMedia || fcMax) && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '14px 2px 0' }}>
          {kcal && <span className="chip">🔥 {Math.round(kcal)} kcal</span>}
          {fcMedia && <span className="chip">♥ {Math.round(fcMedia)} bpm medi</span>}
          {fcMax && <span className="chip">♥ max {Math.round(fcMax)} bpm</span>}
        </div>
      )}

      <div className="row" style={{ gap: 14, margin: '16px 2px 4px', fontSize: 13 }}>
        {ORDINE_COLORI.map((c) => (
          <span key={c} className="row" style={{ gap: 6 }}>
            <span className={'dot-mini ' + c} />
            <span className="muted">{COLORI[c].label}</span>
          </span>
        ))}
      </div>

      {/* Il commento scritto nel recap di fine allenamento: qui torna a galla
          anche riaprendo l'allenamento dal calendario. */}
      {riep.nota && <div className="riep-nota">{riep.nota}</div>}

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
              <div className="set-dots" style={{ marginTop: 10 }}>
                {e.sets.map((s, j) => (
                  <div key={j} className={'set-dot' + (s.colore ? ' ' + s.colore : '')}>
                    {/* Una serie dura col suo numero: a quante ripetizioni si è arrivati. */}
                    {!s.colore ? '–' : s.colore === 'rosso' && s.rip != null ? s.rip : ''}
                  </div>
                ))}
                {conteggio(e, 'rosso') > 0 && (
                  <span className="chip chip-nota" style={{ marginLeft: 4 }}>
                    {conteggio(e, 'rosso')}× 🔴
                  </span>
                )}
              </div>
              {/* Cosa si è fatto davvero, serie per serie (lib/session). */}
              {testoSerieFatte(e) && (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  {testoSerieFatte(e)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
