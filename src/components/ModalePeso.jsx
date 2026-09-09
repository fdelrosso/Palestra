import { useState } from 'react'
import { parseCarico, passoCarico, formattaNumero } from '../lib/carico'

// Modale per cambiare il peso di un esercizio DURANTE l'allenamento.
// Il punto è la scelta di dove vale la modifica:
//   - "Solo per oggi"      → resta nella sessione in corso;
//   - "Salva anche in scheda" → aggiorna lo schema della scheda per sempre.
// Negli allenamenti liberi la seconda non ha senso (la scheda è nascosta e
// usa e getta): si passa `permettiPerSempre={false}`.
//
// `iniziale` è già il valore consigliato quando si arriva qui dal consiglio
// sul carico, così accettare il suggerimento è un tap solo.
export default function ModalePeso({
  nome,
  iniziale = '',
  caricoAttuale = '',
  caricoScheda = '',
  settimana,
  permettiPerSempre = true,
  suggerimento = '',
  onChiudi,
  onSalva,
}) {
  const [valore, setValore] = useState(iniziale || caricoAttuale || '')

  // I tasti −/+ muovono di un "click" sensato per quel peso (2,5 kg sopra i
  // 20 kg, 1 kg sotto…). Se il campo non contiene un numero restano spenti.
  const base = parseCarico(valore)
  const sposta = (segno) => {
    if (!base) return
    const p = passoCarico(base.numero)
    const nuovo = Math.max(0, base.numero + segno * p)
    if (nuovo <= 0) return
    setValore(`${base.prima}${formattaNumero(nuovo)}${base.dopo}`.trim())
  }

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={`Peso di ${nome}`} onClick={(e) => e.stopPropagation()}>
        <h3>Peso · {nome}</h3>

        {suggerimento && (
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '-4px 0 12px' }}>
            {suggerimento}
          </p>
        )}

        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <button
            className="btn"
            style={{ flex: '0 0 auto', minWidth: 52 }}
            disabled={!base}
            onClick={() => sposta(-1)}
            aria-label="Diminuisci"
          >
            −
          </button>
          <input
            className="input"
            style={{ textAlign: 'center', fontWeight: 700 }}
            placeholder="es. 40 kg"
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            aria-label="Peso"
          />
          <button
            className="btn"
            style={{ flex: '0 0 auto', minWidth: 52 }}
            disabled={!base}
            onClick={() => sposta(1)}
            aria-label="Aumenta"
          >
            +
          </button>
        </div>
        {/* Due valori distinti: quello in uso oggi e quello scritto in scheda.
            Divergono appena si salva "solo per oggi". */}
        <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 16px' }}>
          {caricoAttuale ? (
            <>
              In questo allenamento: <strong style={{ color: 'var(--text)' }}>{caricoAttuale}</strong>
            </>
          ) : (
            'Nessun peso impostato per questo allenamento.'
          )}
          {permettiPerSempre && caricoScheda && caricoScheda !== caricoAttuale && (
            <>
              {' · '}In scheda: <strong style={{ color: 'var(--text)' }}>{caricoScheda}</strong>
            </>
          )}
        </p>

        <button className="btn btn-block btn-lg" onClick={() => onSalva(valore, false)}>
          Solo per oggi
        </button>
        {permettiPerSempre && (
          <button
            className="btn btn-accent btn-block btn-lg"
            style={{ marginTop: 8 }}
            onClick={() => onSalva(valore, true)}
          >
            Salva anche in scheda{settimana != null ? ` (settimana ${settimana})` : ''}
          </button>
        )}
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
