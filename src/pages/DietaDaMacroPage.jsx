import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { esci, goBack, navigate, posizioneAdesso, routes } from '../lib/router'
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
// li è calcolati altrove. L'app non tocca i numeri (la dieta nasce `fonte:
// esterna` apposta) e ⚠️ NON ci costruisce sopra i pasti: la dieta è il LIMITE
// di calorie e macro, e basta. Prima qui si generavano cinque pasti con le
// alternative; è stato chiesto di toglierli: chi scrive i propri numeri
// mangia quello che vuole e vuole sapere quanto gli resta. I consigli si
// chiedono pasto per pasto, dentro la dieta giornaliera, e sono fatti su
// quello che manca in quel momento (lib/dieta, consiglioPerPasto).
//
// I GIORNI DI ALLENAMENTO E DI RIPOSO si possono scrivere diversi: è come li dà
// quasi ogni nutrizionista (più carboidrati quando ci si allena), e prima qui
// c'era solo "calorie in più", che non bastava a ricopiarli. Passando a
// "diversi" i numeri già scritti si copiano nel giorno di allenamento, così si
// cambia solo quello che cambia.
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

const VUOTI = { kcal: '', proteine: '', carbo: '', grassi: '' }

const comeNumeri = (v) => ({
  kcal: Number(v.kcal) || 0,
  proteine: Number(v.proteine) || 0,
  carbo: Number(v.carbo) || 0,
  grassi: Number(v.grassi) || 0,
})
// Serve almeno un macro: senza, il limite non dice niente e i consigli dei
// pasti non avrebbero da dove partire.
const conMacro = (n) => n.proteine > 0 || n.carbo > 0 || n.grassi > 0

