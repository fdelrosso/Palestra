import { useEffect, useRef, useState } from 'react'
import {
  circuitoChiuso,
  esercizioDelMinuto,
  intervalli,
  nomeCircuito,
  statoOrologio,
  testoCircuito,
} from '../lib/circuiti'
import { fasiDi, formattaCarico, formattaRip } from '../lib/schema'
import { beep, sbloccaAudio } from '../hooks/useRestTimer'
import { ConfermaBip } from './TimerRecupero'
import { IconCampana, IconClose, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Un circuito con l'orologio in allenamento (lib/circuiti: EMOM, Tabata, AMRAP, For time).
// Non ha una card sua: l'esercizio di turno si mostra con la card di sempre (WorkoutSession, CardEsercizio: serie, peso,
// pallini, "Com'è andata?"), e l'orologio sta in cima al posto del recupero
// (OrologioCircuito), con la stessa faccia. Qui ci sono i tre pezzi che servono:
// - useOrologio: dov'è l'orologio, calcolato dall'istante di partenza salvato
//   nella sessione (`circuito.inizio`): regge lo schermo spento e "Esci" → "Riprendi";
// - MotoreCircuito: senza faccia, montato per ogni circuito: bip e vibrazione a ogni
//   cambio di fase, la serie in più se manca, la chiusura a tempo scaduto;
// Quale esercizio e quale serie mostrare nella card: lib/circuiti, vistaCircuito.
// L'orologio non si ferma mai: un intervallo non dato resta in sospeso, e a
// fine EMOM e Tabata vale fatto come da piano (lib/session chiudiCircuito).
// ---------------------------------------------------------------------------

// Il conto dell'intervallo come un orologio: 1:00, 0:59 … 0:05.
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// `finito`: chiuso coi risultati; `stato.finito`: tempo scaduto.
function useOrologio(c) {
  const finito = circuitoChiuso(c)
  const corre = c.inizio != null && !finito
  const [adesso, setAdesso] = useState(() => Date.now())
  useEffect(() => {
    if (!corre) return
    const t = setInterval(() => setAdesso(Date.now()), 250)
    return () => clearInterval(t)
  }, [corre])
  const stato = corre ? statoOrologio(c, c.inizio, adesso) : null
  return { stato, corre, finito, tot: intervalli(c) }
}

/**
 * Bip (se acceso) e vibrazione a ogni cambio di fase (nel Tabata anche fra
 * lavoro e riposo), la serie in più se manca (a oltranza, o oltre le 30 della
 * sessione) e la chiusura quando il tempo è finito: `onChiudi(stato)`.
 * `onMinuto`: è cambiata la fase (la card torna su chi tocca adesso).
 */
export function MotoreCircuito({ circuito: c, onMinuto, onCresci, onChiudi }) {
  const { stato } = useOrologio(c)
  const ultimo = useRef(null)
  const chiave = stato && stato.fase !== 'pronti' ? `${stato.fase}:${stato.intervallo}` : null
  useEffect(() => {
    if (chiave == null) return
    if (stato.finito) {
      onChiudi(stato)
      return
    }
    if (ultimo.current === chiave) return
    // Riprendendo a metà non suona: la fase era già iniziata.
    if (ultimo.current !== null || stato.intervallo === 0 || stato.intervallo == null) {
      beep()
      navigator.vibrate?.(200)
    }
    ultimo.current = chiave
    if (stato.fase === 'lavoro') onCresci(stato.intervallo)
    onMinuto()
  }, [chiave, stato?.finito]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// "Burpee ×8 · 20kg": l'esercizio in una riga, per dire chi viene dopo.
function inBreve(e) {
  const f = fasiDi(e.schema)[0] || {}
  const rip = formattaRip(f.rip)
  return [e.nome, rip && `×${rip}`, formattaCarico(f.carico)].filter(Boolean).join(' · ')
}

/**
 * L'orologio in cima, al posto del recupero e con la sua faccia (TimerRecupero):
 * il titolo, il numero grande, una riga sotto, e i tasti (bip, ▶ / ferma).
 */
export function OrologioCircuito({ esercizi, blocco, timer, giriFatti = 0, onAvvia, onFerma }) {
  const c = esercizi[blocco.inizio].circuito
  const { stato, corre, finito, tot } = useOrologio(c)
  const [confermaBip, setConfermaBip] = useState(false)
  const n = blocco.indici.length
  const di = (m) => esercizi[blocco.indici[esercizioDelMinuto(n, m).k]]
  const m = stato?.intervallo
  const poi = (x) => (tot != null && x >= tot ? "L'ultimo" : `Poi: ${inBreve(di(x))}`)
  const giro = `giro ${m + 1} di ${tot}`

  let titolo = testoCircuito(c)
  const fermo = { emom: c.ogniSec, tabata: c.lavoroSec, amrap: c.minuti * 60 }[c.tipo] ?? 0
  let numero = mmss(stato ? stato.numero : fermo)
  let sotto = 'Premi ▶ per partire'
  if (finito) {
    titolo = 'Finito ✓'
    numero = '✓'
    sotto = testoCircuito(c)
  } else if (stato?.fase === 'pronti') {
    titolo = 'Pronti…'
    sotto = `Si parte con ${di(0).nome}`
  } else if (stato && c.tipo === 'emom') {
    titolo = `${c.ogniSec === 60 ? 'Minuto' : 'Intervallo'} ${m + 1}${tot != null ? ` di ${tot}` : ''}`
    sotto = poi(m + 1)
  } else if (stato?.fase === 'lavoro') {
    titolo = `LAVORO · ${giro}`
    sotto = 'Poi: riposo'
  } else if (stato?.fase === 'riposo') {
    titolo = `RIPOSO · ${giro}`
    sotto = poi(m + 1)
  } else if (stato && c.tipo === 'amrap') {
    titolo = `AMRAP · giro ${giriFatti + 1}`
    sotto = `Giri fatti: ${giriFatti}`
  } else if (stato && c.tipo === 'fortime') {
    titolo = `For time · giro ${giriFatti + 1} di ${c.giri}`
    sotto = c.capMinuti != null ? `cap ${c.capMinuti}'` : 'senza limite'
  }

  // Gli ultimi 3" di ogni fase alla rovescia (il For time va in avanti).
  const ultimi = stato && stato.fase !== 'pronti' && c.tipo !== 'fortime' && stato.numero <= 3
  const riposo = stato?.fase === 'riposo'
  const nome = nomeCircuito(c.tipo)
  return (
    <div className="recupero-striscia">
      <div className={`recupero-titolo circuito-titolo-striscia tipo-${c.tipo}`}>{titolo}</div>
      <div className="recupero-tempo">
        <span className={'recupero-numero' + (riposo ? ' circuito-riposo' : '') + (ultimi ? ' circuito-ultimi' : '')}>
          {numero}
        </span>
        <span className="recupero-sotto">{sotto}</span>
      </div>
      <div className="recupero-tasti">
        <button
          className={'btn btn-sm' + (timer.bip ? ' bip-acceso' : '')}
          aria-pressed={timer.bip}
          aria-label={timer.bip ? 'Bip a ogni intervallo: attivo' : 'Bip a ogni intervallo: spento'}
          onClick={() => (timer.bip ? timer.impostaBip(false) : setConfermaBip(true))}
        >
          <IconCampana spenta={!timer.bip} aria-hidden="true" />
        </button>
        {!corre && !finito && (
          <button
            className="btn btn-sm recupero-play"
            aria-label={`Avvia ${nome}`}
            title={`Avvia ${nome}`}
            onClick={() => {
              sbloccaAudio()
              onAvvia()
            }}
          >
            <IconPlay aria-hidden="true" />
          </button>
        )}
        {/* Non durante il "Pronti…": un tocco per sbaglio chiuderebbe il circuito a zero. */}
        {corre && stato.fase !== 'pronti' && (
          <button
            className="btn btn-sm"
            aria-label={tot == null ? 'Non ce la faccio più' : 'Ferma'}
            title={tot == null ? 'Non ce la faccio più' : 'Ferma'}
            onClick={() => {
              if (tot != null && !confirm('Fermare il circuito? Valgono gli intervalli fatti.')) return
              // EMOM e Tabata: gli intervalli fatti (nel riposo il giro c'è); AMRAP e For time: Task 5.
              if (m == null) onFerma()
              else onFerma(m + (riposo ? 1 : 0))
            }}
          >
            <IconClose aria-hidden="true" />
          </button>
        )}
      </div>
      {confermaBip && (
        <ConfermaBip quando="recupero" onAttiva={() => timer.impostaBip(true)} onChiudi={() => setConfermaBip(false)} />
      )}
    </div>
  )
}

/**
 * Sopra il nome, nella card: che circuito è e, con più esercizi e `onEsercizio`,
 * chi c'è — toccandone uno la card passa a lui (per dare una serie rimasta in
 * sospeso). A giri: il solo titolo.
 */
export function TestaCircuito({ esercizi, blocco, i, onEsercizio }) {
  const c = esercizi[blocco.inizio].circuito
  return (
    <div className={`circuito-testa tipo-${c.tipo}`}>
      <span className="circuito-testa-titolo">{testoCircuito(c)}</span>
      {onEsercizio && blocco.indici.length > 1 &&
        blocco.indici.map((x) => (
          <button
            key={x}
            type="button"
            className={'chip chip-scelta' + (x === i ? ' on' : '')}
            aria-pressed={x === i}
            onClick={() => onEsercizio(x)}
          >
            {esercizi[x].nome}
          </button>
        ))}
    </div>
  )
}
