import { useState } from 'react'
import { durataSospetta, patchDaValori, valoriIniziali } from '../lib/modificaAllenamento'
import { durataLunga } from '../lib/recap'
import { IconEdit } from './icons'

// ---------------------------------------------------------------------------
// "Correggi": giorno, ora di fine, durata e nota di un allenamento già svolto.
//
// Sta nel recap che si apre dal calendario, accanto a visibilità e cancella:
// è lì che ci si accorge che qualcosa non torna.
//
// ⚠️ Le serie non si toccano. Sono l'unica parte che l'app ha registrato mentre
// succedeva, ed è anche la parte da cui escono carichi consigliati e storico:
// riscriverla a mano a giorni di distanza vorrebbe dire inventarla.
//
// ⚠️ Se la durata è sospetta (oltre 4 ore) il modulo si apre da solo con un
// avviso: chi ha dimenticato di premere "Termina" non sa di doverlo cercare.
// ---------------------------------------------------------------------------

export default function ModificaAllenamento({ completamento: c, occupata, onSalva }) {
  const sospetta = durataSospetta(c)
  const haDurata = Number.isFinite(c?.durataSec)
  const [aperto, setAperto] = useState(sospetta)
  const [v, setV] = useState(() => valoriIniziali(c))
  const [errore, setErrore] = useState('')

  const cambia = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }))
    setErrore('')
  }

  const salva = () => {
    const esito = patchDaValori(c, v, { haDurata })
    if (!esito.ok) {
      setErrore(esito.errore)
      return
    }
    // Due allenamenti della stessa scheda con la stessa data diventerebbero
    // indistinguibili: correggere l'uno cambierebbe anche l'altro.
    if (esito.cambiaData && occupata?.(esito.patch.data)) {
      setErrore('C’è già un allenamento di questa scheda finito in quel minuto.')
      return
    }
    onSalva(esito.patch, esito.cambiaData)
    setAperto(false)
  }

  if (!aperto) {
    return (
      <button type="button" className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => setAperto(true)}>
        <IconEdit width={15} height={15} /> Correggi giorno e durata
      </button>
    )
  }

  return (
    <div className="card stack" style={{ gap: 10, marginTop: 12 }}>
      <div className="card-titolo">Correggi l’allenamento</div>

      {sospetta && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
          ⚠️ Risulta durato {durataLunga(c.durataSec)}: forse non avevi premuto «Termina» alla
          fine. Metti il giorno e la durata veri.
        </p>
      )}

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <label className="stack" style={{ gap: 4, flex: '1 1 140px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Giorno</span>
          <input type="date" value={v.giorno} onChange={cambia('giorno')} />
        </label>
        <label className="stack" style={{ gap: 4, flex: '1 1 100px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Finito alle</span>
          <input type="time" value={v.ora} onChange={cambia('ora')} />
        </label>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          Durata{!haDurata && ' (facoltativa: questo allenamento non ne aveva una)'}
        </span>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="12"
            value={v.ore}
            onChange={cambia('ore')}
            style={{ width: 70 }}
            aria-label="Ore"
          />
          <span className="muted">h</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="59"
            value={v.minuti}
            onChange={cambia('minuti')}
            style={{ width: 70 }}
            aria-label="Minuti"
          />
          <span className="muted">min</span>
        </div>
      </div>

      <label className="stack" style={{ gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Nota</span>
        <input type="text" value={v.nota} onChange={cambia('nota')} placeholder="facoltativa" />
      </label>

      <p className="muted" style={{ fontSize: 11.5 }}>
        Le serie e i colori restano come li hai registrati.
      </p>

      {errore && (
        <p style={{ fontSize: 12.5, color: 'var(--danger)' }}>{errore}</p>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm grow" onClick={() => setAperto(false)}>
          Annulla
        </button>
        <button type="button" className="btn btn-sm btn-accent grow" onClick={salva}>
          Salva
        </button>
      </div>
    </div>
  )
}
