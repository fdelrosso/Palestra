import { useState } from 'react'
import Foglio from './Foglio'
import { NumInput, RecuperoEditor } from './SchemaFasi'
import { CIRCUITO_INIZIALE, MINUTI_MAX, OGNI_PROPOSTI, TIPI_CIRCUITO } from '../lib/circuiti'
import { formattaSecondi } from '../lib/schema'

// Le impostazioni di un circuito (lib/circuiti): prima il tipo, poi solo i
// campi di quel tipo. Lo stesso foglio crea il riquadro ("+ Circuito") e lo
// cambia (toccando la testata), e lì ha anche "Sciogli". Cambiando tipo si
// parte dai valori di base di quel tipo.
export default function FoglioCircuito({ circuito = null, onSalva, onSciogli = null, onChiudi }) {
  const [c, setC] = useState(circuito || CIRCUITO_INIZIALE.emom)
  const patch = (p) => setC((x) => ({ ...x, ...p }))
  const intero = (label, valore, onChange, unita) => (
    <span className="durata-editor">
      <NumInput intero label={label} placeholder="–" value={valore} onChange={onChange} />
      {unita && <span className="faint">{unita}</span>}
    </span>
  )
  const riga = (label, contenuto) => (
    <div className="foglio-riga">
      <span className="foglio-label">{label}</span>
      {contenuto}
    </div>
  )
  const minuti = (v) => Math.min(MINUTI_MAX, Math.max(1, v || 1))
  const giri = (v) => Math.min(30, Math.max(1, v || 1))
  const secondi = (v) => Math.min(600, Math.max(5, v || 5))
  return (
    <Foglio titolo={circuito ? 'Circuito' : 'Nuovo circuito'} onChiudi={onChiudi}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="scelte" role="group" aria-label="Tipo">
          {TIPI_CIRCUITO.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'chip chip-scelta' + (c.tipo === t.id ? ' on' : '')}
              aria-pressed={c.tipo === t.id}
              onClick={() => c.tipo !== t.id && setC(CIRCUITO_INIZIALE[t.id])}
            >
              {t.nome}
            </button>
          ))}
        </div>

        {c.tipo === 'giri' && (
          <>
            {riga('Giri', intero('Giri', c.giri, (v) => patch({ giri: giri(v) })))}
            <RecuperoEditor sec={c.recuperoSec} onChange={(sec) => patch({ recuperoSec: sec })} />
          </>
        )}

        {c.tipo === 'emom' && (
          <>
            <div className="scelte" role="group" aria-label="Ogni">
              <span className="scelte-label">Ogni</span>
              {OGNI_PROPOSTI.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={'chip chip-scelta' + (c.ogniSec === s ? ' on' : '')}
                  aria-pressed={c.ogniSec === s}
                  onClick={() => patch({ ogniSec: s })}
                >
                  {formattaSecondi(s)}
                </button>
              ))}
              {intero('Secondi', c.ogniSec, (v) => v && patch({ ogniSec: Math.min(600, v) }), 'sec')}
            </div>
            {riga(
              'Per',
              c.minuti == null ? (
                <span className="muted">finché ce la faccio</span>
              ) : (
                intero('Minuti', c.minuti, (v) => patch({ minuti: minuti(v) }), 'min')
              ),
            )}
            <div className="toggle-row">
              <span className="muted" style={{ fontSize: 13.5 }}>
                Finché ce la faccio
              </span>
              <button
                type="button"
                className={'switch' + (c.minuti == null ? ' on' : '')}
                onClick={() => patch({ minuti: c.minuti == null ? 12 : null })}
                role="switch"
                aria-checked={c.minuti == null}
                aria-label="Finché ce la faccio"
              >
                <span className="knob" />
              </button>
            </div>
          </>
        )}

        {c.tipo === 'tabata' && (
          <>
            {riga('Lavoro', intero('Lavoro', c.lavoroSec, (v) => patch({ lavoroSec: secondi(v) }), 'sec'))}
            {riga('Riposo', intero('Riposo', c.riposoSec, (v) => patch({ riposoSec: secondi(v) }), 'sec'))}
            {riga('Giri', intero('Giri', c.giri, (v) => patch({ giri: giri(v) })))}
          </>
        )}

        {c.tipo === 'amrap' && riga('Per', intero('Minuti', c.minuti, (v) => patch({ minuti: minuti(v) }), 'min'))}

        {c.tipo === 'fortime' && (
          <>
            {riga('Giri', intero('Giri', c.giri, (v) => patch({ giri: giri(v) })))}
            {riga(
              'Cap',
              c.capMinuti == null ? (
                <span className="muted">senza limite</span>
              ) : (
                intero('Cap', c.capMinuti, (v) => patch({ capMinuti: minuti(v) }), 'min')
              ),
            )}
            <div className="toggle-row">
              <span className="muted" style={{ fontSize: 13.5 }}>
                Senza limite di tempo
              </span>
              <button
                type="button"
                className={'switch' + (c.capMinuti == null ? ' on' : '')}
                onClick={() => patch({ capMinuti: c.capMinuti == null ? 20 : null })}
                role="switch"
                aria-checked={c.capMinuti == null}
                aria-label="Senza limite di tempo"
              >
                <span className="knob" />
              </button>
            </div>
          </>
        )}

        <button
          className="btn btn-accent btn-block"
          onClick={() => onSalva(c.tipo === 'emom' ? { ...c, ogniSec: Math.max(15, c.ogniSec) } : c)}
        >
          {circuito ? 'Salva' : 'Crea e scegli il primo esercizio'}
        </button>
        {onSciogli && (
          <button className="btn btn-ghost btn-block" onClick={onSciogli}>
            Sciogli: tornano esercizi normali
          </button>
        )}
      </div>
    </Foglio>
  )
}
