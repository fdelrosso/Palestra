import { useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { LIMITI, datiMancanti, normalizzaDatiFisici, numeroValido } from '../lib/datiFisici'
import DatiFisiciForm from '../components/DatiFisiciForm'
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

  const salva = () => {
    if (fuoriScala) return
    aggiornaDatiFisici(dati)
    setSalvato(true)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>I miei dati</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>{utenteCorrente?.nome}</div>
        </div>
        <button className="btn btn-accent btn-sm" onClick={salva} disabled={fuoriScala}>
          Salva
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.45 }}>
        Servono a tre cose: stimare le calorie che bruci in un allenamento (dipendono da quanto
        pesi), calcolare la dieta consigliata e proporti allenamenti alla tua portata. Cambiali
        quando vuoi: dal livello in poi, le schede generate si adeguano subito.
      </p>

      <div className="card">
        <DatiFisiciForm valori={dati} onChange={cambia} />
      </div>

      {mancanti.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5, margin: '12px 2px', lineHeight: 1.45 }}>
          Manca {mancanti.join(', ')}: finché non c'è, le calorie non compaiono nel recap
          dell'allenamento e la dieta consigliata non si può calcolare.
        </p>
      )}

      {salvato && (
        <p className="row" style={{ gap: 6, color: 'var(--good)', fontSize: 13, marginTop: 12 }}>
          <IconCheck width={16} height={16} /> Dati salvati.
        </p>
      )}

      <button
        className="btn btn-block"
        style={{ marginTop: 18 }}
        onClick={() => navigate(routes.dieta())}
      >
        Vai alla dieta
      </button>
    </div>
  )
}
