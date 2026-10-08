import { useState } from 'react'
import { formatSec, presetRecupero } from '../lib/parseRecupero'
import { bipFermaLaMusica } from '../hooks/useRestTimer'
import { IconCampana } from './icons'

// ---------------------------------------------------------------------------
// LA STRISCIA DEL RECUPERO: il numero, il menu dei tempi, start/pausa/reset.
// Sta in cima all'allenamento (pages/WorkoutSession), in una card grande:
// chiusa una serie il recupero parte da solo, e lo si ritrova lì a ogni
// sguardo fra una serie e l'altra.
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
  // La conferma prima di accendere il bip (vedi in fondo).
  const [confermaBip, setConfermaBip] = useState(false)

  const scelta = Math.round(timer.durata)

  // Il recupero scelto deve esserci sempre fra le voci, anche se non cade
  // sulla scala dei 15".
  const voci = presetRecupero(recuperoScheda)
  if (!voci.includes(scelta)) voci.push(scelta)
  voci.sort((x, y) => x - y)

  return (
    <div className="recupero-striscia">
      <div className="recupero-tempo">
        <span className={'recupero-numero' + (timer.rimanente < 0 ? ' oltre' : '')}>
          {timer.rimanente < 0
            ? '+' + formatSec(Math.floor(-timer.rimanente))
            : formatSec(Math.ceil(timer.rimanente))}
        </span>
        {/* Il menu dei tempi accanto al numero, piccolo, come una didascalia:
            dice di cosa è il conto alla rovescia e si cambia da lì. Nativo,
            così sul telefono apre la ruota di sistema. */}
        <label className="recupero-scelta">
          Recupero
          <select
            className="select-recupero"
            aria-label="Recupero"
            value={scelta}
            onChange={(e) => timer.scegli(Number(e.target.value))}
          >
            {voci.map((sec) => (
              <option key={sec} value={sec}>
                {formatSec(sec) + (sec === recuperoScheda ? ' (scheda)' : '')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="recupero-tasti">
        {timer.attivo ? (
          <button className="btn btn-sm" onClick={timer.pausa}>
            Pausa
          </button>
        ) : (
          <button className="btn btn-sm" onClick={timer.avvia}>
            {timer.avviato ? 'Riprendi' : 'Start'}
          </button>
        )}
        <button className="btn btn-sm" onClick={timer.reset}>
          Reset
        </button>
        {/* IL BIP, spento di base. ⚠️ Su iPhone quando suona ferma la musica di
            chi la sta ascoltando, e la musica non riparte da sola
            (hooks/useRestTimer): per questo non è acceso per nessuno finché
            non lo accende lui, e prima di accenderlo glielo si dice. */}
        <button
          className={'btn btn-sm' + (timer.bip ? ' bip-acceso' : '')}
          aria-pressed={timer.bip}
          aria-label={timer.bip ? 'Bip a fine recupero: attivo' : 'Bip a fine recupero: spento'}
          onClick={() => (timer.bip ? timer.impostaBip(false) : setConfermaBip(true))}
        >
          <IconCampana spenta={!timer.bip} aria-hidden="true" />
        </button>
      </div>

      {confermaBip && (
        <div className="modal-backdrop" onClick={() => setConfermaBip(false)}>
          <div
            className="modal"
            role="dialog"
            aria-label="Attivare il bip?"
            style={{ textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Attivare il bip?</h3>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: '-4px 0 16px' }}>
              {bipFermaLaMusica() ? (
                <>
                  A fine recupero suona un bip, anche col telefono in silenzioso.{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    Quando suona, se stai ascoltando musica la musica si ferma
                  </strong>{' '}
                  e va rimessa a mano: su iPhone non si può fare diversamente.
                </>
              ) : (
                'A fine recupero suona un bip.'
              )}
            </p>
            {/* ⚠️ impostaBip DENTRO questo tocco: se il recupero è già
                partito, è qui che l'audio si sblocca. */}
            <button
              className="btn btn-accent btn-block btn-lg"
              onClick={() => {
                timer.impostaBip(true)
                setConfermaBip(false)
              }}
            >
              Attiva il bip
            </button>
            <button
              className="btn btn-ghost btn-block btn-sm"
              style={{ marginTop: 6 }}
              onClick={() => setConfermaBip(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
