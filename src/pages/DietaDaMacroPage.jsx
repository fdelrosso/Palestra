import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  OBIETTIVI,
  carboDaKcal,
  coerenzaMacro,
  dietaDaMacro,
  labelObiettivo,
} from '../lib/dieta'
import { riassuntoPreferenze } from '../lib/preferenzeCibo'
import { IconBack, IconLeaf, IconTabella } from '../components/icons'

// "Ho già calorie e macro": la seconda strada per avere una dieta, accanto
// all'import del PDF.
//
// Chi arriva qui i numeri ce li ha già — glieli ha dati il nutrizionista, o se
// li è calcolati altrove — e quello che gli manca è la parte noiosa: COSA
// mettere nel piatto per rispettarli. L'app non tocca i numeri (la dieta nasce
// `fonte: esterna` apposta): li prende per buoni e ci costruisce sopra cinque
// pasti, ognuno con due alternative che valgono gli stessi macro.
//
// ⚠️ L'unica cosa che l'app si permette di dire è quando i numeri non tornano
// fra loro: 2000 kcal con P150/C250/G80 fanno 2320, e chi li ha scritti quasi
// sempre ha sbagliato a copiare. Lo si dice e si offre di sistemarlo, non lo si
// corregge di nascosto.
const CAMPI = [
  { k: 'proteine', label: 'Proteine', unita: 'g', esempio: '150' },
  { k: 'carbo', label: 'Carboidrati', unita: 'g', esempio: '250' },
  { k: 'grassi', label: 'Grassi', unita: 'g', esempio: '70' },
]

