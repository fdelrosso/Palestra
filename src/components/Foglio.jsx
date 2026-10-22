import { useId } from 'react'
import { createPortal } from 'react-dom'

// ---------------------------------------------------------------------------
// Il foglio che sale dal basso (.foglio), con la maniglia e un titolo: toccare
// fuori lo chiude. Nel riepilogo ci stanno i campi facoltativi del recap, uno
// per foglio, così la pagina resta la card e i tasti.
//
// `aperto={false}` lo NASCONDE senza smontarlo: serve a chi dentro ha un
// lavoro che non si deve fermare chiudendo (le foto che si stanno caricando,
// FotoAllenamento). Gli altri lo montano solo quando serve.
// ---------------------------------------------------------------------------
export default function Foglio({ titolo, sotto, aperto = true, onChiudi, children }) {
  return createPortal(
    <div className="foglio-backdrop" hidden={!aperto} onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{titolo}</h3>
        {sotto && (
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 14px' }}>
            {sotto}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

// Una scelta dentro un foglio, in un riquadro: un'icona, il titolo e una riga
// che dice DOVE finisce (o a cosa serve), poi i suoi comandi. `inUso`: è
// quella che c'è adesso (lo sfondo: colori, foto o video). Così ogni foglio
// del riepilogo si legge allo stesso modo.
export function SezioneFoglio({ icona, titolo, sotto, inUso = false, children }) {
  const id = useId()
  return (
    <section className={'foglio-sezione' + (inUso ? ' in-uso' : '')} aria-labelledby={id}>
      <div className="foglio-sezione-testa">
        {icona && (
          <span className="foglio-sezione-icona" aria-hidden="true">
            {icona}
          </span>
        )}
        <div className="grow" style={{ minWidth: 0 }}>
          <h4 id={id}>
            {titolo}
            {inUso && <span className="foglio-sezione-uso">In uso</span>}
          </h4>
          {sotto && <p>{sotto}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
