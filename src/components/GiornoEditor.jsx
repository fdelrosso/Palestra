import { schemaPerSettimana } from '../data/model'
import { gruppiScritti, patchGruppi } from '../lib/eserciziLibreria'
import { blocchi, eSuperserie, spostaEsercizio, togliEsercizio } from '../lib/superserie'
import SceltaGruppi from './SceltaGruppi'
import { IconCatena, IconChevron, IconPlus, IconTrash } from './icons'
import EsercizioAllegati from './EsercizioAllegati'

// Editor di un singolo giorno (nome/tipo + esercizi con schema per settimana).
// Componente controllato: lo stato vive nel genitore, qui solo la UI + callback.
//
// `soloEsercizi`: nasconde l'intestazione del giorno (nome, tipo, elimina) e
// lascia solo l'elenco esercizi + "Aggiungi esercizio". Usato nella modifica
// in-place dall'anteprima allenamento, dove si toccano solo gli esercizi.
//
// `senzaSettimane` e `senzaAllegati` servono all'allenamento costruito al volo
// (NuovoAllenamentoPage), che non è una scheda ma una cosa sola da fare adesso:
// - le settimane non esistono, quindi "Cambia per settimana" è una domanda
//   senza senso e lo schema è sempre e solo `schemaBase`;
// - ⚠️ gli allegati NO: una foto vuole la scheda in cui sta, perché è la sua
//   visibilità a dire chi può scaricarla (posso_scaricare_media), e qui la
//   scheda-contenitore non esiste ancora. Foto e commenti si aggiungono
//   durante l'allenamento, quando c'è.
//
// SUPERSERIE (lib/superserie): ogni esercizio tranne il primo ha l'interruttore
// "Superserie con <quello sopra>". Restano esercizi separati, ognuno col suo
// schema — la superserie è solo il legame, e si vede come un riquadro unico
// intorno al blocco. Le frecce su/giù servono a mettere vicini due esercizi da
// unire (quello aggiunto finisce in fondo).
// `onEsercizi(fn)` riceve una funzione vecchia-lista → nuova-lista: spostare e
// togliere toccano più di un esercizio alla volta (chi resta primo di una
// superserie perde il legame), e farlo con due callback separate vorrebbe dire
// perdere la prima modifica nei genitori che non usano l'aggiornamento
// funzionale. Senza `onEsercizi` le frecce non ci sono e si toglie come prima.
export function GiornoEditor({
  giorno,
  numeroSettimane,
  // Non serve a questo componente: lo passa a EsercizioAllegati, perché la
  // regola d'accesso ai file deve sapere in quale scheda sta la foto.
  schedaId = null,
  soloEsercizi = false,
  senzaSettimane = false,
  senzaAllegati = false,
  onPatch,
  onRemove,
  onAddEsercizio,
  onRemoveEsercizio,
  onPatchEsercizio,
  onToggleVaria,
  onPatchSchema,
  onEsercizi = null,
}) {
  const soloRiposo = !soloEsercizi && giorno.tipo === 'rest'
  const lista = giorno.esercizi || []
  const togli = (id) => (onEsercizi ? onEsercizi((l) => togliEsercizio(l, id)) : onRemoveEsercizio(id))
  const sposta = onEsercizi ? (id, verso) => onEsercizi((l) => spostaEsercizio(l, id, verso)) : null
  const editorDi = (i) => {
    const e = lista[i]
    return (
      <EsercizioEditor
        key={e.id}
        esercizio={e}
        precedente={i > 0 ? lista[i - 1] : null}
        primo={i === 0}
        ultimo={i === lista.length - 1}
        schedaId={schedaId}
        numeroSettimane={numeroSettimane}
        senzaSettimane={senzaSettimane}
        senzaAllegati={senzaAllegati}
        onPatch={(p) => onPatchEsercizio(e.id, p)}
        onRemove={() => togli(e.id)}
        onSposta={sposta ? (verso) => sposta(e.id, verso) : null}
        onToggleVaria={() => onToggleVaria(e.id)}
        onPatchSchema={(weekIdx, p) => onPatchSchema(e.id, weekIdx, p)}
      />
    )
  }
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
            {blocchi(lista).map((b) =>
              eSuperserie(b) ? (
                <div key={lista[b.inizio].id} className="superserie-blocco">
                  <div className="superserie-titolo">
                    <IconCatena width={15} height={15} />
                    {b.indici.length === 2 ? 'Superserie' : `Superserie da ${b.indici.length}`}
                    <span className="superserie-sub">di fila, recupero a fine giro</span>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>{b.indici.map(editorDi)}</div>
                </div>
              ) : (
                editorDi(b.inizio)
              ),
            )}
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

function EsercizioEditor({
  esercizio,
  // L'esercizio sopra (null per il primo): il suo nome dice CON CHI si fa la
  // superserie, che è la domanda vera dietro l'interruttore.
  precedente,
  primo,
  ultimo,
  // Solo per EsercizioAllegati: la regola d'accesso ai file deve sapere in
  // quale scheda sta la foto per decidere chi può scaricarla.
  schedaId,
  numeroSettimane,
  senzaSettimane,
  senzaAllegati,
  onPatch,
  onRemove,
  onSposta,
  onToggleVaria,
  onPatchSchema,
}) {
  const unito = !primo && !!esercizio.insiemeAlPrecedente
  return (
    <div style={{ background: 'var(--bg-elev-2)', borderRadius: 13, padding: 12 }}>
      <div className="row" style={{ gap: 4 }}>
        <input
          className="input"
          value={esercizio.nome}
          placeholder="Nome esercizio"
          onChange={(e) => onPatch({ nome: e.target.value })}
          style={{ flex: 1, marginRight: 4 }}
        />
        {onSposta && (
          <>
            <button
              className="icon-btn sposta-btn"
              onClick={() => onSposta(-1)}
              disabled={primo}
              aria-label="Sposta su"
            >
              <IconChevron width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <button
              className="icon-btn sposta-btn"
              onClick={() => onSposta(1)}
              disabled={ultimo}
              aria-label="Sposta giù"
            >
              <IconChevron width={18} height={18} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </>
        )}
        <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
          <IconTrash width={18} height={18} />
        </button>
      </div>

      {/* La superserie col precedente. Il primo esercizio non ce l'ha: non ha
          nessuno sopra a cui legarsi. */}
      {!primo && (
        <div className="toggle-row">
          <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
            Superserie con{' '}
            <strong style={{ color: 'var(--text)' }}>
              {precedente?.nome?.trim() || 'l’esercizio sopra'}
            </strong>
          </span>
          <button
            className={'switch' + (unito ? ' on' : '')}
            onClick={() => onPatch({ insiemeAlPrecedente: !unito })}
            role="switch"
            aria-checked={unito}
            aria-label="Superserie con l’esercizio sopra"
          >
            <span className="knob" />
          </button>
        </div>
      )}

      <input
        className="input"
        style={{ marginTop: 8 }}
        value={esercizio.nota}
        placeholder="Nota (es. 12rm, cedimento…)"
        onChange={(e) => onPatch({ nota: e.target.value })}
      />

      {/* Più gruppi per esercizio (i dip sono petto e tricipiti). Si mostrano
          solo quelli SCRITTI, non l'ipotesi dal nome: un gruppo acceso che nel
          salvataggio non c'è sarebbe una bugia. */}
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Gruppi muscolari{gruppiScritti(esercizio).length > 1 ? ' — ★ il principale' : ''}
        </span>
        <SceltaGruppi
          compatto
          valori={gruppiScritti(esercizio)}
          onChange={(g) => onPatch(patchGruppi(g))}
        />
      </div>

      {!senzaSettimane && (
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
      )}

      {senzaSettimane || !esercizio.variaPerSettimana ? (
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

      {!senzaAllegati && (
        <EsercizioAllegati
          esercizio={esercizio}
          schedaId={schedaId}
          onChange={(upd) => onPatch({ commenti: upd.commenti, media: upd.media })}
        />
      )}
    </div>
  )
}
