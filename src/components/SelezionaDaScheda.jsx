import { createPortal } from 'react-dom'
import { schemaPerSettimana } from '../data/model'
import { statoScheda } from '../lib/progression'
import { IconChevron, IconClose } from './icons'

// ---------------------------------------------------------------------------
// "Seleziona da scheda" (pages/NuovoAllenamentoPage): un allenamento di una
// delle proprie schede da fare adesso. Parte come allenamento a sé
// (iniziaAllenamentoLibero), quindi resta nello storico e la scheda non si
// accorge di niente: non avanza e non perde quell'allenamento.
// ---------------------------------------------------------------------------

/** Il giorno pronto per l'allenamento libero, con gli schemi della settimana in corso. */
export function giornoDaScheda(scheda, giorno) {
  const { settimana } = statoScheda(scheda)
  return {
    nome: giorno.nome,
    esercizi: giorno.esercizi.map((e) => ({
      ...e,
      variaPerSettimana: false,
      schemaBase: schemaPerSettimana(e, settimana),
    })),
    riscaldamento: giorno.riscaldamento,
    stretching: giorno.stretching,
  }
}

export default function SelezionaDaScheda({ schede, onScegli, onChiudi }) {
  const conGiorni = (schede || [])
    .filter((s) => !s.libera && !s.archiviata)
    .map((s) => ({ scheda: s, giorni: s.giorni.filter((g) => g.tipo === 'workout' && g.esercizi.length) }))
    .filter((x) => x.giorni.length)

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Seleziona da scheda" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>Seleziona da scheda</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>
        {conGiorni.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5 }}>Non hai ancora schede con degli allenamenti.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {conGiorni.map(({ scheda, giorni }) => (
              <div key={scheda.id} className="stack" style={{ gap: 8 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>{scheda.nome}</div>
                {giorni.map((g) => (
                  <button key={g.id} className="menu-voce" onClick={() => onScegli(giornoDaScheda(scheda, g))}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">{g.nome}</span>
                      <span className="menu-voce-desc">
                        {g.esercizi.length} {g.esercizi.length === 1 ? 'esercizio' : 'esercizi'}
                      </span>
                    </span>
                    <IconChevron className="faint" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
