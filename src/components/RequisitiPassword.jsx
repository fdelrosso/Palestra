import { REQUISITI_PASSWORD } from '../lib/password'
import { IconCheck } from './icons'

// La lista di cosa serve alla password, sotto il campo: ogni voce si spunta
// mentre si scrive, cosi' si sa cosa manca prima di premere il bottone.
export default function RequisitiPassword({ pw }) {
  return (
    <ul className="requisiti-pw" aria-label="La password deve avere">
      {REQUISITI_PASSWORD.map((r) => {
        const ok = r.ok(pw)
        return (
          <li key={r.id} className={ok ? 'ok' : ''} aria-label={r.testo + (ok ? ': fatto' : ': manca')}>
            <span className="requisiti-pw-segno" aria-hidden="true">
              {ok ? <IconCheck width={12} height={12} /> : null}
            </span>
            {r.testo}
          </li>
        )
      })}
    </ul>
  )
}
