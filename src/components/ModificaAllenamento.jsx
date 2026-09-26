import { useState } from 'react'
import {
  coloreSuccessivo,
  durataSospetta,
  eserciziDaValori,
  eserciziIniziali,
  patchDaValori,
  valoriIniziali,
} from '../lib/modificaAllenamento'
import { durataLunga } from '../lib/recap'
import { IconCheck, IconEdit } from './icons'

// ---------------------------------------------------------------------------
// "Correggi": giorno, ora di fine, durata e nota di un allenamento già svolto,
// e per ogni esercizio il carico e i pallini delle serie.
//
// Sta nel recap che si apre dal calendario, accanto a visibilità e cancella:
// è lì che ci si accorge che qualcosa non torna.
//
// ⚠️ Delle serie si cambiano solo carico e colori (lib/modificaAllenamento):
// quante sono, nomi e superserie restano quelli registrati. Da carichi e
// colori escono i consigli e lo storico, quindi correggerli li corregge.
//
// ⚠️ Se la durata è sospetta (oltre 4 ore) il modulo si apre da solo con un
// avviso: chi ha dimenticato di premere "Termina" non sa di doverlo cercare.
// ---------------------------------------------------------------------------

export default function ModificaAllenamento({ completamento: c, occupata, onSalva }) {
  const sospetta = durataSospetta(c)
  const haDurata = Number.isFinite(c?.durataSec)
  const [aperto, setAperto] = useState(sospetta)
  const [v, setV] = useState(() => valoriIniziali(c))
  const [es, setEs] = useState(() => eserciziIniziali(c))
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
    const esercizi = eserciziDaValori(c, es)
    onSalva(esercizi ? { ...esito.patch, esercizi } : esito.patch, esito.cambiaData)
    setAperto(false)
  }

  const cambiaCarico = (i) => (e) => {
    const carico = e.target.value
    setEs((x) => x.map((v, k) => (k === i ? { ...v, carico } : v)))
  }
  const giraColore = (i, j) =>
    setEs((x) =>
      x.map((v, k) =>
        k !== i ? v : { ...v, colori: v.colori.map((col, n) => (n === j ? coloreSuccessivo(col) : col)) },
      ),
    )
  const annulla = () => {
    setV(valoriIniziali(c))
    setEs(eserciziIniziali(c))
    setErrore('')
    setAperto(false)
  }

  if (!aperto) {
    return (
      <button type="button" className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => setAperto(true)}>
        <IconEdit width={15} height={15} /> Correggi l’allenamento
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

      {es.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Carichi e serie · tocca un pallino per cambiarne il colore (facile, medio, duro, da fare)
          </span>
          {c.esercizi.map((e, i) => (
            <div key={i} className="stack" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14 }}>{e.nome}</span>
                <input
                  type="text"
                  value={es[i].carico}
                  onChange={cambiaCarico(i)}
                  placeholder="carico"
                  aria-label={`Carico di ${e.nome}`}
                  style={{ width: 110 }}
                />
              </div>
              <div className="set-dots">
                {es[i].colori.map((col, j) => (
                  <button
                    key={j}
                    type="button"
                    className={'set-dot' + (col ? ' ' + col : '')}
                    onClick={() => giraColore(i, j)}
                    aria-label={`${e.nome}, serie ${j + 1}: ${col || 'da fare'}`}
                  >
                    {col ? <IconCheck width={15} height={15} /> : j + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {errore && (
        <p style={{ fontSize: 12.5, color: 'var(--danger)' }}>{errore}</p>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm grow" onClick={annulla}>
          Annulla
        </button>
        <button type="button" className="btn btn-sm btn-accent grow" onClick={salva}>
          Salva
        </button>
      </div>
    </div>
  )
}
