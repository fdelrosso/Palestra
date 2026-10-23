import { BICCHIERI, bicchieriDi, bicchieriDopoTocco } from '../lib/diario'

// ---------------------------------------------------------------------------
// L'acqua di una giornata (pages/DietaOggiPage, sopra i pasti): otto bicchieri
// da 250 ml, si tocca quello a cui si è arrivati e si riempiono fin lì.
// Toccare l'ultimo pieno lo svuota. Oltre gli otto si va col "+".
// Il numero sta nel giorno del diario (`acqua`), e si sincronizza con lui.
// ---------------------------------------------------------------------------

function Bicchiere({ pieno }) {
  return (
    <svg viewBox="0 0 24 28" width="22" height="26" aria-hidden="true">
      {pieno && <path d="M5.6 9h12.8l-1.3 14.2a2 2 0 01-2 1.8H8.9a2 2 0 01-2-1.8z" className="bicchiere-acqua" />}
      <path d="M4 3h16l-2 20.3A2 2 0 0116 25H8a2 2 0 01-2-1.7z" className="bicchiere-vetro" />
    </svg>
  )
}

const litri = (n) => (n * 0.25).toLocaleString('it-IT', { maximumFractionDigits: 2 })

export default function AcquaGiornata({ giorno, onCambia }) {
  const bevuti = bicchieriDi(giorno)
  const quanti = Math.max(BICCHIERI, bevuti)
  return (
    <div className="card acqua-giornata">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="pasto-nome">Acqua</span>
        <span className="pasto-slot-kcal">
          {bevuti} / {BICCHIERI} bicchieri <span className="faint">· {litri(bevuti)} L</span>
        </span>
      </div>
      <div className="acqua-bicchieri">
        {Array.from({ length: quanti }, (_, i) => (
          <button
            key={i}
            type="button"
            className={'acqua-bicchiere' + (i < bevuti ? ' pieno' : '')}
            aria-label={`${i + 1} ${i === 0 ? 'bicchiere' : 'bicchieri'}`}
            aria-pressed={i < bevuti}
            onClick={() => onCambia(bicchieriDopoTocco(bevuti, i + 1))}
          >
            <Bicchiere pieno={i < bevuti} />
          </button>
        ))}
        {bevuti >= BICCHIERI && (
          <button type="button" className="acqua-bicchiere acqua-piu" aria-label="Un bicchiere in più" onClick={() => onCambia(bevuti + 1)}>
            +
          </button>
        )}
      </div>
    </div>
  )
}
