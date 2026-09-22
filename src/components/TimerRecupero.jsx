import { useEffect, useRef } from 'react'
import { formatSec, presetRecupero } from '../lib/parseRecupero'

// ---------------------------------------------------------------------------
// LA CARD DEL RECUPERO: il numerone, i preimpostati, start/pausa/reset.
//
// Il conto alla rovescia vive in hooks/useRestTimer e arriva qui già fatto
// (`timer`): questo file è solo la faccia. ⚠️ Si tiene separato da
// WorkoutSession per un motivo pratico — l'allenamento sta dietro al login e
// dentro a uno store vero, mentre questa card ha bisogno di due props e basta,
// quindi si può aprire e TOCCARE in un browser (scratchpad/prova-timer.html).
// Le cose che rompono un timer sono cose da dita.
//
// I preimpostati vanno di 15" in 15" (lib/parseRecupero). Il default è il
// recupero della scheda, e ci torna da solo a ogni cambio di esercizio: la
// scelta qui vale per il recupero che si sta facendo, non riscrive il
// programma del PT.
// ---------------------------------------------------------------------------

export default function TimerRecupero({ timer, recuperoScheda }) {
  // La fila dei preimpostati, che scorre di lato.
  const filaRef = useRef(null)

  // Il recupero scelto deve VEDERSI: con la scala che scorre, un esercizio da
  // 2'30" lascerebbe la fila ferma su 0:30 e in evidenza niente, che è il modo
  // migliore per far sembrare rotta una cosa che funziona.
  // ⚠️ Se è già in vista non si tocca niente: la fila che scivola via da sola
  // sotto il dito appena si preme è peggio del problema che risolve.
  useEffect(() => {
    const fila = filaRef.current
    const scelto = fila?.querySelector('.chip-preset.on')
    if (!fila || !scelto) return
    const sinistra = scelto.offsetLeft
    const destra = sinistra + scelto.clientWidth
    if (sinistra >= fila.scrollLeft && destra <= fila.scrollLeft + fila.clientWidth) return
    // ⚠️ Posizione secca, niente `behavior: 'smooth'`: provandolo, in un
    // browser lo scorrimento morbido non faceva NIENTE — la fila restava
    // dov'era e il preimpostato scelto non compariva mai. Un salto si vede
    // appena e funziona ovunque; un'animazione che a volte non parte lascia
    // la cosa a metà, che è l'unico esito da evitare.
    fila.scrollLeft = Math.max(0, sinistra - (fila.clientWidth - scelto.clientWidth) / 2)
  }, [timer.durata])

  const scelta = Math.round(timer.durata)

  return (
    <div className="card" style={{ textAlign: 'center', marginTop: 6 }}>
      <div className="faint" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
        RECUPERO · scheda {formatSec(recuperoScheda)}
      </div>
      <div
        className={'timer-big' + (timer.rimanente < 0 ? ' over' : '')}
        style={{ margin: '8px 0 10px' }}
      >
        {timer.rimanente < 0
          ? '+' + formatSec(Math.floor(-timer.rimanente))
          : formatSec(Math.ceil(timer.rimanente))}
      </div>

      {/* ⚠️ Una riga sola che scorre di lato, e mai a capo: se andasse a capo
          la card cambierebbe altezza da un esercizio all'altro e i tasti qui
          sotto finirebbero ogni volta in un punto diverso. Si premono a
          memoria, col fiatone. */}
      <div className="preset-recupero" ref={filaRef} role="group" aria-label="Recupero preimpostato">
        {presetRecupero(recuperoScheda).map((sec) => (
          <button
            key={sec}
            type="button"
            className={
              'chip chip-preset' +
              (sec === scelta ? ' on' : '') +
              (sec === recuperoScheda ? ' di-scheda' : '')
            }
            aria-pressed={sec === scelta}
            aria-label={formatSec(sec) + (sec === recuperoScheda ? ' — il recupero della scheda' : '')}
            onClick={() => timer.scegli(sec)}
          >
            {formatSec(sec)}
          </button>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <button className="btn btn-sm" onClick={() => timer.aggiungi(-10)}>
          −10s
        </button>
        {timer.attivo ? (
          <button className="btn btn-sm" onClick={timer.pausa}>
            Pausa
          </button>
        ) : (
          <button className="btn btn-sm btn-accent" onClick={timer.avvia}>
            {timer.avviato ? 'Riprendi' : 'Start'}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => timer.aggiungi(10)}>
          +10s
        </button>
        <button className="btn btn-sm" onClick={timer.reset}>
          Reset
        </button>
      </div>
    </div>
  )
}
