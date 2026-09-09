import { schemaPerSettimana } from '../data/model'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import { IconPlus, IconTrash } from './icons'
import EsercizioAllegati from './EsercizioAllegati'

// Editor di un singolo giorno (nome/tipo + esercizi con schema per settimana).
// Componente controllato: lo stato vive nel genitore, qui solo la UI + callback.
//
// `soloEsercizi`: nasconde l'intestazione del giorno (nome, tipo, elimina) e
// lascia solo l'elenco esercizi + "Aggiungi esercizio". Usato nella modifica
// in-place dall'anteprima allenamento, dove si toccano solo gli esercizi.
export function GiornoEditor({
  giorno,
  numeroSettimane,
  soloEsercizi = false,
  onPatch,
  onRemove,
  onAddEsercizio,
  onRemoveEsercizio,
  onPatchEsercizio,
  onToggleVaria,
  onPatchSchema,
}) {
  const soloRiposo = !soloEsercizi && giorno.tipo === 'rest'
  return (
    <div className="card" style={{ marginTop: soloEsercizi ? 6 : 14 }}>
      {!soloEsercizi && (
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            value={giorno.nome}
            placeholder="Nome giorno"
            onChange={(e) => onPatch({ nome: e.target.value })}
            style={{ flex: 1 }}
          />
          <select
            className="select"
            value={giorno.tipo}
            onChange={(e) => onPatch({ tipo: e.target.value })}
            style={{ width: 130 }}
          >
            <option value="workout">Allenamento</option>
            <option value="rest">Rest</option>
          </select>
          <button className="icon-btn" onClick={onRemove} aria-label="Elimina giorno">
            <IconTrash />
          </button>
        </div>
      )}

      {soloRiposo ? (
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>Nota riposo (facoltativa)</label>
          <input
            className="input"
            value={giorno.nota}
            placeholder="Es. bici"
            onChange={(e) => onPatch({ nota: e.target.value })}
          />
        </div>
      ) : (
        <>
          {!soloEsercizi && <div className="divider" />}
          <div className="stack" style={{ gap: 12 }}>
            {giorno.esercizi.map((e) => (
              <EsercizioEditor
                key={e.id}
                esercizio={e}
                numeroSettimane={numeroSettimane}
                onPatch={(p) => onPatchEsercizio(e.id, p)}
                onRemove={() => onRemoveEsercizio(e.id)}
                onToggleVaria={() => onToggleVaria(e.id)}
                onPatchSchema={(weekIdx, p) => onPatchSchema(e.id, weekIdx, p)}
              />
            ))}
          </div>
          {giorno.esercizi.length === 0 && (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 0' }}>
              Nessun esercizio. Aggiungine uno qui sotto.
            </p>
          )}
          <button className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={onAddEsercizio}>
            <IconPlus width={16} height={16} /> Aggiungi esercizio
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Esercizio
function SchemaFields({ schema, onChange }) {
  return (
    <div className="grid-4">
      <input
        className="input"
        placeholder="Serie"
        value={schema.serie}
        onChange={(e) => onChange({ serie: e.target.value })}
      />
      <input
        className="input"
        placeholder="Rip."
        value={schema.ripetizioni}
        onChange={(e) => onChange({ ripetizioni: e.target.value })}
      />
      <input
        className="input"
        placeholder="Carico"
        value={schema.carico}
        onChange={(e) => onChange({ carico: e.target.value })}
      />
      <input
        className="input"
        placeholder="Recupero"
        value={schema.recupero}
        onChange={(e) => onChange({ recupero: e.target.value })}
      />
    </div>
  )
}

function EsercizioEditor({ esercizio, numeroSettimane, onPatch, onRemove, onToggleVaria, onPatchSchema }) {
  return (
    <div style={{ background: 'var(--bg-elev-2)', borderRadius: 13, padding: 12 }}>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          value={esercizio.nome}
          placeholder="Nome esercizio"
          onChange={(e) => onPatch({ nome: e.target.value })}
          style={{ flex: 1 }}
        />
        <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
          <IconTrash width={18} height={18} />
        </button>
      </div>

      <input
        className="input"
        style={{ marginTop: 8 }}
        value={esercizio.nota}
        placeholder="Nota (es. 12rm, cedimento…)"
        onChange={(e) => onPatch({ nota: e.target.value })}
      />

      <div
        className="gruppo-picker"
        style={gruppoDi(esercizio.gruppo) ? { '--g': gruppoDi(esercizio.gruppo).colore } : undefined}
      >
        <label>Gruppo</label>
        <select
          className="select"
          value={esercizio.gruppo || ''}
          onChange={(e) => onPatch({ gruppo: e.target.value })}
        >
          <option value="">— nessuno —</option>
          {GRUPPI.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <span className={'gruppo-swatch' + (gruppoDi(esercizio.gruppo) ? '' : ' vuoto')} />
      </div>

      <div className="toggle-row">
        <span className="muted" style={{ fontSize: 13.5 }}>
          Cambia per settimana
        </span>
        <button
          className={'switch' + (esercizio.variaPerSettimana ? ' on' : '')}
          onClick={onToggleVaria}
          aria-label="Cambia per settimana"
        >
          <span className="knob" />
        </button>
      </div>

      {!esercizio.variaPerSettimana ? (
        <SchemaFields schema={esercizio.schemaBase} onChange={(p) => onPatchSchema(null, p)} />
      ) : (
        <div>
          {Array.from({ length: numeroSettimane }, (_, i) => (
            <div key={i} className="week-scheme-row">
              <span className="wk">S{i + 1}</span>
              <input
                className="input"
                placeholder="Serie"
                value={schemaPerSettimana(esercizio, i + 1).serie}
                onChange={(e) => onPatchSchema(i, { serie: e.target.value })}
              />
              <input
                className="input"
                placeholder="Rip."
                value={schemaPerSettimana(esercizio, i + 1).ripetizioni}
                onChange={(e) => onPatchSchema(i, { ripetizioni: e.target.value })}
              />
              <input
                className="input"
                placeholder="Carico"
                value={schemaPerSettimana(esercizio, i + 1).carico}
                onChange={(e) => onPatchSchema(i, { carico: e.target.value })}
              />
              <input
                className="input"
                placeholder="Rec."
                value={schemaPerSettimana(esercizio, i + 1).recupero}
                onChange={(e) => onPatchSchema(i, { recupero: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <EsercizioAllegati
        esercizio={esercizio}
        onChange={(upd) => onPatch({ commenti: upd.commenti, media: upd.media })}
      />
    </div>
  )
}
