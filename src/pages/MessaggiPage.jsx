import { goBack } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import ElencoChat from '../components/ElencoChat'
import { IconBack } from '../components/icons'

// I messaggi: si aprono dalla busta in cima a Social. Tutte le conversazioni
// già cominciate; per cominciarne una si passa dai propri amici (l'icona
// delle persone, accanto alla busta).
export default function MessaggiPage() {
  const { amici } = useAccount()
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Messaggi</h1>
      </div>
      <ElencoChat
        quandoVuoto={
          <p className="muted" style={{ fontSize: 13.5, margin: '0 2px', lineHeight: 1.45 }}>
            {amici.length === 0
              ? 'Qui compaiono le chat con i tuoi amici. Aggiungine uno dall’icona delle persone in Social.'
              : 'Nessuna chat per ora. Apri i tuoi amici dall’icona delle persone in Social e scrivi a qualcuno.'}
          </p>
        }
      />
    </div>
  )
}
