import { useState } from 'react'
import { createPortal } from 'react-dom'
import { consiglioCarico, GUIDA_CARICO } from '../lib/carico'
import { caricoUguale, formattaCarico } from '../lib/schema'
import { IconChevron, IconWeight } from './icons'
import StoricoEsercizio from './StoricoEsercizio'

// Riquadro col consiglio sul carico di un esercizio, ricavato dai pallini
// colorati della volta scorsa e tradotto nello schema di oggi (vedi lib/carico).
//
// Props:
//   nome          nome dell'esercizio;
//   carichi       Map da storicoCarichi(schede);
//   schema        lo schema di OGGI (serie, ripetizioni, tecnica, RPE…): il
//                 peso si consiglia per questo, non per quello della volta scorsa;
//   caricoAttuale il peso che c'è oggi, {tipo, valore} di lib/schema: il
//                 riferimento (si tiene se è vicino alla stima);
//   onUsa         se passata, mostra "Usa <peso>" e riceve il carico consigliato
//                 (il genitore decide cosa farne: in allenamento apre il modale peso);
//   guidaSeVuoto  se true e non sappiamo nulla dell'esercizio, spiega come
//                 scegliere il peso invece di non mostrare niente;
//   fase          per un esercizio a fasi ("3×5 poi 2×2", lib/fasi): il
//                 consiglio è per il peso di quella fase;
//   chiudibile    se true, al posto del riquadro una riga "Peso consigliato ·
//                 <peso>" che lo apre in una modale (in allenamento serve prima
//                 della serie, non durante). La modale ha il colore del verso
//                 (sali, tieni, scendi) e il peso grande al centro. Se non c'è
//                 niente da dire non compare neanche la riga.
// Da qui si apre anche lo STORICO dell'esercizio (tutte le volte che l'hai
// svolto): compare da solo, visto che il riquadro esiste solo se c'è storia.
export default function ConsiglioCarico({
  nome,
  carichi,
  schema = null,
  caricoAttuale = null,
  onUsa,
  guidaSeVuoto = false,
  fase = null,
  chiudibile = false,
}) {
  const [storicoAperto, setStoricoAperto] = useState(false)
  const [modaleAperta, setModaleAperta] = useState(false)
  const c = consiglioCarico(nome, carichi, { schemaOggi: schema, caricoAttuale, fase })

  if (!c && !guidaSeVuoto) return null

  // Il colore della modale. Neutro se lo schema cambia e non c'è un peso da
  // confrontare: lì "tieni" vuol dire solo "nessun verso", non "resta lì".
  const verso = c && !(c.schemaCambiato && !c.confronto) ? c.azione : ''
  const titolo = c ? c.titolo : 'Come scegliere il peso'
  const testo = c ? c.testo : GUIDA_CARICO
  const peso = c?.caricoSuggerito ? formattaCarico(c.caricoSuggerito) : ''
  // Il bottone ha senso solo se propone un carico diverso da quello attuale.
  const mostraUsa = !!onUsa && !!c?.caricoSuggerito && !caricoUguale(c.caricoSuggerito, caricoAttuale)

  const tasti = (
    <span className="row" style={{ gap: 8, marginTop: chiudibile ? 14 : 8, flexWrap: 'wrap' }}>
      {mostraUsa && (
        <button
          className="btn btn-sm consiglio-usa"
          onClick={() => {
            setModaleAperta(false)
            onUsa(c.caricoSuggerito)
          }}
        >
          Usa {peso}
        </button>
      )}
      {c && (
        <button className="btn btn-ghost btn-sm" onClick={() => setStoricoAperto(true)}>
          Le volte precedenti ({c.storia.length})
        </button>
      )}
    </span>
  )

  return (
    <>
      {chiudibile ? (
        <>
          {/* La riga dell'allenamento: tocca e si apre la modale. */}
          <button type="button" className="consiglio-riga" onClick={() => setModaleAperta(true)}>
            Peso consigliato
            {peso && <span className="consiglio-riassunto">· {peso}</span>}
            <IconChevron width={16} height={16} className="consiglio-freccia" aria-hidden="true" />
          </button>
          {/* Nel body: dentro la card dell'allenamento (pista che scorre,
              `inert`) il fixed resterebbe chiuso nella card. */}
          {modaleAperta &&
            createPortal(
              <div className="modal-backdrop al-centro" onClick={() => setModaleAperta(false)}>
                <div
                  className={'modal consiglio-modale ' + verso}
                  role="dialog"
                  aria-label={`Peso consigliato per ${nome}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{nome}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModaleAperta(false)}>
                      Chiudi
                    </button>
                  </div>
                  <div className="consiglio-centro">
                    <span className="consiglio-titolo">{titolo}</span>
                    {peso && <span className="consiglio-peso">{peso}</span>}
                    {c?.confronto && peso && <ChipDifferenza c={c} />}
                  </div>
                  <p className="consiglio-testo">{testo}</p>
                  {tasti}
                </div>
              </div>,
              document.body,
            )}
        </>
      ) : (
        <div className={'carico-tip ' + (c?.azione || '')}>
          <span className="ico" aria-hidden="true">
            <IconWeight width={16} height={16} />
          </span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="carico-tip-titolo">{titolo}</span>
            <span className="carico-tip-testo">{testo}</span>
            {c && tasti}
          </span>
        </div>
      )}

      {storicoAperto && <StoricoEsercizio nome={nome} storia={c.storia} onChiudi={() => setStoricoAperto(false)} />}
    </>
  )
}

// "↑ +2,5 kg", "= come l'ultima volta", "↓ −2,5 kg": la differenza dal peso
// col quale lib/carico ha deciso il verso.
function ChipDifferenza({ c }) {
  const diff = Math.round((c.caricoSuggerito.valore - c.confronto.kg) * 100) / 100
  const testo =
    diff === 0
      ? c.confronto.da === 'ultima'
        ? 'come l’ultima volta'
        : 'come già impostato'
      : `${diff > 0 ? '+' : '−'}${formattaCarico({ tipo: 'kg', valore: Math.abs(diff) })}`
  return (
    <span className="consiglio-chip">
      {diff === 0 ? (
        <span aria-hidden="true">=</span>
      ) : (
        <IconChevron
          width={14}
          height={14}
          style={{ transform: `rotate(${diff > 0 ? -90 : 90}deg)` }}
          aria-hidden="true"
        />
      )}
      {testo}
    </span>
  )
}
