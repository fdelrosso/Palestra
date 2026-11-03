import { useEffect, useRef, useState } from 'react'
import { circuitoChiuso, esercizioDelMinuto, intervalli, statoOrologio, testoCircuito } from '../lib/circuiti'
import { fasiDi, formattaCarico, formattaRip } from '../lib/schema'
import { beep, sbloccaAudio } from '../hooks/useRestTimer'
import { ConfermaBip } from './TimerRecupero'
import { IconCampana, IconClose, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// Un circuito con l'orologio in allenamento (lib/circuiti; per ora l'EMOM).
// Non ha una card sua: l'esercizio di turno si mostra con la card di sempre (WorkoutSession, CardEsercizio: serie, peso,
// pallini, "Com'è andata?"), e l'orologio sta in cima al posto del recupero
// (OrologioCircuito), con la stessa faccia. Qui ci sono i tre pezzi che servono:
// - useOrologio: dov'è l'orologio, calcolato dall'istante di partenza salvato
//   nella sessione (`circuito.inizio`): regge lo schermo spento e "Esci" → "Riprendi";
// - MotoreCircuito: senza faccia, montato per ogni circuito: bip e vibrazione a ogni
//   intervallo, la serie in più se manca, la chiusura a tempo scaduto;
// Quale esercizio e quale serie mostrare nella card: lib/circuiti, vistaCircuito.
// L'orologio non si ferma mai: un intervallo non dato resta in sospeso, e a
// fine EMOM vale fatto come da piano (lib/session chiudiCircuito).
// ---------------------------------------------------------------------------

// Il conto dell'intervallo come un orologio: 1:00, 0:59 … 0:05.
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// `finito`: chiuso coi risultati; `stato.finito`: tempo scaduto. `minuto`:
// l'intervallo in corso, null nel "Pronti…" (a tempo scaduto, il totale).
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
  const minuto = stato && stato.fase !== 'pronti' ? stato.intervallo : null
  return { stato, corre, finito, tot: intervalli(c), minuto }
}

/**
 * Bip (se acceso) e vibrazione a ogni intervallo nuovo, la serie in più se
 * manca (a oltranza, o oltre le 30 della sessione) e la chiusura quando il
 * tempo è finito. `onMinuto`: è cambiato l'intervallo (la card torna su chi
 * tocca adesso). Riprendendo a metà non suona: l'intervallo era già iniziato.
 */
export function MotoreCircuito({ circuito, onMinuto, onCresci, onChiudi }) {
  const { stato, tot, minuto } = useOrologio(circuito)
  const ultimo = useRef(null)
  useEffect(() => {
    if (minuto == null) return
    if (stato.finito) {
      onChiudi(tot)
      return
    }
    if (ultimo.current === minuto) return
    if (ultimo.current !== null || minuto === 0) {
      beep()
      navigator.vibrate?.(200)
    }
    ultimo.current = minuto
    onCresci(minuto)
    onMinuto()
  }, [minuto, stato?.finito]) // eslint-disable-line react-hooks/exhaustive-deps
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
export function OrologioCircuito({ esercizi, blocco, timer, onAvvia, onFerma }) {
  const c = esercizi[blocco.inizio].circuito
  const { stato, corre, finito, tot, minuto } = useOrologio(c)
  const [confermaBip, setConfermaBip] = useState(false)
  const n = blocco.indici.length
  const di = (m) => esercizi[blocco.indici[esercizioDelMinuto(n, m).k]]

  let titolo = testoCircuito(c)
  let numero = mmss(c.ogniSec)
  let sotto = 'Premi ▶ per partire'
  if (finito) {
    titolo = 'EMOM finito ✓'
    numero = '✓'
    sotto = testoCircuito(c)
  } else if (stato?.fase === 'pronti') {
    titolo = 'Pronti…'
    numero = mmss(stato.numero)
    sotto = `Si parte con ${di(0).nome}`
  } else if (minuto != null) {
    titolo = `${c.ogniSec === 60 ? 'Minuto' : 'Intervallo'} ${minuto + 1}${tot != null ? ` di ${tot}` : ''}`
    numero = mmss(stato.numero)
    const ultimo = tot != null && minuto + 1 >= tot
    sotto = ultimo ? "L'ultimo" : `Poi: ${inBreve(di(minuto + 1))}`
  }

  const ultimi = stato && stato.fase !== 'pronti' && stato.numero <= 3
  return (
    <div className="recupero-striscia">
      <div className="recupero-titolo circuito-titolo-striscia">{titolo}</div>
      <div className="recupero-tempo">
        <span className={'recupero-numero' + (ultimi ? ' circuito-ultimi' : '')}>
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
            aria-label="Avvia EMOM"
            title="Avvia EMOM"
            onClick={() => {
              sbloccaAudio()
              onAvvia()
            }}
          >
            <IconPlay aria-hidden="true" />
          </button>
        )}
        {/* Non durante il "Pronti…": un tocco per sbaglio chiuderebbe l'EMOM a zero. */}
        {corre && minuto != null && (
          <button
            className="btn btn-sm"
            aria-label={tot == null ? 'Non ce la faccio più' : 'Ferma'}
            title={tot == null ? 'Non ce la faccio più' : 'Ferma'}
            onClick={() => {
              if (tot != null && !confirm('Fermare l’EMOM? Valgono gli intervalli fatti.')) return
              onFerma(minuto)
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
 * Sopra il nome, nella card: che è un EMOM e, con più esercizi, chi c'è —
 * toccandone uno la card passa a lui (per dare una serie rimasta in sospeso).
 */
export function TestaCircuito({ esercizi, blocco, i, onEsercizio }) {
  const c = esercizi[blocco.inizio].circuito
  return (
    <div className="circuito-testa">
      <span className="circuito-testa-titolo">{testoCircuito(c)}</span>
      {blocco.indici.length > 1 &&
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