// Calorie e macro di UN giorno, col controllo 4/4/9.
function NumeriGiorno({ id, titolo, valori, onChange }) {
  const numeri = comeNumeri(valori)
  const coerenza = coerenzaMacro(numeri)
  const pronto = conMacro(numeri)
  // Solo i macro, niente calorie: le calorie sono il loro conto (4/4/9), e si
  // vedono subito nel campo invece che a dieta salvata.
  const kcalCalcolate = !numeri.kcal && pronto ? coerenza.kcalDaMacro : 0
  const set = (k) => (e) => onChange({ ...valori, [k]: e.target.value })
  // I carboidrati che mancano per arrivare alle calorie scritte: il campo che
  // in un piano vero è sempre l'ultimo a essere deciso.
  const suggerisciCarbo = () =>
    onChange({ ...valori, carbo: String(carboDaKcal(numeri)) })

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-titolo">
        <IconTabella width={15} height={15} /> {titolo}
      </div>

      <div className="field">
        <label htmlFor={`${id}-kcal`}>Calorie totali</label>
        <div className="row" style={{ gap: 8 }}>
          <input
            id={`${id}-kcal`}
            className="input grow"
            type="number"
            inputMode="numeric"
            value={valori.kcal}
            onChange={set('kcal')}
            placeholder={kcalCalcolate ? String(kcalCalcolate) : '2200'}
          />
          <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>kcal</span>
        </div>
        {kcalCalcolate > 0 ? (
          <div className="vis-hint" style={{ marginTop: 6 }}>
            Calcolate dai macro: <strong>{kcalCalcolate} kcal</strong> (4 per grammo di proteine e
            carboidrati, 9 per i grassi). Scrivile tu solo se il nutrizionista ti ha dato un
            numero diverso.
          </div>
        ) : (
          !numeri.kcal && (
            <div className="vis-hint" style={{ marginTop: 6 }}>
              Facoltative: se scrivi solo i macro, le calcolo io.
            </div>
          )
        )}
      </div>

      <div className="grid-3">
        {CAMPI.map((c) => (
          <div className="field" key={c.k} style={{ marginBottom: 0 }}>
            <label htmlFor={`${id}-${c.k}`}>{c.label}</label>
            <input
              id={`${id}-${c.k}`}
              className="input"
              type="number"
              inputMode="numeric"
              value={valori[c.k]}
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
            <div className="vis-hint">Torna: questi macro valgono {coerenza.kcalDaMacro} kcal.</div>
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
  )
}

// Il modulo mentre si passa da "Cosa non mangi" (il link "Cambia"): questa
// pagina si smonta, e tornando i numeri scritti devono esserci ancora. Vale
// solo tornando alla STESSA voce di cronologia (posizioneAdesso): "Calorie e
// macro" riaperta da capo riparte vuota. In sessionStorage come la pila del
// router: l'app installata su iPhone si ricarica spesso tornando in primo piano.
const CHIAVE_BOZZA = 'dieta-macro-bozza:v1'

function leggiBozza() {
  try {
    const b = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return b?.form && b.pos === posizioneAdesso() ? b : null
  } catch {
    return null
  }
}

// Le pagine da saltare uscendo dopo aver salvato: si torna dove si era prima
// di "Nuova dieta" (l'elenco, o la dieta giornaliera).
const FLUSSO = new Set(['dieta-crea', 'dieta-macro', 'dieta-preferenze'])

export default function DietaDaMacroPage() {
  const { preferenze, aggiungiDieta } = useStore()
  const [bozza] = useState(leggiBozza)
  const [form, setForm] = useState(
    () =>
      bozza?.form || {
        nome: '',
        obiettivo: 'mantenimento',
        fonteNota: '',
        // false = un giorno solo per tutta la settimana.
        diversi: false,
        riposo: VUOTI,
        allenamento: VUOTI,
      },
  )

  // Letta, la bozza non serve più. ⚠️ Qui e non in leggiBozza: in sviluppo
  // React chiama due volte chi inizializza lo stato, e la seconda volta la
  // bozza non ci sarebbe già più.
  useEffect(() => {
    try {
      sessionStorage.removeItem(CHIAVE_BOZZA)
    } catch {
      /* niente storage, niente bozza */
    }
  }, [])

  const cambiaPreferenze = () => {
    try {
      sessionStorage.setItem(CHIAVE_BOZZA, JSON.stringify({ pos: posizioneAdesso(), form }))
    } catch {
      /* senza storage si torna al modulo vuoto, come prima */
    }
    navigate(routes.dietaPreferenze())
  }

  const aggiorna = (p) => setForm((f) => ({ ...f, ...p }))
  const set = (k) => (e) => aggiorna({ [k]: e.target.value })

  // Passando a "diversi" il giorno di allenamento parte dai numeri già scritti:
  // quasi sempre cambiano solo i carboidrati.
  const scegliDiversi = (diversi) =>
    aggiorna(
      diversi && !conMacro(comeNumeri(form.allenamento))
        ? { diversi, allenamento: { ...form.riposo } }
        : { diversi },
    )

  const riposo = comeNumeri(form.riposo)
  const allenamento = comeNumeri(form.allenamento)
  const pronto = conMacro(riposo) && (!form.diversi || conMacro(allenamento))

  const salva = () => {
    aggiungiDieta(
      dietaDaMacro(
        {
          nome: form.nome,
          obiettivo: form.obiettivo,
          ...riposo,
          allenamento: form.diversi ? allenamento : null,
          fonteNota: form.fonteNota,
          conPasti: false,
        },
        preferenze,
      ),
    )
    esci({ salta: (r) => FLUSSO.has(r.name), riserva: routes.dieta() })
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Calorie e macro</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>Il tuo limite di ogni giorno</div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Scrivi quanto vuoi mangiare in un giorno. L'app non ricalcola niente: in «Dieta
        giornaliera» ti dice quanto ti resta, e se vuoi un consiglio per un pasto lo chiedi lì.
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

      <div className="segmented" role="tablist" aria-label="Giorni" style={{ marginBottom: 12 }}>
        <button
          role="tab"
          aria-selected={!form.diversi}
          className={'seg-btn' + (!form.diversi ? ' on' : '')}
          onClick={() => scegliDiversi(false)}
        >
          Uguale tutti i giorni
        </button>
        <button
          role="tab"
          aria-selected={form.diversi}
          className={'seg-btn' + (form.diversi ? ' on' : '')}
          onClick={() => scegliDiversi(true)}
        >
          Allenamento / riposo
        </button>
      </div>

      {form.diversi ? (
        <>
          <NumeriGiorno
            id="macro-allen"
            titolo="Nei giorni di allenamento"
            valori={form.allenamento}
            onChange={(v) => aggiorna({ allenamento: v })}
          />
          <NumeriGiorno
            id="macro-riposo"
            titolo="Nei giorni di riposo"
            valori={form.riposo}
            onChange={(v) => aggiorna({ riposo: v })}
          />
          <div className="vis-hint" style={{ margin: '-4px 2px 14px' }}>
            Quale dei due vale oggi lo decide l'app dai giorni di allenamento delle tue schede; in
            "Dieta giornaliera" lo puoi sempre cambiare a mano.
          </div>
        </>
      ) : (
        <NumeriGiorno
          id="macro"
          titolo="Il tuo obiettivo giornaliero"
          valori={form.riposo}
          onChange={(v) => aggiorna({ riposo: v })}
        />
      )}

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
        <IconLeaf width={13} height={13} /> I consigli tengono conto di quello che non mangi:{' '}
        {riassuntoPreferenze(preferenze).toLowerCase()}.{' '}
        <button className="btn-link" onClick={cambiaPreferenze}>
          Cambia
        </button>
      </div>

      <button className="btn btn-accent btn-block btn-lg" disabled={!pronto} onClick={salva}>
        Salva la dieta
      </button>
      {pronto ? (
        <div className="vis-hint" style={{ marginTop: 6, marginBottom: 20 }}>
          Diventa la tua dieta attiva, «{labelObiettivo(form.obiettivo)}». Dall'elenco delle diete
          puoi sempre cambiarla o tornare a un'altra.
        </div>
      ) : (
        <div className="vis-hint" style={{ marginTop: 6 }}>
          {form.diversi
            ? 'Scrivi almeno uno dei tre macro in tutti e due i giorni.'
            : 'Scrivi almeno uno dei tre macro.'}
        </div>
      )}
    </div>
  )
}
