import { useEffect, useRef, useState } from 'react'
import { esercizioDelMinuto, intervalli, statoOrologio, testoEmom } from '../lib/emom'
import { fasiDi, formattaCarico, formattaRip } from '../lib/schema'
import { beep, sbloccaAudio } from '../hooks/useRestTimer'
import { ConfermaBip } from './TimerRecupero'
import { IconCampana, IconClose, IconPlay } from './icons'

// ---------------------------------------------------------------------------
// L'EMOM in allenamento (lib/emom). Non ha una card sua: l'esercizio di turno
// si mostra con la card di sempre (WorkoutSession, CardEsercizio: serie, peso,
// pallini, "Com'è andata?"), e l'orologio sta in cima al posto del recupero
// (OrologioEmom), con la stessa faccia. Qui ci sono i tre pezzi che servono:
// - useOrologio: dov'è l'orologio, calcolato dall'istante di partenza salvato
//   nella sessione (`emom.inizio`): regge lo schermo spento e "Esci" → "Riprendi";
// - MotoreEmom: senza faccia, montato per ogni EMOM: bip e vibrazione a ogni
//   intervallo, la serie in più se manca, la chiusura a tempo scaduto;
// Quale esercizio e quale serie mostrare nella card: lib/emom, vistaEmom.
// L'orologio non si ferma mai: un intervallo non dato resta in sospeso, e a
// fine EMOM vale fatto come da piano (lib/session chiudiEmom).
// ---------------------------------------------------------------------------

// Il conto dell'intervallo come un orologio: 1:00, 0:59 … 0:05.
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function useOrologio(emom) {
  const finito = emom.minutiFatti != null
  const corre = emom.inizio != null && !finito
  const [adesso, setAdesso] = useState(() => Date.now())
  useEffect(() => {
    if (!corre) return
    const t = setInterval(() => setAdesso(Date.now()), 250)
    return () => clearInterval(t)
  }, [corre])
  const stato = corre ? statoOrologio(emom.inizio, emom, adesso) : null
  return { stato, corre, finito, tot: intervalli(emom), minuto: stato && !stato.pronti ? stato.minuto : null }
}

/**
 * Bip (se acceso) e vibrazione a ogni intervallo nuovo, la serie in più se
 * manca (a oltranza, o oltre le 30 della sessione) e la chiusura quando il
 * tempo è finito. `onMinuto`: è cambiato l'intervallo (la card torna su chi
 * tocca adesso). Riprendendo a metà non suona: l'intervallo era già iniziato.
 */
export function MotoreEmom({ emom, onMinuto, onCresci, onChiudi }) {
  const { stato, tot, minuto } = useOrologio(emom)
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
export function OrologioEmom({ esercizi, blocco, timer, onAvvia, onFerma }) {
  const emom = esercizi[blocco.inizio].emom
  const { stato, corre, finito, tot, minuto } = useOrologio(emom)
  const [confermaBip, setConfermaBip] = useState(false)
  const n = blocco.indici.length
  const di = (m) => esercizi[blocco.indici[esercizioDelMinuto(n, m).k]]

  let titolo = testoEmom(emom)
  let numero = mmss(emom.ogniSec)
  let sotto = 'Premi ▶ per partire'
  if (finito) {
    titolo = 'EMOM finito ✓'
    numero = '✓'
    sotto = testoEmom(emom)
  } else if (stato?.pronti) {
    titolo = 'Pronti…'
    numero = mmss(stato.pronti)
    sotto = `Si parte con ${di(0).nome}`
  } else if (minuto != null) {
    titolo = `${emom.ogniSec === 60 ? 'Minuto' : 'Intervallo'} ${minuto + 1}${tot != null ? ` di ${tot}` : ''}`
    numero = mmss(stato.restanteSec)
    const ultimo = tot != null && minuto + 1 >= tot
    sotto = ultimo ? "L'ultimo" : `Poi: ${inBreve(di(minuto + 1))}`
  }

  return (
    <div className="recupero-striscia">
      <div className="recupero-titolo emom-titolo-striscia">{titolo}</div>
      <div className="recupero-tempo">
        <span className={'recupero-numero' + (stato && !stato.pronti && stato.restanteSec <= 3 ? ' emom-ultimi' : '')}>
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
export function TestaEmom({ esercizi, blocco, i, onEsercizio }) {
  const emom = esercizi[blocco.inizio].emom
  return (
    <div className="emom-testa">
      <span className="emom-testa-titolo">{testoEmom(emom)}</span>
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
