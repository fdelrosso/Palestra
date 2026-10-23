import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  coerenzaMacro,
  dietaAttiva,
  dietaDiOggi,
  labelObiettivo,
  pastoVuoto,
  periodoTesto,
  rendiAttiva,
} from '../lib/dieta'
import { GIORNI_SETTIMANA, casellaDi, labelCategoria } from '../lib/schemaDieta'
import { macroDelPasto } from '../lib/diario'
import { IconBack, IconCalendar, IconCheck, IconEdit } from '../components/icons'

// ---------------------------------------------------------------------------
// La pagina di UNA dieta, da guardare: come quella di una scheda. Si arriva
// toccando la sua card in "Le mie diete"; per cambiarla c'è la matita in alto
// (pages/DietaEditorPage, /dieta/<id>/modifica).
//
// Prima la card apriva direttamente il modulo di modifica: per rileggere cosa
// mangiare a cena bisognava passare da un form lungo con "Salva" in alto, e
// toccare qualcosa per sbaglio voleva dire cambiarla.
//
// Dall'alto: se è quella attiva (o "Rendi attiva"), i numeri del giorno di
// allenamento e di riposo, i pasti (due linguette), le giornate tipo, lo
// schema settimanale e le indicazioni del nutrizionista.
// ---------------------------------------------------------------------------

const TIPI = [
  ['allenamento', 'Allenamento'],
  ['riposo', 'Riposo'],
]

function Numeri({ piano }) {
  const kcal = piano.kcal || coerenzaMacro({ kcal: 0, ...piano }).kcalDaMacro
  return (
    <div className="dieta-vista-numeri">
      <div>
        <strong>{kcal || '-'}</strong>
        <span>kcal</span>
      </div>
      <div>
        <strong>{piano.proteine || '-'}</strong>
        <span>proteine</span>
      </div>
      <div>
        <strong>{piano.carbo || '-'}</strong>
        <span>carbo</span>
      </div>
      <div>
        <strong>{piano.grassi || '-'}</strong>
        <span>grassi</span>
      </div>
    </div>
  )
}

function Pasto({ pasto }) {
  const { totale, completo } = macroDelPasto(pasto.testo)
  return (
    <div className="dieta-vista-pasto">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="pasto-nome">{pasto.nome || 'Pasto'}</span>
        {totale.kcal > 0 && (
          <span className="faint" style={{ fontSize: 12.5, fontWeight: 700 }}>
            {completo ? '' : '≥ '}
            {totale.kcal} kcal
          </span>
        )}
      </div>
      <div className="pasto-testo" style={{ marginTop: 4 }}>{pasto.testo}</div>
      {(pasto.opzioni || []).length > 0 && (
        <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
          + {pasto.opzioni.length} {pasto.opzioni.length === 1 ? 'alternativa' : 'alternative'}
        </div>
      )}
    </div>
  )
}

export default function DietaVistaPage({ id }) {
  const { diete, getDieta, aggiornaDieta } = useStore()
  const dieta = getDieta(id)
  const [tipo, setTipo] = useState('allenamento')

  if (!dieta) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => goBack(routes.dieta())} aria-label="Indietro">
            <IconBack />
          </button>
          <h1>Dieta</h1>
        </div>
        <div className="empty">
          <p>Questa dieta non c’è più.</p>
        </div>
      </div>
    )
  }

  const attiva = dietaDiOggi(diete)?.id === dieta.id
  const pasti = (dieta[tipo]?.pasti || []).filter((p) => !pastoVuoto(p))
  const schema = dieta.schema || []

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack(routes.dieta())} aria-label="Indietro">
          <IconBack />
        </button>
        <h1 style={{ flex: 1, minWidth: 0 }}>{dieta.nome || 'Dieta'}</h1>
        <button className="icon-btn" aria-label="Modifica la dieta" onClick={() => navigate(routes.dietaEditor(dieta.id))}>
          <IconEdit />
        </button>
      </div>

      {/* L'attiva è quella che segue "Oggi"; le altre si possono rendere
          attive, come le schede. ⚠️ Il cambio di periodo si dice PRIMA. */}
      {attiva ? (
        <span className="badge badge-good" style={{ margin: '0 2px 10px' }}>
          <IconCheck width={13} height={13} /> Dieta attiva: è quella che segui in «Oggi»
        </span>
      ) : (
        <div style={{ margin: '0 2px 10px' }}>
          <button className="btn btn-sm" onClick={() => aggiornaDieta(rendiAttiva(dieta))}>
            <IconCheck width={15} height={15} /> Rendi attiva
          </button>
          {!dietaAttiva(dieta) && (
            <div className="vis-hint" style={{ marginTop: 6 }}>
              Il suo periodo non comprende oggi: rendendola attiva riparte da oggi.
            </div>
          )}
        </div>
      )}

      <div className="meta" style={{ margin: '0 2px 14px' }}>
        <span className="badge badge-accent">{labelObiettivo(dieta.obiettivo)}</span>
        {dieta.fonte === 'esterna' && (
          <span className="badge">{dieta.fonteNota || 'Del nutrizionista'}</span>
        )}
        {dieta.daPt && <span className="badge">Dal tuo PT</span>}
        <span className="muted" style={{ fontSize: 12.5 }}>{periodoTesto(dieta)}</span>
      </div>

      <div className="segmented" role="tablist" aria-label="Tipo di giornata" style={{ marginBottom: 12 }}>
        {TIPI.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tipo === k}
            className={'seg-btn' + (tipo === k ? ' on' : '')}
            onClick={() => setTipo(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <Numeri piano={dieta[tipo]} />
      </div>

      <div className="section-title">I pasti</div>
      {pasti.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: '0 2px 14px', lineHeight: 1.45 }}>
          Solo calorie e macro: i piatti te li propone «Oggi», pasto per pasto, se glieli chiedi.
        </p>
      ) : (
        <div className="card lista-cibi" style={{ marginBottom: 14 }}>
          {pasti.map((p) => (
            <Pasto key={p.id} pasto={p} />
          ))}
        </div>
      )}

      {dieta.giornate.length > 0 && (
        <>
          <div className="section-title">Giornate tipo · {dieta.giornate.length}</div>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 14px', lineHeight: 1.45 }}>
            {dieta.giornate.map((g) => g.nome).join(', ')}: in «Oggi» ruotano, così non mangi sempre lo stesso.
          </p>
        </>
      )}

      {schema.length > 0 && (
        <>
          <div className="section-title">Schema settimanale</div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="schema-mini" style={{ marginTop: 0 }}>
              {GIORNI_SETTIMANA.map((g) => {
                const pranzo = casellaDi(schema, g.id, 'pranzo')
                const cena = casellaDi(schema, g.id, 'cena')
                return (
                  <div key={g.id} className="schema-mini-giorno">
                    <strong>{g.breve}</strong>
                    <span>{labelCategoria(pranzo?.categoria, true) || (pranzo ? 'scritto' : '-')}</span>
                    <span>{labelCategoria(cena?.categoria, true) || (cena ? 'scritto' : '-')}</span>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => navigate(routes.dietaSchema(dieta.id))}>
              <IconCalendar width={15} height={15} /> Apri lo schema
            </button>
          </div>
        </>
      )}

      {dieta.note && (
        <details className="card">
          <summary className="card-titolo" style={{ cursor: 'pointer', marginBottom: 0 }}>
            Indicazioni del nutrizionista
          </summary>
          <div className="pasto-testo" style={{ marginTop: 10 }}>{dieta.note}</div>
        </details>
      )}
    </div>
  )
}
