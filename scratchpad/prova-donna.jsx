// ---------------------------------------------------------------------------
// Uomo e donna a confronto: il corpo del recap (CorpoAllenato) con gli stessi
// gruppi e sottogruppi accesi, e la card del recap su canvas (disegnaRecap).
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-donna.html
// La donna in alto arriva dal CorpoContext (il proprio corpo), quella della
// card dal campo `corpo` dell'allenamento.
// ---------------------------------------------------------------------------
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import CorpoAllenato from '../src/components/CorpoAllenato.jsx'
import { CorpoContext, useCorpoPronto } from '../src/lib/corpoImmagini.js'
import { disegnaRecap } from '../src/lib/recapImmagine.js'
import { statisticheRecap } from '../src/lib/recap.js'
import '../src/index.css'

const GRUPPI = [
  { id: 'petto', serie: 4 },
  { id: 'addome', serie: 3 },
  { id: 'schiena', serie: 4, intere: 0, sotto: { romboidi: 4, dorsali: 2 } },
  { id: 'spalle', serie: 3, intere: 0, sotto: { deltoidePosteriore: 3 } },
  { id: 'gambe', serie: 2, intere: 0, sotto: { femorali: 2, quadricipiti: 1 } },
  { id: 'glutei', serie: 2 },
]

const serie = (n) => Array.from({ length: n }, () => ({ colore: 'verde', fatto: true }))
const RIEP = {
  data: '2026-10-24T17:30:00.000Z',
  durataSec: 3900,
  nomeGiorno: 'Dorso e glutei',
  esercizi: [
    { nome: 'Rematore con bilanciere', gruppi: ['schiena'], sottogruppi: ['romboidi', 'dorsali'], sets: serie(4) },
    { nome: 'Alzate posteriori', gruppi: ['spalle'], sottogruppi: ['deltoidePosteriore'], sets: serie(3) },
    { nome: 'Hip thrust', gruppi: ['glutei'], sets: serie(3) },
    { nome: 'Crunch', gruppi: ['addome'], sets: serie(3) },
  ],
}

function Card({ corpo }) {
  const pronto = useCorpoPronto(corpo)
  const url = useMemo(() => {
    const riep = { ...RIEP, corpo }
    return disegnaRecap({ riep, stat: statisticheRecap(riep), nome: corpo }).toDataURL('image/png')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pronto: ridisegna quando arrivano le immagini
  }, [corpo, pronto])
  return <img src={url} alt="" style={{ width: '100%', borderRadius: 12 }} />
}

createRoot(document.getElementById('radice')).render(
  <div style={{ padding: 12, display: 'grid', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div className="card">
        <b>Uomo</b>
        <CorpoAllenato gruppi={GRUPPI} />
      </div>
      <CorpoContext.Provider value="donna">
        <div className="card">
          <b>Donna (dal contesto)</b>
          <CorpoAllenato gruppi={GRUPPI} />
        </div>
      </CorpoContext.Provider>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Card corpo="uomo" />
      <Card corpo="donna" />
    </div>
  </div>,
)
