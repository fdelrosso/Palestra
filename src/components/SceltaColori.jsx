import { useState } from 'react'
import {
  COLORE_DEFAULT,
  COLORI,
  SFONDI,
  SFONDO_DEFAULT,
  coloriAttuali,
  contrasto,
  daHex,
  scriviColori,
  sfondoScuro,
} from '../lib/tema'

// ---------------------------------------------------------------------------
// La scelta dei colori, in fondo al menu "Funzionalita'": lo sfondo e il
// colore del resto (tasti, linguette, evidenziati). Si applica al tocco, senza
// "Salva": vedere l'app cambiare e' il modo di scegliere.
//
// Oltre ai colori pronti c'e' il pallino "+", che apre il selettore del
// telefono. ⚠️ Con un colore libero si puo' scegliere male (verde su verde):
// l'app lo schiarisce o scurisce quel tanto che basta per leggerlo (lib/tema),
// e qui lo si dice invece di fingere che sia venuto come lo si voleva.
// ---------------------------------------------------------------------------

function Pallini({ titolo, voci, valore, onScegli }) {
  const pronto = voci.some((v) => v.hex.toLowerCase() === valore.toLowerCase())
  return (
    <div className="colori-gruppo">
      <div className="colori-titolo">{titolo}</div>
      <div className="colori-pallini" role="radiogroup" aria-label={titolo}>
        {voci.map((v) => (
          <button
            key={v.hex}
            type="button"
            role="radio"
            aria-checked={v.hex.toLowerCase() === valore.toLowerCase()}
            aria-label={v.nome}
            title={v.nome}
            className={'colore-pallino' + (v.hex.toLowerCase() === valore.toLowerCase() ? ' scelto' : '')}
            style={{ background: v.hex }}
            onClick={() => onScegli(v.hex)}
          />
        ))}
        {/* Il colore libero: l'<input type="color"> e' sopra il pallino,
            trasparente, cosi' il tocco apre il selettore del telefono. */}
        <label
          className={'colore-pallino libero' + (pronto ? '' : ' scelto')}
          style={pronto ? undefined : { background: valore }}
          title="Scegli un altro colore"
        >
          {pronto && <span aria-hidden="true">+</span>}
          <input
            type="color"
            value={valore}
            aria-label={titolo + ': un altro colore'}
            onChange={(e) => onScegli(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

export default function SceltaColori() {
  const [colori, setColori] = useState(coloriAttuali)

  const cambia = (parte) => {
    const nuovi = { ...colori, ...parte }
    scriviColori(nuovi)
    setColori(nuovi)
  }

  const sfondo = daHex(colori.sfondo)
  const colore = daHex(colori.colore)
  // Sotto il 3:1 il colore scelto non si legge come testo sullo sfondo, e
  // lib/tema lo corregge: lo si dice.
  const corretto = sfondo && colore && contrasto(sfondo, colore) < 3
  const default_ =
    colori.sfondo.toLowerCase() === SFONDO_DEFAULT && colori.colore.toLowerCase() === COLORE_DEFAULT

  return (
    <div className="menu-colori">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="menu-voce-nome">Colori</span>
        {!default_ && (
          <button
            type="button"
            className="btn-link"
            onClick={() => cambia({ sfondo: SFONDO_DEFAULT, colore: COLORE_DEFAULT })}
          >
            Nero e celeste
          </button>
        )}
      </div>
      <Pallini titolo="Sfondo" voci={SFONDI} valore={colori.sfondo} onScegli={(hex) => cambia({ sfondo: hex })} />
      <Pallini titolo="Colore" voci={COLORI} valore={colori.colore} onScegli={(hex) => cambia({ colore: hex })} />
      {corretto && (
        <p className="menu-voce-desc" style={{ marginTop: 6 }}>
          Su questo sfondo il colore si leggeva poco: l'app lo usa un po' più{' '}
          {sfondoScuro(sfondo) ? 'chiaro' : 'scuro'}.
        </p>
      )}
    </div>
  )
}
