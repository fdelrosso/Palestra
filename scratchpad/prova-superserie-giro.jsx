// ---------------------------------------------------------------------------
// Tre design per la SUPERSERIE come UNA serie sola: un giro = tutti gli
// esercizi di fila, un solo giudizio sullo sforzo. Solo l'aspetto: card
// statiche coi testi finti, niente store e niente sessione.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-superserie-giro.html
//
// A · il giro nel riquadro della serie   B · affiancati   C · il percorso
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import { IconBatteria, IconCatena, IconClock } from '../src/components/icons.jsx'
import '../src/index.css'

const ESERCIZI = [
  { l: 'A', nome: 'Pectoral', rip: 9, kg: '40', g: '#e5533d' },
  { l: 'B', nome: 'Pulley', rip: 9, kg: '45', g: '#3b82f6' },
]
const GIRI = ['verde', null, null] // il primo fatto, si e' al secondo

function Giri({ grandi }) {
  return (
    <div className="set-dots" style={{ gap: grandi ? 12 : 8 }}>
      {GIRI.map((c, j) => (
        <span
          key={j}
          className={'set-dot' + (c ? ' ' + c : j === 1 ? ' current' : '')}
          style={grandi ? { width: 34, height: 34, fontSize: 14 } : undefined}
        >
          {c ? '✓' : j + 1}
        </span>
      ))}
    </div>
  )
}

function Peso({ kg }) {
  return (
    <span className="serie-ora-peso" style={{ fontSize: 'inherit' }}>
      {kg}
      <small style={{ fontSize: '0.6em', color: 'var(--muted)' }}> kg</small>
    </span>
  )
}

function Lettera({ e }) {
  return (
    <span className="gm-lettera" style={{ '--g': e.g }}>
      {e.l}
    </span>
  )
}

