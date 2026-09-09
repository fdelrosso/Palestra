import { useState } from 'react'
import { consiglioCarico, GUIDA_CARICO } from '../lib/carico'
import { IconWeight } from './icons'
import StoricoEsercizio from './StoricoEsercizio'

// Riquadro col consiglio sul carico di un esercizio, ricavato dai pallini
// colorati della volta scorsa (vedi lib/carico).
//
// Props:
//   nome          nome dell'esercizio;
//   carichi       Map da storicoCarichi(schede);
//   caricoAttuale carico scritto in scheda (base di calcolo se l'ultima volta
//                 non ne avevi segnato uno);
//   onUsa         se passata, mostra "Usa <peso>" (il genitore decide cosa
//                 farne: in allenamento apre il modale peso);
//   guidaSeVuoto  se true e non sappiamo nulla dell'esercizio, spiega come
//                 scegliere il peso invece di non mostrare niente.
// Da qui si apre anche lo STORICO dell'esercizio (tutte le volte che l'hai
// svolto): compare da solo, visto che il riquadro esiste solo se c'è storia.
export default function ConsiglioCarico({
  nome,
  carichi,
  caricoAttuale = '',
  onUsa,
  guidaSeVuoto = false,
}) {
  const [storicoAperto, setStoricoAperto] = useState(false)
  const c = consiglioCarico(nome, carichi, { caricoAttuale })

  if (!c) {
    if (!guidaSeVuoto) return null
    return (
      <div className="carico-tip">
        <span className="ico" aria-hidden="true">
          <IconWeight width={16} height={16} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="carico-tip-titolo">Come scegliere il peso</span>
          <span className="carico-tip-testo">{GUIDA_CARICO}</span>
        </span>
      </div>
    )
  }

  // Il bottone ha senso solo se propone un carico diverso da quello attuale.
  const mostraUsa = !!onUsa && !!c.caricoSuggerito && c.caricoSuggerito !== caricoAttuale

  return (
    <>
      <div className={'carico-tip ' + c.azione}>
        <span className="ico" aria-hidden="true">
          <IconWeight width={16} height={16} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="carico-tip-titolo">{c.titolo}</span>
          <span className="carico-tip-testo">{c.testo}</span>
          <span className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {mostraUsa && (
              <button className="btn btn-sm" onClick={() => onUsa(c.caricoSuggerito)}>
                Usa {c.caricoSuggerito}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setStoricoAperto(true)}>
              Le volte precedenti ({c.storia.length})
            </button>
          </span>
        </span>
      </div>

      {storicoAperto && (
        <StoricoEsercizio
          nome={nome}
          storia={c.storia}
          onChiudi={() => setStoricoAperto(false)}
        />
      )}
    </>
  )
}