export default function DietaDaMacroPage() {
  const { preferenze, aggiungiDieta } = useStore()
  const [form, setForm] = useState({
    nome: '',
    obiettivo: 'mantenimento',
    kcal: '',
    proteine: '',
    carbo: '',
    grassi: '',
    extraAllenamento: '',
    fonteNota: '',
  })
  const [anteprima, setAnteprima] = useState(null)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setAnteprima(null)
  }

  const numeri = {
    kcal: Number(form.kcal) || 0,
    proteine: Number(form.proteine) || 0,
    carbo: Number(form.carbo) || 0,
    grassi: Number(form.grassi) || 0,
  }
  const coerenza = coerenzaMacro(numeri)
  // Serve almeno un macro: senza, non c'è niente da mettere nel piatto e i
  // pasti verrebbero fuori tutti da 5g.
  const pronto = numeri.proteine > 0 || numeri.carbo > 0 || numeri.grassi > 0

  const genera = () => {
    setAnteprima(
      dietaDaMacro(
        {
          nome: form.nome,
          obiettivo: form.obiettivo,
          kcal: numeri.kcal,
          proteine: numeri.proteine,
          carbo: numeri.carbo,
          grassi: numeri.grassi,
          extraAllenamento: Number(form.extraAllenamento) || 0,
          fonteNota: form.fonteNota,
        },
        preferenze,
      ),
    )
  }

  const salva = () => {
    const d = aggiungiDieta(anteprima)
    navigate(routes.dietaEditor(d.id))
  }

  // I carboidrati che mancano per arrivare alle calorie scritte: il campo che
  // in un piano vero è sempre l'ultimo a essere deciso.
  const suggerisciCarbo = () =>
    setForm((f) => ({
      ...f,
      carbo: String(carboDaKcal({ kcal: numeri.kcal, proteine: numeri.proteine, grassi: numeri.grassi })),
    }))

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Calorie e macro</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>I numeri li metti tu, i piatti li metto io</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Scrivi quanto vuoi mangiare in un giorno. L'app non ricalcola niente: costruisce i pasti
        che rispettano questi numeri, con delle alternative per ogni pasto.
      </p>

      <div className="field">
        <label htmlFor="macro-nome">Nome della dieta</label>
        <input
          id="macro-nome"
          className="input"
          value={form.nome}
          onChange={set('nome')}
          placeholder="Es. Definizione primavera"
          maxLength={40}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">
          <IconTabella width={15} height={15} /> Il tuo obiettivo giornaliero
        </div>

        <div className="field">
          <label htmlFor="macro-kcal">Calorie totali</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id="macro-kcal"
              className="input grow"
              type="number"
              inputMode="numeric"
              value={form.kcal}
              onChange={set('kcal')}
              placeholder="2200"
            />
            <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>kcal</span>
          </div>
        </div>

        <div className="grid-3">
          {CAMPI.map((c) => (
            <div className="field" key={c.k} style={{ marginBottom: 0 }}>
              <label htmlFor={`macro-${c.k}`}>{c.label}</label>
              <input
                id={`macro-${c.k}`}
                className="input"
                type="number"
                inputMode="numeric"
                value={form[c.k]}
                onChange={set(c.k)}
                placeholder={c.esempio}
              />
            </div>
          ))}
        </div>

        {/* Il controllo che nessuno fa a mano: 4/4/9 contro le kcal scritte. */}
        {numeri.kcal > 0 && pronto && (
          <div style={{ marginTop: 12 }}>
            {coerenza.coerente ? (
              <div className="vis-hint">
                Torna: questi macro valgono {coerenza.kcalDaMacro} kcal.
              </div>
            ) : (
              <>
                <p className="form-error" style={{ margin: 0 }}>
                  Questi macro valgono <strong>{coerenza.kcalDaMacro} kcal</strong>,{' '}
                  {coerenza.scarto > 0 ? 'più' : 'meno'} delle {numeri.kcal} che hai scritto
                  ({coerenza.scarto > 0 ? '+' : ''}
                  {coerenza.scarto}). Controlla di aver copiato bene.
                </p>
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={suggerisciCarbo}>
                  Ricalcola i carboidrati sulle {numeri.kcal} kcal
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Nei giorni di allenamento</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="macro-extra">Calorie in più (facoltativo)</label>
          <input
            id="macro-extra"
            className="input"
            type="number"
            inputMode="numeric"
            value={form.extraAllenamento}
            onChange={set('extraAllenamento')}
            placeholder="0"
          />
        </div>
        <div className="vis-hint" style={{ marginTop: 6 }}>
          Vanno tutte in carboidrati. Lascia vuoto se mangi uguale tutti i giorni.
        </div>
      </div>

      <div className="field">
        <label htmlFor="macro-obiettivo">Obiettivo</label>
        <select id="macro-obiettivo" className="input" value={form.obiettivo} onChange={set('obiettivo')}>
          {OBIETTIVI.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="macro-fonte">Chi te li ha dati (facoltativo)</label>
        <input
          id="macro-fonte"
          className="input"
          value={form.fonteNota}
          onChange={set('fonteNota')}
          placeholder="Es. dott.ssa Bianchi, marzo"
          maxLength={60}
        />
      </div>

      <div className="vis-hint" style={{ margin: '0 2px 14px' }}>
        <IconLeaf width={13} height={13} /> I pasti tengono conto di quello che non mangi:{' '}
        {riassuntoPreferenze(preferenze).toLowerCase()}.{' '}
        <button className="btn-link" onClick={() => navigate(routes.dietaPreferenze())}>
          Cambia
        </button>
      </div>

      <button className="btn btn-accent btn-block btn-lg" disabled={!pronto} onClick={genera}>
        {anteprima ? 'Rigenera i pasti' : 'Proponimi i pasti'}
      </button>
      {!pronto && (
        <div className="vis-hint" style={{ marginTop: 6 }}>
          Scrivi almeno uno dei tre macro: è da lì che escono i grammi nel piatto.
        </div>
      )}

      {anteprima && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>
            Come li spenderesti
          </div>
          <div className="vis-hint" style={{ margin: '0 2px 10px' }}>
            Giorno di riposo {anteprima.riposo.kcal} kcal · allenamento {anteprima.allenamento.kcal} kcal.
            Ogni pasto ha le sue alternative: valgono gli stessi macro, cambia il piatto.
          </div>
          <div className="stack">
            {anteprima.riposo.pasti.map((p) => (
              <div key={p.id} className="card pasto-card">
                <div className="pasto-nome">{p.nome}</div>
                <div className="pasto-testo">{p.testo}</div>
                {p.opzioni?.map((o, i) => (
                  <div key={i} className="pasto-opzione">
                    <span className="pasto-opzione-tag">oppure</span> {o}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button className="btn btn-accent btn-block btn-lg" style={{ marginTop: 18 }} onClick={salva}>
            Salva come mia dieta
          </button>
          <div className="vis-hint" style={{ marginTop: 6, marginBottom: 20 }}>
            Dopo il salvataggio si apre l'editor: lì puoi cambiare qualunque cosa, e i tuoi numeri
            restano quelli che hai scritto — «{labelObiettivo(form.obiettivo)}».
          </div>
        </>
      )}
    </div>
  )
}
