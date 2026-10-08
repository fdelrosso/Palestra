import {
  LIMITI,
  LIVELLI,
  MOVIMENTI,
  OBIETTIVI,
  SESSI,
  erroreCampo,
  kcalConsigliate,
  mantenimento,
  metabolismoBasale,
  scartoObiettivo,
} from '../lib/datiFisici'
import { IconCheck } from './icons'

// ---------------------------------------------------------------------------
// I campi dei dati fisici: sesso, età, peso, altezza, movimento, obiettivo e
// livello di esperienza.
//
// Sono gli stessi in due posti — quando si crea l'account (pages/UserGate) e
// quando li si cambia (pages/DatiFisiciPage) — e devono restare gli stessi:
// se domani si aggiunge un campo lo si aggiunge qui una volta sola.
//
// Il riquadro in fondo (il "conto") non è decorazione: fa vedere subito che
// quei numeri servono a qualcosa, e cambiando l'obiettivo si vede muoversi la
// riga delle calorie. È l'unico modo onesto di chiedere sei campi a qualcuno
// che voleva solo aprire un account.
//
// IL LIVELLO è l'unico campo che non c'entra col peso e con le calorie: dice
// quali esercizi sanno fare le mani di chi si allena, e da lì il motore decide
// cosa proporgli (lib/livello). Per questo sta in fondo, staccato, e per questo
// le tre voci sono scritte per esteso invece che in tre bottoncini: è una
// scelta che si fa una volta e va capita, non indovinata dal nome.
// ---------------------------------------------------------------------------

// Un numero con la sua unità DENTRO il campo, a destra ("78 kg"): l'etichetta
// resta corta e il campo si legge come un valore, non come un modulo.
function Numero({ id, label, chiave, valore, onChange, placeholder }) {
  const errore = erroreCampo(valore, chiave)
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor={id}>{label}</label>
      <div className={'input-unita' + (errore ? ' sbagliato' : '')}>
        <input
          id={id}
          className="input"
          inputMode="decimal"
          value={valore}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={!!errore}
          aria-describedby={errore ? id + '-errore' : undefined}
        />
        <span aria-hidden="true">{LIMITI[chiave].unita}</span>
      </div>
      {errore && (
        <p className="form-error" id={id + '-errore'} style={{ marginTop: 6 }}>
          {errore}
        </p>
      )}
    </div>
  )
}

/**
 * @param {object} p
 * @param {object} p.valori    i dati fisici (lib/datiFisici)
 * @param {(patch:object)=>void} p.onChange
 * @param {boolean} [p.conConto]  mostra metabolismo basale e calorie consigliate
 */
export default function DatiFisiciForm({ valori, onChange, conConto = true }) {
  const set = (campo) => (v) => onChange({ [campo]: v })
  const bmr = metabolismoBasale(valori)
  const mant = mantenimento(valori)
  const kcal = kcalConsigliate(valori)

  return (
    <>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Sesso</label>
        <div className="segmented">
          {SESSI.map((s) => (
            <button
              key={s.id}
              type="button"
              className={'seg-btn' + (valori.sesso === s.id ? ' on' : '')}
              onClick={() => onChange({ sesso: s.id })}
              aria-pressed={valori.sesso === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dati-numeri">
        <Numero
          id="df-eta"
          label="Età"
          chiave="eta"
          valore={valori.eta}
          onChange={set('eta')}
          placeholder="24"
        />
        <Numero
          id="df-peso"
          label="Peso"
          chiave="peso"
          valore={valori.peso}
          onChange={set('peso')}
          placeholder="78"
        />
        <Numero
          id="df-altezza"
          label="Altezza"
          chiave="altezza"
          valore={valori.altezza}
          onChange={set('altezza')}
          placeholder="180"
        />
      </div>

      {/* Uno sotto l'altro: le voci sono frasi ("Leggero (in piedi, qualche
          passo)"), e affiancate si leggerebbero a metà. */}
      <div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="df-movimento">Movimento giornaliero</label>
          <select
            id="df-movimento"
            className="select"
            value={valori.movimento}
            onChange={(e) => onChange({ movimento: e.target.value })}
          >
            {MOVIMENTI.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="df-obiettivo">Perché ti alleni</label>
          <select
            id="df-obiettivo"
            className="select"
            value={valori.obiettivo}
            onChange={(e) => onChange({ obiettivo: e.target.value })}
          >
            {OBIETTIVI.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Livello di esperienza: non tocca le calorie, decide gli allenamenti
          che l'app propone. Le descrizioni si vedono tutte e tre insieme,
          perché è scegliendo che servono. */}
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Il tuo livello</label>
        <div className="stack" style={{ gap: 8 }}>
          {LIVELLI.map((l) => (
            <button
              key={l.id}
              type="button"
              className={'menu-voce livello-voce' + (valori.livello === l.id ? ' scelta' : '')}
              onClick={() => onChange({ livello: l.id })}
              aria-pressed={valori.livello === l.id}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="menu-voce-nome">{l.label}</span>
                <span className="menu-voce-desc">{l.descrizione}</span>
              </span>
              <span className="livello-segno" aria-hidden="true">
                {valori.livello === l.id && <IconCheck width={14} height={14} />}
              </span>
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
          {valori.livello
            ? `Nelle schede e negli allenamenti generati: ${LIVELLI.find((l) => l.id === valori.livello)?.effetto}.`
            : 'Serve alle schede e agli allenamenti generati dall’app: quali esercizi ti propone e con quante serie. Puoi cambiarlo quando vuoi.'}
        </p>
      </div>

      {conConto && bmr != null && (
        <div className="dati-conto">
          <div className="dati-conto-riga">
            <span className="muted">Metabolismo basale</span>
            <strong>{bmr} kcal</strong>
          </div>
          <div className="dati-conto-riga">
            <span className="muted">Mantenimento (giorno di riposo)</span>
            <strong>{mant} kcal</strong>
          </div>
          <div className="dati-conto-riga accento">
            <span>Consigliate per il tuo obiettivo</span>
            <strong>{kcal} kcal</strong>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '8px 0 0', lineHeight: 1.4 }}>
            {scartoObiettivo(valori)} · stima indicativa (Mifflin-St Jeor), non un consiglio medico.
          </p>
        </div>
      )}
    </>
  )
}
