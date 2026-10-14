// ---------------------------------------------------------------------------
// Tutti gli esercizi della libreria, ognuno con la posa di PARTENZA e quella
// di ARRIVO del suo movimento (lib/animazioniEsercizi), fermi uno accanto
// all'altro: per controllare a occhio che ogni gesto sia quello giusto.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-esercizi.html?g=glutei
//   `g` = il gruppo (lib/muscoli); `solo=nuovi` mostra solo i movimenti
//   aggiunti il 2026-10-14.
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import { LIBRERIA } from '../src/lib/eserciziLibreria.js'
import { movimentoDi } from '../src/lib/animazioniEsercizi.js'
import EsercizioAnimato from '../src/components/EsercizioAnimato.jsx'
import '../src/index.css'

const q = new URLSearchParams(location.search)
// `nomi=a|b|c`: solo quegli esercizi, da qualunque gruppo.
const scelti = q.get('nomi') ? q.get('nomi').split('|') : null
const voci = scelti
  ? Object.entries(LIBRERIA).flatMap(([gr, ns]) => ns.filter((n) => scelti.includes(n)).map((n) => [gr, n]))
  : (LIBRERIA[q.get('g') || 'glutei'] || []).map((n) => [q.get('g') || 'glutei', n])

createRoot(document.getElementById('radice')).render(
  <div style={{ padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
    {voci.map(([g, n]) => {
      const m = movimentoDi(n, g)
      return (
        <div key={n} className="card" style={{ padding: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, minHeight: 26 }}>
            {n} <span className="muted">· {m.id}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <EsercizioAnimato nome={n} gruppo={g} altezza={150} movimento={{ ...m, id: m.id + ':a', b: m.a }} />
            <EsercizioAnimato nome={n} gruppo={g} altezza={150} movimento={{ ...m, id: m.id + ':b', a: m.b }} />
          </div>
        </div>
      )
    })}
  </div>,
)
