import { vociDi } from '../lib/preparazione'
import { IconCheck, IconChevron } from './icons'

// Il riscaldamento o lo stretching di un giorno (lib/preparazione), da leggere.
// Senza voci non disegna niente: un campo vuoto non c'è.
//
// Due modi:
// - nell'anteprima del giorno, l'elenco e basta (senza `onApri`);
// - in allenamento, una card che si apre e si chiude (`aperta`, `onApri`), con
//   le voci da spuntare (`spuntate` = gli indici fatti, `onSpunta(i)`). Chiusa
//   è una riga sola: per tutto l'allenamento sta lì e non deve rubare posto.
export default function Preparazione({
  info,
  testo,
  aperta = true,
  onApri = null,
  spuntate = null,
  onSpunta = null,
  style,
}) {
  const voci = vociDi(testo)
  if (!voci.length) return null
  const fatte = spuntate ? voci.filter((_, i) => spuntate.includes(i)).length : 0
  const tutte = spuntate && fatte === voci.length

  const titolo = (
    <>
      <span className="preparazione-titolo">{info.titolo}</span>
      {spuntate && (
        <span className={'preparazione-conto' + (tutte ? ' fatto' : '')}>
          {tutte ? <IconCheck width={15} height={15} aria-label="Fatto" /> : `${fatte}/${voci.length}`}
        </span>
      )}
    </>
  )

  return (
    <div className="card preparazione" style={style}>
      {onApri ? (
        <button
          type="button"
          className="preparazione-testa"
          onClick={() => onApri(!aperta)}
          aria-expanded={aperta}
        >
          {titolo}
          <IconChevron
            width={18}
            height={18}
            className="faint"
            style={{ transform: `rotate(${aperta ? -90 : 90}deg)` }}
          />
        </button>
      ) : (
        <div className="preparazione-testa">{titolo}</div>
      )}
      {aperta && (
        <ul className="preparazione-voci">
          {voci.map((v, i) =>
            onSpunta ? (
              <li key={i}>
                <button
                  type="button"
                  className={'preparazione-voce' + (spuntate.includes(i) ? ' fatta' : '')}
                  onClick={() => onSpunta(i)}
                  aria-pressed={spuntate.includes(i)}
                >
                  <span className="preparazione-casella">
                    {spuntate.includes(i) && <IconCheck width={13} height={13} />}
                  </span>
                  <span>{v}</span>
                </button>
              </li>
            ) : (
              <li key={i} className="preparazione-voce sola">
                {v}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