function Tasti({ righe }) {
  const T = [
    ['verde', 'Facile', 3, 'avevo margine'],
    ['giallo', 'Medio', 1, 'ultima volta'],
    ['rosso', 'Duro', 0, 'al limite'],
  ]
  return (
    <div className="gm-sforzo">
      <div className="sforzo-testa">
        <span className="section-title">Com'è andato il giro?</span>
        <button className="btn-link sforzo-annulla">Annulla l’ultimo</button>
      </div>
      <div className={righe ? 'gm-righe' : 'effort-buttons'}>
        {T.map(([c, label, t, cosa]) => (
          <button key={c} className={'effort ' + c}>
            <IconBatteria tacche={t} width={righe ? 32 : 28} height={righe ? 32 : 28} aria-hidden="true" />
            {label}
            {righe && <span className={c === 'giallo' ? 'gm-ultima' : 'gm-cosa'}>{cosa}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function Titolo() {
  return (
    <div className="superserie-titolo" style={{ marginBottom: 12 }}>
      <IconCatena width={15} height={15} />
      Superserie
      <span className="superserie-sub">di fila, poi recupero 1'</span>
    </div>
  )
}

// A — Il giro nel riquadro della serie: una riga per esercizio, i pallini sono
// i giri. La card singola, con piu' esercizi dentro.
function A() {
  return (
    <div className="card gm-card">
      <Titolo />
      <div className="serie-ora" style={{ margin: 0 }}>
        <div className="serie-ora-testa">Giro 2 di 3</div>
        <div className="gm-a-righe">
          {ESERCIZI.map((e) => (
            <div key={e.l} className="gm-a-riga">
              <Lettera e={e} />
              <span className="gm-nome">{e.nome}</span>
              <span className="gm-a-num">
                {e.rip}
                <small> rip</small>
                <span className="serie-ora-per">×</span>
                <Peso kg={e.kg} />
              </span>
            </div>
          ))}
        </div>
        <Giri />
      </div>
      <Tasti righe />
    </div>
  )
}

// B — Affiancati: numeri grandi uno accanto all'altro, la freccia = subito.
function B() {
  return (
    <div className="card gm-card">
      <Titolo />
      <div className="serie-ora-testa" style={{ marginBottom: 8 }}>
        Giro 2 di 3
      </div>
      <div className="gm-b">
        {ESERCIZI.map((e, k) => (
          <div key={e.l} style={{ display: 'contents' }}>
            {k > 0 && (
              <div className="gm-b-freccia">
                →<small>subito</small>
              </div>
            )}
            <div className="gm-b-col" style={{ '--g': e.g }}>
              <div className="gm-b-testa">
                <Lettera e={e} />
                <span className="gm-nome">{e.nome}</span>
              </div>
              <div className="gm-b-rip">
                {e.rip}
                <small> rip</small>
              </div>
              <div className="gm-b-kg">
                × <Peso kg={e.kg} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 0' }}>
        <Giri grandi />
      </div>
      <Tasti righe />
    </div>
  )
}

// C — Il percorso: una linea dal primo esercizio al recupero. La regola della
// superserie (niente pausa in mezzo, recupero alla fine) e' la forma stessa.
function C() {
  return (
    <div className="card gm-card">
      <div className="gm-c-testa">
        <div>
          <div className="superserie-titolo" style={{ margin: 0 }}>
            <IconCatena width={15} height={15} />
            Superserie
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>Giro 2 di 3</div>
        </div>
        <Giri />
      </div>
      <ol className="gm-c">
        {ESERCIZI.map((e, k) => (
          <li key={e.l} className="gm-c-passo" style={{ '--g': e.g }}>
            <span className="gm-c-pallino">{k + 1}</span>
            <div className="gm-c-corpo">
              <span className="gm-nome">{e.nome}</span>
              <span className="gm-c-num">
                {e.rip}
                <small> rip</small>
                <span className="serie-ora-per">×</span>
                <Peso kg={e.kg} />
              </span>
            </div>
            {k < ESERCIZI.length - 1 && <span className="gm-c-subito">subito, senza pausa</span>}
          </li>
        ))}
        <li className="gm-c-passo gm-c-fine">
          <span className="gm-c-pallino">
            <IconClock width={15} height={15} />
          </span>
          <div className="gm-c-corpo">
            <span className="gm-nome" style={{ color: 'var(--muted)' }}>
              Recupero 1'
            </span>
          </div>
        </li>
      </ol>
      <Tasti righe />
    </div>
  )
}

const CSS = `
  body { margin: 0; background: #15171c; }
  .gm-pagina { display: flex; gap: 28px; padding: 28px; align-items: flex-start; }
  .gm-pagina figure { margin: 0; width: 360px; }
  .gm-pagina h2 { margin: 0 0 2px; font-size: 20px; color: #e8e8ea; }
  .gm-pagina p { margin: 0 0 14px; color: #9a9ca3; font-size: 14px; height: 38px; }
  .gm-card { padding: 16px; min-height: 560px; display: flex; flex-direction: column;
             border-color: color-mix(in srgb, var(--accent) 50%, var(--border)); }
  .gm-sforzo { margin-top: auto; padding-top: 12px; }
  .gm-lettera { flex: none; width: 24px; height: 24px; display: grid; place-items: center;
                border-radius: 7px; font-size: 13px; font-weight: 800; color: var(--g);
                background: color-mix(in srgb, var(--g) 18%, transparent); }
  .gm-nome { font-weight: 800; font-size: 16px; min-width: 0; }
  .gm-righe { display: flex; flex-direction: column; gap: 10px; }
  .gm-righe .effort { flex-direction: row; justify-content: flex-start; gap: 14px;
                      padding: 0 18px; min-height: 64px; font-size: 18px; }
  .gm-cosa { margin-left: auto; font-size: 14px; font-weight: 600; opacity: .75; }
  .gm-ultima { margin-left: auto; padding: 2px 8px; border-radius: 999px; font-size: 11.5px;
               font-weight: 700; background: color-mix(in srgb, currentColor 16%, transparent); }
  .pista .effort, .effort-buttons .effort { min-height: 64px; }

  .gm-a-righe { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 14px; }
  .gm-a-riga { display: flex; align-items: center; gap: 10px; }
  .gm-a-riga .gm-nome { flex: 1; }
  .gm-a-num { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums;
              display: flex; align-items: baseline; }
  .gm-a-num small { font-size: 13px; color: var(--muted); }
  .gm-a-num .serie-ora-per { font-size: 17px; margin: 0 5px; }

  .gm-b { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 6px; }
  .gm-b-col { padding: 12px; border-radius: 16px;
              background: color-mix(in srgb, var(--text) 6%, transparent);
              border-top: 3px solid var(--g); }
  .gm-b-testa { display: flex; align-items: center; gap: 8px; }
  .gm-b-rip { font-size: 44px; font-weight: 800; line-height: 1; margin-top: 14px;
              font-variant-numeric: tabular-nums; }
  .gm-b-rip small, .gm-b-kg small { font-size: 14px; color: var(--muted); }
  .gm-b-kg { font-size: 26px; font-weight: 800; margin-top: 6px; color: var(--muted); }
  .gm-b-kg .serie-ora-peso { color: var(--text); }
  .gm-b-freccia { display: flex; flex-direction: column; align-items: center; justify-content: center;
                  font-size: 22px; font-weight: 800; color: var(--accent-strong); }
  .gm-b-freccia small { font-size: 10.5px; font-weight: 700; text-transform: uppercase;
                        letter-spacing: .04em; }

  .gm-c-testa { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
  .gm-c { list-style: none; margin: 0; padding: 0; }
  .gm-c-passo { position: relative; padding: 0 0 26px 44px; }
  .gm-c-passo::before { content: ''; position: absolute; left: 15px; top: 30px; bottom: 0;
                        width: 2px; background: color-mix(in srgb, var(--accent) 55%, transparent); }
  .gm-c-fine { padding-bottom: 0; }
  .gm-c-fine::before { display: none; }
  .gm-c-pallino { position: absolute; left: 0; top: 0; width: 32px; height: 32px; border-radius: 50%;
                  display: grid; place-items: center; font-weight: 800; font-size: 14px;
                  color: var(--g, var(--muted)); border: 2px solid var(--g, var(--border-strong));
                  background: var(--bg-elev); }
  .gm-c-corpo { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
                min-height: 32px; padding-top: 4px; }
  .gm-c-num { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums;
              display: flex; align-items: baseline; }
  .gm-c-num small { font-size: 13px; color: var(--muted); }
  .gm-c-num .serie-ora-per { font-size: 17px; margin: 0 5px; }
  .gm-c-subito { display: block; margin-top: 4px; font-size: 12px; font-weight: 700;
                 color: var(--accent-strong); text-transform: uppercase; letter-spacing: .04em; }
`

const DESIGN = [
  ['A · Il giro nel riquadro', 'Come la card di un esercizio, con più esercizi dentro.', A],
  ['B · Affiancati', 'Numeri grandi uno accanto all’altro; la freccia è “subito”.', B],
  ['C · Il percorso', 'Una linea dal primo esercizio al recupero.', C],
]

document.documentElement.dataset.tema = 'scuro'
createRoot(document.getElementById('radice')).render(
  <div className="gm-pagina">
    <style>{CSS}</style>
    {DESIGN.map(([titolo, spiega, D]) => (
      <figure key={titolo}>
        <h2>{titolo}</h2>
        <p>{spiega}</p>
        <D />
      </figure>
    ))}
  </div>,
)
