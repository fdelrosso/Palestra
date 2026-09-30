import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { esci, navigate, riscriviIndirizzo, routes } from '../lib/router'
import {
  FONTE,
  MOVIMENTI,
  OBIETTIVI,
  SESSI,
  TIPO_GIORNATA,
  adattaDieta,
  calcolaDieta,
  coerenzaMacro,
  conPastiBase,
  dietaDaDatiFisici,
  labelObiettivo,
  nuovaDieta,
  nuovaGiornataTipo,
  pastiDaMacro,
  pastoVuoto,
} from '../lib/dieta'
import { normalizzaDatiFisici } from '../lib/datiFisici'
import { preferenzeAttive, riassuntoPreferenze } from '../lib/preferenzeCibo'
import { GIORNI_SETTIMANA, casellaDi, giornoSettimana, labelCategoria } from '../lib/schemaDieta'
import { labelPasto } from '../lib/pastiBase'
import { nuovoId } from '../data/model'
import { IconBack, IconCalendar, IconTrash, IconPlus, IconLeaf, IconUpload, IconCheck } from '../components/icons'

// I cinque pasti sempre presenti, nei piani base e nelle giornate tipo: in
// modifica si vedono tutti, anche quelli ancora vuoti.
function conCinquePasti(d) {
  return {
    ...d,
    allenamento: { ...d.allenamento, pasti: conPastiBase(d.allenamento?.pasti) },
    riposo: { ...d.riposo, pasti: conPastiBase(d.riposo?.pasti) },
    giornate: (d.giornate || []).map((g) => ({ ...g, pasti: conPastiBase(g.pasti) })),
  }
}

// "Oggi (mercoledì): pranzo carne bianca, cena uova" — lo schema in una riga.
function riassuntoSchema(schema) {
  if (!schema?.length) return ''
  const oggi = giornoSettimana()
  const diOggi = schema
    .filter((c) => c.giorno === oggi)
    .map((c) => `${labelPasto(c.pasto).toLowerCase()} ${(labelCategoria(c.categoria) || 'come scritto').toLowerCase()}`)
  const giorni = new Set(schema.map((c) => c.giorno)).size
  return (
    `${giorni === 7 ? 'Tutta la settimana' : `${giorni} giorni su 7`}. ` +
    (diOggi.length ? `Oggi (${GIORNI_SETTIMANA[oggi].nome.toLowerCase()}): ${diOggi.join(', ')}.` : 'Oggi niente di fissato.')
  )
}

// Editor di una dieta: crea (con calcolo consigliato dai dati) o modifica.
//
// Sezioni: nome, periodo di validità, DA DOVE VENGONO I NUMERI (calcolati
// dall'app o dati dal nutrizionista), i due piani base (giorni di allenamento /
// giorni di riposo) e le GIORNATE TIPO, che sono menu alternativi a parità di
// macro e ruotano in "cosa mangiare oggi".
//
// Il tasto "Adatta ai miei gusti" riscrive i pasti secondo le preferenze del
// profilo (lib/alimenti): è l'unico punto in cui la dieta salvata viene
// modificata per le allergie: altrove l'adattamento è solo una lente, e il
// piano originale resta quello che è.

