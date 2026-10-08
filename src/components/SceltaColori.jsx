import { useState } from 'react'
import { COLORE_DEFAULT, COLORI, MODI, coloriAttuali, scriviColori } from '../lib/tema'

// ---------------------------------------------------------------------------
// L'aspetto, nella pagina Profilo: chiaro, scuro o automatico (segue il
// telefono), e il colore dei tasti e degli evidenziati. Si applica al tocco,
// senza "Salva": vedere l'app cambiare e' il modo di scegliere.
//
// Oltre ai colori pronti c'e' il pallino "+", che apre il selettore del
// telefono. ⚠️ Con un colore libero si puo' scegliere male (giallo sul
// bianco): l'app lo scurisce o schiarisce quel tanto che basta per leggerlo
// (lib/tema).
// ---------------------------------------------------------------------------

export default function SceltaColori() {
  const [scelta, setScelta] = useState(coloriAttuali)

  const cambia = (parte) => {
    const nuova = { ...scelta, ...parte }
    scriviColori(nuova)
    setScelta(nuova)
  }

  const valore = scelta.colore.toLowerCase()
  const pronto = COLORI.some((v) => v.hex.toLowerCase() === valore)

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="segmented" role="radiogroup" aria-label="Tema">
        {MODI.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={scelta.modo === m.id}
            className={'seg-btn' + (scelta.modo === m.id ? ' on' : '')}
            onClick={() => cambia({ modo: m.id })}
          >
            {m.nome}
          </button>
        ))}
      </div>

      <div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="colori-titolo">Colore</span>
          {valore !== COLORE_DEFAULT && (
            <button type="button" className="btn-link" onClick={() => cambia({ colore: COLORE_DEFAULT })}>
              Torna al celeste
            </button>
          )}
        </div>
        <div className="colori-pallini" role="radiogroup" aria-label="Colore">
          {COLORI.map((v) => (
            <button
              key={v.hex}
              type="button"
              role="radio"
              aria-checked={v.hex.toLowerCase() === valore}
              aria-label={v.nome}
              title={v.nome}
              className={'colore-pallino' + (v.hex.toLowerCase() === valore ? ' scelto' : '')}
              style={{ background: v.hex }}
              onClick={() => cambia({ colore: v.hex })}
            />
          ))}
          {/* Il colore libero: l'<input type="color"> e' sopra il pallino,
              trasparente, cosi' il tocco apre il selettore del telefono. */}
          <label
            className={'colore-pallino libero' + (pronto ? '' : ' scelto')}
            style={pronto ? undefined : { background: scelta.colore }}
            title="Scegli un altro colore"
          >
            {pronto && <span aria-hidden="true">+</span>}
            <input
              type="color"
              value={scelta.colore}
              aria-label="Un altro colore"
              onChange={(e) => cambia({ colore: e.target.value })}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
