// ---------------------------------------------------------------------------
// Tre stili per la modale del consiglio sul peso, ognuno nei tre versi
// (sali, tieni, scendi). Solo l'aspetto: testi finti, niente lib/carico.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-consiglio.html
//
// Colori: sali = accento, tieni = verde, scendi = ambra. Mai rosso: in
// allenamento il rosso è la serie non chiusa (vedi .carico-tip in index.css).
// ---------------------------------------------------------------------------
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { IconChevron } from '../src/components/icons.jsx'
import '../src/index.css'

const VERSI = {
  aumenta: {
    titolo: 'Prova ad aumentare il carico',
    testo: 'L’ultima volta (3×10 a 60 kg) tutte e 3 sono andate facili: prova a salire a 62,5 kg.',
    peso: '62,5 kg',
    delta: '+2,5 kg',
    usa: true,
  },
  mantieni: {
    titolo: 'Tieni questo carico',
    testo: 'L’ultima volta (3×10 a 60 kg) è stata impegnativa al punto giusto: resta su 60 kg.',
    peso: '60 kg',
    delta: 'come l’ultima volta',
    usa: false,
  },
  riduci: {
    titolo: 'Meglio scendere',
    testo: 'L’ultima volta (3×10 a 60 kg) 2 su 3 sono state dure: scendi a 57,5 kg per chiudere tutte le ripetizioni pulite.',
    peso: '57,5 kg',
    delta: '−2,5 kg',
    usa: true,
  },
}

function Freccia({ verso, size = 18 }) {
  if (verso === 'mantieni') return <span style={{ fontWeight: 900, fontSize: size }}>=</span>
  return (
    <IconChevron
      width={size}
      height={size}
      style={{ transform: `rotate(${verso === 'aumenta' ? -90 : 90}deg)` }}
      aria-hidden="true"
    />
  )
}

function Testa({ onChiudi }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ margin: 0 }}>Panca piana</h3>
      <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
        Chiudi
      </button>
    </div>
  )
}

function Tasti({ v }) {
  return (
    <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
      {v.usa && <button className="btn btn-sm pc-usa">Usa {v.peso}</button>}
      <button className="btn btn-ghost btn-sm">Le volte precedenti (4)</button>
    </div>
  )
}

// A — Fascia: la parte alta della modale tinta del verso, icona grande.
function Fascia({ verso }) {
  const v = VERSI[verso]
  return (
    <div className={`modal pc-modal pc-${verso} pc-fascia`}>
      <div className="pc-fascia-testa">
        <Testa />
        <div className="pc-fascia-riga">
          <span className="pc-ico-grande">
            <Freccia verso={verso} size={22} />
          </span>
          <span className="pc-titolo">{v.titolo}</span>
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <p className="pc-testo">{v.testo}</p>
        <Tasti v={v} />
      </div>
    </div>
  )
}

// B — Numero: il peso grande al centro, la differenza in un chip colorato.
function Numero({ verso }) {
  const v = VERSI[verso]
  return (
    <div className={`modal pc-modal pc-${verso}`}>
      <Testa />
      <div className="pc-numero-blocco">
        <span className="pc-etichetta">{v.titolo}</span>
        <span className="pc-numero">{v.peso}</span>
        <span className="pc-chip">
          <Freccia verso={verso} size={14} /> {v.delta}
        </span>
      </div>
      <p className="pc-testo" style={{ textAlign: 'center' }}>
        {v.testo}
      </p>
      <Tasti v={v} />
    </div>
  )
}

// C — Discreto: la modale neutra, il colore solo sul bordo in alto e sull'icona.
function Discreto({ verso }) {
  const v = VERSI[verso]
  return (
    <div className={`modal pc-modal pc-${verso} pc-discreto`}>
      <Testa />
      <div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'flex-start' }}>
        <span className="pc-ico">
          <Freccia verso={verso} />
        </span>
        <div>
          <span className="pc-titolo">{v.titolo}</span>
          <p className="pc-testo">{v.testo}</p>
        </div>
      </div>
      <Tasti v={v} />
    </div>
  )
}

const STILI = [
  ['A · Fascia', 'La parte alta della modale prende il colore del consiglio.', Fascia],
  ['B · Numero', 'Il peso consigliato al centro, grande; la differenza in un chip.', Numero],
  ['C · Discreto', 'Modale neutra: colore solo sulla riga in alto, sull’icona e sul tasto.', Discreto],
]

function Banco() {
  const [chiaro, setChiaro] = useState(false)
  document.documentElement.dataset.tema = chiaro ? 'chiaro' : 'scuro'
  return (
    <div className="pc-pagina">
      <style>{CSS}</style>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Stili del consiglio sul peso</h2>
        <button className="btn btn-sm" onClick={() => setChiaro(!chiaro)}>
          Tema {chiaro ? 'scuro' : 'chiaro'}
        </button>
      </div>
      {STILI.map(([nome, spiega, Stile]) => (
        <section key={nome} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 2 }}>{nome}</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            {spiega}
          </p>
          <div className="pc-griglia">
            {Object.keys(VERSI).map((verso) => (
              <div key={verso} className="pc-sfondo">
                <Stile verso={verso} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const CSS = `
.pc-pagina { max-width: 1180px; margin: 0 auto; padding: 24px 16px; }
.pc-griglia { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.pc-sfondo { background: rgba(0,0,0,.55); border-radius: 20px; padding: 16px; display: flex; align-items: center; min-height: 340px; }
.pc-modal { border-radius: 20px; padding: 18px 16px; max-height: none; }
.pc-aumenta { --pc: var(--accent); --pc-ink: var(--accent-ink); }
.pc-mantieni { --pc: var(--good); --pc-ink: var(--good-ink); }
.pc-riduci { --pc: var(--warn); --pc-ink: #241a00; }
.pc-titolo { display: block; font-weight: 800; font-size: 15px; }
.pc-testo { margin: 6px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--muted); }
.pc-usa { background: var(--pc); color: var(--pc-ink); border-color: transparent; }

.pc-fascia { padding: 0; overflow: hidden; }
.pc-fascia-testa { padding: 18px 16px 16px; background: color-mix(in srgb, var(--pc) 18%, transparent); }
.pc-fascia-riga { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.pc-fascia .pc-titolo { font-size: 17px; color: var(--text); }
.pc-ico-grande { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--pc); color: var(--pc-ink); flex: none; }

.pc-numero-blocco { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 18px 0 10px; }
.pc-etichetta { font-size: 13px; font-weight: 700; color: var(--pc); }
.pc-numero { font-size: 44px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; }
.pc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; background: color-mix(in srgb, var(--pc) 18%, transparent); color: var(--pc); }

.pc-discreto { border-top: 4px solid var(--pc); }
.pc-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex: none; background: color-mix(in srgb, var(--pc) 16%, transparent); color: var(--pc); }
.pc-discreto .pc-titolo { color: var(--pc); }
`

createRoot(document.getElementById('radice')).render(
  <StrictMode>
    <Banco />
  </StrictMode>,
)
