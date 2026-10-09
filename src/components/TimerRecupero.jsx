import { useState } from 'react'
import { createPortal } from 'react-dom'
import { formatSec, presetRecupero } from '../lib/parseRecupero'
import { bipFermaLaMusica } from '../hooks/useRestTimer'
import { IconCampana, IconClose, IconPausa, IconPlay, IconReset } from './icons'

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
// Il tempo si cambia TOCCANDO IL NUMERO: sale un foglio coi tempi a pillola.
// Prima era un <select> a pillola accanto al numero, che nella fascia stretta
// del PiP (pages/WorkoutSession) non ci stava e stonava col cronometro.
// I preimpostati vanno di 15" in 15" (lib/parseRecupero). Il default è il
// recupero della scheda, e ci torna da solo a ogni cambio di esercizio: la
// scelta qui vale per il recupero che si sta facendo, non riscrive il
// programma del PT.
// ---------------------------------------------------------------------------

export default function TimerRecupero({ timer, recuperoScheda }) {
  // La conferma prima di accendere il bip (vedi in fondo).
  const [confermaBip, setConfermaBip] = useState(false)
  const [tempi, setTempi] = useState(false)

  const scelta = Math.round(timer.durata)

  // Il recupero scelto deve esserci sempre fra le voci, anche se non cade
  // sulla scala dei 15".
  const voci = presetRecupero(recuperoScheda)
  if (!voci.includes(scelta)) voci.push(scelta)
  voci.sort((x, y) => x - y)

  return (
    <div className="recupero-striscia">
      <div className="recupero-titolo">Recupero</div>
      <button
        type="button"
        className="recupero-tempo"
        aria-haspopup="dialog"
        aria-label={`Recupero di ${formatSec(scelta)}: cambia il tempo`}
        onClick={() => setTempi(true)}
      >
        <span className={'recupero-numero' + (timer.rimanente < 0 ? ' oltre' : '')}>
          {timer.rimanente < 0
            ? '+' + formatSec(Math.floor(-timer.rimanente))
            : formatSec(Math.ceil(timer.rimanente))}
        </span>
        {/* Sotto il numero, piccolo: il numero si tocca, e da solo non lo
            direbbe. Il nome della card sta sopra (recupero-titolo). */}
        <span className="recupero-sotto">Tocca per cambiare</span>
      </button>

      <div className="recupero-tasti">
        {/* IL BIP, PRIMA di play: cosi' play sta in mezzo fra bip e reset.
            Spento di base. ⚠️ Su iPhone quando suona ferma la musica di
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
        {/* Icone e non parole: nella fascia del PiP lo spazio e' poco, e play,
            pausa e reset si leggono da soli. Il nome resta nell'aria-label. */}
        {timer.attivo ? (
          <button className="btn btn-sm recupero-play" onClick={timer.pausa} aria-label="Pausa" title="Pausa">
            <IconPausa aria-hidden="true" />
          </button>
        ) : (
          <button
            className="btn btn-sm recupero-play"
            onClick={timer.avvia}
            aria-label={timer.avviato ? 'Riprendi' : 'Avvia'}
            title={timer.avviato ? 'Riprendi' : 'Avvia'}
          >
            <IconPlay aria-hidden="true" />
          </button>
        )}
        <button className="btn btn-sm" onClick={timer.reset} aria-label="Reset" title="Reset">
          <IconReset aria-hidden="true" />
        </button>
      </div>

      {/* Nel body: la fascia del PiP e' fissa e fa da contenitore, il foglio
          dentro di lei resterebbe sotto le card della pagina. */}
      {tempi &&
        createPortal(
          <div className="foglio-backdrop" onClick={() => setTempi(false)}>
            <div className="foglio" role="dialog" aria-label="Tempo di recupero" onClick={(e) => e.stopPropagation()}>
              <div className="foglio-maniglia" aria-hidden="true" />
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <h3>Recupero</h3>
                <button className="icon-btn" aria-label="Chiudi" onClick={() => setTempi(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="recupero-chips" role="radiogroup" aria-label="Tempo di recupero">
                {voci.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    role="radio"
                    aria-checked={sec === scelta}
                    className={'chip chip-scelta recupero-chip' + (sec === scelta ? ' on' : '')}
                    onClick={() => {
                      timer.scegli(sec)
                      setTempi(false)
                    }}
                  >
                    {formatSec(sec) + (sec === recuperoScheda ? ' · scheda' : '')}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

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
