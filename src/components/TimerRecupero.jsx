import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatSec, presetRecupero } from '../lib/parseRecupero'
import { beep, bipEsercizioAcceso, bipFermaLaMusica, impostaBipEsercizio, sbloccaAudio } from '../hooks/useRestTimer'
import { secondiFatti } from '../lib/session'
import { IconCampana, IconCheck, IconClose, IconIndietro, IconPausa, IconPlay, IconReset } from './icons'

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
        <ConfermaBip quando="recupero" onAttiva={() => timer.impostaBip(true)} onChiudi={() => setConfermaBip(false)} />
      )}
    </div>
  )
}

// Prima di accendere un bip (del recupero o dell'esercizio): su iPhone ferma
// la musica, e glielo si dice.
function ConfermaBip({ quando, onAttiva, onChiudi }) {
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
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
              A fine {quando} suona un bip, anche col telefono in silenzioso.{' '}
              <strong style={{ color: 'var(--text)' }}>Quando suona, se stai ascoltando musica la musica si ferma</strong>{' '}
              e va rimessa a mano: su iPhone non si può fare diversamente.
            </>
          ) : (
            `A fine ${quando} suona un bip.`
          )}
        </p>
        {/* ⚠️ onAttiva DENTRO questo tocco: se il timer è già partito, è qui
            che l'audio si sblocca. */}
        <button
          className="btn btn-accent btn-block btn-lg"
          onClick={() => {
            onAttiva()
            onChiudi()
          }}
        >
          Attiva il bip
        </button>
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IL TIMER DI UN ESERCIZIO A TEMPO (116ª): il cardio, il plank.
// È LA STESSA STRISCIA DEL RECUPERO (stesse classi, stessa faccia: titolo,
// numero, play e reset tondi a destra), dentro la card dell'esercizio
// (pages/WorkoutSession), che in quel momento non ha il recupero in cima.
//
// Il conto vive nella pagina (`crono`: i secondi già fatti e, mentre corre,
// l'istante da cui corre — regge lo schermo spento). Play e pausa riprendono
// da dove si era, reset riparte da capo, a zero un bip.
// `dati(sec)`: i dati della macchina (pages/WorkoutSession, ParametriSerie), coi
// secondi fatti (la distanza si calcola dalla velocità), sotto
// numero e tasti, a tutta larghezza.
// `onTermina` (il cardio, che non chiede com'è andata): sotto, a tutta
// larghezza, il tasto "Termina" che lo segna fatto col tempo del timer; a
// tempo scaduto lo fa da solo.
// Fatto l'esercizio (`fatti` = i secondi segnati) la striscia dice "Fatto" e
// il numero si tocca per correggerlo, come il recupero si tocca per cambiarlo.
// `onAnnulla`: lì, al posto dei tasti, "Riprendi esercizio" (non l'ho finito).
// ---------------------------------------------------------------------------

