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
import { IconCheck } from './icons'

// ---------------------------------------------------------------------------
// "Correggi": giorno, ora di fine e durata di un allenamento già svolto, e per
// ogni esercizio il nome, il carico e i pallini delle serie.
//
// Sta in un foglio, da "Altro" nel riepilogo di un allenamento vecchio
// (components/Riepilogo): è lì che ci si accorge che qualcosa non torna.
// `onChiudi` chiude il foglio senza salvare.
// ⚠️ La NOTA qui non c'è più (2026-10-20): è il commento, e si scrive dalla
// sua pillola sotto la card. Senza `nota` fra i valori, patchDaValori non la
// tocca — se no un commento appena scritto tornerebbe quello di prima.
//
// ⚠️ Delle serie si cambiano solo carico e colori (lib/modificaAllenamento):
// quante sono e superserie restano quelle registrate. Da carichi e colori
// escono i consigli e lo storico, quindi correggerli li corregge. Il NOME si
// cambia (88ª) per rimediare a uno scritto male; vuoto resta quello di prima.
//
// ⚠️ Se la durata è sospetta (oltre 4 ore) il foglio si apre da solo con un
// avviso (lo apre il Riepilogo): chi ha dimenticato di premere "Termina" non
// sa di doverlo cercare.
// ---------------------------------------------------------------------------

export default function ModificaAllenamento({ completamento: c, occupata, onSalva, onChiudi }) {
  const sospetta = durataSospetta(c)
  const haDurata = Number.isFinite(c?.durataSec)
  const [v, setV] = useState(() => {
    const { nota: _nota, ...resto } = valoriIniziali(c)
    return resto
  })
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
  }

  const cambiaEs = (i, campo) => (e) => {
    const valore = e.target.value
    setEs((x) => x.map((v, k) => (k === i ? { ...v, [campo]: valore } : v)))
  }
  const giraColore = (i, j) =>
    setEs((x) =>
      x.map((v, k) =>
        k !== i ? v : { ...v, colori: v.colori.map((col, n) => (n === j ? coloreSuccessivo(col) : col)) },
      ),
    )
  return (
    <div className="stack correggi" style={{ gap: 10 }}>
      {sospetta && (
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
          ⚠️ Risulta durato {durataLunga(c.durataSec)}: forse non avevi premuto «Termina» alla
          fine. Metti il giorno e la durata veri.
        </p>
      )}

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <label className="stack" style={{ gap: 4, flex: '1 1 140px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Giorno</span>
          <input className="input" type="date" value={v.giorno} onChange={cambia('giorno')} />
        </label>
        <label className="stack" style={{ gap: 4, flex: '1 1 100px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Finito alle</span>
          <input className="input" type="time" value={v.ora} onChange={cambia('ora')} />
        </label>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          Durata{!haDurata && ' (facoltativa: questo allenamento non ne aveva una)'}
        </span>
        <div className="row" style={{ gap: 10 }}>
          <div className="input-unita" style={{ flex: 1 }}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              max="12"
              value={v.ore}
              onChange={cambia('ore')}
              aria-label="Ore"
            />
            <span>h</span>
          </div>
          <div className="input-unita" style={{ flex: 1 }}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={v.minuti}
              onChange={cambia('minuti')}
              aria-label="Minuti"
            />
            <span>min</span>
          </div>
        </div>
      </div>

      {es.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Nomi, carichi e serie · tocca un pallino per cambiarne il colore (facile, medio, duro, da fare)
          </span>
          {c.esercizi.map((e, i) => (
            <div key={i} className="stack" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <input
                  className="input correggi-nome"
                  type="text"
                  value={es[i].nome}
                  onChange={cambiaEs(i, 'nome')}
                  placeholder={e.nome}
                  aria-label={`Nome di ${e.nome}`}
                />
                <input
                  className="input correggi-carico"
                  type="text"
                  value={es[i].carico}
                  onChange={cambiaEs(i, 'carico')}
                  placeholder="carico"
                  aria-label={`Carico di ${e.nome}`}
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
                    {!col ? j + 1 : col === 'rosso' && es[i].rip?.[j] != null ? es[i].rip[j] : <IconCheck width={15} height={15} />}
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
        <button type="button" className="btn grow" onClick={onChiudi}>
          Annulla
        </button>
        <button type="button" className="btn btn-accent grow" onClick={salva}>
          Salva
        </button>
      </div>
    </div>
  )
}
