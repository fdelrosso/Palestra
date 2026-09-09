import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { parseSchedaTesto } from '../lib/parser'
import { navigate, goBack, routes } from '../lib/router'
import { IconBack } from '../components/icons'

export default function ImportPage() {
  const { aggiungiScheda } = useStore()
  const [nome, setNome] = useState('')
  const [testo, setTesto] = useState('')

  const importa = () => {
    if (!testo.trim()) return
    const scheda = parseSchedaTesto(testo, nome.trim() || 'Scheda importata')
    const salvata = aggiungiScheda(scheda)
    // Porta subito nell'editor per controllare/correggere prima di usarla.
    navigate(routes.editor(salvata.id))
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack}>
          <IconBack />
        </button>
        <h1>Importa da testo</h1>
      </div>

      <div className="field" style={{ marginTop: 6 }}>
        <label>Nome scheda</label>
        <input
          className="input"
          value={nome}
          placeholder="Es. Forza & Ipertrofia — ottobre"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Incolla qui il messaggio del PT</label>
        <textarea
          className="textarea"
          style={{ minHeight: 240, fontSize: 15 }}
          value={testo}
          placeholder={'Giorno A\n\nPanca piana\nSett1 8x3 90kg rec 1min\n...'}
          onChange={(e) => setTesto(e.target.value)}
        />
      </div>

      <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 2px 14px' }}>
        L'app riconosce giorni (<strong>Giorno A</strong>, <strong>Rest</strong>), esercizi, schemi per
        settimana (<strong>Sett1…</strong>), carichi e recuperi. Non sarà perfetta al 100% — dopo
        l'import ti porto nell'<strong>editor</strong> per controllare e correggere prima di salvarla.
      </p>

      <button className="btn btn-accent btn-lg btn-block" disabled={!testo.trim()} onClick={importa}>
        Importa e controlla
      </button>
    </div>
  )
}
