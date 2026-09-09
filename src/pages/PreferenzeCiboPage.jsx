import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import { ESCLUSIONI, REGIMI } from '../lib/alimenti'
import { listaDaTesto, riassuntoPreferenze, testoDaLista } from '../lib/preferenzeCibo'
import { IconBack, IconCheck, IconLeaf } from '../components/icons'

// ---------------------------------------------------------------------------
// Allergie, intolleranze e gusti.
//
// Stanno sul PROFILO, non sulla singola dieta: chi è celiaco lo è anche nella
// dieta del mese prossimo. Da qui passano tutti i piani — quelli calcolati
// dall'app e quelli scritti dal nutrizionista — e gli alimenti vietati vengono
// sostituiti con altri dello stesso macro, ricalcolando i grammi (lib/alimenti).
//
// Tre livelli, dal più forte al più morbido:
//   1. REGIME (vegetariano/vegano): esclude interi gruppi in un colpo solo;
//   2. ALLERGIE E INTOLLERANZE: le caselle da spuntare;
//   3. "NON MI PIACE" e "MI PIACE": testo libero, per tutto il resto.
//
// Non è un software medico e non deve sembrarlo: chi ha un'allergia seria
// controlla comunque le etichette.
// ---------------------------------------------------------------------------

export default function PreferenzeCiboPage() {
  const { preferenze, aggiornaPreferenze } = useStore()
  const [evito, setEvito] = useState(() => testoDaLista(preferenze.evito))
  const [preferisco, setPreferisco] = useState(() => testoDaLista(preferenze.preferisco))
  const [salvato, setSalvato] = useState(false)

  const conferma = () => {
    setSalvato(true)
    setTimeout(() => setSalvato(false), 2000)
  }

  const cambiaRegime = (id) => {
    aggiornaPreferenze({ regime: id })
    conferma()
  }

  const cambiaEsclusione = (id) => {
    const on = preferenze.esclusioni.includes(id)
    aggiornaPreferenze({
      esclusioni: on
        ? preferenze.esclusioni.filter((x) => x !== id)
        : [...preferenze.esclusioni, id],
    })
    conferma()
  }

  // Le liste di testo si salvano quando si esce dal campo: salvare a ogni
  // lettera riscriverebbe localStorage venti volte per una parola.
  const salvaListe = () => {
    aggiornaPreferenze({ evito: listaDaTesto(evito), preferisco: listaDaTesto(preferisco) })
    conferma()
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Cosa non mangi</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>Allergie, intolleranze e gusti</div>
        </div>
        {salvato && (
          <span className="badge badge-good nowrap">
            <IconCheck width={12} height={12} /> Salvato
          </span>
        )}
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Quello che scrivi qui vale per <strong>tutte</strong> le tue diete. Gli alimenti che non
        puoi mangiare vengono sostituiti con altri che portano lo stesso macronutriente, con i
        grammi ricalcolati: le calorie e i macro non cambiano.
      </p>

      {/* Regime */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Regime alimentare</div>
        <div className="stack" style={{ gap: 8 }}>
          {REGIMI.map((r) => {
            const on = preferenze.regime === r.id
            return (
              <button
                key={r.id}
                className={'destinatario' + (on ? ' on' : '')}
                onClick={() => cambiaRegime(r.id)}
                aria-pressed={on}
              >
                <span className="menu-voce-icona" aria-hidden="true">
                  <IconLeaf width={18} height={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{r.label}</span>
                <span className={'tick-box' + (on ? ' on' : '')} aria-hidden="true">
                  {on && <IconCheck width={14} height={14} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allergie e intolleranze */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Allergie e intolleranze</div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.4 }}>
          Spunta quello che devi evitare. Non è un controllo medico: sulle allergie serie leggi
          sempre le etichette.
        </p>
        <div className="gruppo-chips">
          {ESCLUSIONI.map((e) => {
            const on = preferenze.esclusioni.includes(e.id)
            return (
              <button
                key={e.id}
                className={'chip' + (on ? ' chip-match' : '')}
                onClick={() => cambiaEsclusione(e.id)}
                aria-pressed={on}
              >
                {on && <IconCheck width={13} height={13} />} {e.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Gusti */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-titolo">Gusti</div>
        <div className="field">
          <label htmlFor="pref-evito">Cose che non mangio</label>
          <textarea
            id="pref-evito"
            className="textarea"
            value={evito}
            onChange={(e) => setEvito(e.target.value)}
            onBlur={salvaListe}
            placeholder="Separate da virgola: es. cavolfiore, tonno, ricotta"
            style={{ minHeight: 60 }}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="pref-piace">Cose che mi piacciono</label>
          <textarea
            id="pref-piace"
            className="textarea"
            value={preferisco}
            onChange={(e) => setPreferisco(e.target.value)}
            onBlur={salvaListe}
            placeholder="Quando c'è da sostituire, l'app sceglie prima queste"
            style={{ minHeight: 60 }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-titolo">In sintesi</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.45 }}>{riassuntoPreferenze(preferenze)}</p>
      </div>

      <button
        className="btn btn-accent btn-block"
        style={{ marginTop: 16 }}
        onClick={() => {
          salvaListe()
          navigate(routes.dietaOggi())
        }}
      >
        Vedi la dieta di oggi adattata
      </button>
    </div>
  )
}