// Campi numerici dei macro di un piano (editabili anche a mano).
//
// I pasti sono SEMPRE i cinque di lib/pastiBase, coi loro nomi, in ordine:
// quelli non si rinominano e non si tolgono (al massimo si lasciano vuoti, e
// "Dieta giornaliera" non li mostra). Si possono aggiungere pasti in più — il
// pre-workout — che invece hanno un nome libero e si tolgono.
function PianoEditor({ titolo, sottotitolo, piano, onChange, onGeneraPasti }) {
  const setNum = (campo, val) => onChange({ ...piano, [campo]: val === '' ? 0 : Number(val) })
  // Scritti solo i macro, le calorie sono il loro conto: si vedono nel campo.
  const kcalDaMacro = coerenzaMacro({ kcal: 0, ...piano }).kcalDaMacro

  const setPasto = (id, patch) =>
    onChange({ ...piano, pasti: piano.pasti.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const rimuoviPasto = (id) => onChange({ ...piano, pasti: piano.pasti.filter((p) => p.id !== id) })
  const aggiungiPasto = () =>
    onChange({ ...piano, pasti: [...piano.pasti, { id: nuovoId(), slot: '', nome: '', testo: '', opzioni: [] }] })

  // Le ALTERNATIVE di un pasto: gli "oppure…" del nutrizionista letti dal PDF,
  // o le varianti generate dai macro. Si modificano qui perché è qui che si
  // modifica tutto il resto — e perché un elenco che si vede solo in "Dieta
  // giornaliera" sembra non essere stato importato.
  const setOpzione = (id, i, valore) =>
    setPasto(id, {
      opzioni: (piano.pasti.find((p) => p.id === id)?.opzioni || []).map((o, k) => (k === i ? valore : o)),
    })
  const rimuoviOpzione = (id, i) =>
    setPasto(id, {
      opzioni: (piano.pasti.find((p) => p.id === id)?.opzioni || []).filter((_, k) => k !== i),
    })
  const aggiungiOpzione = (id) =>
    setPasto(id, { opzioni: [...(piano.pasti.find((p) => p.id === id)?.opzioni || []), ''] })

  return (
    <div className="card dieta-piano">
      {titolo && (
        <div className="dieta-piano-head">
          <div>
            <div className="dieta-piano-titolo">{titolo}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{sottotitolo}</div>
          </div>
        </div>
      )}

      <div className="dieta-macro-grid">
        <label className="dieta-macro">
          <span>kcal</span>
          <input
            className="input"
            inputMode="numeric"
            value={piano.kcal || ''}
            placeholder={kcalDaMacro ? String(kcalDaMacro) : ''}
            title={kcalDaMacro && !piano.kcal ? 'Calcolate dai macro' : undefined}
            onChange={(e) => setNum('kcal', e.target.value)}
          />
        </label>
        <label className="dieta-macro">
          <span>Proteine (g)</span>
          <input className="input" inputMode="numeric" value={piano.proteine || ''} onChange={(e) => setNum('proteine', e.target.value)} />
        </label>
        <label className="dieta-macro">
          <span>Carbo (g)</span>
          <input className="input" inputMode="numeric" value={piano.carbo || ''} onChange={(e) => setNum('carbo', e.target.value)} />
        </label>
        <label className="dieta-macro">
          <span>Grassi (g)</span>
          <input className="input" inputMode="numeric" value={piano.grassi || ''} onChange={(e) => setNum('grassi', e.target.value)} />
        </label>
      </div>

      <div className="stack" style={{ gap: 10, marginTop: 4 }}>
        {piano.pasti.length === 0 && (
          <p className="muted" style={{ fontSize: 13 }}>
            Nessun pasto. Aggiungili a mano, generali dai macro qui sopra o importali da un PDF.
          </p>
        )}
        {piano.pasti.map((p) => (
          <div key={p.id} className="dieta-pasto">
            {p.slot ? (
              <div className="pasto-nome">{p.nome}</div>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  value={p.nome}
                  placeholder="Pasto in più (es. Pre-workout)"
                  aria-label="Nome del pasto in più"
                  onChange={(e) => setPasto(p.id, { nome: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  className="icon-btn btn-danger"
                  type="button"
                  aria-label="Rimuovi pasto"
                  onClick={() => rimuoviPasto(p.id)}
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            )}
            <textarea
              className="textarea"
              value={p.testo}
              placeholder="Cosa mangiare…"
              onChange={(e) => setPasto(p.id, { testo: e.target.value })}
              style={{ marginTop: 8, minHeight: 60 }}
            />

            {(p.opzioni || []).map((o, i) => (
              <div key={i} className="row" style={{ gap: 8, marginTop: 6 }}>
                <span className="pasto-opzione-tag" style={{ alignSelf: 'center' }}>oppure</span>
                <textarea
                  className="textarea grow"
                  value={o}
                  placeholder="Un altro modo di fare questo pasto…"
                  aria-label={`Alternativa ${i + 1} per ${p.nome || 'il pasto'}`}
                  onChange={(e) => setOpzione(p.id, i, e.target.value)}
                  style={{ minHeight: 44 }}
                />
                <button
                  className="icon-btn btn-danger"
                  type="button"
                  aria-label={`Rimuovi l'alternativa ${i + 1}`}
                  onClick={() => rimuoviOpzione(p.id, i)}
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              style={{ marginTop: 6 }}
              onClick={() => aggiungiOpzione(p.id)}
            >
              <IconPlus width={14} height={14} /> Alternativa a questo pasto
            </button>
          </div>
        ))}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm grow" type="button" onClick={aggiungiPasto}>
            <IconPlus width={16} height={16} /> Pasto in più
          </button>
          {onGeneraPasti && (
            <button className="btn btn-sm grow" type="button" onClick={onGeneraPasti}>
              Genera pasti dai macro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const TIPI_GIORNATA = [
  { id: TIPO_GIORNATA.ALLENAMENTO, label: 'Allenamento' },
  { id: TIPO_GIORNATA.RIPOSO, label: 'Riposo' },
  { id: TIPO_GIORNATA.QUALSIASI, label: 'Sempre' },
]

function GiornataEditor({ giornata, onChange, onElimina }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <input
          className="input"
          value={giornata.nome}
          placeholder="Nome (es. Giorno A, Opzione pesce)"
          onChange={(e) => onChange({ ...giornata, nome: e.target.value })}
          style={{ flex: 1 }}
        />
        <button
          className="icon-btn btn-danger"
          type="button"
          aria-label="Elimina giornata tipo"
          onClick={onElimina}
        >
          <IconTrash width={16} height={16} />
        </button>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label>Quando vale</label>
        <div className="segmented">
          {TIPI_GIORNATA.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'seg-btn' + (giornata.tipo === t.id ? ' on' : '')}
              onClick={() => onChange({ ...giornata, tipo: t.id })}
              aria-pressed={giornata.tipo === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
          Lascia i macro a zero per usare quelli del piano base del giorno.
        </p>
      </div>

      <PianoEditor piano={giornata} onChange={(p) => onChange({ ...giornata, ...p })} />
    </div>
  )
}

const FLUSSO_DIETA = new Set(['dieta-crea', 'dieta-macro', 'dieta-importa', 'dieta-editor', 'dieta-schema'])
const delFlussoDieta = (r) => FLUSSO_DIETA.has(r.name)

export default function DietaEditorPage({ id }) {
  const { getDieta, aggiungiDieta, aggiornaDieta, eliminaDieta, preferenze } = useStore()
  const { utenteCorrente } = useAccount()
  const esistente = useMemo(() => (id ? getDieta(id) : null), [id, getDieta])
  // Una dieta NUOVA nasce già compilata coi dati del profilo: peso, altezza,
  // età e obiettivo sono roba che l'utente ha già scritto una volta, e non
  // esiste motivo di rifargliela battere qui. Se i dati bastano arriva anche
  // il piano calcolato, altrimenti restano i parametri e il calcolo lo fa il
  // tasto "Genera dieta consigliata".
  const [dieta, setDieta] = useState(() => {
    if (esistente) return conCinquePasti(esistente)
    const dati = normalizzaDatiFisici(utenteCorrente?.dati)
    return conCinquePasti(
      dietaDaDatiFisici(dati, preferenze) ||
        nuovaDieta({
          peso: dati.peso,
          altezza: dati.altezza,
          eta: dati.eta,
          sesso: dati.sesso || 'm',
          movimento: dati.movimento,
          obiettivo: dati.obiettivo,
        }),
    )
  })
  const [err, setErr] = useState('')
  const [sostituzioni, setSostituzioni] = useState(null)

  const set = (campo, val) => setDieta((d) => ({ ...d, [campo]: val }))
  const esterna = dieta.fonte === FONTE.ESTERNA

  const genera = () => {
    if (!String(dieta.peso).trim() || !String(dieta.altezza).trim() || !String(dieta.eta).trim()) {
      setErr('Inserisci peso, altezza ed età per calcolare la dieta consigliata.')
      return
    }
    const { allenamento, riposo } = calcolaDieta({
      peso: dieta.peso,
      altezza: dieta.altezza,
      eta: dieta.eta,
      sesso: dieta.sesso,
      movimento: dieta.movimento,
      obiettivo: dieta.obiettivo,
      preferenze,
    })
    setDieta((d) => ({
      ...d,
      allenamento,
      riposo,
      nome: d.nome?.trim() ? d.nome : `Dieta ${labelObiettivo(d.obiettivo)}`,
    }))
    setErr('')
  }

  // Macro dati dal nutrizionista + pasti d'esempio che li rispettano: l'app non
  // ricalcola le calorie, si limita a riempire i piatti.
  const generaPastiDa = (campo) =>
    setDieta((d) => ({ ...d, [campo]: { ...d[campo], pasti: pastiDaMacro(d[campo], preferenze) } }))

  const adatta = () => {
    const r = adattaDieta(dieta, preferenze)
    setDieta(r.dieta)
    setSostituzioni(r)
  }

  const aggiungiGiornata = () =>
    setDieta((d) => ({
      ...d,
      giornate: [
        ...(d.giornate || []),
        nuovaGiornataTipo({ nome: `Giornata ${(d.giornate?.length || 0) + 1}`, pasti: conPastiBase([]) }),
      ],
    }))
  const cambiaGiornata = (g) =>
    setDieta((d) => ({ ...d, giornate: d.giornate.map((x) => (x.id === g.id ? g : x)) }))
  const eliminaGiornata = (gid) =>
    setDieta((d) => ({ ...d, giornate: d.giornate.filter((x) => x.id !== gid) }))

  const scrivi = () => {
    const nome = (dieta.nome || '').trim() || `Dieta ${labelObiettivo(dieta.obiettivo)}`
    const payload = { ...dieta, nome }
    return esistente ? aggiornaDieta(payload) : aggiungiDieta(payload)
  }

  // Le pagine del flusso della dieta (nuova, macro, PDF, editor, schema): la
  // freccia e il salvataggio tornano a dove si era PRIMA di entrarci — l'elenco
  // delle diete, o la dieta giornaliera se si è partiti da lì.
  const esciDalFlusso = () => esci({ salta: delFlussoDieta, riserva: routes.dieta() })

  const salva = () => {
    scrivi()
    esciDalFlusso()
  }

  // Lo schema sta in una pagina sua: prima si salva quello che si è cambiato
  // qui (se no andando e tornando si perderebbe), e una dieta nuova nasce.
  const apriSchema = () => {
    const d = scrivi()
    const id = d?.id || dieta.id
    // ⚠️ Una dieta appena nata: nella cronologia "#/dieta/nuova" diventa la
    // SUA pagina. Se no il tasto indietro dallo schema riaprirebbe un editor
    // vuoto, e salvandolo si avrebbero due diete.
    if (!esistente) riscriviIndirizzo(routes.dietaEditor(id))
    navigate(routes.dietaSchema(id))
  }

  const elimina = () => {
    if (window.confirm('Eliminare questa dieta? L’azione non è reversibile.')) {
      eliminaDieta(dieta.id)
      esciDalFlusso()
    }
  }

  const generata = [...dieta.allenamento.pasti, ...dieta.riposo.pasti].some((p) => !pastoVuoto(p))

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={esciDalFlusso} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{esistente ? 'Modifica dieta' : 'Nuova dieta'}</h1>
        </div>
        <button className="btn btn-accent btn-sm" onClick={salva}>
          Salva
        </button>
      </div>

      {/* Nome */}
      <div className="field">
        <label htmlFor="dieta-nome">Nome</label>
        <input
          id="dieta-nome"
          className="input"
          value={dieta.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Es. Dieta dimagrimento"
          maxLength={40}
        />
      </div>

      {/* Da dove vengono i numeri */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Da dove vengono calorie e macro</div>
        <div className="segmented">
          <button
            className={'seg-btn' + (!esterna ? ' on' : '')}
            onClick={() => set('fonte', FONTE.CALCOLATA)}
            aria-pressed={!esterna}
          >
            Calcolate dall’app
          </button>
          <button
            className={'seg-btn' + (esterna ? ' on' : '')}
            onClick={() => set('fonte', FONTE.ESTERNA)}
            aria-pressed={esterna}
          >
            Me li ha dati un esperto
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
          {esterna
            ? 'L’app non ricalcola niente: scrivi tu i numeri del nutrizionista e li tiene così come sono.'
            : 'L’app stima calorie e macro dai tuoi dati (peso, altezza, età, movimento).'}
        </p>
        {esterna && (
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label htmlFor="dieta-fonte-nota">Chi l’ha scritta (facoltativo)</label>
            <input
              id="dieta-fonte-nota"
              className="input"
              value={dieta.fonteNota}
              onChange={(e) => set('fonteNota', e.target.value)}
              placeholder="Es. Dott.ssa Bianchi, marzo 2026"
              maxLength={60}
            />
          </div>
        )}
        {esterna && (
          <button
            className="btn btn-block"
            style={{ marginTop: 12 }}
            onClick={() => navigate(routes.dietaImporta())}
          >
            <IconUpload width={16} height={16} /> Importa da PDF o testo
          </button>
        )}
      </div>

      {/* Periodo di validità */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Periodo di validità</div>
        <div className="grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dieta-inizio">Dal</label>
            <input
              id="dieta-inizio"
              className="input"
              type="date"
              value={dieta.dataInizio}
              onChange={(e) => set('dataInizio', e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dieta-fine">Al</label>
            <input
              id="dieta-fine"
              className="input"
              type="date"
              value={dieta.dataFine}
              onChange={(e) => set('dataFine', e.target.value)}
            />
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Modificabile in qualsiasi momento. Lascia vuoto per un periodo aperto.
        </p>
      </div>

      {/* Dati per il calcolo — solo se è l'app a calcolare */}
      {!esterna && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-titolo">Dati per la dieta consigliata</div>
          <div className="grid-2">
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-peso">Peso (kg)</label>
              <input id="dieta-peso" className="input" inputMode="numeric" value={dieta.peso} onChange={(e) => set('peso', e.target.value)} placeholder="es. 78" />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-altezza">Altezza (cm)</label>
              <input id="dieta-altezza" className="input" inputMode="numeric" value={dieta.altezza} onChange={(e) => set('altezza', e.target.value)} placeholder="es. 180" />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-eta">Età</label>
              <input id="dieta-eta" className="input" inputMode="numeric" value={dieta.eta} onChange={(e) => set('eta', e.target.value)} placeholder="es. 24" />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-sesso">Sesso</label>
              <select id="dieta-sesso" className="select" value={dieta.sesso} onChange={(e) => set('sesso', e.target.value)}>
                {SESSI.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-giorni">Giorni di allenamento / sett.</label>
              <select id="dieta-giorni" className="select" value={dieta.giorniAllenamento} onChange={(e) => set('giorniAllenamento', Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="dieta-movimento">Movimento giornaliero</label>
              <select id="dieta-movimento" className="select" value={dieta.movimento} onChange={(e) => set('movimento', e.target.value)}>
                {MOVIMENTI.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="dieta-obiettivo">Obiettivo</label>
            <select id="dieta-obiettivo" className="select" value={dieta.obiettivo} onChange={(e) => set('obiettivo', e.target.value)}>
              {OBIETTIVI.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {err && <p className="form-error">{err}</p>}

          <button className="btn btn-accent btn-block" type="button" onClick={genera} style={{ marginTop: 4 }}>
            {generata ? 'Rigenera dieta consigliata' : 'Genera dieta consigliata'}
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            Stima indicativa (calorie e macro dai tuoi dati) — un punto di partenza da personalizzare, non
            un consiglio medico.
          </p>
        </div>
      )}

      {/* Preferenze alimentari del profilo */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">
          <IconLeaf width={15} height={15} /> Allergie, intolleranze e gusti
        </div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
          {riassuntoPreferenze(preferenze)}
        </p>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn btn-sm grow" onClick={() => navigate(routes.dietaPreferenze())}>
            Modifica
          </button>
          <button
            className="btn btn-sm grow"
            onClick={adatta}
            disabled={!preferenzeAttive(preferenze)}
          >
            Adatta questa dieta
          </button>
        </div>
        {sostituzioni && (
          <div style={{ marginTop: 10 }}>
            {sostituzioni.sostituzioni.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Niente da cambiare: la dieta rispetta già le tue preferenze.
              </p>
            ) : (
              <>
                <p className="row" style={{ gap: 6, color: 'var(--good)', fontSize: 13 }}>
                  <IconCheck width={15} height={15} /> {sostituzioni.sostituzioni.length} sostituzioni
                  (ricordati di salvare)
                </p>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {sostituzioni.sostituzioni.map((s, i) => (
                    <li key={i} className="muted" style={{ fontSize: 12.5 }}>
                      {s.da} → {s.a}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sostituzioni.avvisi.map((a, i) => (
              <p key={i} className="form-error" style={{ marginTop: 6 }}>{a}</p>
            ))}
          </div>
        )}
      </div>

      {/* Schema settimanale: quale pasto fare quale giorno */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">
          <IconCalendar width={15} height={15} /> Schema settimanale
        </div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
          {dieta.schema?.length
            ? riassuntoSchema(dieta.schema)
            : 'Quale pasto fare quale giorno: «lunedì a pranzo legumi, a cena carne bianca». «Dieta giornaliera» lo segue e ti propone le alternative giuste.'}
        </p>
        {dieta.schema?.length > 0 && (
          <div className="schema-mini">
            {GIORNI_SETTIMANA.map((g) => {
              const pranzo = casellaDi(dieta.schema, g.id, 'pranzo')
              const cena = casellaDi(dieta.schema, g.id, 'cena')
              return (
                <div key={g.id} className="schema-mini-giorno">
                  <strong>{g.breve}</strong>
                  <span>{labelCategoria(pranzo?.categoria, true) || (pranzo ? 'scritto' : '—')}</span>
                  <span>{labelCategoria(cena?.categoria, true) || (cena ? 'scritto' : '—')}</span>
                </div>
              )
            })}
          </div>
        )}
        <button className="btn btn-block" style={{ marginTop: 12 }} onClick={apriSchema}>
          {dieta.schema?.length ? 'Modifica lo schema' : 'Aggiungi lo schema settimanale'}
        </button>
        {!esistente && (
          <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
            La dieta viene salvata, poi si apre lo schema.
          </p>
        )}
      </div>

      {/* Piani base */}
      <div className="section-title">Giorni di ALLENAMENTO</div>
      <PianoEditor
        titolo="Giorni di allenamento"
        sottotitolo="Più carboidrati per sostenere la seduta"
        piano={dieta.allenamento}
        onChange={(p) => set('allenamento', p)}
        onGeneraPasti={esterna ? () => generaPastiDa('allenamento') : undefined}
      />

      <div className="section-title" style={{ marginTop: 18 }}>Giorni di RIPOSO</div>
      <PianoEditor
        titolo="Giorni di riposo"
        sottotitolo="Meno carboidrati, proteine invariate"
        piano={dieta.riposo}
        onChange={(p) => set('riposo', p)}
        onGeneraPasti={esterna ? () => generaPastiDa('riposo') : undefined}
      />

      {/* Giornate tipo */}
      <div className="section-title" style={{ marginTop: 18 }}>
        Giornate tipo {dieta.giornate.length > 0 ? `· ${dieta.giornate.length}` : ''}
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
        Menu alternativi per lo stesso tipo di giornata: in «cosa mangiare oggi» ruotano, così non
        si mangia la stessa cosa tutti i giorni.
      </p>
      {dieta.giornate.map((g) => (
        <GiornataEditor
          key={g.id}
          giornata={g}
          onChange={cambiaGiornata}
          onElimina={() => eliminaGiornata(g.id)}
        />
      ))}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm grow" onClick={aggiungiGiornata}>
          <IconPlus width={16} height={16} /> Aggiungi giornata tipo
        </button>
        <button className="btn btn-sm grow" onClick={() => navigate(routes.dietaImporta())}>
          <IconUpload width={16} height={16} /> Importa da PDF
        </button>
      </div>

      {/* Le indicazioni del nutrizionista lette dal PDF (o scritte qui) */}
      <details className="card" style={{ marginTop: 18 }}>
        <summary className="card-titolo" style={{ cursor: 'pointer', marginBottom: 0 }}>
          Indicazioni del nutrizionista {dieta.note ? '' : '(nessuna)'}
        </summary>
        <textarea
          className="textarea"
          value={dieta.note || ''}
          placeholder="Porzioni dei secondi, sostituzioni, consigli…"
          aria-label="Indicazioni del nutrizionista"
          onChange={(e) => set('note', e.target.value)}
          style={{ marginTop: 10, minHeight: 160 }}
        />
      </details>

      {esistente && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 18 }} onClick={elimina}>
          <IconTrash width={16} height={16} /> Elimina dieta
        </button>
      )}
    </div>
  )
}
