import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, goBack, routes } from '../lib/router'
import { nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../data/model'
import { GiornoEditor } from '../components/GiornoEditor'
import { IconBack } from '../components/icons'

// "Nuovo allenamento": il "+" del calendario. Serve a scrivere a mano
// l'allenamento che si ha intenzione di fare ADESSO — esercizi, serie,
// ripetizioni, carico, recupero — e ad avviarlo.
//
// ⚠️ Non è una scheda, ed è la differenza che conta: una scheda è un programma
// che dura settimane, questo è una cosa sola da fare oggi. Per questo non
// chiede settimane, non nasce in "Schede e allenamenti", e si appoggia alla stessa
// scheda-contenitore `libera:true` dell'allenamento consigliato
// (iniziaAllenamentoLibero): così il completamento arriva regolarmente in
// calendario e nello storico, e alimenta i consigli futuri.
//
// A fine allenamento il riepilogo chiede se tenerlo: solo allora compare in
// "Schede e allenamenti", tra le cose che si possono rifare (Giorno.salvato).
//
// Chi vuole un PROGRAMMA passa da "Schede e allenamenti" → Nuova scheda.
//
// ⚠️ Il `gruppo` di ogni esercizio si può scegliere, ma lasciarlo vuoto non
// rompe niente: il motore dei consigli e il recap lo deducono dal nome
// (gruppoDaNome). Vale la pena metterlo solo quando il nome è ambiguo.
export default function NuovoAllenamentoPage() {
  const { sessione, iniziaAllenamentoLibero } = useStore()
  // Si parte con un esercizio già aperto: una pagina con solo un bottone
  // "Aggiungi esercizio" fa fare un tocco in più a tutti, sempre.
  const [bozza, setBozza] = useState(() =>
    nuovoGiorno({ tipo: 'workout', nome: '', esercizi: [nuovoEsercizio()] }),
  )

  const patchEsercizio = (eid, patch) =>
    setBozza((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) => (e.id === eid ? { ...e, ...patch } : e)),
    }))

  // Senza settimane lo schema è sempre `schemaBase`: `weekIdx` arriva null e
  // non viene mai usato (vedi il commento in GiornoEditor).
  const patchSchema = (eid, _weekIdx, patch) =>
    setBozza((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) =>
        e.id === eid ? { ...e, schemaBase: { ...schemaVuoto(e.schemaBase), ...patch } } : e,
      ),
    }))

  const addEsercizio = () =>
    setBozza((g) => ({ ...g, esercizi: [...g.esercizi, nuovoEsercizio()] }))

  const removeEsercizio = (eid) =>
    setBozza((g) => ({ ...g, esercizi: g.esercizi.filter((e) => e.id !== eid) }))

  // Una riga senza nome è una riga che l'utente ha aperto e non ha compilato:
  // non diventa un esercizio da fare, e non si cancella da sola mentre scrive.
  const pronti = bozza.esercizi.filter((e) => e.nome.trim())
  const vuoti = bozza.esercizi.length - pronti.length

  const avvia = () => {
    if (pronti.length === 0) return
    iniziaAllenamentoLibero({
      nome: bozza.nome.trim() || 'Allenamento libero',
      esercizi: pronti,
    })
    navigate(routes.allenamento())
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1 style={{ fontSize: 18 }}>Nuovo allenamento</h1>
      </div>

      {/* ⚠️ Avviare da qui SOSTITUISCE l'allenamento in corso. Prima di
          proporre di costruirne un altro, si offre di tornare a quello. */}
      {sessione && (
        <button
          className="hero"
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12 }}
          onClick={() => navigate(routes.allenamento())}
        >
          <div className="kicker">Allenamento in corso</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{sessione.nomeGiorno}</span>
            <span className="badge badge-accent">Riprendi ›</span>
          </div>
        </button>
      )}

      <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 10px', lineHeight: 1.45 }}>
        Scrivi quello che hai intenzione di fare oggi. Finito l'allenamento lo trovi in calendario
        e nello storico, come tutti gli altri.
      </p>

      <div className="field">
        <label>Nome dell'allenamento (facoltativo)</label>
        <input
          className="input"
          value={bozza.nome}
          placeholder="Es. Petto e tricipiti"
          onChange={(e) => setBozza((g) => ({ ...g, nome: e.target.value }))}
        />
      </div>

      <GiornoEditor
        giorno={bozza}
        numeroSettimane={1}
        soloEsercizi
        senzaSettimane
        senzaAllegati
        onAddEsercizio={addEsercizio}
        onRemoveEsercizio={removeEsercizio}
        onPatchEsercizio={patchEsercizio}
        onPatchSchema={patchSchema}
      />

      {vuoti > 0 && (
        <p className="muted" style={{ fontSize: 13, margin: '10px 2px 0', lineHeight: 1.45 }}>
          {vuoti === 1 ? "Un esercizio è senza nome e non entrerà" : `${vuoti} esercizi sono senza nome e non entreranno`}{' '}
          nell'allenamento.
        </p>
      )}

      <div className="action-bar">
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <button
            className="btn btn-accent btn-block btn-lg"
            disabled={pronti.length === 0}
            onClick={avvia}
          >
            Avvia allenamento
          </button>
        </div>
      </div>
      <div style={{ height: 92 }} />
    </div>
  )
}
