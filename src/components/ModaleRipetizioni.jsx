import { useState } from 'react'

// ---------------------------------------------------------------------------
// "Duro" (🔴) durante l'allenamento: a quante ripetizioni si è arrivati.
//
// Il pallino rosso vuol dire quasi sempre "non ce l'ho fatta": 10 previste,
// 7 fatte. Solo il colore non lo dice, e la volta dopo il numero è la cosa
// che serve per scegliere il peso. Si parte dalle ripetizioni previste per
// quella serie, così chi le ha fatte tutte (dure, ma tutte) chiude con un
// tocco, e chi si è fermato prima toglie quelle che mancano col −.
//
// Il numero finisce nella serie (`rip`) e si legge dentro il pallino rosso,
// qui, nel riepilogo, nello storico dell'esercizio e in "Correggi".
// ---------------------------------------------------------------------------

export default function ModaleRipetizioni({ nome, serie, previste = null, iniziale = null, onChiudi, onSalva }) {
  const [valore, setValore] = useState(String(iniziale ?? previste ?? ''))
  const n = /^\d+$/.test(valore.trim()) ? parseInt(valore, 10) : NaN
  const valido = Number.isFinite(n)
  const sposta = (d) => setValore(String(Math.max(0, (valido ? n : previste || 0) + d)))

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label={`Ripetizioni della serie ${serie} di ${nome}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          🔴 Serie {serie} · {nome}
        </h3>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '-4px 0 12px' }}>
          Quante ripetizioni hai fatto?{previste != null ? ` Ne erano previste ${previste}.` : ''}
        </p>

        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            className="btn"
            style={{ flex: '0 0 auto', minWidth: 52 }}
            disabled={valido && n <= 0}
            onClick={() => sposta(-1)}
            aria-label="Una in meno"
          >
            −
          </button>
          <input
            className="input"
            style={{ textAlign: 'center', fontWeight: 800, fontSize: 20 }}
            inputMode="numeric"
            pattern="[0-9]*"
            value={valore}
            onChange={(e) => setValore(e.target.value.replace(/\D/g, '').slice(0, 3))}
            aria-label="Ripetizioni fatte"
          />
          <button
            className="btn"
            style={{ flex: '0 0 auto', minWidth: 52 }}
            onClick={() => sposta(1)}
            aria-label="Una in più"
          >
            +
          </button>
        </div>

        <button className="btn btn-accent btn-block btn-lg" disabled={!valido} onClick={() => onSalva(n)}>
          Chiudi la serie
        </button>
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
