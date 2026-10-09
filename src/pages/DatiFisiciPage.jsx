import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import {
  LIMITI,
  datiMancanti,
  kcalConsigliate,
  mantenimento,
  metabolismoBasale,
  normalizzaDatiFisici,
  numeroValido,
  scartoObiettivo,
} from '../lib/datiFisici'
import DatiFisiciForm from '../components/DatiFisiciForm'
import ModificaNome from '../components/ModificaNome'
import ModificaUsername from '../components/ModificaUsername'
import { IconBack, IconCheck } from '../components/icons'

// ---------------------------------------------------------------------------
// "I miei dati": sesso, età, peso, altezza, movimento e obiettivo del profilo.
//
// Si arriva qui dal menu del profilo (l'avatar in alto a sinistra). Sono gli
// stessi campi che si chiedono creando l'account: qui si cambiano quando si
// vuole, e cambiarli aggiorna insieme le calorie stimate dei prossimi
// allenamenti e la dieta consigliata — perché il dato è UNO solo, sul profilo,
// e non una copia per ogni schermata.
//
// In cima il CONTO (calorie consigliate, basale, mantenimento): è il motivo
// per cui si scrivono questi numeri, e si muove mentre li si scrive. Poi il
// corpo, poi nome e username — quelli riguardano gli altri, non il conto.
//
// ⚠️ Il peso di una DIETA già salvata non si tocca: quella è la fotografia di
// quando è stata scritta, e riscriverla alle spalle di chi l'ha fatta sarebbe
// peggio che lasciarla vecchia. Chi vuole aggiornarla la rigenera dall'editor.
// ---------------------------------------------------------------------------

export default function DatiFisiciPage() {
  const { utenteCorrente, aggiornaDatiFisici } = useAccount()
  const [dati, setDati] = useState(() => normalizzaDatiFisici(utenteCorrente?.dati))
  const [salvato, setSalvato] = useState(false)

  const cambia = (patch) => {
    setDati((d) => ({ ...d, ...patch }))
    setSalvato(false)
  }

  // Un campo scritto male blocca il salvataggio; un campo VUOTO no: si può
  // lasciare in bianco quello che non si vuole dire, e quello che manca
  // semplicemente non comparirà nel recap.
  const fuoriScala = ['eta', 'peso', 'altezza'].some(
    (k) => String(dati[k] ?? '').trim() && numeroValido(dati[k], LIMITI[k]) == null,
  )
  const mancanti = datiMancanti(dati)

  const salva = async () => {
    if (fuoriScala) return
    setSalvato('invio')
    const esito = await aggiornaDatiFisici(dati)
    // ⚠️ Non basta dire "Salvati": senza rete la modifica e' valida ma NON e'
    // ancora sul server, e chi legge deve saperlo. La prima versione diceva
    // "Dati salvati" comunque, mentre il salvataggio era stato annullato.
    setSalvato(esito?.ok === false ? { errore: esito.errore } : esito?.differito ? 'differito' : true)
  }

  const kcal = kcalConsigliate(dati)

  return (
    <div className="app dati-pagina">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>I miei dati</h1>
        <button
          className="btn btn-accent btn-sm"
          onClick={salva}
          disabled={fuoriScala || salvato === 'invio'}
        >
          {salvato === 'invio' ? 'Salvo…' : 'Salva'}
        </button>
      </div>

      {/* Il conto: si aggiorna mentre si scrive. Senza i dati che servono non
          si inventa un numero: si dice cosa manca. */}
      <section className="dati-conto-testa" aria-live="polite">
        {kcal != null ? (
          <>
            <span className="dati-conto-etichetta">Per il tuo obiettivo</span>
            <span className="dati-conto-kcal">
              {kcal}
              <small> kcal al giorno</small>
            </span>
            <span className="dati-conto-righe">
              <span>
                Basale <strong>{metabolismoBasale(dati)}</strong>
              </span>
              <span>
                Mantenimento <strong>{mantenimento(dati)}</strong>
              </span>
            </span>
            <span className="dati-conto-nota">
              {scartoObiettivo(dati)} · stima indicativa (Mifflin-St Jeor), non un consiglio medico.
            </span>
          </>
        ) : (
          <>
            <span className="dati-conto-etichetta">Le tue calorie</span>
            <span className="dati-conto-vuoto">
              Manca {mancanti.join(', ')}: finché non c’è, le calorie non compaiono nel recap e la dieta
              consigliata non si può calcolare.
            </span>
          </>
        )}
      </section>

      <p className="dati-intro">
        Servono a stimare le calorie degli allenamenti, calcolare la dieta e proporti allenamenti alla tua
        portata. Cambiali quando vuoi: le schede generate si adeguano subito.
      </p>

      <div className="section-title">Il tuo corpo</div>
      <div className="card">
        <DatiFisiciForm valori={dati} onChange={cambia} conConto={false} />
      </div>

      {kcal != null && mancanti.length > 0 && (
        <p className="dati-intro" style={{ marginTop: 12 }}>
          Manca {mancanti.join(', ')}.
        </p>
      )}

      {salvato === true && (
        <p className="dati-esito ok">
          <IconCheck width={16} height={16} /> Dati salvati.
        </p>
      )}
      {salvato === 'differito' && (
        <p className="dati-esito">
          Salvati su questo dispositivo. Non c’è rete: li mando appena torna, non serve riscriverli.
        </p>
      )}
      {salvato && salvato.errore && (
        <p className="form-error" style={{ marginTop: 12 }}>
          {salvato.errore}
        </p>
      )}

      {/* Nome e username: gli unici dati di questa pagina che riguardano gli
          ALTRI — come ti vedono e come ti trovano. Si salvano da soli, ognuno
          col suo tasto, perché il server deve dire se sono liberi. */}
      <div className="section-title">Come ti vedono gli altri</div>
      <div className="card dati-identita">
        <ModificaNome />
        <ModificaUsername />
      </div>
    </div>
  )
}