export function TimerEsercizio({ sec, crono, onCrono, fatti: segnati = null, onCorreggi = null, onAnnulla = null, onTermina = null, dati = null }) {
  const [ora, setOra] = useState(() => Date.now())
  const [correggi, setCorreggi] = useState(false)
  // Il bip a tempo scaduto: un interruttore suo, spento di base.
  const [bip, setBip] = useState(bipEsercizioAcceso)
  const [confermaBip, setConfermaBip] = useState(false)
  const corre = !!crono?.da
  const fine = useRef(onCrono)
  const termina = useRef(onTermina)
  useEffect(() => {
    fine.current = onCrono
    termina.current = onTermina
  })
  useEffect(() => {
    if (!corre) return
    const id = setInterval(() => {
      const adesso = Date.now()
      setOra(adesso)
      if (sec != null && secondiFatti(crono, adesso) >= sec) {
        clearInterval(id)
        fine.current({ fatti: sec, da: null })
        beep(bipEsercizioAcceso())
        // Il cardio, finito il tempo, si segna fatto da solo (come "Termina").
        termina.current?.()
      }
    }, 250)
    return () => clearInterval(id)
  }, [corre, crono, sec])

  if (segnati != null) {
    return (
      <div className="recupero-striscia centrata">
        <div className="recupero-titolo">Fatto</div>
        <button
          type="button"
          className="recupero-tempo"
          aria-haspopup="dialog"
          aria-label={`Fatto in ${formatSec(segnati)}: correggi`}
          onClick={() => setCorreggi(true)}
        >
          <span className="recupero-numero finito">{formatSec(segnati)}</span>
          <span className="recupero-sotto">Tocca per correggere</span>
        </button>
        {correggi &&
          createPortal(
            <CorreggiTempo sec={segnati} onChiudi={() => setCorreggi(false)} onSalva={onCorreggi} />,
            document.body,
          )}
        {onAnnulla && (
          <div className="timer-annulla">
            <button className="btn" onClick={onAnnulla}>
              <IconIndietro aria-hidden="true" /> Riprendi esercizio
            </button>
          </div>
        )}
        {dati && <div className="timer-dati">{dati(segnati)}</div>}
      </div>
    )
  }

  const fatti = Math.min(sec ?? Infinity, secondiFatti(crono, ora))
  const mostra = sec != null ? sec - fatti : fatti
  return (
    <div className={'recupero-striscia' + (onTermina ? ' centrata' : '')}>
      <div className="recupero-titolo">{sec != null ? `Durata · ${formatSec(sec)}` : 'Cronometro'}</div>
      {/* La campanella in alto a destra: nella riga dei tasti play resta al
          centro. Solo con una durata: il cronometro non finisce. */}
      {sec != null && (
        <button
          className={'btn btn-sm timer-bip' + (bip ? ' bip-acceso' : '')}
          aria-pressed={bip}
          aria-label={bip ? 'Bip a fine esercizio: attivo' : 'Bip a fine esercizio: spento'}
          onClick={() => {
            if (!bip) return setConfermaBip(true)
            impostaBipEsercizio(false)
            setBip(false)
          }}
        >
          <IconCampana spenta={!bip} aria-hidden="true" />
        </button>
      )}
      {confermaBip &&
        createPortal(
          <ConfermaBip
            quando="esercizio"
            onAttiva={() => {
              impostaBipEsercizio(true)
              setBip(true)
            }}
            onChiudi={() => setConfermaBip(false)}
          />,
          document.body,
        )}
      <div className="recupero-tempo">
        <span className={'recupero-numero' + (corre ? ' corre' : '')}>{formatSec(Math.max(0, mostra))}</span>
        <span className="recupero-sotto">
          {corre ? 'Vai così' : crono ? `In pausa · fatti ${formatSec(fatti)}` : 'Avvia quando parti'}
        </span>
      </div>
      <div className={'recupero-tasti' + (onTermina ? ' con-termina' : '')}>
        {corre ? (
          <button
            className="btn btn-sm recupero-play"
            onClick={() => onCrono({ fatti: secondiFatti(crono), da: null })}
            aria-label="Pausa"
            title="Pausa"
          >
            <IconPausa aria-hidden="true" />
          </button>
        ) : (
          <button
            className="btn btn-sm recupero-play"
            onClick={() => {
              if (bipEsercizioAcceso()) sbloccaAudio()
              onCrono({ fatti: crono?.fatti || 0, da: Date.now() })
            }}
            aria-label={crono ? 'Riprendi' : 'Avvia'}
            title={crono ? 'Riprendi' : 'Avvia'}
          >
            <IconPlay aria-hidden="true" />
          </button>
        )}
        <button className="btn btn-sm" onClick={() => onCrono(null)} aria-label="Da capo" title="Da capo">
          <IconReset aria-hidden="true" />
        </button>
        {onTermina && (
          <button className="btn btn-good timer-termina" onClick={onTermina} aria-label="Termina" title="Termina">
            <IconCheck aria-hidden="true" />
          </button>
        )}
      </div>
      {dati && <div className="timer-dati">{dati(fatti)}</div>}
    </div>
  )
}

// Il foglio per correggere il tempo fatto: minuti e secondi, da scrivere.
function CorreggiTempo({ sec, onChiudi, onSalva }) {
  const [min, setMin] = useState(String(Math.floor(sec / 60)))
  const [s, setS] = useState(String(sec % 60).padStart(2, '0'))
  const num = (t, max) => Math.min(max, parseInt(t.replace(/\D/g, '') || '0', 10))
  const salva = () => {
    onSalva?.(num(min, 999) * 60 + num(s, 59))
    onChiudi()
  }
  return (
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Quanto hai fatto" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3>Quanto hai fatto</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        <div className="correggi-tempo">
          <label>
            <input
              className="input"
              inputMode="numeric"
              autoFocus
              value={min}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, '').slice(0, 3))}
              aria-label="Minuti"
            />
            <span>min</span>
          </label>
          <label>
            <input
              className="input"
              inputMode="numeric"
              value={s}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setS(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onKeyDown={(e) => e.key === 'Enter' && salva()}
              aria-label="Secondi"
            />
            <span>sec</span>
          </label>
        </div>
        <button className="btn btn-accent btn-block btn-lg" style={{ marginTop: 14 }} onClick={salva}>
          Salva
        </button>
      </div>
    </div>
  )
}
