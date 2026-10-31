import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, goBack, routes } from '../lib/router'
import { nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../data/model'
import { GiornoEditor } from '../components/GiornoEditor'
import { IconBack } from '../components/icons'

// "Nuovo allenamento", dalla sezione Allenamento (il "+" in testata, il tasto
// in Programmi): si prepara un allenamento — riscaldamento, esercizi, serie,
// ripetizioni, carico, recupero, stretching — come un giorno di una scheda, e
// poi lo si AVVIA o lo si SALVA per rifarlo quando si vuole.
// Dalla Home invece "Allenamento libero" parte subito, vuoto, e gli esercizi
// si aggiungono mentre si fanno (pages/AllenamentoLiberoPage).
//
// Con `id` (/nuovo-allenamento/:id, "Modifica" sulla card in Programmi) si
// riapre un allenamento SALVATO, e c'è solo "Salva", che lo riscrive al suo
// posto; si avvia poi dalla card. Le volte già fatte non cambiano: sono
// completamenti a parte (e ogni avvio è un giorno nuovo, iniziaAllenamentoLibero).
//
// ⚠️ Non è una scheda, ed è la differenza che conta: una scheda è un programma
// che dura settimane, questo è una cosa sola da fare oggi. Per questo non
// chiede settimane, non nasce in "Schede e allenamenti", e si appoggia alla stessa
// scheda-contenitore `libera:true` dell'allenamento consigliato
// (iniziaAllenamentoLibero): così il completamento arriva regolarmente in
// calendario e nello storico, e alimenta i consigli futuri.
//
// "Salva" lo tiene fra gli allenamenti da rifare (Giorno.salvato, in
// Programmi con "Rifai") senza avviarlo. Avviato senza salvarlo, è il
// riepilogo a fine allenamento a chiedere se tenerlo.
//
// Chi vuole un PROGRAMMA passa da "Schede e allenamenti" → Nuova scheda.
//
// ⚠️ Il `gruppo` di ogni esercizio si può scegliere, ma lasciarlo vuoto non
// rompe niente: il motore dei consigli e il recap lo deducono dal nome
// (gruppoDaNome). Vale la pena metterlo solo quando il nome è ambiguo.
export default function NuovoAllenamentoPage({ id = null }) {
  const { schede, sessione, iniziaAllenamentoLibero, salvaAllenamentoLibero, aggiornaGiorno } = useStore()
  const contenitore = schede.find((s) => s.libera)
  const salvato = id ? contenitore?.giorni.find((g) => g.id === id && g.salvato) || null : null
  // Si parte con la ricerca già aperta (GiornoEditor `cercaSubito`): una
  // pagina con solo un bottone "Aggiungi esercizio" fa fare un tocco in più a
  // tutti, sempre. Un salvato si riapre com'era.
  const [bozza, setBozza] = useState(() => salvato || nuovoGiorno({ tipo: 'workout', nome: '', esercizi: [] }))

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

  const addEsercizio = (patch = {}) =>
    setBozza((g) => ({ ...g, esercizi: [...g.esercizi, nuovoEsercizio(patch)] }))

  const removeEsercizio = (eid) =>
    setBozza((g) => ({ ...g, esercizi: g.esercizi.filter((e) => e.id !== eid) }))

  // Una riga senza nome è una riga che l'utente ha aperto e non ha compilato:
  // non diventa un esercizio da fare, e non si cancella da sola mentre scrive.
  const pronti = bozza.esercizi.filter((e) => e.nome.trim())
  const vuoti = bozza.esercizi.length - pronti.length

  const giornoPronto = () => ({
    nome: bozza.nome.trim() || 'Allenamento libero',
    esercizi: pronti,
    riscaldamento: bozza.riscaldamento,
    stretching: bozza.stretching,
  })
  const avvia = () => {
    if (pronti.length === 0) return
    iniziaAllenamentoLibero(giornoPronto())
    navigate(routes.allenamento())
  }
  // Tenuto e basta: lo si ritrova in Programmi, fra gli allenamenti, e da lì
  // si rifà. `sostituisci`: "indietro" da Programmi non riapre la bozza.
  const salva = () => {
    if (pronti.length === 0) return
    if (salvato) aggiornaGiorno(contenitore.id, salvato.id, giornoPronto())
    else salvaAllenamentoLibero(giornoPronto())
    navigate(routes.home(), { sostituisci: true })
  }

  // Un link a un salvato che non c'è più (eliminato, o di un altro telefono
  // non ancora arrivato).
  if (id && !salvato) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <h1 style={{ fontSize: 18 }}>Allenamento</h1>
        </div>
        <p className="muted">Questo allenamento non c'è più fra quelli salvati.</p>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1 style={{ fontSize: 18 }}>{salvato ? 'Modifica allenamento' : 'Nuovo allenamento'}</h1>
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
        {salvato
          ? 'Le modifiche valgono da adesso: le volte che l’hai già fatto restano com’erano.'
          : 'Prepara l’allenamento, poi avvialo o salvalo per rifarlo quando vuoi. Fatto, lo trovi in calendario e nello storico, come tutti gli altri.'}
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
        cercaSubito={!salvato}
        conPreparazione
        aCard
        onPatch={(p) => setBozza((g) => ({ ...g, ...p }))}
        onAddEsercizio={addEsercizio}
        onRemoveEsercizio={removeEsercizio}
        onEsercizi={(fn) => setBozza((g) => ({ ...g, esercizi: fn(g.esercizi) }))}
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
        {/* ⚠️ Modificando, niente "Avvia": salvare e avviare nello stesso
            tocco perdeva le modifiche (iniziaAllenamentoLibero riscriveva il
            contenitore com'era prima). Si salva, e si avvia dalla card. */}
        {salvato ? (
          <div>
            <button className="btn btn-accent btn-block btn-lg" disabled={pronti.length === 0} onClick={salva}>
              Salva le modifiche
            </button>
          </div>
        ) : (
          <div className="nuovo-allenamento-tasti">
            <button className="btn btn-lg" disabled={pronti.length === 0} onClick={salva}>
              Salva
            </button>
            <button className="btn btn-accent btn-lg" disabled={pronti.length === 0} onClick={avvia}>
              Avvia allenamento
            </button>
          </div>
        )}
      </div>
      <div style={{ height: 92 }} />
    </div>
  )
}
